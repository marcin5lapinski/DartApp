# Dart Limit Per Leg — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional visit limit per leg (30–54 darts, step 3) to match setup and tournament wizard; when both players exhaust their allowance a modal asks who won, awarding the leg without updating `fastestLeg` or `highestCheckout`.

**Architecture:** The limit is stored as visit count (`dartLimit / 3`) in `match.dartLimitVisits`. After each committed visit `match.players[i].history.length` is checked for both players; when both reach the threshold a new `modal-dart-limit` replaces normal play. A new `finalizeLimitLeg` (game.js) mirrors `finalizeLeg` but calls `recordLegWinByLimit` (stats.js) which skips fastest-leg and highest-checkout tracking.

**Tech Stack:** Vanilla JS, HTML5, CSS3 — no build step; open `index.html` directly in browser to test.

---

## File Map

| File | Change |
|---|---|
| `js/stats.js` | Add `recordLegWinByLimit(stats)` |
| `js/game.js` | Add `dartLimitVisits` to `createMatch`; add `finalizeLimitLeg(match, winnerIndex)` |
| `index.html` | Add `sel-dart-limit` select (setup screen); add `t-dart-limit` select (wizard step 3); add `modal-dart-limit` |
| `css/style.css` | Add `.limit-winner-options` and `.limit-winner-btn` styles |
| `js/app.js` | Add `pendingLimitWinnerIndex` global; update `undoLastVisit`; add `checkLegVisitLimit`, `showLimitModal`, `handleLimitLegClose`; add event wiring; update `startMatch`, `startTournamentMatch`; add limit check to all visit-commit paths |
| `js/tournament.js` | Add `dartLimit: null` to `initTournamentWizard` matchConfig; read `t-dart-limit` in `t-next-3` handler |

---

## Task 1: `recordLegWinByLimit` in `stats.js`

**Files:**
- Modify: `js/stats.js` (after `recordLegWin`)

- [ ] **Add the function** after `recordLegWin` in `js/stats.js`:

```js
function recordLegWinByLimit(stats) {
  stats.legsWon += 1;

  const first9Sum = stats.legFirst9Scores.reduce((a, b) => a + b, 0);
  const first9Visits = stats.legFirst9Scores.length;
  const first9Darts = stats.legFirst9Darts;

  stats.legs.push({
    dartsThrown: stats.legDarts,
    pointsScored: stats.legPoints,
    average: stats.legDarts > 0 ? stats.legPoints / (stats.legDarts / 3) : 0,
    first9Sum,
    first9Visits,
    first9Darts,
    checkout: null,
    doubleAttempts: stats.legDoubleAttempts,
    doubleHits: stats.legDoubleHits,
  });

  stats.legFirst9Scores = [];
  stats.legFirst9Darts = 0;
}
```

Note: does NOT update `highestCheckout` or `fastestLeg`. `stats.legsWon` incremented here mirrors the existing `recordLegWin` pattern — `finalizeLimitLeg` will overwrite it with the authoritative value from `match.legsWon[winnerIndex]`.

- [ ] **Commit:**
```bash
git add js/stats.js
git commit -m "feat: add recordLegWinByLimit for limit-decided legs"
```

---

## Task 2: `createMatch` update + `finalizeLimitLeg` in `game.js`

**Files:**
- Modify: `js/game.js`

- [ ] **Add `dartLimitVisits` to the object returned by `createMatch`** (after `playerFavorites` line):

Old:
```js
    playerFavorites: config.playerFavorites || [null, null],
  };
```

New:
```js
    playerFavorites: config.playerFavorites || [null, null],
    dartLimitVisits: config.dartLimit ? config.dartLimit / 3 : null,
  };
```

- [ ] **Add `finalizeLimitLeg`** at the end of `js/game.js` (after `finalizeLeg`):

