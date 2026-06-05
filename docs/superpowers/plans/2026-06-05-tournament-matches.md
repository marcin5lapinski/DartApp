# Tournament Matches View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Mecze tab in the tournament view — match grid, pre-match starter modal, smart ordering, post-match stats stored in the tournament, and a live standings modal during play.

**Architecture:** Global `pendingTournamentMatch` in `app.js` (same pattern as existing `pendingDeleteTournamentId` etc.) carries tournament context through the match flow. Tournament matches are never saved to `dart_history` — full stats live in `tournament.matches[i].stats`. The existing `renderStatsScreen()` is reused via a pseudo-match object.

**Tech Stack:** Vanilla HTML5 + CSS3 + JS (no build step). Manual testing in browser. Spec: `docs/superpowers/specs/2026-06-05-tournament-matches-design.md`.

---

## Files

| File | What changes |
|---|---|
| `js/league.js` | `generateSchedule()` adds `sets`/`stats` fields; new `renderTournamentMatchesScreen()`; new `buildMatchCell()`, `buildMatchPlayerRow()`; new `computeLiveStandings()`; `renderTournamentViewScreen()` unlocks Mecze tab |
| `js/app.js` | New globals `pendingTournamentMatch`, `pendingTournamentStarterData`; new `startTournamentMatch()`, `saveTournamentMatchResult()`, `openTournamentStarterModal()`, `openTournamentMatchStats()`, `renderLiveStandingsModal()`; modify `handleLegClose()`, exit handler, `btn-new-match` handler; add all new event listeners in `setupEventListeners()` |
| `index.html` | Wrap game header right buttons; add `btn-live-standings`; add `tv-matches` div; add `modal-tournament-starter`; add `modal-live-standings` |
| `css/style.css` | Match grid, match cards, starter modal, corner close button, live standings button, live badge |

---

## Task 1 — Data layer: add `sets` and `stats` to match schedule

**Files:** Modify `js/league.js:23-34`

- [ ] In `generateSchedule()`, add `sets` and `stats` fields to both the single and double-round push calls:

```js
function generateSchedule(numPlayers, leagueRounds) {
  const matches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      matches.push({ p1: i, p2: j, winner: null, legs: [null, null], sets: [null, null], avgs: [null, null], stats: [null, null] });
      if (leagueRounds === 'double') {
        matches.push({ p1: j, p2: i, winner: null, legs: [null, null], sets: [null, null], avgs: [null, null], stats: [null, null] });
      }
    }
  }
  return matches;
}
```

- [ ] Verify: open the app, create a new tournament, open DevTools → Application → localStorage → `dart_tournaments`. Confirm the `matches` array contains objects with `sets: [null,null]` and `stats: [null,null]`.

- [ ] Commit:
```
git add js/league.js
git commit -m "feat: add sets/stats fields to tournament match schedule"
```

---

## Task 2 — HTML scaffolding

**Files:** Modify `index.html`

- [ ] **Game header** — wrap undo + new live button in a right-side group. Replace the existing `btn-undo-visit` line:

```html
<!-- REPLACE this single button: -->
<button id="btn-undo-visit" class="btn-undo-visit" disabled>↩ Cofnij turę</button>

<!-- WITH this wrapper: -->
<div class="game-header-right">
  <button id="btn-undo-visit" class="btn-undo-visit" disabled>↩ Cofnij turę</button>
  <button id="btn-live-standings" class="btn-live-standings" style="display:none">📊 Tabela live</button>
</div>
```

- [ ] **Tournament view** — add `tv-matches` container after the existing `tv-standings` div:

```html
<!-- after: <div id="tv-standings" class="tv-standings"></div> -->
<div id="tv-matches" class="tv-matches" style="display:none"></div>
```

- [ ] **Modal: tournament starter** — add before the closing `</body>` tag, alongside other modals:

