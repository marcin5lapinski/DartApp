# Edit Match Format During Tournament — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ⚙ button to the tournament view header that opens a modal for editing per-phase match formats on an active tournament, with played phases locked.

**Architecture:** New functions in `league.js` (5 functions) handle all modal logic. They reuse `_buildPhaseFormHTML`, `_readPhaseCardConfig`, `_writePhaseCardConfig`, `_updatePhaseChips` from `tournament.js` — those are top-level globals, accessible at call time even though `league.js` loads first. HTML/CSS changes are purely additive.

**Tech Stack:** Vanilla HTML5 + CSS3 + JavaScript (no build step). Open `index.html` directly in browser. Data in `localStorage` via `saveTournaments(list)`.

## Global Constraints

- All UI text in Polish; identifiers and comments in English
- CSS custom properties only (no hardcoded colors): `--bg`, `--surface`, `--border`, `--accent`, `--text`, `--text-muted`, `--green`, `--radius`
- No new JS files — add code to `js/league.js`; no changes to `js/tournament.js` or `js/app.js`
- No automated test suite — each task uses manual browser verification steps
- Commit after every task

---

## File Map

| File | Change |
|---|---|
| `index.html` | Add `#btn-tv-format-settings` button (line 631); add `#modal-format-edit` after line 934 |
| `css/style.css` | Append new rules at end of file: `.modal-format-edit`, `.fmt-edit-header`, `.fmt-edit-liga-form`, `.phase-card.locked`, `.btn-save-format` |
| `js/league.js` | Insert button-wiring block at line 1043; append 5 new functions at end of file |

---

## Task 1: HTML scaffold — settings button + modal skeleton

**Files:**
- Modify: `index.html:631` (replace `<span></span>` spacer)
- Modify: `index.html:934` (append modal after `#modal-group-preview`)

**Interfaces:**
- Produces: `#btn-tv-format-settings` button element (hidden by default); `#modal-format-edit` modal with `#fmt-edit-content` container and `#btn-format-edit-save` / `#btn-format-edit-close` buttons

- [ ] **Step 1: Replace the empty spacer in the tournament-view secondary header**

In `index.html` line 631, find:
```html
    <span></span>
```
Replace with:
```html
    <button id="btn-tv-format-settings" class="btn-back" style="display:none">⚙</button>
```

- [ ] **Step 2: Add the format-edit modal after `#modal-group-preview`**

In `index.html` after line 934 (after the closing `</div>` of `#modal-group-preview`), insert:
```html

<!-- Format edit modal -->
<div class="modal modal-format-edit" id="modal-format-edit">
  <div class="fmt-edit-header">
    <span>Formaty meczów</span>
    <button class="modal-close-x" id="btn-format-edit-close">✕</button>
  </div>
  <div id="fmt-edit-content"></div>
  <button id="btn-format-edit-save" class="btn-save-format">Zapisz zmiany</button>
</div>
```

- [ ] **Step 3: Verify HTML is valid — open `index.html` in browser**

Open the app. Navigate to any tournament view. The header should still show correctly (button is hidden by default — `style="display:none"`). Open DevTools → Elements and confirm `#btn-tv-format-settings` and `#modal-format-edit` both exist in the DOM.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add format-settings button and modal skeleton to tournament view"
```

---

## Task 2: CSS — modal styles and locked phase card

**Files:**
- Modify: `css/style.css` (append at end of file)

**Interfaces:**
- Produces: visual styles for `.modal-format-edit`, `.fmt-edit-header`, `.fmt-edit-liga-form`, `.phase-card.locked .phase-card-header`, `.btn-save-format`

- [ ] **Step 1: Append new CSS rules at the very end of `css/style.css`**

```css

/* ===== FORMAT EDIT MODAL ===== */
.modal-format-edit {
  max-width: 420px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding: 0;
}

