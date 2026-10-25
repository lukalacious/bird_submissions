# Bird Submission Tracker ("Twitch")

A bird-watching challenge app for a private club. Players submit the birds they twitch each month, earn jokers, and try not to get eliminated.

## Folders

| Folder | What it is |
|--------|------------|
| [`birds-app/`](birds-app/) | **Production app.** Next.js 16, Prisma, Neon PostgreSQL, NextAuth (Google), Vercel. |
| [`birds-v2/`](birds-v2/) | Rebuild targeting a 1 Jan 2027 launch. In-app check-in replaces the Google Form. |
| [`data/`](data/) | Raw source bird lists (BLSA checklist, Netherlands list). Not read by any code; the app's live list is `birds-app/prisma/Bird Species Database.xlsx`. |
| `archive/` | Gitignored. The original Express + React version, kept locally for reference only. |

## Where to look

- Local setup: [`birds-app/README.md`](birds-app/README.md)
- Debugging and past fixes: [`birds-app/docs/LEARNINGS.md`](birds-app/docs/LEARNINGS.md)
- Roadmap: [`birds-app/docs/NEXT-FEATURES.md`](birds-app/docs/NEXT-FEATURES.md)
- Joker rules: [`birds-app/docs/JOKER-MATH-LOGIC.md`](birds-app/docs/JOKER-MATH-LOGIC.md)
- Processes (schema, testing, perf): [`birds-app/docs/processes/`](birds-app/docs/processes/)
- Architecture and conventions: [`birds-app/docs/reference/`](birds-app/docs/reference/)
