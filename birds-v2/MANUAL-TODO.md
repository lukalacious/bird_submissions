# Twitch v2: your manual to-dos

These are things only you can do: they need your Google/Vercel/GitHub logins,
a conversation with Dale, or a decision. Claude keeps this file up to date as
the build moves. Tick items off as you go.

Staging site: https://twitch-v2-seven.vercel.app
Launch: 1 January 2027

---

## Do now (blocks testing)

### 1. Let Google sign-in work on the staging site
Without this, "Continue with Google" on staging fails with `redirect_uri_mismatch`.

1. Open https://console.cloud.google.com/apis/credentials (same Google account that owns the v1 app).
2. Under **OAuth 2.0 Client IDs**, open the client v1 uses (its ID matches `GOOGLE_CLIENT_ID` in `birds-app/.env`).
3. Under **Authorized redirect URIs**, click **Add URI** and paste:
   `https://twitch-v2-seven.vercel.app/api/auth/callback/google`
4. Click **Save**. It can take a few minutes to start working.

- [ ] Done

### 2. Add a Neon API key to GitHub (for the nightly staging refresh)
Every night a GitHub Action resets the staging database to a fresh copy of
production and re-runs the v1 → v2 migration. It needs these secrets:

1. Neon console → your profile (top right) → **Account settings** → **API keys** → **Create new API key**. Name it `github-v2-staging`. Copy it.
2. GitHub → `lukalacious/bird_submissions` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `NEON_API_KEY` = the key you just copied
   - `V2_STAGING_DATABASE_URL` = the `DIRECT_DATABASE_URL` value from `birds-v2/.env` (the one **without** `-pooler`)
3. GitHub → **Actions** → **Nightly v2 staging refresh** → **Run workflow** once by hand to check it goes green.

- [ ] API key created
- [ ] Both secrets added
- [ ] First manual run passed

### 3. Sign in to staging once and look around
After 1: open the staging site on your phone and sign in. You land straight on
Today (existing players are never asked "are you X?"). Your migrated v1 data is
already there: you have 0 birds in October in v1 too, so expect an empty tally
and a "Twitch your first bird" button. Then open **Me** and check your Google
account is listed.

- [ ] Signed in on phone
- [ ] Numbers match the live app

---

## This week: ask Dale

Send Dale these questions. The recommendation is in brackets. Reply with his
answers in a Claude session and they get built in.

1. **Hyphenated group names.** 131 birds are split across names like
   "Wood-Pigeon" vs "Pigeon", so players miss group jokers. Merge each family
   under one name? *(Yes: announce before 1 Jan.)* Also: one spelling for Bush-shrike.
2. **Half jokers.** 0.5 + 0.5 jokers from two different months show as "1
   available" but can't be spent today. Let halves combine? *(Yes, oldest first.)*
3. **Inactive players.** About 8 players survive only because a joker is spent
   automatically each empty month. Keep that, or eliminate after N empty
   months? *(Eliminate after 2 empty months in a row.)*
4. **Deadlines.** Monthly check-in closes on the 7th of the next month? Players
   can fix wrong birds for 48 hours after month-end before needing an admin?
   *(Yes and yes.)*
5. **Photo jokers.** v2 lets people add a photo to any bird. Do only the
   designated photo birds earn jokers? *(Yes. Other photos are for the gallery.)*

The migration rehearsal on 25 Oct turned up three smaller questions for Dale:

6. **"Glossy Starling"** was July's golden bird, but several regions list
   different glossy starlings. Which species did he mean?
7. **Same bird twice.** Three 2026 entries repeat a species the player already
   had: Dale's own Southern Black Flycatcher and African Paradise Flycatcher
   (March and April), and Colin's Black-headed Gull (January and March). v2
   keeps them so 2026 totals don't change, but from 2027 the app blocks repeats.
   OK? *(Yes.)*
8. **Messy group names** like "(Leaflove)", "Malkoha)" and "Seed-cracker" vs
   "Seedcracker" come from the spreadsheet. Fine to tidy them along with the
   hyphen merge? *(Yes. Group changes apply from 2027 only, so 2026 jokers stay
   exactly as they are either way.)*

- [ ] Sent to Dale
- [ ] Answers given to Claude

---

## Before December beta (by 1 Dec)

### 4. Create a photo store for v2
Vercel dashboard → **Storage** → **Create** → **Blob** → name `twitch-v2-photos`
→ connect it to the **twitch-v2** project (Production + Preview). This adds
`BLOB_READ_WRITE_TOKEN` automatically.

- [ ] Done

### 5. Push notification keys for v2
Reuse v1's keys: copy `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from the **bird-submissions** Vercel project's env
vars into **twitch-v2** (Settings → Environment Variables). Existing phone
subscriptions then keep working after cutover.

- [ ] Done

### 6. Line up 5–8 beta testers
Mix of regions and ages, at least two on iPhone and two on Android. The beta
runs 15–28 December on the staging site. Testers sign in with their usual
Google account.

- [ ] Testers confirmed

---

## Review (no rush, before cutover)

### 7. Unexplained "used jokers" in early 2026
17 players have used jokers on record with no matching joker entries, mostly
January to March. For example, one player shows 7 used in February with none
recorded. This looks like jokers spent before v1 started logging them. v2 keeps
every balance exactly as v1 has it, so nothing changes for players. You only
need to confirm that this matches what you remember. The full list is in each
night's migration report (GitHub → Actions → Nightly v2 staging refresh →
latest run → summary).

- [ ] Looks right / tell Claude what's off

## Housekeeping (when convenient)

- [ ] **Uncommitted v1 changes.** `birds-app/package.json` and
  `package-lock.json` had uncommitted changes before this work started. Commit
  them or discard them. Claude hasn't touched them.
- [ ] **Move the project out of iCloud** *(do this soon)*. `~/Documents` is
  synced by iCloud. It leaves "file 2.ts" / "file 3.ts" conflict copies in
  folders the build rewrites, and on 25 Oct it hung a build for 5 minutes. v2
  now builds into `.next.nosync` (iCloud skips that name) and ignores the
  copies, but moving the repo is the real fix. Between sessions:
  1. Quit Claude Code and your editor.
  2. `mv ~/Documents/code ~/code`
  3. Update the project paths in `~/.claude/CLAUDE.md` (Birds App, Data Science).
  4. Claude's memory for this project is keyed by path. Copy
     `~/.claude/projects/-Users-lukeroberts-Documents-code-projects-birds/` to
     `~/.claude/projects/-Users-lukeroberts-code-projects-birds/`.
- [ ] **Delete leftover build junk** (safe, all regenerated). From `birds-v2/` run
  `rm -rf birds-v2 .next src/generated && npm install`. The nested
  `birds-v2/birds-v2/` and old `.next/` predate the fixes.
- [ ] **Stop v1 rebuilding on v2 commits** *(optional)*. Vercel →
  **bird-submissions** → Settings → Git → **Ignored Build Step** → custom command
  `git diff --quiet HEAD^ HEAD -- .`. Right now every v2 commit also redeploys v1
  (harmless but noisy).

---

## Cutover week (29 Dec – 1 Jan), filled in nearer the time

- Final rules sign-off from Dale (29 Dec)
- Announce the switch to players: new look, same Google sign-in, no more Google Form
- Domain switch on 31 Dec. Claude will prepare a step-by-step runbook here.
- **Turn off v1's crons at cutover** (elimination, form jokers, reminders), so
  v1 can't close December as well. v2 closes December itself on 3 January,
  after the grace window.
