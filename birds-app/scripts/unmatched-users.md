# Unmatched / Ambiguous Form Entries

These entries from "Form Responses 1" could not be confidently matched to a database user. Please fill in the correct email address for each, then add them to `scripts/overrides.json`.

| Row | Form Name | Matched To | Issue | Correct Email |
|-----|-----------|------------|-------|---------------|
| 17 | William and Annette | william.jackson@example.com | First-name match only — joint entry for two people? | |
| 18 | William & Annette | william.jackson@example.com | First-name match only — same as above, different separator | |
| 19 | Ant P | — | No match found — possibly a nickname (Anthony?) | |

## How to apply once resolved

Create `scripts/overrides.json`:
```json
{
  "William and Annette": "actual@email.com",
  "William & Annette": "actual@email.com",
  "Ant P": "actual@email.com"
}
```

Then run:
```bash
npx tsx scripts/backfill-form-emails.ts --apply --overrides=scripts/overrides.json
```
