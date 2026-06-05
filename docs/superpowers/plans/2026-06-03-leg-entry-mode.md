# Leg Entry Mode (Double-In / Master-In) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add double-in and master-in leg entry modes — each leg must be opened by hitting a double (double-in) or any double/triple (master-in) before the score counts; straight-in (current default behaviour, no restriction) remains the default.

**Architecture:** `inMode` is stored on the match object alongside `checkoutMode`. Each player state gets a `legOpened` boolean that starts `false` for double-in/master-in and `true` for straight-in. All three scoring paths (summary, quick-score, dart-by-dart/board) gate score application on `legOpened`. Summary/quick-score locked turns show a new "which dart opened?" dialog (parallel to the existing "which dart closed?" dialog). Dart-by-dart/board mode treats non-opening darts as 0 mid-visit. `pushUndoState()` inside `submitDartValue` is moved to the start of each visit (empty buffer) so that `legOpened` is snapshotted before any mid-visit change.

**Tech Stack:** Vanilla JS, HTML5, CSS3 — no build step, open `index.html` in browser to test.

---

## File Map

| File | Change |
|---|---|
| `js/game.js` | Add `IN_MODES`, `isOpeningDart()`, `legOpened` in `createPlayerState`, `inMode` in `createMatch` + `finalizeLeg` |
| `index.html` | Add `sel-in-mode` select; add `modal-which-open-dart` |
| `js/ui.js` | Add `showWhichOpenDartDialog(callback)` |
| `js/app.js` | Read `inMode` in `startMatch`; add `pendingOpenScore`/`pendingOpenPlayerIndex`; refactor summary/quick-score locked flow; refactor `submitDartValue` locked flow + push-at-visit-start |
| `js/history.js` | Save `inMode` in match record |

---

## Task 1 — `game.js`: IN_MODES, isOpeningDart, player state, match creation

**Files:**
- Modify: `js/game.js`

- [ ] **Step 1: Add `IN_MODES` constant and `isOpeningDart` helper directly after `CHECKOUT_MODES`**

```js
const IN_MODES = { STRAIGHT: 'straight', DOUBLE: 'double', MASTER: 'master' };

// Returns true if this dart qualifies as a leg-opening dart for the given inMode.
function isOpeningDart(base, multiplier, inMode) {
  if (inMode === IN_MODES.STRAIGHT) return true;
  if (inMode === IN_MODES.DOUBLE)   return multiplier === 2;
  if (inMode === IN_MODES.MASTER)   return multiplier === 2 || multiplier === 3;
  return true;
}
```

Replace the current line 4:
```js
const CHECKOUT_MODES = { DOUBLE: 'double', MASTER: 'master', STRAIGHT: 'straight' };
```
with:
```js
const CHECKOUT_MODES = { DOUBLE: 'double', MASTER: 'master', STRAIGHT: 'straight' };
const IN_MODES = { STRAIGHT: 'straight', DOUBLE: 'double', MASTER: 'master' };

// Returns true if this dart qualifies as a leg-opening dart for the given inMode.
function isOpeningDart(base, multiplier, inMode) {
  if (inMode === IN_MODES.STRAIGHT) return true;
  if (inMode === IN_MODES.DOUBLE)   return multiplier === 2;
  if (inMode === IN_MODES.MASTER)   return multiplier === 2 || multiplier === 3;
  return true;
}
```

- [ ] **Step 2: Add `legOpened: true` to `createPlayerState`**

Current `createPlayerState`:
```js
function createPlayerState(startScore) {
  return {
    score: startScore,
    history: [],
    dartBuffer: [],
  };
}
```

New:
```js
function createPlayerState(startScore) {
  return {
    score: startScore,
    history: [],
    dartBuffer: [],
    legOpened: true,  // overridden after creation when inMode requires an opening dart
  };
}
```

- [ ] **Step 3: Add `inMode` to `createMatch` and set initial `legOpened`**

