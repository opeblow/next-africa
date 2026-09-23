import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool, query } from "./db/pool.js";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { extractCommitments, transcribeAudio } from "./llm/extract.js";
import { openapiSpec, redocHtml } from "./openapi.js";
import { parsePagination, encodeCursor } from "./lib/pagination.js";
import { logger } from "./lib/logger.js";
import {
  signupSchema,
  loginSchema,
  captureTextSchema,
  captureFileSchema,
  captureVoiceSchema,
  commitmentStatusSchema,
  settingsSchema,
  nudgeActionSchema,
  validateBody,
} from "./lib/validate.js";

export const app = express();

app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(config.cors.origins.length ? { origin: config.cors.origins } : {}));
app.use(express.json({ limit: "15mb" }));
app.use(requestId);
app.use(requestLogger);

const noLimit = (_req, _res, next) => next();
function limiter(max) {
  if (!config.rateLimit.enabled) return noLimit;
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests — please slow down." },
  });
}

const generalLimiter = limiter(config.rateLimit.max);
const authLimiter = limiter(config.rateLimit.authMax);
const captureLimiter = limiter(config.rateLimit.captureMax);

app.use("/api", generalLimiter);

const tokenFor = (user) =>
  jwt.sign({ user_id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: config.jwt.expiresIn,
  });
const badRequest = (res, error) => res.status(400).json({ error });

app.get("/", (_req, res) => res.json({ name: "NEXT Africa API", health: "/api/health", docs: "/api/docs" }));
app.get("/api/openapi.json", (_req, res) => res.json(openapiSpec));
app.get("/api/docs", (_req, res) => res.type("html").send(redocHtml()));

async function dbOnline() {
  try {
    await query("SELECT 1");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Database health check failed");
    return false;
  }
}

app.get("/api/health", async (_req, res) => {
  const online = await dbOnline();
  if (!online) return res.status(503).json({ status: "error", db: "unreachable" });
  return res.json({
    status: "ok",
    db: "connected",
    uptime: process.uptime(),
    time: new Date().toISOString(),
  });
});

app.get("/api/live", (_req, res) => res.json({ status: "ok" }));

app.get("/api/ready", async (_req, res) => {
  const online = await dbOnline();
  return res.status(online ? 200 : 503).json({ status: online ? "ready" : "not_ready", db: online ? "connected" : "unreachable" });
});

app.post("/api/auth/signup", authLimiter, validateBody(signupSchema), async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, proactivity_level",
      [name, email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    return res.status(201).json({ token: tokenFor(user), user });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Signup failed");
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists" });
    return res.status(500).json({ error: "Could not create account" });
  }
});

app.post("/api/auth/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query(
      "SELECT id, name, email, password_hash, proactivity_level FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    delete user.password_hash;
    return res.json({ token: tokenFor(user), user });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Login failed");
    return res.status(500).json({ error: "Could not sign in" });
  }
});

const nextStepPrompt = (saved) =>
  saved.length
    ? `Starting with the first item? Next: “${saved[0].title}” — confirm or add files.`
    : "No new commitments were found in that message.";

function captureFailed(req, res, error) {
  logger.error({ err: error, requestId: req.id }, "Capture failed");
  if (error.message.includes("OPENAI_API_KEY")) return res.status(503).json({ error: "Capture is not configured yet" });
  return res.status(500).json({ error: "Could not capture commitments" });
}

const types = ["task", "deadline", "meeting", "reminder"];

