# Per-Phase Match Formats — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow bracket and groups+bracket tournaments to configure different match settings per phase (group stage, R1, QF, SF, Final, 3rd place).

**Architecture:** New `usePhaseFormats` boolean and `phaseMatchConfigs` object added to `tournament.config`. A `getMatchConfig(tournament, match)` helper in `league.js` picks the right config at match start. Wizard step 3 gains collapsible per-phase cards (option 3: compact cards with chips) rendered when the new "Różne formaty meczów" checkbox is checked in step 2.

**Tech Stack:** Vanilla HTML5/CSS3/JS, localStorage, no build step. Open `index.html` directly in browser to test. Branch: `feature/phase-match-formats`.

## Global Constraints

- All UI text in Polish; identifiers/code in English
- No frameworks, no build step — edit files directly, test by opening `index.html`
- Follow existing CSS theme variables: `--bg #0d0d0d`, `--surface #1a1a1a`, `--border #333`, `--accent #e63946`, `--text #f0f0f0`, `--text-muted #888`, `--radius 12px`
- Commit after each task
- Working directory: `H:\My_projects\DartApp`

---

## Task 1: Data helpers in league.js

**Files:**
- Modify: `js/league.js` (add two functions before `createTournament`)

**Interfaces:**
- Produces: `getMatchConfig(tournament, match)` — global, used by Tasks 2 and app.js; `_formatLabel(config)` — global, used by Task 5

- [ ] **Step 1: Add `getMatchConfig` and `_formatLabel` to `js/league.js`**

Find the line `function createTournament(config, players) {` and insert the following two functions directly before it:

```js
function getMatchConfig(tournament, match) {
  if (!tournament.config.usePhaseFormats) return tournament.config.matchConfig;
  const pmc = tournament.config.phaseMatchConfigs || {};
  if (match.isThirdPlace) return pmc.thirdPlace || pmc[match.round] || tournament.config.matchConfig;
  if (match.phase === 'group') return pmc.group || tournament.config.matchConfig;
  return pmc[match.round] !== undefined ? pmc[match.round] : tournament.config.matchConfig;
}

function _formatLabel(config) {
  if (config.usePhaseFormats) return '<em class="custom-format-label">custom format</em>';
  const mc = config.matchConfig;
  const legsLabel = mc.totalSets > 1
    ? `${mc.totalSets}S × First to ${mc.totalLegs}`
    : `First to ${mc.totalLegs}`;
  return `${mc.variant} · ${legsLabel}`;
}
```

- [ ] **Step 2: Verify functions are accessible**

Open `index.html` in browser. Open DevTools console. Run:
```js
typeof getMatchConfig   // should print "function"
typeof _formatLabel     // should print "function"
```

- [ ] **Step 3: Commit**

```bash
git add js/league.js
git commit -m "feat: add getMatchConfig and _formatLabel helpers to league.js"
```

---

## Task 2: Wire getMatchConfig into match start and stats

**Files:**
- Modify: `js/app.js` (3 functions)
- Modify: `js/league.js` (`createTournament` — both bracket and groups branches)

**Interfaces:**
- Consumes: `getMatchConfig(tournament, match)` from Task 1
- Produces: `startTournamentMatch` uses per-phase config; `createTournament` stores `usePhaseFormats`/`phaseMatchConfigs`

- [ ] **Step 1: Update `createTournament` to save new fields**

In `js/league.js`, find `createTournament`. There are two places where `matchConfig: { ...config.matchConfig }` appears (one in the groups branch, one in the combined bracket/league branch). After EACH occurrence, also save the new fields.

Find the **groups branch** (search for `format: 'groups'` inside createTournament). In the config object, after `matchConfig: { ...config.matchConfig },` add:

```js
usePhaseFormats:    config.usePhaseFormats || false,
phaseMatchConfigs:  config.usePhaseFormats ? JSON.parse(JSON.stringify(config.phaseMatchConfigs || {})) : undefined,
```

Find the **bracket/league branch** (the other `matchConfig: { ...config.matchConfig },`). Add the same two lines after it:

```js
usePhaseFormats:    config.usePhaseFormats || false,
phaseMatchConfigs:  config.usePhaseFormats ? JSON.parse(JSON.stringify(config.phaseMatchConfigs || {})) : undefined,
```

