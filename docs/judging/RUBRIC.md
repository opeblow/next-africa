# Judge Rubric → Our Evidence Map

Submitted work must be judged on the published rubric. This document maps every
criterion to a concrete, verifiable artifact so a judge (or jury member) can
score us at the top band of each category.

Rubric: technical execution 35%, problem fit 25%, demo/communication 20%,
originality/innovation 20%.

---

## 1. Technical execution (35%)

| Sub-criterion a judge checks | What we show | Where they can verify |
| --- | --- | --- |
| It actually works end to end | Full-stack: React SPA + Express API + Postgres. Text, file, and voice input all persist structured commitments and power Today/Projects/Nudges/Insights. | Run the app; smoke tests in `frontend/e2e` |
| Data is safe and consistent | Capture runs inside one transaction; a bad LLM response can never corrupt data. Password hashing (bcrypt, cost 12). Parameterised SQL only. | `backend/src/db/pool.js`, capture in `backend/src/app.js` |
| The AI layer is robust | Forced tool-call schema, UTC-stamped prompt for relative dates, timeout + bounded retries, clear unavailable response when the key/model is missing. | `backend/src/llm/extract.js`, `assertEnv` in `backend/src/config.js` |
| Production-grade HTTP | Helmet headers, CORS allowlist, per-route rate limits, Zod validation with `400` shapes, request ids, structured pino logs. | `backend/src/app.js`, six spec tests in `backend/test/api.test.js` |
| It is genuinely testable | Automated backend regression tests (`npm test`), coverage command, Playwright smoke suite, one-command readiness check. | `npm run verify` |
| It deploys, not just runs on a laptop | CI (lint + tests + build) and CD (Cloudflare Pages + backend artifact) already defined; migrations run on boot. | `.github/workflows/` |
| It will not break at 5x users | Keyset pagination (stable cursor), composite indexes, prepared statements, connection pooling. | `backend/src/lib/pagination.js`, `backend/migrations/0002_*` |
| Observability | Liveness/readiness probes, request ids on every response, log redaction of `password*`, health endpoint reports DB state. | `GET /api/live`, `GET /api/ready`, `GET /api/health` |

**The one-sentence proof:** "Every request is validated, rate-limited, logged
with a request id, extracted in a database transaction, and covered by tests —
`npm run verify` proves the whole stack in one command."

---

## 2. Problem fit (25%)

- Built for how work actually arrives in African life: conversation, WhatsApp,
  voice notes, documents — not a desktop calendar. See
  `docs/PROBLEM-FIT.md` for the persona and scenario map.
- Every surface matches a real daily moment (the voice note while walking, the
  forwarded PDF, the follow-up you'd forget).
- Mobile-first, low-data, and designed for the channels where African work lives.

**The one-sentence proof:** "The product is the problem: commitments arrive in
conversation, and NEXT Africa turns conversation into commitments — no new
behaviour required from anyone."

---

## 3. Demo / communication (20%)

- The demo is rehearsed around a 3-minute script with a live voice note and two
  commitments visibly completed by the end. See `docs/DEMO-SCRIPT.md`.
- Every product claim in the demo is real and on screen — no mock data, no
  screenshots, one fallback video if the WiFi dies.

---

## 4. Originality / innovation (20%)

Three claims, each with proof. See `docs/INNOVATION.md`.

1. **Self-assembling projects** — commitments across different messages are
   linked into one project chain automatically. (Novel: most apps only build
   to-do lists within one session; we assemble projects across sessions.)
2. **Explicit conflict catching** — the capture pipeline detects overlapping
   deadlines/meetings and writes a nudge at the moment the conflict is created.
3. **User-controlled reminder preferences** — `proactivity_level` (quiet/balanced/
   active) actually changes how aggressively the product nudges you, from a
   first-class settings screen. (Personalization by behaviour, not by skin.)

**The one-sentence proof:** "Other teammates will demo 'LLM turns text into a
to-do list.' Our second commitment from a later message becomes part of the
same project, our clash is caught before it costs a client, and the product
uses the selected reminder preference — the difference between a to-do list and a copilot."

---

## Scoring summary (self-assessment vs. published rubric)

| Criterion | Weight | Where we win | Gap we must not create |
| --- | --- | --- | --- |
| Technical execution | 35% | Regression tests, transactions, security, pagination, CI/CD, observability | Demo flakiness (fixed by backup video) |
| Problem fit | 25% | Africa-first, WhatsApp/voice native, mobile, low-data | Do not pitch generic "task manager" language |
| Demo/communication | 20% | Scripted 3:00, real numbers, closed loop | Run over time (keep the clock visible) |
| Originality/innovation | 20% | Linking, conflict nudges, proactivity level | Forgetting to claim them out loud |