# Development Learnings Log

A running log of lessons learned while building the Twitch bird-watching app. These are real issues encountered and their solutions.

---

## How to Use This File

When you encounter a problem and solve it, add an entry:

```markdown
### [Date] - Brief Title

**Problem:** What went wrong
**Root Cause:** Why it happened
**Solution:** How you fixed it
**Prevention:** How to avoid it in future
```

---

## 2026

### February 27, 2026 - Duplicate Vercel Projects Causing Failed Deployments

**Problem:** Commit `1a894f5` showed a red X — deployment failed. But the app was actually deploying fine on the real project.

**Root Cause:**
- Three separate Vercel projects were linked to the same `lukalacious/bird_submissions` repo:
  1. `bird-submissions` — the original production project (connected to repo, has domain)
  2. `birds` — accidental duplicate created from repo root via `vercel` CLI (`.vercel/project.json` at repo root)
  3. `birds-app` — old leftover created by running `vercel` CLI from `birds-app/` subdirectory (later disconnected)
- Both `bird-submissions` and `birds` were connected to the repo, so every push triggered **two deployments**
- The duplicate project didn't have correct root directory / env vars, causing one to always fail
- Running `vercel` CLI from different directories silently creates new projects — `.vercel/project.json` is local-only (gitignored) so this goes unnoticed

**Solution:**
1. Deleted `birds` and `birds-app` projects from Vercel dashboard
2. Removed stale local `.vercel/` directories (repo root and `birds-app/`) that pointed to deleted projects
3. Kept `bird-submissions` as the single production project

**Prevention:**
- Only ONE Vercel project per repo — check the Vercel dashboard before running `vercel` CLI
- If you run `vercel` from a new directory, it creates a new project — always verify on the dashboard
- When you see dual deployment statuses on GitHub commits, check for duplicate Vercel projects immediately
- The `.vercel/project.json` files are gitignored and local-only — they don't warn you about duplicates

---

### February 27, 2026 - Prisma Migrate P3009: Failed Migration Blocking Deploys

**Problem:** Vercel deploy failed with `Error: P3009 — migrate found failed migrations in the target database`. Build exited after 15 seconds.

**Root Cause:**
- The `results` column had already been added to `ProcessingLog` via `prisma db push` during development
- When `prisma migrate deploy` ran in the Vercel build, the migration tried `ALTER TABLE "ProcessingLog" ADD COLUMN "results" JSONB` — but the column already existed (error code `42701`)
- Prisma recorded the migration as "failed" in `_prisma_migrations` table (`finished_at = NULL, applied_steps_count = 0`)
- All subsequent deploys refused to run because of the stuck failed migration

**Solution:**
1. Verified the column already existed with correct type (`JSONB`) via `information_schema.columns`
2. Marked the migration as applied in production:
   ```sql
   UPDATE _prisma_migrations
   SET finished_at = NOW(), applied_steps_count = 1, logs = NULL
   WHERE migration_name = '20260227000000_add_results_to_processing_log';
   ```
3. Redeployed — build succeeded

**Prevention:**
- Don't mix `prisma db push` (for dev prototyping) with `prisma migrate deploy` (for production) on the same database
- If you used `db push` to add a column during dev, make sure the migration file doesn't try to add it again on production
- If a migration fails with P3009: check `_prisma_migrations` table, verify the actual DB state, then either roll back or mark as applied
- Consider running `prisma migrate diff` to check for schema drift before deploying

---

### February 27, 2026 - Vercel Cron Route Handler Broken by "use server" Directive

**Problem:** Monthly elimination cron job (`/api/cron/elimination-check`) never fired. No users were eliminated after January despite the cron schedule being configured in `vercel.json`.

**Root Cause:**
- The route handler file had `"use server";` as its first line
- `"use server"` is a Next.js directive for **Server Actions only** — it tells the compiler to treat exported functions as RPC-callable from the client
- Route handlers (`export async function GET/POST` in `route.ts`) are already server-only by convention
- The directive confused Next.js module bundling, preventing the route from being registered — resulting in 404 for the endpoint

**Solution:**
1. Removed `"use server";` from `src/app/api/cron/elimination-check/route.ts`
2. Set `CRON_SECRET` env var in Vercel (Production only)
3. Manually triggered the endpoint via curl to backfill January's elimination check

**Prevention:**
- Never use `"use server"` on route handlers (`route.ts`) — only on Server Action files
- `"use server"` → Server Actions (functions called via RPC from client)
- `"use client"` → Client Components
- Route handlers → neither directive needed (server-only by default)

