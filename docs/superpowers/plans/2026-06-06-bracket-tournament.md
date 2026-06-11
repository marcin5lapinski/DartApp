# Bracket Tournament Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-elimination bracket (drabinka) as a second tournament format, handling non-power-of-2 player counts via byes, with a bracket-tree view replacing the Tabela/Mecze tabs.

**Architecture:** New data-layer functions (`generateBracket`, `advanceBracketWinner`) live in `league.js` alongside existing league code. Rendering uses a new `renderBracketScreen()` that produces a 3-column-per-view bracket with SVG connector lines; match cards fully reuse `_buildMatchPlayerRow`. App.js wiring adds a bracket click-handler and calls `advanceBracketWinner` inside the existing `saveTournamentMatchResult`.

**Tech Stack:** Vanilla JS/HTML/CSS, no build step. Open `index.html` in a browser to test. `localStorage` for persistence.

---

## File Map

| File | What changes |
|---|---|
| `js/league.js` | Add `nextPowerOf2`, `computeRoundName`, `generateBracket`, `advanceBracketWinner`, `_bracketCenterY`, `_buildBracketCard`, `buildBracketRound`, `buildBracketConnectorSvg`, `renderBracketScreen`; update `renderTournamentViewScreen`, `buildTournamentCard` |
| `js/tournament.js` | Step 2: format-tile click handler (bracket/league toggle, field visibility); `createTournament` bracket branch |
| `js/app.js` | Add `#tv-bracket` click handler; update `saveTournamentMatchResult` to call `advanceBracketWinner`; guard live-standings button in `startTournamentMatch` |
| `index.html` | Add `#tv-bracket` container; remove `disabled` from bracket format tile |
| `css/style.css` | Add `.bk-*` bracket layout rules, `.bye-card`, `.tbd-card`, bracket overrides for `.match-card` |

---

## Task 1: Data layer — bracket generation and advancement

**Files:**
- Modify: `js/league.js` (add after `generateSchedule`, before `createTournament`)

- [ ] **Step 1: Add `nextPowerOf2` and `computeRoundName`**

In `js/league.js`, add immediately after the `generateSchedule` function:

```js
function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function computeRoundName(roundIdx, numRounds) {
  const tables = {
    2: ['Półfinał', 'Finał'],
    3: ['Ćwierćfinał', 'Półfinał', 'Finał'],
    4: ['1/8 Finału', 'Ćwierćfinał', 'Półfinał', 'Finał'],
  };
  return (tables[numRounds] || [])[roundIdx] || ('Runda ' + (roundIdx + 1));
}
```

- [ ] **Step 2: Add `_bracketCenterY`**

```js
// Returns Y-center of a bracket card within bk-body coordinate space.
// round=0 cards are the reference; subsequent rounds are computed recursively.
function _bracketCenterY(round, slot, cardH, gap) {
  if (round === 0) return slot * (cardH + gap) + cardH / 2;
  return (_bracketCenterY(round - 1, slot * 2,     cardH, gap) +
          _bracketCenterY(round - 1, slot * 2 + 1, cardH, gap)) / 2;
}
```

- [ ] **Step 3: Add `generateBracket`**

```js
function generateBracket(numPlayers, players) {
  const B         = nextPowerOf2(numPlayers);
  const numByes   = B - numPlayers;
  const numRounds = Math.log2(B);
  const r1Slots   = B / 2;
  const matches   = [];

  // Round 0: numByes bye-slots then real matches
  for (let slot = 0; slot < r1Slots; slot++) {
    if (slot < numByes) {
      matches.push({
        round: 0, slot, isBye: true,
        p1: slot, p2: null, winner: 0,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    } else {
      const ri   = slot - numByes;
      const p1i  = numByes + ri * 2;
      const p2i  = numByes + ri * 2 + 1;
      matches.push({
        round: 0, slot, isBye: false,
        p1: p1i, p2: p2i, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    }
  }

  // Rounds 1..numRounds-1: all TBD
  for (let r = 1; r < numRounds; r++) {
    const slotsInRound = B / Math.pow(2, r + 1);
    for (let slot = 0; slot < slotsInRound; slot++) {
      matches.push({
        round: r, slot, isBye: false,
        p1: null, p2: null, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    }
  }

  // Pre-fill subsequent rounds for all bye matches
  matches.filter(m => m.isBye).forEach(m => advanceBracketWinner(matches, m));

  return matches;
}
```

