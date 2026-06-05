# Tournament Wizard — Design Spec
**Date:** 2026-06-05
**Scope:** Phase 3 — round-robin tournament setup wizard (liga format only)

---

## Overview

A 4-step wizard accessible via the "TURNIEJ" button on the home screen. Implemented as a single `screen-tournament` HTML section with JS-managed step visibility (approach B). Tournament configuration is held in a `tournamentConfig` global object and discarded if the user exits without creating.

---

## Step 1 — Number of Players

**UI:**
- Info text: "Minimalna liczba graczy: 3 · Maksymalna: 6"
- Single number input (integer, centered)
- Nav: `← Powrót` (→ home screen) | `DALEJ →`

**Validation:**
- Value must be an integer in [3, 6]; show inline error if outside range
- `DALEJ` disabled / shows error until value is valid

**Future:** max will increase to 64 (20 for liga). The validation limit comes from a constant so it's easy to raise.

---

## Step 2 — Tournament Format

**UI:**
- Three format tiles (only Liga is active for now):
  - **Liga (Round-Robin)** — active; disabled if `numPlayers > 20`
  - **Grupy + Drabinka** — disabled, "wkrótce"
  - **Drabinka** — disabled, "wkrótce"
- Liga sub-settings (shown only when Liga is selected):
  - **Rundy** — segmented button: "Jedna runda" (default) / "Dwie rundy"
  - **Punkty za wygraną** — number input, default 2, min 0
  - **Punkty za przegraną** — number input, default 0, min 0
- Nav: `← Wstecz` | `DALEJ →`

**Validation:** A format must be selected to proceed. Liga is always selectable given current 3–6 player range.

---

## Step 3 — Match Settings

Same controls as the single-match setup screen:
- Wariant: select 101–1001, default 501
- Liczba setów: select 1–10, default 1
- Liczba legów: select First to 1–16, default First to 3
- Tryb wejścia: Straight-in (default) / Double-in / Master-in
- Tryb wyjścia: Double-out (default) / Master-out / Straight-out

**No "kto zaczyna" field** — the starting player is decided per-match via a dialog shown before each tournament match begins.

- Nav: `← Wstecz` | `DALEJ →`

---

## Step 4 — Players & Seeding

**UI:**
- Header: "Gracze (N)" where N = numPlayers from Step 1
- N player blocks, each containing:
  - Name input (text, maxlength 20, with `datalist` from saved player profiles)
  - **Podwójna 1.** select (D1–D20 + Bull + "— brak —"), default "— brak —"
  - **Podwójna 2.** select (D1–D20 + Bull + "— brak —"), default "— brak —"
- **Seeding** segmented buttons (selected option highlighted red):
  - 🎲 **Losuj rozstawienie** — randomise player order in the bracket (default)
  - ↓ **Użyj kolejności** — use top-to-bottom input order as-is
- **UTWÓRZ TURNIEJ** button — disabled for now (implementation in next task)
- Nav: `← Wstecz` (no DALEJ — this is the last step)

**Validation:** All name inputs must be non-empty and unique before "Utwórz turniej" can be enabled (enforced in next task).

---

## Data Model

```js
// Global object built up across wizard steps; lives in app.js
let tournamentConfig = null;

// Shape when complete:
{
  numPlayers: 6,                // Step 1
  format: 'league',             // Step 2: 'league' | 'groups+bracket' | 'bracket'
  leagueRounds: 'single',       // Step 2: 'single' | 'double'
  winPoints: 2,                 // Step 2
  lossPoints: 0,                // Step 2
  matchConfig: {                // Step 3
    variant: 501,
    totalSets: 1,
    totalLegs: 3,
    inMode: 'straight',
    checkoutMode: 'double',
  },
  players: [                    // Step 4
    { name: 'Jan', primaryDouble: 'D20', secondaryDouble: 'D16' },
    { name: 'Piotr', primaryDouble: null, secondaryDouble: null },
    // … up to numPlayers entries
  ],
  seeding: 'random',            // Step 4: 'random' | 'ordered'
}
```

---

## Navigation & State

| Action | Result |
|---|---|
| Step 1 `← Powrót` | → `SCREENS.HOME`; `tournamentConfig = null` |
| Any step `← Wstecz` | Previous step; data already entered is preserved |
| Any step `DALEJ →` | Next step (only if validation passes) |
| Step 4 `← Wstecz` | Step 3 |

**Progress indicator:** 4 dots at the top of the wizard card. Done steps shown as dark-red, current step as red, future steps as dark grey.

---

## Architecture

- **HTML:** one new `<section id="screen-tournament" class="screen">` with four `<div class="wizard-step">` children. Steps hidden via `display:none` / `display:flex`.
- **JS:** new file `js/tournament.js` inserted into the script load order **between `ui.js` and `app.js`** (needs `SCREENS`, `loadPlayers()`, `populatePlayerSuggestions()`-style datalist; must be defined before `app.js` calls `initTournamentWizard()`). Updated module order: `checkouts → stats → game → players → history → board → ui → tournament → app`.
  - `showWizardStep(n)` — hides all steps, shows step n, updates dot progress
  - Step-specific render functions: `renderStep4Players(n)` — dynamically generates N player blocks
- **CSS:** new section in `style.css` for `.wizard-step`, `.tournament-card`, `.player-block`, `.format-tile`, `.wizard-dots`
- **SCREENS:** add `TOURNAMENT: 'tournament'` to `SCREENS` constant in `ui.js`
- **Home screen:** "TURNIEJ" button un-disabled, wired to `showScreen(SCREENS.TOURNAMENT)` + `initTournamentWizard()`

---

## Out of Scope (this task)

- Actual tournament creation / bracket generation (next task)
- Match scheduling and play-through
- Results table / standings
- Groups + Drabinka and Drabinka formats
