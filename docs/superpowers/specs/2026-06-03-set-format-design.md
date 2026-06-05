# Set Format Design

**Date:** 2026-06-03
**Status:** Approved

## Summary

Add a set-based match format to the existing X01 dart app. A match consists of N sets; each set consists of M legs. The player who wins M legs wins the set; the player who wins N sets wins the match. When `totalSets === 1`, behavior is identical to the current legs-only mode.

## Data Model

New fields added to the match object in `createMatch()`:

```js
totalSets: config.totalSets || 1,
currentSet: 1,
setsWon: [0, 0],
legsWonInSet: [0, 0],        // reset to [0,0] at the start of each new set
setStartingPlayer: config.startingPlayer ?? 0,  // alternates between sets
```

Existing fields:
- `totalLegs` — reused as **legs per set** (e.g. `totalLegs: 3` = "first to 3 legs per set")
- `legsWon: [0, 0]` — becomes **total legs won across the whole match** (never reset); used for stats only

**Backwards compatibility:** saved matches in localStorage lack `totalSets` → `|| 1` gives 1 set → identical behavior to before.

## Game Logic (`game.js` — `finalizeLeg`)

After a leg is won by `winnerIndex`:

```
1. legsWonInSet[winner] += 1
2. legsWon[winner] += 1            (cumulative, for stats)
3. if legsWonInSet[winner] >= totalLegs:
     // set won
     4. setsWon[winner] += 1
     5. if setsWon[winner] >= totalSets:
          matchOver = true, winner = winner
          return { legOver: true, matchOver: true }
        else:
          // new set
          currentSet += 1
          legsWonInSet = [0, 0]
          setStartingPlayer = 1 - setStartingPlayer
          legStartingPlayer = setStartingPlayer
          currentLeg += 1
          reset both playerStates
          return { legOver: true, matchOver: false, setOver: true }
   else:
     // new leg in same set — existing alternation logic unchanged
     return { legOver: true, matchOver: false, setOver: false }
```

`finalizeLeg` return value gains an optional `setOver` boolean flag so `handleLegClose` in `app.js` can show the correct dialog message.

## Dialog Messages (`app.js` — `handleLegClose`)

| Condition | Message |
|---|---|
| leg won, set continues | `"Gracz X wygrał leg N!"` (unchanged) |
| set won, match continues | `"Gracz X wygrał set N!"` (new) |
| match over | `"Gracz X wygrał mecz!"` (unchanged) |

## Setup Screen (`index.html` + `app.js`)

- Add `<select id="sel-sets">` with options 1–10, default 1, placed **above** `sel-legs` inside a shared `form-row` alongside it.
- Option label for value 1: `"1 set (bez setów)"`, others: `"2 sety"` … `"10 setów"`.
- The `<label>` for `sel-legs` changes dynamically via JS: `"Liczba legów"` when `sel-sets = 1`, `"Legi na seta"` when `sel-sets > 1`.
- `startMatch()` reads `totalSets` from `sel-sets` and passes it to `createMatch()`.

## Game Screen (`ui.js` — `renderGameScreen`)

**Leg indicator** (`#leg-indicator`):
- `totalSets === 1`: `"Leg 3 (First to 5)"` — unchanged
- `totalSets > 1`: `"Set 2 | Leg 1 (First to 3)"`

**Match score** (`#ms-result`):
- `totalSets === 1`: `legsWon[0] : legsWon[1]` — unchanged
- `totalSets > 1`: single line in format `(setsWon[0]) legsWonInSet[0]:legsWonInSet[1] (setsWon[1])`
  - Center number pair = legs won in the current set
  - Numbers in parentheses = sets won by each player
  - Example: `(3) 2:1 (1)` — left player has 3 sets, right player has 1 set, current set is 2–1 in legs

## Stats Screen (`ui.js` — `renderStatsScreen`)

- When `totalSets > 1`: add a `"Sety wygrane"` row above the existing `"Legi wygrane"` row.
- `"Legi wygrane"` continues to show cumulative `legsWon` across the whole match.

## History (`history.js`)

- `saveMatchToHistory` adds `totalSets` and `setsWon` to the stored record.
- `renderHistoryScreen` / `renderHistoryDetailScreen`: show `"3 sety × 3 legi"` format when `totalSets > 1`, or existing `"First to N"` format when `totalSets === 1`.

## Out of Scope

- More than 2 players
- Tiebreak legs (sudden death)
- Per-set stats breakdown