Replace the `createMatch` function:
```js
function createMatch(config) {
  // config: { variant, player1, player2, checkoutMode, inMode, totalLegs }
  const inMode = config.inMode || IN_MODES.STRAIGHT;
  const isLocked = inMode !== IN_MODES.STRAIGHT;
  const p0 = createPlayerState(config.variant);
  const p1 = createPlayerState(config.variant);
  if (isLocked) { p0.legOpened = false; p1.legOpened = false; }

  return {
    variant: config.variant,
    player1: config.player1,
    player2: config.player2,
    checkoutMode: config.checkoutMode || CHECKOUT_MODES.DOUBLE,
    inMode,
    totalLegs: config.totalLegs || 3,
    inputMode: INPUT_MODES.SUMMARY,

    currentLeg: 1,
    activePlayer: config.startingPlayer ?? 0,
    legStartingPlayer: config.startingPlayer ?? 0,
    currentMultiplier: 1,
    legsWon: [0, 0],

    players: [p0, p1],
    stats: [createPlayerStats(), createPlayerStats()],
    matchOver: false,
    winner: null,
  };
}
```

- [ ] **Step 4: Reset `legOpened` at the start of each new leg in `finalizeLeg`**

Replace the new-leg block in `finalizeLeg` (lines 140–146):
```js
  // Start new leg
  match.currentLeg += 1;
  match.legStartingPlayer = match.legStartingPlayer === 0 ? 1 : 0;
  match.activePlayer = match.legStartingPlayer;
  const isLocked = match.inMode !== IN_MODES.STRAIGHT;
  match.players[0] = createPlayerState(match.variant);
  match.players[1] = createPlayerState(match.variant);
  if (isLocked) {
    match.players[0].legOpened = false;
    match.players[1].legOpened = false;
  }
  resetLegStats(match.stats[0]);
  resetLegStats(match.stats[1]);
```

- [ ] **Step 5: Verify in browser — open `index.html`, start a match, confirm no console errors. No visible behaviour change yet (straight-in is default).**

---

## Task 2 — `index.html` + `js/ui.js`: setup select and "which dart opened?" modal

**Files:**
- Modify: `index.html`
- Modify: `js/ui.js`

- [ ] **Step 1: Add `sel-in-mode` select to the setup form in `index.html`**

Find the checkout mode select block:
```html
    <div class="form-group">
      <label for="sel-checkout">Tryb wyjścia</label>
      <select id="sel-checkout">
```

Add the in-mode select BEFORE it:
```html
    <div class="form-group">
      <label for="sel-in-mode">Tryb wejścia</label>
      <select id="sel-in-mode">
        <option value="straight" selected>Straight-in (domyślny)</option>
        <option value="double">Double-in</option>
        <option value="master">Master-in</option>
      </select>
    </div>

    <div class="form-group">
      <label for="sel-checkout">Tryb wyjścia</label>
      <select id="sel-checkout">
```

- [ ] **Step 2: Add `modal-which-open-dart` modal to `index.html`**

Find the existing `modal-which-dart` modal:
```html
<!-- Which dart closed the leg? -->
<div class="modal" id="modal-which-dart">
```

Add the new modal BEFORE it:
```html
<!-- Which dart opened the leg? -->
<div class="modal" id="modal-which-open-dart">
  <h3>Którą lotką otworzyłeś lega?</h3>
  <div class="open-dart-options"></div>
</div>

<!-- Which dart closed the leg? -->
<div class="modal" id="modal-which-dart">
```

- [ ] **Step 3: Add `showWhichOpenDartDialog(callback)` to `js/ui.js`**

Add after the existing `showWhichDartDialog` function (around line 201):
```js
function showWhichOpenDartDialog(callback) {
  const modal = document.getElementById('modal-which-open-dart');
  const btnsContainer = modal.querySelector('.open-dart-options');
  btnsContainer.innerHTML = '';

  [1, 2, 3].forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-dart-option';
    btn.textContent = d + '. lotka';
    btn.addEventListener('click', () => {
      closeModal('modal-which-open-dart');
      callback(d);
    });
    btnsContainer.appendChild(btn);
  });

  openModal('modal-which-open-dart');
}
```

- [ ] **Step 4: Verify — open `index.html`, confirm the new select appears on the setup screen with the three options. No console errors.**

---

## Task 3 — `js/app.js`: read `inMode`, locked summary/quick-score flow

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add `pendingOpenScore` and `pendingOpenPlayerIndex` state variables**

At the top of `app.js`, next to the existing pending variables:
```js
let pendingCheckoutScore = null;
let pendingWinnerIndex = null;
let pendingOpenScore = null;
let pendingOpenPlayerIndex = null;
```

