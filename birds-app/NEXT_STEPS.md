# Next steps

**You are here:** Vercel redeploy is in progress (or just finished). Do the following once the build succeeds.

---

## Completed

- [x] Local app running, GitHub pushed, `version_1` archived
- [x] Vercel project: Root Directory `birds-app`, env vars (including `GOOGLE_SHEETS_*`, `ADMIN_EMAIL`)
- [x] Deploy / Redeploy (build in progress or done)


---

## 1. OAuth (production)

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client:
   - **Authorized JavaScript origins** → add `https://<your-app>.vercel.app` (your real Vercel URL)
   - **Authorized redirect URIs** → add `https://<your-app>.vercel.app/api/auth/callback/google`
   - **Save**

2. In Vercel → **Settings** → **Environment Variables**: set `NEXTAUTH_URL` to that exact URL. If you change it, **Redeploy**.

---

## 2. Database (only if you use a **new** production DB)

If you’re using a **new** Neon project for production (not the same DB as local):

```bash
cd birds-app
DATABASE_URL="<pooled connection string for the new prod DB>" npx prisma db push
DATABASE_URL="<same>" npm run db:seed
```

If you use the **same** Neon DB as local, skip this step.

---

## 3. Test and share

1. Open `https://<your-app>.vercel.app`
2. **Sign in with Google** (use your admin account)
3. Choose a region, submit a bird, confirm it works
4. Share the link. Invite users via **Admin** → **Add User** (by email)

---

## Reference

- **Local development:** [README – Getting Started](README.md#getting-started)
- **Google Sheets setup:** [REFERENCE.md – Google Sheets sync](REFERENCE.md#google-sheets-sync)
- **Deploy / troubleshooting (Render, pooling):** [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
