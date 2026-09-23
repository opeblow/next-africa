# NEXT — CONNECTIONS & SYSTEM DESIGN

Authoritative map of **every** endpoint, webhook, integration and frontend↔backend
connection in NEXT, plus the scaling plan for going from a hackathon demo to
millions of real users.

> Status: every backend endpoint IMPLEMENTED and passing the integration
> suite (`npm test -w backend`, 17/17). The frontend consumes the API for
> auth, dashboard, capture (text/file/voice), projects, nudges, insights and
> settings; every in-product screen is data-driven with no fabricated demo
> data (§5).

---

## 1. Architecture at a glance

```
┌───────────────────────────────┐         ┌──────────────────────────────┐
│   Browser — Vite/React SPA     │         │   Node 24 + Express 5 (ESM)  │
│   frontend/src/App.jsx         │  HTTPS  │   backend/src/app.js         │
│   · state-based routing        │ ──────> │   · public + guarded routes  │
│   · localStorage auth tokens   │         │   · requireAuth (JWT)        │
│   · api() helper (Bearer)      │ <────── │   · CORS allowlist `FRONTEND_ORIGIN` │
└───────────────────────────────┘         └──────────────┬───────────────┘
                                                         │ (pg Pool)
                                          ┌──────────────▼───────────────┐
                                          │  PostgreSQL 17 — users,       │
                                          │  commitments (enums, fks,     │
                                          │  updated_at triggers)         │
                                          └───────────────────────────────┘
                                          Outbound: api.openai.com
                                          (GPT-4o mini, tool-call extraction)
```

- **Auth model:** JWT (HS256, 7d expiry) issued on signup/login. Stateless —
  no server-side session store, so any API instance can serve any request
  (this is what makes horizontal scaling trivial later).
- **Frontend base URL:** `VITE_API_URL || "http://localhost:3001"`
  (`frontend/src/lib/api.js:1`). Dev proxy `/api → :3001` exists in
  `vite.config.js`, but the app calls the absolute URL directly, so
  **`VITE_API_URL` must be set at build time for production** (see §6 gap G1).
- **Token plumbing:** every authenticated call sends
  `Authorization: Bearer <next-token>` (App.jsx:4-17).

---

## 2. COMPLETE endpoint reference (backend)

All routes live in `backend/src/app.js`. Auth middleware:
`backend/src/middleware/auth.js` (reads `Authorization: Bearer`, verifies
`JWT_SECRET`, sets `req.user_id`, returns 401 on missing/invalid).

