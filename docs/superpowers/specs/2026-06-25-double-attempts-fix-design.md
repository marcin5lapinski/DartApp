# Double Attempts Counting Fix — Design Spec

**Date:** 2026-06-25
**Branch:** feature/tournament-stats

## Problem

In summary mode, the app undercounts double attempts. The root cause is `isDoubleAttemptScore(remaining)` which returns `true` only for the 21 direct-double values in `DOUBLE_FINISHES` (`{2, 4, 6, …, 40, 50}`). Two gaps:

1. **Setup-needed scores ≤ 50** (e.g. 41, 43, 42, 44 — scores where no single double exists): 0 attempts counted, but player throws 1 setup dart + 2 darts at a double → should be 2.
2. **Scores > 50 where player sets up to leave a direct double** (e.g. remaining=57, scores 17 → leaves 40=D20): 0 counted, should be 2.

Additionally, **bust handling is wrong**: from a direct-double remaining (e.g. 40), a bust currently counts as 3 attempts, but the player aimed once and the dart went wrong — it should count as 1.

## Out of Scope

- Dart-by-dart / board mode (`trackDoubleAttempts`) — already counts per-dart accurately.
- Master-out and straight-out modes — double stat is only displayed for double-out; no behaviour change needed.
- Adding a modal to ask the player — explicitly rejected.

## Solution

Replace the four `isDoubleAttemptScore` call sites in `app.js` (summary mode only) with a new helper that returns a count.

### New function: `summaryDoubleAttemptCount` — added to `checkouts.js`

```js
function summaryDoubleAttemptCount(remaining, visitScore, isBust) {
  if (DOUBLE_FINISHES.has(remaining)) return isBust ? 1 : 3;
  if (remaining <= 50)               return isBust ? 1 : 2;
  return DOUBLE_FINISHES.has(remaining - visitScore) ? 2 : 0;
}
```

**Branch 1 — Direct double** (`remaining ∈ DOUBLE_FINISHES`, e.g. 40):
- Normal visit (3 misses at D20): **3 attempts**
- Bust (aimed at D20, hit T20 → over-score): **1 attempt**

**Branch 2 — Setup-needed, ≤ 50** (e.g. 41, 43, 42, 44):
- Normal visit (1 setup dart + 2 misses at double): **2 attempts**
- Bust (aimed at double directly from odd remaining, leaves 1): **1 attempt**
- Bust from remaining > 50: automatically 0 (remaining − visitScore will be negative or 1, never in DOUBLE_FINISHES)

**Branch 3 — Extended zone, > 50**:
- `remaining − visitScore ∈ DOUBLE_FINISHES`: player set up to leave a direct double, darts 2+3 at that double → **2 attempts** (e.g. remaining=57, scores 17 → leaves 40)
- Bust (remaining − bustScore ≤ 0 or = 1, never in DOUBLE_FINISHES): **0 attempts** — auto-handled, no isBust flag needed here
- All other visits: **0 attempts**

`isDoubleAttemptScore` is kept unchanged — still used by `trackDoubleAttempts` in dart-by-dart/board mode.

### Changes to `app.js`

Four call sites, each following the same pattern:

```js
// BEFORE (bust path, ~L1046 and ~L1089):
if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
}

// AFTER:
const da = summaryDoubleAttemptCount(remainingBefore, val, true);
if (da > 0) recordSummaryDoubleAttempts(match.stats[pIdx], da);

// BEFORE (normal visit path, ~L1070 and ~L1113):
if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
}

// AFTER:
const da = summaryDoubleAttemptCount(remainingBefore, val, false);
if (da > 0) recordSummaryDoubleAttempts(match.stats[pIdx], da);
```

`val` is the entered visit score in all four cases (the bust score or the normal score).

### No changes to

| Location | Reason |
|---|---|
| `recordLegWin` in `stats.js` | Checkout double attempt logic already correct |
| `trackDoubleAttempts` in `app.js` | Dart-by-dart path; counts per-dart accurately |
| `recordSummaryDoubleAttempts` | Helper unchanged |
| UI / history rendering | Display logic unchanged |

## Test Cases

| Scenario | remaining | score | bust | Expected attempts |
|---|---|---|---|---|
| Direct double, 3 misses | 40 | 0 | no | 3 |
| Direct double, bust (T20 from D20) | 40 | bust | yes | 1 |
| Setup-needed ≤50, normal | 41 | 1 | no | 2 |
| Setup-needed ≤50, all misses | 41 | 0 | no | 2 |
| Setup-needed ≤50, bust | 41 | 40 (leaves 1) | yes | 1 |
| Extended >50, setup leaves D20 | 57 | 17 | no | 2 |
| Extended >50, T20 leaves D20 | 100 | 60 | no | 2 |
| Extended >50, no direct double left | 57 | 0 | no | 0 |
| Extended >50, bust | 52 | bust | yes | 0 |
