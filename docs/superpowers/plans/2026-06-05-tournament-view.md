# Tournament View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tournament list screen, league standings table, and all required data plumbing — completing the "create and view a league tournament" flow.

**Architecture:** New `js/league.js` (data layer + rendering) loads between `ui.js` and `tournament.js`. Tournament state persists in `dart_tournaments` localStorage key. Standings are computed fresh from `matches[]` on every render. Event listeners wired in `app.js`, following the existing pattern of history and players screens.

**Tech Stack:** Vanilla JS, HTML5, CSS3 — no build step. Manual browser testing.

**Spec:** `docs/superpowers/specs/2026-06-05-tournament-view-design.md`

---

## File Map

| Action | File | What changes |
|---|---|---|
| Create | `js/league.js` | Data layer + both render functions |
| Modify | `index.html` | 2 new screens, 1 new modal, name field in wizard step 1, league.js script tag |
| Modify | `js/ui.js` | Add `TOURNAMENT_LIST` and `TOURNAMENT_VIEW` to `SCREENS` |
| Modify | `js/tournament.js` | Step 1 validation (name required), btn-create-tournament handler, t-back-1 destination |
| Modify | `js/app.js` | Reroute TURNIEJ button; wire tournament list/view/modal events; add `pendingDeleteTournamentId` global |
| Modify | `css/style.css` | Tournament list styles, standings table styles, tournament view styles |

---

## Task 1: `js/league.js` — Data Layer

**Files:**
- Create: `js/league.js`

- [ ] **Step 1: Create `js/league.js` with full data layer**

```js
// League tournament — data, schedule, standings

const TOURNAMENTS_KEY = 'dart_tournaments';
const CHECKOUT_LABELS = { double: 'Double-out', master: 'Master-out', straight: 'Straight-out' };

let _activeTournament = null;

function loadTournaments() {
  try { return JSON.parse(localStorage.getItem(TOURNAMENTS_KEY) || '[]'); }
  catch { return []; }
}

function saveTournaments(list) {
  let active   = list.filter(t => t.status === 'active');
  let finished = list.filter(t => t.status === 'finished');
  if (finished.length > 40) {
    finished.sort((a, b) => a.createdAt - b.createdAt);
    finished = finished.slice(finished.length - 40);
  }
  try { localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify([...active, ...finished])); } catch {}
}

function generateSchedule(numPlayers, leagueRounds) {
  const matches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      matches.push({ p1: i, p2: j, winner: null, legs: [null, null], avgs: [null, null] });
      if (leagueRounds === 'double') {
        matches.push({ p1: j, p2: i, winner: null, legs: [null, null], avgs: [null, null] });
      }
    }
  }
  return matches;
}

function createTournament(config, players) {
  const tournament = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    name: config.name,
    status: 'active',
    createdAt: Math.floor(Date.now() / 1000),
    config: {
      numPlayers: config.numPlayers,
      format: config.format,
      leagueRounds: config.leagueRounds,
      winPoints: config.winPoints,
      lossPoints: config.lossPoints,
      matchConfig: { ...config.matchConfig },
    },
    players,
    matches: generateSchedule(players.length, config.leagueRounds),
  };
  const list = loadTournaments();
  list.push(tournament);
  saveTournaments(list);
  return tournament;
}

function deleteTournament(id) {
  saveTournaments(loadTournaments().filter(t => t.id !== id));
}

function computeStandings(tournament) {
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
    rows[m.p1].legsWon  += m.legs[0]; rows[m.p1].legsLost += m.legs[1];
    rows[m.p2].legsWon  += m.legs[1]; rows[m.p2].legsLost += m.legs[0];
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index;
  });

  // Mark tied groups (same pts AND same legDiff)
  rows.forEach((row, i) => {
    const diff = row.legsWon - row.legsLost;
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const tiedWithPrev = prev && prev.pts === row.pts && (prev.legsWon - prev.legsLost) === diff;
    const tiedWithNext = next && next.pts === row.pts && (next.legsWon - next.legsLost) === diff;
    row._tied = tiedWithPrev || tiedWithNext;
  });

  return rows;
}
```

- [ ] **Step 2: Verify in browser console**

