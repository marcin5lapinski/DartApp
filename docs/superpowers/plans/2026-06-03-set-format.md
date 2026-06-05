# Set Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a set-based match format to the X01 dart app so matches can be played as "first to N sets, each set first to M legs."

**Architecture:** Extend the flat `match` object in `game.js` with five new fields (`totalSets`, `currentSet`, `setsWon`, `legsWonInSet`, `setStartingPlayer`). `finalizeLeg()` gains a set-win layer on top of its existing leg logic. When `totalSets === 1` all new code paths are skipped — backwards compatible with existing localStorage saves.

**Tech Stack:** Vanilla HTML5/CSS3/JS, no build step. Open `index.html` directly in a browser to test.

---

## File Map

| File | Changes |
|---|---|
| `js/game.js` | `createMatch()` — 5 new fields; `finalizeLeg()` — set-win layer, `setOver` return flag |
| `index.html` | New `<select id="sel-sets">` (1–10) in setup form; `sel-variant` and `sel-sets` share a `form-row`; `sel-legs` becomes standalone below |
| `js/app.js` | `startMatch()` reads `sel-sets`; dynamic `sel-legs` label; `pushUndoState` / `undoLastVisit` include new fields; `handleLegClose()` handles `setOver` |
| `js/ui.js` | `showLegResultDialog()` — new `type` param; `renderGameScreen()` — set-aware indicator and score; `renderStatsScreen()` — "Sety wygrane" row |
| `js/history.js` | `saveMatchToHistory()` persists `totalSets`/`setsWon`; `renderHistoryScreen()` + `renderHistoryDetailScreen()` show sets info |

---

## Task 1: Extend `game.js` — data model and `finalizeLeg` set logic

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Add five new fields to `createMatch()`**

In `createMatch()`, after the `legsWon: [0, 0],` line, add:

```js
// existing line stays:
legsWon: [0, 0],
// add these five:
totalSets: config.totalSets || 1,
currentSet: 1,
setsWon: [0, 0],
legsWonInSet: [0, 0],
setStartingPlayer: config.startingPlayer ?? 0,
```

- [ ] **Step 2: Replace `finalizeLeg()` with set-aware version**

Replace the entire `finalizeLeg` function (lines 142–170 in `game.js`) with:

```js
function finalizeLeg(match, winnerIndex, checkoutScore, dartNumber, isDartByDart) {
  const stats = match.stats[winnerIndex];
  recordLegWin(stats, match.variant, checkoutScore, dartNumber, isDartByDart);

  match.legsWonInSet[winnerIndex] += 1;
  match.legsWon[winnerIndex] += 1;
  stats.legsWon = match.legsWon[winnerIndex];

  const isLocked = match.inMode !== IN_MODES.STRAIGHT;

  if (match.legsWonInSet[winnerIndex] >= match.totalLegs) {
    match.setsWon[winnerIndex] += 1;

    if (match.setsWon[winnerIndex] >= match.totalSets) {
      match.matchOver = true;
      match.winner = winnerIndex;
      return { legOver: true, matchOver: true, setOver: true };
    }

    match.currentSet += 1;
    match.legsWonInSet = [0, 0];
    match.setStartingPlayer = 1 - match.setStartingPlayer;
    match.legStartingPlayer = match.setStartingPlayer;
    match.activePlayer = match.legStartingPlayer;
    match.currentLeg += 1;
    match.players[0] = createPlayerState(match.variant);
    match.players[1] = createPlayerState(match.variant);
    if (isLocked) {
      match.players[0].legOpened = false;
      match.players[1].legOpened = false;
    }
    resetLegStats(match.stats[0]);
    resetLegStats(match.stats[1]);

    return { legOver: true, matchOver: false, setOver: true };
  }

  match.currentLeg += 1;
  match.legStartingPlayer = 1 - match.legStartingPlayer;
  match.activePlayer = match.legStartingPlayer;
  match.players[0] = createPlayerState(match.variant);
  match.players[1] = createPlayerState(match.variant);
  if (isLocked) {
    match.players[0].legOpened = false;
    match.players[1].legOpened = false;
  }
  resetLegStats(match.stats[0]);
  resetLegStats(match.stats[1]);

  return { legOver: true, matchOver: false, setOver: false };
}
```

- [ ] **Step 3: Manual smoke-test in browser**

Open `index.html`. Start a match with default settings (1 set, First to 2 legs). Play two legs — match should end normally. No console errors.

- [ ] **Step 4: Commit**

```
git add js/game.js
git commit -m "feat: add set fields to match model and set-win logic in finalizeLeg"
```

---

## Task 2: Update `index.html` — add `sel-sets` select

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Restructure the variant+legs form-row**