```html
<!-- Tournament match starter -->
<div class="modal" id="modal-tournament-starter">
  <div class="modal-inner-rel">
    <button id="btn-starter-close" class="btn-modal-corner-close">✕</button>
    <div class="modal-starter-header">
      <div id="starter-match-title" class="modal-starter-title"></div>
      <div id="starter-match-subtitle" class="modal-starter-subtitle"></div>
    </div>
    <div id="starter-options" class="modal-starter-options"></div>
    <div class="modal-starter-footer">
      <button id="btn-starter-start" class="btn btn-primary" disabled>START</button>
    </div>
  </div>
</div>
```

- [ ] **Modal: live standings** — add after the starter modal:

```html
<!-- Live standings -->
<div class="modal" id="modal-live-standings">
  <div class="modal-inner-rel">
    <button id="btn-live-close" class="btn-modal-corner-close">✕</button>
    <div class="modal-starter-header">
      <div class="modal-starter-title">Tabela live</div>
      <div id="live-modal-subtitle" class="modal-starter-subtitle"></div>
    </div>
    <div id="live-standings-container"></div>
    <div id="live-standings-note" class="modal-live-note"></div>
  </div>
</div>
```

- [ ] Verify: open `index.html` in browser, open DevTools Console — no errors. Inspect DOM to confirm all new elements exist.

- [ ] Commit:
```
git add index.html
git commit -m "feat: add matches tab container, live button, and new modals to HTML"
```

---

## Task 3 — CSS

**Files:** Modify `css/style.css` (append at end of file)

- [ ] Add all new styles:

```css
/* ===== GAME HEADER RIGHT GROUP ===== */
.game-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-live-standings {
  padding: 5px 9px;
  background: #0a2a0a;
  border: 1px solid #1a6a1a;
  border-radius: 6px;
  color: #4caf50;
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background .15s;
}
.btn-live-standings:active { background: #0d3a0d; }

/* ===== MATCH GRID ===== */
.tv-matches {
  padding-bottom: 16px;
}

.tv-matches-section {
  padding: 8px 10px 4px;
  font-size: 0.68rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 4px 10px 8px;
}

.match-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.match-num-above {
  font-size: 0.65rem;
  color: #555;
  letter-spacing: 0.5px;
  padding-left: 2px;
}

.match-card {
  background: var(--surface);
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 60px;
  -webkit-tap-highlight-color: transparent;
  transition: border-color .15s;
}
.match-card:hover  { border-color: #444; }
.match-card.played { border-color: #2a3a2a; }

.match-players {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.match-player-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
}

.match-player-row .mpname {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #aaa;
}
.match-player-row .mpscore {
  font-size: 0.95rem;
  font-weight: 700;
  min-width: 12px;
  text-align: right;
  color: #555;
}
.match-player-row .mpavg {
  font-size: 0.68rem;
  color: var(--accent2);
  min-width: 32px;
  text-align: right;
}

.match-card.played .match-player-row.winner .mpname  { color: var(--text); font-weight: 600; }
.match-card.played .match-player-row.loser  .mpname  { color: #555; }
.match-card.played .match-player-row.winner .mpscore { color: #4caf50; }
.match-card.played .match-player-row.loser  .mpscore { color: #333; }
.match-card.played .match-player-row.loser  .mpavg   { color: #7a6030; }

/* ===== MODAL INNER WITH CORNER CLOSE ===== */
.modal-inner-rel {
  position: relative;
  padding: 20px 16px 16px;
}

.btn-modal-corner-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #555;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
}
.btn-modal-corner-close:hover { color: #aaa; background: var(--surface2); }

/* ===== STARTER MODAL ===== */
.modal-starter-header {
  margin-bottom: 14px;
  padding-right: 24px;
}
.modal-starter-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}
.modal-starter-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 3px;
}

.modal-starter-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.modal-starter-opt {
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #ccc;
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
  transition: background .12s, border-color .12s;
}
.modal-starter-opt:hover   { background: var(--surface2); border-color: var(--border); }
.modal-starter-opt.selected { background: #3a0a0a; border-color: var(--accent); color: var(--text); }

/* ===== LIVE STANDINGS MODAL ===== */
.modal-live-note {
  font-size: 0.72rem;
  color: #555;
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid #222;
  margin-top: 6px;
}

/* ===== LIVE BADGE ===== */
.live-badge {
  display: inline-block;
  background: #1a3a1a;
  border: 1px solid #2a5a2a;
  color: #4caf50;
  font-size: 0.6rem;
  padding: 1px 4px;
  border-radius: 3px;
  vertical-align: middle;
  margin-left: 4px;
  letter-spacing: 0.5px;
}
```

