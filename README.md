# NEXT Africa — a personal execution copilot

NEXT Africa turns the messy, natural-language promises of everyday life ("send the
proposal before the Thursday meeting", "remind me to follow up with Dana") into
structured **commitments** — then helps you actually finish them.

Built for the **Borderless Bytes Hackathon** and designed Africa-first: mobile-first,
low-data, WhatsApp-native, and honest about the way work really arrives.

<p align="center">
  <img src="./docs/assets/002-hero.gif" alt="NEXT Africa hero — the repeatedly shown promise, captured and followed through" width="640" />
</p>

> **The promise in one line:** tell NEXT Africa what matters in the same words
> you'd use in a WhatsApp message — it makes sure it actually happens.

<!-- The repo owner is "opeblow". Keep the two URLs below in sync. -->
<p align="center">
  <a href="https://github.com/opeblow/next-africa/actions/workflows/ci.yml"><img src="https://github.com/opeblow/next-africa/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-5c4de2.svg" alt="License: MIT" /></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="#the-african-problem"><img src="https://img.shields.io/badge/made%20in-Africa-yellow.svg" alt="Made in Africa" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=white" alt="React" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-8-646cff.svg?logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-24-339933.svg?logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-5-000000.svg?logo=express&logoColor=white" alt="Express" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-17-4169e1.svg?logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://openai.com"><img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991.svg?logo=openai&logoColor=white" alt="OpenAI" /></a>
</p>

---

## Documentation

| Document | What it covers |
| -------- | -------------- |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System diagram, request lifecycle, data model, frontend layout |
| [`docs/API.md`](./docs/API.md) | Auth, endpoint summary, error shapes (live spec at `GET /api/docs`) |
| [`docs/PROBLEM-FIT.md`](./docs/PROBLEM-FIT.md) | Personas, scenarios, and why existing tools fail them |
| [`docs/INNOVATION.md`](./docs/INNOVATION.md) | The three originality claims, each with code proof |
| [`docs/judging/RUBRIC.md`](./docs/judging/RUBRIC.md) | Evidence map against the published judging rubric |
| [`docs/DEMO-SCRIPT.md`](./docs/DEMO-SCRIPT.md) | The 3-minute winning demo script |
| [`docs/adr/`](./docs/adr) | Architecture decision records |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Setup, branch/commit conventions, PR checklist |
| [`CHANGELOG.md`](./CHANGELOG.md) | Notable changes |

---

## The African Problem

Across Africa, work and life run on **conversation**, not calendars. A client sends a
quote request on WhatsApp. A lecturer posts a deadline in a class group. A neighbour
asks you to "sort it out by Friday" in a voice note. A contract arrives as a forwarded
PDF. The commitment is real and binding — but it lives in a chat thread with 400 other
messages.

The tools built to solve this were not built for us:

- **Calendar-first apps** assume you block time deliberately. Most African work is
  reactive and negotiated in the moment.
- **Task managers** assume a desktop, reliable bandwidth, and a stable data plan.
  Data cost and connectivity are real constraints.
- **Email-centric workflows** miss the reality that WhatsApp, SMS, voice notes and
  phone calls are the primary channels for business, school and family.
- **Enterprise project tools** are priced and designed for salaried knowledge workers,
  not students, freelancers, small traders, and informal-economy operators.

The result: **people drop commitments that matter** — a client is left waiting, a
deadline slips, an opportunity is lost — not because they are disorganised, but because
nothing in their daily tools actually understands how they communicate.

## How NEXT Africa Solves It

NEXT Africa meets people where they already are: plain language, sent however they
already send it. It does the structuring, remembering and following-up that a
high-functioning assistant would do.

| The problem | What we built | Where |
| ----------- | ------------- | ----- |
| Commitments are buried in chat | **Natural-language capture** — one message becomes a list of structured commitments | `POST /api/capture`, `Chat` screen |
| Text is ambiguous and context is lost | **LLM extraction (OpenAI)** turns messy input into `task` / `deadline` / `meeting` / `reminder` records with real dates | `backend/src/llm/extract.js` |
| Related promises drift apart | **Automatic linking** connects sub-tasks to the project they belong to | `linked_commitment_id`, `GET /api/projects` |
| You forget what needs attention | **A Today dashboard** buckets work into Today / Waiting for / Projects | `GET /api/dashboard` |
| Things silently slip | **Proactive nudges** for conflicts, due-soon items and stalled follow-ups — tuned by a proactivity level | `GET /api/nudges`, `PATCH /api/settings` |
| Software doesn't know your rhythm | **Execution memory** learns patterns from your commitments and reports them back | `GET /api/insights` |
| Tools are heavy and data-hungry | **Mobile-first, low-data web app** — works on the phone people already own | React + Vite frontend |

The outcome we're aiming for: **nothing you said you'd do quietly disappears.**

---

## Core Features — Key Screens

### 1. Goal Capture — one message, zero forms

<img src="./docs/assets/004-capture.gif" alt="Typing a normal sentence turns into a plan of structured commitments" width="640" />

Type it the way you'd tell a friend — or send a voice note, or attach a file — and
NEXT Africa extracts the real commitments, dates and connections. It solves the
African problem of work arriving over WhatsApp, voice notes and screenshots: the
promises stop living somewhere in a chat and become a plan you can act on.

### 2. A Today board that knows your context

<img src="./docs/assets/003-today.gif" alt="Today, Waiting for, and Projects grouped into one board" width="640" />

A single screen groups what's actually due **Today**, what you're **Waiting for**,
and the **Projects** you're pushing forward. It replaces the mental reconstruction
of "what did someone ask me this week?" that most people on the continent do
across WhatsApp groups, SMS and calls — so nothing needs to be remembered by hand.

### 3. An execution loop that finishes the job

<img src="./docs/assets/005-execute.gif" alt="Executing a plan step by step with live progress" width="640" />

NEXT Africa runs your goal as a guided loop — the plan you approved, worked
through with live progress. This is where sipped commitments stop: instead of a
"will do later" sentence that quietly dies in a thread, the loop completes the
steps, one after another.

### 4. Proactive nudges — it follows up so you don't have to

<img src="./docs/assets/006-nudges.gif" alt="Proactive nudges for conflicts, due-soon work and waiting follow-ups" width="640" />

Conflicts, due-soon items and stalled follow-ups are surfaced as nudges you can
resolve or dismiss, tuned to a proactivity level you choose. Clients and
colleagues don't get forgotten because a reminder slipped — the follow-up is
NEXT Africa's job, not yours.

---

## App architecture — how the screens connect

Click **Get started** on the landing page and you enter auth (sign up or sign
in), then land on the **Today** hub. From the hub every part of the loop is one
tap away — capture in chat, analysis, planning, execution, and the proactive
views that keep commitments moving.

<img src="./docs/assets/011-architecture.gif" alt="Animated flow showing how NEXT Africa's screens connect, from the landing page and auth to the Today hub and the execution loop" width="900" />

---

## Product flow

You message naturally → NEXT Africa understands → it structures the commitment
→ you approve the plan → it executes with live progress → nothing quietly
disappears.

<img src="./docs/assets/012-product-flow-chart.png" alt="Product flow chart: message, understanding, structure, approval, execution, outcome" width="640" />

Animated version:

<img src="./docs/assets/012-product-flow.gif" alt="Animated product flow for NEXT Africa" width="640" />

---

## The Team

| Name | Role | Owns |
| ---- | ---- | ---- |
| **Mobolaji Opeyemi Bolatito** | Developer · Maintainer (repo owner) | Architecture, backend & frontend code, database, tests, CI/CD, deploys, code review, releases |
| **Oluwatamilore Paul Olubanwo** | Product Manager | Product vision, roadmap & scope, user research & feedback, prioritisation, acceptance criteria, demo narrative |

Two teammates, one goal. See [Hackathon Collaboration](#hackathon-collaboration) for how we work together and split the prize.

---

## Features

- **Natural-language capture** — "remind me to send the report to Segun by Friday."
- **Structured commitments** — type, title, due date and links, extracted automatically.
- **Smart linking** — new items attach to existing open commitments.
- **Conflict detection** — warns when two commitments land within ±2 hours.
- **Today dashboard** — Today, Waiting-for and Projects in one board.
- **Project chains** — grouped commitments with live progress and status.
- **Proactive nudges** — due-soon, waiting and conflict nudges you can resolve or dismiss.
- **Execution memory** — deterministic, honest insights (no invented statistics).
- **Proactivity settings** — quiet, balanced, or active.
- **Auth** — email + password with bcrypt and JWT.

## Stack

| Layer     | Choice                                                           |
| --------- | ---------------------------------------------------------------- |
| Frontend  | React 19 + Vite + Tailwind CSS v4                                |
| Backend   | Node.js + Express 5 (ESM)                                        |
| Database  | PostgreSQL 17 (local; Supabase works by swapping `DATABASE_URL`) |
| LLM       | OpenAI Chat Completions (tool calling, `gpt-4o-mini` default)    |
| Auth      | bcrypt (cost 12) + JSON Web Tokens                               |

## Structure

```
next/
├── frontend/            React + Vite + Tailwind app
│   ├── public/favicon.svg
│   ├── src/App.jsx
│   └── vite.config.js   /api proxied to the backend on :3001
├── backend/             Express API
│   ├── src/app.js       all routes
│   ├── src/server.js    boot: ensure schema, then listen
│   ├── src/db/          pool.js, schema.sql, schema.js, setup.js
│   ├── src/llm/         OpenAI commitment extraction
│   └── test/            node:test integration suite
├── scripts/dev.mjs      runs frontend + backend together
└── .github/workflows/   CI/CD
```

## Prerequisites

- Node.js 20+ (built with 24)
- PostgreSQL running on `localhost:5432`
  - Docker alternative: `docker run --name next-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17`
  - Supabase alternative: set `DATABASE_URL` to your Supabase connection string
- An OpenAI API key for live capture

## Run It Locally

```bash
npm install                            # installs both workspaces
cp backend/.env.example backend/.env   # then add your OPENAI_API_KEY
npm run db:setup                       # creates the "next" database + schema (idempotent)
npm run dev                            # starts backend :3001 and frontend :5173
```

Open <http://localhost:5173> — you should see the NEXT Africa landing page.
API health: <http://localhost:3001/api/health>

```json
{ "status": "ok", "db": "connected", "uptime": 3.29, "time": "..." }
```

Run the pieces separately if you prefer:

```bash
npm run dev:backend
npm run dev:frontend
```

## Environment Variables

Set in `backend/.env`:

| Variable           | Purpose                          | Default                                               |
| ------------------ | -------------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`     | Postgres connection string       | `postgres://postgres:postgres@localhost:5432/next`    |
| `PORT`             | Backend port                     | `3001`                                                |
| `JWT_SECRET`       | Signs access tokens              | dev value in `.env` (set a long random value in prod) |
| `OPENAI_API_KEY`   | OpenAI key for extraction        | —                                                     |
| `OPENAI_MODEL`     | Extraction model override        | `gpt-4o-mini`                                         |

Set in `frontend/.env` (optional — defaults to the local API):

| Variable       | Purpose                          | Default                 |
| -------------- | -------------------------------- | ----------------------- |
| `VITE_API_URL` | Base URL for all API requests    | `http://localhost:3001` |

> Without `OPENAI_API_KEY`, capture returns a clear `503` — the rest of the app still works.

## Data Model

### `users`

| Column              | Type        | Notes                             |
| ------------------- | ----------- | --------------------------------- |
| `id`                | uuid (pk)   | `gen_random_uuid()`               |
| `name`              | text        |                                   |
| `email`             | text unique |                                   |
| `password_hash`     | text        | bcrypt, cost 12                   |
| `proactivity_level` | enum        | `quiet` \| `balanced` \| `active` |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-maintained |

### `commitments`

| Column                 | Type        | Notes                                                        |
| ---------------------- | ----------- | ------------------------------------------------------------ |
| `id`                   | uuid (pk)   | `gen_random_uuid()`                                          |
| `user_id`              | uuid (fk)   | → `users(id)`, cascade delete                                |
| `raw_input`            | text        | the original sentence the user typed                         |
| `type`                 | enum        | `task` \| `deadline` \| `meeting` \| `reminder` (internal)  |
| `title`                | text        |                                                              |
| `due_date`             | timestamptz | nullable                                                     |
| `status`               | enum        | `open` \| `waiting` \| `done` (default `open`)               |
| `linked_commitment_id` | uuid (fk)   | → `commitments(id)`, links a task to its project             |

### `nudges`

| Column          | Type        | Notes                                                |
| --------------- | ----------- | ---------------------------------------------------- |
| `id`            | uuid (pk)   | `gen_random_uuid()`                                  |
| `user_id`       | uuid (fk)   | → `users(id)`, cascade delete                        |
| `type`          | text        | `conflict` \| `due` \| `waiting`                     |
| `message`       | text        | human-readable nudge                                 |
| `commitment_id` | uuid (fk)   | → `commitments(id)`, cascade delete                  |
| `source_key`    | text        | dedupe key, unique per user                          |
| `status`        | enum        | `open` \| `resolved` \| `dismissed`                  |

> `commitments.type` is **never surfaced as a category choice** in the UI — it is
> inferred by the extraction step and used internally for scheduling.

## API Reference

| Method | Route                          | Purpose                                    |
| ------ | ------------------------------ | ------------------------------------------ |
| GET    | `/api/health`                  | DB connectivity + uptime                   |
| POST   | `/api/auth/signup`             | Create account, returns JWT                |
| POST   | `/api/auth/login`              | Log in, returns JWT                        |
| POST   | `/api/capture`                 | Extract commitments from natural language  |
| POST   | `/api/capture/file`            | Extract commitments from an attached file  |
| POST   | `/api/capture/voice`           | Transcribe a voice note, then extract      |
| GET    | `/api/commitments`             | List commitments (`?status=`)              |
| PATCH  | `/api/commitments/:id`         | Update status (`open`/`waiting`/`done`)    |
| GET    | `/api/dashboard`               | Today / Waiting-for / Projects buckets     |
| GET    | `/api/projects`                | Commitment chains with progress            |
| GET    | `/api/nudges`                  | Persisted + computed nudges                |
| POST   | `/api/nudges/:id/action`       | Resolve or dismiss a nudge                 |
| GET    | `/api/insights`                | Deterministic patterns + stats             |
| GET    | `/api/settings`                | Read proactivity level                     |
| PATCH  | `/api/settings`                | Update proactivity level                   |

All routes except health and auth require `Authorization: Bearer <token>`.

## Testing

```bash
npm test -w backend     # node:test API integration suite (15 tests)
npm run build -w frontend
```

The suite spins up the app in-process and stubs the OpenAI call, so it needs
PostgreSQL but **not** a real API key.

## Scripts

| Command                | Does                                      |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Run backend + frontend together           |
| `npm run dev:backend`  | Backend only (watch mode)                 |
| `npm run dev:frontend` | Frontend only                             |
| `npm run db:setup`     | Create database if missing, apply schema  |
| `npm test -w backend`  | Run the API integration suite             |

## Deployment (Cloudflare Pages + Node API)

The frontend ships as static files and is deployed to **Cloudflare Pages**.
The Express API runs on a **Node host** (Render, Fly.io, Railway, or a VPS) with a
managed PostgreSQL database. Cloudflare provides DNS, TLS and the CDN edge.

| Piece | Where | Config |
| ----- | ----- | ------ |
| Frontend | Cloudflare Pages | `frontend/wrangler.toml`, `frontend/public/_redirects`, `frontend/public/_headers` |
| Backend | Node host | `backend/` (`npm start`), env vars below |
| Database | Managed Postgres | `DATABASE_URL` on the backend host |
| CI/CD | GitHub Actions | `.github/workflows/ci.yml`, `.github/workflows/cd.yml` |

### One-time setup

```bash
# 1. Create the Pages project (once)
npx wrangler pages project create next-africa --production-branch main

# 2. Authenticate wrangler locally (opens a browser)
npx wrangler login
```

Then, in the GitHub repository settings:

- **Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Variables:** `VITE_API_URL` = your API base URL, e.g. `https://next-africa-api.onrender.com`

On the backend host set: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`,
`OPENAI_MODEL`, `PORT`. Run `npm run db:setup` once against the production
database to create the schema.

### Deploy

- **Frontend:** push to `main` (or run the CD workflow) — `cd.yml` builds with the
  production `VITE_API_URL` and publishes to Cloudflare Pages.
- **Backend:** connect the repo to your Node host (root directory `backend`,
  build `npm install`, start `npm start`) or use its deploy hook from `cd.yml`.

### Notes

- `VITE_API_URL` is baked in at **build time** — rebuild the frontend after changing it.
- If you prefer same-origin API calls, uncomment the `/api/*` proxy in
  `frontend/public/_redirects` and leave `VITE_API_URL` unset.
- CORS is currently open (`cors()` in `backend/src/app.js`); restrict it to your
  Pages domain for production.
- Manual deploy alternative: `npm run build -w frontend` then
  `npx wrangler pages deploy frontend/dist --project-name next-africa`.

## Roadmap

- [x] Auth, capture, commitments, dashboard, settings
- [x] Projects, proactive nudges, insights
- [x] OpenAI extraction + `next_step_prompt`
- [ ] Execution pipeline for the analysis → complete flow (file uploads, progress)
- [ ] Password reset + Google OAuth
- [ ] WhatsApp / SMS channel integration
- [ ] Push + email reminders
- [ ] Offline-first, low-data client

## Hackathon Collaboration

NEXT Africa is a two-member submission for the **Borderless Bytes Hackathon**.
This section is the working agreement between the teammates.

### Prize split — 50 / 50

Any cash prize, grant, credit, or award won with this project is split
**equally (50/50)** between **Mobolaji Opeyemi Bolatito** and
**Oluwatamilore Paul Olubanwo** — regardless of role or hours contributed.
Payout logistics (who receives and forwards, currency, taxes) are agreed before
claiming, and the split is confirmed in writing by both members.

### Roles & responsibilities

| Area | Developer (Mobolaji) | Product Manager (Oluwatamilore) |
| ---- | -------------------- | ------------------------------- |
| Problem & vision | informed | **owner** |
| Roadmap & scope | estimates effort | **owner** |
| User research & feedback | informed | **owner** |
| Acceptance criteria | informed | **owner** |
| Architecture & implementation | **owner** | informed |
| Testing & CI/CD | **owner** | informed |
| Demo script & pitch | supports | **owner** |
| README, docs & submission write-up | supports | **owner** |

### Decision making

- **PM owns the *what* and *why*; Developer owns the *how*.**
- Scope changes are agreed by both. If there's a disagreement, the Developer's
  call wins on technical feasibility and the PM's call wins on user value and
  priorities.
- Anything irreversible (deleting data, spending money, changing the submission)
  needs a yes from **both**.

### Working agreement

- Work on branches; never commit directly to `main`.
  `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Every code change goes through a pull request; at least one teammate reviews it.
- The Developer merges code PRs; the PM merges documentation/scope PRs.
- No secrets in the repo; no hardcoded demo data on production paths.
- Keep a short daily update: what shipped, what's blocked, what's next.

### Hackathon submission checklist

- [ ] Working demo (capture → dashboard → nudges → projects → insights)
- [ ] `OPENAI_API_KEY` set in the deployment environment (test capture works live)
- [ ] `frontend` built with the production `VITE_API_URL`
- [ ] Strong `JWT_SECRET` and a production `DATABASE_URL`
- [ ] Public repo with README, LICENSE, and CI passing
- [ ] Demo video (2–3 min) telling the *African problem → our solution* story
- [ ] Slide deck / one-pager exported as PDF
- [ ] Both teammates listed as authors on the submission
- [ ] Devpost/Devfolio form fields completed and links verified

### Attribution & IP

- Both members are credited as authors of NEXT Africa in the README, the
  submission, and any presentation.
- All project code is released under the [MIT License](./LICENSE).
- New work contributed during the hackathon is owned by the team and licensed to
  the project under the same terms.

### Communication

- **Primary channel:** _(add WhatsApp / Slack / Discord link here)_
- **Repo:** <https://github.com/opeblow/next-africa>
- **Contacts:** Mobolaji Opeyemi Bolatito (Developer) · Oluwatamilore Paul Olubanwo (Product Manager)

## Demo Video

<p align="center">
  <a href="https://youtu.be/biDLEFhlyhE">
    <img src="https://img.youtube.com/vi/biDLEFhlyhE/maxresdefault.jpg" alt="NEXT Africa demo video thumbnail" width="640" />
  </a>
</p>

**[▶ Watch the demo on YouTube](https://youtu.be/biDLEFhlyhE)**

<iframe
  width="720"
  height="405"
  src="https://www.youtube.com/embed/biDLEFhlyhE"
  title="NEXT Africa demo video"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>

The walkthrough follows the demo script: capture a promise → the dashboard → the
nudges → projects → insights. Script: [`docs/DEMO-SCRIPT.md`](./docs/DEMO-SCRIPT.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read the
[Code of Conduct](./CODE_OF_CONDUCT.md) first. Security issues: [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © 2026 NEXT Africa.