- [ ] **Step 2: Read `inMode` in `startMatch()`**

Find the block that reads form values (around line 325):
```js
  const totalLegs = parseInt(document.getElementById('sel-legs').value);
```

Add `inMode` read directly after it:
```js
  const totalLegs = parseInt(document.getElementById('sel-legs').value);
  const inMode    = document.getElementById('sel-in-mode').value;
```

Then pass `inMode` to `createMatch`:
```js
  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, startingPlayer });
```

- [ ] **Step 3: Extract `applySummaryScore(pIdx, val)` helper**

This function contains the existing summary-mode logic AFTER the undo push. It is called for both the normal (unlocked) path and the post-dialog opening path.

Add this function to `app.js` (place it just before `submitSummaryScore`):
```js
// Core summary scoring — called after pushUndoState() has already been called.
function applySummaryScore(pIdx, val) {
  const remainingBefore = match.players[pIdx].score;
  const result = applyVisitScore(match, pIdx, val);

  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    if (isDoubleAttemptScore(remainingBefore)) {
      recordSummaryDoubleAttempts(match.stats[pIdx], 3);
    }
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    return;
  }

  if (result.checkout) {
    pendingCheckoutScore = val;
    pendingWinnerIndex = pIdx;
    const validDarts = getValidClosingDarts(remainingBefore, val);
    if (validDarts.length === 1) {
      handleLegClose(3);
    } else {
      showWhichDartDialog(validDarts, (dartNum) => handleLegClose(dartNum));
    }
    return;
  }

  recordVisit(match.stats[pIdx], val, 3);
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
}
```

- [ ] **Step 4: Rewrite `submitSummaryScore` to use the locked gate and `applySummaryScore`**

Replace the entire existing `submitSummaryScore` function:
```js
function submitSummaryScore() {
  const input = document.getElementById('input-score');
  const val = parseInt(input.value);
  input.value = '';
  input.focus();

  if (isNaN(val) || val < 0 || val > 180 || IMPOSSIBLE_VISIT_SCORES.has(val)) return;

  const pIdx = match.activePlayer;
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !match.players[pIdx].legOpened;

  pushUndoState();

  if (isLocked) {
    if (val === 0) {
      // Missed opening — 3 darts wasted, player stays locked
      recordVisit(match.stats[pIdx], 0, 3);
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
    } else {
      // Non-zero: player claims to have opened the leg — ask which dart
      pendingOpenScore = val;
      pendingOpenPlayerIndex = pIdx;
      showWhichOpenDartDialog((dartNum) => {
        match.players[pendingOpenPlayerIndex].legOpened = true;
        applySummaryScore(pendingOpenPlayerIndex, pendingOpenScore);
        pendingOpenScore = null;
        pendingOpenPlayerIndex = null;
      });
    }
    return;
  }

  applySummaryScore(pIdx, val);
}
```

- [ ] **Step 5: Apply the same locked gate to `submitQuickScore`**

Find the start of `submitQuickScore` (around line 334). After the buffer-clearing block and before `pushUndoState()`, add the locked check:

Replace from `pushUndoState();` to the end of the bust-result block with:
```js
  const pIdx = match.activePlayer;
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !match.players[pIdx].legOpened;

  pushUndoState();

  if (isLocked) {
    // Quick-score buttons always have val > 0 — treat as opening attempt
    pendingOpenScore = val;
    pendingOpenPlayerIndex = pIdx;
    showWhichOpenDartDialog((dartNum) => {
      match.players[pendingOpenPlayerIndex].legOpened = true;
      applySummaryScore(pendingOpenPlayerIndex, pendingOpenScore);
      pendingOpenScore = null;
      pendingOpenPlayerIndex = null;
    });
    return;
  }
```