Open `index.html` (after adding the script tag in Task 2). In DevTools console run:
```js
const t = createTournament(
  { name:'Test', numPlayers:4, format:'league', leagueRounds:'single', winPoints:2, lossPoints:0, matchConfig:{variant:501,totalSets:1,totalLegs:3,inMode:'straight',checkoutMode:'double'} },
  [{name:'A'},{name:'B'},{name:'C'},{name:'D'}]
);
console.log(t.matches.length); // expected: 6
console.log(computeStandings(t).map(r => r.name)); // expected: ['A','B','C','D'] (any order, all tied)
deleteTournament(t.id);
console.log(loadTournaments().find(x => x.id === t.id)); // expected: undefined
```

---

## Task 2: HTML Scaffold

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add name field to wizard step 1 (`#wstep-1`)**

Find in `index.html`:
```html
    <!-- ── Step 1: Number of players ── -->
    <div class="wizard-step" id="wstep-1">
      <div class="wizard-title">🎯 Nowy turniej</div>
      <div class="step-indicator">Krok 1 z 4</div>
      <label class="wlabel" for="t-num-players">Liczba graczy</label>
```
Replace with:
```html
    <!-- ── Step 1: Number of players ── -->
    <div class="wizard-step" id="wstep-1">
      <div class="wizard-title">🎯 Nowy turniej</div>
      <div class="step-indicator">Krok 1 z 4</div>
      <label class="wlabel" for="t-name">Nazwa turnieju</label>
      <input id="t-name" type="text" class="player-name-input" maxlength="40"
             placeholder="np. Liga czwartkowa" autocomplete="off">
      <label class="wlabel" for="t-num-players">Liczba graczy</label>
```

- [ ] **Step 2: Add `screen-tournament-list` before `<!-- ===== TOURNAMENT SCREEN =====`**

Find `<!-- ===== TOURNAMENT SCREEN ===== -->` and insert immediately before it:
```html
<!-- ===== TOURNAMENT LIST SCREEN ===== -->
<section id="screen-tournament-list" class="screen">
  <div class="secondary-header">
    <button id="btn-back-from-tournament-list" class="btn-back">&#8592; Powrót</button>
    <h2>Turnieje</h2>
    <span></span>
  </div>
  <div id="tournament-list-body" class="tournament-list-body"></div>
  <div class="tournament-list-footer">
    <button id="btn-new-tournament" class="btn btn-primary">+ Nowy turniej</button>
  </div>
</section>

<!-- ===== TOURNAMENT VIEW SCREEN ===== -->
<section id="screen-tournament-view" class="screen">
  <div class="secondary-header">
    <button id="btn-back-from-tournament-view" class="btn-back">&#8592; Turnieje</button>
    <h2 id="tv-title">Turniej</h2>
    <span></span>
  </div>
  <div class="tv-tabs">
    <button class="tv-tab active" id="tv-tab-table">Tabela</button>
    <button class="tv-tab tv-tab-disabled" id="tv-tab-matches">Mecze</button>
  </div>
  <div id="tv-info-bar" class="tv-info-bar"></div>
  <div id="tv-standings" class="tv-standings"></div>
</section>

```

- [ ] **Step 3: Add `modal-delete-tournament` after the existing `modal-delete-record` block**

Find `<!-- Clear history confirmation -->` and insert before it:
```html
<!-- Delete tournament confirmation -->
<div class="modal" id="modal-delete-tournament">
  <h3>Usunąć turniej?</h3>
  <p class="exit-confirm-msg">Turniej zostanie trwale usunięty wraz ze wszystkimi wynikami.</p>
  <div class="exit-confirm-buttons">
    <button class="btn btn-secondary" id="btn-delete-tournament-cancel">Anuluj</button>
    <button class="btn btn-danger" id="btn-delete-tournament-confirm">Usuń</button>
  </div>
</div>

```

- [ ] **Step 4: Add `league.js` script tag**

Find:
```html
<script src="js/ui.js"></script>
<script src="js/tournament.js"></script>
```
Replace with:
```html
<script src="js/ui.js"></script>
<script src="js/league.js"></script>
<script src="js/tournament.js"></script>
```

---

## Task 3: SCREENS + Wiring (ui.js, tournament.js, app.js)

**Files:**
- Modify: `js/ui.js`
- Modify: `js/tournament.js`
- Modify: `js/app.js`