```js
function finalizeLimitLeg(match, winnerIndex) {
  const stats = match.stats[winnerIndex];
  recordLegWinByLimit(stats);

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

- [ ] **Commit:**
```bash
git add js/game.js
git commit -m "feat: add dartLimitVisits to match, add finalizeLimitLeg"
```

---

## Task 3: HTML — selects + modal in `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Add `sel-dart-limit` to the setup screen** — insert between `sel-checkout` group and `input-p1` group (after line 103):

Old:
```html
    <div class="form-group">
      <label for="sel-checkout">Tryb wyjścia</label>
      <select id="sel-checkout">
        <option value="double">Double-out (domyślny)</option>
        <option value="master">Master-out</option>
        <option value="straight">Straight-out</option>
      </select>
    </div>

    <div class="form-group">
      <label for="input-p1">Gracz 1</label>
```

New:
```html
    <div class="form-group">
      <label for="sel-checkout">Tryb wyjścia</label>
      <select id="sel-checkout">
        <option value="double">Double-out (domyślny)</option>
        <option value="master">Master-out</option>
        <option value="straight">Straight-out</option>
      </select>
    </div>

    <div class="form-group">
      <label for="sel-dart-limit">Limit rzutów w legu</label>
      <select id="sel-dart-limit">
        <option value="">Bez limitu</option>
        <option value="30">30 rzutów</option>
        <option value="33">33 rzuty</option>
        <option value="36">36 rzutów</option>
        <option value="39">39 rzutów</option>
        <option value="42">42 rzuty</option>
        <option value="45">45 rzutów</option>
        <option value="48">48 rzutów</option>
        <option value="51">51 rzutów</option>
        <option value="54">54 rzuty</option>
      </select>
    </div>

    <div class="form-group">
      <label for="input-p1">Gracz 1</label>
```

- [ ] **Add `t-dart-limit` to wizard step 3** — insert between `t-checkout` group and `wizard-nav`:

Old:
```html
      <div class="form-group">
        <label for="t-checkout">Tryb wyjścia</label>
        <select id="t-checkout">
          <option value="double" selected>Double-out (domyślny)</option>
          <option value="master">Master-out</option>
          <option value="straight">Straight-out</option>
        </select>
      </div>

      <div class="wizard-nav">
```

New:
```html
      <div class="form-group">
        <label for="t-checkout">Tryb wyjścia</label>
        <select id="t-checkout">
          <option value="double" selected>Double-out (domyślny)</option>
          <option value="master">Master-out</option>
          <option value="straight">Straight-out</option>
        </select>
      </div>

      <div class="form-group">
        <label for="t-dart-limit">Limit rzutów w legu</label>
        <select id="t-dart-limit">
          <option value="">Bez limitu</option>
          <option value="30">30 rzutów</option>
          <option value="33">33 rzuty</option>
          <option value="36">36 rzutów</option>
          <option value="39">39 rzutów</option>
          <option value="42">42 rzuty</option>
          <option value="45">45 rzutów</option>
          <option value="48">48 rzutów</option>
          <option value="51">51 rzutów</option>
          <option value="54">54 rzuty</option>
        </select>
      </div>

      <div class="wizard-nav">
```

- [ ] **Add `modal-dart-limit`** — insert after `modal-leg-result` closing `</div>` (after line 453):

Old:
```html
<!-- Bust notification -->
<div id="bust-toast">BUST!</div>
```

New:
```html
<!-- Dart visit limit reached -->
<div class="modal" id="modal-dart-limit">
  <div class="leg-result-text">⏱ Limit rzutów osiągnięty</div>
  <p class="limit-modal-question">Kto wygrał leg?</p>
  <div id="limit-winner-options" class="limit-winner-options"></div>
  <div class="leg-result-actions">
    <button class="btn btn-secondary" id="btn-limit-undo">↩ Cofnij</button>
    <button class="btn btn-primary" id="btn-limit-dalej" disabled>Dalej →</button>
  </div>
</div>

<!-- Bust notification -->
<div id="bust-toast">BUST!</div>
```

- [ ] **Commit:**
```bash
git add index.html
git commit -m "feat: add dart limit selects and limit modal to HTML"
```

---

## Task 4: CSS — limit modal styles in `css/style.css`

