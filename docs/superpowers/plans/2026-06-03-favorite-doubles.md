# Favorite Doubles Checkout Hints — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each player profile store two preferred closing doubles (primary/secondary); the checkout hint prefers paths ending on those doubles when possible, and highlights the matching double in yellow (primary) or blue (secondary).

**Architecture:** Add a `findCheckoutPath(score, targetDouble, dartsLeft)` function to `checkouts.js` that algorithmically generates the best path to any specific double on demand (no static table expansion needed). Player profiles get `primaryDouble` / `secondaryDouble` fields (numeric dart value: 2–40 even, or 50). These are threaded into the match object and read by an updated `renderCheckoutHint()` in `ui.js`, which now renders HTML so the closing double can be wrapped in a colored `<span>`.

**Tech Stack:** Vanilla JS, no build step, no test framework. Verification is manual in-browser.

---

## File Map

| File | Change |
|---|---|
| `js/checkouts.js` | Add `SETUP_DARTS_ORDERED`, `SETUP_DART_LABEL` map, `closeDoubleLabel()`, `findCheckoutPath()` |
| `js/players.js` | Extend `createPlayer()` signature; update `renderPlayersScreen()` to show favorites |
| `js/game.js` | Add `playerFavorites` field to `createMatch()` |
| `js/ui.js` | Add `buildHintHtml()`; rewrite `renderCheckoutHint()` to try favorites then fall back |
| `js/app.js` | Update `addPlayerFromInput()` to read favorite selects; update `startMatch()` to look up profiles |
| `index.html` | Add two `<select>` elements for favorite doubles in the Players screen |

---

### Task 1: Add `findCheckoutPath` and helpers to `checkouts.js`

This is pure logic with no UI impact. It replaces the need to manually expand `CHECKOUT_TABLE`—the function generates any valid path on demand.

**Files:**
- Modify: `js/checkouts.js` (append after line 192, after `isDoubleAttemptScore`)

**Background — why the algorithm works:**

A valid checkout path is `[setup₁] [setup₂] [closing_double]`. A "setup dart" is any dart that does NOT land on a double ring: singles S1–S20, green bull S25 (25 pts), or triples T1–T20 (3–60 pts). The algorithm iterates setup darts from best (T20=60) to worst (S1=1) to generate the most efficient path possible. No double value ever appears in position 2 of a 3-dart path because `SETUP_DART_LABEL` contains only non-double values.

- [ ] **Step 1: Append the following block to the end of `js/checkouts.js`**

```js
// --- Favorite-double checkout path finder ---

// All valid non-double dart values, ordered best to worst (T20 first, then singles, then S25).
// Values 3–18 that are multiples of 3 could also be triples (T1–T6), but we label them
// as singles (S3–S18) since single notation is more natural for low values.
const SETUP_DARTS_ORDERED = [
  [60, 'T20'], [57, 'T19'], [54, 'T18'], [51, 'T17'], [48, 'T16'],
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
//
// Examples:
//   findCheckoutPath(100, 40, 3)  → "T20 S20 D20"   (T20=60, S20=20, D20=40 → 120? No.)
//   Wait: 60+20+40=120≠100. Correct: findCheckoutPath(100,40,3): remainder=60, 2-dart: T20 'T20', path="T20 D20" ✓
//   findCheckoutPath(85, 32, 3)   → "T19 S2 D16"    (57+2+32=91? No. remainder=85-32=53, 2-dart: 53 not in map)
//     3-dart: x=51(T17), y=2 → "T17 S2 D16" (51+2+32=85) ✓
//   findCheckoutPath(170, 50, 3)  → "T20 T20 Bull"  (60+60+50=170) ✓
//   findCheckoutPath(170, 40, 3)  → null (remainder=130, max 2 setup darts = 120) ✓
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
```

- [ ] **Step 2: Verify in browser console**

Open `index.html`. Open DevTools console. Run:

