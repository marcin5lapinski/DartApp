# Mobile Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix drag-and-drop reordering in the tournament wizard on mobile, and make the player score row stick to the top of the game screen when scrolling down.

**Architecture:** Fix 1 adds parallel touch event handlers inside `_initStep4DragDrop()` using `document.elementFromPoint` for hit-testing under the finger. Fix 2 makes `.players-row` `position: sticky` and uses an `IntersectionObserver` on a sentinel element to toggle a `.compact` CSS class (animated via `max-height` transition) when the row scrolls out of natural position.

**Tech Stack:** Vanilla JS, CSS3, no build step. Open `index.html` directly in browser. Use DevTools → device toolbar (Ctrl+Shift+M) to simulate touch.

---

## Files changed

| File | Change |
|---|---|
| `css/style.css` | Add `touch-action: none` to `.drag-handle`; add sticky + compact rules for `.players-row` |
| `js/tournament.js` | Add `touchstart/touchmove/touchend/touchcancel` listeners in `_initStep4DragDrop()` |
| `index.html` | Add `<div id="game-sticky-sentinel">` before `.players-row` |
| `js/app.js` | Add `IntersectionObserver` inside `DOMContentLoaded` handler |

---

## Task 1 — Fix 1: CSS changes for touch drag-and-drop

**Files:**
- Modify: `css/style.css:1803–1814`

- [ ] **Step 1: Add `touch-action: none` to `.drag-handle`**

In `css/style.css`, find the `.drag-handle` rule (line ~1803) and add `touch-action: none`:

```css
.drag-handle {
  color: #444;
  font-size: 1.1rem;
  cursor: grab;
  padding: 2px 4px;
  user-select: none;
  line-height: 1;
  border-radius: 3px;
  transition: color .15s;
  touch-action: none;
}
```

`touch-action: none` on the handle tells the browser not to intercept the touch for scrolling, which is required for `preventDefault()` inside `touchmove` to work without passive-listener warnings.

- [ ] **Step 2: Verify the file saved correctly**

Open `css/style.css`, confirm `.drag-handle` now contains `touch-action: none`.

---

## Task 2 — Fix 1: Touch event handlers in `_initStep4DragDrop`

**Files:**
- Modify: `js/tournament.js:878–924` (`_initStep4DragDrop` function)

- [ ] **Step 1: Replace `_initStep4DragDrop` with touch-aware version**

Replace the entire `_initStep4DragDrop` function (line ~878) with the version below. The mouse/desktop listeners are identical to the originals; the four touch listeners (`touchstart`, `touchmove`, `touchend`, `touchcancel`) are new.

```js
function _initStep4DragDrop(list) {
  let dragSrc = null;

  list.querySelectorAll('.player-block').forEach(b => b.setAttribute('draggable', 'true'));

  // ---- Mouse / desktop drag ----
  list.addEventListener('dragstart', e => {
    if (e.target.closest('input, select')) { e.preventDefault(); return; }
    const block = e.target.closest('.player-block');
    if (!block) return;
    dragSrc = block;
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => block.classList.add('dragging'));
  });

  list.addEventListener('dragend', () => {
    list.querySelectorAll('.player-block').forEach(b =>
      b.classList.remove('dragging', 'drag-over'));
    dragSrc = null;
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    const block = e.target.closest('.player-block');
    if (!block || block === dragSrc) return;
    list.querySelectorAll('.player-block').forEach(b => b.classList.remove('drag-over'));
    block.classList.add('drag-over');
  });

  list.addEventListener('dragleave', e => {
    if (!list.contains(e.relatedTarget))
      list.querySelectorAll('.player-block').forEach(b => b.classList.remove('drag-over'));
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.player-block');
    if (!target || target === dragSrc) return;
    const blocks = Array.from(list.children);
    const fromIdx = blocks.indexOf(dragSrc);
    const toIdx   = blocks.indexOf(target);
    if (fromIdx < 0 || toIdx < 0) return;
    const vals = _getStep4Values();
    vals.splice(toIdx, 0, vals.splice(fromIdx, 1)[0]);
    renderStep4Players(vals);
    if (tournamentConfig && tournamentConfig.format === 'groups') _refreshGroupPreviewBody();
  });

  // ---- Touch / mobile drag ----
  list.addEventListener('touchstart', e => {
    if (!e.target.closest('.drag-handle')) return;
    const block = e.target.closest('.player-block');
    if (!block) return;
    dragSrc = block;
    requestAnimationFrame(() => block.classList.add('dragging'));
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (!dragSrc) return;
    e.preventDefault();
    const touch = e.touches[0];
    dragSrc.style.visibility = 'hidden';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    dragSrc.style.visibility = '';
    const target = el && el.closest('.player-block');
    list.querySelectorAll('.player-block').forEach(b => b.classList.remove('drag-over'));
    if (target && target !== dragSrc) target.classList.add('drag-over');
  }, { passive: false });

  list.addEventListener('touchend', e => {
    if (!dragSrc) return;
    const touch = e.changedTouches[0];
    dragSrc.style.visibility = 'hidden';
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    dragSrc.style.visibility = '';
    const target = el && el.closest('.player-block');
    if (target && target !== dragSrc) {
      const blocks = Array.from(list.children);
      const fromIdx = blocks.indexOf(dragSrc);
      const toIdx   = blocks.indexOf(target);
      if (fromIdx >= 0 && toIdx >= 0) {
        const vals = _getStep4Values();
        vals.splice(toIdx, 0, vals.splice(fromIdx, 1)[0]);
        renderStep4Players(vals);
        if (tournamentConfig && tournamentConfig.format === 'groups') _refreshGroupPreviewBody();
      }
    }
    list.querySelectorAll('.player-block').forEach(b =>
      b.classList.remove('dragging', 'drag-over'));
    dragSrc = null;
  });

  list.addEventListener('touchcancel', () => {
    list.querySelectorAll('.player-block').forEach(b =>
      b.classList.remove('dragging', 'drag-over'));
    dragSrc = null;
  });
}
```

