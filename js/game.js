// X01 Game Logic Module

const INPUT_MODES = { SUMMARY: 'summary', DART_BY_DART: 'dartbydart', BOARD: 'board' };
const CHECKOUT_MODES = { DOUBLE: 'double', MASTER: 'master', STRAIGHT: 'straight' };
const IN_MODES = { STRAIGHT: 'straight', DOUBLE: 'double', MASTER: 'master' };

// Returns true if this dart qualifies as a leg-opening dart for the given inMode.
// base is accepted for API symmetry with isValidFinish but unused —
// all standard in-mode rules depend only on multiplier.
function isOpeningDart(base, multiplier, inMode) {
  if (inMode === IN_MODES.STRAIGHT) return true;
  if (inMode === IN_MODES.DOUBLE)   return multiplier === 2;
  if (inMode === IN_MODES.MASTER)   return multiplier === 2 || multiplier === 3;
  return true;
}

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
    totalSets: config.totalSets || 1,
    currentSet: 1,
    setsWon: [0, 0],
    legsWonInSet: [0, 0],
    setStartingPlayer: config.startingPlayer ?? 0,

    players: [p0, p1],
    stats: [createPlayerStats(), createPlayerStats()],
    matchOver: false,
    winner: null,
    playerFavorites: config.playerFavorites || [null, null],
  };
}

function createPlayerState(startScore) {
  return {
    score: startScore,
    history: [],     // { score, bust, darts } per visit in current leg
    dartBuffer: [],  // { value, label, remainingBefore } per dart in current visit
    legOpened: true,  // true = straight-in default; caller sets false for double-in/master-in
  };
}

// --- Bust detection ---

function isBust(remaining, thrown, checkoutMode) {
  if (thrown > remaining) return true;
  if (thrown === 1) return false; // 1 is never reachable as double (except D0.5 lol), bust

  const result = remaining - thrown;
  if (result === 0) return false; // WIN — handled separately
  if (result === 1) return true;  // Can't finish on 1 in double-out or master-out

  if (checkoutMode === CHECKOUT_MODES.STRAIGHT) return false;
  // double-out / master-out: result must still be reachable as a finish
  // result of 1 already handled; anything ≥ 2 is fine for double-out purposes mid-leg
  return false;
}

// Check if a score closes the leg
// lastDartValue: the value of the final dart (needed for double-out / master-out)
function isCheckout(remaining, thrown, checkoutMode, lastDartValue, isDartByDart) {
  if (thrown !== remaining) return false;

  if (checkoutMode === CHECKOUT_MODES.STRAIGHT) return true;

  if (!isDartByDart) {
    // Summary mode: we ask which dart closed via dialog — trust the player's input
    return true;
  }

  // Dart-by-dart: we know the exact last dart
  if (checkoutMode === CHECKOUT_MODES.DOUBLE) {
    // Valid doubles: D1-D20 (even numbers 2-40) and Bull (50)
    return DOUBLE_FINISHES.has(lastDartValue);
  }
  if (checkoutMode === CHECKOUT_MODES.MASTER) {
    // Valid: double or triple (multiples of 3 from 3-60, plus doubles)
    return DOUBLE_FINISHES.has(lastDartValue) || isTriple(lastDartValue);
  }
  return true;
}

function isTriple(value) {
  if (value < 3 || value > 60) return false;
  return value % 3 === 0;
}

// --- Summary mode: apply a 3-dart visit score ---
// Returns: { bust, checkout, newScore, dartsToClose (null until checkout) }
function applyVisitScore(match, playerIndex, visitScore) {
  const player = match.players[playerIndex];
  const remaining = player.score;
  const checkoutMode = match.checkoutMode;

  if (visitScore > remaining || (remaining - visitScore) === 1) {
    // Bust
    player.history.push({ score: visitScore, bust: true, darts: 3 });
    return { bust: true, checkout: false, newScore: remaining };
  }

  const newScore = remaining - visitScore;

  if (newScore === 0) {
    // Checkout — in summary mode we'll ask which dart via dialog
    player.score = 0;
    player.history.push({ score: visitScore, bust: false, darts: 3 });
    recordVisit(match.stats[playerIndex], visitScore);
    return { bust: false, checkout: true, newScore: 0 };
  }

  // Normal visit
  player.score = newScore;
  player.history.push({ score: visitScore, bust: false, darts: 3 });
  recordVisit(match.stats[playerIndex], visitScore);
  return { bust: false, checkout: false, newScore };
}

