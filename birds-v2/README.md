# Twitch v2

The 2027 rebuild of the Twitch bird-a-day challenge. Runs in parallel with v1
(`../birds-app`) until cutover on 1 January 2027.
Plan: `~/.claude/plans/pasted-content-id-b528-build-me-dreamy-sutherland.md`.

## How it fits together

- **Database**: the same Neon project as v1. v2's tables live in the Postgres
  schema `v2`, next to v1's `public`. Staging runs on the `v2-staging` branch.
  The v1 → v2 migration reads `public.*` and writes `v2.*`, so v1 is never
  modified and rollback means pointing the domain back.
- **Time**: `src/lib/challenge-time.ts` is the only code allowed to decide the
  challenge month (SAST). ESLint blocks `getMonth()` and friends everywhere else.
- **Auth**: Auth.js v5 with Google, JWT sessions. `src/lib/dal.ts` is the only
  place the session is read. `src/proxy.ts` is an optimistic redirect only.
- **Rules**: `src/lib/rules/*` are pure, tested ports of v1's joker, submission
  and bonus logic.
- **Cache Components** are on: anything that reads the session or the clock
  renders inside `<Suspense>`.

## What's where

| Area | Code | Notes |
|---|---|---|
| Today | `src/app/(app)/page.tsx` | tally, check-in card, jokers |
| Twitch (checklist) | `src/app/(app)/twitch/` | search-first, tray in localStorage, `submitBirds` / `removeBird` |
| Photos | `src/components/photo-button.tsx`, `src/lib/upload-image.ts`, `src/app/api/upload/` | golden-bird proof only (`lib/rules/golden.ts`); canvas shrink → direct Blob upload. Profile pictures: `components/avatar-upload.tsx` |
| Check-in (replaces Google Form) | `src/app/(app)/check-in/` | pre-filled from the player's data |
| Flock | `src/app/(app)/flock/`, `src/lib/flock.ts` | cached, one tab loaded at a time |
| Me, ledger, my birds, change requests | `src/app/(app)/me/` | |
| Identity | `src/app/welcome/`, `src/lib/identity.ts`, `src/lib/merge-*.ts` | "Are you already playing?", linking, merges |
| Admin | `src/app/admin/` | claims, players/merge, changes, photos, check-ins, months, settings, CSV |
| Game rules (pure, tested) | `src/lib/rules/` | jokers, submission, check-in bonus, elimination, reminders |
| Joker writers | `src/lib/jokers-db.ts` (group), `src/lib/bonus-db.ts` (bonus) | the **only** writers of those columns |
| Crons | `src/app/api/cron/`, `vercel.json` | month-end (daily, after grace), reminders |
| Time | `src/lib/challenge-time.ts` | the only code allowed to decide the month |

Golden birds are proven by photo from the 2027 season (`PHOTO_PROOF_FROM_SEASON`); 2026 keeps v1's self-reported counts.

Dale's pending rulings are **settings** (Admin → Settings), defaulted to the
recommendations in `MANUAL-TODO.md`: 48h grace, check-in closes on the 7th,
half jokers combine, 2 empty months eliminates.

## Tests

```bash
npm test            # unit (pure rules) — fast, no DB
npm run test:int    # integration: real transactions against v2-staging
npm run build && npm run test:e2e   # Playwright on a phone viewport + axe accessibility
```

Integration and E2E tests create throwaway `@example.test` players and delete
them afterwards (`scripts/test-session.mts`).

## Develop

```bash
cp .env.example .env    # fill in from the Neon v2-staging branch and Google OAuth
npm install             # also runs prisma generate
npm run dev
npm run lint && npm run typecheck
```

New migration (Neon has no shadow DB, so diff against the live schema):

```bash
mkdir prisma/migrations/<timestamp>_<name>
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_<name>/migration.sql
npx prisma migrate deploy
```

Vercel project `twitch-v2` builds with `vercel-build`, which runs
`prisma migrate deploy` before `next build`.
