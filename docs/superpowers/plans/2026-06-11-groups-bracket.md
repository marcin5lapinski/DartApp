# Grupy + Drabinka — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Grupy + Drabinka" tournament format (group stage → knockout bracket) with configurable group count, advancement count, and football-style bracket seeding, and raise the max player limit from 10 to 16.

**Architecture:** A `phase:'group'|'bracket'` field on match objects distinguishes the two stages in the single `matches[]` array. Group standings use a new `computeGroupStandings(tournament, gi)` function (filtered variant of `computeStandings`). `finalizeGroupPhase()` computes standings, maps seed labels to real player indices, and updates the pre-created TBD bracket matches. The tournament view adds a third tab (Drabinka) and renames the first tab to "Grupy".

**Tech Stack:** Vanilla HTML5/CSS3/JS, `localStorage`, no build step.

---

## File Map

| File | What changes |
|---|---|
| `index.html` | max players 10→16; unlock groups tile; new `wstep-3b`; `btn-preview-groups`; `modal-group-preview`; `tv-tab-bracket` button |
| `js/tournament.js` | `showWizardStep` string support; step 3 next → 3b for groups; step 3b handlers; `_initStep3bGroupButtons`; `_updateAdvanceCountMax`; `_updateThirdPlaceVisibility`; `renderStep4Players` groups branch; `renderGroupPreviewModal`; `validateStep4` groups; `btn-create-tournament` reads group fields |
| `js/league.js` | `_buildGroups`; `_generateGroupMatches`; `_interleaveGroupMatches`; `_computeSnakePairs`; `_generateBracketTBD`; `createTournament` groups branch; `computeGroupStandings`; `isGroupPhaseComplete`; `renderTournamentViewScreen` groups branch; `_setGroupsTab`; `renderGroupsTab`; `renderGroupMatchesTab`; `_buildGroupMatchCard`; `_buildBracketCard` TBD labels; `renderBracketScreen` `isThirdPlace` filter |
| `js/app.js` | `saveTournamentMatchResult` groups logic; `startTournamentMatch` live-standings visibility; `btn-new-match` groups navigation; `finalizeGroupPhase` call; `btn-live-standings` groups handler |
| `css/style.css` | group section header; advancing row; adv-dot; adv-legend; tbd-card label; group-standings gap |

---

## Task 1: Player limit 10→16 + groups tile unlock

**Files:**
- Modify: `index.html` (lines ~637–638, ~655–658)
- Modify: `js/tournament.js` (line ~93)

- [ ] **Step 1: Raise max in HTML and fix hint text**

In `index.html`, find the num-players input (currently `max="10"`):

```html
<!-- BEFORE (lines ~637–638) -->
<p class="step-hint">Minimum: 3 &nbsp;·&nbsp; Maksimum: 10</p>
<input id="t-num-players" type="number" class="t-input-center" min="3" max="10" placeholder="np. 4">

<!-- AFTER -->
<p class="step-hint">Minimum: 3 &nbsp;·&nbsp; Maksimum: 16</p>
<input id="t-num-players" type="number" class="t-input-center" min="3" max="16" placeholder="np. 4">
```

- [ ] **Step 2: Fix validation in tournament.js**

Find the `t-next-1` click handler. Change the limit check:

```js
// BEFORE (around line 93)
if (!raw || isNaN(val) || val < 3 || val > 10) {
  err.textContent = 'Wpisz liczbę graczy od 3 do 10.';

// AFTER
if (!raw || isNaN(val) || val < 3 || val > 16) {
  err.textContent = 'Wpisz liczbę graczy od 3 do 16.';
```

- [ ] **Step 3: Unlock groups format tile in HTML**

Find the `data-format="groups"` tile (currently has `disabled` class):

```html
<!-- BEFORE (lines ~655–658) -->
<div class="format-tile disabled" data-format="groups">
  Grupy + Drabinka
  <span class="format-tile-sub">wkrótce</span>
</div>

<!-- AFTER -->
<div class="format-tile" id="t-format-groups" data-format="groups">
  Grupy + Drabinka
  <span class="format-tile-sub">faza grupowa + puchar</span>
</div>
```

- [ ] **Step 4: Add groups-settings panel + add id to groups tile**

Inside `<div class="format-details-panel">` (after the `<p id="t-bracket-desc" ...>` element), add:

```html
<div id="groups-settings" class="format-hidden">
  <p class="wizard-hint" style="margin-top:8px">
    Liczba grup i awansujący ustalane w następnym kroku.
  </p>
</div>
```

- [ ] **Step 5: Handle groups format in the format-tile click handler in tournament.js**

Find the block that handles format tile clicks (the handler that sets `tournamentConfig.format` and toggles `league-settings` / `t-bracket-desc`). Add handling for groups:

```js
// In the format tile click handler, replace the body with:
document.querySelectorAll('.format-tile').forEach(t => t.classList.remove('active'));
tile.classList.add('active');
tournamentConfig.format = tile.dataset.format;

const isLeague  = tile.dataset.format === 'league';
const isBracket = tile.dataset.format === 'bracket';
const isGroups  = tile.dataset.format === 'groups';

document.getElementById('league-settings').classList.toggle('format-hidden', !isLeague);
document.getElementById('t-bracket-desc').classList.toggle('format-hidden', !isBracket);
document.getElementById('groups-settings').classList.toggle('format-hidden', !isGroups);
```

- [ ] **Step 6: Add groups fields to initTournamentWizard reset**

Find `initTournamentWizard()`. After the existing `tournamentConfig = { format: 'league', ... }` assignment, ensure the object includes group-specific fields AND reset the groups tile/panel:

```js
tournamentConfig = {
  format: 'league',
  name: '',
  numPlayers: 0,
  numGroups: 2,
  advanceCount: 2,
  winPoints: 3,
  lossPoints: 0,
  thirdPlaceMatch: false,
  seeding: 'ordered',
  matchConfig: {},
};
// Reset format tiles
document.querySelectorAll('.format-tile').forEach(t => t.classList.remove('active'));
const leagueTile = document.getElementById('t-format-league');
if (leagueTile) leagueTile.classList.add('active');
document.getElementById('league-settings').classList.remove('format-hidden');
document.getElementById('t-bracket-desc').classList.add('format-hidden');
const gs = document.getElementById('groups-settings');
if (gs) gs.classList.add('format-hidden');
```

- [ ] **Step 7: Verify manually**

Open `index.html`. In wizard step 1 enter "16" players → should NOT show error. Enter "17" → should show error. In step 2, "Grupy + Drabinka" tile should be clickable, "groups-settings" hint appears. Switching to Liga shows league settings again.

- [ ] **Step 8: Commit**

```bash
git add index.html js/tournament.js
git commit -m "feat: raise max players to 16, unlock groups+bracket format tile"
```

---

## Task 2: Wizard step 3b HTML

**Files:**
- Modify: `index.html` (after `wstep-3`, before `wstep-4`)

- [ ] **Step 1: Insert the wstep-3b div**

Find the closing `</div>` of `wstep-3` and insert after it:

```html
<!-- ── Step 3b: Group configuration (groups format only) ── -->
<div class="wizard-step" id="wstep-3b">
  <div class="wizard-title">🎯 Nowy turniej</div>
  <div class="step-indicator">Krok 4 z 5</div>

  <label class="wlabel">Liczba grup</label>
  <div class="btn-group" id="t-groups-count-group">
    <!-- populated dynamically by _initStep3bGroupButtons() -->
  </div>

  <div class="form-row" style="margin-top:14px">
    <div class="form-group">
      <label for="t-advance-count">Awansujących z grupy</label>
      <input id="t-advance-count" type="number" min="2" value="2" style="text-align:center">
    </div>
    <div class="form-group">
      <!-- spacer -->
    </div>
  </div>

  <div class="form-row" style="margin-top:8px">
    <div class="form-group">
      <label for="t-group-win-pts">Pkt za wygraną</label>
      <input id="t-group-win-pts" type="number" min="0" value="3" style="text-align:center">
    </div>
    <div class="form-group">
      <label for="t-group-loss-pts">Pkt za przegraną</label>
      <input id="t-group-loss-pts" type="number" min="0" value="0" style="text-align:center">
    </div>
  </div>

  <div id="t-third-place-wrap" style="margin-top:10px;display:none">
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:.9rem">
      <input type="checkbox" id="t-third-place-match"> Mecz o 3. miejsce
    </label>
  </div>

  <span id="t-step3b-error" class="t-error" hidden></span>

  <div class="wizard-nav">
    <button id="t-back-3b" class="btn-wizard-back">&#8592; Powrót</button>
    <button id="t-next-3b" class="btn-wizard-next">DALEJ &#8594;</button>
  </div>
</div>
```

