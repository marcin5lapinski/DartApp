# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
# Open the app
start index.html          # Windows — opens in default browser

# Smoke test (Playwright, headless Chromium)
node test-run.mjs         # saves screenshots: screenshot-*.png
```

> **Note**: `test-run.mjs` is outdated — it expects `#screen-setup.active` as the first screen, but the app now starts on `#screen-home`. Running it will fail at the first `waitForSelector`. Update or rewrite before relying on it.

## Stack

Vanilla HTML5 + CSS3 + JavaScript (no frameworks, no build step). Open `index.html` directly in a browser. Data stored in `localStorage`.

## Module load order (matters — globals depend on each other)

```
checkouts.js → stats.js → game.js → players.js → history.js → board.js → ui.js → league.js → tournament.js → app.js
```

## Architecture

| File | Responsibility |
|---|---|
| `js/checkouts.js` | `CHECKOUT_TABLE` (2–170), `getCheckoutHint()`, `DOUBLE_FINISHES` set, `isDoubleAttemptScore()`, `findCheckoutPath(score, targetDouble, dartsLeft)` |
| `js/stats.js` | Per-player stat objects, `recordVisit()`, `recordDart()`, `recordLegWin()`, `getFirst9Average()` |
| `js/game.js` | `createMatch()`, `applyVisitScore()`, `finalizeLeg()`, bust/checkout logic, `getValidClosingDarts()`, `getValidOpeningDarts()`, `_achievable2Darts()` |
| `js/players.js` | Persistent player profiles CRUD — `loadPlayers()`, `createPlayer()`, `updatePlayer()`, `renamePlayer()`, `deletePlayer()`, `renderPlayersScreen()`, `populatePlayerSuggestions()` |
| `js/history.js` | Match history (capped at 100) — `saveMatchToHistory()`, `deleteHistoryRecord()`, `renderHistoryScreen()`, `renderHistoryDetailScreen()` |
| `js/board.js` | Canvas 2D dartboard (Mode C) — `initBoard()`, `_drawBoard()`, click/touch hit detection |
| `js/ui.js` | `showScreen()`, `renderGameScreen()`, `showWhichDartDialog()`, modal helpers; defines `SCREENS` constant |
| `js/league.js` | Tournament data layer — `loadTournaments()`, `saveTournaments()`, `generateSchedule()`, `createTournament()`, `deleteTournament()`, `computeStandings()`, `computeLiveStandings()`; bracket — `nextPowerOf2()`, `computeRoundName()`, `_bracketCenterY()`, `advanceBracketWinner()`, `generateBracket(players)`, `renderBracketScreen(tournament, container?)`, `_buildBracketCard()`, `buildBracketRound()`, `buildBracketConnectorSvg()`; rendering — `renderTournamentListScreen()`, `buildTournamentCard()`, `renderTournamentViewScreen()`, `renderTournamentMatchesScreen()` |
| `js/tournament.js` | Tournament wizard — `tournamentConfig` global, `initTournamentWizard()`, `showWizardStep()`, `_computeByeSuggestion(numPlayers)`, `_updateByeCounter(numByes)`, `renderStep4Players(savedValues)`, `_getStep4Values()`, `_initStep4DragDrop()`, `_updateStep4Datalists()`, `buildDoublesOptions()`, `validateStep4()`; all wizard step event listeners |
| `js/app.js` | Event wiring, `startMatch()`, `submitSummaryScore()`, `submitDart()`, `localStorage` save/load; owns `undoStack` (capped at 20) |

### Key globals defined per module (all loaded into `window`)

- `game.js`: `INPUT_MODES`, `CHECKOUT_MODES`, `IN_MODES`, `VALID_DART_VALUES`
- `ui.js`: `SCREENS`
- `checkouts.js`: `CHECKOUT_TABLE`, `DOUBLE_FINISHES`
- `league.js`: `_activeTournament`, `TOURNAMENTS_KEY`, `CHECKOUT_LABELS`
- `tournament.js`: `tournamentConfig`
- `app.js`: `match`, `undoStack`, `IMPOSSIBLE_VISIT_SCORES`, `pendingDeleteTournamentId`, `pendingTournamentMatch`, `pendingTournamentStarterData`, `pendingOpenScore`, `pendingOpenPlayerIndex`

## localStorage keys

| Key | Contents |
|---|---|
| `dart_players` | Array of player profiles `{id, name, primaryDouble, secondaryDouble}` |
| `dart_history` | Array of completed match records (max 100) |
| `dart_match` | In-progress match snapshot (auto-saved each turn) |
| `dart_tournaments` | Array of tournament objects (max 5 active, max 40 finished) |

## Match state shape (key fields)

