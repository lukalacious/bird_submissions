# Twitch v1 (`birds-app`)

The production app for the bird club's bird-a-day challenge, live at
**https://bird-submissions.vercel.app**. It runs the 2026 season and will be
replaced by [`../birds-v2`](../birds-v2) on 1 January 2027.

For what the game is and how the two apps relate, start at the
[repository README](../README.md).

## What it does

- **Google sign-in.** Players sign in with Google; an admin flag unlocks the admin panel.
- **Daily twitching.** Players log the species they saw, per region (South Africa and the Netherlands are seeded), against a monthly target.
- **Jokers and elimination.** The monthly Google Form check-in awards bonus jokers ([rules](docs/JOKER-MATH-LOGIC.md)); a cron spends them at month end and eliminates players who run dry.
- **Photos and golden birds.** Optional photos on sightings, with monthly special species that earn extra.
- **Community.** Leaderboard ranked by birds seen (jokers break ties), activity feed, profiles.
- **Installable.** Web app manifest, service worker and push notifications.
- **Admin panel.** Settings, elimination management, change requests, analytics.

## Tech stack

Next.js 16 (App Router) · TypeScript · Prisma 5 · Neon PostgreSQL · NextAuth v5 (Google) · Tailwind CSS 4 + shadcn/ui · Vercel (hosting, crons, Blob) · Google Sheets API (reads check-in responses).

## Local development

Prerequisites: Node.js 22+, a [Neon](https://neon.tech) database branch, a Google Cloud OAuth client.

```bash
cd birds-app
cp .env.example .env     # every variable is documented in the example file
npm install              # runs prisma generate and installs the pre-push hook
npm run db:migrate       # apply migrations to your dev branch
npm run db:seed          # load the species list from prisma/Bird Species Database.xlsx
npm run dev              # http://localhost:3000
```

Add `http://localhost:3000/api/auth/callback/google` to the OAuth client's
authorised redirect URIs.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Prisma generate + production build |
| `npm test` | Vitest unit tests |
| `npm run test:perf` | Playwright performance run (see [docs/processes/PERFORMANCE_TESTING.md](docs/processes/PERFORMANCE_TESTING.md)) |
| `npm run db:migrate` | Create and apply a migration (`db:push` is deliberately disabled) |
| `npm run db:migrate:status` | Check migration state against the database |
| `npm run db:seed` | Seed the species list |
| `npm run db:studio` | Prisma Studio |

## Deployment

Vercel builds from `main`. Keep environments isolated:

| Environment | Database |
|---|---|
| Local dev | Neon dev branch |
| Vercel Preview | Neon dev branch |
| Vercel Production | Neon production branch |

Set `NEXTAUTH_URL` to the Vercel domain with no trailing slash, and add the
production callback URL to the Google OAuth client. A pre-push hook
(`.githooks/pre-push`) refuses to push schema changes that have no migration,
because Vercel deploys `main` automatically.

### Read-only mode (after the cutover to v2)

Set `READ_ONLY=1` on the Production environment and redeploy. The app then
shows a banner pointing at `NEW_APP_URL`, refuses every write (twitches,
jokers, change requests, profile edits, admin tools, photo uploads) and the
three crons return `skipped`. Nothing is deleted; players can still sign in
and browse the 2026 season. Remove the variable and redeploy to roll back.
The switch lives in `src/lib/read-only.ts`.

## Docs

| | |
|---|---|
| [docs/reference/ARCHITECTURE.md](docs/reference/ARCHITECTURE.md) | Directory layout, data model, request flow |
| [docs/reference/BEST_PRACTICES.md](docs/reference/BEST_PRACTICES.md) | Conventions |
| [docs/JOKER-MATH-LOGIC.md](docs/JOKER-MATH-LOGIC.md) | Every joker rule and its formula |
| [docs/processes/DATABASE_SCHEMA_MANAGEMENT.md](docs/processes/DATABASE_SCHEMA_MANAGEMENT.md) | Migrations workflow |
| [docs/processes/TESTING_GUIDE.md](docs/processes/TESTING_GUIDE.md) | Testing |
| [docs/LEARNINGS.md](docs/LEARNINGS.md) | Running log of bugs and their fixes |
| [docs/history/](docs/history/) | How past month-ends were processed |
| [scripts/data/README.md](scripts/data/README.md) | Inputs and outputs of the one-off maintenance scripts |

## Licence

[MIT](../LICENSE), same as the rest of the repository.