- [ ] **Step 2: Add a 5th wizard dot**

Find the `<div class="wizard-dots">` element that holds the 4 `<span class="wdot">` elements. Add a 5th:

```html
<!-- Example: existing 4 dots become 5 -->
<div class="wizard-dots">
  <span class="wdot wdot-active"></span>
  <span class="wdot"></span>
  <span class="wdot"></span>
  <span class="wdot"></span>
  <span class="wdot" id="wdot-5"></span>
</div>
```

(If your HTML uses a different selector or inline-style, just add a 5th span with class `wdot`.)

- [ ] **Step 3: Verify it exists**

Open `index.html` in browser. The step 3b div should be hidden (all `.wizard-step` are hidden by default except the active one). No visual change expected yet.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add wizard step 3b HTML for group configuration"
```

---

## Task 3: Wizard step 3b JS (navigation + group buttons)

**Files:**
- Modify: `js/tournament.js`

- [ ] **Step 1: Update `showWizardStep` to handle string '3b' and update step-indicator**

Find `showWizardStep(n)` and replace its body:

```js
function showWizardStep(n) {
  _wizardStep = n;
  document.querySelectorAll('.wizard-step').forEach(s => { s.style.display = 'none'; });
  const el = document.getElementById('wstep-' + n);
  if (!el) return;
  el.style.display = 'flex';

  const isGroups   = tournamentConfig && tournamentConfig.format === 'groups';
  const stepOrder  = isGroups ? [1, 2, 3, '3b', 4] : [1, 2, 3, 4];
  const visualPos  = stepOrder.indexOf(n) + 1;  // 1-based
  const totalSteps = stepOrder.length;

  // Update step-indicator text inside current step
  const ind = el.querySelector('.step-indicator');
  if (ind) ind.textContent = 'Krok ' + visualPos + ' z ' + totalSteps;

  // Update dots
  document.querySelectorAll('.wdot').forEach((dot, di) => {
    dot.classList.remove('wdot-active', 'wdot-done');
    if (di < visualPos - 1) dot.classList.add('wdot-done');
    else if (di === visualPos - 1) dot.classList.add('wdot-active');
  });
}
```

- [ ] **Step 2: Change `t-next-3` handler to branch on format**

Find the `t-next-3` click listener. After saving `tournamentConfig.matchConfig`, change the navigation:

```js
document.getElementById('t-next-3').addEventListener('click', () => {
  // ... existing validation and matchConfig save ...

  if (tournamentConfig.format === 'groups') {
    _initStep3bGroupButtons();
    showWizardStep('3b');
  } else {
    renderStep4Players();
    showWizardStep(4);
  }
});
```

- [ ] **Step 3: Add `t-back-3b` and `t-next-3b` handlers**

Add these after the `t-next-3` handler:

```js
document.getElementById('t-back-3b').addEventListener('click', () => {
  showWizardStep(3);
});

document.getElementById('t-next-3b').addEventListener('click', () => {
  const activeBtn   = document.querySelector('#t-groups-count-group .btn-seg.active');
  const numGroups   = activeBtn ? parseInt(activeBtn.dataset.groups) : 0;
  const advCount    = parseInt(document.getElementById('t-advance-count').value);
  const n           = tournamentConfig.numPlayers;
  const groupSize   = Math.floor(n / numGroups);
  const errEl       = document.getElementById('t-step3b-error');

  if (!numGroups || isNaN(advCount) || advCount < 2 || advCount >= groupSize) {
    errEl.textContent = 'Nieprawidłowe ustawienia grup.';
    errEl.hidden = false;
    return;
  }
  errEl.hidden = true;

  tournamentConfig.numGroups        = numGroups;
  tournamentConfig.advanceCount     = advCount;
  tournamentConfig.winPoints        = Math.max(0, parseInt(document.getElementById('t-group-win-pts').value) || 0);
  tournamentConfig.lossPoints       = Math.max(0, parseInt(document.getElementById('t-group-loss-pts').value) || 0);
  tournamentConfig.thirdPlaceMatch  = document.getElementById('t-third-place-match').checked;

  renderStep4Players();
  showWizardStep(4);
});
```

- [ ] **Step 4: Change `t-back-4` to go to 3b for groups**

Find the existing `t-back-4` click listener. Change:

```js
document.getElementById('t-back-4').addEventListener('click', () => {
  if (tournamentConfig.format === 'groups') {
    showWizardStep('3b');
  } else {
    showWizardStep(3);
  }
});
```

- [ ] **Step 5: Add `_initStep3bGroupButtons`, `_updateAdvanceCountMax`, `_updateThirdPlaceVisibility`**

Add these three functions (they can go near the other `_update*` helpers):

```js
function _initStep3bGroupButtons() {
  const n = tournamentConfig.numPlayers;
  // Valid group counts: k ≥ 1 AND floor(n/k) ≥ 3
  const validCounts = [];
  for (let k = 1; k <= n; k++) {
    if (Math.floor(n / k) >= 3) validCounts.push(k);
  }

  const group = document.getElementById('t-groups-count-group');
  group.innerHTML = '';

  let defaultK = tournamentConfig.numGroups;
  if (!validCounts.includes(defaultK)) {
    defaultK = validCounts.length >= 2 ? validCounts[1] : validCounts[0];
  }

  validCounts.forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-seg' + (k === defaultK ? ' active' : '');
    btn.dataset.groups = k;
    btn.textContent = k === 1 ? '1 grupa' : k + ' grupy';
    btn.addEventListener('click', () => {
      group.querySelectorAll('.btn-seg').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tournamentConfig.numGroups = k;
      _updateAdvanceCountMax();
      _updateThirdPlaceVisibility();
    });
    group.appendChild(btn);
  });

  tournamentConfig.numGroups = defaultK;
  _updateAdvanceCountMax();
  _updateThirdPlaceVisibility();

  // Restore previously saved values if returning from step 4
  const advInp = document.getElementById('t-advance-count');
  if (advInp) advInp.value = tournamentConfig.advanceCount || 2;
  const wpInp  = document.getElementById('t-group-win-pts');
  if (wpInp)  wpInp.value  = tournamentConfig.winPoints  !== undefined ? tournamentConfig.winPoints  : 3;
  const lpInp  = document.getElementById('t-group-loss-pts');
  if (lpInp)  lpInp.value  = tournamentConfig.lossPoints !== undefined ? tournamentConfig.lossPoints : 0;
  const tpCk   = document.getElementById('t-third-place-match');
  if (tpCk)   tpCk.checked = tournamentConfig.thirdPlaceMatch || false;
}

function _updateAdvanceCountMax() {
  const n         = tournamentConfig.numPlayers;
  const k         = tournamentConfig.numGroups;
  const groupSize = Math.floor(n / k);
  const inp       = document.getElementById('t-advance-count');
  if (!inp) return;
  inp.max = groupSize - 1;
  const cur = parseInt(inp.value) || 2;
  if (cur >= groupSize) inp.value = Math.min(groupSize - 1, 2);
}

