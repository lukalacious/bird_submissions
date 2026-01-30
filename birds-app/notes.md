# Twitch App Notes

## UI Ideas
- In the bottom navigation bar swap "twitch" and "Community". Bolden "Twitch" to make it stick out. Think of instagram and how they have done this.

## Follow-ups
- Do i need to add a CRON_SECRET for production and development?

## Test CRON

```bash
# This should return 401 Unauthorized
curl -X POST https://your-app.vercel.app/api/cron/elimination-check

# This should work (replace with your actual secret)
curl -X POST https://your-app.vercel.app/api/cron/elimination-check \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE"
```

---

## Development Protocol - ALWAYS FOLLOW

### The Golden Rule
**All feature development happens LOCALLY first, then deploys to production.**

### Workflow
1. **Develop locally** (`npm run dev`)
2. **Test thoroughly** on localhost:3000
3. **Commit all changes** (`git add . && git commit`)
4. **Push to main** (`git push`)
5. **Vercel auto-deploys** to production

### Why This Matters
- Local dev and production should ALWAYS have the same code
- The only valid mismatch: local has NEW code not yet pushed
- If production has something local doesn't → something went wrong

### Preventing Mismatches
- Never edit code directly in production/Vercel
- Never use `git push --force` to overwrite history
- Always check `git status` before assuming code is deployed
- Run `git diff HEAD` to see uncommitted changes

### Debugging Mismatches
1. Run `git status` - are there uncommitted changes?
2. Run `git log -1` - what's the latest local commit?
3. Check Vercel dashboard - what commit is deployed?
4. If commits match but behavior differs → clear `.next` cache

---

## Incident Log

### January 30, 2026 - Bird Card Layout Mismatch
**Issue:** Bird cards appeared different between local dev and production
**Investigation:** No uncommitted changes to community-view.tsx found
**Root Cause:** TBD - needs further investigation
**Resolution:** TBD
**Prevention:** Follow development protocol above

### January 30, 2026 - Joker Same-Month Usage Bug
**Issue:** Users could earn jokers and use them immediately in the same month
**Root Cause:** `useJokerForImmunity()` checked `availableJokers` (includes current month) instead of only previous months
**Resolution:** Added `getAvailableJokersFromPreviousMonths()` function and updated all joker usage checks
**Prevention:** Always verify business rules match implementation when adding game mechanics
