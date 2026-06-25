# Tournament Records — Design Spec

**Date:** 2026-06-25
**Feature:** Per-tournament records modal with a 👑 button in the info bar

---

## Goal

Add a 👑 crown icon button to the tournament view info bar. Clicking it opens a modal showing the 6 best-ever values achieved in that tournament, with the name(s) of the player(s) who set each record.

---

## Data Aggregation

### Function: `computeTournamentRecords(tournament)`

Location: `league.js`

Iterates `tournament.matches`. Only counts matches where `winner !== null && !m.isBye`. For each played match, checks both sides (`m.stats[0]` = p1, `m.stats[1]` = p2).

Returns an object with 6 record entries. Each entry is `{ value: number|null, players: string[] }`:

```js
{
  matchAvg:      { value: number|null, players: string[] },
  legAvg:        { value: number|null, players: string[] },
  first9Avg:     { value: number|null, players: string[] },
  fastestLeg:    { value: number|null, players: string[] },  // min darts
  highestCheckout: { value: number|null, players: string[] },
  doublePercent: { value: number|null, players: Array<{ name, hits, attempts }> },
}
```

**`doublePercent` is special:** players hold `{ name, hits, attempts }` instead of plain strings, so the UI can render `"75.0% (5/15)"` per tied player individually.

### Per-record logic

| Record | Source | Granularity | Initial value |
|---|---|---|---|
| `matchAvg` | `getMatchAverage(stats)` per match-side | per match | null |
| `legAvg` | `leg.average` from `stats.legs[]` | per leg across all matches | null |
| `first9Avg` | `getFirst9Average(stats)` per match-side | per match | null |
| `fastestLeg` | `leg.dartsThrown` (seek minimum) | per leg | null |
| `highestCheckout` | `leg.checkout` (non-null, seek maximum) | per leg | null |
| `doublePercent` | `doubleHits / doubleAttempts * 100` per match-side | per match (min 1 attempt) | null |

**Tie handling:** Exact equality. When a new value equals the current record, append to `players[]`. When it exceeds (or for fastestLeg: is less than), reset `players` to the new holder only.

**No data:** If no played match provides data for a record (e.g. no double-out matches → `doublePercent.value === null`), the row is hidden in the modal.

---

## HTML

New modal in `index.html` (after `#modal-tournament-stats`, before `<!-- Scripts -->`):

```html
<!-- Tournament records modal -->
<div class="modal modal-tournament-records" id="modal-tournament-records">
  <div class="tr-header">
    <span>Rekordy turnieju</span>
    <button class="modal-close-x" id="btn-tournament-records-close">&#x2715;</button>
  </div>
  <div id="tr-records-body"></div>
</div>
```

---

## JavaScript

### `openTournamentRecordsModal(tournament)` in `league.js`

1. Calls `computeTournamentRecords(tournament)`
2. Populates `#tr-records-body` with a `<table class="stats-table tr-table">`:
   - Each row: `<td>` label | `<td>` value (bold) | `<td class="tr-players">` player name(s)
   - Rows with `value === null` are omitted entirely
3. Wires `#btn-tournament-records-close` → `closeModal`
4. Calls `openModal('modal-tournament-records')`

**Row rendering:**

| Record | Value cell | Players cell |
|---|---|---|
| matchAvg | `72.45` | `Jan Kowalski` |
| legAvg | `91.20` | `Adam Nowak` |
| first9Avg | `88.50` | `Jan Kowalski, Adam Nowak` |
| fastestLeg | `9 lotek` | `Piotr Wiśniewski` |
| highestCheckout | `141` | `Jan Kowalski` |
| doublePercent | `75.0%` | `Adam Nowak (5/15), Jan Kowalski (3/4)` |

For `doublePercent` with multiple tied players: each player shown as `name (hits/attempts)`, joined with `, `.
For `doublePercent` with one player: `name (hits/attempts)`.

### Updating `_appendInfoBarBtns(isActive, tournament)` in `league.js`

Add a third button 👑 records. Button order right-to-left: ⚙ (active only) → 📊 → 👑.

Positions computed programmatically based on how many buttons are appended:
- Each button is ~40px wide (consistent with `.btn-fmt-settings` sizing)
- Rightmost button: `right: 12px`
- Each subsequent: `right: 12 + n*40` px (n = 1, 2, ...)

Implementation approach — build a button list in order (rightmost first), set `style.right` per index:

```js
const btns = [];
if (isActive) btns.push({ id: 'btn-tv-format-settings', cls: 'btn-fmt-settings', text: '⚙', fn: () => openFormatEditModal(_activeTournament) });
btns.push({ id: 'btn-tv-stats',    cls: 'btn-stats',    text: '📊', fn: () => openTournamentStatsModal(tournament)  });
btns.push({ id: 'btn-tv-records',  cls: 'btn-records',  text: '👑', fn: () => openTournamentRecordsModal(tournament) });

btns.forEach((def, i) => {
  const btn = document.createElement('button');
  btn.id = def.id; btn.className = def.cls; btn.textContent = def.text;
  btn.style.right = (12 + i * 40) + 'px';
  btn.addEventListener('click', def.fn);
  infoBar.appendChild(btn);
});
```

Remove stale buttons at start: remove `#btn-tv-format-settings`, `#btn-tv-stats`, `#btn-tv-records` if present.

---

## CSS

```css
/* Records modal — same shape as stats modal */
.modal-tournament-records {
  max-width: 420px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding: 0;
}

.tr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
  border-bottom: 1px solid var(--border);
}

.tr-header > span {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

/* Records table — 3-column layout */
.tr-table td:nth-child(2) {
  white-space: nowrap;
  padding: 0 12px;
  text-align: right;
}

.tr-players {
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Records icon button in info bar */
.btn-records {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 1.65rem;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s, border-color .15s;
}
.btn-records:hover  { color: var(--text); border-color: #555; }
.btn-records:active { color: var(--accent); }
```

Note: `.btn-records` has no `right` in CSS — position set dynamically by `_appendInfoBarBtns`.

---

## Files Changed

| File | Change |
|---|---|
| `js/league.js` | Add `computeTournamentRecords`, `openTournamentRecordsModal`; update `_appendInfoBarBtns` for 3 buttons |
| `index.html` | Add `#modal-tournament-records` |
| `css/style.css` | Add `.modal-tournament-records`, `.tr-header`, `.tr-table`, `.tr-players`, `.btn-records` |

No changes to `app.js`, `stats.js`, `game.js`, `tournament.js`, `history.js`.

---

## Non-goals

- No per-player breakdown in records (just the name of who holds the record)
- No "when was this record set" date
- No history of broken records
