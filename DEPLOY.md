# Deploying to Digital Ocean App Platform

## Prerequisites

- Code pushed to a GitHub repository
- Digital Ocean account at [cloud.digitalocean.com](https://cloud.digitalocean.com)
- A `SESSION_SECRET` generated (the app will not boot without it):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- A [Resend](https://resend.com) API key with a verified sending domain (for
  email verification and password resets)
- Your in-app API keys ready (Anthropic required, Apollo and Tavily optional —
  these are entered in the app after deploy, not as env vars)

---

## Step 1 — Push to GitHub

If you haven't already:

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 2 — Create a New App on Digital Ocean

1. Log in to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Click **Create** → **Apps**
3. Select **GitHub** as your source
4. Authorize Digital Ocean to access your GitHub if prompted
5. Select your repository and branch (`main`)
6. Click **Next**

---

## Step 3 — Configure the App Service

DO will auto-detect Node.js. Review and confirm these settings:

| Setting | Value |
|---------|-------|
| **Name** | `foundree42-lead-discovery` (or your choice) |
| **Region** | Choose closest to your team (e.g. New York) |
| **Build Command** | `npm run build` |
| **Run Command** | `npm run start` |

> DO detects Next.js automatically — the Procfile is a fallback but these fields override it.

Click **Next**.

---

## Step 4 — Add a PostgreSQL Database

1. On the **Add Resources** screen, click **Add a Database**
2. Select **Dev Database** (free, good for starting out) or **Managed Database** (production-grade, paid)
3. Leave the name as the default or call it `foundree42-db`
4. Click **Attach**

> DO automatically injects a `DATABASE_URL` environment variable into your app — you do not need to set it manually.

---

## Step 5 — Set Environment Variables

Still on the configuration screen, go to **Environment Variables** and add:

| Key | Value | Encrypted |
|-----|-------|-----------|
| `SESSION_SECRET` | Your generated 64-char hex string | **Yes** |
| `ENCRYPTION_KEY` | A second generated 64-char hex string (optional but recommended) | **Yes** |
| `RESEND_API_KEY` | Your Resend API key (`re_...`) | **Yes** |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL (e.g. `https://foundree42-lead-discovery-xxxxx.ondigitalocean.app`) | No |
| `SF_CLIENT_ID` | Salesforce Connected App consumer key | **Yes** |
| `SF_CLIENT_SECRET` | Salesforce Connected App consumer secret | **Yes** |
| `SF_CALLBACK_URL` | `<NEXT_PUBLIC_APP_URL>/api/auth/salesforce/callback` | No |
| `SF_LOGIN_URL` | Only for sandbox orgs: `https://test.salesforce.com` | No |

> `DATABASE_URL` is injected automatically by DO — do not add it here.
>
> **`SESSION_SECRET` is mandatory** — the app throws on startup if it is unset,
> which will cause the deploy to crash-loop.
>
> **`ENCRYPTION_KEY`** encrypts Salesforce tokens and stored API keys at rest. It
> falls back to `SESSION_SECRET` if unset, but a dedicated key is recommended.
> **Do not rotate it casually** — changing it (or `SESSION_SECRET`, if you didn't
> set a dedicated key) makes previously stored secrets unreadable, so users must
> re-enter API keys and reconnect Salesforce.
>
> The `SF_*` and `RESEND_API_KEY` values are only needed if you use Salesforce
> and email features, respectively. Anthropic / Tavily / Apollo keys are **not**
> set here — they're entered in-app under **Settings → API Keys** after deploy.

> Note: `NEXT_PUBLIC_APP_URL` and `SF_CALLBACK_URL` reference the app's final
> URL. On the very first deploy you may need to set these after the URL is
> assigned, then trigger a redeploy.

Click **Next**.

---

## Step 6 — Add a Pre-Deploy Job (Syncs the Schema)

1. On the **Jobs** screen, click **Add Job**
2. Set **Type** to `Pre-Deploy`
3. Set the **Command** to:
   ```
   npx prisma db push
   ```
4. Click **Save**

> This project uses `prisma db push` (not migrations), so there is no
> `prisma/migrations` folder — `prisma migrate deploy` would fail. `db push`
> runs on every deploy, keeping the database schema in sync with the Prisma
> schema. It is safe to run repeatedly.

---

## Step 7 — Review and Deploy

1. Review the summary screen
2. Click **Create Resources**
3. DO will build and deploy your app — this takes 2–4 minutes on first deploy

Watch the **Build Logs** tab for progress. A successful build ends with:
```
✓ Build completed
```

---

## Step 8 — Verify the Deployment

1. Click the app URL shown in the DO dashboard (e.g. `https://foundree42-lead-discovery-xxxxx.ondigitalocean.app`)
2. You'll land on the **sign-in** page — click **Sign up** to create an account
3. Verify your email via the link Resend sends, then sign in
4. Go to **Settings → API Keys**, enter your Anthropic API key, and click **Save**
5. Run a test search — results should appear and persist on refresh

---

## Ongoing Deploys

Every `git push` to `main` automatically triggers a new deploy:

```bash
git add .
git commit -m "Your change"
git push
```

DO rebuilds and re-deploys automatically. The pre-deploy job runs `prisma db push` before the new version goes live.

---

## Managing the Production Database

From your local machine, you can connect to the DO managed database directly.

1. In the DO dashboard, go to **Databases** → your database
2. Copy the **Connection String** from the **Connection Details** tab
3. Run:
   ```bash
   DATABASE_URL="<paste connection string here>" npx prisma studio
   ```
   This opens Prisma Studio pointed at your production database at http://localhost:5555.

> Use this to inspect leads, clear test data, or manage API keys directly.

---

## Costs

| Resource | Cost |
|----------|------|
| Basic app instance (512 MB RAM) | ~$5/month |
| Dev Database | Free (limited, no backups) |
| Managed PostgreSQL (1 GB) | ~$15/month |

For a small team starting out, **Basic app + Dev Database = ~$5/month** is fine.
