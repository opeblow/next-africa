# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Structured JSON logging (`pino`) with request ids and duration.
- Zod request validation with consistent `400` error payloads.
- `helmet` security headers, CORS allowlist (`FRONTEND_ORIGIN`), and rate limiting.
- OpenAI calls now have an abort-based timeout and bounded retries.
- Keyset pagination on `GET /api/commitments` (`limit`, `cursor`, `nextCursor`).
- Versioned SQL migrations under `backend/migrations` with a `schema_migrations` ledger.
- OpenAPI 3.1 spec at `GET /api/openapi.json` and rendered docs at `GET /api/docs`.
- Liveness/readiness probes: `GET /api/live`, `GET /api/ready`.
- Frontend module split (`src/lib`, `src/components`), error boundary, and monitoring hook.
- Playwright smoke tests, ESLint/Prettier/EditorConfig, commitlint + lint-staged.
- Architecture docs, ADRs, and issue templates.

### Fixed

- Dashboard "Today" now includes commitments due later tomorrow and undated open items.
- Dashboard project progress and waiting metadata are now derived from API data.
- Cloudflare `Permissions-Policy` no longer blocks microphone access (voice capture).

## [0.1.0] - 2026-09-18

### Added

- Initial NEXT Africa release: text/file/voice capture, commitment linking,
  conflict nudges, dashboard, projects, nudges, insights, and settings.
