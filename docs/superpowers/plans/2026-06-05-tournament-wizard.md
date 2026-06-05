# Tournament Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-step wizard for creating a round-robin (liga) tournament, accessible from the home screen via the TURNIEJ button.

**Architecture:** Single `screen-tournament` HTML section with four `wizard-step` divs managed by a new `js/tournament.js` module. Navigation between steps is pure JS (show/hide). Tournament configuration accumulates in a `tournamentConfig` global object. The TURNIEJ button on the home screen is un-disabled and wired to `initTournamentWizard()`.

**Tech Stack:** Vanilla JS, HTML5, CSS3 — no build step. Test by opening `index.html` directly in a browser.

**Spec:** `docs/superpowers/specs/2026-06-05-tournament-wizard-design.md`

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `index.html` | Add `<section id="screen-tournament">` with all 4 steps; add `<script src="js/tournament.js">` between ui.js and app.js; un-disable TURNIEJ button |
| Create | `js/tournament.js` | `tournamentConfig`, `initTournamentWizard()`, `showWizardStep()`, all step event listeners, `renderStep4Players()`, `buildDoublesOptions()` |
| Modify | `js/ui.js` | Add `TOURNAMENT: 'tournament'` to `SCREENS` |
| Modify | `js/app.js` | Wire TURNIEJ home button to `showScreen(SCREENS.TOURNAMENT)` + `initTournamentWizard()` |
| Modify | `css/style.css` | Tournament wizard styles appended at end |

---

## Task 1: HTML Skeleton + Routing

**Files:**
- Modify: `index.html`
- Modify: `js/ui.js`
- Modify: `js/app.js`

- [ ] **Step 1: Add `TOURNAMENT` to SCREENS constant in `js/ui.js`**

```js
// js/ui.js — line 1
const SCREENS = { HOME: 'home', SETUP: 'setup', GAME: 'game', STATS: 'stats', PLAYERS: 'players', HISTORY: 'history', HISTORY_DETAIL: 'history-detail', TOURNAMENT: 'tournament' };
```

- [ ] **Step 2: Un-disable TURNIEJ button in `index.html`**

Find (in `screen-home`):
```html
<button id="btn-home-tournament" class="btn btn-home-tournament" disabled>TURNIEJ <span class="coming-soon">wkrótce</span></button>
```
Replace with:
```html
<button id="btn-home-tournament" class="btn btn-home-tournament">TURNIEJ</button>
```

- [ ] **Step 3: Remove `.coming-soon` rule — no longer needed**

In `css/style.css` find and delete these lines:
```css
.coming-soon {
  font-size: 0.72rem;
  font-weight: 400;
  color: #3a3a3a;
  letter-spacing: 0;
}
```

Also update `.btn-home-tournament` — it currently styles the disabled state as dark. Change it so it looks like a regular secondary button when enabled:

Find in `css/style.css`:
```css
.btn-home-tournament {
  width: 100%;
  padding: 16px;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: #444;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
```
Replace with:
```css
.btn-home-tournament {
  width: 100%;
  padding: 16px;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color .15s, color .15s;
}
.btn-home-tournament:hover { border-color: #555; color: var(--text); }
```

- [ ] **Step 4: Add `screen-tournament` HTML section to `index.html`**

Insert the following block immediately before `<!-- Scripts (order matters) -->`:

