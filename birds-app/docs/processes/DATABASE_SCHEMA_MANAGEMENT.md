# Database Schema Management with Prisma & Neon

This guide is the single source of truth for database operations in the Birds app. All schema changes go through Prisma Migrations — no exceptions.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Architecture](#architecture)
3. [Developer Workflow](#developer-workflow)
4. [Prisma Commands](#prisma-commands)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)
7. [Migration History](#migration-history)

---

## Quick Reference

### Making Schema Changes (Daily Workflow)

```bash
# 1. Edit prisma/schema.prisma with your changes

# 2. Create and apply migration
npm run db:migrate
# Enter a descriptive name like: add_user_avatar_field

# 3. Test locally
npm run dev

# 4. Commit BOTH schema and migration files
git add prisma/schema.prisma prisma/migrations/
git commit -m "Add user avatar field"

# 5. Push - Vercel auto-applies migration to production
git push
# Pre-push hook will block if you forgot the migration file
```

### Key Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run db:migrate` | Create & apply migration | After editing schema.prisma |
| `npm run db:migrate:status` | Check pending migrations | Before deploying |
| `npm run db:migrate:deploy` | Apply migrations (prod-safe) | CI/CD or manual prod sync |
| `npm run db:upsert-regions` | Add/update bird data (non-destructive) | Adding new regions or updating bird lists |
| `npm run db:check-drift` | Compare local schema vs production | Manual pre-deploy sanity check |
| `npm run db:studio` | Open database GUI | Debugging/exploring data |

> **`db:push` is disabled.** It bypasses migration tracking and has caused P3009 errors. The script will print an error and exit if you try to use it.

---

## Architecture

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

**Key point:** Dev and production databases are completely separate Neon branches. Schema changes propagate to both via committed migration files — Vercel's build command runs `prisma migrate deploy` before `next build`.

### How Auto-Migration Works

The Vercel build command is:
```
npx prisma generate && npx prisma migrate deploy && next build
```

1. **prisma generate** — Creates TypeScript types from schema
2. **prisma migrate deploy** — Applies any pending migrations to production
3. **next build** — Builds the application

If migrations fail, the build stops — preventing broken deployments.

### Neon Branch Structure

```
bird_tracker (Neon Project)
├── production (primary branch) ← Vercel production
└── dev (child branch)          ← Local development
```

Both branches receive the same migrations through the committed migration files.

### Guardrails

| Guardrail | Type | What It Catches |
|-----------|------|-----------------|
| `db:push` disabled | npm script | Accidental use of push instead of migrate |
| `.githooks/pre-push` | Git hook | Schema changes pushed without migration files |
| `db:check-drift` | Manual script | Schema drift between local and production |
| `prisma migrate deploy` in build | Vercel | Missing migrations at deploy time |

---

## Developer Workflow

### The Golden Rule

> **Always use `npm run db:migrate` for schema changes.**

`db:push` is disabled because it doesn't create migration files, meaning production won't receive your changes automatically. This has caused real incidents (P3009 from mixed `db push` + `migrate deploy`).

### Step-by-Step: Adding a New Column

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Edit schema.prisma                                          │
│     model User {                                                │
│       ...                                                       │
│       avatarUrl String?  // ← Add this                         │
│     }                                                           │
├─────────────────────────────────────────────────────────────────┤
│  2. Run: npm run db:migrate                                     │
│     → Prisma generates: prisma/migrations/20260130_add_avatar/  │
│     → Migration applied to your dev database                    │
├─────────────────────────────────────────────────────────────────┤
│  3. Test locally with npm run dev                               │
├─────────────────────────────────────────────────────────────────┤
│  4. Commit both files:                                          │
│     git add prisma/schema.prisma prisma/migrations/             │
│     git commit -m "Add avatarUrl to User model"                │
├─────────────────────────────────────────────────────────────────┤
│  5. Push to GitHub                                              │
│     → Pre-push hook verifies migration exists                   │
│     → Vercel builds and runs: prisma migrate deploy             │
│     → Production database automatically updated!                │
└─────────────────────────────────────────────────────────────────┘
```

### Pre-Deployment Checklist

**For code-only changes (no schema.prisma modifications):**
- [ ] Feature tested locally
- [ ] Commit and push

**For schema changes:**
- [ ] Schema changes made in `prisma/schema.prisma`
- [ ] Migration created: `npm run db:migrate`
- [ ] Migration file reviewed (check `prisma/migrations/*/migration.sql`)
- [ ] Feature tested locally
- [ ] Both `schema.prisma` AND `migrations/` folder committed
- [ ] `npm run db:check-drift` passes (optional but recommended)
- [ ] Push to GitHub
- [ ] Verify Vercel build log shows migration applied

### Adding Bird Data (Regions)

Use the non-destructive upsert script instead of `seed.ts`:

```bash
# All regions
npm run db:upsert-regions

# Single region
npm run db:upsert-regions -- --region=east_africa

# Production (requires explicit flag)
npm run db:upsert-regions -- --production
```

This creates new birds and updates changed ones without deleting existing submissions or joker data. `seed.ts` remains available for dev-only full resets.

---

## Prisma Commands

### `prisma migrate dev` (Development)

Creates a migration file AND applies it to the database.

```bash
npm run db:migrate
# or with a specific name:
npx prisma migrate dev --name add_user_preferences
```

**Use for:** All schema changes during development

### `prisma migrate deploy` (Production)

Applies pending migrations without creating new ones. Safe for CI/CD.

```bash
npm run db:migrate:deploy
```

**Use for:** Production deployments, CI/CD pipelines

### `prisma migrate status`

Shows which migrations are pending.

```bash
npm run db:migrate:status
```

### `prisma generate`

Regenerates the Prisma Client from schema.prisma.

```bash
npm run db:generate
```

### `prisma studio`

Opens a GUI to browse and edit data.

```bash
npm run db:studio
```

---

## Environment Variables

### Local Development (`.env`)

```
DATABASE_URL=postgresql://...ep-orange-wind...-pooler.../neondb?sslmode=require
DIRECT_DATABASE_URL=postgresql://...ep-orange-wind.../neondb?sslmode=require
DATABASE_URL_PRODUCTION=postgresql://...ep-holy-brook...-pooler.../neondb?sslmode=require
AUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Production (Vercel Dashboard)

Set in: **Vercel → Project Settings → Environment Variables**

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Must use `-pooler` endpoint |
| `DIRECT_DATABASE_URL` | Yes | Non-pooler, used by `migrate deploy` |
| `AUTH_SECRET` | Yes | NextAuth v5 (not NEXTAUTH_SECRET) |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |

---

## Troubleshooting

### "Migration failed" on Vercel

**Cause:** The migration SQL has an error or conflicts with existing data.

**Fix:**
1. Check Vercel build logs for the specific error
2. If data constraint issue: create a new migration to fix the data first
3. If SQL syntax issue: you may need to edit the migration file (only if not yet deployed anywhere)

### "Column does not exist" in Production

**Cause:** Code references a column that wasn't migrated to production.

**Fix:**
1. Check if migration file exists in `prisma/migrations/`
2. If missing: run `npm run db:migrate` to create it
3. If exists but not applied: push the commit to trigger Vercel deployment

### P3009: migrate found failed migrations

**Cause:** A previous migration partially applied or `db push` was mixed with `migrate deploy`.

**Fix:**
1. Check which migration failed: `npm run db:migrate:status`
2. Mark it as rolled back in the `_prisma_migrations` table in Neon Console
3. Fix the migration SQL and redeploy
4. See `docs/LEARNINGS.md` for detailed steps

### Prisma Client types don't match database

**Cause:** Generated client is out of sync.

**Fix:**
```bash
npm run db:generate
```

### Database schema is out of sync

```bash
# Check current status
npm run db:migrate:status

# If pending migrations exist, apply them:
npm run db:migrate:deploy

# Compare local schema vs production:
npm run db:check-drift
```

### Need to undo a migration

**If not yet pushed to production:**
```bash
npm run db:migrate:reset  # Warning: deletes all data
npm run db:migrate        # Re-run to recreate
```

**If already in production:**
Create a new "reverse" migration:
```bash
# Edit schema.prisma to remove/revert the change
npm run db:migrate
# Name it: revert_previous_change
```

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `20250124120000_add_month_and_max_birds_per_period` | Jan 24, 2025 | Added month to submissions, renamed settings field |
| `20250125000000_add_feedback_form_url` | Jan 25, 2025 | Added feedback form URL to settings |
| `20260127000000_add_rules_and_fix_monthly_form_url` | Jan 27, 2026 | Added rules, renamed form URL field |
| `20260226000000_add_bonus_jokers` | Feb 26, 2026 | Added bonusJokers to UserJoker |
| `20260226100000_add_total_jokers` | Feb 26, 2026 | Added totalJokers denormalized field |
| `20260226200000_add_processing_log` | Feb 26, 2026 | Created ProcessingLog model |
| `20260226300000_add_bonus_breakdown` | Feb 26, 2026 | Added bonusBreakdown JSON to UserJoker |
| `20260227000000_add_results_to_processing_log` | Feb 27, 2026 | Added results JSON to ProcessingLog |

---

*Last updated: March 2026*
