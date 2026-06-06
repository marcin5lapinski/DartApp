# Bracket Byes Even Distribution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "all byes on top" bracket generation with an interleaving algorithm that spreads byes evenly, and expose bye assignment to the user via BYE toggle buttons in wizard step 4.

**Architecture:** Three coordinated changes — (1) CSS for new toggle/counter elements, (2) wizard step 4 UI (suggestion, toggles, counter, validation), (3) rewritten `generateBracket` that interleaves byes regardless of which players have them. The bye flag flows: wizard → `_getStep4Values()` → Fisher-Yates shuffle → `generateBracket()` → stripped before storing in `tournament.players`.

**Tech Stack:** Vanilla JS, CSS custom properties, no build step. Open `index.html` directly in browser to test.

---

## File Map

| File | What changes |
|------|-------------|
| `css/style.css` | Add `.bye-toggle`, `.bye-toggle.active`, `.bye-toggle:disabled`, `.bye-counter`, `.bye-counter.ok`, `.bye-counter.warn` after the existing `.btn-create-tournament` block (~line 1737) |
| `js/tournament.js` | Add `_computeByeSuggestion()`; update `renderStep4Players()`, `_getStep4Values()`, `validateStep4()` |
| `js/league.js` | Rewrite `generateBracket(players)` signature + body; update `createTournament()` call + strip `bye` |

`index.html` — no changes needed.

---

## Task 1: CSS — BYE toggle and bye counter

**Files:**
- Modify: `css/style.css` after line 1737 (after `.btn-create-tournament:not([disabled]):active`)

- [ ] **Step 1: Add CSS block**

In `css/style.css`, insert after `.btn-create-tournament:not([disabled]):active { transform: scale(0.97); }`:

```css
/* Step 4: BYE toggle button */
.bye-toggle {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 5px;
  padding: 3px 9px;
  border: 1px solid #444;
  background: #111;
  color: #666;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}
.bye-toggle.active {
  border-color: var(--accent);
  background: #2a0a0d;
  color: var(--accent);
}
.bye-toggle:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Step 4: bye counter bar */
.bye-counter {
  text-align: center;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 8px;
  margin-bottom: 10px;
}
.bye-counter.ok   { background: #0e1f12; border: 1px solid var(--green); color: var(--green); }
.bye-counter.warn { background: #1f0a0c; border: 1px solid var(--accent); color: var(--accent); }

/* Step 4: player block with active bye */
.player-block.has-bye {
  border-color: var(--accent);
  background: #1a0a0c;
}
.player-block.has-bye .player-block-label { color: var(--accent); }

/* Step 4: bye info note */
.bye-note {
  font-size: 0.75rem;
  color: #666;
  margin: 6px 0 4px;
  padding: 5px 10px;
  border-left: 2px solid #333;
  line-height: 1.5;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "style: add BYE toggle, bye-counter, has-bye player block styles"
```

---

## Task 2: `_computeByeSuggestion(numPlayers)` in tournament.js

**Files:**
- Modify: `js/tournament.js` — add function before `renderStep4Players`

This pure function returns a `boolean[]` of length `numPlayers` where `true` means "suggest this player gets a bye". Uses the same interleaving formula as `generateBracket`.

- [ ] **Step 1: Add the function**

In `js/tournament.js`, insert before `function renderStep4Players(savedValues)`:

```javascript
function _computeByeSuggestion(numPlayers) {
  const B = nextPowerOf2(numPlayers);
  const numByes = B - numPlayers;
  if (numByes === 0) return new Array(numPlayers).fill(false);
  const r1Slots = B / 2;
  const numReal = numPlayers - r1Slots;
  const realSlotSet = new Set();
  for (let i = 0; i < numReal; i++) {
    realSlotSet.add(Math.floor(i * r1Slots / numReal));
  }
  const flags = [];
  for (let slot = 0; slot < r1Slots; slot++) {
    if (realSlotSet.has(slot)) {
      flags.push(false);
      flags.push(false);
    } else {
      flags.push(true);
    }
  }
  return flags; // length === numPlayers
}
```

- [ ] **Step 2: Verify in browser console**

Open `index.html` in browser. In DevTools console run:

```javascript
// N=10: expect [false,false,true,true,true,false,false,true,true,true]
console.log(_computeByeSuggestion(10));

// N=6: expect [false,false,true,false,false,true]
console.log(_computeByeSuggestion(6));

// N=4: expect [false,false,false,false]
console.log(_computeByeSuggestion(4));

// N=7: expect [false,false,false,false,false,false,true]
console.log(_computeByeSuggestion(7));
```