| # | Method & Path               | Auth | Body / Query                                | Success response                                        | Errors |
|---|-----------------------------|------|---------------------------------------------|---------------------------------------------------------|--------|
| 0 | `GET /`                     | –    | –                                           | `{name:"NEXT Africa API", health:"/api/health", docs:"/api/docs"}` | –      |
| 1 | `GET /api/health`           | –    | –                                           | `{status:"ok", db:"connected", uptime, time}`            | 503 db unreachable |
| 2 | `GET /api/live`             | –    | –                                           | `{status:"ok"}`                                          | –      |
| 3 | `GET /api/ready`            | –    | –                                           | `{status:"ready", db:"connected"}`                       | 503 db unreachable |
| 4 | `GET /api/openapi.json`     | –    | –                                           | OpenAPI 3.1 document                                    | –      |
| 5 | `GET /api/docs`             | –    | –                                           | Redoc HTML reference                                    | –      |
| 6 | `POST /api/auth/signup`     | –    | `{name, email, password}` (pw ≥ 8)          | `201 {token, user:{id,name,email,proactivity_level}}`    | 400 bad input, 409 email exists, 500 |
| 7 | `POST /api/auth/login`      | –    | `{email, password}`                         | `{token, user}`                                          | 400, 401 wrong creds, 500 |
| 8 | `POST /api/capture`         | ✓    | `{text}`                                    | `201 {reply, commitments[], next_step_prompt, conflict?}` | 400, 401, 503 (no LLM key), 500 |
| 8a | `POST /api/capture/file`   | ✓    | `{filename, content_base64}` (text files, ≤ 12 MB base64) | `201 {reply, filename, commitments[], next_step_prompt, conflict?}` | 400 bad input, 401, 413 too large, 503, 500 |
| 8b | `POST /api/capture/voice`  | ✓    | `{audio_base64, mime_type}` (≤ 15 MB audio) | `201 {reply, transcript, commitments[], next_step_prompt, conflict?}` | 400 bad input, 401, 413 too large, 503, 500 |
| 9 | `GET /api/commitments`      | ✓    | `?status=open\|waiting\|done`               | `{commitments[], nextCursor}` newest first, keyset-cursor  | 400 bad status, 401 |
| 10 | `GET /api/dashboard`        | ✓    | –                                           | `{today[], waitingFor[], projects[]}`                    | 401, 500 |
| 11 | `PATCH /api/commitments/:id`| ✓    | `{status}` (open/waiting/done)              | `{commitment}` (full row)                                | 400, 401, 404 (not found / not yours) |
| 12 | `GET /api/settings`         | ✓    | –                                           | `{proactivity_level}`                                    | 401, 404 |
| 13 | `PATCH /api/settings`       | ✓    | `{proactivity_level}` (quiet/balanced/active) | `{proactivity_level}`                                 | 400, 401, 404 |
| 14 | `GET /api/projects`        | ✓    | –                                           | `{projects[]}` grouped commitment chains                 | 401, 500 |
| 15 | `GET /api/nudges`          | ✓    | –                                           | `{nudges[]}` persisted + computed due/waiting            | 401, 500 |
| 16 | `POST /api/nudges/:id/action`| ✓  | `{action}` (resolved/dismissed)             | `{ok:true}`                                              | 400, 401, 404 |
| 17 | `GET /api/insights`        | ✓    | –                                           | `{patterns[], stats{}}` deterministic, no LLM            | 401, 500 |

**Global rules (all endpoints):**
- 401 for missing/invalid token (`requireAuth`).
- 404 for a commitment that does not exist **or belongs to another user**
  (PATCH #7 is scoped `WHERE id=$1 AND user_id=$2` — never leaks whether a
  row exists).
- 400 for bad input; unknown `body`/`status`/`proactivity_level` values
  rejected.
- Every handler: logs server-side via pino (`backend/src/lib/logger.js`),
  generic client message, **stack traces never leak** (global error handler,
  app.js:492).
- `updated_at` auto-maintained by DB triggers (schema.sql).

### 2.1 POST /api/auth/signup & /api/auth/login
- Password hashed with **bcrypt, cost 12** (signup), verified on login.
- Signup creates user with `proactivity_level` default `'balanced'`.
- `password_hash` never returned.
- Duplicate email → 409 (Postgres unique violation `23505`).
- `JWT_SECRET` is required (backend/.env).

### 2.2 POST /api/capture  (the LLM pipeline)
1. Validates `{text}`.
2. Calls `backend/src/llm/extract.js` → OpenAI Chat Completions API with a forced
   **tool scope** `record_commitments` (see §4).
3. Returns `{reply, commitments:[...]}`; each commitment has `type` enum
   `task|deadline|meeting|reminder`, `due_date` ISO or `null`,
   `linked_to_title`.
4. **Linking:** if `linked_to_title` matches an existing **open** commitment
   owned by the user (case-insensitive `title` match, latest first), sets
   `linked_commitment_id`.