- [ ] **Step 1: Add new screen constants to `js/ui.js` line 3**

Replace:
```js
const SCREENS = { HOME: 'home', SETUP: 'setup', GAME: 'game', STATS: 'stats', PLAYERS: 'players', HISTORY: 'history', HISTORY_DETAIL: 'history-detail', TOURNAMENT: 'tournament' };
```
With:
```js
const SCREENS = { HOME: 'home', SETUP: 'setup', GAME: 'game', STATS: 'stats', PLAYERS: 'players', HISTORY: 'history', HISTORY_DETAIL: 'history-detail', TOURNAMENT: 'tournament', TOURNAMENT_LIST: 'tournament-list', TOURNAMENT_VIEW: 'tournament-view' };
```

- [ ] **Step 2: Update `initTournamentWizard()` in `js/tournament.js` — add name reset and `name` field**

Find:
```js
function initTournamentWizard() {
  tournamentConfig = {
    numPlayers: null,
    format: 'league',
```
Replace with:
```js
function initTournamentWizard() {
  tournamentConfig = {
    name: '',
    numPlayers: null,
    format: 'league',
```

Then find (still inside `initTournamentWizard`):
```js
  // Reset step 1 input and error
  const inp = document.getElementById('t-num-players');
  if (inp) inp.value = '';
  const err = document.getElementById('t-step1-error');
  if (err) err.hidden = true;
```
Replace with:
```js
  // Reset step 1 inputs and error
  const nameInp = document.getElementById('t-name');
  if (nameInp) nameInp.value = '';
  const inp = document.getElementById('t-num-players');
  if (inp) inp.value = '';
  const err = document.getElementById('t-step1-error');
  if (err) err.hidden = true;
```

- [ ] **Step 3: Update step 1 DALEJ validation in `js/tournament.js`**

Find:
```js
document.getElementById('t-next-1').addEventListener('click', () => {
  const raw = document.getElementById('t-num-players').value.trim();
  const val = parseInt(raw);
  const err = document.getElementById('t-step1-error');
  if (!raw || isNaN(val) || val < 3 || val > 6) {
    err.textContent = 'Wpisz liczbę graczy od 3 do 6.';
    err.hidden = false;
    return;
  }
  err.hidden = true;
  tournamentConfig.numPlayers = val;
  showWizardStep(2);
});
```
Replace with:
```js
document.getElementById('t-next-1').addEventListener('click', () => {
  const name = document.getElementById('t-name').value.trim();
  const raw  = document.getElementById('t-num-players').value.trim();
  const val  = parseInt(raw);
  const err  = document.getElementById('t-step1-error');
  if (!name) {
    err.textContent = 'Wpisz nazwę turnieju.';
    err.hidden = false;
    return;
  }
  if (!raw || isNaN(val) || val < 3 || val > 6) {
    err.textContent = 'Wpisz liczbę graczy od 3 do 6.';
    err.hidden = false;
    return;
  }
  err.hidden = true;
  tournamentConfig.name = name;
  tournamentConfig.numPlayers = val;
  showWizardStep(2);
});
```

- [ ] **Step 4: Update `t-back-1` destination in `js/tournament.js`**

Find:
```js
document.getElementById('t-back-1').addEventListener('click', () => {
  tournamentConfig = null;
  showScreen(SCREENS.HOME);
});
```
Replace with:
```js
document.getElementById('t-back-1').addEventListener('click', () => {
  tournamentConfig = null;
  renderTournamentListScreen();
  showScreen(SCREENS.TOURNAMENT_LIST);
});
```

- [ ] **Step 5: Update `btn-create-tournament` handler in `js/tournament.js`**

