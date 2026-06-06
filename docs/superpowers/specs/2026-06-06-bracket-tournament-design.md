# Bracket Tournament Format — Design Spec

**Date:** 2026-06-06  
**Status:** Approved  
**Phase:** Phase 4 (Elimination bracket, single format — group+bracket deferred)

---

## Overview

Add single-elimination bracket (drabinka) as a second tournament format alongside the existing league (round-robin). The bracket handles non-power-of-2 player counts via byes (wolne losy). The bracket view is a single scrollable column-per-round layout with left/right navigation when more than 3 rounds are present. Match cards reuse the existing league match components exactly.

Player count range: 3–10 (same as league). Bracket sizes: 4, 8, or 16 slots.

---

## Data Model

### `tournament.config` additions

```js
config: {
  format: 'bracket',       // new value; 'league' unchanged
  bracketSize: 8,          // next power of 2 >= numPlayers: 4 | 8 | 16
  matchConfig: { ... },    // unchanged: variant, totalLegs, totalSets, inMode, checkoutMode
  // leagueRounds, winPoints, lossPoints — omitted for bracket format
}
```

### Extended match object (bracket only)

```js
{
  round:   0,          // 0-based round index (0 = preliminary/R1, last = Final)
  slot:    2,          // 0-based slot within that round
  p1:      4,          // players[] index, or null (TBD — waiting for previous round result)
  p2:      null,       // null means BYE (isBye=true) or TBD (isBye=false)
  isBye:   true,       // true when p2 is null because it's a bye, not a pending result
  winner:  null,       // null | 0 (p1 won) | 1 (p2 won)
  legs:    [null,null],
  sets:    [null,null],
  avgs:    [null,null],
  stats:   [null,null],
  starter: null,
}
```

**`isBye` vs TBD distinction:** `isBye=true` → slot is a bye, p1 advances automatically (winner pre-set to 0 at generation time). `isBye=false, p1/p2=null` → slot is TBD, waiting for a previous-round result.

### Full tournament shape (bracket)

```js
{
  id, name, status: 'active'|'finished', createdAt,
  config: { numPlayers, format:'bracket', bracketSize, matchConfig },
  players: [{ name, primaryDouble, secondaryDouble }],  // seeding order
  matches: [ /* flat array, ordered by round asc, slot asc */ ]
}
```

---

## Bracket Generation Algorithm

```
B         = smallest power of 2 >= N          (bracketSize)
numByes   = B - N
numRounds = log2(B)
R1 slots  = B / 2

Bye matches (round=0, slot=0..numByes-1):
  p1 = players[slot],  p2 = null,  isBye = true,  winner = 0

Real R1 matches (round=0, slot=numByes..B/2-1):
  p1 = players[numByes + 2*(slot-numByes)]
  p2 = players[numByes + 2*(slot-numByes) + 1]
  isBye = false,  winner = null

Subsequent rounds (round=1..numRounds-1):
  For each slot j in round k:
    p1 = null (TBD),  p2 = null (TBD),  isBye = false,  winner = null
  These are filled in by advanceBracketWinner() after each match completes.

After generating all matches, call advanceBracketWinner() for every bye match
(winner already set to 0) so that subsequent round slots are pre-filled at
creation time. Example: with 6 byes, R2 slots 0–2 get p1/p2 set immediately;
only R2 slot 3 waits for real R1 results.
```

**Bye count is always achievable:** `numRealR1 = N - B/2` is always a non-negative even integer for any N in [3..10], so there is always a whole number of real R1 matches.

**Example — 10 players (B=16, 6 byes, 4 rounds):**
- R1: slots 0–5 are bye matches; slots 6–7 are 2 real matches
- R2 (QF): 4 TBD matches
- R3 (SF): 2 TBD matches
- R4 (Final): 1 TBD match

---

## Winner Advancement

After any match completes (`winner` set to 0 or 1), call `advanceBracketWinner(tournament, match)`:

```
winnerPlayerIdx = match.winner === 0 ? match.p1 : match.p2

nextRound = match.round + 1
nextSlot  = Math.floor(match.slot / 2)

target = matches.find(m => m.round === nextRound && m.slot === nextSlot)

if match.slot is even:  target.p1 = winnerPlayerIdx
if match.slot is odd:   target.p2 = winnerPlayerIdx
```

When both `target.p1` and `target.p2` are filled, the match becomes playable (unplayed, isBye=false). Save tournament after each advancement.

**Tournament completion:** when the Final match (`round === numRounds-1, slot === 0`) gets a winner, set `tournament.status = 'finished'`.

---

## Screen Changes

### `screen-tournament-view`

For `format === 'bracket'`:
- Tab bar (`tv-tabs`) hidden via CSS class `tv-bracket-mode`
- `#tv-standings` and `#tv-matches` hidden
- New container `#tv-bracket` shown

Info-bar content (bracket): `"Drabinka · N graczy · variant · First to M · played/total meczów"`

For `format === 'league'`: no change to existing behaviour.

### New rendering functions in `league.js`

