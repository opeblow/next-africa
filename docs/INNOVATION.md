# Originality & Innovation — the three claims, with proof

Innovation is worth 20% of the rubric. We make exactly three originality
claims. Each is real, visible in the demo, and backed by code. We give up every
other "innovation" so these three are undeniable.

---

## Claim 1 — Self-assembling projects

**What it means.** A commitment captured on Tuesday, a draft sent on Wednesday,
and "send the proposal to Tunde before Friday 3pm" captured today are
recognised as one project and linked automatically. The project assembles
itself from separate messages across separate days — the user never tags,
moves, or drags anything.

**Why it is novel.** Most AI to-do apps operate inside a single input session:
"here is your list." We build relationships *across* sessions on a
`linked_commitment_id` self-reference, and surface the chain with progress in
`GET /api/projects`.

**Proof.**
- `backend/src/app.js` — capture accepts optional `linked_to_title` and links
  inside the same transaction.
- `linked_commitment_id` column + composite indexes —
  `backend/migrations/0001_init.sql`, `0002_performance_indexes.sql`.
- Test: "capture extracts, persists, and links to an open commitment"
  (`backend/test/api.test.js`).

---

## Claim 2 — Conflict catching, not just conflict showing

**What it means.** When the capture pipeline creates a deadline or meeting that
collides with an existing one (within 2 hours), the conflict is written as a
persisted nudge *at the moment it is created* — before the user has a chance to
forget both.

**Why it is novel.** Other AI capture tools extract and file the past; we catch
the *future* scheduling collision as part of extraction, with a deduplicated
`(user_id, source_key)` so each clash nags exactly once.

**Proof.**
- Capture returns `conflict: { withCommitmentId, suggestion }` on collision.
- Persisted in `nudges` with type `conflict` and a unique source key.
- Tests: "nudge returns conflict when deadline/meeting within 2h" and "capture
  returns next_step_prompt and persists conflict nudges".

---

## Claim 3 — A product with a personality, tuned by behaviour

**What it means.** `proactivity_level` (quiet / balanced / active) is a
first-class, user-selectable setting that actually changes how aggressively the
product nudges. It is not a skin and not a marketing word — it alters nudge
ranges and it is the product wedge for a future tiered business model.

**Why it is novel.** Personalisation in most demos is a label. Here it is a
data point in the schema, read by the nudge engine, editable in Settings, and
auditable in the response payload.

**Proof.**
- `users.proactivity_level` (Postgres enum) — `backend/migrations/0001_init.sql`.
- `GET/PATCH /api/settings` with Zod validation — `backend/src/app.js`.
- Test: "settings get/update validate proactivity level".

---

## What we are NOT claiming

- Not "another AI to-do app" — the differentiator is cross-message linking.
- Not "WhatsApp integration" — input is designed for it, but the claim is the
  capture pipeline, not the channel.
- Not "calendar sync" — we are deliberate about staying conversation-native.

**One-line summary for the judges:** *Other teams demo an LLM turning a text
into a to-do list. We demo a product that connects today's message to last
week's project, catches the clash before it costs a client, and adjusts its own
pushiness to your pace.*