**Additional Notes:**
- Vercel production URL is `bird-submissions.vercel.app` (not `birds-app.vercel.app`)
- Vercel Crons only run in Production — `CRON_SECRET` only needed in Production env
- January backfill result: 20 safe (31/31), 1 eliminated (Charles Roberts, 1/31), 1 skipped (Ronald du Toit, join month)

---

### February 26, 2026 - DD/MM/YYYY Timestamp Parsing in Google Forms

**Problem:** All January 2026 bonus jokers were 0 in the database. The admin panel form processing matched zero users — every row was silently skipped.

**Root Cause:**
- The Google Form is configured with South African locale, producing timestamps like `26/01/2026 10:30:00` (DD/MM/YYYY)
- `new Date("26/01/2026 10:30:00")` returns `Invalid Date` in V8 because it expects MM/DD/YYYY
- Dates where DD ≤ 12 (e.g. `01/02/2026`) would silently parse as the wrong month — even worse than failing
- Additionally, the Form's "Email" column contained names instead of email addresses, causing email matching to fail

**Solution:**
1. Added `parseTimestamp()` helper in `src/lib/google-sheets.ts` that regex-matches `DD/MM/YYYY HH:mm:ss` and constructs Date via `new Date(year, month-1, day, ...)`, with fallback to native parsing
2. Created `scripts/overrides.json` for 3 unmatched users whose names couldn't be auto-resolved
3. Ran `scripts/backfill-form-emails.ts` to replace names with emails in the Google Sheet
4. Reprocessed January via `/admin/form-jokers`

**Prevention:**
- Never rely on `new Date(string)` for locale-dependent formats — always parse explicitly
- When integrating Google Forms, check the locale setting and test with actual form data
- The `parseTimestamp()` helper now handles both DD/MM/YYYY and fallback formats

---

### January 28, 2026 - Schema Drift Between Dev and Production

**Problem:** Community page worked locally but crashed in production with "column does not exist" error.

**Root Cause:**
- Added `isJokerSubmission` column to Prisma schema
- Ran `prisma db push` which only updated the **dev** Neon branch
- Deployed code to Vercel which uses **production** Neon branch
- Production database didn't have the new column

**Solution:**
1. Used Neon MCP tools to compare schemas: `compare_database_schema`
2. Applied migration to production: `prepare_database_migration` + `complete_database_migration`
3. Redeployed

**Prevention:**
- Always compare dev/production schemas before deploying
- Consider switching to `prisma migrate` for trackable migrations
- Add "sync schema to production" to pre-deploy checklist

**Related Docs:** [DATABASE_SCHEMA_MANAGEMENT.md](./processes/DATABASE_SCHEMA_MANAGEMENT.md)

---

### January 27, 2026 - Vercel Build Failing on Prisma Generate

**Problem:** Vercel builds failed with "Prisma Client not generated" error.

**Root Cause:**
- `prisma generate` wasn't running during the Vercel build
- Prisma Client needs to be generated on the deployment server (different architecture)

**Solution:**
Updated `vercel.json` build command:
```json
{
  "buildCommand": "npx prisma generate && next build"
}
```

**Prevention:**
- Always include `prisma generate` in production build commands
- The `postinstall` script in `package.json` helps but isn't always reliable on all platforms

---

### January 26, 2026 - Next.js Image Component Blocking External URLs

**Problem:** GitHub profile images not loading, showing broken image placeholder.

**Root Cause:**
- Next.js Image component requires explicit allowlisting of external domains
- GitHub uses `avatars.githubusercontent.com` for profile pictures

**Solution:**
Added to `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "github.com" },
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
  ],
}
```

**Prevention:**
- When adding external images, immediately check if domain is in `remotePatterns`
- Consider using a catch-all pattern for trusted CDNs (with caution)

---

### January 25, 2026 - NextAuth Session Not Available in Server Components

**Problem:** `session` was `null` in server components even when user was logged in.

**Root Cause:**
- Was using `useSession()` hook (client-side only) in server components
- Server components need to use `auth()` from the auth config

