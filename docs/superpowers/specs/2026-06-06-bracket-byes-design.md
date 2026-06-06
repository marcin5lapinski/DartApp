# Bracket Byes — Even Distribution Design

**Date:** 2026-06-06

## Problem

Current `generateBracket` places all byes at the top of the bracket (slots 0..numByes-1), causing the top section to contain only bye-players while the bottom section has none. This creates an unbalanced bracket.

## Solution

Two coordinated changes:

1. **Wizard step 4** — per-player BYE toggle buttons with pre-suggested positions and count validation.
2. **`generateBracket`** — interleaving algorithm that always distributes byes evenly regardless of which specific players have byes.

---

## Algorithm

### Interleaving formula

Given `N` players, `B = nextPowerOf2(N)`, `r1Slots = B/2`, `numReal = N − r1Slots`:

Real-match slots are at positions: `floor(i * r1Slots / numReal)` for `i = 0..numReal-1`

All other R1 slots are bye slots. Each real slot consumes 2 players; each bye slot consumes 1 player.

### Suggestion table (N = 3–10)

| N  | B  | numByes | BYE positions (1-indexed) |
|----|----|---------|--------------------------|
| 3  | 4  | 1       | 3                        |
| 5  | 8  | 3       | 3, 4, 5                  |
| 6  | 8  | 2       | 3, 6                     |
| 7  | 8  | 1       | 7                        |
| 9  | 16 | 7       | 3–9                      |
| 10 | 16 | 6       | 3, 4, 5, 8, 9, 10        |

N=4 and N=8 are powers of 2 — no byes, toggles disabled.

### `_computeByeSuggestion(numPlayers)` (new, `tournament.js`)

Returns a boolean array of length `numPlayers`. For `numByes === 0`, returns all `false`.

```
realSlotSet = { floor(i * r1Slots / numReal) | i = 0..numReal-1 }
Walk slots 0..r1Slots-1:
  real slot → push false, false
  bye slot  → push true
```

### `generateBracket(players)` (updated, `league.js`)

New signature: `(players)` instead of `(numPlayers, players)`.

```
byePlayers  = players (with origIdx) where p.bye === true,  in order
realPlayers = players (with origIdx) where p.bye !== true,  in order

Walk slots 0..r1Slots-1 using the same realSlotSet:
  real slot → consume realPlayers[realPtr], realPlayers[realPtr+1] → real match
  bye slot  → consume byePlayers[byePtr]                           → isBye match
```

The result always has evenly distributed byes — even if the user manually changed which players have byes.

---

## Data Flow

```
renderStep4Players()
  → _computeByeSuggestion(N) → pre-check BYE toggles

User clicks "UTWÓRZ TURNIEJ"
  → _getStep4Values()           includes bye: bool per player
  → Fisher-Yates shuffle        bye travels with player
  → createTournament(config, players)
      → generateBracket(players) uses p.bye flags
      → strip bye from players before storing in tournament.players
```

---

## UI Changes (wizard step 4)

### BYE toggle button

Each player block gets a toggle button in the top-right corner (next to the drag handle):

- **Inactive:** `BYE` — dark background, muted border, grey text
- **Active:** `BYE ✓` — dark red background, red border, red text; player block border turns red

CSS classes: `.bye-toggle` (base), `.bye-toggle.active` (active state), `.bye-toggle.disabled-bye` (when numByes === 0).

### Bye counter (bracket format only)

A bar above the player list showing current count vs required:

- **Green:** `Wolne losy: X / X ✓` — count matches exactly
- **Red:** `Wolne losy: Y / X — zaznacz dokładnie X` — count mismatch

### Validation (`validateStep4`)

For bracket format: button disabled unless `byeCount === numByes` **and** all names filled **and** no duplicates.

For league format or N ∈ {4, 8}: bye logic skipped entirely.

### Note below seeding controls

Small info line: `ℹ️ Wolny los = gracz zaczyna od [rundaNazwa]. Sugestia rozłożona równomiernie.` where `rundaNazwa` is computed from `computeRoundName(1, numRounds)` (i.e. the second round).

---

## Edge Cases

| Case | Behaviour |
|------|-----------|
| N = 4 or 8 (power of 2) | All toggles rendered disabled, counter hidden, no bye validation |
| Liga format | BYE toggles not rendered at all |
| Drag & drop | `bye` included in `_getStep4Values()`, preserved by `renderStep4Players(savedValues)` |
| Random seeding | Fisher-Yates runs after reading bye flags; bye follows player through shuffle |
| Back to step 3 then forward | `renderStep4Players()` called without savedValues — resets to suggestion (consistent with name/doubles reset) |
| User sets wrong distribution | `generateBracket` corrects distribution automatically; only count is validated |

---

## Files Changed

| File | Change |
|------|--------|
| `js/tournament.js` | Add `_computeByeSuggestion()`; update `renderStep4Players()` to render BYE toggles and counter; update `_getStep4Values()` to include `bye`; update `validateStep4()` for bye count check |
| `js/league.js` | Rewrite `generateBracket(players)` with new signature and interleaving algorithm; update `createTournament()` call site and strip `bye` before storing |
| `css/style.css` | Add `.bye-toggle`, `.bye-toggle.active`, `.bye-toggle.disabled-bye`, `.bye-counter`, `.bye-counter.ok`, `.bye-counter.warn` |
| `index.html` | No structural changes needed — BYE toggles and counter are dynamically rendered |