- [ ] **Step 2: Update `startTournamentMatch` in `js/app.js`**

Find `function startTournamentMatch(tournament, matchIndex, startingPlayer)`. The second line currently reads:
```js
const mc = tournament.config.matchConfig;
```

Replace with:
```js
const mc = getMatchConfig(tournament, match);
```

Note: `match` is already defined as `const m = tournament.matches[matchIndex];` on the line above — but the variable is named `m`, not `match`. Change to:
```js
const mc = getMatchConfig(tournament, m);
```

- [ ] **Step 3: Update `openTournamentStarterModal` in `js/app.js`**

Find `function openTournamentStarterModal(tournament, matchIndex)`. Near the top it has:
```js
const mc = tournament.config.matchConfig;
```

Replace with:
```js
const mc = getMatchConfig(tournament, m);
```

(The variable `m` is already defined above this line in that function.)

- [ ] **Step 4: Update `openTournamentMatchStats` in `js/app.js`**

Find `function openTournamentMatchStats(tournament, matchIndex)`. Near the top it has:
```js
const mc = tournament.config.matchConfig;
```

Replace with:
```js
const mc = getMatchConfig(tournament, m);
```

Then, in the same function, find where the `pseudo` object is constructed. Add this field to it:
```js
_customFormat: tournament.config.usePhaseFormats || false,
```

- [ ] **Step 5: Update `renderStatsScreen` in `js/ui.js` to handle custom format flag**

Find `renderStatsScreen` (or the stats rendering section). Find the block that builds `settingsEl` — it contains `String(match.variant)` and `First to ${match.totalLegs}`. The block looks like:

```js
[
  String(match.variant),
  match.totalSets > 1
    ? 'First to ' + match.totalSets + ' sets × ' + match.totalLegs + ' legs'
    : 'First to ' + match.totalLegs,
  // ...
].filter(Boolean).forEach(text => {
  const span = document.createElement('span');
  span.textContent = text;
  settingsEl.appendChild(span);
});
```

Wrap this entire block with a check:

```js
if (match._customFormat) {
  const span = document.createElement('span');
  span.innerHTML = '<em class="custom-format-label">custom format</em>';
  settingsEl.appendChild(span);
} else {
  [
    String(match.variant),
    match.totalSets > 1
      ? 'First to ' + match.totalSets + ' sets × ' + match.totalLegs + ' legs'
      : 'First to ' + match.totalLegs,
    IN_MODE_LABELS[match.inMode]  || match.inMode,
    CHECKOUT_LABELS[match.checkoutMode] || match.checkoutMode,
    match.dartLimitVisits ? 'Limit ' + (match.dartLimitVisits * 3) + ' rzutów' : null,
  ].filter(Boolean).forEach(text => {
    const span = document.createElement('span');
    span.textContent = text;
    settingsEl.appendChild(span);
  });
}
```

- [ ] **Step 6: Verify — create bracket tournament, play a match, check no crash**

Open `index.html`. Create a 4-player bracket tournament (no custom formats yet). Start a match — it should work exactly as before.

- [ ] **Step 7: Commit**

```bash
git add js/league.js js/app.js js/ui.js
git commit -m "feat: wire getMatchConfig into match start and stats rendering"
```

---

## Task 3: CSS + wizard step 2 checkbox

**Files:**
- Modify: `css/style.css` (add phase card styles)
- Modify: `index.html` (add checkbox in wstep-2)
- Modify: `js/tournament.js` (checkbox handler + initTournamentWizard reset)

**Interfaces:**
- Produces: `#t-use-phase-formats` checkbox wired to `tournamentConfig.usePhaseFormats`; CSS classes for phase cards ready for Task 4

- [ ] **Step 1: Add CSS for phase cards and custom-format label**

At the end of `css/style.css`, add:

```css
/* ── Per-phase match format cards ── */
.custom-format-label {
  color: var(--text-muted);
  font-style: italic;
}

.phase-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
}

.phase-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  background: var(--surface);
  user-select: none;
}

.phase-card-header:hover { background: #222; }

.phase-arrow {
  font-size: 0.65rem;
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
  display: inline-block;
}

.phase-card.expanded .phase-arrow { transform: rotate(90deg); }

.phase-name {
  font-size: 0.82rem;
  font-weight: 600;
  flex-shrink: 0;
}

.phase-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-left: auto;
}

.phase-chip {
  font-size: 0.62rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  white-space: nowrap;
}

.phase-chip.configured {
  color: var(--text);
  border-color: #555;
}

.phase-card-body {
  padding: 10px 12px 8px;
  background: #111;
  border-top: 1px solid var(--border);
}

.phase-form-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 10px;
  margin-bottom: 8px;
}

.phase-form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.phase-form-group label {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.phase-form-group select {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 6px;
  font-size: 0.78rem;
  cursor: pointer;
  width: 100%;
}

.phase-form-group select:focus { outline: none; border-color: var(--accent); }

.btn-copy-phase {
  width: 100%;
  padding: 5px;
  font-size: 0.72rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  margin-top: 4px;
}

.btn-copy-phase:hover { border-color: #555; color: var(--text); }
.btn-copy-phase:disabled { opacity: 0.3; cursor: default; }

#t-phase-forms {
  overflow-y: auto;
  max-height: 55vh;
}

#t-phase-formats-wrap {
  margin-top: 12px;
}
```

- [ ] **Step 2: Add checkbox to `index.html` step 2**

In `index.html`, find `<div id="wstep-2">`. Inside it, find the closing `</div>` of `<div class="format-details-panel">` (it appears right before `<div class="wizard-nav">`). Insert after the format-details-panel closing tag and before wizard-nav:

```html
      <div id="t-phase-formats-wrap" style="display:none; margin-top:12px;">
        <label class="wiz-check-label">
          <input type="checkbox" id="t-use-phase-formats">
          Różne formaty meczów dla każdej fazy
        </label>
      </div>
```

- [ ] **Step 3: Wire checkbox in `js/tournament.js`**

In the format tile click handler (find `tournamentConfig.format = tile.dataset.format;`), add after the existing format toggle logic (after the lines toggling `league-settings`, `bracket-settings`, `groups-settings`):

```js
// Show phase-formats checkbox only for bracket/groups formats
const pfWrap = document.getElementById('t-phase-formats-wrap');
if (pfWrap) {
  pfWrap.style.display = (isBracket || isGroups) ? '' : 'none';
  if (!isBracket && !isGroups) {
    tournamentConfig.usePhaseFormats = false;
    const pfCb = document.getElementById('t-use-phase-formats');
    if (pfCb) pfCb.checked = false;
  }
}
```

Then add a new event listener (near the other step 2 listeners):

```js
document.getElementById('t-use-phase-formats').addEventListener('change', function () {
  tournamentConfig.usePhaseFormats = this.checked;
  if (!this.checked) tournamentConfig.phaseMatchConfigs = null;
});
```

- [ ] **Step 4: Reset in `initTournamentWizard`**

In `initTournamentWizard()`, find the block that resets step 2 format tiles (near `document.querySelectorAll('#wstep-2 .format-tile')...`). After the existing reset code, add:

```js
tournamentConfig.usePhaseFormats = false;
tournamentConfig.phaseMatchConfigs = null;
const pfCb = document.getElementById('t-use-phase-formats');
if (pfCb) pfCb.checked = false;
const pfWrap = document.getElementById('t-phase-formats-wrap');
if (pfWrap) pfWrap.style.display = 'none';
```

- [ ] **Step 5: Verify**

Open `index.html`. Start new tournament wizard. In step 2, select "Liga" — checkbox should NOT appear. Select "Drabinka" or "Grupy + Drabinka" — checkbox SHOULD appear. Check/uncheck it. Go back and re-enter wizard — checkbox should be reset to unchecked.

- [ ] **Step 6: Commit**

```bash
git add css/style.css index.html js/tournament.js
git commit -m "feat: add per-phase formats checkbox to wizard step 2"
```

---

## Task 4: Phase card rendering in wizard step 3

**Files:**
- Modify: `index.html` (wrap existing step 3 form; add phase forms container)
- Modify: `js/tournament.js` (rendering functions, chip helpers, copy button, t-next-3 update, showWizardStep hook)

**Interfaces:**
- Consumes: `tournamentConfig.usePhaseFormats`, `tournamentConfig.matchConfig` (defaults), `nextPowerOf2()` and `computeRoundName()` from league.js (globally available)
- Produces: `tournamentConfig.phaseMatchConfigs` populated when `usePhaseFormats` is true and user clicks DALEJ