**Files:**
- Modify: `css/style.css`

- [ ] **Add styles** at the end of `css/style.css`:

```css
/* Dart limit modal */
.limit-modal-question {
  margin: 4px 0 8px;
  font-size: 1rem;
  color: var(--text-muted);
}

.limit-winner-options {
  display: flex;
  gap: 10px;
  margin: 8px 0 4px;
}

.limit-winner-btn {
  flex: 1;
  padding: 12px 8px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.limit-winner-btn.selected {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
```

- [ ] **Commit:**
```bash
git add css/style.css
git commit -m "feat: add dart limit modal CSS styles"
```

---

## Task 5: `app.js` — globals, helpers, `undoLastVisit` update

**Files:**
- Modify: `js/app.js`

- [ ] **Add `pendingLimitWinnerIndex`** to the globals block at the top of `app.js` (after `pendingOpenPlayerIndex`):

Old:
```js
let pendingOpenScore = null;
let pendingOpenPlayerIndex = null;
```

New:
```js
let pendingOpenScore = null;
let pendingOpenPlayerIndex = null;
let pendingLimitWinnerIndex = null;
```

- [ ] **Update `undoLastVisit`** to reset `pendingLimitWinnerIndex`:

Old:
```js
  pendingCheckoutScore = null;
  pendingWinnerIndex   = null;
  pendingOpenScore = null;
  pendingOpenPlayerIndex = null;
```

New:
```js
  pendingCheckoutScore = null;
  pendingWinnerIndex   = null;
  pendingOpenScore = null;
  pendingOpenPlayerIndex = null;
  pendingLimitWinnerIndex = null;
```

- [ ] **Add three new helper functions** in `app.js` — insert after `handleLegClose` (around line 1223):

```js
// --- Dart visit limit ---

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

function showLimitModal() {
  const options = document.getElementById('limit-winner-options');
  options.innerHTML = '';
  [match.player1, match.player2].forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn limit-winner-btn';
    btn.dataset.player = i;
    btn.textContent = name;
    options.appendChild(btn);
  });
  pendingLimitWinnerIndex = null;
  document.getElementById('btn-limit-dalej').disabled = true;
  const undoBtn = document.getElementById('btn-limit-undo');
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  openModal('modal-dart-limit');
}

function handleLimitLegClose(winnerIndex) {
  const names = [match.player1, match.player2];
  match.currentMultiplier = 1;

  const legNum = match.currentLeg;
  const setNum = match.currentSet;
  const legResult = finalizeLimitLeg(match, winnerIndex);

  if (legResult.matchOver) {
    if (pendingTournamentMatch) {
      saveTournamentMatchResult(match, pendingTournamentMatch);
    } else {
      saveMatchToHistory(match);
    }
    renderGameScreen(match);
    showLegResultDialog(names[winnerIndex], legNum, 'match', () => {
      renderStatsScreen(match);
      showScreen(SCREENS.STATS);
      document.getElementById('btn-new-match').textContent =
        pendingTournamentMatch ? 'Wróć do meczów' : 'Nowy mecz';
      document.getElementById('btn-live-standings').style.display = 'none';
      saveToLocalStorage();
    });
  } else if (legResult.setOver) {
    showLegResultDialog(names[winnerIndex], setNum, 'set', () => {
      renderGameScreen(match);
      focusSummaryInput();
      saveToLocalStorage();
    });
  } else {
    showLegResultDialog(names[winnerIndex], legNum, 'leg', () => {
      renderGameScreen(match);
      focusSummaryInput();
      saveToLocalStorage();
    });
  }
}
```

- [ ] **Commit:**
```bash
git add js/app.js
git commit -m "feat: add checkLegVisitLimit, showLimitModal, handleLimitLegClose"
```

---

## Task 6: `app.js` — event wiring + `startMatch` + `startTournamentMatch`

**Files:**
- Modify: `js/app.js`

- [ ] **Add three event listeners** inside `setupEventListeners()`, after the undo-from-leg-result listener (`btn-leg-result-undo`):

