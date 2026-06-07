# Dart Limit Per Leg — Design Spec

**Date:** 2026-06-07  
**Status:** Approved

## Overview

Add an optional dart (visit) limit per leg to the match format settings and tournament wizard. When both players exhaust their visit allowance without closing the leg, a modal asks who won. The winner is awarded the leg; stats are recorded normally except `fastestLeg` and `highestCheckout` are not updated for limit-decided legs.

---

## 1. Architecture

The limit is expressed to the user as dart counts (30, 33, …, 54, step 3) but stored and compared internally as **visit counts** (`dartLimit / 3`), because each turn at the board is one visit regardless of whether it spans 1, 2, or 3 physical darts.

Visit count per player per leg is read from `match.players[i].history.length`, which is reset to `[]` at each new leg via `createPlayerState()`.

**Trigger condition** — checked after every committed visit:
```
players[0].history.length >= dartLimitVisits
AND players[1].history.length >= dartLimitVisits
```
When true, show the limit modal instead of continuing play.

---

## 2. Data Layer

### `matchConfig` (tournament storage)
```js
matchConfig: {
  variant, totalSets, totalLegs, inMode, checkoutMode,
  dartLimit: null | 30 | 33 | 36 | 39 | 42 | 45 | 48 | 51 | 54
}
```
`null` = no limit (default).

### `match` object (`createMatch` in `game.js`)
New field:
```js
dartLimitVisits: config.dartLimit ? config.dartLimit / 3 : null
```

### New global in `app.js`
```js
let pendingLimitWinnerIndex = null;
```

### `stats.js` — new `recordLegWinByLimit(stats)`
- Increments `legsWon`
- Does **not** update `highestCheckout` or `fastestLeg`
- Pushes a leg snapshot (`checkout: null`) to `stats.legs` (required for `getFirst9Average`)
- Clears `legFirst9Scores` and `legFirst9Darts`

### `game.js` — new `finalizeLimitLeg(match, winnerIndex)`
- Calls `recordLegWinByLimit(match.stats[winnerIndex])`
- Identical leg/set/match counter logic and state reset as `finalizeLeg`
- Returns same `{ legOver, matchOver, setOver }` shape

---

## 3. UI

### New `<select>` — match setup screen (`index.html`)
ID: `sel-dart-limit`. Placed in the match setup form alongside `sel-checkout`.

Options:
```
Bez limitu  (value="")
30 rzutów   (value="30")
33 rzuty    (value="33")
36 rzutów   (value="36")
39 rzutów   (value="39")
42 rzuty    (value="42")
45 rzutów   (value="45")
48 rzutów   (value="48")
51 rzutów   (value="51")
54 rzuty    (value="54")
```

### New `<select>` — tournament wizard step 3 (`index.html`)
ID: `t-dart-limit`. Identical options. Placed alongside `t-checkout`.

### New modal `#modal-dart-limit`
```
┌───────────────────────────────────┐
│  ⏱ Limit rzutów osiągnięty        │
│  Kto wygrał leg?                  │
│                                   │
│  [ Gracz 1 ]    [ Gracz 2 ]       │
│  (selected: background --accent)  │
│                                   │
│  [ ↩ Cofnij ]   [ Dalej → ]      │
│  (always shown) (disabled until   │
│                  winner chosen)   │
└───────────────────────────────────┘
```

- Player buttons generated dynamically from `match.player1` / `match.player2`
- Clicking a button: assigns `--accent` background to it, deselects the other, enables "Dalej"
- "↩ Cofnij": disabled when `undoStack.length === 0`, calls `undoLastVisit()`
- "Dalej →": disabled until a winner is selected

### CSS
New class `.limit-winner-btn` — similar to `.modal-starter-opt`. When `.selected`: `background: var(--accent); color: white; border-color: var(--accent)`.

---

## 4. Logic in `app.js`

### `checkLegVisitLimit()` — new helper
```js
function checkLegVisitLimit() {
  if (!match || !match.dartLimitVisits) return false;
  const v0 = match.players[0].history.length;
  const v1 = match.players[1].history.length;
  if (v0 >= match.dartLimitVisits && v1 >= match.dartLimitVisits) {
    showLimitModal();
    return true;
  }
  return false;
}
```

