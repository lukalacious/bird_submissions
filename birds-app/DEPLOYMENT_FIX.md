# 🚀 Vercel Deployment Fix Guide

## Critical Issues Identified

### 1. DATABASE_URL Format Error (Digest: 704401192)
**Error:** `the URL must start with the protocol postgresql:// or postgres://`

**Cause:** DATABASE_URL in Vercel is incorrectly formatted or empty

**Fix:** Update DATABASE_URL in Vercel Dashboard

### 2. Schema Mismatch (Digest: 1876630655)
**Error:** `The column Settings.rules does not exist in the current database`

**Cause:** Production database is missing two columns:
- `rules` (never migrated)
- `monthlyFormEmbedUrl` (migrated as wrong name `feedbackFormEmbedUrl`)

**Fix:** Apply new migration created at:
`prisma/migrations/20260127000000_add_rules_and_fix_monthly_form_url/migration.sql`

---

## 🔧 Step-by-Step Fix

### Step 1: Fix DATABASE_URL in Vercel

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

#### For PRODUCTION:
```bash
DATABASE_URL=postgresql://[user]:[password]@[hostname]-pooler.neon.tech/[database]?sslmode=require
```
**IMPORTANT:** Must use the `-pooler` hostname!

#### For PREVIEW:
Use a different Neon branch connection:
```bash
DATABASE_URL=postgresql://[user]:[password]@[preview-hostname]-pooler.neon.tech/[database]?sslmode=require
```

**Verify:**
- ✅ URL starts with `postgresql://` (NOT `postgres://`)
- ✅ Includes `-pooler` in hostname
- ✅ Ends with `?sslmode=require`
- ✅ Set for both Production AND Preview environments

### Step 2: Apply Database Migration

**Option A: Using Neon Console (Recommended)**

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Select your project
3. Go to **SQL Editor**
4. Run this migration SQL:

```sql
-- Add rules column if it doesn't exist
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "rules" TEXT;

-- Rename feedbackFormEmbedUrl to monthlyFormEmbedUrl if it exists
-- If feedbackFormEmbedUrl doesn't exist, create monthlyFormEmbedUrl
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Settings'
        AND column_name = 'feedbackFormEmbedUrl'
    ) THEN
        ALTER TABLE "Settings" RENAME COLUMN "feedbackFormEmbedUrl" TO "monthlyFormEmbedUrl";
    ELSE
        ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "monthlyFormEmbedUrl" TEXT;
    END IF;
END $$;
```

5. Click **Run** for EACH environment (Production AND Preview branches)

**Option B: Using Prisma Migrate (Alternative)**

```bash
# Connect to production database
# IMPORTANT: Use direct (non-pooler) connection for migrations
export DATABASE_URL="postgresql://[user]:[password]@[hostname].neon.tech/[database]?sslmode=require"

# Deploy pending migrations
npx prisma migrate deploy

# Verify migration was applied
npx prisma migrate status
```

### Step 3: Trigger Vercel Redeploy

1. Go to **Vercel Dashboard** → **Deployments**
2. Click the **3 dots** on latest deployment
3. Select **Redeploy**
4. Wait for build to complete

### Step 4: Verify Deployment

1. Visit your production URL: `https://bird-submissions.vercel.app`
2. Try logging in
3. Navigate to `/dashboard`
4. Check for errors in browser console

Expected result: ✅ App loads successfully without errors

---

## 🎯 Quick Checklist

Before redeploying, verify:

- [ ] DATABASE_URL starts with `postgresql://` (not `postgres://`)
- [ ] DATABASE_URL includes `-pooler` hostname for Vercel (serverless)
- [ ] DATABASE_URL set for Production environment in Vercel
- [ ] DATABASE_URL set for Preview environment in Vercel
- [ ] AUTH_SECRET exists in Vercel (both Production & Preview)
- [ ] Migration SQL executed in Neon Console for main branch
- [ ] Migration SQL executed in Neon Console for preview branch (if exists)

---

## 📊 What the Migration Does

```sql
1. Adds `rules` column (Game rules text for dashboard display)
2. Renames `feedbackFormEmbedUrl` → `monthlyFormEmbedUrl` (fixes naming mismatch)
   OR creates `monthlyFormEmbedUrl` if column doesn't exist
```

Both operations use `IF NOT EXISTS` / conditional logic to be **idempotent** (safe to run multiple times).

---

## 🔍 Troubleshooting

### Issue: "DATABASE_URL is invalid"
**Fix:** Double-check the connection string format:
- Must start with `postgresql://`
- Must include username, password, hostname, database name
- Must end with `?sslmode=require`

### Issue: Migration fails with "column already exists"
**Fix:** The migration uses `IF NOT EXISTS` - this shouldn't happen. If it does, manually check columns:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Settings';
```

### Issue: Still getting "Settings.rules does not exist"
**Fix:** Verify migration ran successfully:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Settings'
AND column_name IN ('rules', 'monthlyFormEmbedUrl');
```
Should return both columns.

---

## 🎓 Why This Happened

**Root Cause:** Local development schema diverged from production migrations:
1. `rules` column was added to schema.prisma but never migrated
2. `monthlyFormEmbedUrl` was renamed in schema but old migration kept wrong name
3. Production database still has old schema from migrations only

**Prevention:** Always create migrations when schema changes:
```bash
npx prisma migrate dev --name describe_your_changes
npx prisma migrate deploy  # Apply to production
```

---

## ✅ Success Criteria

Deployment is successful when:
1. No error logs in Vercel deployment logs
2. App loads at https://bird-submissions.vercel.app
3. Dashboard page (/dashboard) loads without errors
4. No "Application error: a server-side exception has occurred" message
5. Browser console shows no Prisma or database errors