async function persistCapture(userId, rawText, extracted) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const saved = [];
    let conflict = null;
    let conflictOwner = null;
    for (const item of extracted.commitments) {
      if (!item?.title?.trim()) continue;
      const type = types.includes(item.type) ? item.type : "task";
      const parsedDue = item.due_date ? new Date(item.due_date) : null;
      const dueDate = parsedDue && !Number.isNaN(parsedDue.valueOf()) ? parsedDue : null;
      let linkedId = null;
      if (item.linked_to_title) {
        const linked = await client.query(
          "SELECT id FROM commitments WHERE user_id = $1 AND status = 'open' AND lower(title) = lower($2) ORDER BY created_at DESC LIMIT 1",
          [userId, item.linked_to_title]
        );
        linkedId = linked.rows[0]?.id ?? null;
      }
      if (!conflict && dueDate && ["deadline", "meeting"].includes(type)) {
        const overlap = await client.query(
          "SELECT id, title FROM commitments WHERE user_id = $1 AND status = 'open' AND due_date BETWEEN $2::timestamptz - interval '2 hours' AND $2::timestamptz + interval '2 hours' ORDER BY due_date LIMIT 1",
          [userId, dueDate.toISOString()]
        );
        if (overlap.rows[0]) {
          conflict = {
            withCommitmentId: overlap.rows[0].id,
            withTitle: overlap.rows[0].title,
            suggestion: `“${item.title.trim()}” is close to “${overlap.rows[0].title}”. Consider moving one so you have breathing room.`,
          };
          conflictOwner = item;
        }
      }
      const created = await client.query(
        "INSERT INTO commitments (user_id, raw_input, type, title, due_date, linked_commitment_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [userId, rawText, type, item.title.trim(), dueDate?.toISOString() ?? null, linkedId]
      );
      saved.push(created.rows[0]);
      if (conflict && conflictOwner === item) {
        await client.query(
          "INSERT INTO nudges (user_id, type, message, commitment_id, source_key) VALUES ($1, 'conflict', $2, $3, $4) ON CONFLICT (user_id, source_key) DO NOTHING",
          [userId, conflict.suggestion, created.rows[0].id, `conflict:${created.rows[0].id}`]
        );
        conflictOwner = null;
      }
    }
    await client.query("COMMIT");
    return { saved, conflict };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.post("/api/capture", captureLimiter, requireAuth, validateBody(captureTextSchema), async (req, res) => {
  const { text } = req.body;
  try {
    const extracted = await extractCommitments(text);
    const { saved, conflict } = await persistCapture(req.user_id, text, extracted);
    return res.status(201).json({
      reply: extracted.reply,
      commitments: saved,
      next_step_prompt: nextStepPrompt(saved),
      ...(conflict ? { conflict } : {}),
    });
  } catch (error) {
    return captureFailed(req, res, error);
  }
});

app.post("/api/capture/file", captureLimiter, requireAuth, validateBody(captureFileSchema), async (req, res) => {
  const { filename, content_base64: base64 } = req.body;
  if (base64.length > 12_000_000) return res.status(413).json({ error: "That file is too large (12 MB max)" });
  try {
    const text = Buffer.from(base64, "base64").toString("utf8").replaceAll("\u0000", "").trim();
    if (text.length < 3) return badRequest(res, "That file had no readable text");
    const rawText = text.slice(0, 20000);
    const extracted = await extractCommitments(`Content of file "${filename}":\n${rawText}`);
    const { saved, conflict } = await persistCapture(req.user_id, rawText, extracted);
    return res.status(201).json({
      reply: extracted.reply,
      filename,
      commitments: saved,
      next_step_prompt: nextStepPrompt(saved),
      ...(conflict ? { conflict } : {}),
    });
  } catch (error) {
    return captureFailed(req, res, error);
  }
});

app.post("/api/capture/voice", captureLimiter, requireAuth, validateBody(captureVoiceSchema), async (req, res) => {
  const { audio_base64: base64, mime_type: mimeType } = req.body;
  if (base64.length > 20_000_000) return res.status(413).json({ error: "That voice note is too large (15 MB max)" });
  try {
    const transcript = await transcribeAudio(base64, mimeType);
    const extracted = await extractCommitments(transcript);
    const { saved, conflict } = await persistCapture(req.user_id, transcript, extracted);
    return res.status(201).json({
      reply: extracted.reply,
      transcript,
      commitments: saved,
      next_step_prompt: nextStepPrompt(saved),
      ...(conflict ? { conflict } : {}),
    });
  } catch (error) {
    return captureFailed(req, res, error);
  }
});

app.get("/api/commitments", requireAuth, async (req, res) => {
  const { status } = req.query;
  if (status && !["open", "waiting", "done"].includes(status)) {
    return badRequest(res, "status must be open, waiting, or done");
  }
  try {
    const { limit, cursor } = parsePagination(req.query);
    const params = [req.user_id];
    let where = "user_id = $1";
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    if (cursor) {
      params.push(cursor.created_at, cursor.id);
      where += ` AND (created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`;
    }
    params.push(limit + 1);
    const result = await query(
      `SELECT * FROM commitments WHERE ${where} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`,
      params
    );
    const hasMore = result.rows.length > limit;
    const commitments = hasMore ? result.rows.slice(0, limit) : result.rows;
    return res.json({ commitments, nextCursor: hasMore ? encodeCursor(commitments[commitments.length - 1]) : null });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "List commitments failed");
    return res.status(500).json({ error: "Could not load commitments" });
  }
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  try {
    const [today, waiting, all] = await Promise.all([
      query(
        "SELECT * FROM commitments WHERE user_id = $1 AND status = 'open' AND (due_date IS NULL OR due_date < CURRENT_DATE + interval '2 days') ORDER BY due_date ASC NULLS LAST, created_at DESC",
        [req.user_id]
      ),
      query("SELECT * FROM commitments WHERE user_id = $1 AND status = 'waiting' ORDER BY created_at DESC", [req.user_id]),
      query("SELECT * FROM commitments WHERE user_id = $1 ORDER BY created_at ASC", [req.user_id]),
    ]);
    const groups = new Map();
    for (const commitment of all.rows) {
      const key = commitment.linked_commitment_id ?? commitment.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(commitment);
    }
    return res.json({
      today: today.rows,
      waitingFor: waiting.rows,
      projects: [...groups.entries()].map(([rootCommitmentId, commitments]) => ({ rootCommitmentId, commitments })),
    });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Dashboard failed");
    return res.status(500).json({ error: "Could not load dashboard" });
  }
});

