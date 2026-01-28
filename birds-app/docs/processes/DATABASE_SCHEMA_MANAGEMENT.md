# Database Schema Management with Prisma & Neon

This guide explains how to manage database schemas when using **Prisma ORM** with **Neon's branching feature**, and how to avoid the schema drift issues we encountered.

---

## Table of Contents

1. [Understanding Your Current Setup](#understanding-your-current-setup)
2. [The Problem: Schema Drift](#the-problem-schema-drift)
3. [Prisma Commands Explained](#prisma-commands-explained)
4. [Neon Branching Strategies](#neon-branching-strategies)
5. [Recommended Workflow](#recommended-workflow)
6. [Quick Reference Commands](#quick-reference-commands)

---

## Understanding Your Current Setup

### Your Neon Project Structure

```
bird_tracker (Neon Project)
├── production (br-empty-sun-agsnzsz7) ← Primary/Default branch
│   └── Used by: Vercel deployment
│
└── dev (br-muddy-lab-agan19iv) ← Child branch forked from production
    └── Used by: Local development
```

### How Environment Variables Work

| Environment | DATABASE_URL Points To |
|-------------|----------------------|
| Local `.env` | Dev branch connection string |
| Vercel Environment Variables | Production branch connection string |

### Was Forking Dev from Production Correct?

**Yes, this is a valid approach**, but there are trade-offs:

| Approach | Pros | Cons |
|----------|------|------|
| **Dev forked from Production** (your setup) | - Can test with real-ish data<br>- Easy to compare schemas<br>- Good for small teams | - Schema changes made to dev don't automatically go to production<br>- Must manually sync schemas before deploy |
| **Totally separate databases** | - Complete isolation<br>- No accidental data exposure | - Harder to compare schemas<br>- Need to maintain two completely separate setups |
| **Single database (no branches)** | - Simplest setup<br>- No sync issues | - No isolation<br>- Dev mistakes affect production<br>- Not recommended |

**Your setup is fine!** The issue wasn't the branching strategy—it was not syncing schema changes to production before deploying code that depended on those changes.

---

## The Problem: Schema Drift

### What Happened

1. You added `isJokerSubmission` column to your Prisma schema
2. You ran `prisma db push` which updated your **dev** database
3. You deployed code to Vercel that references `isJokerSubmission`
4. Vercel runs against **production** database—which didn't have the column
5. 💥 App crashes because column doesn't exist

### Visual Timeline

```
Day 1: Dev branch forked from Production
        Both have identical schemas ✓

Day 2: You modify schema.prisma, add isJokerSubmission
        Run: prisma db push (targets dev via DATABASE_URL)

        Dev: has isJokerSubmission ✓
        Prod: still missing isJokerSubmission ✗

Day 3: Push code to GitHub → Vercel deploys
        Vercel's DATABASE_URL points to Production
        Code tries to query isJokerSubmission → ERROR!
```

---

## Prisma Commands Explained

### `prisma db push`

**What it does:** Pushes your `schema.prisma` directly to the database, creating/modifying tables as needed.

**Use case:** Rapid prototyping, early development

**Key behaviors:**
- Does NOT create migration files
- Does NOT track what changes were made
- Targets whatever database is in `DATABASE_URL`
- Can cause data loss if you remove columns

```bash
# Pushes to whatever DATABASE_URL points to
npx prisma db push

# Preview what would happen (no actual changes)
npx prisma db push --dry-run
```

### `prisma migrate dev`

**What it does:** Creates a migration file and applies it to the database.

**Use case:** Production-ready applications, team collaboration

**Key behaviors:**
- Creates timestamped SQL files in `prisma/migrations/`
- Creates `_prisma_migrations` table to track applied migrations
- Provides rollback capability
- Team members can apply same migrations

```bash
# Create and apply a new migration
npx prisma migrate dev --name add_joker_submission_field

# Creates: prisma/migrations/20260128_add_joker_submission_field/migration.sql
```

### `prisma migrate deploy`

**What it does:** Applies pending migrations to production database.

**Use case:** CI/CD pipelines, production deployments

```bash
# Apply all pending migrations (non-interactive)
npx prisma migrate deploy
```

### `prisma generate`

**What it does:** Generates the Prisma Client based on your schema.

**Important:** This reads `schema.prisma`, not the database. Your generated client will have types for columns that might not exist in the database yet!

```bash
npx prisma generate
```

### `prisma db pull` (Introspection)

**What it does:** Updates your `schema.prisma` to match the current database schema.

**Use case:** When database was modified outside of Prisma

```bash
npx prisma db pull
```

---

## Neon Branching Strategies

### Strategy 1: Dev Branch for Development (Current Setup)

```
Production (primary)
    └── Dev (child) ← Your DATABASE_URL points here locally
```

**Workflow:**
1. Make schema changes in `schema.prisma`
2. Run `prisma db push` (updates dev branch)
3. Test locally
4. **Before deploying:** Apply same changes to production

**How to sync production:**
```bash
# Option A: Manually apply migration SQL to production
# (Use Neon console or MCP tools)

# Option B: Switch DATABASE_URL temporarily
DATABASE_URL="production_connection_string" npx prisma db push
```

### Strategy 2: Feature Branches (Recommended for Teams)

```
Production (primary)
    ├── Dev (child)
    ├── feature/add-jokers (child) ← Create per feature
    └── feature/user-profiles (child)
```

**Workflow:**
1. Create Neon branch for feature: `npx neonctl branches create --name feature/add-jokers`
2. Point DATABASE_URL to feature branch
3. Make schema changes
4. Test thoroughly
5. Merge code PR + apply schema to production simultaneously

### Strategy 3: Migrations-Based (Most Robust)

Use `prisma migrate` instead of `db push`:

```bash
# 1. Create migration (applies to dev automatically)
npx prisma migrate dev --name add_joker_field

# 2. Commit the migration file to git
git add prisma/migrations/
git commit -m "Add joker submission field migration"

# 3. In CI/CD or Vercel build, apply to production
npx prisma migrate deploy
```

**Vercel build command:**
```json
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && next build"
}
```

---

## Recommended Workflow

### For Your Current Project (Small Team/Solo)

Since you're using `db push`, follow this checklist before every deployment:

#### Pre-Deployment Checklist

- [ ] Schema changes made to `schema.prisma`
- [ ] `prisma db push` run against dev branch
- [ ] Feature tested locally
- [ ] **Schema synced to production** (use one of these methods):

  **Method A: Using Neon MCP (Claude Code)**
  ```
  Compare schemas: compare_database_schema
  Apply migration: prepare_database_migration + complete_database_migration
  ```

  **Method B: Using Neon Console**
  1. Go to Neon Console → SQL Editor
  2. Select Production branch
  3. Run the ALTER TABLE statements manually

  **Method C: Temporarily switch DATABASE_URL**
  ```bash
  # Backup your .env
  cp .env .env.backup

  # Edit .env to point to production
  # Run push
  npx prisma db push

  # Restore .env
  mv .env.backup .env
  ```

- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful

### For Future Projects (Production-Grade)

Switch to migrations:

```bash
# 1. Initialize migrations from current schema
npx prisma migrate dev --name init

# 2. Commit migrations folder
git add prisma/migrations/

# 3. Update Vercel build command
# vercel.json:
{
  "buildCommand": "npx prisma generate && npx prisma migrate deploy && next build"
}
```

---

## Quick Reference Commands

### Schema Development

```bash
# Push schema to database (dev only)
npx prisma db push

# Preview changes without applying
npx prisma db push --dry-run

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

### Migrations (Production-Ready)

```bash
# Create migration (development)
npx prisma migrate dev --name descriptive_name

# Apply migrations (production/CI)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (DANGER: deletes all data)
npx prisma migrate reset
```

### Database Inspection

```bash
# Pull schema from database
npx prisma db pull

# Validate schema file
npx prisma validate

# Format schema file
npx prisma format
```

### Neon CLI (if installed)

```bash
# List branches
npx neonctl branches list

# Create branch
npx neonctl branches create --name feature/my-feature

# Delete branch
npx neonctl branches delete feature/my-feature

# Get connection string
npx neonctl connection-string --branch dev
```

---

## Troubleshooting

### "Column does not exist" in Production

**Cause:** Schema was updated in dev but not production.

**Fix:**
1. Compare schemas using Neon's schema diff
2. Apply missing ALTER TABLE statements to production
3. Redeploy

### Prisma Client Types Don't Match Database

**Cause:** `prisma generate` creates types from `schema.prisma`, not the actual database.

**Fix:**
```bash
# If database is source of truth:
npx prisma db pull
npx prisma generate

# If schema.prisma is source of truth:
npx prisma db push
```

### Migration Failed Halfway

**Cause:** Migration partially applied before error.

**Fix:**
1. Check `_prisma_migrations` table for failed migration
2. Manually fix the database state
3. Mark migration as applied: `npx prisma migrate resolve --applied "migration_name"`

---

## Key Takeaways

1. **`prisma db push` is convenient but dangerous** — It doesn't track changes or sync across databases.

2. **Always sync production schema before deploying code** that depends on new columns/tables.

3. **Neon branching is powerful** — Your dev-forked-from-production setup is fine, just requires manual schema syncing.

4. **For production apps, use migrations** — `prisma migrate` creates trackable, reproducible schema changes.

5. **The Prisma Client is generated from schema.prisma** — It doesn't know if the actual database matches until runtime errors occur.

---

*Last updated: January 2026*