Old:
```js
  document.getElementById('btn-leg-result-undo').addEventListener('click', undoLastVisit);

  document.getElementById('btn-which-open-dart-cancel').addEventListener('click', undoLastVisit);
```

New:
```js
  document.getElementById('btn-leg-result-undo').addEventListener('click', undoLastVisit);

  // Dart limit modal
  document.getElementById('btn-limit-undo').addEventListener('click', undoLastVisit);

  document.getElementById('limit-winner-options').addEventListener('click', e => {
    const btn = e.target.closest('.limit-winner-btn');
    if (!btn) return;
    document.querySelectorAll('.limit-winner-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    pendingLimitWinnerIndex = parseInt(btn.dataset.player);
    document.getElementById('btn-limit-dalej').disabled = false;
  });

  document.getElementById('btn-limit-dalej').addEventListener('click', () => {
    if (pendingLimitWinnerIndex === null) return;
    closeModal('modal-dart-limit');
    handleLimitLegClose(pendingLimitWinnerIndex);
    pendingLimitWinnerIndex = null;
  });

  document.getElementById('btn-which-open-dart-cancel').addEventListener('click', undoLastVisit);
```

- [ ] **Update `startMatch()`** to read `sel-dart-limit` and pass it to `createMatch`:

Old:
```js
  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, totalSets, startingPlayer, playerFavorites });
```

New:
```js
  const dartLimit = parseInt(document.getElementById('sel-dart-limit').value) || null;
  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, totalSets, startingPlayer, playerFavorites, dartLimit });
```

- [ ] **Update `startTournamentMatch()`** to pass `dartLimit` from `mc`:

Old:
```js
  match = createMatch({
    variant:      mc.variant,
    player1:      p1.name,
    player2:      p2.name,
    checkoutMode: mc.checkoutMode,
    inMode:       mc.inMode,
    totalLegs:    mc.totalLegs,
    totalSets:    mc.totalSets,
    startingPlayer,
    playerFavorites: [
```

New:
```js
  match = createMatch({
    variant:      mc.variant,
    player1:      p1.name,
    player2:      p2.name,
    checkoutMode: mc.checkoutMode,
    inMode:       mc.inMode,
    totalLegs:    mc.totalLegs,
    totalSets:    mc.totalSets,
    dartLimit:    mc.dartLimit ?? null,
    startingPlayer,
    playerFavorites: [
```

- [ ] **Commit:**
```bash
git add js/app.js
git commit -m "feat: wire dart limit modal events, pass dartLimit in startMatch/Tournament"
```

---

## Task 7: `app.js` — add `checkLegVisitLimit()` to all visit-commit paths

**Files:**
- Modify: `js/app.js`

There are 7 call sites. Add `checkLegVisitLimit();` at the end of each visit-commit path as shown below.

- [ ] **`applySummaryScore` — bust path:** add after `renderGameScreen`:

Old:
```js
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    return;
  }

  if (result.checkout) {
```

New:
```js
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    checkLegVisitLimit();
    return;
  }

  if (result.checkout) {
```

- [ ] **`applySummaryScore` — normal visit path:** add after `saveToLocalStorage()` at end of function:

Old:
```js
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
}

// --- Dart-by-dart mode ---
```

New:
```js
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLegVisitLimit();
}

// --- Dart-by-dart mode ---
```

- [ ] **`submitSummaryScore` — locked missed-opening path (val === 0):** add after `saveToLocalStorage()`:

Old:
```js
    if (val === 0) {
      // Missed opening — 3 darts wasted, player stays locked
      recordVisit(match.stats[pIdx], 0, 3);
      match.players[pIdx].history.push({ score: 0, bust: false, darts: 3 });
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
    } else {
```

New:
```js
    if (val === 0) {
      // Missed opening — 3 darts wasted, player stays locked
      recordVisit(match.stats[pIdx], 0, 3);
      match.players[pIdx].history.push({ score: 0, bust: false, darts: 3 });
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
      checkLegVisitLimit();
    } else {
```

- [ ] **`submitQuickScore` — locked missed-opening path (val === 0):** add after `saveToLocalStorage()`:

Old:
```js
    if (val === 0) {
      recordVisit(match.stats[pIdx], 0, 3);
      match.players[pIdx].history.push({ score: 0, bust: false, darts: 3 });
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
      return;
    }
```

New:
```js
    if (val === 0) {
      recordVisit(match.stats[pIdx], 0, 3);
      match.players[pIdx].history.push({ score: 0, bust: false, darts: 3 });
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
      checkLegVisitLimit();
      return;
    }
```

- [ ] **`submitQuickScore` — bust path:** add after `renderGameScreen`:

Old:
```js
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    return;
  }

  if (result.checkout) {
    pendingCheckoutScore = val;
```

New:
```js
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    checkLegVisitLimit();
    return;
  }

  if (result.checkout) {
    pendingCheckoutScore = val;
```

- [ ] **`submitQuickScore` — normal visit path:** add after `saveToLocalStorage()` at end of function:

Old:
```js
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
}

// --- Summary mode ---
```

New:
```js
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLegVisitLimit();
}

// --- Summary mode ---
```

- [ ] **`submitDartValue` — bust path:** add after `saveToLocalStorage()` before `return`:

Old:
```js
    player.dartBuffer = [];
    recordVisit(match.stats[pIdx], 0, 3);
    switchPlayer(match);
    match.currentMultiplier = 1;
    renderGameScreen(match);
    renderDartBuffer(match);
    saveToLocalStorage();
    return;
  }

  // Checkout
```

New:
```js
    player.dartBuffer = [];
    recordVisit(match.stats[pIdx], 0, 3);
    switchPlayer(match);
    match.currentMultiplier = 1;
    renderGameScreen(match);
    renderDartBuffer(match);
    saveToLocalStorage();
    checkLegVisitLimit();
    return;
  }

  // Checkout
```

- [ ] **`submitDartValue` — 3-dart auto-commit path:** add after `saveToLocalStorage()`:

Old:
```js
  if (player.dartBuffer.length === 3) {
    const visitTotal = player.dartBuffer.reduce((a, d) => a + d.value, 0);
    trackDoubleAttempts(match.stats[pIdx], player, null, false);
    recordVisit(match.stats[pIdx], visitTotal, 3);
    player.score -= visitTotal;
    player.history.push({ score: visitTotal, bust: false, darts: 3 });
    player.dartBuffer = [];
    switchPlayer(match);
    match.currentMultiplier = 1;
    renderGameScreen(match);
    renderDartBuffer(match);
    saveToLocalStorage();
  }
}
```

New:
```js
  if (player.dartBuffer.length === 3) {
    const visitTotal = player.dartBuffer.reduce((a, d) => a + d.value, 0);
    trackDoubleAttempts(match.stats[pIdx], player, null, false);
    recordVisit(match.stats[pIdx], visitTotal, 3);
    player.score -= visitTotal;
    player.history.push({ score: visitTotal, bust: false, darts: 3 });
    player.dartBuffer = [];
    switchPlayer(match);
    match.currentMultiplier = 1;
    renderGameScreen(match);
    renderDartBuffer(match);
    saveToLocalStorage();
    checkLegVisitLimit();
  }
}
```

- [ ] **`submitDartValue` — locked all-3-wasted path:** add after `saveToLocalStorage()`:

Old:
```js
      if (player.dartBuffer.length === 3) {
        // All 3 darts wasted — commit as 0-score visit, player stays locked
        recordVisit(match.stats[pIdx], 0, 3);
        player.history.push({ score: 0, bust: false, darts: 3 });
        player.dartBuffer = [];
        switchPlayer(match);
        match.currentMultiplier = 1;
        renderGameScreen(match);
        renderDartBuffer(match);
        saveToLocalStorage();
      }
      return;
```