Find this block in `index.html` (setup screen):

```html
    <div class="form-row">
      <div class="form-group">
        <label for="sel-variant">Wariant</label>
        <select id="sel-variant">
          ...
        </select>
      </div>
      <div class="form-group">
        <label for="sel-legs">Liczba legów</label>
        <select id="sel-legs">
          ...
        </select>
      </div>
    </div>
```

Replace it with (keep all `<option>` elements inside each select unchanged):

```html
    <div class="form-row">
      <div class="form-group">
        <label for="sel-variant">Wariant</label>
        <select id="sel-variant">
          <!-- same options as before, unchanged -->
        </select>
      </div>
      <div class="form-group">
        <label for="sel-sets">Liczba setów</label>
        <select id="sel-sets">
          <option value="1" selected>1 set</option>
          <option value="2">2 sety</option>
          <option value="3">3 sety</option>
          <option value="4">4 sety</option>
          <option value="5">5 setów</option>
          <option value="6">6 setów</option>
          <option value="7">7 setów</option>
          <option value="8">8 setów</option>
          <option value="9">9 setów</option>
          <option value="10">10 setów</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label for="sel-legs" id="lbl-legs">Liczba legów</label>
      <select id="sel-legs">
        <!-- same options as before, unchanged -->
      </select>
    </div>
```

- [ ] **Step 2: Manual check**

Open `index.html`. Setup screen should show: row with Wariant + Liczba setów (default "1 set"), then Liczba legów below. No layout breakage.

- [ ] **Step 3: Commit**

```
git add index.html
git commit -m "feat: add sel-sets select to setup screen"
```

---

## Task 3: Update `app.js` — setup reading, undo stack, `handleLegClose`

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Read `totalSets` in `startMatch()` and pass to `createMatch()`**

In `startMatch()`, after the `const inMode = ...` line, add:

```js
const totalSets = parseInt(document.getElementById('sel-sets').value);
```

Then update the `createMatch` call to include `totalSets`:

```js
match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, totalSets, startingPlayer, playerFavorites });
```

- [ ] **Step 2: Add dynamic label for `sel-legs` in `setupEventListeners()`**

At the end of `setupEventListeners()`, before the closing `}`, add:

```js
  document.getElementById('sel-sets').addEventListener('change', () => {
    const sets = parseInt(document.getElementById('sel-sets').value);
    document.getElementById('lbl-legs').textContent =
      sets > 1 ? 'Legi na seta' : 'Liczba legów';
  });
```

- [ ] **Step 3: Add new fields to `pushUndoState()`**

Replace the snapshot object inside `pushUndoState()`:

```js
  const snapshot = JSON.parse(JSON.stringify({
    players: match.players.map(p => ({ ...p, dartBuffer: [] })),
    activePlayer: match.activePlayer,
    legsWon: match.legsWon,
    legsWonInSet: match.legsWonInSet,
    currentLeg: match.currentLeg,
    currentSet: match.currentSet,
    legStartingPlayer: match.legStartingPlayer,
    setStartingPlayer: match.setStartingPlayer,
    setsWon: match.setsWon,
    stats: match.stats,
    matchOver: match.matchOver,
    winner: match.winner,
  }));
```

- [ ] **Step 4: Restore new fields in `undoLastVisit()`**

After `match.winner = snapshot.winner;` in `undoLastVisit()`, add:

```js
  match.legsWonInSet    = snapshot.legsWonInSet;
  match.currentSet      = snapshot.currentSet;
  match.setStartingPlayer = snapshot.setStartingPlayer;
  match.setsWon         = snapshot.setsWon;
```

- [ ] **Step 5: Update `handleLegClose()` to handle `setOver`**

Replace the entire `handleLegClose` function:

```js
function handleLegClose(dartNumber, isDartByDart) {
  const pIdx = pendingWinnerIndex;
  const names = [match.player1, match.player2];
  match.currentMultiplier = 1;

  const legNum = match.currentLeg;
  const setNum = match.currentSet;
  const legResult = finalizeLeg(match, pIdx, pendingCheckoutScore, dartNumber, isDartByDart);

  if (legResult.matchOver) {
    saveMatchToHistory(match);
    renderGameScreen(match);
    showLegResultDialog(names[pIdx], legNum, 'match', () => {
      renderStatsScreen(match);
      showScreen(SCREENS.STATS);
      saveToLocalStorage();
    });
  } else if (legResult.setOver) {
    showLegResultDialog(names[pIdx], setNum, 'set', () => {
      renderGameScreen(match);
      saveToLocalStorage();
    });
  } else {
    showLegResultDialog(names[pIdx], legNum, 'leg', () => {
      renderGameScreen(match);
      saveToLocalStorage();
    });
  }

  pendingCheckoutScore = null;
  pendingWinnerIndex = null;
}
```