### `showLimitModal()` — new helper
- Renders player name buttons into `#limit-winner-options`
- Sets `pendingLimitWinnerIndex = null`, "Dalej" disabled, "Cofnij" disabled/enabled per `undoStack.length`
- Opens `modal-dart-limit`

### `handleLimitLegClose(winnerIndex)` — new helper
- Calls `finalizeLimitLeg(match, winnerIndex)`
- Checks `matchOver / setOver` identically to `handleLegClose`
- Saves tournament result or history, shows `showLegResultDialog` or navigates to stats

### Call sites for `checkLegVisitLimit()`
Added after `switchPlayer + renderGameScreen + saveToLocalStorage` in:
- `applySummaryScore` — normal visit path
- `applySummaryScore` — bust path
- `submitSummaryScore` — missed opening (val === 0, locked)
- `submitQuickScore` — normal visit and bust paths
- `submitDartValue` — 3-dart auto-commit (normal)
- `submitDartValue` — bust path
- `submitDartValue` — all 3 locked darts wasted

### Event wiring (`setupEventListeners`)
```js
// Limit modal: undo
document.getElementById('btn-limit-undo').addEventListener('click', undoLastVisit);

// Limit modal: player selection (delegated)
document.getElementById('limit-winner-options').addEventListener('click', e => {
  const btn = e.target.closest('.limit-winner-btn');
  if (!btn) return;
  document.querySelectorAll('.limit-winner-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  pendingLimitWinnerIndex = parseInt(btn.dataset.player);
  document.getElementById('btn-limit-dalej').disabled = false;
});

// Limit modal: confirm
document.getElementById('btn-limit-dalej').addEventListener('click', () => {
  if (pendingLimitWinnerIndex === null) return;
  closeModal('modal-dart-limit');
  handleLimitLegClose(pendingLimitWinnerIndex);
  pendingLimitWinnerIndex = null;
});
```

### `startMatch()` change
```js
const dartLimit = parseInt(document.getElementById('sel-dart-limit').value) || null;
match = createMatch({ ..., dartLimit });
```

### `startTournamentMatch()` change
```js
match = createMatch({ ..., dartLimit: mc.dartLimit ?? null });
```

### Wizard step 3 handler change (`t-next-3`)
```js
tournamentConfig.matchConfig = {
  ...,
  dartLimit: parseInt(document.getElementById('t-dart-limit').value) || null,
};
```

---

## 5. Stats Behaviour

| Statistic | Normal leg win | Limit leg win |
|---|---|---|
| `legsWon` | ✅ incremented | ✅ incremented |
| `highestCheckout` | ✅ updated | ❌ not updated |
| `fastestLeg` | ✅ updated | ❌ not updated |
| `doubleAttempts` | ✅ tracked per visit | ✅ tracked per visit (already recorded during play) |
| `doubleHits` | ✅ incremented on checkout | ❌ not incremented (no checkout) |
| `first9Average` | ✅ snapshot pushed | ✅ snapshot pushed |
| Match average | ✅ computed from all darts | ✅ computed from all darts |

---

## 6. Undo Behaviour

`undoLastVisit()` in the limit modal restores state to before the last committed visit — the same mechanism used by `modal-leg-result`. After undo, all modals close and `renderGameScreen` runs, returning to normal play. The limit check runs again if the same situation is re-reached.

`undoLastVisit()` must also reset `pendingLimitWinnerIndex = null` alongside the other `pending*` resets it already performs (`pendingCheckoutScore`, `pendingWinnerIndex`, `pendingOpenScore`, `pendingOpenPlayerIndex`).

---

## 7. Edge Cases

- **One player checkouts before limit:** normal checkout flow, limit modal never shown.
- **Checkout on the visit that hits the limit:** checkout takes priority — `handleLegClose` is called before `checkLegVisitLimit` is reached (the checkout path returns early).
- **Undo after limit modal:** restores the second player's last visit; one player is now below the limit threshold — play resumes normally.
- **Tournament matches:** `dartLimit` is stored in `matchConfig` and passed to `createMatch` identically to other match settings. Limit leg wins are saved in match stats and contribute to standings/averages normally.