```
renderBracketScreen(tournament)
  Computes numRounds, groups matches by round.
  Renders: [← button?] [viewport: 3 columns] [→ button?]
  Buttons only rendered when numRounds > 3.
  Tracks currentRoundOffset (0-based) in a closure or data attribute.

buildBracketRound(roundMatches, roundIdx, numRounds, players) → DOM element
  Column div with .bk-label (round name) + .bk-body (position:relative).
  Each match card: calls _buildMatchCell() (reused from league, unchanged).
  Bye cards: same _buildMatchCell() but with isBye flag → adds .bye-card class,
             replaces p2 row with "— wolny los —" text, no click handler.

buildBracketConnectorSvg(numMatchesPrevRound, cardH, cardGap, labelH) → SVG element
  Draws bracket connector lines between adjacent round columns.
  Width: 24px. Height: labelH + numMatchesPrevRound * cardH + (numMatchesPrevRound-1) * cardGap.
  For each pair of previous-round matches: draws ⊐-shape arm + horizontal midpoint line.

computeRoundName(roundIdx, numRounds) → string
  numRounds=2: ['Półfinał', 'Finał']
  numRounds=3: ['Ćwierćfinał', 'Półfinał', 'Finał']
  numRounds=4: ['1/8 Finału', 'Ćwierćfinał', 'Półfinał', 'Finał']
```

### Match card positions (vertical centering formula)

```
cardH = 36px,  gap = 8px  (within a round column)

For round k with M_k matches, each match j:
  topPx = centerY(k, j) - cardH/2

centerY(k, j):
  if k === 0: j * (cardH + gap) + cardH/2
  else: ( centerY(k-1, 2j) + centerY(k-1, 2j+1) ) / 2

bk-body height = M_0 * cardH + (M_0 - 1) * gap  (same for all rounds)
```

### Navigation

```
currentRoundOffset: int, starts at 0
Visible rounds: [offset, offset+1, offset+2]

← click: offset-- (disabled when offset === 0)
→ click: offset++ (disabled when offset + 3 >= numRounds)
Re-renders viewport content only (not the whole screen).
```

When `numRounds <= 3`: no navigation buttons, all rounds shown simultaneously.

---

## Match Interaction

Identical to league:

- **Unplayed real match** (isBye=false, winner=null, both p1+p2 set): clickable → opens starter modal → `startTournamentMatch()`
- **Played match** (winner !== null, isBye=false): clickable → `openTournamentMatchStats()`
- **Bye card** (isBye=true): not clickable, no event listener
- **TBD match** (p1 or p2 is null): not clickable, rendered as dimmed card

After `submitSummaryScore()` saves the match result: call `advanceBracketWinner()`, re-render bracket screen.

Live standings button: **not shown** for bracket format (no points table).

---

## Tournament Wizard Changes

### Step 2 — Format selection

Unlock the "Drabinka" format tile (remove `disabled` class and attribute).

When bracket is selected:
- Hide the rounds (single/double) and win/loss points fields
- Show a static description: `"Puchar — każdy mecz eliminuje przegranego. Zwycięzca finału wygrywa turniej."`
- `tournamentConfig.format = 'bracket'`

When league is selected: existing fields visible as before.

Steps 3 (match settings) and 4 (players, seeding): **unchanged**. Seeding order from step 4 determines bye assignment — top-seeded players receive byes.

### `createTournament()` change

When `config.format === 'bracket'`:
- Call `generateBracket()` instead of `generateSchedule()`
- Store `config.bracketSize`

---

## Tournament List Card

`buildTournamentCard()` update for bracket:
- Meta line: `"Drabinka · N graczy · variant · First to M"`
- Winner detection: find the match with `round === numRounds-1 && winner !== null` → `players[winner===0 ? m.p1 : m.p2].name`
- Progress: count matches where `winner !== null && !isBye` out of total non-bye matches

---

## Edge Cases

| Situation | Behaviour |
|---|---|
| 3 players (B=4, 1 bye, 2 rounds) | R1: 1 bye + 1 real match. Final between bye winner and real match winner. No nav buttons. |
| 8 players (B=8, 0 byes, 3 rounds) | QF + SF + Final. No nav buttons. |
| 9 players (B=16, 7 byes, 4 rounds) | 1/8 + QF + SF + Final. Nav buttons appear. |
| 10 players (B=16, 6 byes, 4 rounds) | Same as above, 2 real R1 matches instead of 1. |
| Restoring from localStorage | `pendingTournamentMatch` flow unchanged; bracket context restored identically to league. |
| Tournament already finished | Bracket rendered read-only (same as league — no modal on click of unplayed, all played). |

---

## Files Touched

| File | Change |
|---|---|
| `js/league.js` | `generateBracket()`, `advanceBracketWinner()`, `renderBracketScreen()`, `buildBracketRound()`, `buildBracketConnectorSvg()`, `computeRoundName()`; update `renderTournamentViewScreen()`, `buildTournamentCard()` |
| `js/tournament.js` | Step 2: unlock bracket tile, toggle fields; `createTournament()` branch |
| `js/app.js` | After match result saved: call `advanceBracketWinner()` when `format==='bracket'`; skip live standings button |
| `index.html` | Add `#tv-bracket` container; bracket CSS class on tab bar |
| `css/style.css` | `.bk-*` bracket layout styles, `.bye-card`, `.tv-bracket-mode` |
