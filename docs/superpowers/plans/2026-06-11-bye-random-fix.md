# Bye Randomization Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the auto-bye assignment that fires immediately when the user clicks "Losuj rozstawienie"; instead, defer bye randomization to the "Utwórz turniej" click, and add a hint explaining how to trigger it.

**Architecture:** All changes live in `js/tournament.js` (seeding button handler, `validateStep4`, `renderStep4Players`, `_updateByeCounter`, new `_updateByeHint`, create/preview handlers) and a small CSS addition in `css/style.css`. No new files.

**Tech Stack:** Vanilla JS/HTML/CSS, no build step. Open `index.html` in a browser to test.

---

## File Map

| File | What changes |
|---|---|
| `js/tournament.js` | Remove auto-bye block from seeding handler; add `_updateByeHint()`; update `_updateByeCounter`, `renderStep4Players`, `validateStep4`, `btn-create-tournament`, `btn-preview-bracket` handlers |
| `css/style.css` | Add style for `#t-bye-hint` |

---

## Task 1: Remove auto-bye assignment from the seeding button handler

**Files:**
- Modify: `js/tournament.js` (seeding segmented-button click listener, ~lines 154–184)

**Context:** Currently, clicking "Losuj rozstawienie" immediately assigns random byes when `byeCount === 0`. This block must be deleted. The only things that should happen on seeding click are: update `tournamentConfig.seeding`, call `validateStep4()`, and call `_updateByeHint()` (added in Task 2).

- [ ] **Step 1: Open `js/tournament.js`. Find the seeding button click listener** (look for `#t-seeding-group`). The full listener currently reads:

```js
document.querySelectorAll('#t-seeding-group .btn-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#t-seeding-group .btn-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tournamentConfig.seeding = btn.dataset.seeding;

    if (btn.dataset.seeding === 'random' && tournamentConfig.format === 'bracket') {
      const n = tournamentConfig.numPlayers;
      const numByes = nextPowerOf2(n) - n;
      if (numByes > 0) {
        const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
        if (byeCount === 0) {
          const indices = Array.from({ length: n }, (_, i) => i);
          for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
          }
          const byeSet = new Set(indices.slice(0, numByes));
          document.querySelectorAll('#t-players-list .bye-toggle').forEach((toggle, i) => {
            const active = byeSet.has(i);
            toggle.classList.toggle('active', active);
            toggle.textContent = active ? 'BYE ✓' : 'BYE';
            toggle.closest('.player-block').classList.toggle('has-bye', active);
          });
          _updateByeCounter(numByes);
          validateStep4();
        }
      }
    }
  });
});
```

Replace it with:

```js
document.querySelectorAll('#t-seeding-group .btn-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#t-seeding-group .btn-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tournamentConfig.seeding = btn.dataset.seeding;
    _updateByeHint();
    validateStep4();
  });
});
```

