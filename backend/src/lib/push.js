import webpush from "web-push";
import { z } from "zod";
import { pool, query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { getNudges } from "./nudges.js";
import { logger } from "./logger.js";

// Restrict destinations to browser push services, never arbitrary user URLs.
const endpointSchema = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.port &&
    ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname);
});
export const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/) }),
});
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

export function mountPushRoutes(app) {
  app.get("/api/notifications/config", requireAuth, (_req, res) => res.json({ available: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null }));
  app.post("/api/notifications/subscribe", requireAuth, async (req, res) => {
    if (!pushConfigured()) return res.status(503).json({ error: "Background reminders are not configured yet." });
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Unsupported browser subscription." });
    const sub = parsed.data;
    const owned = await query("SELECT user_id FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
    if (owned.rows.length && owned.rows[0].user_id !== req.user_id) return res.status(409).json({ error: "Disable reminders in the previous account first." });
    await query("INSERT INTO push_subscriptions(endpoint, user_id, subscription) VALUES ($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET subscription = EXCLUDED.subscription WHERE push_subscriptions.user_id = EXCLUDED.user_id", [sub.endpoint, req.user_id, sub]);
    res.json({ enabled: true });
  });
  app.post("/api/notifications/unsubscribe", requireAuth, async (req, res) => {
    if (typeof req.body.endpoint !== "string") return res.status(400).json({ error: "Subscription is required." });
    await query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2", [req.body.endpoint, req.user_id]);
    res.json({ enabled: false });
  });
}

export async function dispatchReminders(send = (sub, payload) => webpush.sendNotification(sub, payload, { TTL: 3600, timeout: 10000 })) {
  if (!pushConfigured()) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const client = await pool.connect();
  let locked = false;
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock(748291) AS locked");
    locked = lock.rows[0].locked;
    if (!locked) return;
    const { rows } = await query("SELECT endpoint, user_id, subscription FROM push_subscriptions");
    const byUser = new Map();
    for (const row of rows) {
      if (!byUser.has(row.user_id)) byUser.set(row.user_id, await getNudges(row.user_id));
      // One private summary per user/device per day, regardless of task count.
      const nudges = byUser.get(row.user_id);
      if (!nudges.length) continue;
      const key = `summary:${new Date().toISOString().slice(0, 10)}`;
      const sent = await query("SELECT 1 FROM push_deliveries WHERE endpoint=$1 AND source_key=$2", [row.endpoint, key]);
      if (sent.rowCount) continue;
      try {
        await send(row.subscription, JSON.stringify({ title: "NEXT Africa", body: "You have commitments to review. Open NEXT to see what needs attention.", url: "/?view=nudges" }));
        await query("INSERT INTO push_deliveries(endpoint, source_key) VALUES ($1,$2) ON CONFLICT DO NOTHING", [row.endpoint, key]);
      } catch (error) {
        if ([404,410].includes(error.statusCode)) await query("DELETE FROM push_subscriptions WHERE endpoint=$1", [row.endpoint]);
        else logger.warn({ status: error.statusCode }, "Reminder delivery failed; will retry");
      }
    }
    await query("DELETE FROM push_deliveries WHERE delivered_at < now() - interval '7 days'");
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(748291)");
    client.release();
  }
}
export function startReminders() {
  const tick = () => dispatchReminders().catch(() => logger.warn("Reminder worker failed; will retry"));
  const timer = setInterval(tick, 60000);
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
