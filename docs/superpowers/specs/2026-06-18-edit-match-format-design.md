# Edit Match Format During Tournament — Design Spec

**Date:** 2026-06-18  
**Branch:** `feature/edit-match-format`  
**Status:** Approved

---

## Overview

Allow tournament organizers to change match formats for individual phases/rounds of an ongoing tournament, directly from the tournament view screen — without recreating the tournament.

Works for all three tournament formats: **liga**, **bracket**, **groups+bracket**.

---

## Entry Point

A `⚙` icon button (`#btn-tv-format-settings`) is added to the right side of the `secondary-header` on `#screen-tournament-view`. It replaces the existing empty `<span>` spacer (the flex third-child).

- Visible only when `tournament.status === 'active'`
- Styled identically to `.btn-back` (same border, padding, radius)
- Clicking calls `openFormatEditModal(tournament)`

---

## Modal: `#modal-format-edit`

A large, scrollable modal (similar to `modal-bracket-preview`).

**Layout:**
```
┌─────────────────────────────────────┐
│  Formaty meczów              [✕]    │
├─────────────────────────────────────┤
│  (phase cards or single form)       │
├─────────────────────────────────────┤
│        [Zapisz zmiany]              │
└─────────────────────────────────────┘
```

**Dimensions:** `max-width: 420px`, `max-height: calc(100vh - 80px)`, `overflow-y: auto`, padding `20px 16px 16px`.

**For liga:** A single inline form (variant, totalSets, totalLegs, inMode, checkoutMode, dartLimit) — no phase cards. Identical field set to `#t-single-match-form` in the wizard.

**For bracket / groups+bracket:** Collapsible phase cards, identical to wizard step 3 with `usePhaseFormats` enabled. Card order: group phase (groups only) → bracket rounds (R1…Final) → 3rd-place match (if enabled). Cards reuse `_buildPhaseFormHTML()` from `tournament.js` for their inner HTML.

**Locked phase card:** A phase where ≥1 non-bye match has `winner !== null`. Visual treatment:
- Header shows 🔒 icon after phase name
- Header `pointer-events: none`, `opacity: 0.55`, `cursor: default`
- Card cannot be expanded
- CSS class `.phase-card.locked`

**Save button:** `#btn-format-edit-save` — standard full-width green button, sticky at bottom of modal content.

---

## Lock Logic

A phase is locked when `tournament.matches` contains at least one played (non-bye) match belonging to that phase:

| Phase key | Match condition |
|---|---|
| `'group'` | `m.phase === 'group' && m.winner !== null` |
| `0`, `1`, … (bracket round) | `m.phase === 'bracket' && m.round === key && !m.isBye && m.winner !== null` |
| `'thirdPlace'` | `m.isThirdPlace === true && m.winner !== null` |

For liga: the single form is editable as long as `tournament.status === 'active'` (finished tournaments don't show the button at all).

---

## Save Logic

**Liga:**
1. Read the form fields
2. Overwrite `tournament.config.matchConfig`
3. Call `saveTournaments()`
4. Re-render the info bar (`#tv-info-bar`)
5. Close the modal

**Bracket / Groups+bracket:**
1. For each **unlocked** phase card: call `_readPhaseCardConfig(card)` and store result
2. Set `tournament.config.usePhaseFormats = true`
3. Merge read configs into `tournament.config.phaseMatchConfigs[phase.key]` (locked phases untouched)
4. Sync `tournament.config.matchConfig` with the config of the first phase (fallback for `getMatchConfig()`)
5. Call `saveTournaments()`
6. Re-render info bar
7. Close the modal

Tournaments created without `usePhaseFormats` will have `phaseMatchConfigs` pre-filled from the shared `matchConfig` when the modal opens, and `usePhaseFormats` will be set to `true` on first save.

---

## New Functions in `league.js`

| Function | Signature | Purpose |
|---|---|---|
| `_getTournamentPhases` | `(tournament) → [{key, name}]` | Derives phase list from a tournament object (mirrors `_getWizardPhases()` in tournament.js but reads from tournament instead of tournamentConfig global) |
| `_isPhaseHasPlayedMatches` | `(tournament, phaseKey) → boolean` | Returns true if any non-bye match in the phase has been played |
| `_buildFormatEditPhaseCard` | `(phase, mc, locked, isLast, phases) → HTMLElement` | Builds a phase card for the modal; locked cards show 🔒 and disable interaction |
| `openFormatEditModal` | `(tournament) → void` | Builds and opens `#modal-format-edit`; wires save + close buttons |
| `_saveFormatEdit` | `(tournament) → void` | Reads form/cards, updates tournament.config, persists, re-renders |

---

## Files Changed

| File | Change |
|---|---|
| `index.html` | Add `#btn-tv-format-settings` button; add `#modal-format-edit` modal |
| `css/style.css` | Add `.phase-card.locked` styles; add `#modal-format-edit` / `.modal-format-edit` styles |
| `js/league.js` | 5 new functions; wire button in `renderTournamentViewScreen()` |
| `js/tournament.js` | **No changes** |
| `js/app.js` | **No changes** |

---

## Out of Scope

- Changing tournament name or number of players
- Changing liga-specific settings (win/loss points, single/double rounds)
- Changing groups structure (advance counts, number of groups)
- Undo/redo of format changes
- Format change history / audit log