**Solution:**
```typescript
// Server Component - CORRECT
import { auth } from "@/lib/auth";
const session = await auth();

// Client Component - CORRECT
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

**Prevention:**
- Server Components: use `auth()`
- Client Components: use `useSession()`
- Check if component has `"use client"` directive before choosing

---

### January 24, 2026 - Prisma Unique Constraint Error on Upsert

**Problem:** `prisma.submission.upsert()` failing with unique constraint violation.

**Root Cause:**
- The `where` clause didn't match the actual unique constraint in schema
- Schema had `@@unique([userId, regionId, birdName, year, month])`
- Was only passing `{ id }` in where clause

**Solution:**
```typescript
// Use the compound unique constraint
await prisma.submission.upsert({
  where: {
    userId_regionId_birdName_year_month: {
      userId,
      regionId,
      birdName,
      year,
      month,
    },
  },
  // ...
});
```

**Prevention:**
- Always check `schema.prisma` for `@@unique` constraints
- Prisma generates typed helpers for compound uniques: `fieldName1_fieldName2_...`

---

### January 23, 2026 - React Hydration Mismatch with Portals

**Problem:** Console error: "Hydration failed because the initial UI does not match what was rendered on the server."

**Root Cause:**
- Using `createPortal(content, document.body)` in a component
- `document.body` doesn't exist during server-side rendering

**Solution:**
```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// Only render portal after mount
{mounted && createPortal(<Menu />, document.body)}
```

**Prevention:**
- Any code accessing `document` or `window` must be wrapped in useEffect or checked with `typeof window !== 'undefined'`
- Use the `mounted` pattern for portals

---

### [2026-07-26] - Joker grouping broken by mixed group-name schemes + unscoped bird lookup

**Problem:**
Users reported wrong joker counts: Kenya user's 6 flycatchers counted as only 3, egrets+herons merged into one group, suspected Latin-name ("capensis") grouping.

**Root Cause:**
Two independent issues. (1) EA/WA regions had long taxonomic `groupName`s ("Herons, Egrets and Bitterns") while SA/NL used short name-derived ones ("Heron"). (2) `getUserJokerInfo` looked up `Bird` by `fullName` without region filter — birds existing in multiple regions got a nondeterministic groupName. There was never any Latin-name matching; grouping is purely `Bird.groupName` data.

**Solution:**
Extracted region-scoped, session-free computation into `src/lib/joker-groups.ts` (lookup by `(fullName, regionId)`); normalized 2,735 EA/WA groupNames to the short scheme (`scripts/audit-group-names.ts` + `normalize-group-names.ts`); recalculated all 2026 group jokers (`scripts/recalc-all-jokers.ts`, bonus jokers preserved).

**Prevention:**
- New bird data must use the short group scheme (groupName ≈ last word of common name)
- Never look up `Bird` by `fullName` alone — always scope by region; match species across regions by `scientificName` (277 species have different common names per region)
- Scripts needing joker recalc must use `joker-groups.ts` — `recalculateJokers` server action needs an auth session context

---

### [2026-07-26] - Wrong-email accounts: submissions and form responses land on duplicate users

**Problem:**
Shaun submitted May under a second Google account (`shaun.wytske@`), so his May birds/jokers were invisible; Dave Gear filled the joker Google Form with a second email, which matched an *empty* duplicate User instead of failing visibly.

**Root Cause:**
Google OAuth silently creates a new User for any Google account. Form-joker processing matches responses by exact email, so a duplicate account "matches" and absorbs bonus jokers.

**Solution:**
One-off `scripts/fix-shaun-may.ts` (move submissions + UserJoker, delete duplicate rows/user); `EMAIL_ALIASES` map in `form-joker-actions.ts` canonicalizes known wrong emails before matching.

**Prevention:**
- When a user reports "missing" submissions/jokers, first check for a second User with a similar email
- Add new aliases to `EMAIL_ALIASES`; delete empty duplicate accounts
- Fix scripts: dry-run by default, `--apply` to execute, test on a Neon branch first

---

## Template for New Entries

Copy this template when adding new learnings:

```markdown
### [Date] - Title

**Problem:**

**Root Cause:**

**Solution:**

**Prevention:**

**Related Docs:** (optional)
```

---

## Quick Reference: Common Gotchas

| Issue | Quick Fix |
|-------|-----------|
| DD/MM/YYYY timestamps from Google Forms | Use `parseTimestamp()` — never `new Date()` on locale strings |
| Prisma types out of sync | `npx prisma generate` |
| Schema not in production | Compare schemas, apply migration |
| External images broken | Add domain to `next.config.ts` remotePatterns |
| Session null in server component | Use `auth()` not `useSession()` |
| Hydration mismatch | Check for `document`/`window` access, use `mounted` state |
| Build fails on Vercel | Check build command includes `prisma generate` |
| Unique constraint error | Check `@@unique` in schema, use compound key |
| Route handler returns 404 | Don't use `"use server"` on `route.ts` — it's for Server Actions only |
| Vercel Cron not firing | Check `CRON_SECRET` is set (Production only), check route is registered |
| Duplicate deploy failures | Check Vercel dashboard for multiple projects on same repo — delete extras |
| Prisma P3009 failed migration | Check `_prisma_migrations` table, verify column exists, mark as applied |

---

*Keep this file updated as you learn!*
