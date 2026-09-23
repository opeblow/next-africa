# ADR 0002 — Structured extraction via OpenAI tool calling

- Status: Accepted
- Date: 2026-09-18

## Context

Users write in prose ("send the proposal to Tunde before Friday 3pm"). We need
reliable, structured commitments: a title, a type, an ISO due date, and an
optional link to an existing commitment.

## Decision

Call OpenAI Chat Completions with a single forced function/tool,
`record_commitments`, whose JSON schema defines the output. The current UTC time
is injected into the system prompt so relative dates resolve to ISO timestamps.

## Consequences

- Output is schema-shaped and parsed with `JSON.parse`; malformed items are
  tolerated downstream (missing title skipped, unknown type defaulted, bad dates nulled).
- Calls are wrapped with a timeout and bounded retries.
- Swapping models is a one-line env change (`OPENAI_MODEL`).
- The model can still mis-resolve tricky relative dates; a stronger model or
  server-side date parsing can improve this later.
