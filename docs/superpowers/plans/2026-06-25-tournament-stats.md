# Tournament Player Stats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 📊 stats icon to the tournament view info bar that opens a modal with per-player aggregated stats (averaged across all played matches) with an expand/collapse accordion.

**Architecture:** Compute on open — iterate `tournament.matches`, aggregate stats per player using existing `getMatchAverage`/`getFirst9Average` helpers. New `computeTournamentPlayerStats(tournament)` + `openTournamentStatsModal(tournament)` in `league.js`. Rename `_appendFmtSettingsBtn` → `_appendInfoBarBtns` to add both the 📊 and ⚙ buttons.

**Tech Stack:** Vanilla HTML5/CSS3/JS, localStorage, no build step. Open `index.html` directly in browser to test.

## Global Constraints

- All UI text in Polish; identifiers/code in English
- No frameworks, no build step — edit files directly, test by opening `index.html` in browser
- CSS variables: `--bg #0d0d0d`, `--surface #1a1a1a`, `--surface2 #242424`, `--border #333`, `--accent #e63946`, `--text #f0f0f0`, `--text-muted #888`, `--radius 12px`
- Commit after each task
- Working directory: `H:\My_projects\DartApp`

---

## Task 1: Modal HTML + CSS

**Files:**
- Modify: `index.html` (after the format-edit modal block, before `<!-- Scripts -->`)
- Modify: `css/style.css` (append at the end)

**Interfaces:**
- Produces: `#modal-tournament-stats` DOM node, `#ts-player-list` container, `.modal-tournament-stats` CSS class, `.ts-*` accordion CSS classes, `.btn-stats` CSS class

- [ ] **Step 1: Add modal HTML to `index.html`**

Find the line `<!-- Scripts (order matters) -->` and insert the following block directly before it (after the format-edit modal `</div>`):

```html
<!-- Tournament stats modal -->
<div class="modal modal-tournament-stats" id="modal-tournament-stats">
  <div class="ts-header">
    <span>Statystyki turnieju</span>
    <button class="modal-close-x" id="btn-tournament-stats-close">&#x2715;</button>
  </div>
  <div id="ts-player-list"></div>
</div>
```

- [ ] **Step 2: Add CSS to `css/style.css`**

Append these rules at the very end of the file:

```css
/* ===== TOURNAMENT STATS MODAL ===== */
.modal-tournament-stats {
  max-width: 420px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding: 0;
}

.ts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
  border-bottom: 1px solid var(--border);
}

.ts-header > span {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

/* Stats icon button in info bar */
.btn-stats {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1;
  padding: 3px 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s, border-color .15s;
}
.btn-stats:hover  { color: var(--text); border-color: #555; }
.btn-stats:active { color: var(--accent); }

/* Player accordion rows */
.ts-player-row { border-bottom: 1px solid var(--border); }

.ts-player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
}
.ts-player-header:active { background: #222; }

.ts-chevron {
  color: var(--text-muted);
  font-style: normal;
  transition: transform 0.2s;
}
.ts-player-row.ts-expanded .ts-chevron { transform: rotate(90deg); }

.ts-stats-body {
  display: none;
  padding: 0 16px 12px;
  background: #111;
}
.ts-player-row.ts-expanded .ts-stats-body { display: block; }

.ts-no-matches {
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 8px 0;
}
```

- [ ] **Step 3: Verify in browser**

Open `index.html` in browser. Open DevTools console, run:
```js
document.getElementById('modal-tournament-stats')
// → should return the modal div (not null)
document.getElementById('ts-player-list')
// → should return the empty div
```

- [ ] **Step 4: Commit**

```
git add index.html css/style.css
git commit -m "feat: add tournament stats modal skeleton and CSS"
```

---

## Task 2: `computeTournamentPlayerStats` function

**Files:**
- Modify: `js/league.js` (insert before the `_appendFmtSettingsBtn` function at line ~1561)

**Interfaces:**
- Consumes: `tournament.matches[].stats[0|1]` (full `createPlayerStats()` objects), `tournament.players[]`, `getMatchAverage(stats)` and `getFirst9Average(stats)` from `stats.js`
- Produces: `computeTournamentPlayerStats(tournament)` → `Array<{ name, matchCount, avg3, first9Avg, legsWon, highestCheckout, fastestLeg, doubleAttempts, doubleHits }>`

- [ ] **Step 1: Add `computeTournamentPlayerStats` to `js/league.js`**

Find the exact line:
```js
function _appendFmtSettingsBtn(isActive) {
```

Insert this function directly before it:

```js
function computeTournamentPlayerStats(tournament) {
  return tournament.players.map((player, playerIndex) => {
    const played = tournament.matches.filter(m =>
      !m.isBye && m.winner !== null &&
      (m.p1 === playerIndex || m.p2 === playerIndex)
    );

    const matchCount = played.length;
    let avg3Sum = 0, first9Sum = 0, legsWon = 0;
    let highestCheckout = 0, fastestLeg = null;
    let doubleAttempts = 0, doubleHits = 0;

    for (const m of played) {
      const si = m.p1 === playerIndex ? 0 : 1;
      const s  = m.stats[si];
      if (!s) continue;
      avg3Sum        += getMatchAverage(s);
      first9Sum      += getFirst9Average(s);
      legsWon        += s.legsWon;
      if (s.highestCheckout > highestCheckout) highestCheckout = s.highestCheckout;
      if (s.fastestLeg !== null) {
        fastestLeg = fastestLeg === null ? s.fastestLeg : Math.min(fastestLeg, s.fastestLeg);
      }
      doubleAttempts += s.doubleAttempts;
      doubleHits     += s.doubleHits;
    }

    return {
      name:            player.name,
      matchCount,
      avg3:            matchCount > 0 ? avg3Sum  / matchCount : 0,
      first9Avg:       matchCount > 0 ? first9Sum / matchCount : 0,
      legsWon,
      highestCheckout,
      fastestLeg,
      doubleAttempts,
      doubleHits,
    };
  });
}

```

- [ ] **Step 2: Verify in browser**

Open a saved tournament via the app, then in DevTools console:
```js
typeof computeTournamentPlayerStats   // → "function"
// If there's an active tournament loaded:
computeTournamentPlayerStats(_activeTournament)
// → array of objects, one per player, with name/matchCount/avg3/etc.
```

If `_activeTournament` is null, navigate to any tournament first, then run the check.

- [ ] **Step 3: Commit**

```
git add js/league.js
git commit -m "feat: add computeTournamentPlayerStats aggregation function"
```

---

## Task 3: Modal renderer + info bar buttons

**Files:**
- Modify: `js/league.js` — add `openTournamentStatsModal`, replace `_appendFmtSettingsBtn` with `_appendInfoBarBtns`, update 4 call sites

**Interfaces:**
- Consumes: `computeTournamentPlayerStats(tournament)` (Task 2), `openModal(id)` / `closeModal(id)` from `ui.js`, `escapeHtml(str)` from `players.js`, `.stats-table` CSS class (existing)
- Produces: `openTournamentStatsModal(tournament)` — opens the modal; `_appendInfoBarBtns(isActive, tournament)` — replaces old `_appendFmtSettingsBtn`

- [ ] **Step 1: Add `openTournamentStatsModal` directly before `_appendFmtSettingsBtn`**

Find the exact line:
```js
function _appendFmtSettingsBtn(isActive) {
```

Insert this new function directly before it (after `computeTournamentPlayerStats` from Task 2):

```js
function openTournamentStatsModal(tournament) {
  const playerStats = computeTournamentPlayerStats(tournament);
  const list = document.getElementById('ts-player-list');
  list.innerHTML = '';

  playerStats.forEach(ps => {
    const row = document.createElement('div');
    row.className = 'ts-player-row';

    const header = document.createElement('div');
    header.className = 'ts-player-header';
    header.innerHTML = `<span>${escapeHtml(ps.name)}</span><i class="ts-chevron">&#9654;</i>`;
    header.addEventListener('click', () => row.classList.toggle('ts-expanded'));

    const body = document.createElement('div');
    body.className = 'ts-stats-body';

    if (ps.matchCount === 0) {
      body.innerHTML = '<p class="ts-no-matches">Brak rozegranych meczów</p>';
    } else {
      const dblPct = ps.doubleAttempts > 0
        ? (ps.doubleHits / ps.doubleAttempts * 100).toFixed(1) + '%'
        : null;
      const rows = [
        `<tr><td>Mecze rozegrane</td><td><strong>${ps.matchCount}</strong></td></tr>`,
        `<tr><td>Legi wygrane</td><td><strong>${ps.legsWon}</strong></td></tr>`,
        `<tr><td>Średnia 3-lotek</td><td><strong>${ps.avg3.toFixed(2)}</strong></td></tr>`,
        `<tr><td>Średnia pierwszych 9</td><td><strong>${ps.first9Avg.toFixed(2)}</strong></td></tr>`,
        ps.highestCheckout > 0
          ? `<tr><td>Najwyższe zamknięcie</td><td><strong>${ps.highestCheckout}</strong></td></tr>`
          : '',
        ps.fastestLeg !== null
          ? `<tr><td>Najszybszy leg</td><td><strong>${ps.fastestLeg} lotek</strong></td></tr>`
          : '',
        dblPct !== null
          ? `<tr><td>Trafione double</td><td><strong>${dblPct} (${ps.doubleHits}/${ps.doubleAttempts})</strong></td></tr>`
          : '',
      ].join('');
      body.innerHTML = `<table class="stats-table">${rows}</table>`;
    }

    row.appendChild(header);
    row.appendChild(body);
    list.appendChild(row);
  });

  document.getElementById('btn-tournament-stats-close').onclick =
    () => closeModal('modal-tournament-stats');
  openModal('modal-tournament-stats');
}

