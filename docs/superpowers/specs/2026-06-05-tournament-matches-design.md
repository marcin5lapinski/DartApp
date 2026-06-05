# Tournament Matches View — Design Spec

**Date:** 2026-06-05  
**Status:** Approved

---

## Overview

Implement the "Mecze" tab in the tournament view. Features: match grid display, pre-match starter modal, post-match stats stored in the tournament, smart match ordering, and a live standings modal accessible during a tournament match.

---

## 1. Data Changes

### Tournament match object

Add `sets` and `stats` fields to each match entry in `tournament.matches[]`:

```js
{
  p1: 0, p2: 1,
  winner: null,          // null = unplayed; 0 = players[p1] won; 1 = players[p2] won
  legs:  [null, null],   // legs won by p1, p2
  sets:  [null, null],   // sets won by p1, p2 (null if non-set format)
  avgs:  [null, null],   // 3-dart averages
  stats: [null, null],   // full playerStats objects (same shape as match.stats[])
}
```

`generateSchedule()` initialises `sets` and `stats` as `[null, null]`.

**Tournament matches are NOT saved to `dart_history`.** Stats live exclusively in the tournament object.

---

## 2. Matches Tab — Display

### Activation

`renderTournamentViewScreen()` unlocks the "Mecze" tab. Clicking it calls `renderTournamentMatchesScreen(tournament)` and renders into the existing `screen-tournament-view`.

### Layout

Two sections rendered into a new `<div id="tv-matches">` container (hidden when "Tabela" tab is active):

- **"Do rozegrania"** — unplayed matches, sorted by wait-time heuristic (see below)
- **"Rozegrane"** — completed matches, in original schedule order

3-column CSS grid. Each cell:

```
#N              ← match number above the card
┌────────────┐
│ Gracz1  3  72.4 │  ← winner row (bold name, green score, orange avg)
│ Gracz2  1  58.2 │  ← loser row (dimmed)
└────────────┘
```

Unplayed card shows only player names (no score or avg columns).

### Match ordering (unplayed)

For each player `i`, compute `lastPlayedAt[i]` = index of their most recently completed match in the schedule (−1 if never played).

For each pending match, priority = `max(lastPlayedAt[p1], lastPlayedAt[p2])`.

Sort pending matches ascending by priority — the pair where both players have waited longest appears first.

### Clicking a completed match

Build a pseudo-match object from tournament data and call `renderStatsScreen(pseudo)` → `showScreen(SCREENS.STATS)`:

```js
const mc = tournament.config.matchConfig;
const pseudo = {
  player1: tournament.players[m.p1].name,
  player2: tournament.players[m.p2].name,
  winner:  m.winner,           // 0 → players[p1] won, maps directly
  stats:   m.stats,
  legsWon: m.legs,
  setsWon: m.sets?.[0] !== null ? m.sets : [0, 0],
  totalSets:    mc.totalSets,
  totalLegs:    mc.totalLegs,
  variant:      mc.variant,
  inMode:       mc.inMode,
  checkoutMode: mc.checkoutMode,
};
```

`pendingTournamentMatch` is set before navigating so the back button reads "Wróć do meczów" and returns to `SCREENS.TOURNAMENT_VIEW` (matches tab).

---

## 3. Starting a Tournament Match

### Modal `modal-tournament-starter`

Structure:
- `position: relative` container
- ✕ close button: `position: absolute; top: 8px; right: 8px`
- Header: "Mecz #N" title + "Player1 vs Player2 · format" subtitle
- Three option buttons: "👤 [Player1] zaczyna" / "🎲 Losuj" / "👤 [Player2] zaczyna"
  - Selected option highlighted with red border + dark red background
- START button (disabled until an option is selected; red when active)

### Flow

1. Unplayed match card clicked → populate modal with match data → open modal
2. User selects option + clicks START:
   - Resolve `startingPlayer` (0, 1, or random)
   - Set `pendingTournamentMatch = { tournamentId, matchIndex, p1Idx, p2Idx }`
   - Build match config from `tournament.config.matchConfig` + player names/favorites
   - Call `createMatch()`, clear undo stack
   - `showScreen(SCREENS.GAME)` + `renderGameScreen(match)`
