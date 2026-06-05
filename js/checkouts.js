// Checkout hints for double-out (2–170)
// Each entry: score -> array of suggested dart sequences
const CHECKOUT_TABLE = {
  170: ["T20 T20 Bull"],
  167: ["T20 T19 Bull"],
  164: ["T20 T18 Bull"],
  161: ["T20 T17 Bull"],
  160: ["T20 T20 D20"],
  158: ["T20 T20 D19"],
  157: ["T20 T19 D20"],
  156: ["T20 T20 D18"],
  155: ["T20 T19 D19"],
  154: ["T20 T18 D20"],
  153: ["T20 T19 D18"],
  152: ["T20 T20 D16"],
  151: ["T20 T17 D20"],
  150: ["T20 T18 D18", "T20 T20 D15"],
  149: ["T20 T19 D16"],
  148: ["T20 T16 D20", "T20 T18 D17"],
  147: ["T20 T17 D18"],
  146: ["T20 T18 D16"],
  145: ["T20 T15 D20", "T20 T19 D14"],
  144: ["T20 T16 D18"],
  143: ["T20 T17 D16"],
  142: ["T20 T14 D20", "T20 T18 D14"],
  141: ["T20 T15 D18"],
  140: ["T20 T16 D16", "T20 T20 D10"],
  139: ["T20 T13 D20", "T19 T14 D20"],
  138: ["T20 T14 D18"],
  137: ["T20 T15 D16", "T20 T19 D10"],
  136: ["T20 T12 D20", "T20 T16 D14"],
  135: ["T20 T13 D18", "Bull T15 D20"],
  134: ["T20 T14 D16", "T20 T16 D13"],
  133: ["T20 T19 D8", "T20 T11 D20"],
  132: ["T20 T12 D18", "Bull T14 D20"],
  131: ["T20 T13 D16", "T20 T11 D19"],
  130: ["T20 T20 D5", "T20 T10 D20"],
  129: ["T19 T12 D18", "T20 T11 D18"],
  128: ["T18 T14 D16", "T20 T12 D16"],
  127: ["T19 T10 D20", "T20 T11 D17"],
  126: ["T19 T11 D18", "T20 T10 D18"],
  125: ["T20 T15 D10", "T20 S25 D20", "T19 T14 D13"],
  124: ["T20 T14 D11", "T20 T16 D8"],
  123: ["T19 T12 D15", "T20 T13 D12"],
  122: ["T18 T12 D16", "T20 T10 D16"],
  121: ["T20 T11 D14", "T17 T16 D11"],
  120: ["T20 S20 D20", "T20 T10 D15"],
  119: ["T19 T12 D13", "T20 T9 D16"],
  118: ["T20 S18 D20", "T18 T12 D14"],
  117: ["T20 S17 D20", "T19 T10 D15"],
  116: ["T20 S16 D20", "T19 T11 D13"],
  115: ["T19 S18 D20", "T20 S15 D20"],
  114: ["T20 S14 D20", "T19 S17 D20"],
  113: ["T20 S13 D20", "T19 S16 D20"],
  112: ["T20 S12 D20", "T19 S15 D20"],
  111: ["T20 S11 D20", "T19 S14 D20"],
  110: ["T20 Bull", "T20 S10 D20", "T19 S13 D20", "T18 S16 D20"],
  109: ["T20 S9 D20", "T19 S12 D20"],
  108: ["T20 S8 D20", "T19 S11 D20"],
  107: ["T19 Bull", "T19 S10 D20", "T20 S7 D20"],
  106: ["T20 S6 D20", "T19 S9 D20"],
  105: ["T20 S5 D20", "T19 S8 D20"],
  104: ["T18 Bull", "T20 S4 D20", "T18 S10 D20"],
  103: ["T20 S3 D20", "T19 S6 D20"],
  102: ["T20 S2 D20", "T19 S5 D20"],
  101: ["T17 Bull", "T20 S1 D20", "T17 S10 D20"],
  100: ["T20 D20", "Bull D25"],
  99:  ["T19 S10 D16", "T20 S3 D18"],
  98:  ["T20 D19", "T18 S4 D20"],
  97:  ["T19 D20", "T20 S1 D18"],
  96:  ["T20 D18", "T20 S16 D10"],
  95:  ["T19 D19", "T15 Bull"],
  94:  ["T18 D20", "T20 D17"],
  93:  ["T19 D18", "T20 S13 D10"],
  92:  ["T20 D16", "T18 D19"],
  91:  ["T17 D20", "T19 D17"],
  90:  ["T18 D18", "T20 D15"],
  89:  ["T19 D16", "T17 D19"],
  88:  ["T20 D14", "T16 D20"],
  87:  ["T17 D18", "T19 D15"],
  86:  ["T18 D16", "T20 D13"],
  85:  ["T15 D20", "T19 D14"],
  84:  ["T20 D12", "T16 D18"],
  83:  ["T17 D16", "T19 D13"],
  82:  ["T14 D20", "T18 D14"],
  81:  ["T19 D12", "T15 D18"],
  80:  ["T20 D10", "T16 D16"],
  79:  ["T13 D20", "T19 D11"],
  78:  ["T18 D12", "T14 D18"],
  77:  ["T19 D10", "T15 D16"],
  76:  ["T20 D8", "T16 D14"],
  75:  ["T17 D12", "T13 D18", "S25 Bull"],
  74:  ["T14 D16", "T18 D10"],
  73:  ["T19 D8", "T11 D20"],
  72:  ["T16 D12", "T12 D18"],
  71:  ["T13 D16", "T19 D7"],
  70:  ["T18 D8", "T10 D20"],
  69:  ["T19 D6", "T11 D18"],
  68:  ["T20 D4", "T16 D10"],
  67:  ["T17 D8", "T9 D20"],
  66:  ["T10 D18", "T14 D12"],
  65:  ["S25 D20", "T19 D4", "T11 D16", "T15 D10"],
  64:  ["T16 D8", "T14 D11"],
  63:  ["T13 D12", "T17 D6"],
  62:  ["T10 D16", "T12 D13"],
  61:  ["T15 D8", "T11 D14"],
  60:  ["S20 D20", "T12 D12"],
  59:  ["S19 D20", "T13 D10"],
  58:  ["S18 D20", "T10 D14"],
  57:  ["S17 D20", "T13 D9"],
  56:  ["S16 D20", "T8 D16"],
  55:  ["S15 D20", "T13 D8"],
  54:  ["S14 D20", "T10 D12"],
  53:  ["S13 D20", "T11 D10"],
  52:  ["S12 D20", "T4 D20"],
  51:  ["S11 D20", "T13 D6"],
  50:  ["Bull", "S10 D20"],
  49:  ["S9 D20", "T7 D14"],
  48:  ["S16 D16", "S8 D20"],
  47:  ["S15 D16", "S7 D20"],
  46:  ["S14 D16", "S6 D20"],
  45:  ["S13 D16", "S5 D20"],
  44:  ["S12 D16", "S4 D20"],
  43:  ["S11 D16", "S3 D20"],
  42:  ["S10 D16", "S2 D20"],
  41:  ["S9 D16", "S1 D20"],
  39:  ["S7 D16", "S19 D10"],
  37:  ["S5 D16", "S17 D10"],
  35:  ["S3 D16", "S15 D10"],
  33:  ["S1 D16", "S13 D10"],
  31:  ["S7 D12", "S15 D8"],
  29:  ["S13 D8", "S9 D10"],
  27:  ["S11 D8", "S7 D10"],
  25:  ["S9 D8", "S5 D10"],
  23:  ["S7 D8", "S3 D10"],
  21:  ["S5 D8", "S1 D10"],
  19:  ["S3 D8", "S7 D6"],
  17:  ["S1 D8", "S9 D4"],
  15:  ["S7 D4", "S1 D7"],
  13:  ["S5 D4", "S7 D3"],
  11:  ["S3 D4", "S1 D5"],
  9:   ["S1 D4", "S3 D3"],
  7:   ["S3 D2", "S1 D3"],
  5:   ["S1 D2", "S3 D1"],
  3:   ["S1 D1"],
  40:  ["D20"],
  38:  ["D19"],
  36:  ["D18"],
  34:  ["D17"],
  32:  ["D16"],
  30:  ["D15"],
  28:  ["D14"],
  26:  ["D13"],
  24:  ["D12"],
  22:  ["D11"],
  20:  ["D10"],
  18:  ["D9"],
  16:  ["D8"],
  14:  ["D7"],
  12:  ["D6"],
  10:  ["D5"],
  8:   ["D4"],
  6:   ["D3"],
  4:   ["D2"],
  2:   ["D1"],
};