New:
```js
      if (player.dartBuffer.length === 3) {
        // All 3 darts wasted — commit as 0-score visit, player stays locked
        recordVisit(match.stats[pIdx], 0, 3);
        player.history.push({ score: 0, bust: false, darts: 3 });
        player.dartBuffer = [];
        switchPlayer(match);
        match.currentMultiplier = 1;
        renderGameScreen(match);
        renderDartBuffer(match);
        saveToLocalStorage();
        checkLegVisitLimit();
      }
      return;
```

- [ ] **Commit:**
```bash
git add js/app.js
git commit -m "feat: check dart visit limit after every committed visit"
```

---

## Task 8: `tournament.js` — wizard step 3 dart limit

**Files:**
- Modify: `js/tournament.js`

- [ ] **Add `dartLimit: null` to `initTournamentWizard` matchConfig:**

Old:
```js
    matchConfig: {
      variant: 501,
      totalSets: 1,
      totalLegs: 3,
      inMode: 'straight',
      checkoutMode: 'double',
    },
```

New:
```js
    matchConfig: {
      variant: 501,
      totalSets: 1,
      totalLegs: 3,
      inMode: 'straight',
      checkoutMode: 'double',
      dartLimit: null,
    },
```

- [ ] **Update `t-next-3` handler** to read `t-dart-limit`:

Old:
```js
  tournamentConfig.matchConfig = {
    variant:      parseInt(document.getElementById('t-variant').value),
    totalSets:    parseInt(document.getElementById('t-sets').value),
    totalLegs:    parseInt(document.getElementById('t-legs').value),
    inMode:       document.getElementById('t-in-mode').value,
    checkoutMode: document.getElementById('t-checkout').value,
  };
```

New:
```js
  tournamentConfig.matchConfig = {
    variant:      parseInt(document.getElementById('t-variant').value),
    totalSets:    parseInt(document.getElementById('t-sets').value),
    totalLegs:    parseInt(document.getElementById('t-legs').value),
    inMode:       document.getElementById('t-in-mode').value,
    checkoutMode: document.getElementById('t-checkout').value,
    dartLimit:    parseInt(document.getElementById('t-dart-limit').value) || null,
  };
```

- [ ] **Commit:**
```bash
git add js/tournament.js
git commit -m "feat: read dart limit from wizard step 3"
```

---

## Task 9: Manual verification

Open `index.html` in a browser and verify each scenario:

- [ ] **Setup screen** — confirm `sel-dart-limit` appears below "Tryb wyjścia" with "Bez limitu" as default and 30–54 options.

- [ ] **No limit (default)** — start a match without limit. Play through 15 visits per player, confirm no limit modal ever appears.

- [ ] **Limit triggers correctly** — start a match with limit = 30 (10 visits). With player A starting: after player A's 10th visit and player B's 10th visit, the "⏱ Limit rzutów osiągnięty" modal appears asking "Kto wygrał leg?".

- [ ] **Player selection** — click player 1's button: it turns red (accent), "Dalej" becomes enabled. Click player 2: player 2 turns red, player 1 deselects.

- [ ] **Dalej flow** — choose a winner, click "Dalej". Modal closes, leg-result modal appears ("X wygrał leg N!"). Click Dalej — new leg starts.

- [ ] **Match ends via limit** — in a first-to-1 match, hit the limit: confirm match-over modal appears and stats screen loads correctly. "Najszybszy leg" and "Najwyższe zamknięcie" show `0` / `—` for that leg (limit leg not counted). Double attempts from that leg are visible if applicable.

- [ ] **Cofnij in limit modal** — reach limit modal, click "↩ Cofnij". Modal closes, game screen shows the state before the last visit. One player is now below the limit threshold. Play continues normally.

- [ ] **Cofnij disabled** — clear `undoStack` by reloading the page after a fresh match, reach the limit on the very first visit pair — "↩ Cofnij" is disabled in the modal.

- [ ] **Tournament wizard** — create a tournament: step 3 shows "Limit rzutów w legu" select. Choose 36 rzutów. Create tournament and play a match — limit triggers at 12 visits per player.

- [ ] **Dart-by-dart mode** — start a match with limit = 30, switch to dart-by-dart. After each player commits their 10th full visit (including any busts that cut a visit short), the modal appears.