- [ ] **Step 2: Manual test — open `index.html`, create a bracket tournament with 5 or 6 players (5 or 6 players → 3 byes).** Go to step 4, switch seeding to "Losuj rozstawienie". Verify: **no byes are auto-checked**. The bye counter should show `0 / 3 — zaznacz dokładnie 3` (red) but "Utwórz turniej" should still be enabled because seeding=random (this won't be true yet — `validateStep4` fix is in Task 3). For now just confirm byes are NOT auto-assigned.

- [ ] **Step 3: Commit**

```
git add js/tournament.js
git commit -m "fix: remove auto-bye assignment from seeding button click"
```

---

## Task 2: Add `_updateByeHint()` function and `#t-bye-hint` element

**Files:**
- Modify: `js/tournament.js` (`renderStep4Players`, `_updateByeCounter`, add new `_updateByeHint`)
- Modify: `css/style.css` (add `#t-bye-hint` style)

**Context:** A hint is shown directly below `#t-bye-counter`. Its text changes based on the current seeding mode and whether any byes are manually checked:
- seeding=random AND byeCount===0 → `"✓ Wolne losy zostaną wylosowane automatycznie przy tworzeniu turnieju."`
- otherwise → `"ℹ️ Aby wylosować wolne losy automatycznie — odznacz wszystkie BYE i wybierz „Losuj rozstawienie"."`

The hint is only visible when `format === 'bracket'` AND `numByes > 0`.

- [ ] **Step 1: Add `_updateByeHint()` function.** Insert it immediately after `_updateByeCounter` in `tournament.js`:

```js
function _updateByeHint() {
  const hintEl = document.getElementById('t-bye-hint');
  if (!hintEl || hintEl.style.display === 'none') return;
  const isRandom = document.querySelector('#t-seeding-group .btn-seg.active')?.dataset.seeding === 'random';
  const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
  if (isRandom && byeCount === 0) {
    hintEl.textContent = '✓ Wolne losy zostaną wylosowane automatycznie przy tworzeniu turnieju.';
    hintEl.className = 'bye-hint bye-hint--auto';
  } else {
    hintEl.textContent = 'ℹ️ Aby wylosować wolne losy automatycznie — odznacz wszystkie BYE i wybierz „Losuj rozstawienie".';
    hintEl.className = 'bye-hint';
  }
}
```

- [ ] **Step 2: Call `_updateByeHint()` from `_updateByeCounter`.** At the end of `_updateByeCounter`, add:

```js
function _updateByeCounter(numByes) {
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
  _updateByeHint();  // ← add this line
}
```

- [ ] **Step 3: Create and show `#t-bye-hint` in `renderStep4Players`.** In `renderStep4Players`, directly after the block that sets up `#t-bye-counter` (after `counterEl.style.display = ...`), add:

```js
// ── Bye hint ──
let hintEl = document.getElementById('t-bye-hint');
if (!hintEl) {
  hintEl = document.createElement('p');
  hintEl.id = 't-bye-hint';
  document.getElementById('t-players-list').before(hintEl);
}
hintEl.style.display = (isBracket && numByes > 0) ? '' : 'none';
```

Then at the end of `renderStep4Players`, before `_initStep4DragDrop(list)`, add a call:

```js
_updateByeHint();
```

- [ ] **Step 4: Add CSS for `#t-bye-hint` in `css/style.css`.** Add after the `.bye-counter` rules:

```css
.bye-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 4px 0 8px;
  line-height: 1.4;
}
.bye-hint--auto {
  color: #2a9d4f;
}
```

- [ ] **Step 5: Manual test — open the app, go to bracket wizard step 4 (e.g. 5 players).**
  - With seeding=fixed: hint shows "ℹ️ Aby wylosować..." in muted colour.
  - Switch to seeding=random (no byes checked): hint changes to "✓ Wolne losy zostaną wylosowane..." in green.
  - Check a BYE manually: hint reverts to "ℹ️ Aby wylosować...".
  - Uncheck the BYE: hint goes back to green.

- [ ] **Step 6: Commit**

```
git add js/tournament.js css/style.css
git commit -m "feat: add bye-hint element with dynamic text below bye counter"
```

---

## Task 3: Fix `validateStep4` — enable "Utwórz turniej" when seeding=random and byeCount=0

**Files:**
- Modify: `js/tournament.js` (`validateStep4` function, ~lines 476–493)

**Context:** Currently the button is disabled whenever `byeCount !== numByes` for brackets with byes. After this fix: if seeding=random AND byeCount===0, treat it as valid (byes will be assigned at creation time).

- [ ] **Step 1: In `validateStep4`, locate the bracket-byes guard:**

```js
} else if (allFilled && tournamentConfig.format === 'bracket') {
    const B = nextPowerOf2(tournamentConfig.numPlayers);
    const numByes = B - tournamentConfig.numPlayers;
    if (numByes > 0) {
      const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
      if (byeCount !== numByes) {
        errEl.hidden = true;
        btn.disabled = true;
        return;
      }
    }
    errEl.hidden = true;
    btn.disabled = false;
  }
```

Replace the inner guard with:

```js
} else if (allFilled && tournamentConfig.format === 'bracket') {
    const B = nextPowerOf2(tournamentConfig.numPlayers);
    const numByes = B - tournamentConfig.numPlayers;
    if (numByes > 0) {
      const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
      const isRandom  = document.querySelector('#t-seeding-group .btn-seg.active')?.dataset.seeding === 'random';
      const autoAssign = isRandom && byeCount === 0;
      if (!autoAssign && byeCount !== numByes) {
        errEl.hidden = true;
        btn.disabled = true;
        return;
      }
    }
    errEl.hidden = true;
    btn.disabled = false;
  }
```

- [ ] **Step 2: Manual test — bracket with 5 players (3 byes needed):**
  - seeding=fixed, 0 byes checked → button disabled ✓
  - seeding=random, 0 byes checked → button **enabled** ✓
  - seeding=random, 2 byes checked (not 3) → button disabled ✓
  - seeding=random, 3 byes checked → button enabled ✓
  - seeding=fixed, 3 byes checked → button enabled ✓

- [ ] **Step 3: Commit**

```
git add js/tournament.js
git commit -m "fix: enable create-tournament when seeding=random handles bye assignment"
```

---

## Task 4: Auto-assign byes in "Utwórz turniej" and "Podgląd drabinki" handlers

**Files:**
- Modify: `js/tournament.js` (`btn-create-tournament` click handler, `btn-preview-bracket` click handler)

**Context:** When `seeding === 'random'` AND `format === 'bracket'` AND `byeCount === 0` AND `numByes > 0`, randomly assign byes to the players array before the Fisher-Yates order shuffle. This mirrors the logic previously in the seeding button handler but applied at the right moment.

- [ ] **Step 1: In the `btn-create-tournament` handler, locate the seeding shuffle block:**

```js
if (tournamentConfig.seeding === 'random') {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }
```

Replace with:

```js
if (tournamentConfig.seeding === 'random') {
    if (tournamentConfig.format === 'bracket') {
      const numByes  = nextPowerOf2(players.length) - players.length;
      const byeCount = players.filter(p => p.bye).length;
      if (numByes > 0 && byeCount === 0) {
        const indices = Array.from({ length: players.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const byeSet = new Set(indices.slice(0, numByes));
        players.forEach((p, i) => { p.bye = byeSet.has(i); });
      }
    }
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }
```

- [ ] **Step 2: In the `btn-preview-bracket` handler, locate the seeding shuffle block:**

```js
if (tournamentConfig.seeding === 'random') {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }
```

Replace with the same pattern:

```js
if (tournamentConfig.seeding === 'random') {
    if (tournamentConfig.format === 'bracket') {
      const numByes  = nextPowerOf2(players.length) - players.length;
      const byeCount = players.filter(p => p.bye).length;
      if (numByes > 0 && byeCount === 0) {
        const indices = Array.from({ length: players.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const byeSet = new Set(indices.slice(0, numByes));
        players.forEach((p, i) => { p.bye = byeSet.has(i); });
      }
    }
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }
```

- [ ] **Step 3: Manual test — bracket with 5 players, seeding=random, 0 byes checked:**
  - Click "👁 Podgląd drabinki" → bracket renders with some players getting bye slots. Repeat a few times — distribution changes each time.
  - Click "Utwórz turniej" → tournament created, some players start from round 2 (bye slots). Verify bracket view shows correct bye distribution.

- [ ] **Step 4: Edge case — bracket with 4 or 8 players (0 byes needed):** seeding=random → no byes assigned (numByes===0, guard skips), tournament created normally.

- [ ] **Step 5: Edge case — seeding=fixed, 0 byes manually checked:** button is disabled (Task 3 guard), so this handler never fires. Confirm button is disabled in this state.

- [ ] **Step 6: Commit**

```
git add js/tournament.js
git commit -m "fix: defer random bye assignment to tournament creation and bracket preview"
```
