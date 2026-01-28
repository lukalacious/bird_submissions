# Deployment Workflow

## Architecture Overview

```
LOCAL DEVELOPMENT                    PRODUCTION
─────────────────                    ──────────
Next.js (localhost:3000)             Vercel (bird-submissions.vercel.app)
        │                                   │
        ▼                                   ▼
.env / .env.local                    Vercel Environment Variables
        │                                   │
        ▼                                   ▼
Neon DEV Branch                      Neon MAIN Branch
(ep-orange-wind-pooler)              (ep-holy-brook-pooler)
```

**Key Point:** Dev and Prod databases are completely separate. Schema changes must be applied to BOTH.

---

## Standard Deployment (Code Only)

When your changes don't touch `prisma/schema.prisma`:

```bash
# 1. Test locally
npm run dev

# 2. Commit and push
git add .
git commit -m "Your commit message"
git push
```

Vercel automatically deploys when you push to `main`.

---

## Deployment with Schema Changes

When you modify `prisma/schema.prisma`:

### Step 1: Apply to Local Dev Database

```bash
npx prisma db push
```

### Step 2: Test Locally

```bash
npm run dev
# Verify your changes work
```

### Step 3: Apply to Production Database

**Option A: Neon Console (Recommended)**

1. Go to [console.neon.tech](https://console.neon.tech)
2. Select `bird_tracker` project
3. Open **SQL Editor**
4. Run your schema changes as SQL:

```sql
-- Example: Adding a new column
ALTER TABLE "TableName" ADD COLUMN IF NOT EXISTS "columnName" TEXT;

-- Example: Adding a required column with default
ALTER TABLE "TableName" ADD COLUMN "columnName" INTEGER NOT NULL DEFAULT 0;
```

**Option B: Prisma with Production Connection**

```bash
# Temporarily use production connection
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-holy-brook-agperaph-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require" npx prisma db push
```

### Step 4: Commit and Push

```bash
git add .
git commit -m "Add columnName to TableName"
git push
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Push schema to local DB | `npx prisma db push` |
| Generate Prisma client | `npx prisma generate` |
| View local DB in browser | `npx prisma studio` |
| Build for production | `npm run build` |
| Seed bird data | `npm run db:seed` |

---

## Environment Variables

### Local Development (`.env`)

```
DATABASE_URL=postgresql://...ep-orange-wind...-pooler.../neondb?sslmode=require
AUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Production (Vercel Dashboard)

Set in: **Vercel → Project Settings → Environment Variables**

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Must use `-pooler` endpoint |
| `AUTH_SECRET` | Yes | NextAuth v5 (not NEXTAUTH_SECRET) |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |

---

## Troubleshooting

### "Column X does not exist"

**Cause:** Schema change wasn't applied to production database.

**Fix:** Run the ALTER TABLE statement in Neon Console SQL Editor.

### "Application error: server-side exception"

**Check in order:**
1. Vercel Function Logs for specific error
2. Schema mismatch (compare local vs production columns)
3. Environment variables in Vercel dashboard

### How to Compare Schemas

**Local schema:**
```bash
npx prisma db pull --print
```

**Production schema (run in Neon SQL Editor):**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

---

## Pre-Deployment Checklist

Before pushing schema changes:

- [ ] `npx prisma db push` ran locally without errors
- [ ] App works locally with new schema
- [ ] Production database has been updated (Neon Console)
- [ ] Verified production columns match local schema

---

## Useful Links

| Resource | URL |
|----------|-----|
| Neon Console | [console.neon.tech](https://console.neon.tech) |
| Vercel Dashboard | [vercel.com/dashboard](https://vercel.com/dashboard) |
| Production App | [bird-submissions.vercel.app](https://bird-submissions.vercel.app) |
| Google Cloud Console | [console.cloud.google.com](https://console.cloud.google.com) |
