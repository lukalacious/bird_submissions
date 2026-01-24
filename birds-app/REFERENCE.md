# Reference

Quick reference for local development, Google Sheets, and deploy.

---

## Local development

```bash
cd birds-app
npm install
cp .env.example .env   # then fill DATABASE_URL, NEXTAUTH_*, GOOGLE_CLIENT_*, etc.
npx prisma db push
npm run db:seed
npm run dev
```

Or: `npm run local:start` (runs push + seed + dev). See [README – Getting Started](README.md#getting-started).

---

## Google Sheets sync

To sync submissions to a Google Sheet:

1. **Google Cloud:** IAM & Admin → Service Accounts → create account → Keys → Add key → JSON. Download.
2. In the JSON: `client_email` and `private_key`. In `.env`, for `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` use the full key; you can paste with real newlines or use `\n` for line breaks.
3. Create a Google Sheet and **share** it with the service account email (Editor).
4. In `.env`:
   - `GOOGLE_SHEETS_SPREADSHEET_ID` = the ID from the Sheet URL (between `/d/` and `/edit`)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` from the JSON
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = `private_key` from the JSON
5. The app uses/creates a tab named **Bird Submissions**.

---

## Deploy

- **What to do after the Vercel build:** [NEXT_STEPS.md](NEXT_STEPS.md)
- **Vercel/Render, env vars, pooling, troubleshooting:** [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