Key points:
- `touchstart` only fires drag when touching `.drag-handle` (not inputs/selects).
- `touchmove` briefly hides the dragged block (`visibility: hidden`) so `elementFromPoint` can see the element underneath the finger, then restores it.
- `touchend` uses `e.changedTouches[0]` (not `e.touches[0]`, which is empty on `touchend`).
- `touchcancel` cleans up if the OS interrupts the gesture (e.g. incoming call).

- [ ] **Step 2: Manual test — open in browser with touch simulation**

1. Open `index.html` in Chrome.
2. Open DevTools → toggle device toolbar (Ctrl+Shift+M), pick any phone preset.
3. Navigate to the tournament wizard → step 4 (need ≥ 2 players entered).
4. Long-press on the `⠿` drag handle of a player row, then drag up or down to another row.
5. Expected: the dragged row highlights as semi-transparent (`.dragging`), the target row gets a red border (`.drag-over`), and releasing reorders the list correctly.
6. Also verify tapping player name inputs and double selects still works (no accidental drag).

- [ ] **Step 3: Commit Fix 1**

```bash
git add css/style.css js/tournament.js
git commit -m "fix: touch drag-and-drop for player reorder in wizard step 4"
```

---

## Task 3 — Fix 2: HTML sentinel + CSS sticky compact

**Files:**
- Modify: `index.html` (inside `#screen-game`, before `.players-row`)
- Modify: `css/style.css:242–248` (`.players-row` rule + new compact rules)

- [ ] **Step 1: Add sentinel div to `index.html`**

In `index.html`, find the comment `<!-- Player score cards -->` (line ~158) and add the sentinel div immediately before `.players-row`:

```html
  <!-- Player score cards -->
  <div id="game-sticky-sentinel"></div>
  <div class="players-row">
```

The sentinel is a zero-height, zero-content element used only as an IntersectionObserver anchor.

- [ ] **Step 2: Add sticky and compact CSS rules to `style.css`**

Replace the existing `.players-row` rule (line ~243) and add the compact rules immediately after it:

```css
/* Player cards */
.players-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2px;
  background: var(--border);
  position: sticky;
  top: 0;
  z-index: 5;
  overflow: hidden;
  max-height: 220px;
  transition: max-height 0.25s ease;
}

.players-row.compact {
  max-height: 80px;
}
.players-row.compact .player-card    { padding: 8px 12px; }
.players-row.compact .player-name    { font-size: 16px; margin-bottom: 2px; }
.players-row.compact .player-score   { font-size: 2rem; }
.players-row.compact #ms-result      { font-size: 1.4rem; }
.players-row.compact .player-darts,
.players-row.compact .player-avg,
.players-row.compact .player-last,
.players-row.compact .legs-won       { display: none; }
```

`max-height: 220px` is larger than the tallest realistic player card (~170px) so it never clips full content. The `max-height` transition is what produces the animation; `overflow: hidden` ensures clipping during the transition.

---

## Task 4 — Fix 2: IntersectionObserver in `app.js`

**Files:**
- Modify: `js/app.js:86–91` (inside `DOMContentLoaded` handler)

- [ ] **Step 1: Add IntersectionObserver to the `DOMContentLoaded` handler**

In `app.js`, the `DOMContentLoaded` handler is at line 86:

```js
document.addEventListener('DOMContentLoaded', () => {
  showScreen(SCREENS.HOME);
  setupEventListeners();
  populatePlayerSuggestions();
  loadFromLocalStorage();
});
```

Add the observer setup at the end of the callback:

```js
document.addEventListener('DOMContentLoaded', () => {
  showScreen(SCREENS.HOME);
  setupEventListeners();
  populatePlayerSuggestions();
  loadFromLocalStorage();

  const sentinel   = document.getElementById('game-sticky-sentinel');
  const playersRow = document.querySelector('#screen-game .players-row');
  new IntersectionObserver(entries => {
    playersRow.classList.toggle('compact', !entries[0].isIntersecting);
  }, { threshold: 0 }).observe(sentinel);
});
```

When the sentinel scrolls out of the viewport (user scrolled down past the players row's natural position), `isIntersecting` becomes `false` → `.compact` is added → `max-height` animates to 80 px. When sentinel re-enters → `.compact` removed → animates back to full height.

- [ ] **Step 2: Manual test in browser**

1. Open `index.html` in Chrome with DevTools device toolbar on (phone size).
2. Start a match (any setup).
3. Switch to "Lotka po lotce" mode — this makes the game screen tall enough to scroll.
4. Scroll down slowly. Expected: the player score row sticks to the top; after a short travel it smoothly shrinks to ~80 px showing only name + score.
5. Scroll back up. Expected: the row animates back to full height.
6. Verify the `.game-header` (✕ Menu / Cofnij turę) scrolls away as normal.
7. Start a new match from scratch to confirm there's no stale `.compact` class on the row.

- [ ] **Step 3: Commit Fix 2**

```bash
git add index.html css/style.css js/app.js
git commit -m "fix: sticky compact players-row on game screen scroll (mobile)"
```
