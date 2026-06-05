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
| `js/game.js` | `createMatch()`, `applyVisitScore()`, `finalizeLeg()`, bust/checkout logic, `getValidClosingDarts()`, `getValidOpeningDarts()` |
| `js/players.js` | Persistent player profiles CRUD — `loadPlayers()`, `createPlayer()`, `updatePlayer()`, `renamePlayer()`, `deletePlayer()`, `renderPlayersScreen()`, `populatePlayerSuggestions()` |
| `js/history.js` | Match history (capped at 100) — `saveMatchToHistory()`, `deleteHistoryRecord()`, `renderHistoryScreen()`, `renderHistoryDetailScreen()` |
| `js/board.js` | Canvas 2D dartboard (Mode C) — `initBoard()`, `_drawBoard()`, click/touch hit detection |
| `js/ui.js` | `showScreen()`, `renderGameScreen()`, `showWhichDartDialog()`, modal helpers; defines `SCREENS` constant |
| `js/league.js` | Tournament data layer — `loadTournaments()`, `saveTournaments()`, `generateSchedule()`, `createTournament()`, `deleteTournament()`, `computeStandings()`; rendering — `renderTournamentListScreen()`, `buildTournamentCard()`, `renderTournamentViewScreen()` |
| `js/tournament.js` | Tournament wizard — `tournamentConfig` global, `initTournamentWizard()`, `showWizardStep()`, `renderStep4Players()`, `buildDoublesOptions()`, `validateStep4()`; all wizard step event listeners |
| `js/app.js` | Event wiring, `startMatch()`, `submitSummaryScore()`, `submitDart()`, `localStorage` save/load; owns `undoStack` (capped at 20) |

### Key globals defined per module (all loaded into `window`)

- `game.js`: `INPUT_MODES`, `CHECKOUT_MODES`, `IN_MODES`, `VALID_DART_VALUES`
- `ui.js`: `SCREENS`
- `checkouts.js`: `CHECKOUT_TABLE`, `DOUBLE_FINISHES`
- `league.js`: `_activeTournament`, `TOURNAMENTS_KEY`, `CHECKOUT_LABELS`
- `tournament.js`: `tournamentConfig`
- `app.js`: `match`, `undoStack`, `IMPOSSIBLE_VISIT_SCORES`, `pendingDeleteTournamentId`

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

**`screen-tournament-view`**: tab bar (Tabela active, Mecze disabled). Info bar with match config summary. Standings table rendered by `renderTournamentViewScreen(tournament)`. Standings computed fresh from `matches[]` by `computeStandings()` — sort: pts desc → legDiff desc → avg desc → seeding index asc. Tied rows (same pts+legDiff) get green background `#0e1a0e`.

### Tournament wizard (`screen-tournament`)

4-step wizard, state in `tournamentConfig`, steps managed by `showWizardStep(n)` in `tournament.js`:

| Step | Content |
|---|---|
| 1 | Tournament name (max 40) + number of players (3–6 now) |
| 2 | Format (liga only active); rounds (single/double); win/loss points |
| 3 | Match settings — variant, sets, legs, in-mode, out-mode (no starter — asked per match) |
| 4 | Player name inputs + 2 doubles selects each; seeding choice; UTWÓRZ TURNIEJ button |

`validateStep4()` enables UTWÓRZ TURNIEJ when all name fields are non-empty. On click: Fisher-Yates shuffle applied if seeding=random; unknown players added to `dart_players`; `createTournament(config, players)` called; navigates to `TOURNAMENT_VIEW`.

### Tournament data shape (`dart_tournaments` array)

```js
{
  id, name, status: 'active'|'finished', createdAt,
  config: { numPlayers, format, leagueRounds, winPoints, lossPoints, matchConfig },
  players: [{ name, primaryDouble, secondaryDouble }],  // in seeding order
  matches: [{ p1, p2, winner: null|0|1, legs: [null,null], avgs: [null,null] }]
}
```
`winner: 0` means `players[p1]` won; `winner: 1` means `players[p2]` won. `legs[0]` = legs won by p1, `legs[1]` = legs won by p2.

## Project phases

- **Phase 1** ✅: X01 game screen — setup, game loop, bust, checkout, summary stats
- **Phase 2** ✅: Player profiles, match history, interactive dartboard (Mode C)
- **Phase 3** 🔄: Round-robin tournament — home screen, wizard, tournament list, standings table done; matches view + play flow pending
- **Phase 4**: Elimination bracket + group stage
- **Phase 5**: PWA (manifest + service worker), export

## UI language

All UI text is in Polish. Identifiers and code comments are in English. The original project specification is in `dart-tournament-briefing.md`.

## Testing

Playwright is installed (`node_modules/playwright`) but no proper E2E tests exist. `test-run.mjs` is an ad-hoc smoke test that is currently broken (see Commands note above). Manual testing: open `index.html` directly in a browser.

## Progress tracking

See `PROGRESS.md` for a full summary of what is built, known bugs fixed, and what remains per phase.