- [ ] **Step 6: Manual smoke-test**

Open `index.html`. Select 3 sets, First to 2 legs. Play through legs — after 2 legs won by one player you should see "wygrał set 1!" dialog. After winning 3 sets, "wygrał mecz!" dialog. Undo should work across leg/set boundaries.

- [ ] **Step 7: Commit**

```
git add js/app.js
git commit -m "feat: wire sel-sets in startMatch, update undo stack and handleLegClose for sets"
```

---

## Task 4: Update `ui.js` — game display, leg result dialog, stats screen

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: Update `showLegResultDialog()` signature and message logic**

Replace the entire `showLegResultDialog` function:

```js
function showLegResultDialog(winnerName, num, type, callback) {
  const modal = document.getElementById('modal-leg-result');
  let text;
  if (type === 'match') text = winnerName + ' wygrał mecz!';
  else if (type === 'set') text = winnerName + ' wygrał set ' + num + '!';
  else text = winnerName + ' wygrał leg ' + num + '!';
  modal.querySelector('.leg-result-text').textContent = text;
  modal.querySelector('#btn-next-leg').onclick = () => {
    closeModal('modal-leg-result');
    callback();
  };
  openModal('modal-leg-result');
}
```

- [ ] **Step 2: Update match score and leg indicator in `renderGameScreen()`**

Replace these two lines in `renderGameScreen()`:

```js
  document.getElementById('ms-result').textContent = match.legsWon[0] + ' : ' + match.legsWon[1];

  document.getElementById('leg-indicator').textContent =
    'Leg ' + match.currentLeg + ' (First to ' + match.totalLegs + ')';
```

With:

```js
  if (match.totalSets > 1) {
    document.getElementById('ms-result').textContent =
      '(' + match.setsWon[0] + ') ' +
      match.legsWonInSet[0] + ':' + match.legsWonInSet[1] +
      ' (' + match.setsWon[1] + ')';
    const legInSet = match.legsWonInSet[0] + match.legsWonInSet[1] + 1;
    document.getElementById('leg-indicator').textContent =
      'Set ' + match.currentSet + ' | Leg ' + legInSet + ' (First to ' + match.totalLegs + ')';
  } else {
    document.getElementById('ms-result').textContent = match.legsWon[0] + ' : ' + match.legsWon[1];
    document.getElementById('leg-indicator').textContent =
      'Leg ' + match.currentLeg + ' (First to ' + match.totalLegs + ')';
  }
```

- [ ] **Step 3: Update `renderStatsScreen()` — settings label and sety wygrane row**

In `renderStatsScreen()`, replace this line in the settings array:

```js
    'First to ' + match.totalLegs,
```

With:

```js
    match.totalSets > 1
      ? 'First to ' + match.totalSets + ' sets × ' + match.totalLegs + ' legs'
      : 'First to ' + match.totalLegs,
```

Then in the stats card `innerHTML` template, replace:

```js
        <tr><td>Legi wygrane</td><td><strong>${match.legsWon[i]}</strong></td></tr>
```

With:

```js
        ${match.totalSets > 1 ? `<tr><td>Sety wygrane</td><td><strong>${match.setsWon[i]}</strong></td></tr>` : ''}
        <tr><td>Legi wygrane</td><td><strong>${match.legsWon[i]}</strong></td></tr>
```

- [ ] **Step 4: Manual test in browser**

Open `index.html`. Start a 3-sets × 3-legs match. During play verify:
- Score shows `(0) 0:0 (0)` format
- Leg indicator shows `Set 1 | Leg 1 (First to 3)`
- After winning a leg: `(0) 1:0 (0)`, leg indicator `Set 1 | Leg 2 (First to 3)`
- After winning a set: `(1) 0:0 (0)`, leg indicator `Set 2 | Leg 1 (First to 3)`
- Stats screen after match shows "Sety wygrane" row

Start a 1-set match and verify nothing changed (leg indicator and score unchanged).

- [ ] **Step 5: Commit**

```
git add js/ui.js
git commit -m "feat: set-aware score display, leg indicator, and stats screen"
```

---

## Task 5: Update `history.js` — persist and display sets data

**Files:**
- Modify: `js/history.js`

- [ ] **Step 1: Add `totalSets` and `setsWon` to `saveMatchToHistory()`**

In `saveMatchToHistory()`, add two fields to the record object after `totalLegs`:

```js
    totalLegs: match.totalLegs,
    totalSets: match.totalSets || 1,
    setsWon: [...(match.setsWon || [0, 0])],
```