3. ✕ closes modal without setting `pendingTournamentMatch`

---

## 4. After Tournament Match Ends

In `handleLegClose()`, when `matchOver && pendingTournamentMatch !== null`:

1. **Do not call** `saveMatchToHistory()`.
2. Load tournaments, find the relevant tournament and match index.
3. Write result (match.players[0] = tournament.players[p1Idx], match.players[1] = tournament.players[p2Idx]):
   ```js
   m.winner = match.winner;   // 0 = match.players[0] won = players[p1Idx] won
   m.legs   = [match.legsWon[0], match.legsWon[1]];
   m.sets   = match.totalSets > 1
                ? [match.setsWon[0], match.setsWon[1]]
                : [null, null];
   m.avgs   = [getMatchAverage(match.stats[0]),
               getMatchAverage(match.stats[1])];
   m.stats  = [match.stats[0], match.stats[1]];
   ```
4. If all matches have `winner !== null` → set `tournament.status = 'finished'`.
5. `saveTournaments()`.
6. `renderStatsScreen(match)` → `showScreen(SCREENS.STATS)`.
7. `btn-new-match` label = **"Wróć do meczów"**, click handler clears `pendingTournamentMatch` and navigates to `SCREENS.TOURNAMENT_VIEW` (re-renders matches tab).

Undo during a tournament match works without changes — `pendingTournamentMatch` is not part of the undo stack; the result is only written on `matchOver`.

---

## 5. Live Standings

### Button

`<button id="btn-live-standings">📊 Tabela live</button>` added to the game header to the right of "↩ Cofnij turę". Visible only when `pendingTournamentMatch !== null` (`display:none` otherwise). Green style (dark green background, green border/text).

### Modal `modal-live-standings`

Same structural pattern as other modals (overlay + ✕ in top-right). Header: "Tabela live" + tournament name subtitle. Dynamic table container rendered on each open.

### `computeLiveStandings(tournament, liveData)`

New function in `league.js`. Extends `computeStandings()` with in-progress match data:

```js
// liveData = { p1Idx, p2Idx, legsWon: [n, n], setsWon: [n, n] }
```

**Points for in-progress match** (set format: compare `setsWon`; leg format: compare `legsWon`):
- p1 leads → p1 gets `winPoints`, p2 gets `lossPoints`
- p2 leads → p2 gets `winPoints`, p1 gets `lossPoints`
- tied → neither player gets points

**Legs** from the in-progress match are always added to both players' leg tallies regardless of points.

Players in the current match receive a green **LIVE** badge next to their name. A note at the bottom of the modal states who is leading (or that it is tied) and that points are provisional.

Table is recomputed on every open (not cached).

---

## 6. Files Changed

| File | Changes |
|---|---|
| `js/league.js` | `generateSchedule()` adds `sets/stats: [null,null]`; new `renderTournamentMatchesScreen(tournament)`; new `computeLiveStandings(tournament, liveData)`; `renderTournamentViewScreen()` unlocks Mecze tab |
| `js/app.js` | New `pendingTournamentMatch = null`; `modal-tournament-starter` wiring; new `startTournamentMatch()`; modify `handleLegClose()` for tournament context; `btn-live-standings` + `modal-live-standings` wiring; modify `btn-new-match` label/navigation |
| `index.html` | New modals: `modal-tournament-starter`, `modal-live-standings`; `btn-live-standings` in game header; `<div id="tv-matches">` in `screen-tournament-view` |
| `css/style.css` | `.matches-grid`, `.match-cell`, `.match-card` (unplayed/played/next-up variants); starter modal styles; green live button; `.live-badge` |

**Unchanged:** `game.js`, `stats.js`, `checkouts.js`, `board.js`, `players.js`, `history.js`, `tournament.js`, `ui.js`