function _updateThirdPlaceVisibility() {
  const k    = tournamentConfig.numGroups;
  const adv  = parseInt(document.getElementById('t-advance-count')?.value) || 2;
  const wrap = document.getElementById('t-third-place-wrap');
  // Show "mecz o 3. miejsce" only if bracket will have ≥4 participants (= ≥2 semi-final slots)
  if (wrap) wrap.style.display = k * adv >= 4 ? '' : 'none';
}
```

- [ ] **Step 6: Verify wizard flow**

1. Open wizard, choose 6 players, click "Grupy + Drabinka", step 3 (match settings) → DALEJ.
2. Step 3b should appear with group count buttons (valid: 1, 2 for 6 players).
3. Choose 2 groups → max advance = 2, 3rd-place toggle appears.
4. Click DALEJ → step 4 (player list).
5. Click POWRÓT from step 4 → returns to step 3b.
6. Click POWRÓT from step 3b → returns to step 3.
7. Step indicator text updates correctly ("Krok 4 z 5" on step 3b, "Krok 5 z 5" on step 4).

- [ ] **Step 7: Commit**

```bash
git add js/tournament.js
git commit -m "feat: add wizard step 3b JS for group configuration"
```

---

## Task 4: Step 4 groups adjustments + group preview modal

**Files:**
- Modify: `index.html` (add btn-preview-groups, modal-group-preview)
- Modify: `js/tournament.js`

- [ ] **Step 1: Add preview-groups button and group preview modal to HTML**

Find `<button id="btn-preview-bracket" ...>`. Add the groups preview button right after it:

```html
<button id="btn-preview-groups" class="btn-preview-bracket" style="display:none">
  👁 Podgląd grup
</button>
```

Add the modal at the end of the modals section (near `modal-bracket-preview`):

```html
<div class="modal" id="modal-group-preview">
  <div class="modal-inner-rel">
    <button class="btn-modal-corner-close" onclick="closeModal('modal-group-preview')">✕</button>
    <h3 style="margin-bottom:12px">Podgląd grup</h3>
    <div id="group-preview-body"></div>
  </div>
</div>
```

- [ ] **Step 2: Update `renderStep4Players` to show/hide buttons per format**

Find `renderStep4Players`. At the end of the function (after the preview-bracket button logic), add:

```js
const isGroupsFmt = tournamentConfig.format === 'groups';
const isBracketFmt = tournamentConfig.format === 'bracket';

// Show/hide preview buttons
const pbBtn = document.getElementById('btn-preview-bracket');
const pgBtn = document.getElementById('btn-preview-groups');
if (pbBtn) pbBtn.style.display = isBracketFmt ? '' : 'none';
if (pgBtn) pgBtn.style.display = isGroupsFmt ? '' : 'none';

// BYE toggle row: only for bracket
const byeContainer = document.getElementById('t-bye-counter');
if (byeContainer) byeContainer.style.display = isBracketFmt ? '' : 'none';
```

Also ensure the BYE toggle column/label is hidden per player block when not bracket:

```js
// inside the player block rendering loop, after creating the block:
const byeToggle = block.querySelector('.bye-toggle');
if (byeToggle) {
  byeToggle.parentElement.style.display = isBracketFmt ? '' : 'none';
}
```

- [ ] **Step 3: Add `btn-preview-groups` click handler and `renderGroupPreviewModal`**

```js
document.getElementById('btn-preview-groups').addEventListener('click', () => {
  renderGroupPreviewModal();
});

function renderGroupPreviewModal() {
  const vals = _getStep4Values();
  const n    = tournamentConfig.numPlayers;
  const k    = tournamentConfig.numGroups;
  if (!vals || vals.length < n) return;

  const body = document.getElementById('group-preview-body');
  body.innerHTML = '';

  for (let gi = 0; gi < k; gi++) {
    const groupName   = String.fromCharCode(65 + gi);
    const groupBlock  = document.createElement('div');
    groupBlock.style.cssText = 'margin-bottom:14px';

    const header = document.createElement('div');
    header.className = 'group-preview-header';
    header.textContent = 'Grupa ' + groupName;
    groupBlock.appendChild(header);

    const list = document.createElement('div');
    list.className = 'group-preview-list';
    // Players assigned round-robin by position: player i → group i % k
    for (let pi = gi; pi < n; pi += k) {
      const row = document.createElement('div');
      row.className = 'group-preview-player';
      row.textContent = (vals[pi] && vals[pi].name.trim()) || '—';
      list.appendChild(row);
    }
    groupBlock.appendChild(list);
    body.appendChild(groupBlock);
  }

  openModal('modal-group-preview');
}
```

- [ ] **Step 4: Update `validateStep4` to not require BYE count for groups**

Find `validateStep4`. The existing code has a bracket-only BYE check. Ensure the condition doesn't fire for groups:

```js
// Existing:
} else if (allFilled && tournamentConfig.format === 'bracket') {
// This already excludes groups format — no change needed here.
// But add a guard: for groups, btn is enabled when all filled and no dups.
```

The existing final `else` branch (`btn.disabled = !allFilled`) already handles groups correctly. No change needed.

- [ ] **Step 5: Read group config in `btn-create-tournament` handler**

The `btn-create-tournament` handler reads player values via `_getStep4Values()` and builds the `players` array. The `tournamentConfig` already has `numGroups`, `advanceCount`, `winPoints`, `lossPoints`, `thirdPlaceMatch` set from the step 3b handler. No changes needed here — `createTournament(tournamentConfig, players)` receives the full config.

However, groups format has no `bye` flag concept. Add a safety strip in the handler:

```js
// In btn-create-tournament handler, find the seeding/shuffle section.
// After shuffle (if random seeding), before createTournament call:
// (no change needed — createTournament for groups will strip the bye field)
```

- [ ] **Step 6: Add CSS for preview modal content**

In `css/style.css`, add:

```css
.group-preview-header {
  font-size: .75rem;
  font-weight: 700;
  color: var(--accent);
  background: rgba(230,57,70,.08);
  border: 1px solid rgba(230,57,70,.18);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  padding: 5px 10px;
}

.group-preview-list {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0 0 6px 6px;
  padding: 6px 10px;
}

.group-preview-player {
  padding: 3px 0;
  font-size: .85rem;
}
```

- [ ] **Step 7: Verify**

In wizard: complete steps 1–3b → step 4 → click "👁 Podgląd grup". Modal opens showing groups with player names (assigned round-robin). Close modal, create tournament → should call `createTournament` (will error until Task 5, but wizard flow should complete).

- [ ] **Step 8: Commit**

```bash
git add index.html js/tournament.js css/style.css
git commit -m "feat: step 4 groups adjustments and group preview modal"
```

---

## Task 5: Data layer — createTournament for groups

**Files:**
- Modify: `js/league.js`

- [ ] **Step 1: Add `_buildGroups(players, numGroups, advanceCount)`**

Add after `generateBracket`:

```js
function _buildGroups(players, numGroups, advanceCount) {
  const groups = Array.from({ length: numGroups }, (_, gi) => ({
    name: String.fromCharCode(65 + gi),
    playerIndices: [],
    advanceCount,
  }));
  players.forEach((p, i) => {
    groups[i % numGroups].playerIndices.push(i);
  });
  return groups;
}
```

- [ ] **Step 2: Add `_generateGroupMatches(groups)` and `_interleaveGroupMatches(numGroups, matches)`**

```js
function _generateGroupMatches(groups) {
  const buckets = groups.map(() => []);
  groups.forEach((g, gi) => {
    const idxs = g.playerIndices;
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        buckets[gi].push({
          p1: idxs[a], p2: idxs[b],
          winner: null,
          legs: [null, null], sets: [null, null],
          avgs: [null, null], stats: [null, null],
          starter: null,
          phase: 'group',
          groupIndex: gi,
          isBye: false,
        });
      }
    }
  });
  // Interleave: A#1, B#1, C#1, A#2, B#2, ...
  const result = [];
  const ptrs   = new Array(groups.length).fill(0);
  let remaining = buckets.reduce((s, b) => s + b.length, 0);
  while (remaining > 0) {
    for (let gi = 0; gi < groups.length; gi++) {
      if (ptrs[gi] < buckets[gi].length) {
        result.push(buckets[gi][ptrs[gi]++]);
        remaining--;
      }
    }
  }
  return result;
}
```

- [ ] **Step 3: Add `_computeSnakePairs(n)` and `_generateBracketTBD(numGroups, advanceCount, thirdPlaceMatch)`**

```js
function _computeSnakePairs(n) {
  // Returns [[p1SeedIdx, p2SeedIdx], ...] per R1 slot for a full n-seed bracket.
  // Ensures top seeds are in different halves (seed0 vs seedN-1, etc.).
  if (n <= 1) return [];
  if (n === 2) return [[0, 1]];
  const half   = n / 2;
  const result = [];
  for (let i = 0; i < half / 2; i++) {
    result.push([i, n - 1 - i]);             // top pair: 0 vs n-1, 1 vs n-2 …
    result.push([half - 1 - i, half + i]);   // mid pair: n/2-1 vs n/2, n/2-2 vs n/2+1 …
  }
  return result;
}

