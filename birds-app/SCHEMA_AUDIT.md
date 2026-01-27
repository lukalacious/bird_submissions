# 🔍 Complete Schema Audit Report

Generated: 2026-01-28
Status: **CRITICAL ISSUES FOUND**

---

## 📋 Executive Summary

Your deployment is failing due to **TWO separate critical issues**:

1. **DATABASE_URL Format Error** (Digest: 704401192) - Vercel environment variable issue
2. **Schema Column Mismatch** (Digest: 1876630655) - Database schema out of sync

---

## 🗄️ Settings Table - Expected vs Actual

### ✅ Expected Schema (from schema.prisma)

```prisma
model Settings {
  id                    String      @id @default("default")
  maxBirdsPerPeriod     Int         @default(31)
  resetPeriod           ResetPeriod @default(YEARLY)
  currentYear           Int         @default(2026)
  monthlyFormEmbedUrl   String?     @db.Text  // ✅ CORRECT NAME
  eliminationThreshold  Int         @default(30)
  rules                 String?     @db.Text  // ✅ EXPECTED COLUMN
  updatedAt             DateTime    @updatedAt
}
```

### ❌ Actual Production Database (based on migrations applied)

```
Settings table has:
├── id                    ✅ EXISTS
├── maxBirdsPerPeriod     ✅ EXISTS
├── resetPeriod           ✅ EXISTS
├── currentYear           ✅ EXISTS
├── feedbackFormEmbedUrl  ❌ WRONG NAME (should be monthlyFormEmbedUrl)
├── eliminationThreshold  ✅ EXISTS
├── rules                 ❌ MISSING (never migrated)
└── updatedAt             ✅ EXISTS
```

---

## 🔍 Migration Analysis

### Migration 1: `20250124120000_add_month_and_max_birds_per_period`
✅ **Status:** Correctly applied
- Adds `month` column to Submission
- Renames `maxBirdsPerSubmission` → `maxBirdsPerPeriod`

### Migration 2: `20250125000000_add_feedback_form_url`
❌ **Status:** INCORRECT COLUMN NAME
```sql
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "feedbackFormEmbedUrl" TEXT;
```
**Problem:** Schema expects `monthlyFormEmbedUrl` but migration created `feedbackFormEmbedUrl`

### Migration 3: `20260127000000_add_rules_and_fix_monthly_form_url`
⏳ **Status:** NOT YET APPLIED TO PRODUCTION
```sql
-- Add rules column if it doesn't exist
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "rules" TEXT;

-- Rename feedbackFormEmbedUrl to monthlyFormEmbedUrl
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Settings'
        AND column_name = 'feedbackFormEmbedUrl'
    ) THEN
        ALTER TABLE "Settings" RENAME COLUMN "feedbackFormEmbedUrl" TO "monthlyFormEmbedUrl";
    ELSE
        ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "monthlyFormEmbedUrl" TEXT;
    END IF;
END $$;
```
**Fix:** This migration will:
1. Add missing `rules` column
2. Rename `feedbackFormEmbedUrl` → `monthlyFormEmbedUrl`

---

## 🌍 Environment Configuration Audit

### Local Development (.env.local)
✅ **DATABASE_URL Format:** CORRECT
```bash
postgresql://neondb_owner:npg_imCJeQrXg89I@ep-orange-wind-agoy8ein-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```
- ✅ Starts with `postgresql://`
- ✅ Includes `-pooler` hostname
- ✅ Ends with `?sslmode=require`
- ✅ Points to DEV branch: `ep-orange-wind`

### Vercel Production Environment
❌ **DATABASE_URL Format:** INCORRECT OR MISSING

**Evidence from logs:**
```
error: the URL must start with the protocol postgresql:// or postgres://
```

**Possible causes:**
1. DATABASE_URL is empty/undefined
2. DATABASE_URL has wrong protocol (e.g., `postgres://` instead of `postgresql://`)
3. DATABASE_URL is malformed
4. DATABASE_URL contains special characters that need escaping

---

## 🎯 Root Cause Analysis

### Issue 1: DATABASE_URL Error (Digest: 704401192)

