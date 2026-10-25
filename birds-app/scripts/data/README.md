# scripts/data

Inputs and outputs for the one-off maintenance scripts in `scripts/`.

| File | Written by | Read by | Committed? |
|------|-----------|---------|------------|
| `group-name-mapping.json` | `audit-group-names.ts` | `normalize-group-names.ts` | yes (bird data only) |
| `hyphen-group-mapping.json` | `audit-hyphen-groups.ts` | `normalize-group-names.ts --mapping=hyphen-group-mapping.json` | yes |
| `overrides.json` | hand-edited | `backfill-form-emails.ts --overrides=scripts/data/overrides.json` | yes |
| `unmatched-users.md` | `backfill-form-emails.ts` run, July 2026 | you | yes |
| `form-responses-backup-*.json` | `backfill-form-emails.ts`, `fix-colin-sheet-email.ts` | restore by hand | no (gitignored, contains emails) |
| `joker-recalc-diff.csv` | `recalc-all-jokers.ts` | you | no (gitignored, contains emails) |