- [ ] Verify: open browser, game screen header should be unchanged visually. No console errors.

- [ ] Commit:
```
git add css/style.css
git commit -m "feat: add CSS for match grid, starter modal, live button, live badge"
```

---

## Task 4 — `renderTournamentMatchesScreen()` + tab wiring

**Files:** Modify `js/league.js`, `js/app.js`

- [ ] Add three new functions to `js/league.js` (append before the closing of the file, after `renderTournamentViewScreen`):

```js
function renderTournamentMatchesScreen(tournament) {
  const container = document.getElementById('tv-matches');
  container.innerHTML = '';

  const { matches, players } = tournament;

  const lastPlayedAt = new Array(players.length).fill(-1);
  matches.forEach((m, idx) => {
    if (m.winner !== null) {
      lastPlayedAt[m.p1] = idx;
      lastPlayedAt[m.p2] = idx;
    }
  });

  const unplayed = matches
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.winner === null)
    .sort((a, b) =>
      Math.max(lastPlayedAt[a.m.p1], lastPlayedAt[a.m.p2]) -
      Math.max(lastPlayedAt[b.m.p1], lastPlayedAt[b.m.p2])
    );

  const played = matches
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.winner !== null);

  if (unplayed.length > 0) {
    container.insertAdjacentHTML('beforeend', '<div class="tv-matches-section">Do rozegrania</div>');
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    unplayed.forEach(({ m, idx }) => grid.appendChild(_buildMatchCell(m, idx, players)));
    container.appendChild(grid);
  }

  if (played.length > 0) {
    container.insertAdjacentHTML('beforeend', '<div class="tv-matches-section">Rozegrane</div>');
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    played.forEach(({ m, idx }) => grid.appendChild(_buildMatchCell(m, idx, players)));
    container.appendChild(grid);
  }
}

function _buildMatchCell(m, idx, players) {
  const cell = document.createElement('div');
  cell.className = 'match-cell';

  const numDiv = document.createElement('div');
  numDiv.className = 'match-num-above';
  numDiv.textContent = '#' + (idx + 1);
  cell.appendChild(numDiv);

  const card = document.createElement('div');
  card.className = 'match-card' + (m.winner !== null ? ' played' : ' unplayed');
  card.dataset.matchIndex = idx;

  const playersDiv = document.createElement('div');
  playersDiv.className = 'match-players';

  if (m.winner !== null) {
    const useSetScore = m.sets && m.sets[0] !== null;
    const w = m.winner === 0 ? 0 : 1;
    const l = 1 - w;
    const wPIdx = w === 0 ? m.p1 : m.p2;
    const lPIdx = l === 0 ? m.p1 : m.p2;
    const wScore = useSetScore ? m.sets[w] : m.legs[w];
    const lScore = useSetScore ? m.sets[l] : m.legs[l];
    const wAvg   = m.avgs[w] !== null ? m.avgs[w].toFixed(1) : null;
    const lAvg   = m.avgs[l] !== null ? m.avgs[l].toFixed(1) : null;
    playersDiv.appendChild(_buildMatchPlayerRow(escapeHtml(players[wPIdx].name), wScore, wAvg, 'winner'));
    playersDiv.appendChild(_buildMatchPlayerRow(escapeHtml(players[lPIdx].name), lScore, lAvg, 'loser'));
  } else {
    playersDiv.appendChild(_buildMatchPlayerRow(escapeHtml(players[m.p1].name), null, null, ''));
    playersDiv.appendChild(_buildMatchPlayerRow(escapeHtml(players[m.p2].name), null, null, ''));
  }

  card.appendChild(playersDiv);
  cell.appendChild(card);
  return cell;
}

function _buildMatchPlayerRow(name, score, avg, rowClass) {
  const row = document.createElement('div');
  row.className = 'match-player-row' + (rowClass ? ' ' + rowClass : '');

  const nameSpan = document.createElement('span');
  nameSpan.className = 'mpname';
  nameSpan.textContent = name;
  row.appendChild(nameSpan);

  if (score !== null && score !== undefined) {
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'mpscore';
    scoreSpan.textContent = score;
    row.appendChild(scoreSpan);
  }

  if (avg !== null && avg !== undefined) {
    const avgSpan = document.createElement('span');
    avgSpan.className = 'mpavg';
    avgSpan.textContent = avg;
    row.appendChild(avgSpan);
  }

  return row;
}
```