- [ ] **Step 2: Update history list score display in `renderHistoryScreen()`**

In `renderHistoryScreen()`, find the `hr-score` span inside `div.innerHTML`:

```js
        <span class="hr-score">${rec.legsWon[0]} : ${rec.legsWon[1]}</span>
```

Replace with:

```js
        <span class="hr-score">${rec.totalSets > 1
          ? (rec.setsWon[0] + ' : ' + rec.setsWon[1])
          : (rec.legsWon[0] + ' : ' + rec.legsWon[1])}</span>
```

- [ ] **Step 3: Add format tag to history list variant label**

In `renderHistoryScreen()`, find:

```js
        <span class="hr-variant">${rec.variant}${inModeLabel ? ' · ' + inModeLabel : ''} · ${modeLabel}</span>
```

Replace with:

```js
        <span class="hr-variant">${rec.variant}${rec.totalSets > 1 ? ' · ' + rec.totalSets + 'S×' + rec.totalLegs + 'L' : ''}${inModeLabel ? ' · ' + inModeLabel : ''} · ${modeLabel}</span>
```

- [ ] **Step 4: Update history detail screen in `renderHistoryDetailScreen()`**

Find the `metaParts` line:

```js
  const metaParts = [String(rec.variant), ...(inModeLabel ? [inModeLabel] : []), modeLabel, `wynik ${rec.legsWon[0]}:${rec.legsWon[1]}`];
```

Replace with:

```js
  const scoreStr = rec.totalSets > 1
    ? `wynik setów ${(rec.setsWon || [0,0])[0]}:${(rec.setsWon || [0,0])[1]}`
    : `wynik ${rec.legsWon[0]}:${rec.legsWon[1]}`;
  const formatStr = rec.totalSets > 1 ? `${rec.totalSets} sety × ${rec.totalLegs} legi` : null;
  const metaParts = [String(rec.variant), ...(formatStr ? [formatStr] : []), ...(inModeLabel ? [inModeLabel] : []), modeLabel, scoreStr];
```

- [ ] **Step 5: Add "Sety wygrane" row to history detail stats**

In `renderHistoryDetailScreen()`, find:

```js
    let rows = `
      <tr><td>Legi wygrane</td><td><strong>${rec.legsWon[i]}</strong></td></tr>
```

Replace with:

```js
    let rows = `
      ${rec.totalSets > 1 ? `<tr><td>Sety wygrane</td><td><strong>${(rec.setsWon || [0,0])[i]}</strong></td></tr>` : ''}
      <tr><td>Legi wygrane</td><td><strong>${rec.legsWon[i]}</strong></td></tr>
```

- [ ] **Step 6: Manual test**

Play a 3-sets × 3-legs match to completion. Open History:
- List entry should show sets score (e.g., `3 : 1`) and `501 · 3S×3L · DOut`
- Detail screen should show `3 sety × 3 legi` in meta, "Sety wygrane" row in both player stats, sets score in header

Open an old match record (if any) — should still display correctly with legs score.

- [ ] **Step 7: Commit**

```
git add js/history.js
git commit -m "feat: persist and display set results in match history"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `totalSets`/`currentSet`/`setsWon`/`legsWonInSet`/`setStartingPlayer` in `createMatch()` — Task 1
- [x] `finalizeLeg` set-win layer with `setOver` flag — Task 1
- [x] `sel-sets` select (1–10), default 1 — Task 2
- [x] Dynamic `sel-legs` label — Task 3
- [x] `startMatch()` reads `totalSets` — Task 3
- [x] `handleLegClose` shows "wygrał set N!" — Task 3
- [x] Undo stack includes new fields — Task 3
- [x] Score format `(setsWon[0]) legsWonInSet[0]:legsWonInSet[1] (setsWon[1])` — Task 4
- [x] Leg indicator `Set N | Leg M (First to X)` — Task 4
- [x] Stats "Sety wygrane" row — Task 4
- [x] History saves `totalSets`/`setsWon` — Task 5
- [x] History list and detail show sets format — Task 5
- [x] `totalSets === 1` backward-compatible path in every changed function — Tasks 1, 4, 5

**Type consistency:**
- `finalizeLeg` returns `{ legOver, matchOver, setOver }` — used in `handleLegClose` as `legResult.setOver` ✓
- `showLegResultDialog(name, num, type, callback)` — called with `'match'`/`'set'`/`'leg'` in `handleLegClose` ✓
- `match.legsWonInSet`, `match.setsWon`, `match.currentSet`, `match.setStartingPlayer` — consistent names across all tasks ✓
- `rec.setsWon` accessed as `(rec.setsWon || [0,0])[i]` in history detail for old records ✓
