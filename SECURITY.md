# Security Policy

## Supported versions

NEXT Africa is under active development. Security fixes are applied to the latest
`main` branch.

| Version | Supported |
| ------- | --------- |
| latest `main` | Yes |
| older commits | No |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, email **security@next.africa** with:

- a description of the issue and its impact,
- steps to reproduce (proof-of-concept if possible),
- affected files, endpoints, or versions,
- any suggested remediation.

We will acknowledge your report within **72 hours** and aim to provide a
resolution timeline within **7 days**. We'll credit you in the fix notes unless you
prefer to stay anonymous. Please give us reasonable time to remediate before any
public disclosure.

## Scope

In scope:

- Authentication and authorization flaws (e.g. accessing another user's commitments),
- Injection, SSRF, or unsafe deserialization,
- Secret or token leakage,
- Sensitive data exposure through the API.

Out of scope:

- Denial of service through unrealistic resource exhaustion,
- Vulnerabilities in dependencies already covered by an advisory,
- Social engineering of maintainers or users.

## Handling of secrets

- Secrets live only in `.env` files, which are **gitignored**.
- Never commit API keys, JWT secrets, or database URLs.
- `JWT_SECRET` must be a long, random value in production — the development default
  is intentionally obvious and must not ship.
- Rotate any credential that has ever been committed.

## Hardening notes for deployers

- Run behind HTTPS only; tokens are bearer JWTs.
- Set a strong, unique `JWT_SECRET`.
- Restrict database network access and use a least-privilege DB user.
- Keep dependencies patched (`npm audit`).
