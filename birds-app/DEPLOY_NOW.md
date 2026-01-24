# Deploy now: share your app link

Use this checklist when the app works locally and you want to put it online. **~15 minutes.**

---

## Before you start

- [ ] App runs locally (`npm run dev`), you can sign in and use it.
- [ ] Code is pushed to GitHub (repo can contain other folders like `version_1`; we’ll set **Root Directory** in Vercel).

---

## 1. Get the production database URL (Neon)

**Using the same Neon DB as local**

1. Go to [console.neon.tech](https://console.neon.tech) → your project.
2. In the connection details, choose the **pooled** or **serverless** connection string (host usually contains `-pooler`).  
   Vercel needs the pooled one to avoid connection limits.
3. Copy it. You’ll add it to Vercel in step 3.

**Using a new Neon DB for production**

1. Create a new Neon project (or a new branch) for production.
2. Copy the **pooled** connection string.
3. You’ll run `db:push` and `db:seed` against this URL in **step 6**.

---

## 2. Deploy to Vercel (first time)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** your GitHub repo (the one that contains `birds-app`).
3. **Root Directory**: click **Edit** → set to **`birds-app`** → **Continue**.
4. **Build Command**: `npx prisma generate && npm run build` (or leave default if it runs `npm run build`).
5. **Environment Variables** (important):  
   Click **Environment Variables** and add the ones below **before** deploying.  
   You can deploy once to get the URL, then add or change `NEXTAUTH_URL` and **Redeploy**; or add a placeholder for `NEXTAUTH_URL` and fix it after.

Do **not** click Deploy yet if you prefer to set all env vars first. You can also Deploy with only `DATABASE_URL` and `NEXTAUTH_SECRET` to get the URL, then add the rest and redeploy.

---

## 3. Add environment variables in Vercel

In your Vercel project: **Settings** → **Environment Variables**. Add for **Production**:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Neon **pooled** connection string from step 1 |
| `NEXTAUTH_URL` | `https://<your-vercel-project>.vercel.app` — use the URL Vercel shows after deploy (e.g. `https://birds-xyz.vercel.app`). You can update this after the first deploy. |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and paste the result. Use a **new** value for production (do not reuse your local one). |
| `GOOGLE_CLIENT_ID` | Same as in your local `.env` |
| `GOOGLE_CLIENT_SECRET` | Same as in your local `.env` |

**Optional (only if you use them locally):**

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `ADMIN_EMAIL` — Only needed if you use a **new** production DB and want the seed to create an admin. If you use the same DB as local, your admin already exists.

---

## 4. Deploy

1. In Vercel, click **Deploy** (or **Redeploy** if you already deployed once).
2. Wait for the build to finish.
3. Copy your app URL, e.g. `https://birds-app-abc123.vercel.app`.

---

## 5. Set `NEXTAUTH_URL` and Google OAuth

1. In Vercel → **Settings** → **Environment Variables**:
   - Set `NEXTAUTH_URL` to your exact app URL (e.g. `https://birds-app-abc123.vercel.app`).  
   - If you had a placeholder, **Redeploy** after saving.

2. In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client:
   - **Authorized JavaScript origins** → **Add** → `https://<your-app>.vercel.app` (your real URL).
   - **Authorized redirect URIs** → **Add** → `https://<your-app>.vercel.app/api/auth/callback/google`.
   - **Save**.

---

## 6. Database: only if you use a **new** production DB

If you are using a **new** Neon project/branch for production (not the same DB as local):

1. In a terminal, point at the production DB once:
   ```bash
   cd birds-app
   DATABASE_URL="<paste pooled connection string for the new prod DB>" npx prisma db push
   DATABASE_URL="<same URL>" npm run db:seed
   ```
   Or put that `DATABASE_URL` in a temporary `.env.production` or export it, then run the commands.

2. If you did **not** set `ADMIN_EMAIL` in Vercel:
   - Either set `ADMIN_EMAIL` in Vercel, then run `npm run db:seed` again with that prod `DATABASE_URL`, or  
   - Run `npx prisma studio` with `DATABASE_URL` set to the prod URL and create an admin `User` with `role: ADMIN` and your email.

If you use the **same** Neon DB as local, skip this step; it’s already set up.

---

## 7. Test and share

1. Open `https://<your-app>.vercel.app`.
2. Click **Sign in with Google** and sign in with your admin account.
3. Choose a region, submit a bird, and check that it works.
4. Share the link with users. Use **Admin** → **Add User** to invite them by email so they can sign in.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Get Neon **pooled** URL (same DB as local, or new prod DB). |
| 2 | Vercel: import repo, **Root Directory** = `birds-app`. |
| 3 | Vercel: add `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. |
| 4 | Deploy (or redeploy) and copy the app URL. |
| 5 | Set `NEXTAUTH_URL` to that URL; add the URL to Google OAuth (origin + redirect). |
| 6 | If **new** prod DB only: run `db:push` and `db:seed` with the prod `DATABASE_URL`; create admin if needed. |
| 7 | Test sign-in and share the link. |

For more detail (Render, connection pooling, troubleshooting), see [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md).
