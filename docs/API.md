# API reference

The authoritative, always-current description is generated from
`backend/src/openapi.js` and served by the running API:

- `GET /api/docs` — rendered reference (Redoc)
- `GET /api/openapi.json` — machine-readable OpenAPI 3.1 document

## Authentication

Send `Authorization: Bearer <token>` on every route except `/api/health`,
`/api/live`, `/api/ready`, and `/api/auth/*`. Tokens are signed with
`JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default `7d`).

## Endpoint summary

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness + database check |
| GET | `/api/live` | Liveness probe |
| GET | `/api/ready` | Readiness probe (database) |
| POST | `/api/auth/signup` | Create account, returns token |
| POST | `/api/auth/login` | Sign in, returns token |
| POST | `/api/capture` | Capture from text |
| POST | `/api/capture/file` | Capture from a text file (base64) |
| POST | `/api/capture/voice` | Transcribe then capture |
| GET | `/api/commitments` | List commitments (keyset paginated) |
| PATCH | `/api/commitments/:id` | Update status |
| GET | `/api/dashboard` | Today / waiting-for / projects |
| GET | `/api/projects` | Commitment chains with progress |
| GET | `/api/nudges` | Persisted + computed nudges |
| POST | `/api/nudges/:id/action` | Resolve or dismiss a nudge |
| GET | `/api/insights` | Deterministic patterns + stats |
| GET | `/api/settings` | Read proactivity level |
| PATCH | `/api/settings` | Update proactivity level |

## Errors

Errors are JSON: `{ "error": string, "issues"?: [{ "path", "message" }], "requestId"?: string }`.
Validation failures return `400`; auth `401`; missing resources `404`; oversized
payloads `413`; unconfigured AI `503`; unexpected failures `500`.

## Follow-through additions

- `GET /api/commitments/:id`: read an owned item.
- `PATCH /api/commitments/:id`: optional `status`, `title`, `due_date` (ISO with offset or null).
- `POST /api/commitments/:id/draft`: editable follow-up text; always `sent: false`.
- `GET/PATCH /api/settings`: `timezone` (IANA identifier) and `proactivity_level`.
- Capture routes accept optional `timezone`, otherwise use the saved preference.
- `GET /api/notifications/config`: availability and public VAPID key.
- `POST /api/notifications/subscribe`: browser subscription (`endpoint`, `keys`).
- `POST /api/notifications/unsubscribe`: remove the caller's `endpoint`.
- Nudge `dismissed` now means a 24-hour snooze; primary UI actions open the commitment.

The background worker shares the same nudge policy as the API, retries failed deliveries,
and stores delivery receipts in PostgreSQL. Keep the backend and database running.
