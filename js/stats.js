// Statistics module — tracks per-leg and per-match stats for each player

function createPlayerStats() {
  return {
    // Per-match accumulators
    totalDartsThrown: 0,
    totalPointsScored: 0,
    legsWon: 0,
    highestCheckout: 0,
    fastestLeg: null,       // darts thrown in fastest won leg; null = no leg won yet
    doubleAttempts: 0,
    doubleHits: 0,

    // Current leg state
    legDarts: 0,
    legPoints: 0,
    legFirst9Scores: [],    // visit scores (up to 3 visits = first 9 darts)
    legFirst9Darts: 0,      // actual dart count accumulated in those visits
    legDoubleAttempts: 0,
    legDoubleHits: 0,

    // History per leg
    legs: [],               // array of completed leg snapshots
  };
}

// Called at start of each new leg
function resetLegStats(stats) {
  stats.legDarts = 0;
  stats.legPoints = 0;
  stats.legFirst9Scores = [];
  stats.legFirst9Darts = 0;
  stats.legDoubleAttempts = 0;
  stats.legDoubleHits = 0;
}

// Called after each completed visit. dartCount defaults to 3 (summary mode).
// In dart-by-dart mode, pass the actual number of darts thrown (1, 2, or 3).
function recordVisit(stats, score, dartCount) {
  const darts = dartCount || 3;
  stats.legDarts += darts;
  stats.legPoints += score;
  stats.totalDartsThrown += darts;
  stats.totalPointsScored += score;
  if (stats.legFirst9Scores.length < 3) {
    stats.legFirst9Scores.push(score);
    stats.legFirst9Darts += darts;
  }
}

// Called after each individual dart in dart-by-dart mode (unused in current flow — kept for API)
function recordDart(stats, score, isDoubleAttempt, isHit) {
  stats.legDarts += 1;
  stats.legPoints += score;
  stats.totalDartsThrown += 1;
  stats.totalPointsScored += score;
  if (isDoubleAttempt) {
    stats.legDoubleAttempts += 1;
    stats.doubleAttempts += 1;
    if (isHit) {
      stats.legDoubleHits += 1;
      stats.doubleHits += 1;
    }
  }
  const visitIndex = Math.floor((stats.legDarts - 1) / 3);
  if (visitIndex < 3) {
    if (!stats.legFirst9Scores[visitIndex]) stats.legFirst9Scores[visitIndex] = 0;
    stats.legFirst9Scores[visitIndex] += score;
    stats.legFirst9Darts += 1;
  }
}

// Called when a player wins a leg.
// isDartByDart: true when called from dart-by-dart / board mode — stats.legDarts already reflects
// the exact count (recordVisit was called with the real dartCount before this call).
function recordLegWin(stats, startingScore, checkoutScore, dartNumber, isDartByDart) {
  let actualLegDarts;
  if (isDartByDart) {
    actualLegDarts = stats.legDarts; // already exact
  } else {
    // Summary mode: recordVisit always adds 3; correct for the final partial visit
    const dartsInFinalVisit = dartNumber || 3;
    const adj = 3 - dartsInFinalVisit;
    actualLegDarts = stats.legDarts - adj;

    // Fix totalDartsThrown — was over-counted by adj in the closing visit
    if (adj > 0) {
      stats.totalDartsThrown -= adj;

      // Fix legFirst9Darts if the closing visit was within the first 3 visits.
      // stats.legDarts at this point = totalVisits × 3 (summary mode).
      const totalVisitsInLeg = stats.legDarts / 3;
      if (totalVisitsInLeg <= 3) {
        stats.legFirst9Darts -= adj;
      }
    }
  }

  stats.legsWon += 1;
  if (checkoutScore > stats.highestCheckout) stats.highestCheckout = checkoutScore;
  if (stats.fastestLeg === null || actualLegDarts < stats.fastestLeg) stats.fastestLeg = actualLegDarts;

  // Double attempt tracking for summary mode only.
  if (!isDartByDart && dartNumber !== null && dartNumber !== undefined) {
    // If the checkout score is itself a double (e.g. 40 = D20), every dart before
    // the closing one was also aimed at that double → dartNumber attempts total.
    // If the checkout required a setup dart first (score not in DOUBLE_FINISHES,
    // e.g. 51 = S19 + D16), one dart was setup and the rest were double attempts
    // → dartNumber - 1 attempts total.
    const isDirectDouble = DOUBLE_FINISHES.has(checkoutScore);
    const doubleAttempts = isDirectDouble ? dartNumber : dartNumber - 1;
    stats.doubleAttempts += doubleAttempts;
    stats.legDoubleAttempts += doubleAttempts;
    stats.doubleHits += 1;
    stats.legDoubleHits += 1;
  }

  const first9Sum = stats.legFirst9Scores.reduce((a, b) => a + b, 0);
  const first9Visits = stats.legFirst9Scores.length;
  const first9Darts = stats.legFirst9Darts; // actual dart count for the first ≤9 darts

  const legSnapshot = {
    dartsThrown: actualLegDarts,
    pointsScored: stats.legPoints,
    average: actualLegDarts > 0 ? stats.legPoints / (actualLegDarts / 3) : 0,
    first9Sum,
    first9Visits,
    first9Darts,
    checkout: checkoutScore,
    doubleAttempts: stats.legDoubleAttempts,
    doubleHits: stats.legDoubleHits,
  };
  stats.legs.push(legSnapshot);

  // Clear so getFirst9Average doesn't double-count data already captured in the snapshot
  stats.legFirst9Scores = [];
  stats.legFirst9Darts = 0;
}

// Called when a leg ends because both players hit the visit limit (no checkout made).
// Does NOT update highestCheckout or fastestLeg (no checkout occurred).
// Pushes a leg snapshot (needed for getFirst9Average) and clears leg-first-9 state.
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

// Track unambiguous double attempts in summary mode for non-checkout visits:
// - bust when remaining was a double-finish score → 3 attempts, 0 hits
// - score=0 when remaining was a double-finish score → 3 attempts, 0 hits
function recordSummaryDoubleAttempts(stats, attempts) {
  stats.doubleAttempts += attempts;
  stats.legDoubleAttempts += attempts;
}

function getMatchAverage(stats) {
  if (stats.totalDartsThrown === 0) return 0;
  return (stats.totalPointsScored / stats.totalDartsThrown) * 3;
}

function getDoublePercentage(stats) {
  if (stats.doubleAttempts === 0) return null;
  return (stats.doubleHits / stats.doubleAttempts) * 100;
}

function getFirst9Average(stats) {
  let totalSum = 0;
  let totalDarts = 0;

  for (const leg of stats.legs) {
    totalSum += leg.first9Sum || 0;
    // Use first9Darts when available (new field); fall back to visits×3 for old saved data
    totalDarts += leg.first9Darts != null ? leg.first9Darts : (leg.first9Visits || 0) * 3;
  }

  // Include current (in-progress) leg data — present when player hasn't won this leg yet
  // (legFirst9Scores is cleared in recordLegWin for legs that were won, so no double-counting)
  if (stats.legFirst9Scores.length > 0) {
    totalSum += stats.legFirst9Scores.reduce((a, b) => a + b, 0);
    totalDarts += stats.legFirst9Darts;
  }

  if (totalDarts === 0) return 0;
  return (totalSum / totalDarts) * 3;
}