- [ ] In `renderTournamentViewScreen()` in `league.js`, remove the `tv-tab-disabled` class from the Mecze tab. Find this line:

```js
document.getElementById('tv-title').textContent = tournament.name;
```

Add immediately after it:

```js
document.getElementById('tv-tab-matches').classList.remove('tv-tab-disabled');
```

- [ ] Wire up tab clicks in `setupEventListeners()` in `app.js`. Add after the `btn-back-from-tournament-view` listener:

```js
// Tournament view: tab switching
document.getElementById('tv-tab-table').addEventListener('click', () => {
  document.getElementById('tv-tab-table').classList.add('active');
  document.getElementById('tv-tab-matches').classList.remove('active');
  document.getElementById('tv-standings').style.display = '';
  document.getElementById('tv-matches').style.display = 'none';
});

document.getElementById('tv-tab-matches').addEventListener('click', () => {
  document.getElementById('tv-tab-matches').classList.add('active');
  document.getElementById('tv-tab-table').classList.remove('active');
  document.getElementById('tv-standings').style.display = 'none';
  document.getElementById('tv-matches').style.display = '';
  if (_activeTournament) renderTournamentMatchesScreen(_activeTournament);
});
```

- [ ] Verify: open the app → Turniej → open an existing tournament → click tab "Mecze". Grid of match cards should appear. Unplayed cards show only player names. Clicking the "Tabela" tab switches back. No console errors.

- [ ] Commit:
```
git add js/league.js js/app.js
git commit -m "feat: render matches tab with 3-column grid and smart ordering"
```

---

## Task 5 — Starter modal + `startTournamentMatch()`

**Files:** Modify `js/app.js`

- [ ] Add two new global variables after the existing `let pendingDeleteTournamentId = null;` line:

```js
let pendingTournamentMatch = null;
let pendingTournamentStarterData = null;
```

- [ ] Add `openTournamentStarterModal()` function (append after `startMatch()`):

```js
function openTournamentStarterModal(tournament, matchIndex) {
  const m  = tournament.matches[matchIndex];
  const mc = tournament.config.matchConfig;
  const p1Name = tournament.players[m.p1].name;
  const p2Name = tournament.players[m.p2].name;

  document.getElementById('starter-match-title').textContent = 'Mecz #' + (matchIndex + 1);
  const fmtLegs = mc.totalSets > 1
    ? 'First to ' + mc.totalSets + ' sets × ' + mc.totalLegs
    : 'First to ' + mc.totalLegs;
  document.getElementById('starter-match-subtitle').textContent =
    p1Name + ' vs ' + p2Name + ' · ' + mc.variant + ' · ' + fmtLegs;

  const opts = document.getElementById('starter-options');
  opts.innerHTML = '';
  [
    { label: '👤 ' + p1Name + ' zaczyna', starter: '0' },
    { label: '🎲 Losuj',                   starter: 'random' },
    { label: '👤 ' + p2Name + ' zaczyna', starter: '1' },
  ].forEach(o => {
    const btn = document.createElement('button');
    btn.className = 'modal-starter-opt';
    btn.dataset.starter = o.starter;
    btn.textContent = o.label;
    opts.appendChild(btn);
  });

  document.getElementById('btn-starter-start').disabled = true;
  pendingTournamentStarterData = { tournament, matchIndex };
  openModal('modal-tournament-starter');
}
```