```html
<!-- ===== TOURNAMENT SCREEN ===== -->
<section id="screen-tournament" class="screen">
  <div class="tournament-card">

    <div class="wizard-dots">
      <span class="wdot" data-step="1"></span>
      <span class="wdot" data-step="2"></span>
      <span class="wdot" data-step="3"></span>
      <span class="wdot" data-step="4"></span>
    </div>

    <!-- ── Step 1: Number of players ── -->
    <div class="wizard-step" id="wstep-1">
      <div class="wizard-title">🎯 Nowy turniej</div>
      <div class="step-indicator">Krok 1 z 4</div>
      <label class="wlabel" for="t-num-players">Liczba graczy</label>
      <p class="step-hint">Minimum: 3 &nbsp;·&nbsp; Maksimum: 6</p>
      <input id="t-num-players" type="number" class="t-input-center" min="3" max="6" placeholder="np. 4">
      <span id="t-step1-error" class="t-error" hidden></span>
      <div class="wizard-nav">
        <button id="t-back-1" class="btn-wizard-back">&#8592; Powrót</button>
        <button id="t-next-1" class="btn-wizard-next">DALEJ &#8594;</button>
      </div>
    </div>

    <!-- ── Step 2: Format ── -->
    <div class="wizard-step" id="wstep-2">
      <div class="wizard-title">🎯 Nowy turniej</div>
      <div class="step-indicator">Krok 2 z 4</div>
      <label class="wlabel">Format turnieju</label>
      <div class="format-tile active" id="t-format-league" data-format="league">
        Liga (Round-Robin)
        <span class="format-tile-sub">każdy z każdym</span>
      </div>
      <div class="format-tile disabled" data-format="groups">
        Grupy + Drabinka
        <span class="format-tile-sub">wkrótce</span>
      </div>
      <div class="format-tile disabled" data-format="bracket">
        Drabinka
        <span class="format-tile-sub">wkrótce</span>
      </div>

      <div id="league-settings">
        <label class="wlabel" style="margin-top:4px">Rundy</label>
        <div class="btn-group" id="t-rounds-group">
          <button class="btn-seg active" data-rounds="single">Jedna runda</button>
          <button class="btn-seg" data-rounds="double">Dwie rundy</button>
        </div>
        <div class="form-row" style="margin-top:12px">
          <div class="form-group">
            <label for="t-win-pts">Pkt za wygraną</label>
            <input id="t-win-pts" type="number" min="0" value="2">
          </div>
          <div class="form-group">
            <label for="t-loss-pts">Pkt za przegraną</label>
            <input id="t-loss-pts" type="number" min="0" value="0">
          </div>
        </div>
      </div>

      <div class="wizard-nav">
        <button id="t-back-2" class="btn-wizard-back">&#8592; Wstecz</button>
        <button id="t-next-2" class="btn-wizard-next">DALEJ &#8594;</button>
      </div>
    </div>

    <!-- ── Step 3: Match settings ── -->
    <div class="wizard-step" id="wstep-3">
      <div class="wizard-title">🎯 Nowy turniej</div>
      <div class="step-indicator">Krok 3 z 4</div>
      <div class="form-row">
        <div class="form-group">
          <label for="t-variant">Wariant</label>
          <select id="t-variant">
            <option value="101">101</option>
            <option value="201">201</option>
            <option value="301">301</option>
            <option value="401">401</option>
            <option value="501" selected>501</option>
            <option value="601">601</option>
            <option value="701">701</option>
            <option value="801">801</option>
            <option value="901">901</option>
            <option value="1001">1001</option>
          </select>
        </div>
        <div class="form-group">
          <label for="t-sets">Liczba setów</label>
          <select id="t-sets">
            <option value="1" selected>1 set</option>
            <option value="2">2 sety</option>
            <option value="3">3 sety</option>
            <option value="4">4 sety</option>
            <option value="5">5 setów</option>
            <option value="6">6 setów</option>
            <option value="7">7 setów</option>
            <option value="8">8 setów</option>
            <option value="9">9 setów</option>
            <option value="10">10 setów</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="t-legs" id="t-lbl-legs">Liczba legów</label>
        <select id="t-legs">
          <option value="1">First to 1</option>
          <option value="2">First to 2</option>
          <option value="3" selected>First to 3</option>
          <option value="4">First to 4</option>
          <option value="5">First to 5</option>
          <option value="6">First to 6</option>
          <option value="7">First to 7</option>
          <option value="8">First to 8</option>
          <option value="9">First to 9</option>
          <option value="10">First to 10</option>
          <option value="11">First to 11</option>
          <option value="12">First to 12</option>
          <option value="13">First to 13</option>
          <option value="14">First to 14</option>
          <option value="15">First to 15</option>
          <option value="16">First to 16</option>
        </select>
      </div>
      <div class="form-group">
        <label for="t-in-mode">Tryb wejścia</label>
        <select id="t-in-mode">
          <option value="straight" selected>Straight-in (domyślny)</option>
          <option value="double">Double-in</option>
          <option value="master">Master-in</option>
        </select>
      </div>
      <div class="form-group">
        <label for="t-checkout">Tryb wyjścia</label>
        <select id="t-checkout">
          <option value="double" selected>Double-out (domyślny)</option>
          <option value="master">Master-out</option>
          <option value="straight">Straight-out</option>
        </select>
      </div>

      <div class="wizard-nav">
        <button id="t-back-3" class="btn-wizard-back">&#8592; Wstecz</button>
        <button id="t-next-3" class="btn-wizard-next">DALEJ &#8594;</button>
      </div>
    </div>

    <!-- ── Step 4: Players & seeding ── -->
    <div class="wizard-step" id="wstep-4">
      <div class="wizard-title">🎯 Nowy turniej</div>
      <div class="step-indicator">Krok 4 z 4</div>
      <label class="wlabel" id="t-players-label">Gracze</label>
      <div id="t-players-list"></div>
      <label class="wlabel" style="margin-top:12px">Rozstawienie</label>
      <div class="btn-group" id="t-seeding-group">
        <button class="btn-seg active" data-seeding="random">🎲 Losuj rozstawienie</button>
        <button class="btn-seg" data-seeding="ordered">↓ Użyj kolejności</button>
      </div>
      <button id="btn-create-tournament" class="btn-create-tournament" disabled>UTWÓRZ TURNIEJ</button>
      <div class="wizard-nav" style="margin-top:8px">
        <button id="t-back-4" class="btn-wizard-back">&#8592; Wstecz</button>
      </div>
    </div>

  </div>
</section>
```

