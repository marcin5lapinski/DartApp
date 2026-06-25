# Double Attempts Counting Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix undercounting of double attempts in summary mode by replacing `isDoubleAttemptScore` call sites with a new helper that returns the correct attempt count for direct doubles, setup-needed scores, and extended zone visits.

**Architecture:** Add one pure function `summaryDoubleAttemptCount(remaining, visitScore, isBust)` to `checkouts.js`, then swap the four matching patterns in `app.js`. No new files, no UI changes, no changes to dart-by-dart or checkout logic.

**Tech Stack:** Vanilla JS, no build step. Open `index.html` directly in browser. No working test runner — verification is manual via browser console + playing a leg.

## Global Constraints

- No modal dialogs for double attempt tracking — explicitly rejected.
- `isDoubleAttemptScore` must remain unchanged — still used by `trackDoubleAttempts` (dart-by-dart/board mode).
- Only touch `js/checkouts.js` and `js/app.js`.
- UI, history, stats rendering: no changes.

---

### Task 1: Add `summaryDoubleAttemptCount` to `checkouts.js`

**Files:**
- Modify: `js/checkouts.js:189-192` (after `isDoubleAttemptScore`)

**Interfaces:**
- Consumes: `DOUBLE_FINISHES` (Set, same file, line 187)
- Produces: `summaryDoubleAttemptCount(remaining: number, visitScore: number, isBust: boolean) → number` — used by Task 2

- [ ] **Step 1: Add the function directly after `isDoubleAttemptScore`**

  Open `js/checkouts.js`. After line 192 (closing brace of `isDoubleAttemptScore`), insert:

  ```js
  // Returns how many double attempts to record in summary mode for a non-checkout visit.
  // Branch 1: remaining is a direct double (DOUBLE_FINISHES) → bust=1, normal=3
  // Branch 2: remaining ≤50 but needs setup dart → bust=1, normal=2
  // Branch 3: remaining >50, player left a direct double (remaining−visitScore ∈ DOUBLE_FINISHES) → 2; else 0
  function summaryDoubleAttemptCount(remaining, visitScore, isBust) {
    if (DOUBLE_FINISHES.has(remaining)) return isBust ? 1 : 3;
    if (remaining <= 50)               return isBust ? 1 : 2;
    return DOUBLE_FINISHES.has(remaining - visitScore) ? 2 : 0;
  }
  ```

  The result should look like this in context:

  ```js
  // Is a score a possible double-out attempt? (remaining points where double is the only option)
  function isDoubleAttemptScore(remaining) {
    return DOUBLE_FINISHES.has(remaining);
  }

  // Returns how many double attempts to record in summary mode for a non-checkout visit.
  // Branch 1: remaining is a direct double (DOUBLE_FINISHES) → bust=1, normal=3
  // Branch 2: remaining ≤50 but needs setup dart → bust=1, normal=2
  // Branch 3: remaining >50, player left a direct double (remaining−visitScore ∈ DOUBLE_FINISHES) → 2; else 0
  function summaryDoubleAttemptCount(remaining, visitScore, isBust) {
    if (DOUBLE_FINISHES.has(remaining)) return isBust ? 1 : 3;
    if (remaining <= 50)               return isBust ? 1 : 2;
    return DOUBLE_FINISHES.has(remaining - visitScore) ? 2 : 0;
  }
  ```

- [ ] **Step 2: Verify the function in browser console**

  Open `index.html` in browser. Open DevTools console and run:

  ```js
  // Direct double, normal → 3
  console.assert(summaryDoubleAttemptCount(40, 0, false) === 3, 'fail: D20 normal');
  // Direct double, bust → 1
  console.assert(summaryDoubleAttemptCount(40, 60, true) === 1, 'fail: D20 bust');
  // Setup-needed ≤50, normal → 2
  console.assert(summaryDoubleAttemptCount(41, 1, false) === 2, 'fail: 41 normal');
  console.assert(summaryDoubleAttemptCount(41, 0, false) === 2, 'fail: 41 all miss');
  // Setup-needed ≤50, bust (leaves 1) → 1
  console.assert(summaryDoubleAttemptCount(41, 40, true) === 1, 'fail: 41 bust');
  // Extended >50, leaves D20 → 2
  console.assert(summaryDoubleAttemptCount(57, 17, false) === 2, 'fail: 57→40');
  console.assert(summaryDoubleAttemptCount(100, 60, false) === 2, 'fail: 100→40');
  // Extended >50, no direct double left → 0
  console.assert(summaryDoubleAttemptCount(57, 0, false) === 0, 'fail: 57 all miss');
  // Extended >50, bust → 0 (auto: remaining-bust < 0 or =1)
  console.assert(summaryDoubleAttemptCount(52, 53, true) === 0, 'fail: 52 bust over');
  console.assert(summaryDoubleAttemptCount(52, 51, true) === 0, 'fail: 52 bust leave 1');
  console.log('All assertions passed');
  ```

  Expected output: `All assertions passed` (no assertion errors in console).

