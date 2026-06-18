# Foundree42 — Open Items

## Salesforce Connected App Setup
1. Go to Salesforce Setup → App Manager → New Connected App
2. Enable OAuth, add scopes: `api` + `refresh_token` + `offline_access`
3. Set callback URL:
   - Dev: `http://localhost:3000/api/auth/salesforce/callback`
   - Prod: `https://your-domain.com/api/auth/salesforce/callback`
4. Copy Consumer Key → `SF_CLIENT_ID` in `.env.local`
5. Copy Consumer Secret → `SF_CLIENT_SECRET` in `.env.local`
6. Wait ~10 minutes for Connected App to propagate in Salesforce
7. Test: Sidebar → "Connect Salesforce →" → OAuth flow → green dot confirms

## Production Deployment (Digital Ocean)
- Set `NEXT_PUBLIC_APP_URL` to production domain in environment
- Update `SF_CALLBACK_URL` to production domain
- Verify `foundree42.com` domain in Resend dashboard (for transactional email delivery)
- Set `DATABASE_URL` to managed PostgreSQL connection string from DO dashboard
- Set all env vars in DO App Platform → Settings → Environment Variables

## API Keys Still Needed
- **Apollo.io** — verified company data + contact enrichment (person search)
- **Tavily** — live web search signals for lead discovery + outreach research

## Future Feature Roadmap
See plan file for full roadmap. Priority phases:
1. (Done) Lead Discovery — search, score, filter, bulk actions, Salesforce push
2. (Done) Outreach — 4-stage AI research pipeline, message generation, refinement
3. Next: Email cadence sequences, outreach templates library, activity timeline
4. Then: Sales pipeline Kanban board, win/loss tracking, deal value tracking
5. Later: Team features, company news monitoring, A/B message variants