- [ ] **Step 1: Wrap existing step 3 form in `index.html`**

In `index.html`, find `<div class="wizard-step" id="wstep-3">`. The content between the step-indicator and the wizard-nav contains the match settings form. Wrap the form content (everything between `<div class="step-indicator">...</div>` and `<div class="wizard-nav">`) in two divs:

```html
    <!-- existing form wrapped: -->
    <div id="t-single-match-form">
      <!-- ALL existing form-row/form-group content goes here unchanged -->
    </div>
    <!-- new phase forms container: -->
    <div id="t-phase-forms" style="display:none;"></div>
```

So the final structure of wstep-3 looks like:
```html
<div class="wizard-step" id="wstep-3">
  <div class="wizard-title">🎯 Nowy turniej</div>
  <div class="step-indicator">Krok 3 z 5</div>
  <div id="t-single-match-form">
    <!-- ... all existing form groups: variant, sets, legs, in-mode, checkout, dart-limit ... -->
  </div>
  <div id="t-phase-forms" style="display:none;"></div>
  <div class="wizard-nav">
    <button id="t-back-3" ...>
    <button id="t-next-3" ...>
  </div>
</div>
```

- [ ] **Step 2: Add phase helper functions to `js/tournament.js`**

Add the following functions before `buildDoublesOptions` (or in a logical grouping of helper functions):

