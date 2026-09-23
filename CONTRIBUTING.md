# Contributing to NEXT Africa

Thanks for helping build NEXT Africa — a personal execution copilot made for how
work actually gets done across Africa. Every contribution, from a typo fix to a
new integration, moves the project forward.

## Code of Conduct

By taking part you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md). Be kind,
be patient, assume good faith.

## Ways to contribute

- **Report bugs** using the bug report issue template.
- **Suggest features** using the feature request template.
- **Improve docs** — README, CONNECTION.md, inline comments.
- **Write code** — see `CONNECTION.md` for the roadmap and known gaps (D1–D14).
- **Spread the word** — if NEXT Africa helps you, tell someone.

## Getting started

```bash
npm install
cp backend/.env.example backend/.env   # add your OpenAI key (optional for tests)
npm run db:setup
npm test -w backend
npm run dev
```

PostgreSQL must be running locally (or point `DATABASE_URL` at Supabase). The test
suite stubs the OpenAI call, so a real API key is not required to run tests.

## Development workflow

1. Fork the repo and create a branch off `main`:
   - `feat/<short-name>` for features
   - `fix/<short-name>` for bug fixes
   - `docs/<short-name>` for documentation
2. Make your change in small, focused commits.
3. Run the checks before pushing:
   ```bash
   npm test -w backend
   npm run build -w frontend
   ```
4. Open a pull request against `main` and fill in the template.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add WhatsApp capture channel
fix: correct timezone boundary in dashboard today bucket
docs: explain proactivity levels
chore: bump express to 5.2
```

## Coding standards

- **Language:** modern JavaScript (ESM). No TypeScript required, but keep types
  honest via JSDoc where it helps.
- **Backend:** every route validates input, scopes queries by `user_id`, and
  returns a generic error to the client while logging details server-side. Never
  leak stack traces.
- **Frontend:** follow the existing component and styling patterns in
  `frontend/src/App.jsx` and `index.css`.
- **No secrets** in code, commits, logs, or tests. `.env` is gitignored — use
  `.env.example` for documentation.
- **No hardcoded demo data** shipped to production paths.

## Pull request checklist

- [ ] The change is scoped and described clearly.
- [ ] Tests were added or updated where behaviour changed.
- [ ] `npm test -w backend` passes.
- [ ] `npm run build -w frontend` passes.
- [ ] Docs (README/CONNECTION.md) updated if the API or schema changed.
- [ ] No secrets or `.env` contents committed.

## Review

### Maintainers

| Name | Role | Reviews |
| ---- | ---- | ------- |
| **Mobolaji Opeyemi Bolatito** | Developer · repo owner | Code, backend, frontend, database, CI/CD |
| **Oluwatamilore Paul Olubanwo** | Product Manager | Docs, product copy, scope/acceptance criteria |

Maintainers aim to review within a few days. We may ask for changes; that's normal
and not personal. Code PRs are merged by the Developer; documentation/scope PRs are
merged by the Product Manager. Please don't merge your own PR unless you're the
responsible maintainer for that area.

## Security

Please do **not** open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md).
