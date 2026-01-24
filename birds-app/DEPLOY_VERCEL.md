# Deploy birds-app to Vercel + Neon ($0/month)

This guide deploys the Bird Submission Tracker for **$0/month** using Vercel (Hobby) for the app and Neon's free PostgreSQL tier.

**Caveats:**
- Vercel Hobby is for **non-commercial / personal** use. For commercial use, consider Vercel Pro (~$20/mo) or Render (see [Alternative: Render](#alternative-deploy-to-render)).
- Use Neon's **pooled** connection string in production so Prisma does not exhaust connections in serverless (see [Prisma + Vercel serverless](#6-prisma--vercel-serverless)).

---

## 1. Database (Neon)

1. Create or reuse a Neon project at [neon.tech](https://neon.tech).
2. In the Neon dashboard, copy the **pooled** connection string (for serverless). It looks like:
   ```
   postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```
   The `-pooler` hostname or a serverless-compatible string is required for Vercel's serverless functions.
3. For running `prisma db push` and `db:seed` from your machine, you can use the pooled URL or the direct (non-pooler) URL. If you hit TLS errors locally, try the direct URL for those one-time commands.

---

## 2. Deploy to Vercel

1. Push your repo to GitHub. If the repo root contains more than `birds-app`, you will set **Root Directory** in the next step.
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your repository.
3. **Root Directory**: set to `birds-app` if the repo is not already `birds-app`-only.
4. **Build Command**: `npx prisma generate && npm run build`  
   (Same as the `build` script in `package.json`; you can leave Vercel’s default if it already runs `npm run build`.)
5. **Output Directory**: leave default (Next.js auto-detected).
6. **Install Command**: `npm install` (default).
7. Do **not** deploy yet until env vars are set (or deploy once, then add env vars and redeploy).

---

## 3. Environment Variables (Vercel)

In **Project → Settings → Environment Variables**, add for **Production** (and optionally **Preview**):

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | Neon **pooled** URL | Use the `-pooler` / serverless-compatible string from Neon |
| `NEXTAUTH_URL` | `https://<your-project>.vercel.app` | Replace with your real Vercel URL; set after first deploy if needed |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Generate with that command |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | (optional) | Only if you use Sheets sync |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (optional) | |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | (optional) | |
| `ADMIN_EMAIL` | (optional) | Used by `db:seed` to create an admin user |

After the first deploy, set `NEXTAUTH_URL` to your actual URL (e.g. `https://birds-xxx.vercel.app`) if you used a placeholder, then redeploy.

---

## 4. Google OAuth (Production)

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID:

- **Authorized JavaScript origins**:  
  `https://<your-project>.vercel.app`
- **Authorized redirect URIs**:  
  `https://<your-project>.vercel.app/api/auth/callback/google`

Replace `<your-project>` with your Vercel project subdomain.

---

## 5. Database Setup (One-Time)

Run from your machine with `DATABASE_URL` in `.env` pointing at the **same** Neon database used in Vercel:

```bash
cd birds-app
npx prisma db push
npm run db:seed
```

- If `ADMIN_EMAIL` is set in `.env`, the seed creates an admin. Otherwise create an admin via Prisma Studio or a direct DB insert (see README).

---

## 6. Prisma + Vercel serverless

On Vercel, each serverless function can open new DB connections. To avoid exhausting connections:

- **Use Neon’s pooled (serverless) connection string** in `DATABASE_URL` (the `-pooler` endpoint or equivalent). Do **not** use the direct, non-pooled URL in production on Vercel.
- Neon’s [Prisma guide](https://neon.tech/docs/guides/prisma) recommends `?pgbouncer=true` when using PgBouncer; the pooled URL from the Neon dashboard is usually already correct.
- `src/lib/prisma.ts` uses a standard PrismaClient singleton; no code change is required if `DATABASE_URL` is the pooled URL.

If you see connection timeouts or “too many connections” in production, double-check that `DATABASE_URL` in Vercel is the **pooled** string.

---

## Alternative: Deploy to Render

If you prefer not to use Vercel (e.g. commercial use on a free tier or a single long-running process):

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| App | Render Web Service (Free) | $0 | Spins down after **15 min** idle; **~30–60 s** cold start |
| DB | Neon (Free) | $0 | Same as above |

1. [Render](https://render.com) → **New +** → **Web Service** → connect your repo.
2. **Root Directory**: `birds-app` if the repo contains more.
3. **Build Command**: `npx prisma generate && npm run build`
4. **Start Command**: `npm start`
5. Add the same environment variables as in [§3](#3-environment-variables-vercel); set `NEXTAUTH_URL` to your Render URL (e.g. `https://birds-app.onrender.com`).
6. In Google OAuth, add the Render origin and redirect URI for that URL.
7. Run `npx prisma db push` and `npm run db:seed` locally against the same Neon `DATABASE_URL`.

Render’s free tier has **750 hours/month** across free web services; low-traffic usage usually stays within that. The main trade-off is cold starts after 15 minutes of inactivity.