```js
function _legsChipLabel(mc) {
  return mc.totalSets > 1
    ? mc.totalSets + 'S×FT' + mc.totalLegs
    : 'First to ' + mc.totalLegs;
}

function _checkoutChipLabel(mode) {
  return mode === 'double' ? 'Double out' : mode === 'master' ? 'Master out' : 'Straight out';
}

function _readPhaseCardConfig(card) {
  return {
    variant:      parseInt(card.querySelector('.ps-variant').value),
    totalSets:    parseInt(card.querySelector('.ps-sets').value),
    totalLegs:    parseInt(card.querySelector('.ps-legs').value),
    inMode:       card.querySelector('.ps-in').value,
    checkoutMode: card.querySelector('.ps-out').value,
    dartLimit:    parseInt(card.querySelector('.ps-limit').value) || null,
  };
}

function _writePhaseCardConfig(card, mc) {
  card.querySelector('.ps-variant').value = mc.variant;
  card.querySelector('.ps-sets').value    = mc.totalSets;
  card.querySelector('.ps-legs').value    = mc.totalLegs;
  card.querySelector('.ps-in').value      = mc.inMode;
  card.querySelector('.ps-out').value     = mc.checkoutMode;
  card.querySelector('.ps-limit').value   = mc.dartLimit || 0;
}

function _updatePhaseChips(card) {
  const mc    = _readPhaseCardConfig(card);
  const chips = card.querySelectorAll('.phase-chip');
  chips[0].textContent = mc.variant;
  chips[1].textContent = _legsChipLabel(mc);
  chips[2].textContent = _checkoutChipLabel(mc.checkoutMode);
  chips.forEach(c => c.classList.add('configured'));
}

function _buildPhaseFormHTML(mc) {
  const vOpts = [101,201,301,401,501,601,701,801,901,1001]
    .map(v => `<option value="${v}"${v===mc.variant?' selected':''}>${v}</option>`).join('');
  const sOpts = Array.from({length:10},(_,i)=>i+1)
    .map(v => `<option value="${v}"${v===mc.totalSets?' selected':''}>${v===1?'1 set':v+' sety'}</option>`).join('');
  const lOpts = Array.from({length:16},(_,i)=>i+1)
    .map(v => `<option value="${v}"${v===mc.totalLegs?' selected':''}>${v===1?'First to 1':'First to '+v}</option>`).join('');
  const inOpts = [
    {v:'straight',l:'Straight-in'},
    {v:'double',  l:'Double-in'},
    {v:'master',  l:'Master-in'},
  ].map(m => `<option value="${m.v}"${m.v===mc.inMode?' selected':''}>${m.l}</option>`).join('');
  const outOpts = [
    {v:'double',  l:'Double-out'},
    {v:'master',  l:'Master-out'},
    {v:'straight',l:'Straight-out'},
  ].map(m => `<option value="${m.v}"${m.v===mc.checkoutMode?' selected':''}>${m.l}</option>`).join('');
  const limOpts = [0,30,33,36,39,42,45,48,51,54]
    .map(v => `<option value="${v}"${v===(mc.dartLimit||0)?' selected':''}>${v===0?'Bez limitu':v+' rzutów'}</option>`).join('');

  return `<div class="phase-form-fields">
    <div class="phase-form-group">
      <label>Wariant</label>
      <select class="ps-variant">${vOpts}</select>
    </div>
    <div class="phase-form-group">
      <label>Liczba setów</label>
      <select class="ps-sets">${sOpts}</select>
    </div>
    <div class="phase-form-group">
      <label class="ps-lbl-legs">Liczba legów</label>
      <select class="ps-legs">${lOpts}</select>
    </div>
    <div class="phase-form-group">
      <label>Wejście</label>
      <select class="ps-in">${inOpts}</select>
    </div>
    <div class="phase-form-group">
      <label>Wyjście</label>
      <select class="ps-out">${outOpts}</select>
    </div>
    <div class="phase-form-group">
      <label>Limit rzutów</label>
      <select class="ps-limit">${limOpts}</select>
    </div>
  </div>`;
}

function _getWizardPhases() {
  const fmt    = tournamentConfig.format;
  const phases = [];
  let bracketSeeds;

  if (fmt === 'groups') {
    phases.push({ key: 'group', name: 'Faza grupowa' });
    bracketSeeds = tournamentConfig.advanceCounts
      ? tournamentConfig.advanceCounts.reduce((s, c) => s + c, 0)
      : (tournamentConfig.numGroups || 2) * (tournamentConfig.advanceCount || 2);
  } else {
    bracketSeeds = tournamentConfig.numPlayers || 4;
  }

  const bSize     = nextPowerOf2(bracketSeeds);
  const numRounds = Math.log2(bSize);
  for (let r = 0; r < numRounds; r++) {
    phases.push({ key: r, name: computeRoundName(r, numRounds) });
  }
  if (tournamentConfig.thirdPlaceMatch) {
    phases.push({ key: 'thirdPlace', name: 'Mecz o 3. miejsce' });
  }
  return phases;
}

function _buildPhaseCard(phase, mc, isLast, phaseIndex, phases) {
  const card = document.createElement('div');
  card.className = 'phase-card';
  card.dataset.phaseKey = String(phase.key);

  const alreadySet = !!(tournamentConfig.phaseMatchConfigs &&
    tournamentConfig.phaseMatchConfigs[phase.key] !== undefined);
  const chipCls = alreadySet ? 'phase-chip configured' : 'phase-chip';

  const header = document.createElement('div');
  header.className = 'phase-card-header';
  header.innerHTML = `
    <span class="phase-arrow">&#9658;</span>
    <span class="phase-name">${phase.name}</span>
    <span class="phase-chips">
      <span class="${chipCls}">${mc.variant}</span>
      <span class="${chipCls}">${_legsChipLabel(mc)}</span>
      <span class="${chipCls}">${_checkoutChipLabel(mc.checkoutMode)}</span>
    </span>`;

  const body = document.createElement('div');
  body.className = 'phase-card-body';
  body.style.display = 'none';
  body.innerHTML = _buildPhaseFormHTML(mc);

  // dynamic legs label
  const setsEl    = body.querySelector('.ps-sets');
  const legsLblEl = body.querySelector('.ps-lbl-legs');
  setsEl.addEventListener('change', () => {
    legsLblEl.textContent = parseInt(setsEl.value) > 1 ? 'Legi na seta' : 'Liczba legów';
  });

  if (!isLast) {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-copy-phase';
    copyBtn.textContent = 'Kopiuj dla kolejnych faz →';
    copyBtn.addEventListener('click', e => {
      e.stopPropagation();
      const cfg = _readPhaseCardConfig(card);
      for (let i = phaseIndex + 1; i < phases.length; i++) {
        const t = document.querySelector(`[data-phase-key="${String(phases[i].key)}"]`);
        if (t) { _writePhaseCardConfig(t, cfg); _updatePhaseChips(t); }
      }
    });
    body.appendChild(copyBtn);
  }

  header.addEventListener('click', () => {
    const open = card.classList.contains('expanded');
    card.classList.toggle('expanded', !open);
    body.style.display = open ? 'none' : 'block';
    if (!open) _updatePhaseChips(card);
  });

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function _renderPhaseMatchForms() {
  const container = document.getElementById('t-phase-forms');
  container.innerHTML = '';
  const phases   = _getWizardPhases();
  const defaults = tournamentConfig.matchConfig || {
    variant: 501, totalSets: 1, totalLegs: 3,
    inMode: 'straight', checkoutMode: 'double', dartLimit: null,
  };

  phases.forEach((phase, index) => {
    const isLast = index === phases.length - 1;
    const mc     = (tournamentConfig.phaseMatchConfigs &&
                    tournamentConfig.phaseMatchConfigs[phase.key] !== undefined)
      ? tournamentConfig.phaseMatchConfigs[phase.key]
      : defaults;
    const card = _buildPhaseCard(phase, mc, isLast, index, phases);
    if (index === 0) {
      card.classList.add('expanded');
      card.querySelector('.phase-card-body').style.display = 'block';
    }
    container.appendChild(card);
  });
}
```

