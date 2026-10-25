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

## Develop

```bash
cp .env.example .env    # fill in from the Neon v2-staging branch and Google OAuth
npm install             # also runs prisma generate
npm run dev
npm test                # vitest
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