```js
// Should return "T20 D20" (60+40=100)
console.log(findCheckoutPath(100, 40, 3));

// Should return "T20 T20 Bull" (60+60+50=170)
console.log(findCheckoutPath(170, 50, 3));

// Should return null (remainder=130 > 2×60=120)
console.log(findCheckoutPath(170, 40, 3));

// Should return "T15 D20" (45+40=85)
console.log(findCheckoutPath(85, 40, 3));

// Should return "T17 S2 D16" (51+2+32=85)
console.log(findCheckoutPath(85, 32, 3));

// Should return "S1 D1" (1+2=3)
console.log(findCheckoutPath(3, 2, 3));

// Should return "Bull" (score === targetDouble, 1-dart)
console.log(findCheckoutPath(50, 50, 1));

// Should return "T20 S25 D20" (60+25+40=125)
console.log(findCheckoutPath(125, 40, 3));

// Should return "T16 S2 Bull" (48+2+50=100) — path to Bull from 100
console.log(findCheckoutPath(100, 50, 3));

// Should return null (2 darts only, remainder=60 for D20; 60=T20 ∈ SETUP_DART_LABEL → "T20 D20")
// Actually this should work: dartsLeft=2, remainder=60, SETUP_DART_LABEL.has(60)=true
console.log(findCheckoutPath(100, 40, 2)); // expect "T20 D20"
```

Expected output:
```
T20 D20
T20 T20 Bull
null
T15 D20
T17 S2 D16
S1 D1
Bull
T20 S25 D20
T16 S2 Bull
T20 D20
```

---

### Task 2: Update player profile schema and Players screen

**Files:**
- Modify: `js/players.js`
- Modify: `index.html`
- Modify: `js/app.js`

- [ ] **Step 1: Extend `createPlayer` in `js/players.js`**

Replace lines 14–23 (the `createPlayer` function) with:

```js
function createPlayer(name, primaryDouble, secondaryDouble) {
  const trimmed = name.trim().slice(0, 20);
  if (!trimmed) return null;
  const list = loadPlayers();
  if (list.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return null;
  const player = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: trimmed,
    primaryDouble: primaryDouble || null,
    secondaryDouble: secondaryDouble || null,
  };
  list.push(player);
  savePlayers(list);
  return player;
}
```

- [ ] **Step 2: Update `renderPlayersScreen` in `js/players.js` to show favorites**

Replace the `list.forEach(player => { ... })` block (lines 48–60) with:

```js
  list.forEach(player => {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.dataset.id = player.id;
    const pLabel = player.primaryDouble ? closeDoubleLabel(player.primaryDouble) : '—';
    const sLabel = player.secondaryDouble ? closeDoubleLabel(player.secondaryDouble) : '—';
    row.innerHTML = `
      <span class="player-row-name">${escapeHtml(player.name)}</span>
      <span class="player-row-doubles">${pLabel} / ${sLabel}</span>
      <div class="player-row-actions">
        <button class="btn-icon btn-rename-player" title="Zmień nazwę">✏️</button>
        <button class="btn-icon btn-delete-player" title="Usuń">🗑️</button>
      </div>
    `;
    container.appendChild(row);
  });
```

- [ ] **Step 3: Add favorite double selects to Players screen in `index.html`**

Find the Players screen section. Replace the existing `.add-player-row` div (around line 267–270):

```html
    <div class="add-player-row">
      <input id="input-new-player" type="text" placeholder="Nowy gracz…" maxlength="20" autocomplete="off">
      <button id="btn-add-player" class="btn-add">Dodaj</button>
    </div>
```

with:

```html
    <div class="add-player-row">
      <input id="input-new-player" type="text" placeholder="Nowy gracz…" maxlength="20" autocomplete="off">
    </div>
    <div class="add-player-doubles-row">
      <select id="sel-primary-double" title="Ulubiona podwójna primary">
        <option value="">1°: brak</option>
        <option value="2">D1</option>
        <option value="4">D2</option>
        <option value="6">D3</option>
        <option value="8">D4</option>
        <option value="10">D5</option>
        <option value="12">D6</option>
        <option value="14">D7</option>
        <option value="16">D8</option>
        <option value="18">D9</option>
        <option value="20">D10</option>
        <option value="22">D11</option>
        <option value="24">D12</option>
        <option value="26">D13</option>
        <option value="28">D14</option>
        <option value="30">D15</option>
        <option value="32">D16</option>
        <option value="34">D17</option>
        <option value="36">D18</option>
        <option value="38">D19</option>
        <option value="40">D20</option>
        <option value="50">Bull</option>
      </select>
      <select id="sel-secondary-double" title="Ulubiona podwójna secondary">
        <option value="">2°: brak</option>
        <option value="2">D1</option>
        <option value="4">D2</option>
        <option value="6">D3</option>
        <option value="8">D4</option>
        <option value="10">D5</option>
        <option value="12">D6</option>
        <option value="14">D7</option>
        <option value="16">D8</option>
        <option value="18">D9</option>
        <option value="20">D10</option>
        <option value="22">D11</option>
        <option value="24">D12</option>
        <option value="26">D13</option>
        <option value="28">D14</option>
        <option value="30">D15</option>
        <option value="32">D16</option>
        <option value="34">D17</option>
        <option value="36">D18</option>
        <option value="38">D19</option>
        <option value="40">D20</option>
        <option value="50">Bull</option>
      </select>
      <button id="btn-add-player" class="btn-add">Dodaj</button>
    </div>
```

- [ ] **Step 4: Update `addPlayerFromInput` in `js/app.js` to read the selects**

Replace the existing `addPlayerFromInput` function (lines 320–333):

```js
function addPlayerFromInput() {
  const input = document.getElementById('input-new-player');
  const name = input.value.trim();
  if (!name) return;
  const primaryDouble   = parseInt(document.getElementById('sel-primary-double').value)   || null;
  const secondaryDouble = parseInt(document.getElementById('sel-secondary-double').value) || null;
  const result = createPlayer(name, primaryDouble, secondaryDouble);
  if (!result) {
    input.classList.add('input-error');
    input.addEventListener('animationend', () => input.classList.remove('input-error'), { once: true });
    return;
  }
  input.value = '';
  document.getElementById('sel-primary-double').value   = '';
  document.getElementById('sel-secondary-double').value = '';
  renderPlayersScreen();
}
```

- [ ] **Step 5: Verify in browser**

1. Open `index.html` → click **Gracze**.
2. Type a name (e.g. "Jan"), pick D16 as primary, D20 as secondary, click **Dodaj**.
3. The player row should show "D16 / D20" next to the name.
4. Type another name (e.g. "Anna"), leave both selects blank, click **Dodaj**.
5. The player row should show "— / —".
6. Verify `dart_players` in Application → LocalStorage has `primaryDouble: 32, secondaryDouble: 40` for Jan.

---

### Task 3: Thread player favorites into match state

**Files:**
- Modify: `js/game.js`
- Modify: `js/app.js`

- [ ] **Step 1: Add `playerFavorites` to `createMatch` in `js/game.js`**

In `createMatch`, find the `return { ... }` block (lines 26–44). Add `playerFavorites` as the last field before the closing `}`:

```js
    playerFavorites: config.playerFavorites || [null, null],
```

The full updated return object looks like:

```js
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
    playerFavorites: config.playerFavorites || [null, null],
  };
```

- [ ] **Step 2: Look up and pass favorites in `startMatch` in `js/app.js`**

In `startMatch` (lines 336–360), find these two lines that call `createMatch`:

```js
  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, startingPlayer });
```

Replace them with:

```js
  const profiles = loadPlayers();
  const p1Profile = profiles.find(p => p.name.toLowerCase() === player1.toLowerCase());
  const p2Profile = profiles.find(p => p.name.toLowerCase() === player2.toLowerCase());
  const playerFavorites = [
    p1Profile ? { primary: p1Profile.primaryDouble ?? null, secondary: p1Profile.secondaryDouble ?? null } : null,
    p2Profile ? { primary: p2Profile.primaryDouble ?? null, secondary: p2Profile.secondaryDouble ?? null } : null,
  ];

  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, startingPlayer, playerFavorites });
```