```

- [ ] **Step 2: Replace `_appendFmtSettingsBtn` with `_appendInfoBarBtns`**

Find and replace the entire existing `_appendFmtSettingsBtn` function body. The old function is:

```js
function _appendFmtSettingsBtn(isActive) {
  const infoBar = document.getElementById('tv-info-bar');
  if (!infoBar) return;
  const existing = document.getElementById('btn-tv-format-settings');
  if (existing) existing.remove();
  if (!isActive) return;
  const btn = document.createElement('button');
  btn.id = 'btn-tv-format-settings';
  btn.className = 'btn-fmt-settings';
  btn.textContent = '⚙';
  btn.addEventListener('click', () => openFormatEditModal(_activeTournament));
  infoBar.appendChild(btn);
}
```

Replace it with:

```js
function _appendInfoBarBtns(isActive, tournament) {
  const infoBar = document.getElementById('tv-info-bar');
  if (!infoBar) return;

  document.getElementById('btn-tv-format-settings')?.remove();
  document.getElementById('btn-tv-stats')?.remove();

  // Stats button — always visible (active and finished)
  const statsBtn = document.createElement('button');
  statsBtn.id        = 'btn-tv-stats';
  statsBtn.className = 'btn-stats';
  statsBtn.textContent = '📊';
  // When gear is also shown, shift left to avoid overlap
  if (isActive) statsBtn.style.right = '52px';
  statsBtn.addEventListener('click', () => openTournamentStatsModal(tournament));
  infoBar.appendChild(statsBtn);

  // Gear button — active tournaments only
  if (!isActive) return;
  const fmtBtn = document.createElement('button');
  fmtBtn.id        = 'btn-tv-format-settings';
  fmtBtn.className = 'btn-fmt-settings';
  fmtBtn.textContent = '⚙';
  fmtBtn.addEventListener('click', () => openFormatEditModal(_activeTournament));
  infoBar.appendChild(fmtBtn);
}
```

- [ ] **Step 3: Update the 4 call sites**

Update each occurrence of `_appendFmtSettingsBtn(...)` to `_appendInfoBarBtns(...)`:

**Call site 1** (groups format, ~line 1066):
```js
// old:
_appendFmtSettingsBtn(tournament.status === 'active');
// new:
_appendInfoBarBtns(tournament.status === 'active', tournament);
```

**Call site 2** (bracket format, ~line 1111):
```js
// old:
_appendFmtSettingsBtn(tournament.status === 'active');
// new:
_appendInfoBarBtns(tournament.status === 'active', tournament);
```

**Call site 3** (liga format, ~line 1157):
```js
// old:
_appendFmtSettingsBtn(tournament.status === 'active');
// new:
_appendInfoBarBtns(tournament.status === 'active', tournament);
```

**Call site 4** (inside `_saveFormatEdit`, ~line 1700):
```js
// old:
_appendFmtSettingsBtn(true);
// new:
_appendInfoBarBtns(true, _activeTournament);
```

- [ ] **Step 4: Verify in browser — active tournament**

1. Open `index.html`, navigate to an active tournament
2. In the info bar you should see both 📊 and ⚙ buttons
3. Click 📊 — modal opens titled "Statystyki turnieju"
4. Players with played matches show expandable rows; click a row to expand — stats table appears with Mecze rozegrane, Legi wygrane, Średnia 3-lotek, Średnia pierwszych 9
5. Players with no played matches show "Brak rozegranych meczów" when expanded
6. ✕ closes the modal
7. ⚙ still opens the format edit modal

- [ ] **Step 5: Verify in browser — finished tournament**

1. Navigate to a finished tournament
2. Info bar should show only 📊 (no ⚙)
3. Click 📊 — modal opens with stats for all players
4. All players should have matchCount > 0 (tournament is finished)

- [ ] **Step 6: Commit**

```
git add js/league.js
git commit -m "feat: add tournament stats modal with player accordion and info bar buttons"
```