Then keep the rest of `submitQuickScore` (existing result handling) unchanged. The full rewritten `submitQuickScore`:
```js
function submitQuickScore(val) {
  if (!match || isNaN(val)) return;

  // Clear any in-progress dart buffer
  const player = match.players[match.activePlayer];
  if (player.dartBuffer.length > 0) {
    player.dartBuffer = [];
    renderDartBuffer(match);
  }

  const pIdx = match.activePlayer;
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !match.players[pIdx].legOpened;

  pushUndoState();

  if (isLocked) {
    pendingOpenScore = val;
    pendingOpenPlayerIndex = pIdx;
    showWhichOpenDartDialog((dartNum) => {
      match.players[pendingOpenPlayerIndex].legOpened = true;
      applySummaryScore(pendingOpenPlayerIndex, pendingOpenScore);
      pendingOpenScore = null;
      pendingOpenPlayerIndex = null;
    });
    return;
  }

  const remainingBefore = match.players[pIdx].score;
  const result = applyVisitScore(match, pIdx, val);

  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    if (isDoubleAttemptScore(remainingBefore)) {
      recordSummaryDoubleAttempts(match.stats[pIdx], 3);
    }
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    return;
  }

  if (result.checkout) {
    pendingCheckoutScore = val;
    pendingWinnerIndex = pIdx;
    const validDarts = getValidClosingDarts(remainingBefore, val);
    if (validDarts.length === 1) {
      handleLegClose(3);
    } else {
      showWhichDartDialog(validDarts, (dartNum) => handleLegClose(dartNum));
    }
    return;
  }

  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
}
```

- [ ] **Step 6: Verify — set Double-in mode in setup, start a 101 match. In summary mode: enter 0 → 3 darts added to counter, player switches, score unchanged, both players still locked. Enter non-zero (e.g. 45) → dialog "Którą lotką otworzyłeś lega?" appears with three buttons. Click "1. lotka" → score 45 deducted, player now unlocked. Enter any score next turn → normal play (no dialog).**

---

## Task 4 — `js/app.js`: locked dart-by-dart/board mode + fix push-at-visit-start

**Files:**
- Modify: `js/app.js`

Background: currently `pushUndoState()` is called in three places inside `submitDartValue` (before bust, before checkout, before 3-dart commit). With `legOpened` able to change mid-visit (e.g. player opens on dart 2), those snapshots would capture the wrong `legOpened` value. Fix: push exactly once per visit — at the first dart (empty buffer) — and remove the three internal pushes.

- [ ] **Step 1: Rewrite `submitDartValue` with push-at-visit-start and locked handling**