- [ ] **Step 3: Verify in browser console**

1. Open `index.html`. Start a match with player name "Jan" (which has favorites D16/D20 from Task 2).
2. In DevTools console run: `console.log(JSON.stringify(match.playerFavorites))`.
3. Expected: `[{"primary":32,"secondary":40},null]` (or similar for the second player slot).
4. Start a match where both players are unknown names (not in profiles).
5. Verify `match.playerFavorites` is `[null, null]`.

---

### Task 4: Update checkout hint rendering with favorites and color highlighting

**Files:**
- Modify: `js/ui.js`

The hint element currently uses `textContent`. We switch to `innerHTML` (safe because all path strings are internally generated, never from user input). The `buildHintHtml` function wraps only the last token (the closing double) in a colored `<span>`.

- [ ] **Step 1: Add `buildHintHtml` to `js/ui.js` (before `renderCheckoutHint`)**

Insert the following function before the existing `renderCheckoutHint` function (before line 77):

```js
// Wraps the closing double in the path string with a colored span for highlighting.
// pathString: e.g. "T20 S8 D16"
// targetDouble: numeric value e.g. 32 (for D16) or 50 (for Bull)
// highlightColor: CSS color string
function buildHintHtml(pathString, targetDouble, highlightColor) {
  const label = closeDoubleLabel(targetDouble);
  const parts = pathString.split(' ');
  return parts.map((part, i) => {
    if (i === parts.length - 1 && part === label) {
      return `<span style="color:${highlightColor};font-weight:bold">${part}</span>`;
    }
    return part;
  }).join(' ');
}
```

- [ ] **Step 2: Replace `renderCheckoutHint` in `js/ui.js`**

Replace the entire existing `renderCheckoutHint` function (lines 77–95) with:

```js
function renderCheckoutHint(match) {
  const p = match.activePlayer;
  const player = match.players[p];
  const bufTotal = player.dartBuffer.reduce((a, d) => a + d.value, 0);
  const score = player.score - bufTotal;
  const dartsLeft = (match.inputMode === INPUT_MODES.DART_BY_DART || match.inputMode === INPUT_MODES.BOARD)
    ? 3 - player.dartBuffer.length
    : 3;

  const hintEl   = document.getElementById('checkout-hint');
  const hintText = document.getElementById('checkout-hint-text');

  if (score < 2 || score > 170) {
    hintText.innerHTML = '';
    hintEl.classList.remove('active');
    return;
  }

  const favs = match.playerFavorites?.[p];
  let hintHtml = null;

  // Try primary favorite double
  if (favs?.primary) {
    const path = findCheckoutPath(score, favs.primary, dartsLeft);
    if (path) hintHtml = buildHintHtml(path, favs.primary, '#f5c218'); // yellow
  }

  // Try secondary favorite double
  if (!hintHtml && favs?.secondary) {
    const path = findCheckoutPath(score, favs.secondary, dartsLeft);
    if (path) hintHtml = buildHintHtml(path, favs.secondary, '#4da8f5'); // blue
  }

  // Fall back to existing default checkout table
  if (!hintHtml) {
    const hint = getCheckoutHint(score, dartsLeft);
    if (hint) hintHtml = hint;
  }

  if (hintHtml) {
    hintText.innerHTML = hintHtml;
    hintEl.classList.add('active');
  } else {
    hintText.innerHTML = '';
    hintEl.classList.remove('active');
  }
}
```

- [ ] **Step 3: Verify in browser — golden path**

1. Open `index.html`. Start a match with player "Jan" (primary D16=32, secondary D20=40).
2. In summary mode, the starting score (e.g. 301) is too high for any checkout hint — this is expected (no hint shown).
3. Manually set a test score: in DevTools console run `match.players[0].score = 85; renderGameScreen(match);`
4. Score 85 → checkout hint should show a path ending on **D16** (primary) highlighted in yellow. Expected: `T17 S2 D16` with "D16" in yellow.
5. Now test a score where D16 is unreachable: run `match.players[0].score = 2; renderGameScreen(match);`
6. Score 2 → D1 (value=2) is the only 1-dart checkout. Since D16 and D20 are not reachable for score=2, the hint should fall back to the default table: "D1".