```js
{
  variant, player1, player2, checkoutMode, inMode,
  totalLegs,          // legs needed per set to win a set
  totalSets,          // sets needed to win the match (1 = no-set format)
  currentLeg, currentSet,
  legsWon: [0,0],     // total legs across all sets
  legsWonInSet: [0,0], setsWon: [0,0],
  legStartingPlayer, setStartingPlayer, activePlayer,
  players: [playerState, playerState],  // { score, history, dartBuffer, legOpened }
  stats: [playerStats, playerStats],
  playerFavorites: [null|{primaryDouble,secondaryDouble}, ...],
  matchOver, winner, inputMode
}
```

`playerState.legOpened` is `false` when inMode is double-in/master-in and the player has not yet opened (thrown a valid opening dart) in the current leg. Bust logic and `applyVisitScore` leave score unchanged while `legOpened === false`.

## Key game rules

- **Bust**: thrown > remaining, or remaining − thrown = 1 → revert to pre-visit score
- **Double-out**: final dart must land on D1–D20 or Bull (50) — values in `DOUBLE_FINISHES`
- **Master-out**: final dart can be double or triple
- **Personalized checkout hints**: `renderCheckoutHint()` in `ui.js` tries `findCheckoutPath()` to the player's `primaryDouble` (yellow), then `secondaryDouble` (blue), then falls back to `CHECKOUT_TABLE`
- **Summary mode**: after checkout, dialog asks which dart (1/2/3) closed the leg; `getValidClosingDarts()` filters valid options. Same "which dart opened?" dialog for double-in/master-in.
- **Dart-by-dart / Board mode**: buffer accumulates 3 darts, auto-submits; double-attempt detection per dart
- **Leg start alternation**: the player who starts each leg alternates from the previous leg

## Screens

The app loads with `screen-home` as the initial active screen. Navigation flows:

`home` → `tournament-list` → `tournament-view` (liga standings); `home` → `setup` → `game` → `stats`; `players` and `history` accessible from `home`. Tournament wizard (`tournament`) accessible from `tournament-list`.

### Tournament flow

```
home → tournament-list → [tournament-view | tournament wizard → tournament-view]
```

**`screen-tournament-list`**: lists active (max 5) and finished (max 40) tournaments. "Nowy turniej" button disabled at limit. Delete with `modal-delete-tournament`. Rendered by `renderTournamentListScreen()` in `league.js`.

**`screen-tournament-view`**: for liga — tab bar (Tabela + Mecze). Standings rendered by `renderTournamentViewScreen(tournament)` — sort: pts desc → legDiff desc → avg desc → seeding index asc. Tied rows get green background `#0e1a0e`. Finished tournaments show gold/silver/bronze medal colors for top 3. Matches tab rendered by `renderTournamentMatchesScreen(tournament)` — 3-col grid, unplayed sorted by longest-waiting pair, clicking unplayed opens starter modal, clicking played opens stats. For bracket — no tabs; shows `#tv-bracket` only, rendered by `renderBracketScreen(tournament)`.

### Tournament wizard (`screen-tournament`)

4-step wizard, state in `tournamentConfig`, steps managed by `showWizardStep(n)` in `tournament.js`:

| Step | Content |
|---|---|
| 1 | Tournament name (max 40) + number of players (3–10) |
| 2 | Format (liga or bracket); rounds (single/double, liga only); win/loss points (liga only). Liga/bracket settings share the same vertical space via CSS grid overlay — no height jump on switch. |
| 3 | Match settings — variant, sets, legs, in-mode, out-mode (no starter — asked per match) |
| 4 | Player name inputs + 2 doubles selects each; seeding choice; BYE toggles (bracket only); "👁 Podgląd drabinki" preview button (bracket only); UTWÓRZ TURNIEJ button |

`validateStep4()` enables UTWÓRZ TURNIEJ when: all name fields non-empty, no duplicates (case-insensitive), and (bracket only) `byeCount === numByes`. Duplicate fields get red border + dark background. For bracket with `numByes > 0`: a counter bar (`#t-bye-counter`) above the player list shows current vs required count; green when correct, red otherwise. BYE toggles pre-filled by `_computeByeSuggestion(n)` (interleaving formula) on fresh render; preserved from `savedValues` on drag-drop re-render. Clicking "🎲 Losuj" with 0 byes active auto-assigns `numByes` random byes. Each player input has its own `<datalist id="t-datalist-N">` managed by `_updateStep4Datalists()`. On UTWÓRZ click: reads `_getStep4Values()` (includes `bye` flag), Fisher-Yates shuffle applied if seeding=random (bye travels with player), unknown players added to `dart_players`, `createTournament(config, players)` called (strips `bye` before storage), navigates to `TOURNAMENT_VIEW`.

### Tournament data shape (`dart_tournaments` array)