- [ ] Add `startTournamentMatch()` function (append after `openTournamentStarterModal()`):

```js
function startTournamentMatch(tournament, matchIndex, startingPlayer) {
  const m  = tournament.matches[matchIndex];
  const mc = tournament.config.matchConfig;
  const p1 = tournament.players[m.p1];
  const p2 = tournament.players[m.p2];

  pendingTournamentMatch = {
    tournamentId: tournament.id,
    matchIndex,
    p1Idx: m.p1,
    p2Idx: m.p2,
  };

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
      { primary: p1.primaryDouble ?? null, secondary: p1.secondaryDouble ?? null },
      { primary: p2.primaryDouble ?? null, secondary: p2.secondaryDouble ?? null },
    ],
  });
  undoStack = [];
  updateUndoButton();

  document.getElementById('btn-live-standings').style.display = '';
  showScreen(SCREENS.GAME);
  renderGameScreen(match);
}
```

- [ ] Wire up starter modal events in `setupEventListeners()`. Add after the tournament view tab listeners from Task 4:

```js
// Tournament match card click (delegated from tv-matches)
document.getElementById('tv-matches').addEventListener('click', e => {
  const card = e.target.closest('.match-card');
  if (!card) return;
  const idx = parseInt(card.dataset.matchIndex);
  if (!_activeTournament) return;
  const m = _activeTournament.matches[idx];
  if (m.winner !== null) {
    openTournamentMatchStats(_activeTournament, idx);
  } else {
    openTournamentStarterModal(_activeTournament, idx);
  }
});

// Starter modal: option selection (delegated)
document.getElementById('starter-options').addEventListener('click', e => {
  const btn = e.target.closest('.modal-starter-opt');
  if (!btn) return;
  document.querySelectorAll('.modal-starter-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('btn-starter-start').disabled = false;
});

// Starter modal: close (X)
document.getElementById('btn-starter-close').addEventListener('click', () => {
  closeModal('modal-tournament-starter');
  pendingTournamentStarterData = null;
});

// Starter modal: START
document.getElementById('btn-starter-start').addEventListener('click', () => {
  const sel = document.querySelector('.modal-starter-opt.selected');
  if (!sel || !pendingTournamentStarterData) return;
  const val = sel.dataset.starter;
  const sp  = val === 'random' ? (Math.random() < 0.5 ? 0 : 1) : parseInt(val);
  closeModal('modal-tournament-starter');
  startTournamentMatch(pendingTournamentStarterData.tournament,
                       pendingTournamentStarterData.matchIndex, sp);
  pendingTournamentStarterData = null;
});
```

- [ ] Modify the existing **exit match confirm** handler in `setupEventListeners()` to handle tournament context (find `document.getElementById('btn-exit-confirm').addEventListener`):

```js
document.getElementById('btn-exit-confirm').addEventListener('click', () => {
  closeModal('modal-exit-confirm');
  match = null;
  undoStack = [];
  try { localStorage.removeItem('dart_match'); } catch(e) {}
  document.getElementById('btn-live-standings').style.display = 'none';
  if (pendingTournamentMatch) {
    const ptm = pendingTournamentMatch;
    pendingTournamentMatch = null;
    const t = loadTournaments().find(t => t.id === ptm.tournamentId);
    if (t) {
      _activeTournament = t;
      renderTournamentViewScreen(t);
      showScreen(SCREENS.TOURNAMENT_VIEW);
      document.getElementById('tv-tab-matches').click();
    } else {
      showScreen(SCREENS.HOME);
    }
  } else {
    showScreen(SCREENS.HOME);
  }
});
```

- [ ] Verify: open a tournament → Mecze tab → click an unplayed match. Starter modal opens with correct title, subtitle, and 3 options. Clicking an option highlights it red and enables START. ✕ closes modal. No console errors.