- [ ] **Step 3: Update `showWizardStep` to toggle single/phase forms**

In `showWizardStep(n)`, at the very end of the function (after the dots update), add:

```js
if (n === 3) {
  const usePF = !!(tournamentConfig && tournamentConfig.usePhaseFormats);
  const singleForm = document.getElementById('t-single-match-form');
  const phaseForms = document.getElementById('t-phase-forms');
  if (singleForm) singleForm.style.display = usePF ? 'none' : '';
  if (phaseForms) {
    phaseForms.style.display = usePF ? '' : 'none';
    if (usePF) _renderPhaseMatchForms();
  }
}
```

- [ ] **Step 4: Update `t-next-3` handler to read phase configs**

Find the `t-next-3` click listener. Currently it reads from the single form and always goes to step 4. Replace the entire handler body with:

```js
document.getElementById('t-next-3').addEventListener('click', () => {
  if (tournamentConfig.usePhaseFormats) {
    const phases         = _getWizardPhases();
    const phaseMatchConfigs = {};
    phases.forEach(phase => {
      const card = document.querySelector(`[data-phase-key="${String(phase.key)}"]`);
      phaseMatchConfigs[phase.key] = _readPhaseCardConfig(card);
    });
    tournamentConfig.phaseMatchConfigs = phaseMatchConfigs;
    // keep matchConfig in sync with first phase as fallback
    tournamentConfig.matchConfig = phaseMatchConfigs[phases[0].key];
  } else {
    tournamentConfig.matchConfig = {
      variant:      parseInt(document.getElementById('t-variant').value),
      totalSets:    parseInt(document.getElementById('t-sets').value),
      totalLegs:    parseInt(document.getElementById('t-legs').value),
      inMode:       document.getElementById('t-in-mode').value,
      checkoutMode: document.getElementById('t-checkout').value,
      dartLimit:    parseInt(document.getElementById('t-dart-limit').value) || null,
    };
  }
  const existingBlocks = document.querySelectorAll('#t-players-list .player-block').length;
  const savedStep4 = existingBlocks === tournamentConfig.numPlayers ? _getStep4Values() : null;
  renderStep4Players(savedStep4);
  showWizardStep(4);
});
```

- [ ] **Step 5: Verify end-to-end in browser**

1. Open `index.html`. Start wizard → choose 4-player Drabinka format.
2. Check "Różne formaty meczów" → click DALEJ.
3. Step 3 should show 2 phase cards: `Półfinał` and `Finał`. First card expanded with full form; second collapsed with chips.
4. Configure Półfinał with 501, First to 3, Double out. Chips update on collapse.
5. Click "Kopiuj dla kolejnych faz →" — Finał card chips update to same values.
6. Click DALEJ → step 4 (players). Create tournament. Verify no crash.
7. Open the tournament and start a match — it should use the phase-specific settings.

Also verify: uncheck "Różne formaty meczów" → single form appears, phase forms hidden. Create tournament → works as before.

Also verify for groups format (e.g., 6 players, 2 groups): step 3 should show `Faza grupowa`, `Finał` cards. With `thirdPlaceMatch` enabled: also `Mecz o 3. miejsce`.

