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

- [ ] Done

### A2. Neon API key and GitHub secrets (nightly refresh and CI end-to-end tests)
1. Neon console → profile (top right) → **Account settings** → **API keys** → **Create new API key**, named `github-v2-staging`. Copy it.
2. GitHub → `lukalacious/bird_submissions` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, twice:
   - `NEON_API_KEY` = that key
   - `V2_STAGING_DATABASE_URL` = `DIRECT_DATABASE_URL` from `birds-v2/.env` (the one **without** `-pooler`)

- [ ] Both secrets added

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
Vercel → **bird-submissions** → Settings → Environment Variables. Copy
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` into **twitch-v2**
(Production and Preview). Reusing v1's keys means phones that already allow
reminders keep working after the switch.

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
- [ ] **Me** → *My birds* → take a photo of any bird → it uploads with a progress bar
- [ ] **Me** → turn **Reminders** on. On iPhone, add the site to your Home Screen first.
- [ ] Put it on your Home Screen (Today shows how) and open it like an app
- [ ] **Flock**: leaderboard numbers match the live app
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
5. **Photo jokers.** Photos can go on any bird. Only designated photo birds earn jokers? *(Yes; admins award them on Admin → Photos.)*
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

Before 29 Dec, **ask Claude to prepare**: (1) a v1 read-only switch (banner, and
submissions turned off), (2) removal of v1's crons, (3) the production
connection strings for twitch-v2. Each is a small, reviewed change.

| When (SAST) | Step | Who |
|---|---|---|
| 29 Dec | Dale signs off the rules; set them in Admin → Settings on staging | you + Dale |
| 29 Dec | Final rehearsal: run the refresh (B1), check the report is identical | you |
| 31 Dec 18:00 | Tell players: "New Twitch from midnight. Same Google sign-in, no more Google Form." | you |
| 31 Dec 22:00 | Turn on v1 read-only; v1 crons are already removed | Claude-prepared, you deploy |
| 31 Dec 22:05 | Neon: create branch `pre-v2-cutover` from production (instant backup) | you |
| 31 Dec 22:10 | Run the migration on production: dry run, check the report, then `--apply` (exact command in Claude's prep) | you + Claude |
| 31 Dec 22:30 | Point twitch-v2 at production (env vars), redeploy | you |
| 31 Dec 22:40 | Alias `bird-submissions.vercel.app` to the twitch-v2 deployment; v1 stays at its own deployment URL as a read-only record. *Not yet verified that a vercel.app alias can move between projects; Claude tests this during prep, with a fallback plan.* | you |
| 31 Dec 22:45 | Smoke test: sign in, Today shows December, Flock leaderboard right | you |
| 1 Jan 00:00 | 2027 opens on v2 | — |
| 3 Jan 02:15 | v2 closes December (after the 48h grace); check Admin → Overview and the jokers ledger | you |
| 7 Feb | First in-app check-in closes (January's) | — |

**Rollback** (any time on 31 Dec / 1 Jan): alias the domain back to the v1
deployment and turn v1 read-only off. v1's tables were never modified. Birds
added in v2 after cutover would need re-adding in v1, so decide within the
first hours.
