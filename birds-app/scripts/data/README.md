# scripts/data

Inputs and outputs for the one-off maintenance scripts in `scripts/`.

| File | Written by | Read by | Committed? |
|------|-----------|---------|------------|
| `hyphen-group-mapping.json` | `audit-hyphen-groups.ts` | `normalize-group-names.ts --mapping=hyphen-group-mapping.json` | yes |
| `overrides.json` | hand-edited | `backfill-form-emails.ts --overrides=scripts/data/overrides.json` | yes |
| `form-responses-backup-*.json` | `backfill-form-emails.ts` | restore by hand | no (gitignored, contains emails) |
| `joker-recalc-diff.csv` | `recalc-all-jokers.ts` | you | no (gitignored, contains emails) |