- [ ] **Step 6: Commit**

```bash
git add index.html js/tournament.js
git commit -m "feat: phase card rendering in wizard step 3 with chips and copy"
```

---

## Task 5: "custom format" labels in tournament display

**Files:**
- Modify: `js/league.js` (`buildTournamentCard`, `renderTournamentViewScreen` — 3 format branches)

**Interfaces:**
- Consumes: `_formatLabel(config)` from Task 1

- [ ] **Step 1: Update `buildTournamentCard`**

Find `buildTournamentCard` in `js/league.js`. Find the line that reads:
```js
const meta  = formatLabel + ' · ' + t.players.length + ' graczy · ' + mc.variant + ' · First to ' + mc.totalLegs;
```

Replace with:
```js
const fmtStr = _formatLabel(t.config);
const meta   = formatLabel + ' · ' + t.players.length + ' graczy · ' + fmtStr;
```

Note: `meta` is likely used in `div.innerHTML` — confirm the card building uses innerHTML (not textContent). If `fmtStr` contains `<em>` and the target is `textContent`, switch the target to `innerHTML`.

- [ ] **Step 2: Update `renderTournamentViewScreen` — groups branch info bar**

Find the groups branch in `renderTournamentViewScreen`. The line:
```js
`<span>Grupy+Drabinka &middot; ${mc.variant} &middot; First to ${mc.totalLegs}</span>`
```

Replace with:
```js
`<span>Grupy+Drabinka &middot; ${_formatLabel(tournament.config)}</span>`
```

- [ ] **Step 3: Update `renderTournamentViewScreen` — bracket branch info bar**

Find the bracket branch. The line:
```js
'<span>Drabinka &middot; ' + mc.variant + ' &middot; First to ' + mc.totalLegs + ' &middot; ' + (CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode) + '</span>'
```

Replace with:
```js
'<span>Drabinka &middot; ' + _formatLabel(tournament.config) + '</span>'
```

- [ ] **Step 4: Update `renderTournamentViewScreen` — league branch info bar**

Find the league branch. Look for a line using `mc.variant` and `mc.totalLegs` in the info bar HTML string. Replace that portion with `_formatLabel(tournament.config)`.

- [ ] **Step 5: Verify**

1. Create a bracket tournament with "Różne formaty meczów" checked.
2. On the tournament list, the card meta should show `Drabinka · 4 graczy · custom format`.
3. Inside the tournament view, the info bar should show `Drabinka · custom format`.
4. Create a normal bracket tournament (no custom formats). Verify the card still shows `Drabinka · 4 graczy · 501 · First to 3` (original behavior unchanged).

- [ ] **Step 6: Commit**

```bash
git add js/league.js
git commit -m "feat: show 'custom format' label in tournament card and info bar"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Checkbox in step 2 for bracket/groups: Task 3
- ✅ Per-phase collapsible cards in step 3: Task 4
- ✅ Cards with chips (option 3): Task 4
- ✅ Copy for subsequent phases: Task 4 (`_buildPhaseCard`)
- ✅ Copy disabled for last phase: Task 4 (isLast check)
- ✅ Single form when unchecked: Task 4 (showWizardStep toggle)
- ✅ getMatchConfig helper: Task 1
- ✅ createTournament stores phaseMatchConfigs: Task 2
- ✅ startTournamentMatch uses getMatchConfig: Task 2
- ✅ "custom format" in tournament card: Task 5
- ✅ "custom format" in info bar: Task 5
- ✅ "custom format" in post-match stats: Task 2 step 5
- ✅ Backward compatibility (no usePhaseFormats field): getMatchConfig returns matchConfig

**Placeholder scan:** No TBD, TODO, or incomplete steps found.

**Type consistency:**
- `getMatchConfig(tournament, match)` — defined Task 1, used Task 2 ✓
- `_formatLabel(config)` — defined Task 1, used Task 5 ✓
- `phaseMatchConfigs` keys: `'group'`, integers `0..n`, `'thirdPlace'` — consistent across Tasks 1, 2, 4 ✓
- `_readPhaseCardConfig(card)` returns `{variant, totalSets, totalLegs, inMode, checkoutMode, dartLimit}` — matches `matchConfig` shape ✓