5. **Conflict nudge:** when an extracted item is `type=deadline|meeting` with
   a `due_date`, and the user already has an open commitment within
   **± 2 hours** of that due date, response gains:
   ```json
   "conflict": {
     "withCommitmentId": "<uuid>",
     "withTitle": "<title>",
     "suggestion": "“<new>” is close to “<existing>”. Consider moving one so you have breathing room."
   }
   ```
   Guaranteed 201: `{ reply, commitments, conflict, next_step_prompt }`. The
   frontend renders `conflict.suggestion` as the nudge banner and
   `next_step_prompt` as the "starting with the first item?" line. Conflicts
   are also **persisted** to the `nudges` table (`type='conflict'`,
   `source_key='conflict:<id>'`) so they survive reloads.
6. Entire write is wrapped in a transaction (`BEGIN`/`COMMIT`/`ROLLBACK`).

### 2.3 GET /api/dashboard — the three buckets
| Key          | Query semantics (app.js:95)                                              |
|--------------|--------------------------------------------------------------------------|
| `today`      | `status='open' AND due_date <= CURRENT_DATE + interval '1 day'` (due today or earlier), by due_date asc |
| `waitingFor` | `status='waiting'`, newest first                                          |
| `projects`   | all user commitments grouped by `linked_commitment_id` chains into `{rootCommitmentId, commitments[]}` |

> Note - timezone: the "today" boundary uses the **server's** `CURRENT_DATE`.
> For a real product each user needs a stored timezone (see §8 hardening).

### 2.4 Who responds 404 (PATCH /api/commitments/:id)
`UPDATE ... WHERE id=$1 AND user_id=$3` → `rowCount=0` → 404. Covers both
"doesn't exist" and "exists but not yours" with one identical response.

---

## 3. FRONTEND COMPONENT ↔ ENDPOINT MAP (every screen in App.jsx)

Routing is client-side state in `App()`: `home | auth | dashboard | chat |
settings | analysis | plan | execute | results | complete | nudges |
projects | intelligence`.

| Screen / component                     | Location (App.jsx)                            | Makes API call? | Endpoint(s)                     | Data source today |
|----------------------------------------|------------------------------------------------|-----------------|----------------------------------|-------------------|
| `api()` helper                          | 4-17                                           | –               | all                               |— |
| Landing / home                          | 1765-1959                                      | ✗               | none                              | static marketing |
| Auth — signup mode                      | 1517-1680 (submit 1529-1551)                   | ✓               | `POST /api/auth/signup`           | API |
| Auth — signin mode                      | same                                          | ✓               | `POST /api/auth/login`            | API |
| Auth — reset-password mode              | 1531-1534                                      | ✗ (stub)        | none — shows notice only          | static |
| Auth — "Continue with Google"           | 1607-1615                                      | ✗ (stub)        | none — shows notice only          | static |
| Dashboard                               | 1124-1290                                      | ✓               | `GET /api/dashboard`              | API; error banner on failure (no demo fallback) |
| Chat                                    | 1139-1355                                      | ✓               | `POST /api/capture`, `/api/capture/file`, `/api/capture/voice` | API; error shown, no fabricated fallback |
|   · `capture.next_step_prompt` render   | ~1360                                          | ✓               | sent by capture                   | API |
| Settings                                | 1415-1492                                      | ✓               | `GET`/`PATCH /api/settings`       | API + localStorage cache |
| Projects                                | 895-1010                                       | ✓               | `GET /api/projects`               | API |
| Nudges                                  | 787-895                                        | ✓               | `GET /api/nudges`, `POST /api/nudges/:id/action` | API |
| Intelligence                            | 1015-1115                                      | ✓               | `GET /api/insights`               | API |
| Execution Loop: analysis / plan / execute / results / complete | 215-640   | ✓ (results only) | `PATCH /api/commitments/:id` on finalize | `next-goal` localStorage, set by Chat capture; empty state until then |
| Results “Download results”              | 480-580                                       | ✗               | client-side CSV (`data:`)         | generated in browser from `next-goal` |
| Profile menu — Log out                  | 197-206                                        | ✗               | none (clears all `next-*` keys)   | – |

**localStorage keys in use:** `next-token`, `next-user`, `next-user-id`,
`next-proactivity-level` (settings cache), `next-goal` (active Execution Loop
goal `{title, commitments[], createdAt}`, written by Chat on capture and
cleared on logout).