- [ ] Commit:
```
git add js/app.js
git commit -m "feat: tournament starter modal and startTournamentMatch flow"
```

---

## Task 6 — Save result after tournament match + stats back button

**Files:** Modify `js/app.js`

- [ ] Add `saveTournamentMatchResult()` function (append after `startTournamentMatch()`):

```js
function saveTournamentMatchResult(finishedMatch, ptm) {
  const list = loadTournaments();
  const t    = list.find(t => t.id === ptm.tournamentId);
  if (!t) return;
  const m = t.matches[ptm.matchIndex];

  m.winner = finishedMatch.winner;
  m.legs   = [finishedMatch.legsWon[0], finishedMatch.legsWon[1]];
  m.sets   = finishedMatch.totalSets > 1
               ? [finishedMatch.setsWon[0], finishedMatch.setsWon[1]]
               : [null, null];
  m.avgs   = [getMatchAverage(finishedMatch.stats[0]),
              getMatchAverage(finishedMatch.stats[1])];
  m.stats  = [finishedMatch.stats[0], finishedMatch.stats[1]];

  if (t.matches.every(mx => mx.winner !== null)) t.status = 'finished';

  saveTournaments(list);
  _activeTournament = t;
}
```

- [ ] Modify `handleLegClose()` — find the `if (legResult.matchOver)` branch and replace it:

```js
if (legResult.matchOver) {
  if (pendingTournamentMatch) {
    saveTournamentMatchResult(match, pendingTournamentMatch);
  } else {
    saveMatchToHistory(match);
  }
  renderGameScreen(match);
  showLegResultDialog(names[pIdx], legNum, 'match', () => {
    renderStatsScreen(match);
    showScreen(SCREENS.STATS);
    document.getElementById('btn-new-match').textContent =
      pendingTournamentMatch ? 'Wróć do meczów' : 'Nowy mecz';
    document.getElementById('btn-live-standings').style.display = 'none';
    saveToLocalStorage();
  });
}
```

- [ ] Modify the existing **`btn-new-match`** listener (find `document.getElementById('btn-new-match').addEventListener`):

```js
document.getElementById('btn-new-match').addEventListener('click', () => {
  if (pendingTournamentMatch) {
    const ptm = pendingTournamentMatch;
    pendingTournamentMatch = null;
    document.getElementById('btn-new-match').textContent = 'Nowy mecz';
    const t = loadTournaments().find(t => t.id === ptm.tournamentId);
    if (t) {
      _activeTournament = t;
      renderTournamentViewScreen(t);
      showScreen(SCREENS.TOURNAMENT_VIEW);
      document.getElementById('tv-tab-matches').click();
    } else {
      showScreen(SCREENS.HOME);
    }
  } else {
    showScreen(SCREENS.HOME);
  }
});
```

- [ ] Verify: open a tournament → Mecze tab → click unplayed match → start it → play through to completion. After the match ends and "Dalej" is clicked: stats screen appears with "Wróć do meczów" button. Clicking it returns to the tournament's Mecze tab. The completed match now shows in "Rozegrane" with legs and avg. Tournament not in `dart_history`. No console errors.

- [ ] Commit:
```
git add js/app.js
git commit -m "feat: save tournament match result and route stats back button to matches tab"
```

---

## Task 7 — View completed match stats

**Files:** Modify `js/app.js`

- [ ] Add `openTournamentMatchStats()` function (append after `saveTournamentMatchResult()`):