- [ ] **Step 5: Add `tournament.js` script tag to `index.html`**

Find:
```html
<script src="js/ui.js"></script>
<script src="js/app.js"></script>
```
Replace with:
```html
<script src="js/ui.js"></script>
<script src="js/tournament.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 6: Wire TURNIEJ button in `js/app.js`**

Find the comment and listener block:
```js
  // Navigation: home → match setup
  document.getElementById('btn-home-match').addEventListener('click', () => {
    showScreen(SCREENS.SETUP);
  });
```
Add immediately after it:
```js
  // Navigation: home → tournament wizard
  document.getElementById('btn-home-tournament').addEventListener('click', () => {
    initTournamentWizard();
    showScreen(SCREENS.TOURNAMENT);
  });
```

- [ ] **Step 7: Verify in browser**

Open `index.html`. Click **TURNIEJ** on the home screen. A card with 4 progress dots and the step 1 content should appear. The card is currently unstyled — that's expected (CSS comes in Task 5).

---

## Task 2: `tournament.js` — Navigation Engine

**Files:**
- Create: `js/tournament.js`

- [ ] **Step 1: Create `js/tournament.js` with the full navigation engine**

```js
// Tournament wizard — state and step navigation

let tournamentConfig = null;
let _wizardStep = 1;

function initTournamentWizard() {
  tournamentConfig = {
    numPlayers: null,
    format: 'league',
    leagueRounds: 'single',
    winPoints: 2,
    lossPoints: 0,
    matchConfig: {
      variant: 501,
      totalSets: 1,
      totalLegs: 3,
      inMode: 'straight',
      checkoutMode: 'double',
    },
    players: [],
    seeding: 'random',
  };
  // Reset step 1 input and error
  const inp = document.getElementById('t-num-players');
  if (inp) inp.value = '';
  const err = document.getElementById('t-step1-error');
  if (err) err.hidden = true;
  // Reset step 2 rounds to default (single)
  document.querySelectorAll('#t-rounds-group .btn-seg').forEach(b => {
    b.classList.toggle('active', b.dataset.rounds === 'single');
  });
  document.getElementById('t-win-pts').value = 2;
  document.getElementById('t-loss-pts').value = 0;
  // Reset step 4 seeding to default (random)
  document.querySelectorAll('#t-seeding-group .btn-seg').forEach(b => {
    b.classList.toggle('active', b.dataset.seeding === 'random');
  });
  showWizardStep(1);
}