- [ ] **Step 4: Add `advanceBracketWinner`**

This function must be defined BEFORE `generateBracket` (since generateBracket calls it). Move it above `generateBracket`:

```js
function advanceBracketWinner(matches, finishedMatch) {
  const winnerPlayerIdx = finishedMatch.winner === 0 ? finishedMatch.p1 : finishedMatch.p2;
  const nextRound = finishedMatch.round + 1;
  const nextSlot  = Math.floor(finishedMatch.slot / 2);
  const target    = matches.find(m => m.round === nextRound && m.slot === nextSlot);
  if (!target) return; // Final has no next round
  if (finishedMatch.slot % 2 === 0) target.p1 = winnerPlayerIdx;
  else                               target.p2 = winnerPlayerIdx;
}
```

Final order in file: `advanceBracketWinner` → `generateBracket` → `nextPowerOf2` → `computeRoundName` → `_bracketCenterY`.

- [ ] **Step 5: Verify manually**

Open browser console on `index.html` and run:

```js
// Should produce 8 matches: 2 byes (winner=0) + 2 real (winner=null) in round 0,
// 2 TBD in round 1 (with p1/p2 pre-filled from byes), 1 TBD in round 2
const fakePlayers = [{name:'A'},{name:'B'},{name:'C'},{name:'D'}];
const m = generateBracket(4, fakePlayers);
console.table(m.map(x => ({r:x.round,s:x.slot,p1:x.p1,p2:x.p2,bye:x.isBye,w:x.winner})));
// Expected:
// r=0 s=0 p1=0 p2=null bye=true  w=0   (A bye)
// r=0 s=1 p1=1 p2=null bye=true  w=0   (B bye)
// r=0 s=2 p1=2 p2=3   bye=false w=null (C vs D)
// r=1 s=0 p1=0 p2=1   bye=false w=null (A vs B — pre-filled from byes)
// r=1 s=1 p1=null p2=null ...          (TBD — waits for C/D result)
// r=2 s=0 p1=null p2=null ...          (Final TBD)
```

Wait — 4 players: B=4, numByes=0, numRounds=2. Let me recalculate the example:
```js
// Use 3 players instead: B=4, numByes=1
const fakePlayers = [{name:'A'},{name:'B'},{name:'C'}];
const m = generateBracket(3, fakePlayers);
// r=0 s=0 p1=0 bye=true  w=0   (A bye → pre-fills r1 s0 p1=0)
// r=0 s=1 p1=1 p2=2 bye=false w=null (B vs C)
// r=1 s=0 p1=0 p2=null w=null (Final: A vs winner of B/C, p1=0 pre-filled)
console.table(m.map(x => ({r:x.round,s:x.slot,p1:x.p1,p2:x.p2,bye:x.isBye,w:x.winner})));
```

- [ ] **Step 6: Commit**

```bash
git add js/league.js
git commit -m "feat: bracket data layer — generateBracket, advanceBracketWinner, helpers"
```

---

## Task 2: HTML structure

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add `#tv-bracket` container**

In `index.html`, inside `<section id="screen-tournament-view">`, after the `<div id="tv-matches">` line, add:

```html
  <div id="tv-bracket" class="tv-bracket" style="display:none"></div>
```

- [ ] **Step 2: Unlock the bracket format tile in wizard step 2**

Find this block (currently both non-liga tiles are `disabled`):

```html
      <div class="format-tile disabled" data-format="bracket">
        Drabinka
        <span class="format-tile-sub">wkrótce</span>
      </div>
```

Replace with:

```html
      <div class="format-tile" id="t-format-bracket" data-format="bracket">
        Drabinka
        <span class="format-tile-sub">pucharowa</span>
      </div>
```

Leave the "Grupy + Drabinka" tile as `disabled` — that's Phase 5.

- [ ] **Step 3: Verify structure**