Find:
```js
// ── Create tournament: auto-save new players (without tournament doubles) ──
document.getElementById('btn-create-tournament').addEventListener('click', () => {
  const n = tournamentConfig.numPlayers;
  for (let i = 1; i <= n; i++) {
    const name = document.getElementById('t-pname-' + i).value.trim();
    if (name) createPlayer(name, null, null);
  }
  populatePlayerSuggestions();
});
```
Replace with:
```js
// ── Create tournament: save new players + build tournament ──
document.getElementById('btn-create-tournament').addEventListener('click', () => {
  const n = tournamentConfig.numPlayers;
  const players = [];
  for (let i = 1; i <= n; i++) {
    const name = document.getElementById('t-pname-' + i).value.trim();
    if (name) createPlayer(name, null, null);
    players.push({
      name,
      primaryDouble:   parseInt(document.getElementById('t-pd1-' + i).value) || null,
      secondaryDouble: parseInt(document.getElementById('t-pd2-' + i).value) || null,
    });
  }
  populatePlayerSuggestions();

  if (tournamentConfig.seeding === 'random') {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  const tournament = createTournament(tournamentConfig, players);
  renderTournamentViewScreen(tournament);
  showScreen(SCREENS.TOURNAMENT_VIEW);
});
```

- [ ] **Step 6: Add `pendingDeleteTournamentId` global to `js/app.js`**

Find the globals block at the top:
```js
let pendingDeleteRecordId = null;
let pendingEditPlayerId = null;
let pendingDeletePlayerId = null;
```
Add after it:
```js
let pendingDeleteTournamentId = null;
```

- [ ] **Step 7: Reroute TURNIEJ button and wire all tournament events in `js/app.js`**

Find:
```js
  // Navigation: home → tournament wizard
  document.getElementById('btn-home-tournament').addEventListener('click', () => {
    initTournamentWizard();
    showScreen(SCREENS.TOURNAMENT);
  });
```
Replace with:
```js
  // Navigation: home → tournament list
  document.getElementById('btn-home-tournament').addEventListener('click', () => {
    renderTournamentListScreen();
    showScreen(SCREENS.TOURNAMENT_LIST);
  });

  // Tournament list: back to home
  document.getElementById('btn-back-from-tournament-list').addEventListener('click', () => {
    showScreen(SCREENS.HOME);
  });

  // Tournament list: new tournament button
  document.getElementById('btn-new-tournament').addEventListener('click', () => {
    initTournamentWizard();
    showScreen(SCREENS.TOURNAMENT);
  });

  // Tournament list: click card or delete (delegated)
  document.getElementById('tournament-list-body').addEventListener('click', e => {
    const deleteBtn = e.target.closest('.tc-delete');
    if (deleteBtn) {
      pendingDeleteTournamentId = deleteBtn.dataset.id;
      openModal('modal-delete-tournament');
      return;
    }
    const card = e.target.closest('.tournament-card-item');
    if (card) {
      const tournament = loadTournaments().find(t => t.id === card.dataset.id);
      if (tournament) {
        renderTournamentViewScreen(tournament);
        showScreen(SCREENS.TOURNAMENT_VIEW);
      }
    }
  });

  // Modal: delete tournament
  document.getElementById('btn-delete-tournament-cancel').addEventListener('click', () => {
    closeModal('modal-delete-tournament');
    pendingDeleteTournamentId = null;
  });
  document.getElementById('btn-delete-tournament-confirm').addEventListener('click', () => {
    closeModal('modal-delete-tournament');
    if (pendingDeleteTournamentId) {
      deleteTournament(pendingDeleteTournamentId);
      pendingDeleteTournamentId = null;
      renderTournamentListScreen();
    }
  });

  // Tournament view: back to list
  document.getElementById('btn-back-from-tournament-view').addEventListener('click', () => {
    renderTournamentListScreen();
    showScreen(SCREENS.TOURNAMENT_LIST);
  });
```

---

## Task 4: `renderTournamentListScreen()` in `js/league.js`

**Files:**
- Modify: `js/league.js` (append at end)

- [ ] **Step 1: Append `renderTournamentListScreen` and `buildTournamentCard` to `js/league.js`**