// Returns true if the last dart is a valid leg-closing dart for the given checkout mode
function isValidFinish(base, multiplier, checkoutMode) {
  if (checkoutMode === CHECKOUT_MODES.STRAIGHT) return true;
  if (checkoutMode === CHECKOUT_MODES.DOUBLE) return multiplier === 2;
  if (checkoutMode === CHECKOUT_MODES.MASTER) return multiplier >= 2;
  return false;
}

// --- Finalize leg after checkout ---
// isDartByDart: pass true from dart-by-dart mode so stats are handled correctly
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

function switchPlayer(match) {
  match.activePlayer = match.activePlayer === 0 ? 1 : 0;
}

// All scores achievable with a single dart (singles 1-20, green bull 25,
// doubles D1-D20 + Bull, triples T1-T20)
const VALID_DART_VALUES = (() => {
  const s = new Set();
  for (let i = 1; i <= 20; i++) {
    s.add(i);       // single
    s.add(i * 2);   // double
    s.add(i * 3);   // triple
  }
  s.add(25);  // green bull (S25)
  s.add(50);  // double bull
  return s;
})();

// Which dart options (1, 2, 3) could have closed the leg in summary mode.
// checkoutScore === startRemaining always (called only on exact checkout).
function getValidClosingDarts(startRemaining, checkoutScore) {
  const valid = [];

  // Dart 1: the entire visit score is itself a valid 1-dart double finish
  if (DOUBLE_FINISHES.has(checkoutScore)) {
    valid.push(1);
  }

  // Dart 2: first dart scored X (0 = miss, or any valid dart value),
  // second dart = checkoutScore - X must land on a double finish.
  // Iterate over all possible closing doubles and check if the preceding dart is valid.
  for (const d of DOUBLE_FINISHES) {
    const x = checkoutScore - d;
    if (x < 0) continue;
    // x === 0: first dart was a miss (valid throw)
    // x  > 0: first dart scored x, must be a valid single-dart value
    if (x === 0 || VALID_DART_VALUES.has(x)) {
      valid.push(2);
      break;
    }
  }

  // Dart 3: always possible (e.g. two misses then a double)
  valid.push(3);

  return [...new Set(valid)].sort();
}

// Which dart options (1, 2, 3) could have opened the leg in summary mode.
// score: total points scored in the opening visit.
// For dart 3: opener must equal score exactly (two misses before it).
// For dart 2: opener + one-dart remainder = score.
// For dart 1: opener + two-dart remainder = score (max two-dart = 120).
function getValidOpeningDarts(score, inMode) {
  if (inMode === IN_MODES.STRAIGHT) return [1, 2, 3];

  // Build the set of valid opening dart values for this inMode
  const openers = new Set(DOUBLE_FINISHES); // doubles always valid
  if (inMode === IN_MODES.MASTER) {
    for (let i = 1; i <= 20; i++) openers.add(i * 3); // T1–T20
  }

  const valid = [];

  // Dart 1: opener on dart 1, darts 2+3 score (score−opener), max two-dart total = 120
  for (const d of openers) {
    if (d <= score && score - d <= 120) { valid.push(1); break; }
  }

  // Dart 2: dart 1 missed (0), dart 2 = opener (d), dart 3 = score−d (0 = miss or valid dart)
  for (const d of openers) {
    if (d <= score && (score - d === 0 || VALID_DART_VALUES.has(score - d))) {
      valid.push(2); break;
    }
  }

  // Dart 3: darts 1+2 missed, dart 3 = opener = score exactly
  if (openers.has(score)) valid.push(3);

  // Fallback — should not happen with valid input, but avoids an empty dialog
  return valid.length > 0 ? valid.sort((a, b) => a - b) : [1, 2, 3];
}