### 3.1 Response → render contracts (what the UI consumes)
- **Signup/login** `{token, user}` → stores all three, then routes to
  `dashboard`.
- **Dashboard** `{today, waitingFor, projects}` → three board columns
  (Today / Waiting for / Projects). Rows render the real `due_date`
  (`Due <date>`), not a hardcoded estimate. `projects[]` uses
  `commitments[0].title` + count.
- **Capture** `{reply, commitments, conflict, next_step_prompt}` →
  confirmation bubble with extracted item list
  (`type === "meeting" ? "▣" : "✓"`), `conflict.suggestion` banner, and
  `next_step_prompt`. File captures add `{filename}`; voice captures add
  `{transcript}`. On success the UI writes `next-goal` so the Execution Loop
  screens render the same commitments (or their empty state before any capture).
- **Projects** `{projects[]}` → tabs filter by `status` (active/completed),
  progress bar from `progress`, due label from `due`.
- **Nudges** `{nudges[]}` → cards; buttons POST `{action}` and the card drops
  out on success.
- **Intelligence** `{patterns[], stats}` → pattern list + completion-rate badge.
- **Settings** `{proactivity_level}` → slider state, cached in localStorage;
  PATCH optimistic update.

---

## 4. Integrations & webhooks

### 4.1 Currently live (outbound)
**OpenAI — commitment extraction** (`backend/src/llm/extract.js`)
- `POST https://api.openai.com/v1/chat/completions`
- Headers: `authorization: Bearer $OPENAI_API_KEY`, `content-type: application/json`.
- Model configurable via `OPENAI_MODEL`, default `gpt-4o-mini`; `max_tokens: 900`.
- Tool `record_commitments` forced via `tool_choice` (`type: "function"`).
  Tool schema returns `{reply, commitments:[{title, type, due_date, linked_to_title}]}`.
- No `OPENAI_API_KEY` → capture returns **503 `"Capture is not configured yet"`**.
- Timeout (`OPENAI_TIMEOUT_MS`, 30s) + bounded exponential backoff
  (`OPENAI_MAX_RETRIES`, retry on 429/5xx) via `fetchWithRetry`.

**OpenAI — voice transcription** (`transcribeAudio` in the same module)
- `POST https://api.openai.com/v1/audio/transcriptions` (multipart `file` + `model`).
- Model configurable via `OPENAI_TRANSCRIBE_MODEL`, default `whisper-1`.
- Returns `{text}`; the transcript is then run through the same extraction pipeline.
- File and voice payloads are base64 JSON (no new backend dependencies); the
  express JSON limit is raised to 15 MB.

### 4.2 Planned webhooks (design them in BEFORE they're needed)
All inbound webhooks MUST: verify signature, respond `200` fast, enqueue work,
be idempotent (accept/duplicate-check `X-Idempotency-Key`), retry with
backoff + dead-letter.

| Webhook             | Route (planned)             | Trigger                                            | Notes |
|---------------------|-----------------------------|----------------------------------------------------|-------|
| WhatsApp inbound    | `POST /api/webhooks/whatsapp` | user forwards a message / voice note → capture | verify `X-Twilio-Signature` (HMAC-SHA1 + auth token); auth-user by phone mapping |
| Email inbound       | `POST /api/webhooks/email`   | forwarded email → capture + attachments            | (Resend/Mailgun) domain signature + DKIM policy |
| Google OAuth        | `GET /api/auth/google/callback` | “Continue with Google” (currently a stub)      | PKCE; exchange code server-side |
| Stripe (future billing) | `POST /api/webhooks/stripe` | payment/checkout events                           | verify `Stripe-Signature` with `whsec_`; respond 401 on bad sig |
| Outbound nudges     | scheduled job (cron)         | due/waiting/conflict follow-ups by proactivity_level | queue-distributed, not request-time |