```js
function renderTournamentListScreen() {
  const all      = loadTournaments();
  const active   = all.filter(t => t.status === 'active').sort((a, b) => b.createdAt - a.createdAt);
  const finished = all.filter(t => t.status === 'finished').sort((a, b) => b.createdAt - a.createdAt);

  const body = document.getElementById('tournament-list-body');
  body.innerHTML = '';

  if (all.length === 0) {
    body.innerHTML = '<p class="t-list-empty">Brak turniejów</p>';
  } else {
    if (active.length > 0) {
      body.insertAdjacentHTML('beforeend', '<div class="t-list-section-label">W toku</div>');
      active.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
    if (finished.length > 0) {
      body.insertAdjacentHTML('beforeend', '<div class="t-list-section-label">Zakończone</div>');
      finished.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
  }

  const btn = document.getElementById('btn-new-tournament');
  const atLimit = active.length >= 5;
  btn.disabled = atLimit;
  btn.title = atLimit ? 'Maksymalna liczba aktywnych turniejów: 5' : '';
}

function buildTournamentCard(t) {
  const div = document.createElement('div');
  div.className = 'tournament-card-item';
  div.dataset.id = t.id;

  const mc    = t.config.matchConfig;
  const meta  = `Liga · ${t.players.length} graczy · ${mc.variant} · First to ${mc.totalLegs}`;
  const played = t.matches.filter(m => m.winner !== null).length;
  const total  = t.matches.length;

  let statusHtml;
  if (t.status === 'active') {
    statusHtml = `<span class="tc-status tc-active">▶ W toku — ${played}/${total} meczów</span>`;
  } else {
    const standings = computeStandings(t);
    const winner    = standings[0] ? escapeHtml(standings[0].name) : '—';
    statusHtml = `<span class="tc-status tc-done">✓ Zakończony · Wygrał: ${winner}</span>`;
  }

  div.innerHTML = `
    <div class="tc-main">
      <div class="tc-name">${escapeHtml(t.name)}</div>
      <div class="tc-meta">${meta}</div>
      ${statusHtml}
    </div>
    <button class="btn-delete-record tc-delete" data-id="${t.id}" title="Usuń">✕</button>
  `;
  return div;
}
```

- [ ] **Step 2: Verify in browser**

Click TURNIEJ on home screen. Should show "Brak turniejów" empty state with "+ Nowy turniej" button. Click "Nowy turniej" → wizard opens. Complete wizard → navigates to tournament view. Back → shows tournament list with the new card.

---

## Task 5: `renderTournamentViewScreen()` in `js/league.js`

**Files:**
- Modify: `js/league.js` (append at end)

- [ ] **Step 1: Append `renderTournamentViewScreen` to `js/league.js`**

```js
function renderTournamentViewScreen(tournament) {
  _activeTournament = tournament;
  document.getElementById('tv-title').textContent = tournament.name;

  // Info bar
  const mc = tournament.config.matchConfig;
  const roundsLabel = tournament.config.leagueRounds === 'double' ? 'Dwie rundy' : 'Jedna runda';
  const played = tournament.matches.filter(m => m.winner !== null).length;
  const total  = tournament.matches.length;
  document.getElementById('tv-info-bar').innerHTML =
    `<span>${mc.variant} · First to ${mc.totalLegs} · ${CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode}</span>` +
    `<span>${tournament.players.length} graczy · ${roundsLabel} · ${played}/${total} meczów rozegranych</span>`;

  // Standings table
  const rows     = computeStandings(tournament);
  const container = document.getElementById('tv-standings');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'standings-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>#</th><th class="left">Gracz</th>
    <th>M</th><th>W</th><th>L</th>
    <th>Legi</th><th>Avg</th><th>Pkt</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank      = i + 1;
    const isLeader  = rank === 1 && row.M > 0;
    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '—';
    const legsStr   = row.M === 0 ? '—' : `${row.legsWon}-${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${isLeader ? 'pos-gold' : 'pos-num'}">${rank}</td>
      <td class="left player-name-cell ${isLeader ? 'name-gold' : ''}">${escapeHtml(row.name)}</td>
      <td>${row.M}</td>
      <td>${row.W}</td>
      <td>${row.L}</td>
      <td class="${legsClass}">${legsStr}</td>
      <td class="avg-cell">${avg}</td>
      <td class="pts-cell">${row.pts}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}
```

- [ ] **Step 2: Verify in browser**

Create a tournament with 4 players. After clicking UTWÓRZ TURNIEJ:
- Header shows tournament name
- Info bar shows variant/legs/format/progress (0/6 matches)
- Table has 4 rows, all with M=0, W=0, L=0, Legi=—, Avg=—, Pkt=0
- Rank 1 is NOT gold (no matches played → isLeader is false, because `row.M > 0` fails)
- Tabs visible: "Tabela" active (red underline), "Mecze" greyed out

---

## Task 6: CSS

**Files:**
- Modify: `css/style.css` (append at end)

- [ ] **Step 1: Append tournament list + view + standings styles to `css/style.css`**

```css
/* ===== TOURNAMENT LIST & VIEW SCREENS ===== */
#screen-tournament-list,
#screen-tournament-view {
  flex-direction: column;
}