app.patch("/api/commitments/:id", requireAuth, validateBody(commitmentStatusSchema), async (req, res) => {
  const { status } = req.body;
  try {
    const result = await query("UPDATE commitments SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *", [status, req.params.id, req.user_id]);
    if (!result.rowCount) return res.status(404).json({ error: "Commitment not found" });
    return res.json({ commitment: result.rows[0] });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Commitment update failed");
    return res.status(500).json({ error: "Could not update commitment" });
  }
});

app.get("/api/settings", requireAuth, async (req, res) => {
  try {
    const result = await query("SELECT proactivity_level FROM users WHERE id = $1", [req.user_id]);
    if (!result.rowCount) return res.status(404).json({ error: "User not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Settings read failed");
    return res.status(500).json({ error: "Could not load settings" });
  }
});

app.patch("/api/settings", requireAuth, validateBody(settingsSchema), async (req, res) => {
  const { proactivity_level: level } = req.body;
  try {
    const result = await query("UPDATE users SET proactivity_level = $1 WHERE id = $2 RETURNING proactivity_level", [level, req.user_id]);
    if (!result.rowCount) return res.status(404).json({ error: "User not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Settings update failed");
    return res.status(500).json({ error: "Could not update settings" });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function commitmentChains(commitments) {
  const byId = new Map(commitments.map((c) => [c.id, c]));
  const rootOf = (commitment) => {
    const seen = new Set();
    let current = commitment;
    while (current.linked_commitment_id && byId.has(current.linked_commitment_id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.linked_commitment_id);
    }
    return current;
  };
  const groups = new Map();
  for (const commitment of commitments) {
    if (commitment.linked_commitment_id && byId.has(commitment.linked_commitment_id)) continue;
    const root = rootOf(commitment);
    if (!groups.has(root.id)) groups.set(root.id, { root, members: [] });
    for (const member of commitments) {
      if (rootOf(member).id === root.id && !groups.get(root.id).members.includes(member)) groups.get(root.id).members.push(member);
    }
  }
  return [...groups.values()];
}

app.get("/api/projects", requireAuth, async (req, res) => {
  try {
    const { rows } = await query("SELECT * FROM commitments WHERE user_id = $1 ORDER BY created_at DESC", [req.user_id]);
    const projects = commitmentChains(rows).map(({ root, members }) => {
      const openDue = members.filter((m) => m.status !== "done" && m.due_date).map((m) => m.due_date);
      const done = members.filter((m) => m.status === "done").length;
      return {
        id: root.id,
        rootCommitmentId: root.id,
        title: root.title,
        due: openDue.length ? new Date(Math.min(...openDue.map((d) => new Date(d).getTime()))).toISOString() : null,
        progress: members.length ? Math.round((done / members.length) * 100) : 0,
        status: members.every((m) => m.status === "done") ? "completed" : "active",
        total: members.length,
        done,
      };
    });
    return res.json({ projects });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Projects failed");
    return res.status(500).json({ error: "Could not load projects" });
  }
});

app.get("/api/nudges", requireAuth, async (req, res) => {
  try {
    const [persisted, dueSoon, waiting, resolvedKeys] = await Promise.all([
      query("SELECT id, type, message, commitment_id, source_key, created_at FROM nudges WHERE user_id = $1 AND status = 'open' ORDER BY created_at DESC", [req.user_id]),
      query("SELECT id, title, due_date FROM commitments WHERE user_id = $1 AND status = 'open' AND due_date IS NOT NULL AND due_date <= now() + interval '2 days' ORDER BY due_date", [req.user_id]),
      query("SELECT id, title FROM commitments WHERE user_id = $1 AND status = 'waiting' ORDER BY created_at DESC", [req.user_id]),
      query("SELECT source_key FROM nudges WHERE user_id = $1 AND status <> 'open' AND source_key IS NOT NULL", [req.user_id]),
    ]);
    const resolved = new Set(resolvedKeys.rows.map((r) => r.source_key));
    const DAY = 864e5;
    const nudges = persisted.rows.map((row) => ({
      id: row.id,
      type: row.type,
      message: row.message,
      commitmentId: row.commitment_id,
      primary: { label: "Got it" },
      secondary: { label: "Later" },
    }));
    for (const c of dueSoon.rows) {
      const key = `due:${c.id}`;
      if (resolved.has(key)) continue;
      const diff = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / DAY);
      const when = diff <= 0 ? "due today" : `due in ${diff} day${diff === 1 ? "" : "s"}`;
      nudges.push({ id: key, type: "due", message: `“${c.title}” is ${when}. Want to start it now?`, commitmentId: c.id, primary: { label: "Plan it now" }, secondary: { label: "Later" } });
    }
    for (const c of waiting.rows) {
      const key = `waiting:${c.id}`;
      if (resolved.has(key)) continue;
      nudges.push({ id: key, type: "waiting", message: `Still waiting on “${c.title}”. Want to follow up?`, commitmentId: c.id, primary: { label: "Follow up" }, secondary: { label: "Not now" } });
    }
    return res.json({ nudges });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Nudges failed");
    return res.status(500).json({ error: "Could not load nudges" });
  }
});

app.post("/api/nudges/:id/action", requireAuth, validateBody(nudgeActionSchema), async (req, res) => {
  const { action } = req.body;
  const id = req.params.id;
  try {
    if (UUID_RE.test(id)) {
      const result = await query("UPDATE nudges SET status = $1, resolved_at = now() WHERE id = $2 AND user_id = $3 RETURNING id, status", [action, id, req.user_id]);
      if (!result.rowCount) return res.status(404).json({ error: "Nudge not found" });
      return res.json({ ok: true, nudge: result.rows[0] });
    }
    const prefix = id.split(":")[0];
    if (!["due", "waiting", "conflict"].includes(prefix)) return res.status(404).json({ error: "Nudge not found" });
    const result = await query(
      "INSERT INTO nudges (user_id, type, message, source_key, status, resolved_at) VALUES ($1, $2, $3, $4, $5, now()) ON CONFLICT (user_id, source_key) DO UPDATE SET status = EXCLUDED.status, resolved_at = now() RETURNING id, status",
      [req.user_id, prefix, "Handled", id, action]
    );
    return res.json({ ok: true, nudge: result.rows[0] });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Nudge action failed");
    return res.status(500).json({ error: "Could not update nudge" });
  }
});

app.get("/api/insights", requireAuth, async (req, res) => {
  try {
    const [totals, overdue, types, projects] = await Promise.all([
      query("SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'done')::int AS done, count(*) FILTER (WHERE status = 'open')::int AS open, count(*) FILTER (WHERE status = 'waiting')::int AS waiting FROM commitments WHERE user_id = $1", [req.user_id]),
      query("SELECT count(*)::int AS count FROM commitments WHERE user_id = $1 AND status = 'open' AND due_date < now()", [req.user_id]),
      query("SELECT type, count(*)::int AS count FROM commitments WHERE user_id = $1 GROUP BY type", [req.user_id]),
      query("SELECT id, linked_commitment_id, status FROM commitments WHERE user_id = $1", [req.user_id]),
    ]);
    const t = totals.rows[0];
    const plural = { task: "tasks", deadline: "deadlines", meeting: "meetings", reminder: "reminders" };
    const dominant = [...types.rows].sort((a, b) => b.count - a.count)[0];
    const projectCount = commitmentChains(projects.rows).length;
    const completionRate = t.total ? Math.round((t.done / t.total) * 100) : 0;
    const patterns = [
      `You are running ${projectCount} project${projectCount === 1 ? "" : "s"} right now.`,
      dominant ? `Most of your commitments are ${plural[dominant.type] ?? `${dominant.type}s`}.` : "No commitments yet — tell NEXT what you want to achieve.",
      overdue.rows[0].count > 0 ? `${overdue.rows[0].count} commitment${overdue.rows[0].count === 1 ? "" : "s"} overdue — worth rescheduling today.` : "Nothing is overdue — you're on top of things.",
      t.total ? `You complete about ${completionRate}% of what you commit to.` : "Start with one message and NEXT will map it out.",
    ];
    const stats = { total: t.total, done: t.done, open: t.open, waiting: t.waiting, overdue: overdue.rows[0].count, projectCount, completionRate };
    return res.json({ patterns, stats });
  } catch (error) {
    logger.error({ err: error, requestId: req.id }, "Insights failed");
    return res.status(500).json({ error: "Could not load insights" });
  }
});

app.use(notFound);
app.use(errorHandler);