**Rule for this repo:** never expose a secret in a webhook URL; always
signature-verify; never trust the body until verified.

---

## 5. WHAT TO CONNECT NEXT — demo → real (blockers for launch)

The user explicitly wants **no hardcoded/seeded demo data** in the published
product. These are the exact spots + the endpoints/schema changes that replace
them:

| # | Where (file:line)                       | Problem today                                  | Required work |
|---|------------------------------------------|------------------------------------------------|---------------|
| D1 | Chat override `segun`/`attendance`      | Real capture is bypassed                       | Done - Removed — always calls `POST /api/capture` |
| D2 | Chat error fallback                      | On API failure it **invents** commitments     | Done - Removed — shows error state |
| D3 | `next_step_prompt`                      | UI read a field the API never sent            | Done - Backend now returns `next_step_prompt`; UI renders it |
| D4 | Dashboard demo state + “Attendance Report” card + `slice(1)` | Static first card & fake fallback | Done - Removed — starts empty, surfaces every `today[]` item |
| D5 | Dashboard time estimate                  | “30-45 mins” was fake                       | Done - Uses real `due_date` text |
| D6 | Projects screen                          | Hardcoded active/completed arrays             | Done - `GET /api/projects` → `{id,title,due,progress,status}` per chain |
| D7 | Nudges screen                            | Local `useState`, resolved locally            | Done - `GET /api/nudges` + `POST /api/nudges/:id/action`; server generates from due/waiting/conflict |
| D8 | Intelligence screen                      | Static “patterns”                             | Done - `GET /api/insights` — deterministic patterns + stats |
| D9 | Execution Loop screens (analysis→complete) | Fully static demo of a file-processing run | Done - Data-driven from `next-goal` (localStorage, set by Chat capture): real commitments, empty states, step 6. Dedicated executions pipeline (`POST /api/executions`, streaming) still future work |
| D10 | Auth default values                     | Pre-filled Paul/paul@next.africa/password123  | Done - Removed all `defaultValue`s |
| D11 | Password reset stub                      | No endpoint behind it                         | Open - `POST /api/auth/forgot` + `POST /api/auth/reset` + email webhook (4.2) |
| D12 | Google button stub                       | Notice only                                  | Open - Google OAuth flow (4.2) |
| D13 | `GET /api/commitments` unused by UI      | Endpoint exists, only dashboard is consumed   | Open — add a project-detail screen; keep for future |
| D14 | Logout                                   | Removed only `next-token`                     | Done - Clears `next-token`, `next-user`, `next-user-id`, `next-proactivity-level`, `next-goal` |
| —   | `nudges` table                           | No persistence for nudges                     | Done - Added `nudges` + `nudge_status` enum (schema.sql) |

---

## 6. Env vars & secrets

| Var | Where | Purpose | Current value |
|-----|-------|---------|---------------|
| `DATABASE_URL` | backend/.env | Postgres conn string | `postgres://postgres:postgres@localhost:5432/next` (dev) |
| `PORT` | backend/.env | API port | `3001` |
| `JWT_SECRET` | backend/.env | Signs/verifies JWTs | dev placeholder — **must** become a long random secret in prod |
| `OPENAI_API_KEY` | backend/.env | OpenAI extraction | set (dev) — rotate before prod |
| `OPENAI_MODEL` | backend/.env | Extraction model override | unset → `gpt-4o-mini` |
| `FRONTEND_ORIGIN` | backend/.env | CORS allowlist (comma-separated) | `http://localhost:5173` |
| `VITE_API_URL` | frontend build env | Base URL for all fetches | unset → `http://localhost:3001` (default) |

**G1 (resolved):** `frontend/.env.example` now exists with
`VITE_API_URL=http://localhost:3001`. For production, copy it to
`frontend/.env` (or set the build env) with `VITE_API_URL=https://api.next.africa`
before building, or API calls point at the user's localhost and break.

---

