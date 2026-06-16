# Mobile Fixes — Design Spec
**Date:** 2026-06-16

Two independent mobile UX fixes for DartApp.

---

## Fix 1 — Touch drag-and-drop in tournament wizard (Step 4)

### Problem
`_initStep4DragDrop()` in `tournament.js` uses the HTML5 Drag & Drop API (`dragstart`, `dragover`, `drop`). This API is not supported on iOS or Android — players cannot reorder the player list on mobile.

### Solution
Add parallel touch event handlers inside the same `_initStep4DragDrop(list)` function, alongside the existing mouse listeners. No new functions or files needed.

### Event flow
- **`touchstart`** on `list` — if touch target is inside `.drag-handle`, find the parent `.player-block` and set it as `touchDragSrc`; add `.dragging` class via `requestAnimationFrame`. Ignore touches on `input`/`select`.
- **`touchmove`** on `list` — call `e.preventDefault()` (blocks page scroll while dragging). Use `document.elementFromPoint(touch.clientX, touch.clientY)` to find the element under the finger; find its `closest('.player-block')`. Clear `.drag-over` from all blocks, add it to the target (if it differs from `touchDragSrc`).
- **`touchend`** on `list` — perform reorder: read current order via `_getStep4Values()`, splice `fromIdx → toIdx`, call `renderStep4Players(vals)` (same logic as the existing `drop` handler). Clean up `.dragging` and `.drag-over` classes; clear `touchDragSrc`.

### CSS change
Add `touch-action: none` to `.drag-handle` in `style.css`. This allows `preventDefault()` in `touchmove` without browser passive-listener warnings, and suppresses the long-press context menu on the handle.

### Non-goals
- No change to desktop drag behaviour.
- No reorder arrows / alternative UI.

---

## Fix 2 — Sticky compact players-row in game screen

### Problem
On small phones in dart-by-dart or board mode, the player score cards scroll off the top of the screen. The user loses sight of the current score while interacting with the input area below.

### Solution
Make `.players-row` sticky at the top of the viewport. When the user scrolls past it, it animates down to 80 px, hiding secondary info and shrinking fonts. Scrolling back up restores full height.

### HTML change (`index.html`)
Add a zero-height sentinel div immediately before `.players-row` inside `#screen-game`:
```html
<div id="game-sticky-sentinel"></div>
<div class="players-row">…</div>
```

### CSS changes (`style.css`)

**Make row sticky and animatable:**
```css
.players-row {
  position: sticky;
  top: 0;
  z-index: 5;
  overflow: hidden;
  max-height: 220px;          /* generous cap for full content */
  transition: max-height 0.25s ease;
}
```

**Compact state (toggled by JS):**
```css
.players-row.compact {
  max-height: 80px;
}
.players-row.compact .player-card   { padding: 8px 12px; }
.players-row.compact .player-name   { font-size: 16px; margin-bottom: 2px; }
.players-row.compact .player-score  { font-size: 2rem; }
.players-row.compact #ms-result     { font-size: 1.4rem; }
.players-row.compact .player-darts,
.players-row.compact .player-avg,
.players-row.compact .player-last,
.players-row.compact .legs-won      { display: none; }
```

### JS change (`app.js`)
One `IntersectionObserver`, set up once after `DOMContentLoaded`, observes the sentinel. When the sentinel exits the viewport (user scrolled down), `.compact` is added; when it re-enters, `.compact` is removed.

```js
const sentinel    = document.getElementById('game-sticky-sentinel');
const playersRow  = document.querySelector('#screen-game .players-row');
new IntersectionObserver(entries => {
  playersRow.classList.toggle('compact', !entries[0].isIntersecting);
}, { threshold: 0 }).observe(sentinel);
```

When `#screen-game` is hidden (`display: none`), IntersectionObserver fires with `isIntersecting: false`, which adds `.compact`. This is harmless: when the game screen becomes active again and the user is at the top of the page, the sentinel re-enters the viewport and `.compact` is immediately removed.

### Non-goals
- No change to desktop layout (sticky behaviour is harmless on desktop; compact state only triggers on small screens where content overflows).
- No new element added to show score — the existing `.players-row` adapts in place.