function showWizardStep(n) {
  _wizardStep = n;
  document.querySelectorAll('.wizard-step').forEach(s => { s.style.display = 'none'; });
  const step = document.getElementById('wstep-' + n);
  if (step) step.style.display = 'flex';
  document.querySelectorAll('.wdot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.className = 'wdot' + (s < n ? ' wdot-done' : s === n ? ' wdot-active' : '');
  });
}

// ── Step 1 navigation ──
document.getElementById('t-back-1').addEventListener('click', () => {
  tournamentConfig = null;
  showScreen(SCREENS.HOME);
});

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

// ── Step 2 navigation ──
document.getElementById('t-back-2').addEventListener('click', () => {
  showWizardStep(1);
});

document.getElementById('t-next-2').addEventListener('click', () => {
  const activeRounds = document.querySelector('#t-rounds-group .btn-seg.active');
  tournamentConfig.leagueRounds = activeRounds ? activeRounds.dataset.rounds : 'single';
  tournamentConfig.winPoints  = Math.max(0, parseInt(document.getElementById('t-win-pts').value)  || 0);
  tournamentConfig.lossPoints = Math.max(0, parseInt(document.getElementById('t-loss-pts').value) || 0);
  showWizardStep(3);
});

// ── Step 2: rounds segmented buttons ──
document.querySelectorAll('#t-rounds-group .btn-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#t-rounds-group .btn-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Step 3 navigation ──
document.getElementById('t-back-3').addEventListener('click', () => {
  showWizardStep(2);
});

document.getElementById('t-next-3').addEventListener('click', () => {
  tournamentConfig.matchConfig = {
    variant:      parseInt(document.getElementById('t-variant').value),
    totalSets:    parseInt(document.getElementById('t-sets').value),
    totalLegs:    parseInt(document.getElementById('t-legs').value),
    inMode:       document.getElementById('t-in-mode').value,
    checkoutMode: document.getElementById('t-checkout').value,
  };
  // Sync label "Legi na seta" when totalSets > 1
  const setsVal = tournamentConfig.matchConfig.totalSets;
  document.getElementById('t-lbl-legs').textContent =
    setsVal > 1 ? 'Legi na seta' : 'Liczba legów';
  renderStep4Players();
  showWizardStep(4);
});

// ── Step 3: dynamic legs label (mirrors setup screen behaviour) ──
document.getElementById('t-sets').addEventListener('change', () => {
  const v = parseInt(document.getElementById('t-sets').value);
  document.getElementById('t-lbl-legs').textContent = v > 1 ? 'Legi na seta' : 'Liczba legów';
});

// ── Step 4 navigation ──
document.getElementById('t-back-4').addEventListener('click', () => {
  showWizardStep(3);
});

// ── Step 4: seeding segmented buttons ──
document.querySelectorAll('#t-seeding-group .btn-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#t-seeding-group .btn-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tournamentConfig.seeding = btn.dataset.seeding;
  });
});

// ── Step 4: build player blocks dynamically ──
function buildDoublesOptions(placeholder) {
  let o = `<option value="">${placeholder}</option>`;
  for (let i = 1; i <= 20; i++) o += `<option value="${i * 2}">D${i}</option>`;
  o += '<option value="50">Bull</option>';
  return o;
}

