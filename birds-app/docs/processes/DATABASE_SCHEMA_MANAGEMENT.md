# Database Schema Management with Prisma & Neon

This guide explains how to manage database schemas using **Prisma Migrations** with **Neon PostgreSQL**.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Developer Workflow](#developer-workflow)
3. [Understanding the Setup](#understanding-the-setup)
4. [Prisma Commands](#prisma-commands)
5. [Troubleshooting](#troubleshooting)

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
```

### Key Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run db:migrate` | Create & apply migration | After editing schema.prisma |
| `npm run db:migrate:status` | Check pending migrations | Before deploying |
| `npm run db:migrate:deploy` | Apply migrations (prod-safe) | CI/CD or manual prod sync |
| `npm run db:studio` | Open database GUI | Debugging/exploring data |

---

## Developer Workflow

### The Golden Rule

> **Always use `npm run db:migrate` for schema changes, never `npm run db:push`**

`db:push` doesn't create migration files, which means production won't receive your changes automatically.

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
- [ ] Push to GitHub
- [ ] Verify Vercel build log shows migration applied

---

## Understanding the Setup

### Architecture

```
┌──────────────────┐         ┌──────────────────┐
│  Local Dev       │         │  Vercel (Prod)   │
│                  │         │                  │
│  npm run dev     │         │  next build      │
│       │          │         │       │          │
│       ▼          │         │       ▼          │
│  DATABASE_URL ───┼────┐    │  DATABASE_URL ───┼────┐
└──────────────────┘    │    └──────────────────┘    │
                        │                            │
                        ▼                            ▼
              ┌─────────────────┐        ┌─────────────────┐
              │  Neon Dev       │        │  Neon Prod      │
              │  Branch         │        │  Branch         │
              └─────────────────┘        └─────────────────┘
```

### How Auto-Migration Works

The Vercel build command is:
```
npx prisma generate && npx prisma migrate deploy && next build
```

1. **prisma generate** - Creates TypeScript types from schema
2. **prisma migrate deploy** - Applies any pending migrations to production
3. **next build** - Builds the application

If migrations fail, the build stops — preventing broken deployments.

### Neon Branch Structure

```
bird_tracker (Neon Project)
├── production (primary branch) ← Vercel production
└── dev (child branch)          ← Local development
```

Both branches receive the same migrations through the committed migration files.

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

### `prisma db push` (Prototyping Only)

Pushes schema directly without creating migrations.

```bash
npm run db:push
```

**Warning:** Only use for rapid prototyping. Changes won't propagate to production!

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

### Prisma Client types don't match database

**Cause:** Generated client is out of sync.

**Fix:**
```bash
npm run db:generate
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

### Database schema is out of sync

```bash
# Check current status
npm run db:migrate:status

# If pending migrations exist, apply them:
npm run db:migrate:deploy
```

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| `20250124120000_add_month_and_max_birds_per_period` | Jan 24, 2025 | Added month to submissions, renamed settings field |
| `20250125000000_add_feedback_form_url` | Jan 25, 2025 | Added feedback form URL to settings |
| `20260127000000_add_rules_and_fix_monthly_form_url` | Jan 27, 2026 | Added rules, renamed form URL field |

---

*Last updated: January 2026*
