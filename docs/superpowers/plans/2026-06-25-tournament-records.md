# Tournament Records — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 👑 button to the tournament info bar that opens a modal showing 6 best-ever records set in that tournament, with the name(s) of the holder(s).

**Architecture:** Compute on open — `computeTournamentRecords(tournament)` iterates all played matches and extracts per-match and per-leg bests. `openTournamentRecordsModal(tournament)` renders the results as a static 3-column table. `_appendInfoBarBtns` is rewritten to position all 3 info-bar buttons (⚙/📊/👑) programmatically via a loop.

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
- Modify: `index.html` — insert records modal after `#modal-tournament-stats`, before `<!-- Scripts -->`
- Modify: `css/style.css` — append at end

**Interfaces:**
- Produces: `#modal-tournament-records`, `#tr-records-body`, `#btn-tournament-records-close`, CSS classes `.modal-tournament-records`, `.tr-header`, `.tr-table`, `.tr-players`, `.btn-records`

- [ ] **Step 1: Add modal HTML to `index.html`**

Find the exact line:
```html
<!-- Scripts (order matters) -->
```

Insert directly before it (after the `</div>` that closes `#modal-tournament-stats`):

```html
<!-- Tournament records modal -->
<div class="modal modal-tournament-records" id="modal-tournament-records">
  <div class="tr-header">
    <span>Rekordy turnieju</span>
    <button class="modal-close-x" id="btn-tournament-records-close">&#x2715;</button>
  </div>
  <div id="tr-records-body"></div>
</div>

```

- [ ] **Step 2: Add CSS to `css/style.css`**

Append at the very end of the file:

```css
/* ===== TOURNAMENT RECORDS MODAL ===== */
.modal-tournament-records {
  max-width: 420px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding: 0;
}

.tr-header {
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

.tr-header > span {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

/* Records table — 3 columns: label | value | players */
.tr-table td:nth-child(2) {
  white-space: nowrap;
  padding: 0 12px;
  text-align: right;
}

.tr-players {
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Records icon button in info bar — right offset set by JS */
.btn-records {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 1.65rem;
  line-height: 1;
  padding: 2px 6px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s, border-color .15s;
}
.btn-records:hover  { color: var(--text); border-color: #555; }
.btn-records:active { color: var(--accent); }
```

- [ ] **Step 3: Verify in browser**

Open `index.html` in browser. Open DevTools console, run:
```js
document.getElementById('modal-tournament-records')  // → div (not null)
document.getElementById('tr-records-body')           // → div (not null)
```

- [ ] **Step 4: Commit**

```
git add index.html css/style.css
git commit -m "feat: add tournament records modal skeleton and CSS"
```

---

## Task 2: `computeTournamentRecords` function

**Files:**
- Modify: `js/league.js` — insert before `function _appendInfoBarBtns(isActive, tournament) {`

**Interfaces:**
- Consumes: `tournament.matches[].stats[0|1]` (full `createPlayerStats()` objects with `legs[]` arrays), `tournament.players[]`, `getMatchAverage(stats)` and `getFirst9Average(stats)` from `stats.js`
- Produces: `computeTournamentRecords(tournament)` →
  ```js
  {
    matchAvg:        { value: number|null, players: string[] },
    legAvg:          { value: number|null, players: string[] },
    first9Avg:       { value: number|null, players: string[] },
    fastestLeg:      { value: number|null, players: string[] },
    highestCheckout: { value: number|null, players: string[] },
    doublePercent:   { value: number|null, players: Array<{ name: string, hits: number, attempts: number }> },
  }
  ```

- [ ] **Step 1: Add `computeTournamentRecords` to `js/league.js`**

Find the exact line:
```js
function _appendInfoBarBtns(isActive, tournament) {
```

Insert this function directly before it:

```js
function computeTournamentRecords(tournament) {
  const rec = {
    matchAvg:        { value: null, players: [] },
    legAvg:          { value: null, players: [] },
    first9Avg:       { value: null, players: [] },
    fastestLeg:      { value: null, players: [] },
    highestCheckout: { value: null, players: [] },
    doublePercent:   { value: null, players: [] },
  };

  function updateRec(entry, val, name, isBetter) {
    if (val === null || val === undefined) return;
    if (entry.value === null || isBetter(val, entry.value)) {
      entry.value = val; entry.players = [name];
    } else if (val === entry.value) {
      entry.players.push(name);
    }
  }

  const played = tournament.matches.filter(m => !m.isBye && m.winner !== null);

  for (const m of played) {
    for (let si = 0; si < 2; si++) {
      const s = m.stats[si];
      if (!s) continue;
      const pi = si === 0 ? m.p1 : m.p2;
      const name = tournament.players[pi]?.name;
      if (!name) continue;

      // Per-match records
      updateRec(rec.matchAvg,  getMatchAverage(s), name, (a, b) => a > b);
      const f9 = getFirst9Average(s);
      if (f9 > 0) updateRec(rec.first9Avg, f9, name, (a, b) => a > b);

      // Double percent — special structure, handled inline
      if (s.doubleAttempts > 0) {
        const pct = s.doubleHits / s.doubleAttempts * 100;
        if (rec.doublePercent.value === null || pct > rec.doublePercent.value) {
          rec.doublePercent.value = pct;
          rec.doublePercent.players = [{ name, hits: s.doubleHits, attempts: s.doubleAttempts }];
        } else if (pct === rec.doublePercent.value) {
          rec.doublePercent.players.push({ name, hits: s.doubleHits, attempts: s.doubleAttempts });
        }
      }

      // Per-leg records
      for (const leg of s.legs) {
        updateRec(rec.legAvg,     leg.average,     name, (a, b) => a > b);
        updateRec(rec.fastestLeg, leg.dartsThrown, name, (a, b) => a < b);
        if (leg.checkout !== null) {
          updateRec(rec.highestCheckout, leg.checkout, name, (a, b) => a > b);
        }
      }
    }
  }

  return rec;
}

```

- [ ] **Step 2: Verify in browser**

Open `index.html`, navigate to any tournament, then in DevTools console:
```js
typeof computeTournamentRecords                          // → "function"
computeTournamentRecords(_activeTournament)
// → object with matchAvg/legAvg/first9Avg/fastestLeg/highestCheckout/doublePercent
// Each entry has .value (number or null) and .players (array)
```

If `_activeTournament` is null, navigate to any tournament first.

- [ ] **Step 3: Commit**

```
git add js/league.js
git commit -m "feat: add computeTournamentRecords aggregation function"
```

---

## Task 3: Modal renderer + update info bar buttons

**Files:**
- Modify: `js/league.js` — add `openTournamentRecordsModal` before `_appendInfoBarBtns`; replace `_appendInfoBarBtns` body

**Interfaces:**
- Consumes: `computeTournamentRecords(tournament)` (Task 2), `openModal(id)` / `closeModal(id)` from `ui.js`, `escapeHtml(str)` from `players.js`, `#modal-tournament-records` / `#tr-records-body` / `#btn-tournament-records-close` (Task 1), `.stats-table` and `.tr-players` CSS classes (Task 1 + existing)
- Produces: `openTournamentRecordsModal(tournament)` — opens records modal; updated `_appendInfoBarBtns` — positions ⚙/📊/👑 programmatically

- [ ] **Step 1: Add `openTournamentRecordsModal` before `_appendInfoBarBtns`**

Find the exact line:
```js
function _appendInfoBarBtns(isActive, tournament) {
```

Insert this function directly before it (after `computeTournamentRecords`):