**Symptom:**
```
PrismaClientInitializationError: the URL must start with the protocol postgresql:// or postgres://
```

**Root Cause:** Vercel environment variable `DATABASE_URL` is incorrectly set

**Verification Steps:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Check `DATABASE_URL` for Production environment
3. Verify it matches this pattern:
   ```
   postgresql://user:pass@hostname-pooler.region.aws.neon.tech/database?sslmode=require
   ```

### Issue 2: Schema Mismatch (Digest: 1876630655)

**Symptom:**
```
PrismaClientKnownRequestError: The column Settings.rules does not exist in the current database
```

**Root Cause:** Production database schema doesn't match Prisma schema:
- Missing `rules` column
- Has wrong column name `feedbackFormEmbedUrl` instead of `monthlyFormEmbedUrl`

**Why This Happened:**
1. Developer added `rules` to schema.prisma but never created a migration
2. Developer renamed column in schema.prisma but old migration kept wrong name
3. Prisma client is generated from schema.prisma (with new names)
4. Production database still has old schema from old migrations
5. Runtime mismatch: code expects columns that don't exist

---

## 📝 Code References Using Mismatched Columns

### Files Using `monthlyFormEmbedUrl`:
- [src/app/actions/admin-actions.ts:132](src/app/actions/admin-actions.ts#L132)
- [src/app/admin/settings/page.tsx:33](src/app/admin/settings/page.tsx#L33)
- [src/app/(protected)/monthly-form/page.tsx:10](src/app/(protected)/monthly-form/page.tsx#L10)

### Files Using `rules`:
- [src/components/dashboard/game-rules.tsx:8](src/components/dashboard/game-rules.tsx#L8)
- [src/app/actions/admin-actions.ts:134](src/app/actions/admin-actions.ts#L134)
- [src/app/(protected)/dashboard/page.tsx:163](src/app/(protected)/dashboard/page.tsx#L163)
- [src/app/admin/settings/page.tsx:35](src/app/admin/settings/page.tsx#L35)

**All these files will fail at runtime** until production database is updated.

---

## ✅ Complete Fix Checklist

### Step 1: Fix DATABASE_URL in Vercel ⏳ NOT DONE

1. **Go to Vercel Dashboard:**
   - Project: bird-submissions
   - Settings → Environment Variables

2. **Find DATABASE_URL for Production environment**

3. **Verify/Update to correct format:**
   ```
   postgresql://neondb_owner:npg_imCJeQrXg89I@ep-holy-brook-agperaph-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

4. **CRITICAL CHECKS:**
   - [ ] Starts with `postgresql://` (NOT `postgres://`)
   - [ ] Includes `-pooler` in hostname (required for Vercel serverless)
   - [ ] Username is `neondb_owner`
   - [ ] Database name is `neondb`
   - [ ] Ends with `?sslmode=require`
   - [ ] No extra spaces or newlines
   - [ ] Password doesn't contain unescaped special characters

### Step 2: Apply Database Migration ⏳ NOT DONE

**Option A: Neon Console SQL Editor (Recommended)**

1. Go to [console.neon.tech](https://console.neon.tech)
2. Select your project
3. Select **MAIN/PRODUCTION branch** (ep-holy-brook)
4. Go to **SQL Editor**
5. **Run this SQL:**

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

6. Click **Run**

7. **Verify migration succeeded:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Settings'
ORDER BY ordinal_position;
```

Expected output should include:
- ✅ `rules` column (type: text)
- ✅ `monthlyFormEmbedUrl` column (type: text)
- ❌ NO `feedbackFormEmbedUrl` column

**Option B: Prisma Migrate Deploy (Alternative)**

```bash
# IMPORTANT: Use DIRECT (non-pooler) connection for migrations
export DATABASE_URL="postgresql://neondb_owner:npg_imCJeQrXg89I@ep-holy-brook-agperaph.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Deploy all pending migrations
npx prisma migrate deploy

# Verify status
npx prisma migrate status
```

### Step 3: Trigger Vercel Redeploy ⏳ NOT DONE

1. Go to Vercel Dashboard → Deployments
2. Click **⋮** (3 dots) on latest deployment
3. Select **Redeploy**
4. Monitor deployment logs for errors

---

## 🧪 Verification Commands

### Check Local Database Schema

```bash
# Connect to local dev database
export DATABASE_URL="postgresql://neondb_owner:npg_imCJeQrXg89I@ep-orange-wind-agoy8ein-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Run schema introspection
npx prisma db pull

# Compare to schema.prisma
```

### Check Production Database Schema

```sql
-- Run in Neon Console SQL Editor (production branch)

-- List all Settings columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'Settings'
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Settings' AND column_name = 'rules')
        THEN '✅ rules exists'
        ELSE '❌ rules missing'
    END AS rules_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Settings' AND column_name = 'monthlyFormEmbedUrl')
        THEN '✅ monthlyFormEmbedUrl exists'
        ELSE '❌ monthlyFormEmbedUrl missing'
    END AS form_url_status,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Settings' AND column_name = 'feedbackFormEmbedUrl')
        THEN '⚠️ feedbackFormEmbedUrl exists (should be renamed)'
        ELSE '✅ feedbackFormEmbedUrl absent'
    END AS old_column_status;
```

---

## 🚨 Critical Path to Resolution

**Priority Order:**

1. **FIRST:** Fix DATABASE_URL in Vercel (5 minutes)
   - This is blocking ALL database operations
   - Without this, app cannot start at all

2. **SECOND:** Apply migration to production database (5 minutes)
   - Fixes schema mismatch
   - Allows app to query Settings table

3. **THIRD:** Redeploy in Vercel (2 minutes)
   - Pick up new environment variable
   - Rebuild with correct configuration

**Total Time:** ~12 minutes

---

## 📊 Comparison Table

| Column Name           | Schema.prisma | Prod DB (current) | After Migration |
|----------------------|---------------|-------------------|-----------------|
| id                   | ✅ Defined     | ✅ Exists          | ✅ Exists        |
| maxBirdsPerPeriod    | ✅ Defined     | ✅ Exists          | ✅ Exists        |
| resetPeriod          | ✅ Defined     | ✅ Exists          | ✅ Exists        |
| currentYear          | ✅ Defined     | ✅ Exists          | ✅ Exists        |
| monthlyFormEmbedUrl  | ✅ Defined     | ❌ Missing         | ✅ Exists        |
| feedbackFormEmbedUrl | ❌ Not defined | ✅ Exists (wrong)  | ❌ Removed       |
| eliminationThreshold | ✅ Defined     | ✅ Exists          | ✅ Exists        |
| rules                | ✅ Defined     | ❌ Missing         | ✅ Exists        |
| updatedAt            | ✅ Defined     | ✅ Exists          | ✅ Exists        |

---

## 🎓 Lessons Learned

1. **Always create migrations for schema changes:**
   ```bash
   npx prisma migrate dev --name add_rules_column
   ```

2. **Test migrations locally before production:**
   ```bash
   npx prisma migrate deploy  # Apply to dev first
   ```

3. **Keep schema.prisma in sync with migrations:**
   - Schema = what you want
   - Migrations = how to get there
   - Database = what you have

4. **Use pooled connections for Vercel:**
   - Vercel = serverless (need `-pooler` hostname)
   - Local migrations = use direct connection (no `-pooler`)

5. **Verify environment variables after changes:**
   - Check Vercel Dashboard
   - Check deployment logs
   - Test with deployment preview

---

## ✅ Success Criteria

Deployment is successful when ALL of these are true:

- [ ] Vercel DATABASE_URL starts with `postgresql://`
- [ ] Vercel DATABASE_URL includes `-pooler` in hostname
- [ ] Production database has `rules` column
- [ ] Production database has `monthlyFormEmbedUrl` column
- [ ] Production database does NOT have `feedbackFormEmbedUrl` column
- [ ] Vercel deployment completes without errors
- [ ] App loads at https://bird-submissions.vercel.app
- [ ] Dashboard page loads without "Application error"
- [ ] No Prisma errors in browser console
- [ ] No database errors in Vercel deployment logs

---

**Generated by:** Claude Sonnet 4.5
**Last Updated:** 2026-01-28