.fmt-edit-header {
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

.fmt-edit-header > span {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

#fmt-edit-content {
  padding: 12px 16px;
}

.fmt-edit-liga-form {
  display: block;
}

.phase-card.locked .phase-card-header {
  pointer-events: none;
  opacity: 0.5;
  cursor: default;
  background: #141414;
}

.btn-save-format {
  display: block;
  width: calc(100% - 32px);
  margin: 4px 16px 16px;
  padding: 13px;
  background: var(--green);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity .15s;
}
.btn-save-format:active { transform: scale(0.97); }
```

- [ ] **Step 2: Verify styles — open `index.html` in browser**

Open DevTools → Console, run:
```javascript
openModal('modal-format-edit');
```
The modal should appear centered, with a sticky header "Formaty meczów", empty content area, and a green "Zapisz zmiany" button at the bottom. Close it with the overlay click. No visual regressions on other screens.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add CSS for format-edit modal and locked phase card"
```

---

## Task 3: Pure data functions in `league.js`

**Files:**
- Modify: `js/league.js` (append at end of file)

**Interfaces:**
- Produces:
  - `_getTournamentPhases(tournament)` → `Array<{key: string|number, name: string}>`
    - For liga: returns `[]`
    - For bracket with `bracketSize=4, thirdPlaceMatch=false`: returns `[{key:0,name:'Finał'}]`
    - For bracket with `bracketSize=8, thirdPlaceMatch=true`: returns `[{key:0,name:'1/2 finału'},{key:1,name:'Finał'},{key:'thirdPlace',name:'Mecz o 3. miejsce'}]`
    - For groups: prepends `{key:'group',name:'Faza grupowa'}` then bracket rounds
  - `_isPhaseHasPlayedMatches(tournament, phaseKey)` → `boolean`
    - `phaseKey` is `'group'`, `'thirdPlace'`, or a round number `0, 1, …`

- [ ] **Step 1: Append both functions at the end of `js/league.js`**

```javascript

// ── Format Edit Modal ──────────────────────────────────────────────────────

function _getTournamentPhases(tournament) {
  const { config } = tournament;
  const phases = [];

  if (config.format === 'groups') {
    phases.push({ key: 'group', name: 'Faza grupowa' });
  }

  if (config.format === 'bracket' || config.format === 'groups') {
    const bSize     = config.bracketSize;
    const numRounds = Math.log2(bSize);
    for (let r = 0; r < numRounds; r++) {
      phases.push({ key: r, name: computeRoundName(r, numRounds) });
    }
    if (config.thirdPlaceMatch) {
      phases.push({ key: 'thirdPlace', name: 'Mecz o 3. miejsce' });
    }
  }

  return phases;
}

function _isPhaseHasPlayedMatches(tournament, phaseKey) {
  return tournament.matches.some(m => {
    if (m.isBye || m.winner === null) return false;
    if (phaseKey === 'group')      return m.phase === 'group';
    if (phaseKey === 'thirdPlace') return !!m.isThirdPlace;
    return m.phase === 'bracket' && m.round === phaseKey;
  });
}
```

- [ ] **Step 2: Verify in browser console**

Open a bracket tournament in DevTools → Console and run:
```javascript
const t = _activeTournament;
console.log(_getTournamentPhases(t));
// expect: [{key:0,name:'...'}, ...] for bracket/groups; [] for liga

console.log(_isPhaseHasPlayedMatches(t, 0));
// expect: false if no match in round 0 played; true if at least one is
```

- [ ] **Step 3: Commit**

```bash
git add js/league.js
git commit -m "feat: add _getTournamentPhases and _isPhaseHasPlayedMatches to league.js"
```

---

## Task 4: Phase card builder for the format-edit modal

**Files:**
- Modify: `js/league.js` (append after Task 3 functions)

**Interfaces:**
- Consumes: `_buildPhaseFormHTML(mc)`, `_readPhaseCardConfig(card)`, `_writePhaseCardConfig(card, mc)`, `_updatePhaseChips(card)`, `_legsChipLabel(mc)`, `_checkoutChipLabel(mode)` — all from `tournament.js` (loaded after `league.js` in HTML, but available at call time since these functions are invoked at runtime, not at parse time)
- Produces: `_buildFormatEditPhaseCard(phase, mc, locked, phaseIndex, isLast, phases)` → `HTMLElement`
  - `phase`: `{key, name}`
  - `mc`: matchConfig object
  - `locked`: boolean
  - `phaseIndex`: 0-based index of this phase in `phases`
  - `isLast`: boolean — controls whether copy button is shown
  - `phases`: full phases array — needed by copy button to find subsequent cards

- [ ] **Step 1: Append the function at the end of `js/league.js`**

```javascript
function _buildFormatEditPhaseCard(phase, mc, locked, phaseIndex, isLast, phases) {
  const card = document.createElement('div');
  card.className = 'phase-card' + (locked ? ' locked' : '');
  card.dataset.phaseKey = String(phase.key);

  const header = document.createElement('div');
  header.className = 'phase-card-header';
  header.innerHTML = `
    <span class="phase-arrow">${locked ? '' : '&#9658;'}</span>
    <span class="phase-name">${phase.name}${locked ? ' 🔒' : ''}</span>
    <span class="phase-chips">
      <span class="phase-chip configured">${mc.variant}</span>
      <span class="phase-chip configured">${_legsChipLabel(mc)}</span>
      <span class="phase-chip configured">${_checkoutChipLabel(mc.checkoutMode)}</span>
    </span>`;

  const body = document.createElement('div');
  body.className = 'phase-card-body';
  body.style.display = 'none';
  body.innerHTML = _buildPhaseFormHTML(mc);

  if (!locked && !isLast) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-phase';
    copyBtn.textContent = 'Kopiuj dla kolejnych faz →';
    copyBtn.addEventListener('click', e => {
      e.stopPropagation();
      const cfg = _readPhaseCardConfig(card);
      for (let i = phaseIndex + 1; i < phases.length; i++) {
        const t = document.querySelector(
          `#fmt-edit-content [data-phase-key="${String(phases[i].key)}"]`
        );
        if (t && !t.classList.contains('locked')) {
          _writePhaseCardConfig(t, cfg);
          _updatePhaseChips(t);
        }
      }
    });
    body.appendChild(copyBtn);
  }

  if (!locked) {
    header.addEventListener('click', () => {
      const open = card.classList.contains('expanded');
      card.classList.toggle('expanded', !open);
      body.style.display = open ? 'none' : 'block';
      if (open) _updatePhaseChips(card);
    });
  }

  card.appendChild(header);
  card.appendChild(body);
  return card;
}
```

- [ ] **Step 2: Smoke test in browser console**

Open a tournament, then run in console:
```javascript
const phases = _getTournamentPhases(_activeTournament);
if (phases.length > 0) {
  const mc = _activeTournament.config.matchConfig;
  const card = _buildFormatEditPhaseCard(phases[0], mc, false, 0, phases.length === 1, phases);
  document.getElementById('fmt-edit-content').appendChild(card);
  openModal('modal-format-edit');
}
```
The modal should show one phase card with chips. Click the header to expand it. Chips should update on collapse.

- [ ] **Step 3: Commit**

```bash
git add js/league.js
git commit -m "feat: add _buildFormatEditPhaseCard to league.js"
```

---

## Task 5: Modal orchestration, save logic, and button wiring

**Files:**
- Modify: `js/league.js`
  - Append `openFormatEditModal` and `_saveFormatEdit` at end of file
  - Insert button-wiring block at line 1043 (inside `renderTournamentViewScreen`, after `_activeTournament = tournament`)

**Interfaces:**
- Consumes (from previous tasks): `_getTournamentPhases`, `_isPhaseHasPlayedMatches`, `_buildFormatEditPhaseCard`
- Consumes (existing): `_buildPhaseFormHTML`, `_readPhaseCardConfig`, `openModal`, `closeModal`, `loadTournaments`, `saveTournaments`, `_formatLabel`
- Produces: `openFormatEditModal(tournament)` (public, called from button), `_saveFormatEdit(tournament)` (internal)

- [ ] **Step 1: Append `openFormatEditModal` and `_saveFormatEdit` at the end of `js/league.js`**

```javascript
function openFormatEditModal(tournament) {
  const isLiga  = tournament.config.format === 'liga';
  const container = document.getElementById('fmt-edit-content');
  container.innerHTML = '';

  if (isLiga) {
    const mc   = tournament.config.matchConfig;
    const wrap = document.createElement('div');
    wrap.className = 'fmt-edit-liga-form';
    wrap.innerHTML = _buildPhaseFormHTML(mc);
    container.appendChild(wrap);
  } else {
    const phases   = _getTournamentPhases(tournament);
    const pmc      = tournament.config.phaseMatchConfigs || {};
    const fallback = tournament.config.matchConfig;

    phases.forEach((phase, index) => {
      const key    = String(phase.key);
      const mc     = pmc[key] !== undefined ? Object.assign({}, pmc[key]) : Object.assign({}, fallback);
      const locked = _isPhaseHasPlayedMatches(tournament, phase.key);
      const isLast = index === phases.length - 1;
      const card   = _buildFormatEditPhaseCard(phase, mc, locked, index, isLast, phases);
      container.appendChild(card);
    });

    const firstUnlocked = container.querySelector('.phase-card:not(.locked)');
    if (firstUnlocked) {
      firstUnlocked.classList.add('expanded');
      firstUnlocked.querySelector('.phase-card-body').style.display = 'block';
    }
  }

  document.getElementById('btn-format-edit-close').onclick = () => closeModal('modal-format-edit');
  document.getElementById('btn-format-edit-save').onclick  = () => _saveFormatEdit(tournament);
  openModal('modal-format-edit');
}