// Returns checkout hint string or null.
// maxDarts (optional): only return hints requiring ≤ maxDarts darts.
function getCheckoutHint(score, maxDarts) {
  if (score < 2 || score > 170) return null;
  const hints = CHECKOUT_TABLE[score];
  if (!hints) return null;
  if (!maxDarts || maxDarts >= 3) return hints[0];
  const filtered = hints.filter(h => h.split(' ').length <= maxDarts);
  return filtered.length > 0 ? filtered[0] : null;
}

// Returns all checkout hints for a score
function getAllCheckoutHints(score) {
  if (score < 2 || score > 170) return [];
  return CHECKOUT_TABLE[score] || [];
}

// Scores reachable in exactly 1 dart on a double field (for double-out detection)
// double fields: D1(2), D2(4)...D20(40), Bull(50)
const DOUBLE_FINISHES = new Set([2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,50]);

// Is a score a possible double-out attempt? (remaining points where double is the only option)
function isDoubleAttemptScore(remaining) {
  return DOUBLE_FINISHES.has(remaining);
}

// --- Favorite-double checkout path finder ---

// All valid setup dart values (non-closing), ordered best to worst.
// Bull (50) is technically a double but is an accepted setup dart in standard checkout paths
// (e.g. Bull + D16 = 82, Bull + Bull + D16 = 132), so it is included here as an exception.
const SETUP_DARTS_ORDERED = [
  [60, 'T20'], [57, 'T19'], [54, 'T18'], [51, 'T17'], [50, 'Bull'], [48, 'T16'],
  [45, 'T15'], [42, 'T14'], [39, 'T13'], [36, 'T12'], [33, 'T11'],
  [30, 'T10'], [27, 'T9'],  [24, 'T8'],  [21, 'T7'],
  [20, 'S20'], [19, 'S19'], [18, 'S18'], [17, 'S17'], [16, 'S16'],
  [15, 'S15'], [14, 'S14'], [13, 'S13'], [12, 'S12'], [11, 'S11'],
  [10, 'S10'], [9,  'S9'],  [8,  'S8'],  [7,  'S7'],  [6,  'S6'],
  [5,  'S5'],  [4,  'S4'],  [3,  'S3'],  [2,  'S2'],  [1,  'S1'],
  [25, 'S25'],
];

