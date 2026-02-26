# Joker Math Logic

Joker-earning rules for the Twitch Bird-A-Day Challenge. Each rule maps to a question in the monthly Google Form submission.

> **Google Form:** configured in Admin Settings → Google Form embed URL
> **Google Sheet (responses):** https://docs.google.com/spreadsheets/d/1q1jQRbQlQoFMwCmkRgabg-CjiQTrKSteyKcPS-tC3mI/edit?gid=1953517996

---

## Joker Rules

### 1. 15km Radius Bonus

| | |
|---|---|
| **Form Question** | "All birds recorded within 15km radius of primary residence? (5 Jokers)" |
| **Form Column** | Q2 |
| **Answer Type** | Yes / No |
| **Formula** | Yes = **+5 jokers**, No = **0 jokers** |

All birds for the period must be within 15km of primary residence to qualify. It's all-or-nothing.

---

### 2. 750km Penalty

| | |
|---|---|
| **Form Question** | "1 or more birds recorded > 750km radius of primary residence? (-3 Jokers)" |
| **Form Column** | Q3 |
| **Answer Type** | Yes / No |
| **Formula** | Yes = **-3 jokers**, No = **0 jokers** |

If any bird was recorded more than 750km from primary residence, a 3-joker penalty applies. **Joker balance can go negative.**

---

### 3. Non-Motorised Vehicle Bonus

| | |
|---|---|
| **Form Question** | "How many birds did you record without the use of a motorised vehicle? (1 Joker/10 birds)" |
| **Form Column** | Q18 |
| **Answer Type** | Number |
| **Formula** | See tiers below |

| Birds (non-motorised) | Jokers |
|----------------------|--------|
| 0–9 | 0 |
| 10–19 | 1 |
| 20–29 | 2 |
| 30+ | **3 (max)** |

Formula: `min(floor(count / 10), 3)`

> **Note:** Q4 ("How many birds were recorded without using any motorised/electric vehicle from your residence?") is a duplicate of this question and is not used in the calculation.

---

### 4. Golden Birds (Birdle App)

| | |
|---|---|
| **Form Question** | "How Many 'Golden Birds' Did You List? (1 Joker Each)" |
| **Form Column** | Q15 |
| **Answer Type** | Number |
| **Formula** | `min(count, 5)` — 1 joker per golden bird, **max 5** |

Golden birds are earned through the Birdle app.

---

### 5. Lifers

| | |
|---|---|
| **Form Question** | "How Many Lifers Did You List? (1 Jokers each (Max 5))" |
| **Form Column** | Q16 |
| **Answer Type** | Number |
| **Formula** | `min(count, 5)` — 1 joker per lifer, **max 5** |

A lifer is a bird species seen for the first time ever.

---

### 6. Photographed Birds

| | |
|---|---|
| **Form Question** | "How Many Birds Did You Photograph? (1 Jokers each)" |
| **Form Column** | Q17 |
| **Answer Type** | Number |
| **Formula** | `min(count, 3)` — 1 joker per photographed bird, **max 3** |

---

## Total Joker Calculation

```
total_jokers =
    (15km_bonus)                          # +5 or 0
  + (750km_penalty)                       # -3 or 0
  + min(floor(non_motorised / 10), 3)     # 0 to 3
  + min(golden_birds, 5)                  # 0 to 5
  + min(lifers, 5)                        # 0 to 5
  + min(photographed, 3)                  # 0 to 3
```

| | Jokers |
|---|---|
| **Theoretical max** | 5 + 0 + 3 + 5 + 5 + 3 = **21** |
| **Theoretical min** | 0 + (-3) + 0 + 0 + 0 + 0 = **-3** |

**The total can be negative** (due to the 750km penalty).

---

## Example Scenario

A player submits their monthly form:
- All birds within 15km? **Yes** → +5
- Any birds >750km? **No** → 0
- Non-motorised birds: **23** → floor(23/10) = 2, capped at 3 → +2
- Golden birds: **2** → min(2, 5) → +2
- Lifers: **1** → min(1, 5) → +1
- Photographed: **4** → min(4, 3) → +3

**Total: 5 + 0 + 2 + 2 + 1 + 3 = 13 jokers**

---

## Excluded Form Questions

These form questions exist but do not contribute to joker calculations:

| Form Question | Reason |
|---|---|
| "Primary Location for the week" (Q1) | Informational only |
| "How many birds were recorded without using any motorised/electric vehicle from your residence?" (Q4) | Duplicate of Q18 |
| "How Many 'X of a Kind' Did you list?" (Q5–Q14, covering 3 through 12 of a kind) | Skipped for now — existing app auto-calculates group jokers separately |
| "Upload Your Photos" | File upload, no joker impact |
| Column 21 | Empty/unused column |

---

*Last updated: 2026-02-26*