function renderStep4Players() {
  const n = tournamentConfig.numPlayers;
  document.getElementById('t-players-label').textContent = `Gracze (${n})`;
  const list = document.getElementById('t-players-list');
  list.innerHTML = '';
  const d1opts = buildDoublesOptions('1° —');
  const d2opts = buildDoublesOptions('2° —');
  for (let i = 1; i <= n; i++) {
    const block = document.createElement('div');
    block.className = 'player-block';
    block.innerHTML = `
      <div class="player-block-label">Gracz ${i}</div>
      <input type="text" id="t-pname-${i}" class="player-name-input"
             placeholder="Imię gracza" maxlength="20"
             list="players-datalist" autocomplete="off">
      <div class="doubles-row">
        <div>
          <div class="doubles-sublabel">Podwójna 1.</div>
          <select id="t-pd1-${i}">${d1opts}</select>
        </div>
        <div>
          <div class="doubles-sublabel">Podwójna 2.</div>
          <select id="t-pd2-${i}">${d2opts}</select>
        </div>
      </div>
    `;
    list.appendChild(block);
  }
}
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Click TURNIEJ → step 1 appears. Enter `4` → DALEJ → step 2. Check dots: dot 1 dark-red, dot 2 red. Navigate back → step 1 still shows `4`. Navigate to step 4 → player list div is empty (will be filled next). No console errors.

---

## Task 3: Step 3 — Dynamic Legs Label Sync

> Step 3 match settings are fully functional from Task 2. This task adds one quality-of-life detail: the `t-sets` change listener that updates the legs label (already included in `tournament.js` above). Verify it works.

- [ ] **Step 1: Verify step 3 label sync**

Open `index.html`. Navigate to step 3. Change "Liczba setów" to "3 sety" — the label "Liczba legów" should change to "Legi na seta". Change back to "1 set" — label returns to "Liczba legów".

---

## Task 4: CSS — Tournament Wizard Styles

**Files:**
- Modify: `css/style.css` (append at end)

- [ ] **Step 1: Append tournament wizard styles to `css/style.css`**

```css
/* ===== TOURNAMENT WIZARD ===== */
#screen-tournament {
  justify-content: center;
  align-items: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.tournament-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 28px 24px 32px;
  width: 100%;
  max-width: 420px;
  border: 1px solid var(--border);
}

/* Progress dots */
.wizard-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
}

.wdot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2a2a2a;
  transition: background .2s;
}
.wdot.wdot-done   { background: #4a1a1f; }
.wdot.wdot-active { background: var(--accent); }

/* Step container */
.wizard-step {
  display: none;
  flex-direction: column;
  gap: 10px;
}

.wizard-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  text-align: center;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.step-indicator {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 4px;
}

.wlabel {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.step-hint {
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
}

/* Step 1: big centered number input */
.t-input-center {
  width: 100%;
  padding: 14px;
  text-align: center;
  font-size: 1.8rem;
  font-weight: 700;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  outline: none;
  -moz-appearance: textfield;
}
.t-input-center::-webkit-inner-spin-button,
.t-input-center::-webkit-outer-spin-button { -webkit-appearance: none; }
.t-input-center:focus { border-color: var(--accent); }

.t-error {
  font-size: 0.82rem;
  color: var(--accent);
  text-align: center;
}

/* Wizard nav buttons */
.wizard-nav {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-wizard-back {
  flex: 1;
  padding: 13px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: border-color .15s, color .15s;
}
.btn-wizard-back:hover { color: var(--text); border-color: #555; }

.btn-wizard-next {
  flex: 2;
  padding: 13px;
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  -webkit-tap-highlight-color: transparent;
}
.btn-wizard-next:active { transform: scale(0.97); }

/* Step 2: format tiles */
.format-tile {
  padding: 12px 16px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: border-color .15s, background .15s;
}
.format-tile.active {
  border-color: var(--accent);
  background: #1f0c0e;
  color: var(--accent);
}
.format-tile.disabled {
  color: #444;
  border-color: #222;
  background: #111;
  cursor: not-allowed;
}
.format-tile-sub {
  font-size: 0.72rem;
  font-weight: 400;
  color: #555;
}
.format-tile.active .format-tile-sub { color: #9a4050; }
.format-tile.disabled .format-tile-sub { color: #2a2a2a; }

/* Step 4: player blocks */
.player-block {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
}

.player-block-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.player-name-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.95rem;
  outline: none;
  transition: border-color .2s;
}
.player-name-input:focus { border-color: var(--accent); }

.doubles-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.doubles-sublabel {
  font-size: 0.68rem;
  color: #555;
  margin-bottom: 3px;
}

.player-block select {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.8rem;
  outline: none;
}
.player-block select:focus { border-color: var(--accent); }
.player-block select option { background: var(--surface2); }

/* Step 4: create button (disabled) */
.btn-create-tournament {
  width: 100%;
  padding: 15px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: #444;
  font-size: 1rem;
  font-weight: 700;
  cursor: not-allowed;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* Step 4: overflow scroll on small screens */
@media (max-height: 700px) {
  #screen-tournament { align-items: flex-start; }
  .tournament-card { margin: 0 auto; }
}
```