```js
function openTournamentMatchStats(tournament, matchIndex) {
  const m  = tournament.matches[matchIndex];
  if (!m.stats || m.stats[0] === null) return;
  const mc = tournament.config.matchConfig;

  const pseudo = {
    player1:      tournament.players[m.p1].name,
    player2:      tournament.players[m.p2].name,
    winner:       m.winner,
    stats:        m.stats,
    legsWon:      m.legs,
    setsWon:      m.sets?.[0] !== null ? m.sets : [0, 0],
    totalSets:    mc.totalSets,
    totalLegs:    mc.totalLegs,
    variant:      mc.variant,
    inMode:       mc.inMode,
    checkoutMode: mc.checkoutMode,
    matchOver:    true,
  };

  pendingTournamentMatch = {
    tournamentId: tournament.id,
    matchIndex,
    p1Idx: m.p1,
    p2Idx: m.p2,
  };

  renderStatsScreen(pseudo);
  document.getElementById('btn-new-match').textContent = 'Wróć do meczów';
  document.getElementById('btn-live-standings').style.display = 'none';
  showScreen(SCREENS.STATS);
}
```

- [ ] Verify: in the Mecze tab, click a completed match card → full stats screen appears (winner banner, avg, doubles %, fastest leg, etc.) with "Wróć do meczów" button. Clicking returns to Mecze tab. No console errors.

- [ ] Commit:
```
git add js/app.js
git commit -m "feat: view full stats for completed tournament match"
```

---

## Task 8 — `computeLiveStandings()`

**Files:** Modify `js/league.js`

- [ ] Add `computeLiveStandings()` after `computeStandings()`:

```js
function computeLiveStandings(tournament, liveData) {
  const { players, matches, config } = tournament;
  const rows = players.map((p, i) => ({
    index: i, name: p.name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  for (const m of matches) {
    if (m.winner === null) continue;
    const [w, l] = m.winner === 0 ? [m.p1, m.p2] : [m.p2, m.p1];
    rows[w].M++; rows[w].W++; rows[w].pts += config.winPoints;
    rows[l].M++; rows[l].L++; rows[l].pts += config.lossPoints;
    rows[m.p1].legsWon  += (m.legs[0] || 0);
    rows[m.p1].legsLost += (m.legs[1] || 0);
    rows[m.p2].legsWon  += (m.legs[1] || 0);
    rows[m.p2].legsLost += (m.legs[0] || 0);
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  const { p1Idx, p2Idx, legsWon, setsWon } = liveData;
  const useSets = config.matchConfig.totalSets > 1;
  const score0  = useSets ? setsWon[0] : legsWon[0];
  const score1  = useSets ? setsWon[1] : legsWon[1];

  rows[p1Idx].legsWon  += legsWon[0];
  rows[p1Idx].legsLost += legsWon[1];
  rows[p2Idx].legsWon  += legsWon[1];
  rows[p2Idx].legsLost += legsWon[0];

  if (score0 > score1) {
    rows[p1Idx].pts += config.winPoints;
    rows[p2Idx].pts += config.lossPoints;
  } else if (score1 > score0) {
    rows[p2Idx].pts += config.winPoints;
    rows[p1Idx].pts += config.lossPoints;
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost, bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index;
  });

  rows.forEach((row, i) => {
    const diff = row.legsWon - row.legsLost;
    const prev = rows[i - 1], next = rows[i + 1];
    row._tied = (prev && prev.pts === row.pts && (prev.legsWon - prev.legsLost) === diff) ||
                (next && next.pts === row.pts && (next.legsWon - next.legsLost) === diff);
    row._live = row.index === p1Idx || row.index === p2Idx;
  });

  return rows;
}
```

- [ ] Verify (unit-level, console): open browser DevTools console while on a tournament match page and run:
```js
computeLiveStandings(_activeTournament, { p1Idx: 0, p2Idx: 1, legsWon: [1, 0], setsWon: [0, 0] })
```
Confirm the return value is an array of rows with correct `pts`, `legsWon`, `_live` fields.

- [ ] Commit:
```
git add js/league.js
git commit -m "feat: computeLiveStandings with provisional points for leading player"
```

---

## Task 9 — Live standings modal

**Files:** Modify `js/app.js`

- [ ] Add `renderLiveStandingsModal()` function (append after `openTournamentMatchStats()`):