```js
function openTournamentRecordsModal(tournament) {
  const rec = computeTournamentRecords(tournament);
  const body = document.getElementById('tr-records-body');

  function renderPlayers(entry, isDouble) {
    if (isDouble) {
      return entry.players.map(x => `${escapeHtml(x.name)} (${x.hits}/${x.attempts})`).join(', ');
    }
    return entry.players.map(escapeHtml).join(', ');
  }

  const rows = [
    { label: 'Najwyższa średnia meczu',   entry: rec.matchAvg,        fmt: v => v.toFixed(2),       isDouble: false },
    { label: 'Najwyższa średnia legu',     entry: rec.legAvg,          fmt: v => v.toFixed(2),       isDouble: false },
    { label: 'Najwyższa śr. pierwszych 9', entry: rec.first9Avg,       fmt: v => v.toFixed(2),       isDouble: false },
    { label: 'Najszybszy leg',             entry: rec.fastestLeg,      fmt: v => v + ' lotek',       isDouble: false },
    { label: 'Najwyższy checkout',         entry: rec.highestCheckout, fmt: v => String(v),          isDouble: false },
    { label: 'Skuteczność double',         entry: rec.doublePercent,   fmt: v => v.toFixed(1) + '%', isDouble: true  },
  ];

  let html = '<table class="stats-table tr-table"><tbody>';
  for (const row of rows) {
    if (row.entry.value === null) continue;
    html += `<tr>
      <td>${row.label}</td>
      <td><strong>${row.fmt(row.entry.value)}</strong></td>
      <td class="tr-players">${renderPlayers(row.entry, row.isDouble)}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  body.innerHTML = html;

  document.getElementById('btn-tournament-records-close').onclick =
    () => closeModal('modal-tournament-records');
  openModal('modal-tournament-records');
}

```

- [ ] **Step 2: Replace `_appendInfoBarBtns` body**

Find and replace the entire existing `_appendInfoBarBtns` function. The old function is:

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

Replace it with:

```js
function _appendInfoBarBtns(isActive, tournament) {
  const infoBar = document.getElementById('tv-info-bar');
  if (!infoBar) return;

  document.getElementById('btn-tv-format-settings')?.remove();
  document.getElementById('btn-tv-stats')?.remove();
  document.getElementById('btn-tv-records')?.remove();

  // Build button list rightmost-first; each gets right: 12 + i*40 px
  const btns = [];
  if (isActive) btns.push({ id: 'btn-tv-format-settings', cls: 'btn-fmt-settings', text: '⚙',  fn: () => openFormatEditModal(_activeTournament)       });
  btns.push(             { id: 'btn-tv-stats',             cls: 'btn-stats',        text: '📊', fn: () => openTournamentStatsModal(tournament)           });
  btns.push(             { id: 'btn-tv-records',           cls: 'btn-records',      text: '👑', fn: () => openTournamentRecordsModal(tournament)         });

  btns.forEach((def, i) => {
    const btn = document.createElement('button');
    btn.id          = def.id;
    btn.className   = def.cls;
    btn.textContent = def.text;
    btn.style.right = (12 + i * 40) + 'px';
    btn.addEventListener('click', def.fn);
    infoBar.appendChild(btn);
  });
}
```

- [ ] **Step 3: Verify in browser — active tournament**

1. Open `index.html`, navigate to an active tournament
2. Info bar shows three buttons: 👑 (leftmost) · 📊 · ⚙ (rightmost)
3. Click 👑 — modal opens titled "Rekordy turnieju"
4. Table shows rows for available records (any played matches)
5. Each row: label | bold value | muted player name(s)
6. Skuteczność double row shows `XX.X% (hits/attempts)` per player if present
7. ✕ closes the modal
8. 📊 and ⚙ still work correctly

- [ ] **Step 4: Verify in browser — finished tournament**

1. Navigate to a finished tournament
2. Info bar shows two buttons: 👑 · 📊 (no ⚙)
3. Click 👑 — modal opens with all 6 records (or 5 if no double data)
4. All players show correct names; tied records list all holders

- [ ] **Step 5: Verify — tournament with no played matches**

1. Create a new active tournament and don't play any matches
2. Navigate to it, click 👑
3. Modal opens with an empty table (no rows shown — all values null)

- [ ] **Step 6: Commit**

```
git add js/league.js
git commit -m "feat: add tournament records modal with 6 records and crown button"
```
