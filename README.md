# Foundree42 Lead Discovery

AI-powered lead discovery and outreach platform for Foundree42, a US Salesforce
consultancy. Built with **Next.js 16** (App Router), **React 19**, **Prisma** +
**PostgreSQL**, and the **Anthropic** API. Find and score prospects, generate
tailored outreach, manage a pipeline, and push qualified leads to Salesforce.

---

## Prerequisites

- **Node.js** 18.18+ (Next.js 16 requirement)
- A running **PostgreSQL** database (local or hosted)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (via the `postinstall` script).

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

At minimum you must set `DATABASE_URL` and `SESSION_SECRET` — **the app throws on
startup if `SESSION_SECRET` is missing.** Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

See [Environment Variables](#environment-variables) below for the full list.

### 3. Sync the database schema

```bash
npx prisma db push
```

This project uses `prisma db push` (not migrations) to keep the schema in sync.

### 4. Start the dev server

```bash
npm run dev
```

Open **http://localhost:3000**. Every route except the auth pages is gated by
`proxy.ts`, so you'll land on the sign-in page first:

1. Create an account at `/sign-up`
2. Verify your email (requires `RESEND_API_KEY`; check server logs in dev)
3. Sign in

### 5. Configure API keys (in-app)

The Anthropic / Tavily / Apollo keys are **not** environment variables — they're
stored in the database and managed in the app under **Settings → API Keys**.
An **Anthropic** key is required for lead discovery and outreach generation;
Tavily and Apollo are optional enrichment sources.

---

## Environment Variables

Defined in `.env.local` (see `.env.local.example`):

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Signs session cookies. App **fails to boot** if unset |
| `ENCRYPTION_KEY` | Optional | Encrypts secrets at rest (SF tokens, stored API keys). Falls back to `SESSION_SECRET`. **Rotating it makes existing encrypted secrets unreadable** |
| `RESEND_API_KEY` | For email | Email verification + password-reset delivery (Resend) |
| `NEXT_PUBLIC_APP_URL` | For email | Base URL used in verification / reset links |
| `SF_CLIENT_ID` | For Salesforce | Salesforce Connected App consumer key |
| `SF_CLIENT_SECRET` | For Salesforce | Salesforce Connected App consumer secret |
| `SF_CALLBACK_URL` | For Salesforce | OAuth callback, must match the Connected App |
| `SF_LOGIN_URL` | Optional | Salesforce login host. Set to `https://test.salesforce.com` for sandbox orgs (default `https://login.salesforce.com`) |

> Anthropic / Tavily / Apollo keys are configured in-app (Settings → API Keys),
> not here.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server at http://localhost:3000 |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm start` | Run the production build |
| `npx prisma db push` | Sync the Prisma schema to the database |
| `npx prisma studio` | Visual DB browser at http://localhost:5555 |

---

## Documentation

- [USER_GUIDE.md](USER_GUIDE.md) — the end-to-end workflow (find companies → find people → outreach → Salesforce).
- [SECURITY.md](SECURITY.md) — security posture, limitations, and operational guidance.
- [DEPLOY.md](DEPLOY.md) — deploying to DigitalOcean App Platform.
