# Twitch v2: your manual to-dos

Everything here needs your logins, a decision, or Dale. It's in the order to
do it, so you can work straight down in one sitting (about 60–90 minutes for
parts A–C). Claude keeps this file current. Tick boxes as you go.

- Staging: https://twitch-v2-seven.vercel.app
- Launch: 1 January 2027
- Built so far: every v2 feature in the plan. See `README.md` → "What's where".

---

## A. Accounts and secrets (~20 min)

### A1. Google sign-in on staging
Without this, "Continue with Google" on staging fails with `redirect_uri_mismatch`.
1. https://console.cloud.google.com/apis/credentials, signed in as the Google account that owns the v1 app.
2. **OAuth 2.0 Client IDs** → open v1's client (its ID matches `GOOGLE_CLIENT_ID` in `birds-app/.env`).
3. **Authorized redirect URIs** → **Add URI** → `https://twitch-v2-seven.vercel.app/api/auth/callback/google` → **Save**.

- [x] Done

### A2. Neon API key and GitHub secrets (nightly refresh and CI end-to-end tests)
1. Neon console → profile (top right) → **Account settings** → **API keys** → **Create new API key**, named `github-v2-staging`. Copy it.
2. GitHub → `lukalacious/bird_submissions` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, twice:
   - `NEON_API_KEY` = that key
   - `V2_STAGING_DATABASE_URL` = `DIRECT_DATABASE_URL` from `birds-v2/.env` (the one **without** `-pooler`)

- [x] Both secrets added

### A3. Photo storage
Vercel → **twitch-v2** → **Storage** → **Create** → **Blob** → name it `twitch-v2-photos`.
Creating it from inside the project connects it (Production and Preview) in one
step. Created from the team-level Storage tab instead, you must also click
**Connect Project**. Either way Vercel adds `BLOB_READ_WRITE_TOKEN`,
`BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` itself. To check:
`vercel env list --project twitch-v2` should show all three. They only reach
deployments built after they exist, so the next push picks them up.

- [x] Done (2026-10-25, verified with `vercel env list`)

### A4. Reminder keys
v2 gets its own push keypair; v1's are not reused. (v1 stored them as
write-only Secrets anyway, so the dashboard can't show them.) Players turn
reminders on again in v2, which is fine for a new app.

A fresh pair is already in `birds-v2/.env` (generated 2026-10-25). Push it to
Vercel. These lines work from any folder:

```bash
cd ~/Documents/code/projects/birds/birds-v2
pub=$(grep '^NEXT_PUBLIC_VAPID_PUBLIC_KEY=' .env | cut -d= -f2- | tr -d '"'); priv=$(grep '^VAPID_PRIVATE_KEY=' .env | cut -d= -f2- | tr -d '"')
echo "pub ${#pub} chars, priv ${#priv} chars"   # expect 87 and 43; if 0, you're in the wrong folder
for t in production preview; do printf '%s' "$pub"  | vercel --scope lukes-projects-65e0b5a0 env add NEXT_PUBLIC_VAPID_PUBLIC_KEY --environment "$t" --project twitch-v2 --yes; done
for t in production preview; do printf '%s' "$priv" | vercel --scope lukes-projects-65e0b5a0 env add VAPID_PRIVATE_KEY --environment "$t" --project twitch-v2 --sensitive --yes; done
vercel --scope lukes-projects-65e0b5a0 env list --project twitch-v2 | grep VAPID
```

The last line should list both names for Production and Preview. If you ever
lose `.env`, make a new pair with `npx web-push generate-vapid-keys` and set
both again; everyone then re-enables reminders once.

- [ ] Done

---

## B. Switch it on and check it (~30 min)

### B1. Run the staging refresh once
GitHub → **Actions** → **Nightly v2 staging refresh** → **Run workflow**. When
it's green, open the run's **Summary** to see the migration report: bird counts
"✅ identical", plus the warnings list. From now on it runs every night at
03:00 SAST.

- [ ] Green, and the report says identical

### B2. Redeploy staging (picks up A3 and A4)
Vercel → **twitch-v2** → **Deployments** → the top one → **⋯** → **Redeploy**.

- [ ] Done