Open `index.html` in browser, navigate to Turnieje → Nowy turniej. Step 2 should now show "Drabinka" as a non-greyed tile. Clicking it won't work yet (no handler), but it should not show the "soon" subtitle. The `#tv-bracket` container exists (hidden) in tournament view.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add tv-bracket container and unlock bracket wizard tile"
```

---

## Task 3: CSS — bracket layout

**Files:**
- Modify: `css/style.css` (add at end of file, before final comment if any)

- [ ] **Step 1: Add bracket layout styles**

```css
/* ===== BRACKET VIEW ===== */

.tv-bracket { padding: 0 8px 20px; }

.bk-nav-wrap {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.bk-arrow {
  flex-shrink: 0;
  width: 32px;
  min-height: 40px;
  background: var(--surface);
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--accent);
  padding: 0;
}
.bk-arrow:disabled { color: #252525; border-color: #1a1a1a; cursor: default; }

.bk-viewport { flex: 1; overflow: hidden; min-width: 0; }

.bk-track {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

.bk-col {
  flex-shrink: 0;
  width: 110px;
  display: flex;
  flex-direction: column;
}

.bk-label {
  font-size: 0.58rem;
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  height: 18px;
  line-height: 18px;
  margin-bottom: 8px; /* total label area = 26px */
}
.bk-label-final { color: var(--accent2); }

.bk-body { position: relative; }

/* absolute wrapper for each card inside bk-body */
.bk-card-wrap {
  position: absolute;
  left: 3px;
  right: 3px;
}

/* Override match-card sizing inside bracket */
.bk-card-wrap .match-card {
  height: 36px;
  padding: 3px 7px;
  box-sizing: border-box;
  cursor: pointer;
}

/* bye card: not interactive */
.bk-card-wrap .match-card.bye-card {
  background: #131318;
  border-color: #1e1e28;
  cursor: default;
}
.bk-card-wrap .match-card.bye-card:hover { border-color: #1e1e28; }

/* tbd card: waiting for previous round */
.bk-card-wrap .match-card.tbd-card {
  background: #0f0f0f;
  border-color: #181818;
  opacity: 0.5;
  cursor: default;
}
.bk-card-wrap .match-card.tbd-card:hover { border-color: #181818; }

/* "wolny los" text row */
.bye-slot-row .mpname {
  font-style: italic;
  color: #333 !important;
  font-size: 0.58rem !important;
}
```

- [ ] **Step 2: Open browser, navigate to any tournament**

The tournament view should look unchanged (bracket container is hidden). No visual regressions.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: CSS for bracket layout — bk-col, bk-arrow, bye-card, tbd-card"
```

---

## Task 4: Wizard step 2 — bracket/league toggle

**Files:**
- Modify: `js/tournament.js`

- [ ] **Step 1: Find the step 2 navigation handler**

In `tournament.js`, find the `t-next-2` click handler (the "Dalej" button on step 2). The format tile click handler needs to be added in `initTournamentWizard` or nearby.

- [ ] **Step 2: Add format tile click handler**

In `tournament.js`, find the `showWizardStep` function. Immediately after the closing of the `initTournamentWizard` function body (but still inside the DOMContentLoaded or at module level), add:

```js
// Step 2: format tile selection (league / bracket)
document.querySelectorAll('#wstep-2 .format-tile:not(.disabled)').forEach(tile => {
  tile.addEventListener('click', () => {
    document.querySelectorAll('#wstep-2 .format-tile').forEach(t => t.classList.remove('active'));
    tile.classList.add('active');
    tournamentConfig.format = tile.dataset.format;

    const isBracket = tile.dataset.format === 'bracket';
    document.getElementById('t-rounds-group').closest('.wizard-field-group').style.display =
      isBracket ? 'none' : '';
    document.getElementById('t-points-group').style.display =
      isBracket ? 'none' : '';
    document.getElementById('t-bracket-desc').style.display =
      isBracket ? '' : 'none';
  });
});
```

- [ ] **Step 3: Add the bracket description element to `index.html`**

In `index.html`, inside wizard step 2 (`id="wstep-2"`), after the last points group, add:

```html
<p id="t-bracket-desc" class="wizard-hint" style="display:none">
  Puchar — każdy mecz eliminuje przegranego. Zwycięzca finału wygrywa turniej.
</p>
```

Also identify the wrapping elements for `t-rounds-group` and `t-points-group`. They need a parent with class `wizard-field-group` or similar. Check the actual HTML structure and wrap accordingly so `closest('.wizard-field-group')` resolves correctly. If there is no such wrapper, use a direct `document.getElementById('t-rounds-group').style.display = ...` instead.

- [ ] **Step 4: Reset on wizard re-init**

In `initTournamentWizard()`, ensure the format resets to `'league'` and the league fields are visible:

```js
// In initTournamentWizard, after setting tournamentConfig:
tournamentConfig.format = 'league';
// Re-activate league tile, hide bracket description
document.querySelectorAll('#wstep-2 .format-tile').forEach(t =>
  t.classList.toggle('active', t.dataset.format === 'league'));
// Show league fields, hide bracket desc
const roundsGroup = document.getElementById('t-rounds-group');
if (roundsGroup) roundsGroup.closest('.wizard-field-group')
  ? roundsGroup.closest('.wizard-field-group').style.display = ''
  : (roundsGroup.style.display = '');
const ptsGroup = document.getElementById('t-points-group');
if (ptsGroup) ptsGroup.style.display = '';
const bDesc = document.getElementById('t-bracket-desc');
if (bDesc) bDesc.style.display = 'none';
```

- [ ] **Step 5: Manual test**

Open wizard step 2 in browser. Click "Drabinka" tile: league-specific fields disappear, bracket description appears. Click "Liga": fields reappear. Re-open wizard (click "Nowy turniej" again): resets to Liga.

- [ ] **Step 6: Commit**

```bash
git add js/tournament.js index.html
git commit -m "feat: wizard step 2 bracket/league toggle"
```

---

## Task 5: `createTournament` — bracket branch

**Files:**
- Modify: `js/tournament.js` (the `createTournament` call), `js/league.js` (`createTournament` function)

- [ ] **Step 1: Update `createTournament` in `league.js`**

Find the `createTournament` function. Replace the `config:` and `matches:` fields:

```js
function createTournament(config, players) {
  const isBracket = config.format === 'bracket';
  const tournament = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    name: config.name,
    status: 'active',
    createdAt: Math.floor(Date.now() / 1000),
    config: {
      numPlayers: config.numPlayers,
      format: config.format,
      ...(isBracket
        ? { bracketSize: nextPowerOf2(players.length) }
        : {
            leagueRounds: config.leagueRounds,
            winPoints:    config.winPoints,
            lossPoints:   config.lossPoints,
          }),
      matchConfig: { ...config.matchConfig },
    },
    players,
    matches: isBracket
      ? generateBracket(players.length, players)
      : generateSchedule(players.length, config.leagueRounds),
  };
  const list = loadTournaments();
  list.push(tournament);
  saveTournaments(list);
  return tournament;
}
```

- [ ] **Step 2: Create a bracket tournament and inspect localStorage**

1. Open app in browser, create a bracket tournament with 6 players.
2. After creation, open DevTools → Application → localStorage → `dart_tournaments`.
3. Find the new tournament. Verify:
   - `config.format === "bracket"`
   - `config.bracketSize === 8`
   - `matches` has 7 entries: 4 in round 0 (2 with `isBye:true, winner:0`, 2 real), 2 in round 1, 1 in round 2
   - Round 1 matches have `p1`/`p2` pre-filled for bye-match positions (the top 2 slots → they play each other in QF)

- [ ] **Step 3: Commit**

```bash
git add js/league.js
git commit -m "feat: createTournament generates bracket matches for bracket format"
```

---

## Task 6: Bracket rendering — card builder and SVG connectors

**Files:**
- Modify: `js/league.js` (add new rendering helpers before `renderBracketScreen`)

- [ ] **Step 1: Add `_buildBracketCard`**

Add after `_buildMatchPlayerRow` (keep near related helpers):

```js
function _buildBracketCard(m, matchIdx, players, topPx) {
  const wrap = document.createElement('div');
  wrap.className = 'bk-card-wrap';
  wrap.style.top = topPx + 'px';

  const classes = ['match-card'];
  if      (m.isBye)                      classes.push('bye-card');
  else if (m.p1 === null || m.p2 === null) classes.push('tbd-card');
  else if (m.winner !== null)             classes.push('played');
  else                                    classes.push('unplayed');
  const card = document.createElement('div');
  card.className = classes.join(' ');
  card.dataset.matchIndex = matchIdx;

  const pd = document.createElement('div');
  pd.className = 'match-players';

  if (m.isBye) {
    pd.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    const byeRow = document.createElement('div');
    byeRow.className = 'match-player-row bye-slot-row';
    byeRow.innerHTML = '<span class="mpname">— wolny los —</span>';
    pd.appendChild(byeRow);
  } else if (m.p1 === null || m.p2 === null) {
    pd.appendChild(_buildMatchPlayerRow('?', null, null, ''));
    pd.appendChild(_buildMatchPlayerRow('?', null, null, ''));
  } else if (m.winner !== null) {
    const w = m.winner, l = 1 - w;
    const wPIdx = w === 0 ? m.p1 : m.p2;
    const lPIdx = l === 0 ? m.p1 : m.p2;
    const useSet  = m.sets && m.sets[0] !== null;
    const wScore  = useSet ? m.sets[w] : m.legs[w];
    const lScore  = useSet ? m.sets[l] : m.legs[l];
    const wAvgF   = m.avgs[w], lAvgF = m.avgs[l];
    const wAvg    = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg    = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest   = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest   = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    pd.appendChild(_buildMatchPlayerRow(players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    pd.appendChild(_buildMatchPlayerRow(players[lPIdx].name, lScore, lAvg, 'loser',  lBest));
  } else {
    pd.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(players[m.p2].name, null, null, ''));
  }

  card.appendChild(pd);
  wrap.appendChild(card);
  return wrap;
}
```

- [ ] **Step 2: Add `buildBracketRound`**

```js
// matchIdxOffset: index in tournament.matches[] of this round's slot 0
function buildBracketRound(roundMatches, roundIdx, numRounds, players,
                           matchIdxOffset, CARD_H, GAP, bodyH) {
  const col = document.createElement('div');
  col.className = 'bk-col';

  const lbl = document.createElement('div');
  lbl.className = 'bk-label' + (roundIdx === numRounds - 1 ? ' bk-label-final' : '');
  lbl.textContent = computeRoundName(roundIdx, numRounds);
  col.appendChild(lbl);

  const body = document.createElement('div');
  body.className = 'bk-body';
  body.style.height = bodyH + 'px';
  col.appendChild(body);

  roundMatches.forEach((m, i) => {
    const topPx = _bracketCenterY(m.round, m.slot, CARD_H, GAP) - CARD_H / 2;
    body.appendChild(_buildBracketCard(m, matchIdxOffset + i, players, topPx));
  });

  return col;
}
```

- [ ] **Step 3: Add `buildBracketConnectorSvg`**

```js
// numLeft: number of match slots in the left (source) round column.
// isDashed: true for the trailing stub when next round is hidden off-screen.
function buildBracketConnectorSvg(numLeft, CARD_H, GAP, LABEL_H, SVG_W, isDashed) {
  const bodyH  = numLeft * CARD_H + (numLeft - 1) * GAP;
  const totalH = LABEL_H + bodyH;
  const HOOK   = 9; // x of vertical arm
  const STROKE = '#2d2d2d';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width',  SVG_W);
  svg.setAttribute('height', totalH);
  svg.style.flexShrink = '0';
  svg.style.display    = 'block';

  function cy(slot) { return LABEL_H + slot * (CARD_H + GAP) + CARD_H / 2; }

  const numPairs = numLeft / 2;
  for (let pair = 0; pair < numPairs; pair++) {
    const y1 = cy(pair * 2), y2 = cy(pair * 2 + 1), midY = (y1 + y2) / 2;
    const dash = isDashed ? '3,3' : '';

    const arm = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arm.setAttribute('points',           `0,${y1} ${HOOK},${y1} ${HOOK},${y2} 0,${y2}`);
    arm.setAttribute('fill',             'none');
    arm.setAttribute('stroke',           STROKE);
    arm.setAttribute('stroke-width',     '1');
    if (isDashed) arm.setAttribute('stroke-dasharray', dash);
    svg.appendChild(arm);

    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', HOOK); ln.setAttribute('y1', midY);
    ln.setAttribute('x2', SVG_W); ln.setAttribute('y2', midY);
    ln.setAttribute('stroke',       STROKE);
    ln.setAttribute('stroke-width', '1');
    if (isDashed) ln.setAttribute('stroke-dasharray', dash);
    svg.appendChild(ln);
  }
  return svg;
}
```

- [ ] **Step 4: Commit**

```bash
git add js/league.js
git commit -m "feat: bracket card builder, buildBracketRound, buildBracketConnectorSvg"
```

---

## Task 7: `renderBracketScreen` + view routing + tournament card

**Files:**
- Modify: `js/league.js`

- [ ] **Step 1: Add `renderBracketScreen`**

Add before `renderTournamentViewScreen`:

```js
function renderBracketScreen(tournament) {
  const container = document.getElementById('tv-bracket');
  container.innerHTML = '';

  const { matches, players, config } = tournament;
  const B         = config.bracketSize;
  const numRounds = Math.log2(B);
  const CARD_H = 36, GAP = 8, LABEL_H = 26, COL_W = 110, SVG_W = 20;

  const byRound = [];
  for (let r = 0; r < numRounds; r++) {
    byRound.push(
      matches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot)
    );
  }

  const numR1Slots = B / 2;
  const bodyH = numR1Slots * CARD_H + (numR1Slots - 1) * GAP;

  const VISIBLE = 3;
  let offset = 0;

  function render() {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'bk-nav-wrap';

    if (numRounds > VISIBLE) {
      const lBtn = document.createElement('button');
      lBtn.className = 'bk-arrow';
      lBtn.innerHTML = '&#8592;';
      lBtn.disabled  = (offset === 0);
      lBtn.addEventListener('click', () => { offset--; render(); });
      wrap.appendChild(lBtn);
    }

    const viewport = document.createElement('div');
    viewport.className = 'bk-viewport';
    const track = document.createElement('div');
    track.className = 'bk-track';

    const end = Math.min(offset + VISIBLE, numRounds);
    for (let ri = offset; ri < end; ri++) {
      const roundMatches = byRound[ri];
      const firstIdx = matches.findIndex(m => m.round === ri && m.slot === 0);
      const col = buildBracketRound(
        roundMatches, ri, numRounds, players, firstIdx, CARD_H, GAP, bodyH
      );
      col.style.width = COL_W + 'px';
      track.appendChild(col);

      const isLastVisible = ri === end - 1;
      const hasMoreRight  = ri < numRounds - 1;
      if (!isLastVisible) {
        // Normal connector to the next visible round
        track.appendChild(buildBracketConnectorSvg(roundMatches.length, CARD_H, GAP, LABEL_H, SVG_W, false));
      } else if (hasMoreRight) {
        // Dashed stub — next round is off-screen
        track.appendChild(buildBracketConnectorSvg(roundMatches.length, CARD_H, GAP, LABEL_H, SVG_W / 2, true));
      }
    }

    viewport.appendChild(track);
    wrap.appendChild(viewport);

    if (numRounds > VISIBLE) {
      const rBtn = document.createElement('button');
      rBtn.className = 'bk-arrow';
      rBtn.innerHTML = '&#8594;';
      rBtn.disabled  = (offset + VISIBLE >= numRounds);
      rBtn.addEventListener('click', () => { offset++; render(); });
      wrap.appendChild(rBtn);
    }

    container.appendChild(wrap);
  }

  render();
}
```

- [ ] **Step 2: Update `renderTournamentViewScreen` — add bracket branch**

At the TOP of `renderTournamentViewScreen`, after `_activeTournament = tournament;`, add:

```js
  const isBracket = tournament.config.format === 'bracket';

  document.getElementById('tv-tabs').style.display     = isBracket ? 'none' : '';
  document.getElementById('tv-standings').style.display = isBracket ? 'none' : '';
  document.getElementById('tv-matches').style.display   = 'none';
  document.getElementById('tv-bracket').style.display   = isBracket ? '' : 'none';

  if (isBracket) {
    document.getElementById('tv-title').textContent = tournament.name;
    const mc      = tournament.config.matchConfig;
    const played  = tournament.matches.filter(m => m.winner !== null && !m.isBye).length;
    const total   = tournament.matches.filter(m => !m.isBye).length;
    document.getElementById('tv-info-bar').innerHTML =
      `<span>Drabinka &middot; ${mc.variant} &middot; First to ${mc.totalLegs} &middot; ${CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode}</span>` +
      `<span>${tournament.players.length} graczy &middot; ${played}/${total} meczów rozegranych</span>`;
    renderBracketScreen(tournament);
    return;  // skip the rest (standings, tabs etc.)
  }
  // ... existing league code continues unchanged below ...
```

- [ ] **Step 3: Update `buildTournamentCard` — bracket meta and winner**

In `buildTournamentCard`, find where `meta` is built:

```js
  const meta  = `Liga · ${t.players.length} graczy · ${mc.variant} · First to ${mc.totalLegs}`;
```

Replace with:

```js
  const meta = t.config.format === 'bracket'
    ? `Drabinka · ${t.players.length} graczy · ${mc.variant} · First to ${mc.totalLegs}`
    : `Liga · ${t.players.length} graczy · ${mc.variant} · First to ${mc.totalLegs}`;
```

Find where `statusHtml` is set for finished tournaments (`standings[0] ? ...`), replace winner detection for bracket:

```js
  let statusHtml;
  if (t.status === 'active') {
    const played = t.config.format === 'bracket'
      ? t.matches.filter(m => m.winner !== null && !m.isBye).length
      : t.matches.filter(m => m.winner !== null).length;
    const total = t.config.format === 'bracket'
      ? t.matches.filter(m => !m.isBye).length
      : t.matches.length;
    statusHtml = `<span class="tc-status tc-active">&#9654; W toku &mdash; ${played}/${total} meczów</span>`;
  } else {
    let winner = '&mdash;';
    if (t.config.format === 'bracket') {
      const numRounds   = Math.log2(t.config.bracketSize);
      const finalMatch  = t.matches.find(m => m.round === numRounds - 1 && m.slot === 0);
      if (finalMatch && finalMatch.winner !== null) {
        const wIdx = finalMatch.winner === 0 ? finalMatch.p1 : finalMatch.p2;
        winner = escapeHtml(t.players[wIdx].name);
      }
    } else {
      const standings = computeStandings(t);
      winner = standings[0] ? escapeHtml(standings[0].name) : '&mdash;';
    }
    statusHtml = `<span class="tc-status tc-done">&#10003; Zakończony &middot; Wygrał: ${winner}</span>`;
  }
```

- [ ] **Step 4: Manual test — create + view bracket**

1. Create a bracket tournament with 6 players.
2. After creation, tournament view should show the bracket (no tabs).
3. Verify info bar shows "Drabinka · 501 · First to N · ...".
4. Verify 3 rounds are visible: "Ćwierćfinał · Półfinał · Finał".
5. QF shows 4 cards: 2 grey bye-cards + 2 playable match cards.
6. SF shows 2 grey TBD cards.
7. Finał label is orange (accent2).
8. Tournament list card shows "Drabinka" in meta.

- [ ] **Step 5: Commit**

```bash
git add js/league.js
git commit -m "feat: renderBracketScreen, view routing for bracket, card meta update"
```

---

## Task 8: `app.js` wiring — click handler, result saving, live standings

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add `#tv-bracket` click handler**

In `setupEventListeners()`, after the `#tv-matches` click handler (around line 330), add:

```js
  // Bracket view: match card clicks
  document.getElementById('tv-bracket').addEventListener('click', e => {
    const card = e.target.closest('.match-card');
    if (!card) return;
    if (card.classList.contains('bye-card') || card.classList.contains('tbd-card')) return;
    const idx = parseInt(card.dataset.matchIndex);
    if (!_activeTournament) return;
    const m = _activeTournament.matches[idx];
    if (!m || m.p1 === null || m.p2 === null) return;
    if (m.winner !== null) {
      openTournamentMatchStats(_activeTournament, idx);
    } else {
      openTournamentStarterModal(_activeTournament, idx);
    }
  });
```

- [ ] **Step 2: Update `saveTournamentMatchResult` to advance bracket**

Find `saveTournamentMatchResult` (around line 689). Before the `saveTournaments(list)` call, add:

```js
  // Advance bracket winner to next round (bracket format only)
  if (t.config.format === 'bracket') {
    advanceBracketWinner(t.matches, m);
  }
```

The final function looks like:

```js
function saveTournamentMatchResult(finishedMatch, ptm) {
  const list = loadTournaments();
  const t    = list.find(t => t.id === ptm.tournamentId);
  if (!t) return;
  const m = t.matches[ptm.matchIndex];

  m.winner  = finishedMatch.winner;
  m.legs    = [finishedMatch.legsWon[0], finishedMatch.legsWon[1]];
  m.sets    = finishedMatch.totalSets > 1
                ? [finishedMatch.setsWon[0], finishedMatch.setsWon[1]]
                : [null, null];
  m.avgs    = [getMatchAverage(finishedMatch.stats[0]),
               getMatchAverage(finishedMatch.stats[1])];
  m.stats   = [finishedMatch.stats[0], finishedMatch.stats[1]];
  m.starter = ptm.starter;

  if (t.config.format === 'bracket') {
    advanceBracketWinner(t.matches, m);
  }

  if (t.matches.every(mx => mx.winner !== null)) t.status = 'finished';

  saveTournaments(list);
  _activeTournament = t;
}
```

- [ ] **Step 3: Guard live-standings button for bracket**

Find `startTournamentMatch` (around line 644). Find the line:

```js
  document.getElementById('btn-live-standings').style.display = '';
```

Replace with:

```js
  document.getElementById('btn-live-standings').style.display =
    tournament.config.format === 'bracket' ? 'none' : '';
```

- [ ] **Step 4: Manual test — play a match in a bracket tournament**

1. Create a 6-player bracket tournament.
2. Click an unplayed QF match (real one, not bye) → starter modal appears.
3. Select starter → game screen opens. Note: live standings button is hidden.
4. Play the match to completion.
5. Stats screen shown. Click "Wróć do meczów".
6. Bracket view shown again — the played match now shows score + avg.
7. The next round's TBD slot for that match should now show both player names (no longer "?").
8. Repeat until Final is played. Tournament status changes to "finished" in the list.

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: bracket click handler, advanceBracketWinner on save, hide live standings"
```

---

## Task 9: End-to-end smoke test

No code changes — verification only.

- [ ] **Test scenario A: 3-player bracket (B=4, 1 bye, 2 rounds)**

1. Create bracket tournament: 3 players, any match settings.
2. Tournament view shows "Półfinał" and "Finał" (2 columns, no nav arrows).
3. SF column: 2 cards. One is a grey BYE card (player 1), one is a real match (players 2 vs 3).
4. Play the real SF match. Result saved, player advances to Final.
5. Final card shows player 1 vs winner of SF match (no longer TBD).
6. Play Final. Tournament finishes. Status in list shows winner.

- [ ] **Test scenario B: 6-player bracket (B=8, 2 byes, 3 rounds)**

1. Create bracket tournament: 6 players.
2. Three columns visible: "Ćwierćfinał · Półfinał · Finał". No nav arrows.
3. QF has 4 cards: 2 grey byes + 2 real matches.
4. Both QF real matches have `p1` and `p2` set (names visible).
5. Play both QF real matches. SF cards fill in (no longer TBD).
6. Play SF matches. Final card fills in.
7. Play Final. Tournament done.

- [ ] **Test scenario C: 10-player bracket (B=16, 6 byes, 4 rounds)**

1. Create bracket tournament: 10 players.
2. First view: "1/8 Finału · Ćwierćfinał · Półfinał". Right arrow (→) active, left (←) disabled.
3. 1/8 column has 8 cards: 6 grey byes + 2 real matches.
4. QF has 4 cards (all TBD initially, but 3 of them pre-filled from byes → 3 show names, 1 TBD waiting for real R1 result).
5. Click →. View shifts to "Ćwierćfinał · Półfinał · Finał". Both arrows active (left to go back, right disabled).
6. Finał card is in orange label. Final match is vertically centered between the two SF matches.
7. Play the 2 real 1/8 matches. Then play all QF, SF, Final. Verify bracket advances correctly at each step.
8. Tournament list card shows "Drabinka" + correct winner.

- [ ] **Test scenario D: No regression on league tournament**

1. Create a league tournament (3–10 players).
2. Tournament view still shows Tabela and Mecze tabs (not bracket view).
3. Play a match — live standings button visible during game.
4. Everything works as before.

- [ ] **Commit if any bug-fixes were needed during testing**

```bash
git add -A
git commit -m "fix: [describe any fixes found during smoke test]"
```
