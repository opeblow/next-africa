import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { ensureSchema } from "../src/db/schema.js";
import { pool } from "../src/db/pool.js";

process.env.JWT_SECRET ||= "test-secret";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";

const realFetch = globalThis.fetch;
let nextExtraction = { reply: "ok", commitments: [] };
let lastExtractionRequest;
let nextDraft = "Hi, just checking in on the proposal. Let me know when you have an update.";
let nextTranscription = "voice note transcript";

globalThis.fetch = (url, init) => {
  if (typeof url === "string" && url.includes("/v1/audio/transcriptions")) {
    return Promise.resolve(
      new Response(JSON.stringify({ text: nextTranscription }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  }
  if (typeof url === "string" && url.startsWith("https://api.openai.com")) {
    const request = JSON.parse(init.body);
    if (!request.tools) return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: nextDraft } }] }), { status: 200 }));
    lastExtractionRequest = request;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  { function: { name: "record_commitments", arguments: JSON.stringify({ ...nextExtraction, commitments: nextExtraction.commitments.map(c => ({ ...c, due_text: c.due_text ?? c.due_date })) }) } },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
  }
  return realFetch(url, init);
};

let server;
let base;
const createdUserIds = [];

before(async () => {
  await ensureSchema();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (createdUserIds.length) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function api(path, { method = "GET", token, body } = {}) {
  const res = await realFetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const email = () => `smoke+${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

test("health", async () => {
  const { status, body } = await api("/api/health");
  assert.equal(status, 200);
  assert.equal(body.db, "connected");
});

test("signup validates, creates balanced user, returns token", async () => {
  const e = email();
  const short = await api("/api/auth/signup", { method: "POST", body: { name: "A", email: e, password: "short" } });
  assert.equal(short.status, 400);

  const { status, body } = await api("/api/auth/signup", { method: "POST", body: { name: "Alice", email: e, password: "password123" } });
  assert.equal(status, 201);
  assert.ok(body.token);
  assert.equal(body.user.proactivity_level, "balanced");
  assert.equal(body.user.password_hash, undefined);
  createdUserIds.push(body.user.id);

  const dup = await api("/api/auth/signup", { method: "POST", body: { name: "Alice", email: e, password: "password123" } });
  assert.equal(dup.status, 409);
});

test("login verifies hash", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Bob", email: e, password: "password123" } });
  createdUserIds.push(signup.user.id);

  const ok = await api("/api/auth/login", { method: "POST", body: { email: e, password: "password123" } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);

  const bad = await api("/api/auth/login", { method: "POST", body: { email: e, password: "wrongpass" } });
  assert.equal(bad.status, 401);
});

test("requireAuth rejects missing/invalid token", async () => {
  assert.equal((await api("/api/commitments")).status, 401);
  assert.equal((await api("/api/commitments", { token: "not-a-jwt" })).status, 401);
});

test("capture extracts, persists, and links to an open commitment", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Cara", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = {
    reply: "Added 2 commitments.",
    commitments: [
      { title: "Send proposal", type: "task", due_date: new Date().toISOString(), linked_to_title: null },
      { title: "Send proposal before kickoff", type: "deadline", due_date: new Date(Date.now() + 864e5).toISOString(), linked_to_title: "Send proposal" },
    ],
  };
  const { status, body } = await api("/api/capture", { method: "POST", token, body: { text: "send proposal then prep kickoff" } });
  assert.equal(status, 201);
  assert.equal(body.reply, "Added 2 commitments.");
  assert.equal(body.commitments.length, 2);
  assert.equal(body.commitments[1].linked_commitment_id, body.commitments[0].id);

  const bad = await api("/api/capture", { method: "POST", token, body: {} });
  assert.equal(bad.status, 400);
});

test("capture/file extracts commitments from an attached text file", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Nora", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "Found the fees deadline.", commitments: [{ title: "Pay school fees", type: "deadline", due_date: null, linked_to_title: null }] };
  const content_base64 = Buffer.from("School fees are due on Friday. Please pay.").toString("base64");
  const { status, body } = await api("/api/capture/file", { method: "POST", token, body: { filename: "fees.txt", content_base64 } });
  assert.equal(status, 201);
  assert.equal(body.filename, "fees.txt");
  assert.equal(body.commitments.length, 1);
  assert.equal(body.commitments[0].title, "Pay school fees");

  assert.equal((await api("/api/capture/file", { method: "POST", token, body: {} })).status, 400);
  assert.equal((await api("/api/capture/file", { method: "POST", token, body: { filename: "x.txt", content_base64: "" } })).status, 400);
});

test("capture/voice transcribes audio, then extracts commitments", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Ola", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextTranscription = "I need to call the bursar tomorrow";
  nextExtraction = { reply: "Got it.", commitments: [{ title: "Call the bursar", type: "task", due_date: null, linked_to_title: null }] };
  const audio_base64 = Buffer.from("fake audio bytes").toString("base64");
  const { status, body } = await api("/api/capture/voice", { method: "POST", token, body: { audio_base64, mime_type: "audio/webm" } });
  assert.equal(status, 201);
  assert.equal(body.transcript, nextTranscription);
  assert.equal(body.commitments[0].title, "Call the bursar");

  assert.equal((await api("/api/capture/voice", { method: "POST", token, body: {} })).status, 400);
});

test("nudge returns conflict when deadline/meeting within 2h", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Dan", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "ok", commitments: [{ title: "Standup", type: "meeting", due_date: "2030-01-01T10:00:00.000Z", linked_to_title: null }] };
  const first = await api("/api/capture", { method: "POST", token, body: { text: "standup 10am" } });
  assert.equal(first.status, 201);
  assert.equal(first.body.conflict, undefined);

  nextExtraction = { reply: "ok", commitments: [{ title: "Design review", type: "meeting", due_date: "2030-01-01T11:00:00.000Z", linked_to_title: null }] };
  const second = await api("/api/capture", { method: "POST", token, body: { text: "design review 11am" } });
  assert.equal(second.status, 201);
  assert.ok(second.body.conflict);
  assert.equal(second.body.conflict.withCommitmentId, first.body.commitments[0].id);
  assert.match(second.body.conflict.suggestion, /Design review/);
});

test("list commitments filters by status and validates input", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Eve", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "ok", commitments: [{ title: "Task A", type: "task", due_date: null, linked_to_title: null }] };
  await api("/api/capture", { method: "POST", token, body: { text: "a" } });

  const all = await api("/api/commitments", { token });
  assert.equal(all.status, 200);
  assert.equal(all.body.commitments.length, 1);

  const open = await api("/api/commitments?status=open", { token });
  assert.equal(open.body.commitments.length, 1);

  const none = await api("/api/commitments?status=done", { token });
  assert.equal(none.body.commitments.length, 0);

  assert.equal((await api("/api/commitments?status=bogus", { token })).status, 400);
});

test("dashboard buckets today/waitingFor/projects and PATCH updates", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Fay", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "ok", commitments: [{ title: "Due now", type: "deadline", due_date: new Date().toISOString(), linked_to_title: null }] };
  const { body: captured } = await api("/api/capture", { method: "POST", token, body: { text: "due now" } });
  const id = captured.commitments[0].id;

  const dash = await api("/api/dashboard", { token });
  assert.equal(dash.status, 200);
  assert.deepEqual(Object.keys(dash.body).sort(), ["projects", "today", "waitingFor"]);
  assert.ok(dash.body.today.some((c) => c.id === id));

  const waiting = await api(`/api/commitments/${id}`, { method: "PATCH", token, body: { status: "waiting" } });
  assert.equal(waiting.status, 200);
  const dash2 = await api("/api/dashboard", { token });
  assert.ok(dash2.body.waitingFor.some((c) => c.id === id));

  assert.equal((await api(`/api/commitments/${id}`, { method: "PATCH", token, body: { status: "nope" } })).status, 400);
  assert.equal((await api("/api/commitments/00000000-0000-0000-0000-000000000000", { method: "PATCH", token, body: { status: "done" } })).status, 404);
});

test("PATCH does not touch another user's commitment", async () => {
  const e1 = email();
  const { body: u1 } = await api("/api/auth/signup", { method: "POST", body: { name: "G", email: e1, password: "password123" } });
  const e2 = email();
  const { body: u2 } = await api("/api/auth/signup", { method: "POST", body: { name: "H", email: e2, password: "password123" } });
  createdUserIds.push(u1.user.id, u2.user.id);

  nextExtraction = { reply: "ok", commitments: [{ title: "Mine", type: "task", due_date: null, linked_to_title: null }] };
  const { body } = await api("/api/capture", { method: "POST", token: u1.token, body: { text: "mine" } });
  const id = body.commitments[0].id;

  assert.equal((await api(`/api/commitments/${id}`, { method: "PATCH", token: u2.token, body: { status: "done" } })).status, 404);
  assert.equal((await api(`/api/commitments/${id}`, { method: "PATCH", token: u1.token, body: { status: "done" } })).status, 200);
});

test("settings get/update validate proactivity level", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Ivy", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  const get = await api("/api/settings", { token });
  assert.equal(get.status, 200);
  assert.equal(get.body.proactivity_level, "balanced");

  const patch = await api("/api/settings", { method: "PATCH", token, body: { proactivity_level: "active" } });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.proactivity_level, "active");

  assert.equal((await api("/api/settings", { method: "PATCH", token, body: { proactivity_level: "loud" } })).status, 400);
});

test("capture returns next_step_prompt and persists conflict nudges", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Jane", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "ok", commitments: [{ title: "Kickoff", type: "meeting", due_date: "2030-02-01T10:00:00.000Z", linked_to_title: null }] };
  const first = await api("/api/capture", { method: "POST", token, body: { text: "kickoff 10am" } });
  assert.equal(first.status, 201);
  assert.equal(typeof first.body.next_step_prompt, "string");
  assert.match(first.body.next_step_prompt, /Kickoff/);

  nextExtraction = { reply: "ok", commitments: [{ title: "Sync", type: "meeting", due_date: "2030-02-01T11:00:00.000Z", linked_to_title: null }] };
  const second = await api("/api/capture", { method: "POST", token, body: { text: "sync 11am" } });
  assert.ok(second.body.conflict);

  const nudges = await api("/api/nudges", { token });
  assert.equal(nudges.status, 200);
  const conflictNudge = nudges.body.nudges.find((n) => n.type === "conflict");
  assert.ok(conflictNudge, "capture conflict should create a persisted nudge");
  assert.match(conflictNudge.message, /Sync/);
});

test("nudges: due/waiting computed, resolve works for persisted and computed", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Ken", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "ok", commitments: [
    { title: "Due soon", type: "deadline", due_date: new Date(Date.now() + 864e5).toISOString(), linked_to_title: null },
    { title: "Waiting item", type: "task", due_date: null, linked_to_title: null },
  ] };
  await api("/api/capture", { method: "POST", token, body: { text: "due soon plus something to wait on" } });

  const list = await api("/api/commitments", { token });
  const waitingItem = list.body.commitments.find((c) => c.title === "Waiting item");
  assert.ok(waitingItem);
  await api(`/api/commitments/${waitingItem.id}`, { method: "PATCH", token, body: { status: "waiting" } });

  const nudges = await api("/api/nudges", { token });
  assert.equal(nudges.status, 200);
  const due = nudges.body.nudges.find((n) => n.type === "due");
  const waiting = nudges.body.nudges.find((n) => n.type === "waiting");
  assert.ok(due);
  assert.equal(waiting, undefined, "A new waiting item must not trigger an immediate follow-up");
  await pool.query("INSERT INTO commitments(user_id, raw_input, title, type, status, updated_at) VALUES ($1,'test','Older waiting item','task','waiting',now() - interval '3 days')", [signup.user.id]);
  assert.ok((await api("/api/nudges", { token })).body.nudges.find(n => n.type === "waiting"));
  assert.match(due.message, /due in (1 day|24 hours)/);

  const missingAction = await api("/api/nudges/00000000-0000-0000-0000-000000000000/action", { method: "POST", token, body: { action: "resolved" } });
  assert.equal(missingAction.status, 404);
  assert.equal((await api("/api/nudges/123/action", { method: "POST", token, body: { action: "nope" } })).status, 400);

  const dismissed = await api(`/api/nudges/${due.id}/action`, { method: "POST", token, body: { action: "dismissed" } });
  assert.equal(dismissed.status, 200);
  assert.equal(dismissed.body.nudge.status, "dismissed");

  const after = await api("/api/nudges", { token });
  assert.equal(after.body.nudges.find((n) => n.id === due.id), undefined);
});

test("projects groups into chains with progress; insights returns stats", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Lia", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  nextExtraction = { reply: "ok", commitments: [
    { title: "Root project", type: "task", due_date: null, linked_to_title: null },
    { title: "Child task", type: "task", due_date: new Date(Date.now() - 864e5).toISOString(), linked_to_title: "Root project" },
    { title: "Loose task", type: "task", due_date: null, linked_to_title: null },
  ] };
  await api("/api/capture", { method: "POST", token, body: { text: "root project with child and one loose task" } });

  const projects = await api("/api/projects", { token });
  assert.equal(projects.status, 200);
  assert.equal(projects.body.projects.length, 2);
  const root = projects.body.projects.find((p) => p.title === "Root project");
  assert.equal(root.status, "active");
  assert.equal(root.total, 2);

  const insights = await api("/api/insights", { token });
  assert.equal(insights.status, 200);
  assert.ok(Array.isArray(insights.body.patterns) && insights.body.patterns.length >= 3);
  assert.equal(insights.body.stats.total, 3);
});

test("probes, API spec, docs, security headers, and unknown routes respond cleanly", async () => {
  assert.equal((await api("/api/live")).body.status, "ok");
  assert.equal((await api("/api/ready")).status, 200);

  const spec = await api("/api/openapi.json");
  assert.equal(spec.status, 200);
  assert.ok(spec.body.paths?.["/api/capture"]);
  assert.ok(spec.body.paths?.["/api/commitments"]);

  const docsRes = await realFetch(`${base}/api/docs`);
  assert.equal(docsRes.status, 200);
  assert.match(docsRes.headers.get("content-type"), /text\/html/);

  const root = await api("/");
  assert.equal(root.status, 200);
  assert.equal(root.body.name, "NEXT Africa API");

  const missing = await api("/api/nope");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, "Not found");
  assert.ok(missing.body.requestId);

  const healthRes = await realFetch(`${base}/api/health`);
  assert.ok(healthRes.headers.get("x-request-id"), "every response carries a request id");
  assert.equal(healthRes.headers.get("x-content-type-options"), "nosniff");
  assert.equal(healthRes.headers.get("x-frame-options"), "SAMEORIGIN");
});

test("commitments paginate with a stable cursor and bounded pages", async () => {
  const e = email();
  const { body: signup } = await api("/api/auth/signup", { method: "POST", body: { name: "Milo", email: e, password: "password123" } });
  const token = signup.token;
  createdUserIds.push(signup.user.id);

  for (const title of ["Page one", "Page two", "Page three"]) {
    nextExtraction = { reply: "ok", commitments: [{ title, type: "task", due_date: null, linked_to_title: null }] };
    const cap = await api("/api/capture", { method: "POST", token, body: { text: title } });
    assert.equal(cap.status, 201);
  }

  const first = await api("/api/commitments?limit=2", { token });
  assert.equal(first.body.commitments.length, 2);
  assert.ok(first.body.nextCursor);

  const second = await api(`/api/commitments?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`, { token });
  assert.equal(second.body.commitments.length, 1);
  assert.equal(second.body.nextCursor, null);

  const seen = new Set([...first.body.commitments, ...second.body.commitments].map((c) => c.id));
  assert.equal(seen.size, 3, "pages must not overlap or drop items");

  const pageOfOne = await api("/api/commitments?limit=0", { token });
  assert.equal(pageOfOne.body.commitments.length, 1, "limit floors at 1");
});

test("capture passes private project context and saved timezone; links only owned IDs", async () => {
  const { body: user } = await api("/api/auth/signup", { method: "POST", body: { name: "Context", email: email(), password: "password123" } });
  createdUserIds.push(user.user.id);
  const token = user.token;
  assert.equal((await api("/api/settings", { method: "PATCH", token, body: { timezone: "Africa/Nairobi" } })).status, 200);
  assert.equal((await api("/api/settings", { method: "PATCH", token, body: { timezone: "Invalid/Zone" } })).status, 400);
  nextExtraction = { reply: "Saved", commitments: [{ title: "Acme proposal", type: "task", due_date: null, linked_to_title: null }] };
  const first = await api("/api/capture", { method: "POST", token, body: { text: "Prepare Acme proposal" } });
  const root = first.body.commitments[0];
  nextExtraction = { reply: "Linked", commitments: [{ title: "Follow up with Acme", type: "task", due_date: null, linked_commitment_id: root.id }] };
  const second = await api("/api/capture", { method: "POST", token, body: { text: "Follow up about that proposal" } });
  assert.equal(second.body.commitments[0].linked_commitment_id, root.id);
  assert.match(lastExtractionRequest.messages[0].content, /Africa\/Nairobi/);
  assert.ok(lastExtractionRequest.messages[0].content.includes(root.id));
  const { body: other } = await api("/api/auth/signup", { method: "POST", body: { name: "Other", email: email(), password: "password123" } });
  createdUserIds.push(other.user.id);
  const foreign = await api("/api/capture", { method: "POST", token: other.token, body: { text: "Another task" } });
  assert.equal(foreign.body.commitments[0].linked_commitment_id, null);
  assert.ok(!lastExtractionRequest.messages[0].content.includes(root.id));
  assert.equal((await api(`/api/commitments/${root.id}`, { token: other.token })).status, 404);
});

test("invalid AI dates fail without saving partial commitments; image uses vision content", async () => {
  const { body: user } = await api("/api/auth/signup", { method: "POST", body: { name: "Files", email: email(), password: "password123" } });
  createdUserIds.push(user.user.id);
  const token = user.token;
  nextExtraction = { reply: "Saved", commitments: [{ title: "Invalid date", type: "task", due_date: "someday" }] };
  assert.equal((await api("/api/capture", { method: "POST", token, body: { text: "test" } })).status, 500);
  assert.equal((await api("/api/commitments", { token })).body.commitments.length, 0);
  nextExtraction = { reply: "Saved", commitments: [{ title: "Image commitment", type: "task", due_date: null }] };
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZwoAAAAASUVORK5CYII=";
  assert.equal((await api("/api/capture/file", { method: "POST", token, body: { filename: "screenshot.png", content_base64: png } })).status, 201);
  assert.equal(lastExtractionRequest.messages[1].content[1].type, "image_url");
  assert.equal((await api("/api/capture/file", { method: "POST", token, body: { filename: "fake.pdf", content_base64: Buffer.from("not a PDF").toString("base64") } })).status, 400);
});

test("drafts do not complete tasks; edits and explicit completion persist", async () => {
  const { body: user } = await api("/api/auth/signup", { method: "POST", body: { name: "Work", email: email(), password: "password123" } });
  createdUserIds.push(user.user.id);
  const token = user.token;
  nextExtraction = { reply: "Saved", commitments: [{ title: "Follow up on invoice", type: "task", due_date: null }] };
  const capture = await api("/api/capture", { method: "POST", token, body: { text: "Follow up" } });
  const item = capture.body.commitments[0];
  const draft = await api(`/api/commitments/${item.id}/draft`, { method: "POST", token });
  assert.equal(draft.body.sent, false);
  assert.equal(draft.body.draft, nextDraft);
  assert.equal((await api(`/api/commitments/${item.id}`, { token })).body.commitment.status, "open");
  const edit = await api(`/api/commitments/${item.id}`, { method: "PATCH", token, body: { title: "Review invoice", due_date: "2026-10-01T15:00:00+03:00" } });
  assert.equal(edit.body.commitment.due_date, "2026-10-01T12:00:00.000Z");
  assert.equal((await api(`/api/commitments/${item.id}`, { method: "PATCH", token, body: { status: "done" } })).body.commitment.status, "done");
});

test("reminder preferences change horizons and snoozes expire", async () => {
  const { body: user } = await api("/api/auth/signup", { method: "POST", body: { name: "Reminders", email: email(), password: "password123" } });
  createdUserIds.push(user.user.id);
  const token = user.token;
  const { rows: [item] } = await pool.query("INSERT INTO commitments(user_id, raw_input, title, type, due_date) VALUES ($1,'test','Later deadline','task',now() + interval '5 days') RETURNING *", [user.user.id]);
  assert.equal((await api("/api/nudges", { token })).body.nudges.length, 0);
  await api("/api/settings", { method: "PATCH", token, body: { proactivity_level: "active" } });
  assert.equal((await api("/api/nudges", { token })).body.nudges.length, 1);
  const key = `due:${item.id}`;
  await api(`/api/nudges/${key}/action`, { method: "POST", token, body: { action: "dismissed" } });
  assert.equal((await api("/api/nudges", { token })).body.nudges.length, 0);
  await pool.query("UPDATE nudges SET resolved_at = now() - interval '25 hours' WHERE user_id=$1", [user.user.id]);
  assert.equal((await api("/api/nudges", { token })).body.nudges.length, 1);
  await api("/api/settings", { method: "PATCH", token, body: { proactivity_level: "quiet" } });
  assert.equal((await api("/api/nudges", { token })).body.nudges.length, 0);
});

test("background reminders deliver once per day, retry failures, and remove expired subscriptions", async () => {
  const { dispatchReminders } = await import("../src/lib/push.js");
  const webpush = (await import("web-push")).default;
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_SUBJECT = "https://example.com";
  const { body: user } = await api("/api/auth/signup", { method: "POST", body: { name: "Push", email: email(), password: "password123" } });
  createdUserIds.push(user.user.id);
  const token = user.token;
  await pool.query("INSERT INTO commitments(user_id, raw_input, title, type, due_date) VALUES ($1,'private','Private client name','task',now())", [user.user.id]);
  const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/test-next", keys: { p256dh: keys.publicKey, auth: "a".repeat(22) } };
  assert.equal((await api("/api/notifications/subscribe", { method: "POST", token, body: { ...sub, endpoint: "http://localhost/internal" } })).status, 400);
  assert.equal((await api("/api/notifications/subscribe", { method: "POST", token, body: sub })).status, 200);
  let sends = 0;
  await dispatchReminders(async () => { throw Object.assign(new Error("retry"), { statusCode: 503 }); });
  await dispatchReminders(async (_subscription, payload) => { sends++; assert.ok(!payload.includes("Private client name")); });
  await dispatchReminders(async () => { sends++; });
  assert.equal(sends, 1);
  await pool.query("DELETE FROM push_deliveries WHERE endpoint=$1", [sub.endpoint]);
  await dispatchReminders(async () => { throw Object.assign(new Error("expired"), { statusCode: 410 }); });
  assert.equal((await pool.query("SELECT 1 FROM push_subscriptions WHERE endpoint=$1", [sub.endpoint])).rowCount, 0);
});