### B3. Try it on your phone
Open the staging site and sign in. Existing players go straight to Today; nobody
is asked "are you X?". Then check:
- [ ] **Me**: your Google account is listed; jokers ledger matches v1
- [ ] **Admin → Months**: set a few golden birds for this month, twitch one, then add a proof photo from Twitch ("Golden bird: add a photo") → +1 joker
- [ ] **Me**: tap your picture to set a profile photo
- [ ] **Me** → turn **Reminders** on. On iPhone, add the site to your Home Screen first.
- [ ] Put it on your Home Screen (Today shows how) and open it like an app
- [ ] **Sightings → Table**: numbers match the live app. **Species**: step back a few months, open a bird to see who saw it
- [ ] **Me** → *Open admin* (you're an admin): Players, Months, Settings all load

You were eliminated in April 2026, so Twitch shows "You're out of this season".
That's correct. To try twitching, use a beta tester's account, or wait for the
2027 season.

### B4. Check CI's end-to-end tests ran
After A2, the next push runs the browser tests in CI as well (GitHub → Actions
→ CI (v2) → **e2e**). Nothing to do unless it's red.

- [ ] Seen green once

---

## C. Ask Dale (~10 min to send)

Send him these. The recommendation is in brackets, and it's already what the
app does. Anything he decides differently is a setting in **Admin → Settings**
(1–5) or a quick change by Claude (6–8).

1. **Hyphenated group names.** 131 birds are split across names like "Wood-Pigeon" vs "Pigeon", so players miss group jokers. Merge each family under one name? *(Yes, from 2027.)* Also one spelling for Bush-shrike.
2. **Half jokers.** 0.5 + 0.5 from two months show as "1 available" but v1 can't spend them. Let halves combine? *(Yes, oldest first.)* → Settings: "Half jokers … can be combined"
3. **Inactive players.** About 8 players survive only because a joker covers each empty month. Eliminate after N empty months in a row? *(After 2.)* → Settings: "Empty months in a row"
4. **Deadlines.** Check-in closes on the 7th of the next month? 48 hours after month-end to fix your own list before needing an admin? *(Yes and yes.)* → Settings: Deadlines
5. **Golden birds need photo proof (decided by Luke, 25 Oct; tell Dale).** From 2027 a golden bird counts only with a photo: 1 joker each, max 5, counted automatically. There's no separate "photo birds" list and no golden or photo question on the check-in. Months with no golden birds set have no photo uploads. 2026 history keeps v1's self-reported counts.
6. **"Glossy Starling"** (July's golden bird) matches several species. Which one?
7. **Same bird twice in 2026**: Dale's Southern Black Flycatcher and African Paradise Flycatcher (Mar and Apr), and Colin's Black-headed Gull (Jan and Mar). Kept, so 2026 totals don't change; repeats are blocked from 2027. OK? *(Yes.)*
8. **Messy group names** like "(Leaflove)", "Malkoha)", "Seed-cracker"/"Seedcracker". Tidy them with the merge? *(Yes. Only affects 2027.)*

- [ ] Sent to Dale
- [ ] His answers given to Claude

---

## D. Housekeeping (do D1 last, between sessions)

- [ ] **D1. Move the project out of iCloud.** `~/Documents` is iCloud-synced. It
  creates "file 2.ts" copies in build folders and hung a build on 25 Oct. v2
  works around it (builds into `.next.nosync`), but the real fix is:
  1. Quit Claude Code and your editor.
  2. `mv ~/Documents/code ~/code`
  3. Update the project paths in `~/.claude/CLAUDE.md`.
  4. Copy Claude's project memory to the new path key:
     `cp -R ~/.claude/projects/-Users-lukeroberts-Documents-code-projects-birds ~/.claude/projects/-Users-lukeroberts-code-projects-birds`
- [ ] **D2. Delete leftover build junk** (all regenerated). From `birds-v2/`:
  `rm -rf birds-v2 .next src/generated && npm install`
- [ ] **D3. Optional: stop v1 rebuilding on v2 commits.** Vercel → **bird-submissions** →
  Settings → Git → **Ignored Build Step** → `git diff --quiet HEAD^ HEAD -- .`
- [ ] **D4. Review:** 17 players have early-2026 "used jokers" with no matching
  joker entries (probably spent before v1 logged them). v2 keeps every balance
  exactly as v1 has it; just confirm that matches your memory. The list is in
  the migration report (B1).

---

## E. December beta (15–28 Dec)

- [ ] 5–8 testers lined up: mixed regions and ages, at least 2 iPhone and 2 Android
- [ ] On 14 Dec set the GitHub variable `V2_STAGING_FROZEN` = `true` (Settings →
  Secrets and variables → Actions → **Variables**), so the nightly refresh stops
  wiping testers' data during the beta. Delete it afterwards.
- [ ] Testers run a whole month-end: twitch, photos, check-in, see the 3 Jan close

---

## F. Cutover runbook (29 Dec – 3 Jan)

**Prepared (10 Nov):** v1 now has a read-only switch. Setting `READ_ONLY=1`
on the **bird-submissions** project and redeploying shows the banner, refuses
every write (twitches, jokers, change requests, profile edits, admin tools,
photo uploads) and makes v1's three crons return `skipped`, so there is no
separate "remove crons" step. Unset, nothing changes, so the code is already
safe to merge. Rollback is deleting the variable and redeploying. Code:
`birds-app/src/lib/read-only.ts`.

### F0. Before 29 Dec (~15 min, any day)

- [ ] Merge the branch with the read-only switch (it is inert until `READ_ONLY` is set).
- [ ] **Give v1 its retirement address.** Vercel → **bird-submissions** →
  Settings → **Domains** → Add `twitch-2026.vercel.app`. Then add
  `https://twitch-2026.vercel.app/api/auth/callback/google` to the Google
  OAuth client (A1). Harmless now; essential once the main domain moves.
- [ ] **Rehearse the domain move (2 min).** On **bird-submissions** → Domains
  → Add `twitch-move-test.vercel.app`. Then on **twitch-v2** → Domains → Add
  the same name. Vercel should say it belongs to another project and offer
  to **move** it (documented for custom domains; expected but not yet seen
  for `.vercel.app` names). Delete the throwaway from whichever project ends
  up holding it. If Vercel refuses, plan on fallback B below.
- [ ] Confirm which Neon endpoint v1 production uses: Vercel →
  **bird-submissions** → Settings → Environment Variables → `DATABASE_URL`
  (Production). Expected host `ep-holy-brook-agperaph…` (v1's `.env` names it
  `DATABASE_URL_PRODUCTION`). The migration below must target that endpoint.
- [ ] D3 (ignored build step on bird-submissions), so a v2 commit can't
  redeploy v1 during the window.

### F1. The night

| When (SAST) | Step | Who |
|---|---|---|
| 29 Dec | Dale signs off the rules; set them in Admin → Settings on staging | you + Dale |
| 29 Dec | Final rehearsal: run the refresh (B1), check the report is identical | you |
| 31 Dec 18:00 | Tell players: "New Twitch from midnight. Same Google sign-in, no more Google Form." | you |
| 31 Dec 22:00 | **v1 read-only:** Vercel → bird-submissions → Settings → Environment Variables → add `READ_ONLY` = `1` (Production) → Deployments → ⋯ → Redeploy. Check: banner shows, Twitch says "Twitching has moved" | you |
| 31 Dec 22:05 | Neon → Branches → **Create branch** `pre-v2-cutover` from `production` (instant backup) | you |
| 31 Dec 22:10 | Migrate production (commands in F2): dry run, read the report, then `--apply` | you + Claude |
| 31 Dec 22:30 | **Point twitch-v2 at production:** Vercel → twitch-v2 → Settings → Environment Variables (Production): `DATABASE_URL` = production *pooled* URL (`-pooler` host), `DIRECT_DATABASE_URL` = production direct URL, **delete `STAGING_SITE`**. Deployments → Redeploy (its build runs `prisma migrate deploy`, now a no-op) | you |
| 31 Dec 22:40 | **Move the domain** (F3). Then on bird-submissions, if `NEXTAUTH_URL` is set, change it to `https://twitch-2026.vercel.app` and redeploy, or v1 sign-ins bounce to v2 | you |
| 31 Dec 22:45 | Smoke test on v2 at bird-submissions.vercel.app: sign in, Today shows December, Sightings table right, no test-site banner. On twitch-2026.vercel.app: banner, read-only | you |
| 1 Jan 00:00 | 2027 opens on v2 | — |
| 3 Jan 02:15 | v2 closes December (after the 48h grace); check Admin → Overview and the jokers ledger | you |
| 7 Feb | First in-app check-in closes (January's) | — |

### F2. Migration commands (31 Dec 22:10)

The script refuses any database other than v2-staging unless told the
endpoint, so a typo can't hit production by accident. Replace the URL with
the production branch's **direct** connection string from the Neon console.

```bash
cd ~/Documents/code/projects/birds/birds-v2
export DATABASE_URL='postgresql://…@ep-holy-brook-agperaph.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
export DIRECT_DATABASE_URL="$DATABASE_URL"

npx prisma migrate deploy        # creates the v2 schema beside v1's public; v1 untouched
npx tsx scripts/migrate-v1-to-v2.ts --allow-host=ep-holy-brook-agperaph            # dry run
cat scripts/reports/*.md | tail -40                                                 # "identical"?
npx tsx scripts/migrate-v1-to-v2.ts --allow-host=ep-holy-brook-agperaph --apply
```

If Dale said yes to the hyphen-group merge (C1), add
`--group-mapping=scripts/data/hyphen-group-mapping.json` to both script runs.

### F3. Moving `bird-submissions.vercel.app` to v2

**A (preferred):** Vercel → **twitch-v2** → Settings → Domains → Add
`bird-submissions.vercel.app` → confirm the **move** from bird-submissions.
Vercel documents this for domains already on another project in the same
team, and the F0 rehearsal proves it for a `.vercel.app` name.

**B (if A is refused):** rename the projects. bird-submissions → Settings →
General → rename to `twitch-2026`; then twitch-v2 → rename to
`bird-submissions`. Each project gets `<new name>.vercel.app`; Vercel does not
guarantee the old generated URL keeps working, which is what we want here. Git
deploys follow the project ID, so nothing else changes. Check both URLs.

**C (stopgap only):** from a signed-in Vercel CLI,
`vercel alias set <twitch-v2 production deployment URL> bird-submissions.vercel.app`.
Works while the domain still belongs to v1, but every later v1 deploy takes it
back, so only with D3 in place and only until A or B is done.

**Rollback** (any time on 31 Dec / 1 Jan): move the domain back (A in
reverse, or undo the renames), delete `READ_ONLY` from bird-submissions and
redeploy, restore `NEXTAUTH_URL` if you changed it. v1's tables were never
modified. Birds added in v2 after cutover would need re-adding in v1, so decide
within the first hours.