function _generateBracketTBD(numGroups, advanceCount, thirdPlaceMatch) {
  const totalSeeds = numGroups * advanceCount;
  const B          = nextPowerOf2(totalSeeds);
  const numByes    = B - totalSeeds;
  const numRounds  = Math.log2(B);
  const r1Slots    = B / 2;

  // Seed label list: A1, B1, C1 …, A2, B2, C2 …
  const seedLabels = [];
  for (let rank = 1; rank <= advanceCount; rank++) {
    for (let gi = 0; gi < numGroups; gi++) {
      seedLabels.push(String.fromCharCode(65 + gi) + rank);
    }
  }

  const byeSeeds  = seedLabels.slice(0, numByes);
  const realSeeds = seedLabels.slice(numByes);

  const matches = [];

  if (numByes === 0) {
    // No byes: snake seeding so top seeds avoid each other in R1
    const snakePairs = _computeSnakePairs(totalSeeds);
    for (let slot = 0; slot < r1Slots; slot++) {
      const pair = snakePairs[slot] || [0, 1];
      matches.push({
        round: 0, slot, phase: 'bracket', isBye: false, isThirdPlace: false,
        p1: null, p2: null, winner: null,
        legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
        p1Label: seedLabels[pair[0]], p2Label: seedLabels[pair[1]],
      });
    }
  } else {
    // With byes: top seeds get byes (same interleave as generateBracket)
    const numReal    = totalSeeds - r1Slots;
    const realSlotSet = new Set();
    for (let i = 0; i < numReal; i++) {
      realSlotSet.add(Math.floor(i * r1Slots / numReal));
    }
    let byePtr = 0, realPtr = 0;
    for (let slot = 0; slot < r1Slots; slot++) {
      if (realSlotSet.has(slot)) {
        matches.push({
          round: 0, slot, phase: 'bracket', isBye: false, isThirdPlace: false,
          p1: null, p2: null, winner: null,
          legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
          p1Label: realSeeds[realPtr]     || null,
          p2Label: realSeeds[realPtr + 1] || null,
        });
        realPtr += 2;
      } else {
        matches.push({
          round: 0, slot, phase: 'bracket', isBye: true, isThirdPlace: false,
          p1: null, p2: null, winner: null,
          legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
          p1Label: byeSeeds[byePtr] || null, p2Label: null,
        });
        byePtr++;
      }
    }
  }

  // Rounds 1 … numRounds-1: all TBD
  for (let r = 1; r < numRounds; r++) {
    const slotsInRound = B / Math.pow(2, r + 1);
    for (let slot = 0; slot < slotsInRound; slot++) {
      matches.push({
        round: r, slot, phase: 'bracket', isBye: false, isThirdPlace: false,
        p1: null, p2: null, winner: null,
        legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
        p1Label: null, p2Label: null,
      });
    }
  }

  if (thirdPlaceMatch) {
    matches.push({
      round: numRounds - 1, slot: -1, phase: 'bracket', isBye: false, isThirdPlace: true,
      p1: null, p2: null, winner: null,
      legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null], starter: null,
      p1Label: null, p2Label: null,
    });
  }

  return { bracketSize: B, matches };
}
```

- [ ] **Step 4: Add the groups branch to `createTournament`**

Find `createTournament(config, players)`. Add before the final `return tournament; }`:

```js
function createTournament(config, players) {
  const isBracket = config.format === 'bracket';
  const isGroups  = config.format === 'groups';

  if (isGroups) {
    const groups = _buildGroups(players, config.numGroups, config.advanceCount);
    const { bracketSize, matches: bracketMatches } = _generateBracketTBD(
      groups.length, config.advanceCount, config.thirdPlaceMatch || false
    );
    const tournament = {
      id:        't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      name:      config.name,
      status:    'active',
      createdAt: Math.floor(Date.now() / 1000),
      config: {
        numPlayers:     config.numPlayers,
        format:         'groups',
        groups,
        winPoints:      config.winPoints  !== undefined ? config.winPoints  : 3,
        lossPoints:     config.lossPoints !== undefined ? config.lossPoints : 0,
        thirdPlaceMatch: config.thirdPlaceMatch || false,
        bracketSize,
        matchConfig:    { ...config.matchConfig },
      },
      players: players.map(({ bye, ...rest }) => rest),
      matches: [..._generateGroupMatches(groups), ...bracketMatches],
    };
    const list = loadTournaments();
    list.push(tournament);
    saveTournaments(list);
    return tournament;
  }

  // … existing league / bracket logic unchanged …
```

- [ ] **Step 5: Verify tournament creation**

Create a groups tournament (6 players, 2 groups, 2 advance). Check `dart_tournaments` in DevTools → Application → localStorage. Confirm:
- `config.format === 'groups'`
- `config.groups` is array of 2 groups each with `playerIndices` and `advanceCount`
- `matches[]` has: 6 group-phase matches (`phase:'group'`) + 2 bracket R1 matches (`phase:'bracket', round:0`) + 1 final (`round:1`)
- R1 matches have `p1Label:'A1'`, `p2Label:'B2'` (or similar snake seeding)

- [ ] **Step 6: Commit**

```bash
git add js/league.js
git commit -m "feat: data layer for groups format (createTournament, match generation, TBD bracket)"
```

---

## Task 6: computeGroupStandings + isGroupPhaseComplete

**Files:**
- Modify: `js/league.js`

- [ ] **Step 1: Add `computeGroupStandings(tournament, groupIndex)`**

Add after `computeLiveStandings`:

```js
function computeGroupStandings(tournament, groupIndex) {
  const { players, matches, config } = tournament;
  const group = config.groups[groupIndex];

  const rows = group.playerIndices.map(pi => ({
    playerIndex: pi,
    name: players[pi].name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  const rowByIdx = new Map(rows.map(r => [r.playerIndex, r]));

  for (const m of matches) {
    if (m.phase !== 'group' || m.groupIndex !== groupIndex || m.winner === null) continue;
    const wIdx = m.winner === 0 ? m.p1 : m.p2;
    const lIdx = m.winner === 0 ? m.p2 : m.p1;
    const wr = rowByIdx.get(wIdx);
    const lr = rowByIdx.get(lIdx);
    if (!wr || !lr) continue;

    wr.M++; wr.W++; wr.pts += config.winPoints;
    lr.M++; lr.L++; lr.pts += config.lossPoints;

    const r1 = rowByIdx.get(m.p1);
    const r2 = rowByIdx.get(m.p2);
    if (r1) { r1.legsWon += m.legs[0] || 0; r1.legsLost += m.legs[1] || 0; }
    if (r2) { r2.legsWon += m.legs[1] || 0; r2.legsLost += m.legs[0] || 0; }

    if (m.avgs[0] !== null && r1) { r1.avgSum += m.avgs[0]; r1.avgCount++; }
    if (m.avgs[1] !== null && r2) { r2.avgSum += m.avgs[1]; r2.avgCount++; }
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.playerIndex - b.playerIndex;
  });

  return rows;
}

function isGroupPhaseComplete(tournament) {
  return tournament.matches
    .filter(m => m.phase === 'group')
    .every(m => m.winner !== null);
}
```

- [ ] **Step 2: Verify functions exist**

Open browser DevTools console. Load `index.html`. Check:
```js
typeof computeGroupStandings   // "function"
typeof isGroupPhaseComplete    // "function"
```

- [ ] **Step 3: Commit**

```bash
git add js/league.js
git commit -m "feat: computeGroupStandings and isGroupPhaseComplete"
```

---

## Task 7: Tournament view shell for groups (3 tabs)

**Files:**
- Modify: `index.html` (add `tv-tab-bracket` button)
- Modify: `js/league.js` (renderTournamentViewScreen groups branch + _setGroupsTab)

- [ ] **Step 1: Add the third tab button to HTML**

Find the `<div class="tv-tabs" id="tv-tabs">` element. Add the bracket tab (hidden by default):

```html
<div class="tv-tabs" id="tv-tabs">
  <button class="tv-tab active" id="tv-tab-table">Tabela</button>
  <button class="tv-tab tv-tab-disabled" id="tv-tab-matches">Mecze</button>
  <button class="tv-tab" id="tv-tab-bracket" style="display:none">Drabinka</button>
</div>
```

- [ ] **Step 2: Add `_setGroupsTab(name)` helper**

Add in `league.js` near `renderTournamentViewScreen`:

```js
function _setGroupsTab(name) {
  const standingsEl = document.getElementById('tv-standings');
  const matchesEl   = document.getElementById('tv-matches');
  const bracketEl   = document.getElementById('tv-bracket');
  standingsEl.style.display = name === 'groups'  ? '' : 'none';
  matchesEl.style.display   = name === 'matches' ? '' : 'none';
  bracketEl.style.display   = name === 'bracket' ? '' : 'none';

  const tabTable   = document.getElementById('tv-tab-table');
  const tabMatches = document.getElementById('tv-tab-matches');
  const tabBracket = document.getElementById('tv-tab-bracket');
  [tabTable, tabMatches, tabBracket].forEach(t => t && t.classList.remove('active'));
  if (name === 'groups')  tabTable.classList.add('active');
  if (name === 'matches') tabMatches.classList.add('active');
  if (name === 'bracket') tabBracket.classList.add('active');
}
```

- [ ] **Step 3: Add groups branch to `renderTournamentViewScreen`**

At the top of `renderTournamentViewScreen`, add a groups branch before the bracket branch. Also reset `tv-tab-bracket` visibility for non-groups:

```js
function renderTournamentViewScreen(tournament) {
  _activeTournament = tournament;
  const isBracket = tournament.config.format === 'bracket';
  const isGroups  = tournament.config.format === 'groups';

  // Always reset bracket tab visibility
  const tabBracket = document.getElementById('tv-tab-bracket');
  if (tabBracket) tabBracket.style.display = isGroups ? '' : 'none';
  // Reset tab labels for non-groups usage
  const tabTable = document.getElementById('tv-tab-table');
  if (tabTable && !isGroups) tabTable.textContent = 'Tabela';

  if (isBracket) {
    // … existing bracket code, unchanged …
    return;
  }

  if (isGroups) {
    document.getElementById('tv-title').textContent = tournament.name;
    document.getElementById('tv-tabs').style.display = '';

    // Rename first tab
    if (tabTable) tabTable.textContent = 'Grupy';

    const mc           = tournament.config.matchConfig;
    const groupMatches = tournament.matches.filter(m => m.phase === 'group');
    const groupPlayed  = groupMatches.filter(m => m.winner !== null).length;
    const phaseLabel   = isGroupPhaseComplete(tournament) ? '● Faza pucharowa' : '● Faza grupowa';

    document.getElementById('tv-info-bar').innerHTML =
      `<span>Grupy+Drabinka &middot; ${mc.variant} &middot; First to ${mc.totalLegs}</span>` +
      `<span>${tournament.players.length} graczy &middot; ${groupPlayed}/${groupMatches.length} meczów gr. &middot; <b>${phaseLabel}</b></span>`;

    // Wire up tab clicks (clone to remove stale listeners)
    ['tv-tab-table', 'tv-tab-matches', 'tv-tab-bracket'].forEach(id => {
      const old = document.getElementById(id);
      if (!old) return;
      const fresh = old.cloneNode(true);
      old.parentNode.replaceChild(fresh, old);
    });

    document.getElementById('tv-tab-table').addEventListener('click', () => {
      _setGroupsTab('groups');
      renderGroupsTab(tournament);
    });
    document.getElementById('tv-tab-matches').addEventListener('click', () => {
      _setGroupsTab('matches');
      renderGroupMatchesTab(tournament);
    });
    document.getElementById('tv-tab-bracket').addEventListener('click', () => {
      _setGroupsTab('bracket');
      renderBracketScreen(tournament);
    });

    // Default tab: groups standings
    _setGroupsTab('groups');
    renderGroupsTab(tournament);
    return;
  }

  // … existing league code, unchanged (restore tv-tab-matches disabled etc.) …
```

For the existing league code, also restore the "Tabela" tab text (it was renamed to "Grupy" for groups format):

```js
  // --- league: restore tabs/standings visibility ---
  document.getElementById('tv-tabs').style.display = '';
  document.getElementById('tv-bracket').style.display = 'none';
  document.getElementById('tv-title').textContent = tournament.name;
  if (tabTable) tabTable.textContent = 'Tabela';  // ← ADD THIS LINE
  document.getElementById('tv-tab-matches').classList.remove('tv-tab-disabled');
  // … rest unchanged …
```

- [ ] **Step 4: Stub out `renderGroupsTab` and `renderGroupMatchesTab`**

Add temporary stubs so the tab wiring doesn't crash (full implementations in Task 8):

```js
function renderGroupsTab(tournament) {
  document.getElementById('tv-standings').innerHTML = '<p style="padding:12px;color:#888">Ładowanie...</p>';
}

function renderGroupMatchesTab(tournament) {
  document.getElementById('tv-matches').innerHTML = '<p style="padding:12px;color:#888">Ładowanie...</p>';
}
```

- [ ] **Step 5: Verify tab shell**

Create a groups tournament. Navigate to the tournament view. Verify:
- 3 tabs appear: "Grupy", "Mecze", "Drabinka"
- Info bar shows correct info
- Switching tabs changes displayed panel (stubs show "Ładowanie...")
- Drabinka tab renders the bracket (calls `renderBracketScreen`)

- [ ] **Step 6: Commit**

```bash
git add index.html js/league.js
git commit -m "feat: groups tournament view shell (3-tab layout)"
```

---

## Task 8: renderGroupsTab + renderGroupMatchesTab + CSS

**Files:**
- Modify: `js/league.js`
- Modify: `css/style.css`

- [ ] **Step 1: Add CSS for groups format**

In `css/style.css`, add:

```css
/* Groups format */
.group-section-header {
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 10px 4px 4px;
  margin-top: 8px;
}

.group-standings-wrap {
  max-width: 600px;
  margin: 0 auto;
}

.group-standings-table {
  margin-bottom: 0;
}

.group-standings-table tbody tr.group-advancing td:first-child {
  border-left: 3px solid var(--green);
}

.adv-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  margin-right: 6px;
  vertical-align: middle;
}

.adv-legend {
  font-size: .72rem;
  color: var(--text-muted);
  padding: 6px 4px 12px;
  max-width: 600px;
  margin: 0 auto;
}

.tv-matches-section-label {
  font-size: .7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--text-muted);
  padding: 12px 0 6px;
  max-width: 600px;
  margin: 0 auto;
}

/* Bracket TBD card label styling */
.tbd-card .mpname {
  color: #555;
  font-style: italic;
}
```

- [ ] **Step 2: Implement `renderGroupsTab(tournament)`**

Replace the stub:

```js
function renderGroupsTab(tournament) {
  const container = document.getElementById('tv-standings');
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'group-standings-wrap';

  tournament.config.groups.forEach((group, gi) => {
    const rows      = computeGroupStandings(tournament, gi);
    const advCount  = group.advanceCount;
    const finished  = tournament.status === 'finished';

    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'group-section-header';
    sectionLabel.textContent = 'Grupa ' + group.name;
    wrap.appendChild(sectionLabel);

    const table  = document.createElement('table');
    table.className = 'standings-table group-standings-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th>#</th><th class="left">Gracz</th>
      <th>M</th><th>W</th><th>L</th>
      <th>Legi</th><th>Avg</th><th>Pkt</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((row, rank0) => {
      const rank      = rank0 + 1;
      const advancing = rank <= advCount;
      const legDiff   = row.legsWon - row.legsLost;
      const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
      const legsStr   = row.M === 0 ? '&mdash;' : `${row.legsWon}‑${row.legsLost}`;
      const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

      const MEDAL_POS  = ['pos-gold',  'pos-silver',  'pos-bronze'];
      const MEDAL_NAME = ['name-gold', 'name-silver', 'name-bronze'];
      let posClass  = 'pos-num';
      let nameClass = '';
      if (finished && rank <= 3) {
        posClass  = MEDAL_POS[rank - 1]  || 'pos-num';
        nameClass = MEDAL_NAME[rank - 1] || '';
      }

      const tr = document.createElement('tr');
      if (advancing) tr.classList.add('group-advancing');
      tr.innerHTML = `
        <td class="${posClass}">${rank}</td>
        <td class="left player-name-cell ${nameClass}">
          ${advancing ? '<span class="adv-dot"></span>' : ''}${escapeHtml(row.name)}
        </td>
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
    wrap.appendChild(table);
  });

  const legend = document.createElement('div');
  legend.className = 'adv-legend';
  legend.innerHTML = '<span class="adv-dot"></span> awansuje do fazy pucharowej';
  wrap.appendChild(legend);

  container.appendChild(wrap);
}
```

- [ ] **Step 3: Implement `renderGroupMatchesTab(tournament)` and `_buildGroupMatchCard(tournament, m, globalIdx)`**

Replace the stub:

```js
function renderGroupMatchesTab(tournament) {
  const container         = document.getElementById('tv-matches');
  container.innerHTML     = '';
  const groupPhaseDone    = isGroupPhaseComplete(tournament);

  // Per-group sections
  tournament.config.groups.forEach((group, gi) => {
    const label = document.createElement('div');
    label.className = 'tv-matches-section';
    label.textContent = 'Grupa ' + group.name;
    container.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    container.appendChild(grid);

    tournament.matches
      .filter(m => m.phase === 'group' && m.groupIndex === gi)
      .forEach(m => {
        const globalIdx = tournament.matches.indexOf(m);
        grid.appendChild(_buildGroupMatchCell(tournament, m, globalIdx));
      });
  });

  // Bracket section (only after group phase complete)
  if (groupPhaseDone) {
    const bracketMatches = tournament.matches
      .filter(m => m.phase === 'bracket' && !m.isBye && !m.isThirdPlace)
      .sort((a, b) => a.round - b.round || a.slot - b.slot);

    if (bracketMatches.length > 0) {
      const label = document.createElement('div');
      label.className = 'tv-matches-section';
      label.textContent = 'Faza pucharowa';
      container.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'matches-grid';
      container.appendChild(grid);

      bracketMatches.forEach(m => {
        const globalIdx = tournament.matches.indexOf(m);
        grid.appendChild(_buildGroupMatchCell(tournament, m, globalIdx));
      });
    }

    // Third place
    const thirdMatch = tournament.matches.find(m => m.phase === 'bracket' && m.isThirdPlace);
    if (thirdMatch) {
      const label = document.createElement('div');
      label.className = 'tv-matches-section';
      label.textContent = 'Mecz o 3. miejsce';
      container.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'matches-grid';
      container.appendChild(grid);

      const globalIdx = tournament.matches.indexOf(thirdMatch);
      grid.appendChild(_buildGroupMatchCell(tournament, thirdMatch, globalIdx));
    }
  }
}

function _buildGroupMatchCell(tournament, m, globalIdx) {
  const cell   = document.createElement('div');
  cell.className = 'match-cell';

  const numDiv = document.createElement('div');
  numDiv.className = 'match-num-above';
  numDiv.textContent = '#' + (globalIdx + 1);
  cell.appendChild(numDiv);

  const card = document.createElement('div');
  card.dataset.matchIndex = globalIdx;

  // TBD: bracket match not yet seeded
  if (m.p1 === null || m.p2 === null) {
    card.className = 'match-card tbd-card';
    const pd = document.createElement('div');
    pd.className = 'match-players';
    pd.appendChild(_buildMatchPlayerRow(m.p1Label || '?', null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(m.p2Label || '?', null, null, ''));
    card.appendChild(pd);
    cell.appendChild(card);
    return cell;
  }

  const p1Name = tournament.players[m.p1].name;
  const p2Name = tournament.players[m.p2].name;

  if (m.winner !== null) {
    card.className = 'match-card played';
    const useSet  = m.sets && m.sets[0] !== null;
    const w = m.winner, l = 1 - w;
    const wPIdx   = w === 0 ? m.p1 : m.p2;
    const lPIdx   = l === 0 ? m.p1 : m.p2;
    const wScore  = useSet ? m.sets[w]  : m.legs[w];
    const lScore  = useSet ? m.sets[l]  : m.legs[l];
    const wAvgF   = m.avgs[w], lAvgF = m.avgs[l];
    const wAvg    = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg    = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest   = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest   = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    const pd = document.createElement('div');
    pd.className = 'match-players';
    pd.appendChild(_buildMatchPlayerRow(tournament.players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    pd.appendChild(_buildMatchPlayerRow(tournament.players[lPIdx].name, lScore, lAvg, 'loser',  lBest));
    card.appendChild(pd);
    card.addEventListener('click', () => openTournamentMatchStats(tournament, globalIdx));
  } else {
    card.className = 'match-card unplayed';
    const pd = document.createElement('div');
    pd.className = 'match-players';
    pd.appendChild(_buildMatchPlayerRow(p1Name, null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(p2Name, null, null, ''));
    card.appendChild(pd);
    card.addEventListener('click', () => openTournamentStarterModal(tournament, globalIdx));
  }

  cell.appendChild(card);
  return cell;
}
```

- [ ] **Step 4: Verify groups view**

Create a groups tournament. Open tournament view:
- "Grupy" tab: shows each group with a standings table and advancing dot markers.
- "Mecze" tab: shows group sections with match cards. Unplayed cards are clickable (opens starter modal).
- "Drabinka" tab: shows bracket with TBD labels (e.g., "A1", "B2").

- [ ] **Step 5: Commit**

```bash
git add js/league.js css/style.css
git commit -m "feat: renderGroupsTab and renderGroupMatchesTab with groups CSS"
```

---

## Task 9: Bracket TBD labels + finalizeGroupPhase

**Files:**
- Modify: `js/league.js`

- [ ] **Step 1: Update `_buildBracketCard` to show p1Label/p2Label for TBD slots**

Find `_buildBracketCard`. In the `else` branch (unplayed/TBD):

```js
} else {
  // Unplayed or partially-seeded TBD: show known names, label, or "?"
  const name1 = m.p1 !== null ? players[m.p1].name : (m.p1Label || '?');
  const name2 = m.p2 !== null ? players[m.p2].name : (m.p2Label || '?');
  pd.appendChild(_buildMatchPlayerRow(name1, null, null, ''));
  pd.appendChild(_buildMatchPlayerRow(name2, null, null, ''));
}
```

- [ ] **Step 2: Filter `isThirdPlace` from `byRound` in `renderBracketScreen`**

Find the `byRound` loop in `renderBracketScreen`:

```js
// BEFORE
byRound.push(matches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot));

// AFTER
byRound.push(matches.filter(m => m.round === r && !m.isThirdPlace).sort((a, b) => a.slot - b.slot));
```

This prevents the third-place match (slot = -1) from appearing in the bracket column.

- [ ] **Step 3: Add `finalizeGroupPhase(tournament)`**

Add after `isGroupPhaseComplete`:

```js
function finalizeGroupPhase(tournament) {
  const { config, matches } = tournament;
  const numGroups   = config.groups.length;
  const advCount    = config.groups[0].advanceCount;

  // 1. Compute standings for each group
  const groupStandings = config.groups.map((g, gi) => computeGroupStandings(tournament, gi));

  // 2. Build seed-label → player index map
  //    Seeds listed as: A1, B1, C1…, A2, B2, C2… (same order as _generateBracketTBD seedLabels)
  const labelToPlayerIdx = new Map();
  for (let rank = 0; rank < advCount; rank++) {
    for (let gi = 0; gi < numGroups; gi++) {
      const row = groupStandings[gi][rank];
      if (!row) continue;
      const label = String.fromCharCode(65 + gi) + (rank + 1);
      labelToPlayerIdx.set(label, row.playerIndex);
    }
  }

  // 3. Update R1 bracket matches with real player indices
  const r1Matches = matches.filter(m => m.phase === 'bracket' && m.round === 0);
  r1Matches.forEach(m => {
    if (m.isBye) {
      m.p1 = labelToPlayerIdx.get(m.p1Label) ?? null;
      m.winner = 0; // confirm bye winner pre-set
    } else {
      m.p1 = labelToPlayerIdx.get(m.p1Label) ?? null;
      m.p2 = labelToPlayerIdx.get(m.p2Label) ?? null;
    }
  });

  // 4. Propagate bye winners into R2 (same as generateBracket does at creation for pure bracket)
  r1Matches.filter(m => m.isBye).forEach(m => advanceBracketWinner(matches, m));
}
```

- [ ] **Step 4: Verify bracket labels**

Create a 6-player, 2-group tournament. Open Drabinka tab. R1 cards should show "A1 vs B2" and "B1 vs A2" (snake seeding). After the group phase completes (in Task 10), these will update to real player names.

- [ ] **Step 5: Commit**

```bash
git add js/league.js
git commit -m "feat: bracket TBD labels and finalizeGroupPhase seeding"
```

---

## Task 10: app.js integration

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Update `saveTournamentMatchResult` for groups format**

Find `saveTournamentMatchResult`. Replace the block after saving match fields:

```js
// BEFORE
  if (t.config.format === 'bracket') {
    advanceBracketWinner(t.matches, m);
  }

  if (t.matches.every(mx => mx.winner !== null)) t.status = 'finished';

// AFTER
  if (t.config.format === 'bracket') {
    advanceBracketWinner(t.matches, m);
    if (t.matches.filter(mx => !mx.isBye).every(mx => mx.winner !== null)) {
      t.status = 'finished';
    }
  } else if (t.config.format === 'groups') {
    if (m.phase === 'group') {
      // Check if all group matches are done; if so, populate bracket
      if (isGroupPhaseComplete(t)) {
        finalizeGroupPhase(t);
      }
    } else if (m.phase === 'bracket') {
      // Advance winner in bracket
      advanceBracketWinner(t.matches, m);

      // Propagate loser to third-place match after semi-finals
      const totalBracketRounds = Math.log2(t.config.bracketSize);
      const isSemiFinal = m.round === totalBracketRounds - 2 && totalBracketRounds >= 2;
      if (isSemiFinal && t.config.thirdPlaceMatch) {
        const thirdMatch = t.matches.find(mx => mx.phase === 'bracket' && mx.isThirdPlace);
        if (thirdMatch) {
          const loserIdx = m.winner === 0 ? m.p2 : m.p1;
          if (thirdMatch.p1 === null) thirdMatch.p1 = loserIdx;
          else if (thirdMatch.p2 === null) thirdMatch.p2 = loserIdx;
        }
      }

      // Check if all bracket matches (including optional 3rd place) are done
      const bracketNonBye = t.matches.filter(mx => mx.phase === 'bracket' && !mx.isBye);
      if (bracketNonBye.every(mx => mx.winner !== null)) {
        t.status = 'finished';
      }
    }
  } else {
    // league
    if (t.matches.every(mx => mx.winner !== null)) t.status = 'finished';
  }
```

Note: `finalizeGroupPhase` is defined in `league.js` (loaded before `app.js`), so it's available globally. ✓

- [ ] **Step 2: Update `startTournamentMatch` live-standings visibility**

Find the line that sets `btn-live-standings` display:

```js
// BEFORE
document.getElementById('btn-live-standings').style.display =
  tournament.config.format === 'bracket' ? 'none' : '';

// AFTER
const hideLS = tournament.config.format === 'bracket' ||
               (tournament.config.format === 'groups' && m.phase === 'bracket');
document.getElementById('btn-live-standings').style.display = hideLS ? 'none' : '';
```

But `m` is already defined as `const m = tournament.matches[matchIndex]` earlier in the function, so this works.

- [ ] **Step 3: Update post-match navigation for groups format**

Find the `btn-new-match` click handler and the `btn-exit-confirm` handler. Both have:
```js
if (t.config.format !== 'bracket') {
  document.getElementById('tv-tab-matches').click();
}
```

Change to also click matches tab for groups:
```js
if (t.config.format !== 'bracket') {
  document.getElementById('tv-tab-matches').click();
}
// (no change needed — groups format is also not 'bracket', so matches tab is clicked) ✓
```

No change needed here — the existing condition already correctly clicks the matches tab for groups format.

- [ ] **Step 4: Update `btn-live-standings` click handler for groups**

Find the existing `btn-live-standings` click handler. It currently calls `computeLiveStandings` and renders the full league standings table. For groups, show the standings of the group the current match belongs to.

Find and update (the handler is in the `DOMContentLoaded` block):

```js
document.getElementById('btn-live-standings').addEventListener('click', () => {
  if (!match || !_activeTournament) return;

  const t     = _activeTournament;
  const ctx   = match.tournamentMatchContext;
  const modal = document.getElementById('modal-live-standings');
  const body  = document.getElementById('live-standings-body');

  if (t.config.format === 'groups' && ctx) {
    // Find current group match
    const currentMatch = t.matches[ctx.matchIndex];
    const gi = currentMatch ? currentMatch.groupIndex : null;

    if (gi !== undefined && gi !== null) {
      // Use group standings
      const liveData = {
        p1Idx:   ctx.p1Idx,
        p2Idx:   ctx.p2Idx,
        legsWon: match.legsWon,
        setsWon: match.setsWon,
        avgs:    [getMatchAverage(match.stats[0]), getMatchAverage(match.stats[1])],
      };
      const rows = computeLiveGroupStandings(t, gi, liveData);
      body.innerHTML = _renderGroupStandingsHTML(t, gi, rows);
      openModal('modal-live-standings');
      return;
    }
  }

  // Default: full league live standings
  const liveData = {
    p1Idx:   ctx ? ctx.p1Idx   : 0,
    p2Idx:   ctx ? ctx.p2Idx   : 1,
    legsWon: match.legsWon,
    setsWon: match.setsWon,
    avgs:    [getMatchAverage(match.stats[0]), getMatchAverage(match.stats[1])],
  };
  // … existing rendering code …
});
```

Add `computeLiveGroupStandings` and `_renderGroupStandingsHTML` to `league.js` (added in Task 11).

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: app.js integration for groups (match saving, bracket advancement, third-place)"
```

---

## Task 11: Live standings for groups

**Files:**
- Modify: `js/league.js`

- [ ] **Step 1: Add `computeLiveGroupStandings(tournament, groupIndex, liveData)`**

```js
function computeLiveGroupStandings(tournament, groupIndex, liveData) {
  // Start from saved standings, then apply in-progress match
  const rows = computeGroupStandings(tournament, groupIndex);

  const { p1Idx, p2Idx, legsWon, setsWon, avgs } = liveData;
  const useSets  = tournament.config.matchConfig.totalSets > 1;
  const score0   = useSets ? setsWon[0] : legsWon[0];
  const score1   = useSets ? setsWon[1] : legsWon[1];

  const rowByIdx = new Map(rows.map(r => [r.playerIndex, r]));
  const r1 = rowByIdx.get(p1Idx);
  const r2 = rowByIdx.get(p2Idx);

  if (r1) { r1.legsWon += legsWon[0]; r1.legsLost += legsWon[1]; }
  if (r2) { r2.legsWon += legsWon[1]; r2.legsLost += legsWon[0]; }

  if (avgs) {
    if (avgs[0] !== null && r1) { r1.avgSum += avgs[0]; r1.avgCount++; }
    if (avgs[1] !== null && r2) { r2.avgSum += avgs[1]; r2.avgCount++; }
  }

  if (score0 > score1 && r1 && r2) {
    r1.W++; r1.pts += tournament.config.winPoints;
    r2.L++; r2.pts += tournament.config.lossPoints;
  } else if (score1 > score0 && r1 && r2) {
    r2.W++; r2.pts += tournament.config.winPoints;
    r1.L++; r1.pts += tournament.config.lossPoints;
  }

  // Re-sort
  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.playerIndex - b.playerIndex;
  });

  return rows;
}
```

- [ ] **Step 2: Add `_renderGroupStandingsHTML(tournament, groupIndex, rows)`**

```js
function _renderGroupStandingsHTML(tournament, groupIndex, rows) {
  const group    = tournament.config.groups[groupIndex];
  const advCount = group.advanceCount;
  let html = `<div class="group-section-header" style="margin-top:0">Grupa ${group.name}</div>`;
  html += '<table class="standings-table" style="margin-bottom:0"><thead><tr>';
  html += '<th>#</th><th class="left">Gracz</th><th>M</th><th>W</th><th>L</th><th>Legi</th><th>Avg</th><th>Pkt</th>';
  html += '</tr></thead><tbody>';
  rows.forEach((row, i) => {
    const rank      = i + 1;
    const advancing = rank <= advCount;
    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '—';
    const legsStr   = row.M === 0 ? '—' : `${row.legsWon}‑${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';
    html += `<tr${advancing ? ' class="group-advancing"' : ''}>`;
    html += `<td class="pos-num">${rank}</td>`;
    html += `<td class="left player-name-cell">${advancing ? '<span class="adv-dot"></span>' : ''}${escapeHtml(row.name)}</td>`;
    html += `<td>${row.M}</td><td>${row.W}</td><td>${row.L}</td>`;
    html += `<td class="${legsClass}">${legsStr}</td>`;
    html += `<td class="avg-cell">${avg}</td>`;
    html += `<td class="pts-cell">${row.pts}</td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}
```

- [ ] **Step 3: Complete the live-standings handler in app.js**

The handler in Task 10 calls `_renderGroupStandingsHTML` which is now defined. However, the handler also needs to set the modal title. Find the existing live-standings handler and integrate:

```js
// In the groups branch of the btn-live-standings click handler (added in Task 10):
// Replace:
body.innerHTML = _renderGroupStandingsHTML(t, gi, rows);
// With:
document.getElementById('live-standings-title').textContent =
  'Tabela na żywo — Grupa ' + t.config.groups[gi].name;
body.innerHTML = _renderGroupStandingsHTML(t, gi, rows);
```

(Find the `live-standings-title` element id by searching `index.html` — if it doesn't exist, use the `<h3>` or whatever the modal uses for its title.)

- [ ] **Step 4: Verify full flow**

1. Create a 6-player, 2-group tournament (e.g., 501, best-of-3).
2. Play all 6 group matches (use the Mecze tab to find and click unplayed matches).
3. After the last group match, navigate back → Drabinka tab shows real player names instead of labels.
4. Mecze tab shows "Faza pucharowa" section with 2 bracket matches.
5. Play bracket matches → winner determined → tournament marked finished.
6. During group phase: in-game, click "📊 Tabela" → live group standings appear for the current group.

- [ ] **Step 5: Test third-place match (if configured)**

1. Create an 8-player, 4-group tournament with 2 advance and "Mecz o 3. miejsce" enabled.
2. Complete group phase → bracket appears with 4 R1 matches.
3. Play all R1 matches + both semi-finals → third-place match gets populated with the two losers.
4. Play third-place match → plays normally.
5. Play final → tournament finished.

- [ ] **Step 6: Commit**

```bash
git add js/league.js js/app.js
git commit -m "feat: live group standings and complete groups+bracket tournament flow"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| Max 16 players | Task 1 |
| Groups tile unlocked | Task 1 |
| Wizard step 3b (group count, advance, points, 3rd place) | Tasks 2–3 |
| Step 4 no BYE for groups | Task 4 |
| Group preview | Task 4 |
| createTournament groups branch | Task 5 |
| Round-robin per group, interleaved schedule | Task 5 |
| TBD bracket with seed labels | Tasks 5, 9 |
| computeGroupStandings | Task 6 |
| isGroupPhaseComplete | Task 6 |
| 3-tab tournament view | Task 7 |
| renderGroupsTab (standings + adv markers) | Task 8 |
| renderGroupMatchesTab (grouped by section) | Task 8 |
| Bracket tab (TBD labels → real names after finalize) | Task 9 |
| finalizeGroupPhase (football-style seeding) | Task 9 |
| saveTournamentMatchResult groups | Task 10 |
| Third-place match propagation | Task 10 |
| Tournament completion | Task 10 |
| Live group standings | Task 11 |

### Potential gaps

- **advanceCount validation per group**: groups with uneven sizes (e.g., 7 players, 2 groups → 4+3) should cap `advanceCount` to the smaller group size - 1. The `_updateAdvanceCountMax` uses `Math.floor(n/k)` which handles this conservatively. ✓
- **`renderBracketScreen` for groups bracketSize**: the function reads `config.bracketSize` which IS set in the groups config. ✓
- **`openTournamentStarterModal` for bracket matches**: it accesses `players[m.p1].name` — only called after `finalizeGroupPhase` fills in real indices. The `_buildGroupMatchCell` shows TBD card (non-clickable) until p1/p2 are set. ✓
- **`openTournamentMatchStats` for groups matches**: it accesses `players[m.p1].name` — always set for group matches. ✓
- **`computeLiveStandings` vs groups in app.js live-standings fallback**: the default branch still calls `computeLiveStandings` for league format — unchanged. ✓
- **`CHECKOUT_LABELS` usage in info bar**: for groups, using inline text instead of `CHECKOUT_LABELS` lookup. Acceptable for v1.
- **Tournament card display in list**: `buildTournamentCard` shows format name using `config.format` — for groups it will show "groups". This is acceptable (can be Polish-ized in a follow-up).

### Placeholder scan

No TODOs or TBD in code blocks. All function signatures are consistent across tasks. ✓

### Type consistency

- `computeGroupStandings` returns `rows[]` with `{playerIndex, name, M, W, L, legsWon, legsLost, avgSum, avgCount, pts}` — used correctly in `renderGroupsTab`, `computeLiveGroupStandings`, `_renderGroupStandingsHTML`, and `finalizeGroupPhase`. ✓
- `_generateBracketTBD` returns `{bracketSize, matches}` — destructured correctly in `createTournament`. ✓
- `m.phase` field is `'group'` or `'bracket'` — all filters use these values consistently. ✓
- `m.p1Label`, `m.p2Label` are set for bracket R1 matches — read in `_buildBracketCard` and `_buildGroupMatchCell`. ✓