function _saveFormatEdit(tournament) {
  const isLiga    = tournament.config.format === 'liga';
  const container = document.getElementById('fmt-edit-content');

  if (isLiga) {
    tournament.config.matchConfig = {
      variant:      parseInt(container.querySelector('.ps-variant').value),
      totalSets:    parseInt(container.querySelector('.ps-sets').value),
      totalLegs:    parseInt(container.querySelector('.ps-legs').value),
      inMode:       container.querySelector('.ps-in').value,
      checkoutMode: container.querySelector('.ps-out').value,
      dartLimit:    parseInt(container.querySelector('.ps-limit').value) || null,
    };
  } else {
    const phases = _getTournamentPhases(tournament);
    tournament.config.usePhaseFormats = true;
    if (!tournament.config.phaseMatchConfigs) tournament.config.phaseMatchConfigs = {};

    phases.forEach(phase => {
      const card = container.querySelector(`[data-phase-key="${String(phase.key)}"]`);
      if (card && !card.classList.contains('locked')) {
        tournament.config.phaseMatchConfigs[String(phase.key)] = _readPhaseCardConfig(card);
      }
    });

    // Keep matchConfig in sync with first phase as fallback for getMatchConfig()
    const firstKey = String(phases[0].key);
    if (tournament.config.phaseMatchConfigs[firstKey]) {
      tournament.config.matchConfig = Object.assign({}, tournament.config.phaseMatchConfigs[firstKey]);
    }
  }

  // Persist
  const list   = loadTournaments();
  const stored = list.find(t => t.id === tournament.id);
  if (stored) {
    stored.config = tournament.config;
    saveTournaments(list);
  }

  // Update first <span> of info bar to reflect new format label
  const infoBar = document.getElementById('tv-info-bar');
  if (infoBar) {
    const firstSpan = infoBar.querySelector('span');
    if (firstSpan) {
      const fmt   = tournament.config.format;
      const label = _formatLabel(tournament.config);
      if (fmt === 'liga')    firstSpan.innerHTML = label;
      if (fmt === 'bracket') firstSpan.innerHTML = 'Drabinka &middot; ' + label;
      if (fmt === 'groups')  firstSpan.innerHTML = 'Grupy+Drabinka &middot; ' + label;
    }
  }

  closeModal('modal-format-edit');
}
```

- [ ] **Step 2: Wire the settings button inside `renderTournamentViewScreen`**

In `js/league.js` find line 1042 (the second line of `renderTournamentViewScreen`):
```javascript
  _activeTournament = tournament;