- [ ] **Step 4: Verify secondary fallback**

1. Run `match.players[0].score = 4; renderGameScreen(match);`
2. Score 4 → D2 (value=4). Primary=D16 impossible (need 32). Secondary=D20 impossible (need 40). Fall back to default: "D2".
3. Run `match.players[0].score = 72; renderGameScreen(match);`
4. Score 72 → D16 is reachable: remainder=72-32=40. Is 40 in SETUP_DART_LABEL? 40/3≈13.3, not triple; >20, not single; not 25. No. Falls to 3-dart: x=39 (T13), y=1 → "T13 S1 D16" (39+1+32=72). Hint should show `T13 S1 D16` with "D16" in **yellow**.
5. Run `match.players[0].score = 40; renderGameScreen(match);`
6. Score 40 → D20 (primary D16 is value 32, not reachable for score 40 as 1-dart since 40≠32; 2-dart: remainder=40-32=8, SETUP_DART_LABEL.has(8)=true → 'S8', so "S8 D16" (8+32=40) — D16 IS reachable). Hint should show `S8 D16` with "D16" in **yellow**.

- [ ] **Step 5: Verify dart-by-dart mode with dartsLeft restriction**

1. In dart-by-dart mode with 1 dart already thrown (dartBuffer.length=1), dartsLeft=2.
2. Set score to 100 and force buffer to have 1 dart: `match.players[0].score=100; match.players[0].dartBuffer=[{value:20,label:'S20',remainingBefore:100}]; match.inputMode='dartbydart'; renderGameScreen(match);`
3. dartsLeft=2. findCheckoutPath(100, 32, 2): remainder=68, SETUP_DART_LABEL.has(68)? No (68/3≈22.6). No 2-dart path. Falls to primary=D16 null.
4. findCheckoutPath(100, 40, 2): remainder=60, SETUP_DART_LABEL.has(60)=true ('T20'). Path="T20 D20". Hint shows `T20 D20` with "D20" in **blue** (secondary).

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Add many paths per score > 40 for different doubles | ✅ Task 1 — `findCheckoutPath` generates paths to ANY double algorithmically |
| Players screen: pick primary + secondary double | ✅ Task 2 — two selects in HTML, wired in addPlayerFromInput |
| During match: show path to primary double when possible | ✅ Task 4 — tries primary first |
| If primary impossible, show secondary | ✅ Task 4 — tries secondary if primary null |
| If both impossible, fall back to default hint | ✅ Task 4 — falls back to getCheckoutHint() |
| Highlight closing double yellow (primary) / blue (secondary) | ✅ Task 4 — buildHintHtml wraps last token in colored span |
| Exclude paths with double in position 2 of 3-dart path | ✅ Task 1 — SETUP_DART_LABEL only has non-double values |
| Backward compatible with existing saved matches | ✅ Task 3 — optional chaining `match.playerFavorites?.[p]` |
| No favorites set → same behavior as before | ✅ Task 4 — falls through to getCheckoutHint() when favs null |

**Placeholder scan:** None found.

**Type consistency:**
- `closeDoubleLabel(val)` defined in Task 1 (`checkouts.js`), used in Task 2 (`players.js`) and Task 4 (`ui.js`). Load order: checkouts.js → players.js → ui.js. ✓
- `findCheckoutPath(score, targetDouble, dartsLeft)` defined in Task 1, used in Task 4. ✓
- `match.playerFavorites[i]` shape: `{ primary: number|null, secondary: number|null }` or `null`. Set in Task 3, read in Task 4. ✓
- `createPlayer(name, primaryDouble, secondaryDouble)` defined in Task 2 (players.js), called in Task 2 (app.js). ✓