- [ ] **Step 3: Commit**

```bash
git add js/tournament.js
git commit -m "feat: add _computeByeSuggestion interleaving formula"
```

---

## Task 3: Update `renderStep4Players()` — BYE toggles, counter, note

**Files:**
- Modify: `js/tournament.js` — `renderStep4Players` function

The updated function:
- Computes suggested bye flags (or reads from `savedValues`)
- Renders a counter bar above the list (bracket only, numByes > 0)
- Adds a BYE toggle button to each player block
- Adds an info note after the seeding group

- [ ] **Step 1: Replace `renderStep4Players` with the updated version**

Replace the entire `function renderStep4Players(savedValues) { ... }` block with:

```javascript
function renderStep4Players(savedValues) {
  const n = tournamentConfig.numPlayers;
  const isBracket = tournamentConfig.format === 'bracket';
  const B = nextPowerOf2(n);
  const numByes = B - n;
  const numRounds = Math.log2(B);
  document.getElementById('t-players-label').textContent = `Gracze (${n})`;

  // ── Bye counter bar (bracket only, non-zero byes) ──
  let counterEl = document.getElementById('t-bye-counter');
  if (!counterEl) {
    counterEl = document.createElement('div');
    counterEl.id = 't-bye-counter';
    document.getElementById('t-players-list').before(counterEl);
  }
  counterEl.style.display = (isBracket && numByes > 0) ? '' : 'none';

  // ── Player blocks ──
  const suggestedByes = savedValues
    ? savedValues.map(v => v.bye || false)
    : _computeByeSuggestion(n);

  const list = document.getElementById('t-players-list');
  list.innerHTML = '';
  const d1opts = buildDoublesOptions('1° —');
  const d2opts = buildDoublesOptions('2° —');

  for (let i = 1; i <= n; i++) {
    const hasBye = isBracket && suggestedByes[i - 1];
    const block = document.createElement('div');
    block.className = 'player-block' + (hasBye ? ' has-bye' : '');

    const byeBtn = isBracket
      ? `<button type="button" class="bye-toggle${hasBye ? ' active' : ''}"
              data-idx="${i - 1}"${numByes === 0 ? ' disabled' : ''}>
           ${hasBye ? 'BYE ✓' : 'BYE'}
         </button>`
      : '';

    block.innerHTML = `
      <div class="player-block-top">
        <div class="player-block-label">Gracz ${i}</div>
        <span style="display:flex;align-items:center;gap:8px">
          ${byeBtn}
          <span class="drag-handle" title="Przeciągnij aby zmienić kolejność">⠿</span>
        </span>
      </div>
      <input type="text" id="t-pname-${i}" class="player-name-input"
             placeholder="Imię gracza" maxlength="20"
             list="t-datalist-${i}" autocomplete="off">
      <datalist id="t-datalist-${i}"></datalist>
      <div class="doubles-row">
        <div>
          <div class="doubles-sublabel">Ulub. podwójna 1.</div>
          <select id="t-pd1-${i}">${d1opts}</select>
        </div>
        <div>
          <div class="doubles-sublabel">Ulub. podwójna 2.</div>
          <select id="t-pd2-${i}">${d2opts}</select>
        </div>
      </div>
    `;
    list.appendChild(block);

    if (savedValues && savedValues[i - 1]) {
      const v = savedValues[i - 1];
      document.getElementById('t-pname-' + i).value = v.name;
      document.getElementById('t-pd1-' + i).value   = v.d1;
      document.getElementById('t-pd2-' + i).value   = v.d2;
    }

    document.getElementById('t-pname-' + i).addEventListener('input', function() {
      const found = loadPlayers().find(p => p.name === this.value);
      if (found) {
        document.getElementById('t-pd1-' + i).value = found.primaryDouble  || '';
        document.getElementById('t-pd2-' + i).value = found.secondaryDouble || '';
      }
      _updateStep4Datalists();
      validateStep4();
    });
  }

  // BYE toggle click listeners
  if (isBracket && numByes > 0) {
    list.querySelectorAll('.bye-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const block = btn.closest('.player-block');
        const nowActive = !btn.classList.contains('active');
        btn.classList.toggle('active', nowActive);
        btn.textContent = nowActive ? 'BYE ✓' : 'BYE';
        block.classList.toggle('has-bye', nowActive);
        block.querySelector('.player-block-label').style.color = nowActive ? 'var(--accent)' : '';
        _updateByeCounter(n, numByes);
        validateStep4();
      });
    });
    _updateByeCounter(n, numByes);
  }

  // ── Info note (bracket only) ──
  let noteEl = document.getElementById('t-bye-note');
  if (!noteEl) {
    noteEl = document.createElement('p');
    noteEl.id = 't-bye-note';
    noteEl.className = 'bye-note';
    document.getElementById('t-seeding-group').after(noteEl);
  }
  if (isBracket && numByes > 0) {
    const roundName = computeRoundName(1, numRounds);
    noteEl.textContent = `ℹ️ Wolny los = gracz zaczyna od ${roundName}. Sugestia rozłożona równomiernie.`;
    noteEl.style.display = '';
  } else {
    noteEl.style.display = 'none';
  }

  _initStep4DragDrop(list);
  _updateStep4Datalists();
  validateStep4();
}
```