#screen-tournament-list .secondary-header h2,
#screen-tournament-view .secondary-header h2 {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

/* Tournament list body */
.tournament-list-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tournament-list-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.t-list-section-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-top: 8px;
  margin-bottom: 2px;
  padding-left: 2px;
}

.t-list-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 48px 0;
  font-size: 0.9rem;
}

.tournament-card-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color .15s;
}
.tournament-card-item:hover { border-color: #444; }

.tc-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.tc-name { font-weight: 700; font-size: 0.9rem; }
.tc-meta { font-size: 0.72rem; color: var(--text-muted); }
.tc-status { font-size: 0.72rem; font-weight: 600; }
.tc-active { color: var(--accent2); }
.tc-done   { color: #555; }
.tc-delete { flex-shrink: 0; }

/* Tournament view tabs */
.tv-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.tv-tab {
  flex: 1;
  padding: 11px 0;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s, border-bottom-color .15s;
}
.tv-tab.active       { color: var(--accent); border-bottom-color: var(--accent); }
.tv-tab.tv-tab-disabled { color: #3a3a3a; pointer-events: none; }

/* Info bar */
.tv-info-bar {
  padding: 8px 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

/* Standings container */
.tv-standings {
  flex: 1;
  overflow-y: auto;
}

/* Standings table */
.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.standings-table th {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #555;
  font-weight: 600;
  padding: 8px 8px;
  border-bottom: 1px solid var(--border);
  text-align: center;
}
.standings-table th.left { text-align: left; }

.standings-table td {
  padding: 9px 8px;
  text-align: center;
  border-bottom: 1px solid #161616;
  color: var(--text);
}
.standings-table td.left { text-align: left; }
.standings-table tbody tr:last-child td { border-bottom: none; }
.standings-table tbody tr.standings-tied { background: #0e1a0e; }

.pos-num  { color: #555; font-weight: 700; }
.pos-gold { color: #f5c218; font-weight: 700; }

.player-name-cell { font-weight: 600; }
.name-gold        { color: #f5c218; }

.legs-pos  { color: var(--green); }
.legs-neg  { color: var(--accent); }
.legs-even { color: #888; }

.avg-cell { color: var(--accent2); }
.pts-cell { color: var(--accent); font-weight: 700; }
```

- [ ] **Step 2: Verify in browser**

Navigate through the full flow:
- Home → TURNIEJ → empty list (grey "Brak turniejów" + active "+ Nowy turniej")
- Nowy turniej → wizard (step 1 now has "Nazwa turnieju" input above "Liczba graczy")
- Complete wizard → tournament view (header with name, tabs, info bar, standings)
- Back → list shows tournament card with name, meta, "▶ W toku — 0/X meczów"
- Click ✕ on card → modal opens → confirm → card removed
- Back to home → TURNIEJ button still works

---

## Self-Review Checklist

- [ ] `generateSchedule(4, 'single')` → 6 matches (C(4,2)) ✓
- [ ] `generateSchedule(4, 'double')` → 12 matches ✓
- [ ] `computeStandings` skips `m.winner === null` entries ✓
- [ ] Tied group detection: checks both `tiedWithPrev` AND `tiedWithNext` ✓
- [ ] `saveTournaments` trims finished to max 40 (oldest removed) ✓
- [ ] "Nowy turniej" disabled when ≥ 5 active tournaments ✓
- [ ] `t-back-1` in tournament.js now goes to `TOURNAMENT_LIST`, not `HOME` ✓
- [ ] `btn-home-tournament` in app.js now goes to `TOURNAMENT_LIST`, not wizard ✓
- [ ] `pendingDeleteTournamentId` declared in app.js globals ✓
- [ ] `escapeHtml` from players.js is available globally (players.js loads before league.js) ✓
- [ ] `isLeader` condition: `rank === 1 && row.M > 0` (no gold colouring at start) ✓
- [ ] Name field in wizard step 1 validated before player count ✓
- [ ] `tournament.js` reads `t-name` and saves to `tournamentConfig.name` ✓
