# Per-Phase Match Formats — Design Spec

**Date:** 2026-06-18  
**Formats affected:** Bracket, Groups+Bracket  
**Status:** Approved

---

## Overview

Allow tournament creators to configure different match settings (variant, sets, legs, in/out mode, dart limit) for each phase of a tournament. Applies to bracket and groups+bracket formats. League format is unaffected.

---

## Wizard Changes

### Step 2 — Checkbox

A new checkbox appears below the format tiles, visible only when `bracket` or `groups` format is selected:

```
☐ Różne formaty meczów dla każdej fazy
```

- Default: unchecked
- Does not affect step navigation
- Stored as `tournamentConfig.usePhaseFormats: boolean`

### Step 3 — Match Settings

**When checkbox unchecked:** single form, no change from current behavior.

**When checkbox checked:** list of collapsible phase cards. Card order:

- **Groups format:** `Faza grupowa`, then bracket rounds in order (`Runda 1 (1/8)`, `Ćwierćfinał`, `Półfinał`, `Finał`), optionally `Mecz o 3. miejsce`
- **Bracket format:** bracket rounds in order, optionally `Mecz o 3. miejsce`

Round names derived from existing `computeRoundName(roundIdx, numRounds)`.

#### Phase Card UI (Option 3 — compact cards with chips)

**Collapsed state:**
```
▶  Faza grupowa   [501] [First to 3] [Double out]
```
- 3 chips: variant, legs/sets label (`First to N` or `N sets × M legs`), checkout mode
- Chips in `--text-muted` color until phase is configured; normal color after
- Clicking anywhere on header row expands

**Expanded state:**
```
▼  Faza grupowa
   [Wariant▼] [Sety▼] [Legi▼]
   [Wejście▼] [Wyjście▼] [Limit▼]
   [Kopiuj dla kolejnych faz →]
```
- Full form (same fields as current single form)
- `[Kopiuj dla kolejnych faz →]` button at bottom
  - Sets all phases **after** the current one to the same config
  - Disabled/hidden for the last configurable phase (Final or 3rd place match)

**Defaults:** When checkbox is first checked, all phases inherit from the single `matchConfig` if already set; otherwise use app defaults (501, 1 set, 3 legs, straight in, double out, no limit).

**First phase** auto-expanded on load; others collapsed.

**Validation:** All phases must be configured before `DALEJ →` is enabled. A phase counts as configured once its form has been touched (or copy-from-previous was used). Unconfigured chips show `--text-muted` as a visual cue.

---

## Data Model

### `tournamentConfig` (wizard state) — new fields

```js
tournamentConfig = {
  // existing fields...
  usePhaseFormats: false,         // new
  phaseMatchConfigs: null,        // new — populated when usePhaseFormats: true
}
```

### `tournament.config` (localStorage) — new fields

```js
config: {
  // existing fields...
  usePhaseFormats: boolean,
  matchConfig: { ... },           // used when usePhaseFormats: false (unchanged)

  // new — used when usePhaseFormats: true:
  phaseMatchConfigs: {
    group:      { variant, totalSets, totalLegs, inMode, checkoutMode, dartLimit },
    0:          { ... },   // bracket R0 (earliest round — 1/8, 1/16, etc.)
    1:          { ... },   // R1
    // ...one entry per bracket round
    thirdPlace: { ... },   // optional
  }
}
```

**Key convention:**
- `'group'` — group phase (groups format only)
- `0, 1, 2, ...` — bracket rounds, matching `m.round` on match objects
- `'thirdPlace'` — third-place match

**Backward compatibility:** Existing tournaments without `usePhaseFormats` treated as `false`. No migration needed.

---

## New Helper: `getMatchConfig(tournament, match)`

Defined in `league.js`, available globally.

```js
function getMatchConfig(tournament, match) {
  if (!tournament.config.usePhaseFormats) return tournament.config.matchConfig;
  const pmc = tournament.config.phaseMatchConfigs;
  if (match.isThirdPlace) return pmc.thirdPlace ?? pmc[match.round];
  if (match.phase === 'group') return pmc.group;
  return pmc[match.round] ?? tournament.config.matchConfig;
}
```

Fallback to `matchConfig` if a key is missing (defensive).

---

## Match Play Changes

`startTournamentMatch()` in `app.js` — single change:

```js
// Before:
const mc = tournament.config.matchConfig;

// After:
const mc = getMatchConfig(tournament, match);
```

No other changes to match start, result saving, bracket advancement, or group finalization.

---

## "Custom Format" Display

When `config.usePhaseFormats === true`, replace format detail strings with `custom format` (italic, `--text-muted` color):

| Location | File |
|---|---|
| Tournament view info bar (`tv-info-bar`) | `league.js` — `renderTournamentViewScreen` |
| Tournament card on list | `league.js` — `buildTournamentCard` |
| Post-match stats screen | `ui.js` — `renderStatsScreen` |
| Match history list and detail | `history.js` — `renderHistoryScreen`, `renderHistoryDetailScreen` |

Helper: `_formatLabel(config)` — defined in `league.js` (global, like other cross-module helpers). Returns either `'custom format'` (when `config.usePhaseFormats`) or the standard label string (e.g. `501 · First to 3 · Double out`). Used in all four locations.

---

## Files Changed

| File | Change |
|---|---|
| `index.html` | Checkbox in step 2; phase cards container in step 3 |
| `js/tournament.js` | Checkbox toggle; phase card rendering; chip updates; copy button; `tournamentConfig` reset; `t-next-3` reads `phaseMatchConfigs` |
| `js/league.js` | `getMatchConfig()`; `createTournament` saves `usePhaseFormats`/`phaseMatchConfigs`; `_formatLabel()`; `buildTournamentCard`; `renderTournamentViewScreen` |
| `js/app.js` | `startTournamentMatch` uses `getMatchConfig()` |
| `js/ui.js` | `renderStatsScreen` uses `_formatLabel()` |
| `js/history.js` | `renderHistoryScreen`, `renderHistoryDetailScreen` use `_formatLabel()` |
| `css/style.css` | Phase card styles; chip styles; expand/collapse arrow |

---

## Out of Scope

- Changing match rules mid-tournament on an already-started tournament (separate task)
- Liga format (unaffected)
- Per-player stats breakdown by phase