Replace the entire `submitDartValue` function:
```js
function submitDartValue(base) {
  if (!match) return;
  if (match.inputMode !== INPUT_MODES.DART_BY_DART && match.inputMode !== INPUT_MODES.BOARD) return;

  const multiplier = base === 0 ? 1 : match.currentMultiplier;
  if (base === 25 && multiplier === 3) return; // T25 doesn't exist

  const dartValue = base * multiplier;
  const label = getDartLabel(base, multiplier);

  const pIdx = match.activePlayer;
  const player = match.players[pIdx];

  // Snapshot pre-visit state once (at the first dart of each visit).
  // Doing it here — before any modification — ensures legOpened is captured correctly
  // even when the player opens mid-visit (e.g. locked dart 1, opens on dart 2).
  if (player.dartBuffer.length === 0) {
    pushUndoState();
  }

  // --- Locked leg (double-in / master-in, not yet opened) ---
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !player.legOpened;
  if (isLocked) {
    const opens = isOpeningDart(base, multiplier, match.inMode);
    if (opens) {
      player.legOpened = true;
      // Fall through to normal dart processing with actual dartValue
    } else {
      // Wasted dart — counts toward 3 but scores 0
      const bufSoFar = player.dartBuffer.reduce((a, d) => a + d.value, 0);
      player.dartBuffer.push({ value: 0, label, remainingBefore: player.score - bufSoFar });
      renderDartBuffer(match);
      renderGameScreen(match);

      if (player.dartBuffer.length === 3) {
        // Full visit of wasted darts
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
    }
  }

  // --- Normal dart processing (player is unlocked or just unlocked above) ---
  const bufSoFar = player.dartBuffer.reduce((a, d) => a + d.value, 0);
  const remainingBefore = player.score - bufSoFar;
  const remainingAfter  = remainingBefore - dartValue;

  // Bust detection
  const isOvershot       = remainingAfter < 0;
  const isLeftOnOne      = remainingAfter === 1;
  const isInvalidFinish  = remainingAfter === 0 && !isValidFinish(base, multiplier, match.checkoutMode);

  if (isOvershot || isLeftOnOne || isInvalidFinish) {
    const bustDarts = player.dartBuffer.length + 1;
    showBust();
    player.history.push({ score: bufSoFar, bust: true, darts: bustDarts });
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
  if (remainingAfter === 0) {
    const closingDartNum = player.dartBuffer.length + 1;
    trackDoubleAttempts(match.stats[pIdx], player, remainingBefore, true);
    const visitTotal = bufSoFar + dartValue;
    recordVisit(match.stats[pIdx], visitTotal, closingDartNum);
    player.score = 0;
    player.history.push({ score: visitTotal, bust: false, darts: closingDartNum });
    player.dartBuffer = [];
    pendingCheckoutScore = visitTotal;
    pendingWinnerIndex = pIdx;
    handleLegClose(closingDartNum, true);
    return;
  }

  // Normal dart — add to buffer
  player.dartBuffer.push({ value: dartValue, label, remainingBefore });
  renderDartBuffer(match);
  renderGameScreen(match);

  // Auto-commit after 3rd dart
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

Note: the `bustDarts` variable uses `player.dartBuffer.length + 1` (correct actual count for history display) while `recordVisit` still passes `3` (matching the project's design decision: busts always count as 3 darts for stat purposes).

- [ ] **Step 2: Verify — set Double-in, start a 501 match in dart-by-dart mode.**
  - Throw a non-double (e.g. S20): dart appears in buffer with value 0, score stays 501.
  - Throw another non-double (S20): buffer shows 2 darts with 0.
  - Throw third non-double (S20): auto-commit fires, score stays 501, 3 darts added to counter, player switches. Both players still locked.
  - On next visit throw a double (D20 = 40): dart appears normally with value 40, player is now unlocked.
  - Throw T20 (60) and S1 (1): auto-commit fires, score = 501 − 101 = 400.
  - Undo: score returns to 501, player locked again.

---

## Task 5 — `js/history.js`: save `inMode` in match record

**Files:**
- Modify: `js/history.js`

- [ ] **Step 1: Add `inMode` to the saved record in `saveMatchToHistory`**

Find (around line 18):
```js
    variant: match.variant,
    checkoutMode: match.checkoutMode,
    totalLegs: match.totalLegs,
```

Replace with:
```js
    variant: match.variant,
    checkoutMode: match.checkoutMode,
    inMode: match.inMode || 'straight',
    totalLegs: match.totalLegs,
```

- [ ] **Step 2: Verify — complete a short match (First to 1, 101), open History screen, confirm the record appears correctly. No console errors.**

---

## Task 6 — Final integration test

- [ ] **Test straight-in (default): start 501 First to 2, no entry restriction — both players score normally from dart 1. Confirm no behaviour change.**

- [ ] **Test double-in summary mode:**
  - Start 301 First to 1, Double-in.
  - Player 1 enters 0 → 3 darts added, score 301, player switches.
  - Player 2 enters 45 → dialog appears → select "2. lotka" → score becomes 256.
  - Player 2 is now unlocked; next turn scores normally.
  - Undo after the opening turn → score returns to 301, player locked again.

- [ ] **Test double-in dart-by-dart mode:**
  - Start 301 First to 1, Double-in, switch to Lotka po lotce.
  - Player 1 throws S20 (base=20, multiplier=1) → buffer shows 0, score unchanged.
  - Player 1 throws D20 (base=20, multiplier=2) → buffer shows 40 (opens).
  - Player 1 throws S1 → buffer shows 1. Auto-commit: score = 301 − 41 = 260.
  - Undo → score 301, player locked.

- [ ] **Test master-in dart-by-dart mode:**
  - Start 501 First to 1, Master-in, switch to Lotka po lotce.
  - Throw S20 → wasted (0). Throw D10 (20) → opens. Throw T5 (15) → scores. Auto-commit: score = 501 − 35 = 466.

- [ ] **Test master-in summary mode:**
  - Start 501, Master-in.
  - Enter 0 → wasted turn, score unchanged, player switches.
  - Enter 60 → dialog → "1. lotka" → score becomes 441, player unlocked.

- [ ] **Test new leg resets lock: win a leg, confirm both players are locked at the start of leg 2 (entering non-zero score triggers the dialog again).**

- [ ] **Test history: complete a double-in match, open history, confirm the record is saved without errors.**