- [ ] **Step 2: Verify in browser**

Open `index.html`. Navigate through all 4 wizard steps and confirm:
- Step 1: large centered number input, grey hint text, error in red when out of range
- Step 2: Liga tile red-bordered and selected, other tiles dark; Jedna runda active (red), Dwie rundy plain; win/loss points inputs visible
- Step 3: all selects styled dark theme, defaults 501 / 1 set / First to 3 / Straight-in / Double-out
- Step 4: 4 player blocks (if step 1 = 4), each with name input + 2 double selects; Losuj rozstawienie highlighted red; UTWÓRZ TURNIEJ grey/disabled

---

## Task 5: Step 4 — Scroll and mobile layout

- [ ] **Step 1: Verify step 4 on a narrow / short viewport**

Open DevTools, set viewport to 390×844 (iPhone 14). Navigate to step 4 with 6 players. All 6 player blocks should be scrollable. The UTWÓRZ TURNIEJ button and ← Wstecz button must be reachable by scrolling.

If player blocks overflow and buttons are cut off, add to `css/style.css`:

```css
/* Already handled by overflow-y: auto on #screen-tournament above.
   If the tournament-card itself clips, add: */
#screen-tournament {
  align-items: flex-start;
}
.tournament-card {
  margin: 0 auto;
}
```

These rules are already inside the `@media (max-height: 700px)` block added in Task 4 — no change needed if the above works.

---

## Self-Review Checklist

Run through this mentally after Task 4 and fix any issues found:

- [ ] Step 1 back → home and `tournamentConfig = null` ✓ (in `t-back-1` listener)
- [ ] Step 1 DALEJ only if 3–6 ✓ (validation in `t-next-1`)
- [ ] Step 2 defaults: Liga selected, Jedna runda active, 2/0 points ✓ (in `initTournamentWizard`)
- [ ] Step 2 DALEJ saves leagueRounds + winPoints + lossPoints ✓ (in `t-next-2`)
- [ ] Step 3 saves matchConfig on DALEJ ✓ (in `t-next-3`)
- [ ] Step 4 renderStep4Players() called before showWizardStep(4) ✓
- [ ] Doubles option values match existing players.js format (`2`, `4`, …`40`, `50`) ✓ (`i * 2`)
- [ ] `players-datalist` reused from main page ✓ (same `list="players-datalist"` attribute)
- [ ] UTWÓRZ TURNIEJ stays disabled ✓ (`disabled` attribute, no enable logic added)
- [ ] TURNIEJ button on home screen is no longer disabled ✓ (Task 1 Step 2)
