<p align="center">
  <img src=".github/assets/banner.svg" alt="Twitch: a bird a day, all year" width="100%">
</p>

<p align="center">
  <a href="https://github.com/lukalacious/bird_submissions/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/lukalacious/bird_submissions/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/lukalacious/bird_submissions/actions/workflows/ci-v2.yml"><img alt="CI (v2)" src="https://github.com/lukalacious/bird_submissions/actions/workflows/ci-v2.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-2b4a35"></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white">
  <img alt="Deployed on Vercel" src="https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white">
</p>

**Twitch** is the app behind a bird club's year-long challenge: log a new species every day, bank *jokers* for good behaviour, and try not to get eliminated. It replaces a Google Form and a shared spreadsheet with something that works from a phone in the field.

🔗 **Live app:** [bird-submissions.vercel.app](https://bird-submissions.vercel.app) · 🚧 **v2 staging:** [twitch-v2-seven.vercel.app](https://twitch-v2-seven.vercel.app)

---

## How the game works

- **A bird a day.** Each month has a target of one species per day. A species counts once per season, so the list gets harder as the year goes on.
- **Jokers.** Players earn jokers for things like keeping every sighting within 15 km of home, or birding without a motorised vehicle. Some choices cost jokers.
- **Elimination.** Miss the monthly target and each missing bird spends a joker from an earlier month. Run out and you're out. A month-end cron does the sums.
- **Golden birds.** Each month has a short list of special species worth extra. From the 2027 season they must be proven with a photo.
- **The Flock.** A leaderboard, a latest-sightings feed and a photo wall keep the club nosy about each other.
- **Monthly check-in.** A short questionnaire at month end awards the bonus jokers. In v2 it lives in the app and is pre-filled from what you already logged.

The full joker arithmetic is in [`birds-app/docs/JOKER-MATH-LOGIC.md`](birds-app/docs/JOKER-MATH-LOGIC.md).

## Two apps, one database

| | [`birds-app/`](birds-app/) · **v1** | [`birds-v2/`](birds-v2/) · **v2** |
|---|---|---|
| Status | **In production** for the 2026 season | Rebuild, launching **1 January 2027** |
| Check-in | Google Form, synced into the app | In-app, pre-filled, no spreadsheet |
| Photos | Optional on any sighting | Proof for golden birds; compressed on-device |
| Identity | Google sign-in | Google sign-in, plus "are you already playing?" account linking and an admin merge tool |
| Tests | Vitest | Vitest + integration + Playwright on a phone viewport with axe checks |
| CI | [`ci.yml`](.github/workflows/ci.yml) | [`ci-v2.yml`](.github/workflows/ci-v2.yml) |

Both apps share a single Neon Postgres project. v1 owns the `public` schema and v2 owns the `v2` schema, so the migration can run and re-run without touching the live game. Cutover is a DNS change, and rollback is the same change in reverse.

## Tech stack

Next.js 16 (App Router, Server Components) · TypeScript · Prisma · Neon PostgreSQL · Auth.js with Google sign-in · Tailwind CSS · Vercel (hosting, crons, Blob storage for photos) · Web Push.

## Quick start

Each app is self-contained with its own `package.json`. Pick one:

```bash
# v2 (where new work happens)
cd birds-v2
cp .env.example .env      # Neon branch URL, Google OAuth client, VAPID keys
npm install               # also runs prisma generate
npm run dev

# v1 (production)
cd birds-app
cp .env.example .env
npm install
npm run dev
```

Then open <http://localhost:3000>. Full setup notes, including Google OAuth redirect URIs and the migration workflow, are in each app's README.

```bash
npm run lint && npm run typecheck   # v2
npm test                            # unit tests, no database needed
```

## Repository map

```
.
├── birds-app/      v1: the live app (Next.js + Prisma)
│   └── docs/       architecture, joker rules, testing, learnings log
├── birds-v2/       v2: the 2027 rebuild
│   ├── src/lib/rules/   pure, tested game rules (jokers, elimination, golden birds)
│   └── MANUAL-TODO.md   cutover runbook
├── data/           raw source bird lists (BLSA, Netherlands); reference only
└── .github/        CI for both apps, nightly staging refresh, this banner
```

## Where to look

| I want to… | Go to |
|---|---|
| Run v1 locally | [`birds-app/README.md`](birds-app/README.md) |
| Understand v2's layout and rules | [`birds-v2/README.md`](birds-v2/README.md) |
| See how jokers are calculated | [`birds-app/docs/JOKER-MATH-LOGIC.md`](birds-app/docs/JOKER-MATH-LOGIC.md) |
| Read the architecture | [`birds-app/docs/reference/ARCHITECTURE.md`](birds-app/docs/reference/ARCHITECTURE.md) |
| Change the database schema safely | [`birds-app/docs/processes/DATABASE_SCHEMA_MANAGEMENT.md`](birds-app/docs/processes/DATABASE_SCHEMA_MANAGEMENT.md) |
| Learn from past bugs | [`birds-app/docs/LEARNINGS.md`](birds-app/docs/LEARNINGS.md) |
| See what's next | [`birds-app/docs/NEXT-FEATURES.md`](birds-app/docs/NEXT-FEATURES.md) |

## Contributing

This is a hobby project for one club, but issues and pull requests are welcome. If you're adding a game rule, put it in `birds-v2/src/lib/rules/` as a pure function with a test next to it.

## Licence

[MIT](LICENSE) © Luke Roberts
