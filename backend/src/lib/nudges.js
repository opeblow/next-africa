import { query } from "../db/pool.js";

export const reminderPolicy = {
  quiet: { hours: 24, waitingHours: null },
  balanced: { hours: 48, waitingHours: 48 },
  active: { hours: 168, waitingHours: 24 },
};

export async function getNudges(userId) {
  const { rows: users } = await query("SELECT proactivity_level FROM users WHERE id = $1", [userId]);
  const policy = reminderPolicy[users[0]?.proactivity_level] || reminderPolicy.balanced;
  const [persisted, due, waiting, handled] = await Promise.all([
    query("SELECT n.* FROM nudges n JOIN commitments c ON c.id = n.commitment_id WHERE n.user_id = $1 AND (n.status = 'open' OR (n.status = 'dismissed' AND n.resolved_at <= now() - interval '1 day')) AND c.status <> 'done' ORDER BY n.created_at DESC", [userId]),
    query("SELECT id, title, due_date FROM commitments WHERE user_id = $1 AND status = 'open' AND due_date <= now() + $2 * interval '1 hour' ORDER BY due_date", [userId, policy.hours]),
    query("SELECT id, title FROM commitments WHERE user_id = $1 AND status = 'waiting' AND $2::int IS NOT NULL AND updated_at <= now() - $2 * interval '1 hour'", [userId, policy.waitingHours]),
    query("SELECT source_key FROM nudges WHERE user_id = $1 AND status <> 'open' AND (status = 'resolved' OR resolved_at > now() - interval '1 day')", [userId]),
  ]);
  const suppressed = new Set(handled.rows.map(n => n.source_key));
  const result = persisted.rows.map(n => ({ id: n.id, type: n.type, message: n.message, commitmentId: n.commitment_id }));
  for (const item of due.rows) {
    const id = `due:${item.id}`;
    if (suppressed.has(id)) continue;
    const remaining = new Date(item.due_date).getTime() - Date.now();
    const hours = Math.ceil(remaining / 3600000);
    const when = remaining < 0 ? "overdue" : hours <= 1 ? "due within an hour" : hours < 24 ? `due in ${hours} hours` : `due in ${Math.ceil(hours / 24)} days`;
    result.push({ id, type: "due", message: `“${item.title}” is ${when}.`, commitmentId: item.id });
  }
  for (const item of waiting.rows) {
    const id = `waiting:${item.id}`;
    if (!suppressed.has(id)) result.push({ id, type: "waiting", message: `Still waiting on “${item.title}”. Prepare a follow-up?`, commitmentId: item.id });
  }
  return result.map(n => ({ ...n, primary: { label: n.type === "waiting" ? "Prepare follow-up" : "Review commitment" }, secondary: { label: "Remind me tomorrow" } }));
}