- [ ] **Step 2: Add `_updateByeCounter` helper** — insert right before `renderStep4Players`:

```javascript
function _updateByeCounter(n, numByes) {
  const counterEl = document.getElementById('t-bye-counter');
  if (!counterEl) return;
  const count = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
  if (count === numByes) {
    counterEl.className = 'bye-counter ok';
    counterEl.textContent = `Wolne losy: ${count} / ${numByes} ✓`;
  } else {
    counterEl.className = 'bye-counter warn';
    counterEl.textContent = `Wolne losy: ${count} / ${numByes} — zaznacz dokładnie ${numByes}`;
  }
}
```

- [ ] **Step 3: Verify in browser**

Open `index.html` → Turniej → Nowy turniej. Przejdź przez wizard:
- Krok 1: wpisz nazwę, ustaw 10 graczy
- Krok 2: wybierz **Drabinka**
- Krok 3: zatwierdź ustawienia meczu
- Krok 4: sprawdź czy gracze 3,4,5,8,9,10 mają aktywne przyciski BYE, licznik pokazuje `6 / 6 ✓`

Następnie wróć i ustaw 6 graczy (bracket): gracze 3 i 6 powinni mieć BYE, licznik `2 / 2 ✓`.

Wróć i ustaw 8 graczy (bracket): wszystkie przyciski BYE wyłączone, licznik ukryty.

Wróć i wybierz format **Liga**: przyciski BYE w ogóle nie widoczne.

- [ ] **Step 4: Commit**

```bash
git add js/tournament.js
git commit -m "feat: BYE toggle buttons and counter in wizard step 4"
```

---

## Task 4: Update `_getStep4Values()` to include `bye` flag

**Files:**
- Modify: `js/tournament.js` — `_getStep4Values` function

- [ ] **Step 1: Update `_getStep4Values`**

Replace the existing function:

```javascript
function _getStep4Values() {
  return Array.from(document.querySelectorAll('#t-players-list .player-block')).map(block => ({
    name: block.querySelector('.player-name-input').value,
    d1:   block.querySelector('[id^="t-pd1-"]').value,
    d2:   block.querySelector('[id^="t-pd2-"]').value,
    bye:  block.querySelector('.bye-toggle')?.classList.contains('active') || false,
  }));
}
```

- [ ] **Step 2: Verify drag & drop preserves bye**

In browser, step 4 wizard (N=10, bracket): drag gracz 3 (BYE ✓) na pozycję 8. Po upuszczeniu gracz nadal powinien mieć BYE ✓ na nowej pozycji, a licznik nie powinien się zmienić.

- [ ] **Step 3: Commit**

```bash
git add js/tournament.js
git commit -m "feat: include bye flag in _getStep4Values for drag-drop preservation"
```

---

## Task 5: Update `btn-create-tournament` handler to pass `bye` flags

**Files:**
- Modify: `js/tournament.js` — `btn-create-tournament` click listener

The existing handler builds `players` manually without reading the `bye` toggle. It must include `bye` so the flag reaches `generateBracket` through `createTournament`.

- [ ] **Step 1: Update the click handler**

Replace the entire `document.getElementById('btn-create-tournament').addEventListener('click', () => { ... });` block with:

```javascript
document.getElementById('btn-create-tournament').addEventListener('click', () => {
  const vals = _getStep4Values();
  vals.forEach(v => { if (v.name.trim()) createPlayer(v.name.trim(), null, null); });

  let players = vals.map(v => ({
    name:            v.name.trim(),
    primaryDouble:   parseInt(v.d1) || null,
    secondaryDouble: parseInt(v.d2) || null,
    bye:             v.bye || false,
  }));
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

- [ ] **Step 2: Commit**

```bash
git add js/tournament.js
git commit -m "feat: read bye flags in btn-create-tournament handler"
```

---

## Task 7: Update `validateStep4()` for bye count

**Files:**
- Modify: `js/tournament.js` — `validateStep4` function

Dodaje sprawdzenie liczby zaznaczonych bye'ów (tylko format bracket, numByes > 0).

- [ ] **Step 1: Update `validateStep4`**

Replace the entire `function validateStep4() { ... }` block with:

```javascript
function validateStep4() {
  const n = tournamentConfig ? tournamentConfig.numPlayers : 0;
  const isBracket = tournamentConfig && tournamentConfig.format === 'bracket';
  const errEl = document.getElementById('t-step4-error');
  const btn   = document.getElementById('btn-create-tournament');

  const inputs = Array.from({ length: n }, (_, i) => document.getElementById('t-pname-' + (i + 1)));
  const names  = inputs.map(inp => inp?.value.trim() || '');
  const allFilled = n > 0 && names.every(name => name !== '');

  // Duplicate check (case-insensitive)
  const countByLower = new Map();
  for (const name of names) {
    if (!name) continue;
    const key = name.toLowerCase();
    countByLower.set(key, (countByLower.get(key) || 0) + 1);
  }
  const dupLowers = new Set([...countByLower.entries()].filter(([, c]) => c > 1).map(([k]) => k));

  inputs.forEach(inp => {
    if (!inp) return;
    inp.classList.toggle('inp-duplicate', !!inp.value.trim() && dupLowers.has(inp.value.trim().toLowerCase()));
  });

  if (dupLowers.size > 0) {
    const seen = new Set();
    const dupLabels = names.filter(name => {
      if (!name || !dupLowers.has(name.toLowerCase())) return false;
      if (seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
    errEl.textContent = 'Zduplikowane nazwy graczy: ' + dupLabels.map(n => '"' + n + '"').join(', ');
    errEl.hidden = false;
    btn.disabled = true;
    return;
  }

  // Bye count check (bracket only)
  if (isBracket) {
    const B = nextPowerOf2(n);
    const numByes = B - n;
    if (numByes > 0) {
      const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
      if (byeCount !== numByes) {
        errEl.hidden = true;
        btn.disabled = true;
        return;
      }
    }
  }

  errEl.hidden = true;
  btn.disabled = !allFilled;
}
```

- [ ] **Step 2: Verify in browser**

Krok 4 (N=10, bracket): odznacz jeden BYE → przycisk "UTWÓRZ TURNIEJ" blokuje się. Zaznacz z powrotem → odblokowuje się. Sprawdź też N=8 (bracket) — przycisk odblokowuje się bez warunku bye.

- [ ] **Step 3: Commit**

```bash
git add js/tournament.js
git commit -m "feat: validate bye count in validateStep4 for bracket format"
```

---

## Task 8: Rewrite `generateBracket(players)` with interleaving

**Files:**
- Modify: `js/league.js` — `generateBracket` function and `createTournament` call site

To jest kluczowa zmiana: nowy algorytm rozdziela graczy na `byePlayers` i `realPlayers` i interleave'uje je równomiernie.

- [ ] **Step 1: Replace `generateBracket` in `league.js`**

Replace the entire `function generateBracket(numPlayers, players) { ... }` block with:

```javascript
function generateBracket(players) {
  const numPlayers = players.length;
  const B         = nextPowerOf2(numPlayers);
  const numRounds = Math.log2(B);
  const r1Slots   = B / 2;
  const numReal   = numPlayers - r1Slots;
  const matches   = [];

  // Determine which R1 slots are "real matches" using interleaving formula
  const realSlotSet = new Set();
  for (let i = 0; i < numReal; i++) {
    realSlotSet.add(Math.floor(i * r1Slots / numReal));
  }

  // Split players into bye and real groups (preserve seeding order within each group)
  const byePlayers  = players.map((p, i) => ({ ...p, origIdx: i })).filter(p => p.bye);
  const realPlayers = players.map((p, i) => ({ ...p, origIdx: i })).filter(p => !p.bye);
  let byePtr = 0, realPtr = 0;

  // Round 0: interleaved bye and real slots
  for (let slot = 0; slot < r1Slots; slot++) {
    if (realSlotSet.has(slot)) {
      const p1i = realPlayers[realPtr++].origIdx;
      const p2i = realPlayers[realPtr++].origIdx;
      matches.push({
        round: 0, slot, isBye: false,
        p1: p1i, p2: p2i, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    } else {
      const pi = byePlayers[byePtr++].origIdx;
      matches.push({
        round: 0, slot, isBye: true,
        p1: pi, p2: null, winner: 0,
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

- [ ] **Step 2: Update `createTournament` call site and strip `bye`**

In `createTournament`, find the `matches:` line for bracket and update it. Also strip `bye` from players before storing. Replace the relevant section:

```javascript
// Old:
//   matches: isBracket
//     ? generateBracket(players.length, players)
//     : generateSchedule(players.length, config.leagueRounds),

// New — strip bye flag, pass original array (with bye) to generateBracket:
const cleanPlayers = isBracket
  ? players.map(({ bye, ...rest }) => rest)
  : players;

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
      : { leagueRounds: config.leagueRounds, winPoints: config.winPoints, lossPoints: config.lossPoints }),
    matchConfig: { ...config.matchConfig },
  },
  players: cleanPlayers,
  matches: isBracket
    ? generateBracket(players)
    : generateSchedule(players.length, config.leagueRounds),
};
```

- [ ] **Step 3: Commit**

```bash
git add js/league.js
git commit -m "feat: rewrite generateBracket with interleaving — even bye distribution"
```

---

## Task 9: End-to-end manual testing

Open `index.html` in browser and run all scenarios below. For each: Turniej → Nowy turniej → uzupełnij kroki 1-4 → UTWÓRZ TURNIEJ → sprawdź drabinkę.

- [ ] **Scenario A — N=10, bracket**

Krok 4: gracze 3,4,5,8,9,10 mają BYE ✓, licznik `6 / 6 ✓`. Utwórz turniej.

Drabinka powinna wyglądać:
```
Slot 0: Gracz1 vs Gracz2     (1/8 finału, górna połowa)
Slot 1: Gracz3 BYE           → ćwierćfinał
Slot 2: Gracz4 BYE           → ćwierćfinał
Slot 3: Gracz5 BYE           → ćwierćfinał
Slot 4: Gracz6 vs Gracz7     (1/8 finału, dolna połowa)
Slot 5: Gracz8 BYE           → ćwierćfinał
Slot 6: Gracz9 BYE           → ćwierćfinał
Slot 7: Gracz10 BYE          → ćwierćfinał
```
Sprawdź wizualnie w drabince: górna i dolna połowa każda ma po 1 meczu 1/8 i 3 bye'y.

- [ ] **Scenario B — N=6, bracket**

Krok 4: gracze 3 i 6 mają BYE ✓, licznik `2 / 2 ✓`. Utwórz.

Drabinka:
```
Slot 0: Gracz1 vs Gracz2
Slot 1: Gracz3 BYE
Slot 2: Gracz4 vs Gracz5
Slot 3: Gracz6 BYE
```
Górna i dolna ćwiartka każda ma 1 mecz + 1 bye.

- [ ] **Scenario C — N=4, bracket**

Krok 4: żadnych toggleów BYE. Licznik ukryty. Przycisk odblokowuje się po wypełnieniu imion.

Drabinka: 2 mecze bez bye'ów.

- [ ] **Scenario D — N=10, liga**

Krok 4: brak toggleów BYE. Harmonogram round-robin tworzy się normalnie.

- [ ] **Scenario E — drag & drop z bye (N=10, bracket)**

Krok 4: odznacz BYE na graczu 3 (teraz 5/6 warn). Przeciągnij gracza 8 (BYE ✓) na pozycję 1. Po upuszczeniu gracz 8 nadal ma BYE ✓ na nowej pozycji, licznik się nie zmienił (nadal 5/6 lub właściwa liczba).

- [ ] **Scenario F — ręczna zmiana bye (N=10, bracket)**

Krok 4: odznacz BYE na graczu 3, zaznacz BYE na graczu 1. Licznik `6 / 6 ✓`. Utwórz turniej.

Drabinka: gracz 1 i gracz 6 trafiają do "bye slots" (bo `byePlayers = [G1, G4, G5, G8, G9, G10]`), gracze 2,3,7 i jeden inny trafiają do "real slots". Byes rozmieszczone równomiernie przez algorytm.

- [ ] **Final commit after all scenarios pass**

```bash
git add -A
git commit -m "test: manual e2e verification of bracket bye distribution"
```
