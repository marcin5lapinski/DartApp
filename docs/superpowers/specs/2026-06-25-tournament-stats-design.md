# Tournament Player Stats — Design Spec

**Date:** 2026-06-25
**Feature:** Per-player aggregated stats for tournaments

---

## Goal

Add a stats icon to the tournament view info bar. Clicking it opens a modal listing all tournament players with expandable stat rows — available at any point during or after a tournament.

---

## Data Aggregation

### Function: `computeTournamentPlayerStats(tournament)`

Location: `league.js`

Iterates `tournament.matches` and collects stats per player. Only counts matches where `winner !== null && !m.isBye`. A player appears in a match as `p1` or `p2` — their stats object is `m.stats[0]` (for p1) or `m.stats[1]` (for p2).

Returns an array of stat objects, one per player, in `tournament.players` seeding order:

```js
{
  name: string,
  matchCount: number,       // played matches only
  avg3: number,             // arithmetic mean of getMatchAverage(stats) per match
  first9Avg: number,        // arithmetic mean of getFirst9Average(stats) per match
  legsWon: number,          // sum of stats.legsWon
  highestCheckout: number,  // Math.max of stats.highestCheckout
  fastestLeg: number|null,  // Math.min of stats.fastestLeg (skip nulls); null if none won
  doubleAttempts: number,   // sum of stats.doubleAttempts
  doubleHits: number,       // sum of stats.doubleHits
}
```

**Average computation:** arithmetic mean (not weighted) — user explicitly requested "average of averages". A player with 0 played matches gets `avg3: 0`, `first9Avg: 0`.

**Why arithmetic mean:** Treats all matches equally regardless of length (sets/legs count). Consistent with how the user described the requirement.

---

## HTML

New modal in `index.html` — empty container, content built dynamically:

```html
<div id="modal-tournament-stats" class="modal-overlay" style="display:none">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Statystyki turnieju</h3>
      <button class="modal-close" onclick="closeModal('modal-tournament-stats')">✕</button>
    </div>
    <div id="ts-player-list"></div>
  </div>
</div>
```

---

## JavaScript

### `openTournamentStatsModal(tournament)` in `league.js`

1. Calls `computeTournamentPlayerStats(tournament)`
2. Populates `#ts-player-list` with player rows
3. Each row: clickable header (name + chevron `▶`/`▼`) + hidden stats body
4. Toggle: click on header toggles `.ts-expanded` on the row, shows/hides `.ts-stats-body`
5. Calls `openModal('modal-tournament-stats')`

**Stats table rows** (same structure as `.stats-table` in `ui.js`):

| Row | Condition |
|---|---|
| Mecze rozegrane | always |
| Legi wygrane | always |
| Średnia 3-lotek | matchCount > 0 |
| Średnia pierwszych 9 | matchCount > 0 |
| Najwyższe zamknięcie | highestCheckout > 0 |
| Najszybszy leg | fastestLeg !== null |
| Trafione double | doubleAttempts > 0 |

Players with `matchCount === 0` show: "Brak rozegranych meczów" instead of the table.

### Modifying `_appendFmtSettingsBtn` → `_appendInfoBarBtns`

Rename to `_appendInfoBarBtns(isActive, tournament)`. Appends:
1. `#btn-tv-stats` — 📊 button, always appended (active and finished tournaments)
2. `#btn-tv-format-settings` — ⚙ button, only when `isActive === true`

Update all call sites:
- `renderTournamentViewScreen` (liga, bracket, groups) — pass `tournament`
- `_saveFormatEdit` — pass `_activeTournament`

---

## CSS

New rules in `style.css`:

```css
/* Stats button in info bar — mirrors .btn-fmt-settings but offset left of it */
.btn-stats {
  position: absolute;
  right: 44px;   /* 12px margin + 24px gear button + 8px gap */
  top: 50%;
  transform: translateY(-50%);
  /* same sizing/color/border as .btn-fmt-settings */
}

/* Player accordion row */
.ts-player-row { border-bottom: 1px solid var(--border); }
.ts-player-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; cursor: pointer;
  font-size: 0.95rem; font-weight: 500;
  -webkit-tap-highlight-color: transparent;
}
.ts-player-header:active { background: #222; }
.ts-chevron { color: var(--text-muted); transition: transform 0.2s; }
.ts-player-row.ts-expanded .ts-chevron { transform: rotate(90deg); }

.ts-stats-body {
  display: none;
  padding: 0 16px 12px;
  background: #111;
}
.ts-player-row.ts-expanded .ts-stats-body { display: block; }

.ts-no-matches {
  color: var(--text-muted); font-size: 0.85rem;
  padding: 8px 0;
}
```

---

## Files Changed

| File | Change |
|---|---|
| `js/league.js` | Add `computeTournamentPlayerStats`, `openTournamentStatsModal`; rename `_appendFmtSettingsBtn` → `_appendInfoBarBtns` |
| `index.html` | Add `#modal-tournament-stats` |
| `css/style.css` | Add `.btn-stats`, `.ts-player-row/header/stats-body` |

No changes to `app.js`, `stats.js`, `game.js`, `tournament.js`, `history.js`.

---

## Non-goals

- No persistent storage of aggregated stats
- No sorting of players by any stat in the modal (seeding order only)
- No comparison view between players