- [ ] **Step 3: Commit**

  ```bash
  git add js/checkouts.js
  git commit -m "feat: add summaryDoubleAttemptCount helper for summary-mode double tracking"
  ```

---

### Task 2: Replace 4 call sites in `app.js`

**Files:**
- Modify: `js/app.js` — 4 locations (L1046-1048, L1070-1072, L1089-1091, L1113-1115)

**Interfaces:**
- Consumes: `summaryDoubleAttemptCount(remaining, visitScore, isBust)` from Task 1
- Consumes: `recordSummaryDoubleAttempts(stats, count)` from `stats.js` (unchanged)

There are two functions that each contain one bust path and one normal-visit path:
- **Quick-score button handler** (anonymous function, ~L1041): bust ~L1046, normal ~L1070
- **`applySummaryScore`** (~L1083): bust ~L1089, normal ~L1113

All four replacements follow the same mechanical swap.

- [ ] **Step 1: Replace bust path in quick-score button handler (~L1046)**

  Find this block (within the anonymous handler around line 1044):
  ```js
  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    if (isDoubleAttemptScore(remainingBefore)) {
      recordSummaryDoubleAttempts(match.stats[pIdx], 3);
    }
    showBust();
  ```

  Replace with:
  ```js
  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    const da = summaryDoubleAttemptCount(remainingBefore, val, true);
    if (da > 0) recordSummaryDoubleAttempts(match.stats[pIdx], da);
    showBust();
  ```

- [ ] **Step 2: Replace normal-visit path in quick-score button handler (~L1070)**

  Find this block (right before `switchPlayer`, around line 1070):
  ```js
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLastVisitWarning();
  if (checkLegVisitLimit()) return;
  }
  ```

  Replace with:
  ```js
  const da = summaryDoubleAttemptCount(remainingBefore, val, false);
  if (da > 0) recordSummaryDoubleAttempts(match.stats[pIdx], da);
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLastVisitWarning();
  if (checkLegVisitLimit()) return;
  }
  ```

- [ ] **Step 3: Replace bust path in `applySummaryScore` (~L1089)**

  Find this block inside `applySummaryScore` (around line 1087):
  ```js
  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    if (isDoubleAttemptScore(remainingBefore)) {
      recordSummaryDoubleAttempts(match.stats[pIdx], 3);
    }
    showBust();
  ```

  Replace with:
  ```js
  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    const da = summaryDoubleAttemptCount(remainingBefore, val, true);
    if (da > 0) recordSummaryDoubleAttempts(match.stats[pIdx], da);
    showBust();
  ```

- [ ] **Step 4: Replace normal-visit path in `applySummaryScore` (~L1113)**

  Find this block inside `applySummaryScore` (around line 1113):
  ```js
  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLastVisitWarning();
  if (checkLegVisitLimit()) return;
  }
  ```

  Replace with:
  ```js
  const da = summaryDoubleAttemptCount(remainingBefore, val, false);
  if (da > 0) recordSummaryDoubleAttempts(match.stats[pIdx], da);
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLastVisitWarning();
  if (checkLegVisitLimit()) return;
  }
  ```

- [ ] **Step 5: Verify in browser — play a leg**

  Open `index.html`. Start a 501 double-out match in summary mode. Play through to a finish:

  1. Score down to remaining **41** and enter **1** (setup hit, 2 double misses). After the visit, open DevTools console and check: `match.stats[0].doubleAttempts` — should increase by **2**.
  2. From remaining **40**, enter **0** (3 misses at D20). `doubleAttempts` should increase by **3**.
  3. From remaining **40**, enter **40** (checkout). When asked which dart, choose dart 2. Finish the leg.
  4. View post-match stats. The "Trafione double" row should show a percentage and the total counts (e.g. `1/7` for this scenario).
  5. Also verify: from remaining **57**, entering **17** gives +2 to doubleAttempts. Check in console mid-visit.

- [ ] **Step 6: Commit**

  ```bash
  git add js/app.js
  git commit -m "fix: use summaryDoubleAttemptCount in summary mode — bust=1, setup≤50=2, extended=2"
  ```