```

Insert immediately after it (before the `const isBracket` line):
```javascript
  const _fmtBtn = document.getElementById('btn-tv-format-settings');
  if (_fmtBtn) {
    _fmtBtn.style.display = tournament.status === 'active' ? '' : 'none';
    const _newFmtBtn = _fmtBtn.cloneNode(true);
    _fmtBtn.parentNode.replaceChild(_newFmtBtn, _fmtBtn);
    document.getElementById('btn-tv-format-settings').addEventListener('click', () => openFormatEditModal(_activeTournament));
  }
```

- [ ] **Step 3: Manual testing — liga tournament**

1. Create a liga tournament (any number of players)
2. Open it — `⚙` button should appear in the top-right of the header
3. Click `⚙` — modal opens with a single form (variant, sets, legs, etc.) pre-filled with current config
4. Change the variant to a different value, click "Zapisz zmiany"
5. Modal closes; info bar first span updates
6. Reopen the modal — form shows the saved value
7. Reload the page — confirm the change persisted in localStorage

- [ ] **Step 4: Manual testing — bracket tournament (no played matches)**

1. Create a bracket tournament (4+ players)
2. Open it — `⚙` visible
3. Click `⚙` — modal shows phase cards (all unlocked), first card expanded
4. Change a value in the first card, use "Kopiuj dla kolejnych faz →" — subsequent cards update
5. Save — modal closes, info bar shows "custom format"
6. Reopen modal — values preserved
7. Reload page — values persisted

- [ ] **Step 5: Manual testing — bracket tournament (some matches played)**

1. Use a bracket tournament where at least one match has been played (R1/R2/etc.)
2. Click `⚙` — played rounds show 🔒, header grayed out, can't expand
3. Unplayed rounds can be edited and saved normally
4. Locked round configs are unchanged after save

- [ ] **Step 6: Manual testing — groups tournament**

1. Create a groups+bracket tournament
2. Click `⚙` — modal shows "Faza grupowa" + bracket round cards
3. If group matches played: "Faza grupowa" card is locked
4. Bracket rounds still editable

- [ ] **Step 7: Manual testing — finished tournament**

1. Finish a tournament (all matches played), or manually set `status:'finished'` in localStorage
2. Open it — `⚙` button should be **hidden** (display:none)

- [ ] **Step 8: Commit**

```bash
git add js/league.js
git commit -m "feat: implement format-edit modal (openFormatEditModal, _saveFormatEdit, button wiring)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - ⚙ button in header, active-only → Task 1 + Task 5 step 2
  - Modal with liga single form → Task 5 step 1 (`openFormatEditModal`, liga branch)
  - Modal with phase cards for bracket/groups → Task 5 step 1 (else branch)
  - Locked phases (played matches) → Task 3 (`_isPhaseHasPlayedMatches`) + Task 4 (`.locked` class)
  - Save updates `tournament.config` + persists → Task 5 (`_saveFormatEdit`)
  - Info bar update after save → Task 5 (`_saveFormatEdit`, info bar block)
  - Pre-fill from existing config when `usePhaseFormats` was false → Task 5 (`openFormatEditModal`, `pmc[key] !== undefined ? ... : fallback`)
  - Copy button skips locked cards → Task 4 (`if (t && !t.classList.contains('locked'))`)
  - Finished tournament: button hidden → Task 5 step 2 (`tournament.status === 'active'`)

- [x] **No placeholders** — all code is complete

- [x] **Type consistency:**
  - `phase.key` is a number for bracket rounds, string `'group'`/`'thirdPlace'` otherwise — always `String(phase.key)` for DOM `data-phase-key` and JSON keys (consistent with existing `getMatchConfig` in league.js which uses `String(match.round)`)
  - `_isPhaseHasPlayedMatches` matches on `m.round === phaseKey` (number equality) which is correct since bracket round keys are numbers