## 7. Test coverage (verified — `npm test -w backend`, 17/17 pass)

File: `backend/test/api.test.js`. The OpenAI call is stubbed via
`globalThis.fetch` so the whole pipeline is tested offline.

| Endpoint            | Scenario covered                                        |
|---------------------|----------------------------------------------------------|
| health              | 200 `{db:"connected"}`                                   |
| signup              | 400 short pw · 201 balanced+no hash · 409 duplicate      |
| login               | 200 token · 401 wrong password                           |
| requireAuth         | 401 missing token · 401 invalid token                    |
| capture             | 201 reply+2 commitments · auto-link via `linked_to_title` · 400 missing text |
| nudge (capture #8)  | no conflict when isolated · `conflict` object on 2nd meeting within 2h with correct `withCommitmentId` |
| list commitments    | all · `?status=open` · `?status=done` empty · 400 `?status=bogus` |
| dashboard + PATCH   | three buckets present · `today` contains due-today item · PATCH→waiting reflects in dashboard · 400 bad status · 404 unknown id |
| PATCH ownership     | 404 when patching another user's commitment; 200 for owner |
| settings            | GET balanced · PATCH active · 400 `loud`                 |

Run: `npm test -w backend` (root: `npm test -w backend` via workspaces).

---

## 8. SYSTEM DESIGN — scaling to millions of users

### 8.1 What today's code already gives us (free wins)
- **Stateless API** (JWT, no sessions) → N instances behind a load balancer work today.
- **User-scoped everything** — every query filters `user_id`/`id`; multi-tenant safe.
- Per-user data is small & bounded (own commitments) → sharding/partitioning is straightforward.
- Idempotent schema bootstrap; graceful shutdown (`SIGINT`/`SIGTERM`).
- No stack-trace leakage; ownership 404s; enum-validated inputs.

### 8.2 Phase 1 — ship solid (10k–100k users, ONE region)
| Item | Action |
|------|--------|
| **HTTPS / proxy** | Nginx/Caddy (or Cloudflare tunnel) terminates TLS; app behind it. Set Express `app.set('trust proxy', 1)` for correct IPs/logs. |
| **CORS** | Replace open `cors()` with an explicit origin allowlist (your domain). Never `*` with credentials. |
| **Rate limiting** | `express-rate-limit`: global (e.g. 300/min/ip) **plus** strict limits on `POST /api/auth/login` (brute force) and `POST /api/capture` (**LLM cost DoS guard** — per-user daily quota, e.g. 50 captures/user/day). |
| **Serve the SPA** | Build `frontend` → static `dist/`, serve from CDN (CloudFront/Cloudflare) or the Nginx box; keep `/api` same-origin to kill CORS entirely. Set `VITE_API_URL` at build. |
| **Health for LB probes** | Add lightweight `GET /healthz` (process up) + `GET /readyz` (DB ping) alongside the existing rich `/api/health`. |
| **Observability** | Request-ID middleware + structured JSON logs → aggregate (Loki/Axiom/CloudWatch). Log `console.error` lines with request context. |
| **Backups** | Daily snapshot + WAL/PITR archiving; test a restore **before launch**. |
| **Hardening** | bcrypt cost 12 is fine at this scale; add `helmet` (security headers); secrets via env/manager, never repo; rotate `JWT_SECRET` with `kid` support when ready. |

### 8.3 Phase 2 — scale read-heavy APIs (100k–1M users)
| Item | Action |
|------|--------|
| **Horizontal API** | Put N stateless API instances behind a load balancer (ALB/Hetzner LB); autoscale on CPU + p95 latency; target **~3–5k req/s per core** for simple JSON handlers. |
| **Connection pooling at the DB** | Node `pg` pool is client-side; add **PgBouncer** (transaction mode) so 100 instances × 50 connections don't exhaust Postgres. Size `pool.max` to `(small)` — the bottleneck is the DB not the process. |
| **Index for dashboard** | Today's query needs a **composite index `(user_id, status, due_date)`** (the current `user_id`/`status`/`due_date` singletons won't cover it). |
| **Timezone correctness** | Store per-user `timezone`; bucket “today” by the **user's** day, not `CURRENT_DATE` (server-dependent today). |
| **Cache hot reads** | Redis: dashboard payload per user (TTL ~20–30s, invalidate on capture/PATCH) and settings. Dashboard is per-user bounded, so this is cheap and high-hit. |
| **Take LLM out of the request path** | `POST /api/capture` currently blocks on OpenAI (~1–3s). Enqueue (Redis queue / BullMQ) → poll or SSE/WebSocket for the result. Also gives you the async `next_step_prompt` and progress (D9) for free. |
| **Idempotency** | Accept `Idempotency-Key` on capture/PATCH to survive client retries without duplicate commitments. |
| **Read replicas** | SELECT-heavy reporting reads → replica; writes stay on primary. |
| **bcrypt on hot path** | Logins spike at morning peak; consider WebAuthn/passkeys (kills password+bcrypt entirely) or dedicated auth worker pool. |