```js
function renderLiveStandingsModal() {
  if (!pendingTournamentMatch) return;
  const ptm = pendingTournamentMatch;

  const t = loadTournaments().find(t => t.id === ptm.tournamentId);
  if (!t) return;

  const liveData = {
    p1Idx:   ptm.p1Idx,
    p2Idx:   ptm.p2Idx,
    legsWon: [match.legsWon[0], match.legsWon[1]],
    setsWon: [match.setsWon[0], match.setsWon[1]],
  };
  const rows = computeLiveStandings(t, liveData);

  document.getElementById('live-modal-subtitle').textContent = t.name;

  const container = document.getElementById('live-standings-container');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'standings-table';
  table.innerHTML = `<thead><tr>
    <th>#</th><th class="left">Gracz</th>
    <th>M</th><th>W</th><th>L</th>
    <th>Legi</th><th>Avg</th><th>Pkt</th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank      = i + 1;
    const isLeader  = rank === 1 && (row.W > 0 || row._live);
    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
    const legsStr   = (row.legsWon + row.legsLost) === 0 ? '&mdash;' : `${row.legsWon}–${row.legsLost}`;
    const legsClass = legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';
    const badge     = row._live ? '<span class="live-badge">LIVE</span>' : '';
    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${isLeader ? 'pos-gold' : 'pos-num'}">${rank}</td>
      <td class="left player-name-cell ${isLeader ? 'name-gold' : ''}">${escapeHtml(row.name)}${badge}</td>
      <td>${row.M}</td><td>${row.W}</td><td>${row.L}</td>
      <td class="${legsClass}">${legsStr}</td>
      <td class="avg-cell">${avg}</td>
      <td class="pts-cell">${row.pts}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  const useSets = t.config.matchConfig.totalSets > 1;
  const s0 = useSets ? match.setsWon[0] : match.legsWon[0];
  const s1 = useSets ? match.setsWon[1] : match.legsWon[1];
  const p1n = escapeHtml(t.players[ptm.p1Idx].name);
  const p2n = escapeHtml(t.players[ptm.p2Idx].name);
  document.getElementById('live-standings-note').textContent =
    s0 > s1 ? `${p1n} prowadzi — punkty przyznane tymczasowo.`
    : s1 > s0 ? `${p2n} prowadzi — punkty przyznane tymczasowo.`
    : 'Remis — punkty nie są jeszcze przyznane.';

  openModal('modal-live-standings');
}
```

- [ ] Wire up live standings events in `setupEventListeners()`. Add after the starter modal listeners:

```js
// Live standings button
document.getElementById('btn-live-standings').addEventListener('click', renderLiveStandingsModal);

// Live standings modal: close (X)
document.getElementById('btn-live-close').addEventListener('click', () => {
  closeModal('modal-live-standings');
});
```

- [ ] Verify end-to-end: start a tournament match → play 1–2 legs → click "📊 Tabela live". Modal opens showing current standings with LIVE badges on both players. Note at bottom shows who's leading (or "Remis"). Score/legs in the table match the current game state. Closing with ✕ works. No console errors.

- [ ] Commit:
```
git add js/app.js
git commit -m "feat: live standings modal during tournament match"
```

---

## Self-review checklist (for executor)

Before marking complete, verify each spec requirement:

- [ ] Matches tab shows 3-column grid — unplayed cards (names only) + played cards (name · score · avg)
- [ ] Match numbers above cards
- [ ] Unplayed matches sorted: players who waited longest appear first
- [ ] Clicking unplayed card → starter modal with 3 options + red highlight + START button + ✕
- [ ] START navigates to game screen with correct config and players
- [ ] Exiting mid-match (✕ Menu) returns to Mecze tab (not HOME)
- [ ] Completed match saved to tournament (not dart_history); tournament marked finished when all played
- [ ] Stats screen shows "Wróć do meczów" button that returns to Mecze tab
- [ ] Clicking a played card shows full stats (same as single match stats screen)
- [ ] "📊 Tabela live" button visible only during tournament match
- [ ] Live modal: leading player gets provisional points; tied → no points; legs always counted
- [ ] LIVE badge on both active players in live table
- [ ] Set-format tournament uses sets for live scoring, legs for leg tally
