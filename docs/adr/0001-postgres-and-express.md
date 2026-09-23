# ADR 0001 — PostgreSQL + Express for the backend

- Status: Accepted
- Date: 2026-09-18

## Context

NEXT Africa needs durable commitments with relationships (project chains),
transactions (capture must be all-or-nothing), and simple hosting on a small
budget for the hackathon and beyond.

## Decision

Use PostgreSQL with `pg` (parameterised SQL, no ORM) behind an Express API.
Schema changes are applied through idempotent, versioned SQL migrations.

## Consequences

- Full SQL control for the chain and nudge queries; no ORM impedance.
- Transactions are explicit in `persistCapture`.
- Contributors must write SQL, but migrations are plain files and easy to review.
- Managed Postgres (Supabase, Neon, RDS) is a drop-in replacement for local.