### 8.4 Phase 3 — millions of users
| Item | Action |
|------|--------|
| **Data architecture** | Partition `commitments` by `user_id` (native Postgres declarative partitioning) or move to Citus. Archive `done` commitments to cold storage. |
| **Multi-region** | Static app on global CDN (all regions); API pods per-region behind global LB; read replicas per region; writes to primary region first / async replicate (or edge DB). |
| **Queues & workers** | Independent, autoscaled workers for: capture pipeline, nudges cron (via `proactivity_level`), email/SMS delivery, executions (D9), LLM jobs. Distributed scheduler (BullMQ repeatable jobs / Temporal) with retries + dead-letter; never schedule "now" in a request handler. |
| **LLM economics** | Per-user daily quotas, model routing (cheap model for simple, sonnet for hard), prompt/budget caps, streaming, response caching for identical inputs. |
| **Capacity math (illustrative)** | 1M users, 10% DAU, each doing ~2 dashboard loads + ~1 capture/day → peak ~300–500 req/s. ~6–10 API instances handle it; Postgres primary with replicas + PgBouncer covers reads; capture throughput is the real constraint → queue workers scale independently. |
| **Delivery** | Deploys via CI/CD with migration step (DB `ALTER`/versioned migrations in CI — **stop running `ensureSchema` on every boot** when many instances can race). Blue/green or canary. Feature flags. |
| **Reliability** | SLOs + alerts (p95 dashboard < 300ms, capture success > 99%, no 5xx storms); distributed tracing (OpenTelemetry); error capture (Sentry-class) with release tagging. |
| **Retention/governance** | Data residency for NG/KE/UG/GH (EU-style or regional hosting); delete/export endpoints for privacy law; audit logs; SSO/org support when teams arrive. |

### 8.5 Non-negotiables before "real users"
1. Remove every demo branch in §5 (nothing fabricated in the UI).
2. Set `OPENAI_API_KEY`, real `JWT_SECRET`, real `DATABASE_URL`, real `VITE_API_URL`.
3. CORS allowlist + rate limits + `helmet` — **done in dev**: `FRONTEND_ORIGIN`
   whitelists `http://localhost:5173`, rate limits on auth (50/min) and
   capture (60/min), security headers via `helmet`. Add your prod origin to
   `FRONTEND_ORIGIN` before deploying.
4. Git: this folder is **not** a git repo yet — `git init`, commit, push to a private remote; never commit secrets (`.env` is ignored already).
5. Backups + a tested restore; HTTPS only; health/ready probes.

---

*Generated from a full audit of `backend/src/app.js`, `backend/src/middleware/auth.js`, `backend/src/llm/extract.js`, `backend/src/db/schema.sql`, `backend/test/api.test.js`, and `frontend/src/App.jsx` (1960 lines) + `frontend/src/index.css`.*