```js
{
  id, name, status: 'active'|'finished', createdAt,
  config: {
    numPlayers, format,                          // format: 'liga' | 'bracket'
    // liga only:
    leagueRounds: 'single'|'double', winPoints, lossPoints,
    // bracket only:
    bracketSize,                                 // next power-of-2 ≥ numPlayers
    matchConfig,
  },
  players: [{ name, primaryDouble, secondaryDouble }],  // in seeding order
  matches: [{
    p1, p2,
    winner: null|0|1,      // null=unplayed; 0=players[p1] won; 1=players[p2] won
    legs:   [null,null],   // legs won by p1, p2
    sets:   [null,null],   // sets won (null if non-set format)
    avgs:   [null,null],   // 3-dart averages
    stats:  [null,null],   // full playerStats objects
    starter: null|number,  // tournament player index who started the match
    // bracket only:
    round:  number,        // 0 = R1, 1 = R2, …
    slot:   number,        // 0-based slot within the round
    isBye:  boolean,       // bye-match: p2=null, winner=0 pre-set, never played
  }]
}
```
`winner: 0` means `players[p1]` won; `winner: 1` means `players[p2]` won. `legs[0]` = legs won by p1, `legs[1]` = legs won by p2.

### Bracket layout constants (coupled — must stay in sync)

`renderBracketScreen` in `league.js` (line ~341): `const CARD_H = 44, GAP = 8, LABEL_H = 26, SVG_W = 20;`

`.bk-card-wrap .match-card` in `style.css`: `height: 44px; padding: 6px 7px;`

**CARD_H in JS must equal height in CSS.** When changing card height, update both.

`VISIBLE = 3` (local const in `renderBracketScreen`) — number of rounds shown at once. Navigation arrows appear only when `numRounds > VISIBLE`; `offset` tracks the leftmost visible round.

`renderBracketScreen(tournament, container?)` — second parameter optional; defaults to `#tv-bracket`. Pass a different container to render into a modal (used by the bracket preview in wizard step 4).

### Bracket bye distribution

`generateBracket(players)` uses an interleaving formula to distribute byes evenly: `realSlotSet = { floor(i * r1Slots / numReal) | i = 0..numReal-1 }`. Real-match slots fall at these positions; all other R1 slots are bye slots. Players are split into `byePlayers` (`p.bye === true`) and `realPlayers` (`p.bye !== true`) and consumed in order as the slots are walked. Result is always even (e.g. N=10: 3 byes in top half, 3 in bottom half) regardless of which specific players hold the bye flag.

`_computeByeSuggestion(numPlayers)` uses the same formula to suggest which wizard positions should have BYE pre-checked. For N ∈ {4, 8} (powers of 2) returns all `false`.

## Project phases

- **Phase 1** ✅: X01 game screen — setup, game loop, bust, checkout, summary stats
- **Phase 2** ✅: Player profiles, match history, interactive dartboard (Mode C)
- **Phase 3** ✅: Round-robin tournament — home screen, wizard, tournament list, standings table, matches view, match play flow, live standings, rematch starter logic
- **Phase 4** ✅: Single-elimination bracket — bye handling (3–10 players), bracket view with SVG connectors, vertical centering, left/right navigation, desktop zoom/centering
- **Phase 5**: PWA (manifest + service worker), export

## UI language

All UI text is in Polish. Identifiers and code comments are in English. The original project specification is in `dart-tournament-briefing.md`.

## Testing

Playwright is installed (`node_modules/playwright`) but no proper E2E tests exist. `test-run.mjs` is an ad-hoc smoke test that is currently broken (see Commands note above). Manual testing: open `index.html` directly in a browser.

## CSS theme variables

All colors and radii come from `:root` custom properties in `css/style.css`. Use these when adding new UI elements:

| Variable | Value | Role |
|---|---|---|
| `--bg` | `#0d0d0d` | Page background |
| `--surface` | `#1a1a1a` | Cards, modals |
| `--border` | `#333` | Borders |
| `--accent` | `#e63946` | Red — danger, active highlights |
| `--text` | `#f0f0f0` | Primary text |
| `--text-muted` | `#888` | Secondary text |
| `--active-glow` | `#e63946` | Active player border glow |
| `--green` | `#2a9d4f` | Positive actions (create, win banner) |
| `--radius` | `12px` | Standard border radius |

## Design specs

`docs/superpowers/specs/` contains feature design specs (HTML mockups + decisions). `docs/superpowers/plans/` contains implementation plans. These are reference docs — authoritative source is the code.

## Progress tracking

`PROGRESS.md` is a running changelog — each section describes what was built and bugs fixed for that sprint. The task checklist at the bottom is historical; several items marked `[ ]` are already implemented.