// Map from numeric value → label for O(1) lookup
const SETUP_DART_LABEL = new Map(SETUP_DARTS_ORDERED.map(([v, l]) => [v, l]));

// Human-readable label for a closing double value (2,4,...,40,50)
function closeDoubleLabel(val) {
  if (val === 50) return 'Bull';
  return 'D' + (val / 2);
}

// Returns the best checkout path string ending on targetDouble, or null if impossible.
// Respects dartsLeft (1, 2, or 3). Never places a double in position 2 of a 3-dart path.
function findCheckoutPath(score, targetDouble, dartsLeft) {
  if (!DOUBLE_FINISHES.has(targetDouble)) return null;
  if (score < targetDouble || score > 170) return null;

  const remainder = score - targetDouble;
  const closing = closeDoubleLabel(targetDouble);

  // 1-dart checkout (remainder === 0 means score === targetDouble)
  if (remainder === 0) {
    return dartsLeft >= 1 ? closing : null;
  }

  // 2-dart checkout: remainder must be achievable in exactly 1 non-double dart
  if (dartsLeft >= 2 && SETUP_DART_LABEL.has(remainder)) {
    return SETUP_DART_LABEL.get(remainder) + ' ' + closing;
  }

  // 3-dart checkout: find (x, y) where x + y === remainder, both non-double values
  if (dartsLeft >= 3) {
    for (const [x, xLabel] of SETUP_DARTS_ORDERED) {
      if (x >= remainder) continue;
      const y = remainder - x;
      if (SETUP_DART_LABEL.has(y)) {
        return xLabel + ' ' + SETUP_DART_LABEL.get(y) + ' ' + closing;
      }
    }
  }

  return null;
}
