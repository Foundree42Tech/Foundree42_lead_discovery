# Security Overview

This document describes the security posture of the Foundree42 Lead Discovery app:
what's implemented, known limitations, and operational guidance. It is a living
document — update it as the threat model or implementation changes.

---

## Implemented controls

### Authentication & sessions
- Passwords hashed with **bcrypt** (cost factor 12).
- Sessions are stateless **HMAC-SHA256** signed tokens (`userId:timestamp:hmac`),
  stored in an **httpOnly**, `secure` (in production), `sameSite=lax` cookie.
- `SESSION_SECRET` is **required at boot** — the app throws on startup if it is
  missing, preventing accidental use of a default secret.
- Sessions expire after **14 days**.
- Sign-in and forgot-password responses are identical for valid/invalid accounts
  to prevent **email enumeration**.

### Authorization
- Every data route resolves the session to a `userId` and **scopes all queries**
  to that user (`where: { userId }`).
- Per-record ownership is verified before read/update/delete (e.g. a lead is
  fetched with `where: { id, userId }`, returning 404 if not owned).
- Applies to: leads (list/detail/bulk/kanban/export), activities, config, the
  contacts/people endpoint, and Salesforce push.

### Secrets at rest (encryption)
- Third-party secrets are encrypted with **AES-256-GCM** (authenticated
  encryption) via Node's built-in `crypto` — see [lib/crypto.ts](lib/crypto.ts).
  - **Salesforce OAuth tokens** (access + refresh) — encrypted on store, decrypted
    only when used.
  - **Stored API keys** (Anthropic / Apollo / Tavily) in the `Config` table.
- Random 12-byte IV per encryption; the GCM auth tag rejects tampered ciphertext.
- Key derived from `ENCRYPTION_KEY` (falls back to `SESSION_SECRET`) via `scrypt`.
- Ciphertext is marked with an `f1:` prefix; values without it are treated as
  legacy plaintext and pass through unchanged (zero-downtime migration).

### Transport & response headers
Set globally in [next.config.mjs](next.config.mjs):
- `Strict-Transport-Security` (HSTS) — force HTTPS.
- `X-Frame-Options: DENY` — clickjacking protection.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy` — camera/microphone/geolocation disabled.

### Input validation & abuse limits
- Status values validated against an allowlist; notes capped at 20,000 chars;
  company/config values length-capped.
- Bulk operations capped at **500 IDs** per request.
- Outreach research caps company name (200 chars) and technologies (20 items).
- **In-memory rate limiting**: sign-in (10/min/IP), forgot-password (3/15min/email).

### Error handling
- Third-party error details (Salesforce API, AI provider) are **logged
  server-side** and never returned to the client — callers get generic messages.

### OAuth (Salesforce)
- `state` parameter (CSRF protection) validated on the OAuth callback.
- `prompt=login consent` forces each user to authorize **their own** org.
- Per-user tokens; one shared Connected App (standard OAuth design).

---

## Known limitations & recommendations

These are **not yet implemented** and most require a new dependency or a larger
change. Listed roughly by priority.

| Area | Limitation | Recommendation |
|------|-----------|----------------|
| Rate limiting | In-memory only — resets on deploy, not shared across instances | Move to Redis (e.g. `@upstash/ratelimit`) for production |
| CSRF | State-changing POSTs rely on `sameSite=lax` cookies | Add double-submit CSRF tokens |
| Session revocation | Stateless tokens can't be invalidated before expiry | Server-side session/jti store for "sign out everywhere" |
| XSS defense-in-depth | No Content-Security-Policy | Add a strict CSP with per-request nonces |
| Key management | `ENCRYPTION_KEY`/`SESSION_SECRET` in env | Move to a secrets manager; document a rotation runbook |
| Audit logging | No security event audit trail | Log auth events (sign-in, password reset, SF connect) |

Adding any of the above that needs a third-party package requires explicit
approval first.

---

## Operational guidance

### Required / recommended environment variables
- `SESSION_SECRET` (**required**) — 32+ byte random string.
- `ENCRYPTION_KEY` (**recommended**) — dedicated 32-byte key for secret
  encryption. Falls back to `SESSION_SECRET` if unset.

Generate either with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### ⚠️ Key rotation
Rotating `ENCRYPTION_KEY` (or `SESSION_SECRET`, if no dedicated key is set) makes
**all previously encrypted secrets unreadable**. After a rotation, users must
re-enter their API keys (Settings → API Keys) and reconnect Salesforce. Set a
dedicated `ENCRYPTION_KEY` **before** going to production and treat it as
permanent.

### Production checklist
- [ ] `SESSION_SECRET` and a dedicated `ENCRYPTION_KEY` set (distinct values)
- [ ] App served over HTTPS (so HSTS / `secure` cookies apply)
- [ ] Database access restricted; backups encrypted
- [ ] Salesforce Connected App scoped to least privilege (`api refresh_token offline_access`)

---

## Reporting a vulnerability
Report security issues privately to the Foundree42 team rather than opening a
public issue.
