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
| `js/checkouts.js` | `CHECKOUT_TABLE` (2–170), `getCheckoutHint()`, `getAllCheckoutHints()`, `DOUBLE_FINISHES` set, `isDoubleAttemptScore()`, `closeDoubleLabel(val)`, `findCheckoutPath(score, targetDouble, dartsLeft)` |
| `js/stats.js` | Per-player stat objects, `recordVisit()`, `recordDart()`, `recordLegWin()`, `recordLegWinByLimit()`, `getFirst9Average()`, `getMatchAverage(stats)`, `getDoublePercentage(stats)` |
| `js/game.js` | `createMatch()`, `applyVisitScore()`, `finalizeLeg()`, `finalizeLimitLeg()`, bust/checkout logic, `getValidClosingDarts()`, `getValidOpeningDarts()`, `_achievable2Darts()` |
| `js/players.js` | Persistent player profiles CRUD — `loadPlayers()`, `createPlayer()`, `updatePlayer()`, `renamePlayer()`, `deletePlayer()`, `renderPlayersScreen()`, `populatePlayerSuggestions()`; also defines `escapeHtml(str)` — used cross-module |
| `js/history.js` | Match history (capped at 100) — `saveMatchToHistory()`, `deleteHistoryRecord()`, `clearHistory()`, `renderHistoryScreen()`, `renderHistoryDetailScreen()` |
| `js/board.js` | Canvas 2D dartboard (Mode C) — `initBoard()`, `_drawBoard()`, click/touch hit detection; `adjustBoardSize(delta)` — zmiana rozmiaru o ±20 px (max ±100 px), `_boardSizeDelta` persystuje w sesji |
| `js/ui.js` | `showScreen()`, `renderGameScreen()`, `showWhichDartDialog()`, `showBust()`, `showLastVisitToast()`, `openModal(id)`, `closeModal(id)`; defines `SCREENS` constant; `renderGameScreen()` syncs `#game-compact-bar` (names, scores, active-player class) and drives `#leg-indicator` marquee |
| `js/league.js` | Tournament data layer — `loadTournaments()`, `saveTournaments()`, `generateSchedule()`, `createTournament()`, `deleteTournament()`, `deleteAllTournamentsByStatus(status)`, `computeStandings()`, `computeLiveStandings()`; bracket — `nextPowerOf2()`, `computeRoundName()`, `_bracketCenterY()`, `advanceBracketWinner()`, `generateBracket(players)`, `_computeSnakePairs(n)` (R1 seeding for even brackets — no byes), `renderBracketScreen(tournament, container?)`, `_buildBracketCard()`, `buildBracketRound()`, `buildBracketConnectorSvg()`; groups — `_buildGroups(players, numGroups, advanceCountOrArray, sequential?)`, `_generateGroupMatches()`, `_generateBracketTBD(groups, thirdPlaceMatch)`, `computeGroupStandings(tournament, gi)`, `isGroupPhaseComplete(tournament)`, `finalizeGroupPhase(tournament)`, `_advancingBg(rank, advCount)`, `_renderGroupStandingsHTML()`, `computeLiveGroupStandings()`, `renderGroupsTab(tournament)`, `renderGroupMatchesTab(tournament)`, `_buildGroupMatchCell()`; rendering — `renderTournamentListScreen()`, `buildTournamentCard()`, `renderTournamentViewScreen()`, `_setGroupsTab(name)` (shows/hides Grupy/Mecze gr./Drabinka panels), `renderTournamentMatchesScreen()`; per-phase formats — `getMatchConfig(tournament, match)` (picks phase-specific config; falls back to `matchConfig`; use `String(match.round)` for JSON-safe lookup), `_formatLabel(config)` (returns HTML: `custom format` or `variant · legs`) |
| `js/tournament.js` | Tournament wizard — `tournamentConfig` global, `initTournamentWizard()`, `showWizardStep()`, `_computeByeSuggestion(numPlayers)`, `_updateByeCounter(numByes)`, `_updateByeHint()`, `_updateByeActionBtn()`, `_assignRandomByes(players)`, `renderStep4Players(savedValues)`, `_getStep4Values()`, `_initStep4DragDrop()` (mouse + touch listeners; `touchmove` uses `visibility:hidden`+`elementFromPoint` for hit-testing), `_updateStep4Datalists()`, `buildDoublesOptions()`, `validateStep4()`, `_updateBracketThirdPlaceWrap()`; groups — `_initStep3bGroupButtons()`, `_updateStep3bGroupsInfo()`, `_updateAdvanceCountMax()`, `_updateAdvanceCountLock()`, `_updateThirdPlaceVisibility()`, `_updateAdvancePerGroupUI()`, `_rebuildPerGroupAdvanceInputs()`, `_validateStep3b()`, `_refreshGroupPreviewBody()`, `renderGroupPreviewModal()`; per-phase formats — `_getWizardPhases()` (derives phase list from `tournamentConfig`; calls `nextPowerOf2`/`computeRoundName` globals), `_renderPhaseMatchForms()`, `_buildPhaseCard()`, `_buildPhaseFormHTML(mc)`, `_readPhaseCardConfig(card)`, `_writePhaseCardConfig(card, mc)`, `_updatePhaseChips(card)` (fires on collapse), `_legsChipLabel(mc)`, `_checkoutChipLabel(mode)`; all wizard step event listeners |
| `js/app.js` | Event wiring, `startMatch()`, `submitSummaryScore()`, `submitDart()`, `localStorage` save/load; owns `undoStack` (capped at 20); `_returnToTournamentTab(t, matchIndex)` — post-match tab selection |

### Key globals defined per module (all loaded into `window`)

- `game.js`: `INPUT_MODES`, `CHECKOUT_MODES`, `IN_MODES`, `VALID_DART_VALUES`
- `ui.js`: `SCREENS`
- `checkouts.js`: `CHECKOUT_TABLE`, `DOUBLE_FINISHES`
- `league.js`: `_activeTournament`, `TOURNAMENTS_KEY`, `CHECKOUT_LABELS`
- `tournament.js`: `tournamentConfig`
- `app.js`: `match`, `undoStack`, `IMPOSSIBLE_VISIT_SCORES`, `pendingCheckoutScore`, `pendingWinnerIndex`, `pendingDeleteRecordId`, `pendingEditPlayerId`, `pendingDeletePlayerId`, `pendingDeleteTournamentId`, `pendingTournamentMatch`, `pendingTournamentStarterData`, `pendingOpenScore`, `pendingOpenPlayerIndex`, `pendingLimitWinnerIndex`

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
  dartLimitVisits: null | number,  // dartLimit/3; null = no limit
  matchOver, winner, inputMode,
  tournamentMatchContext: null | { tournamentId, matchIndex, p1Idx, p2Idx }  // set by startTournamentMatch
}
```

`playerState.legOpened` is `false` when inMode is double-in/master-in and the player has not yet opened (thrown a valid opening dart) in the current leg. Bust logic and `applyVisitScore` leave score unchanged while `legOpened === false`.

## Key game rules

- **Bust**: thrown > remaining, or remaining − thrown = 1 → revert to pre-visit score
- **Double-out**: final dart must land on D1–D20 or Bull (50) — values in `DOUBLE_FINISHES`
- **Master-out**: final dart can be double or triple
- **Personalized checkout hints**: `renderCheckoutHint()` in `ui.js` tries `findCheckoutPath()` to the player's `primaryDouble` (yellow), then `secondaryDouble` (blue), then falls back to `CHECKOUT_TABLE`
- **Live leg average**: from the 2nd leg onwards, `renderGameScreen()` appends `(X.XX)` in green next to the overall average; computed as `legPoints / (legDarts / 3)`; hidden when `legDarts === 0`
- **Sticky game header**: `.game-header` is `position: sticky; top: 0`. When `#game-sticky-sentinel` (zero-height div before `.players-row`) leaves the viewport, `IntersectionObserver` (set up in `app.js` `DOMContentLoaded`) adds `.compact` to `.game-header`, revealing `#game-compact-bar` — a 3-column grid (`#gcb-card-0`, `.gcb-center`, `#gcb-card-1`) mirroring the player cards; active player gets `.gcb-active` bottom glow. `showScreen(SCREENS.GAME)` resets `.compact` and `.collapsed`.
- **Leg indicator marquee**: `#leg-indicator` inside `.leg-indicator-wrap` (overflow hidden); `renderGameScreen()` measures `scrollWidth − clientWidth` and if > 4px sets `--ticker-end` CSS variable and adds `.scrolling` class, which triggers `@keyframes leg-ticker` infinite marquee. Class removed and re-evaluated on every render.
- **Collapsible quick-score buttons**: `#btn-toggle-quick` (absolute, bottom of `.score-center`) toggles `collapsed` class on `#quick-scores-wrap` (contains both `.quick-scores` rows) via `max-height: 0` transition. `#checkout-hint` is outside the wrap and always visible. Arrow `.tq-arrow` rotates 180° via CSS when `.collapsed`.
- **"Trafione double" stat**: shown only when `checkoutMode === 'double'`; hidden for straight-out and master-out in both post-match stats (`ui.js`) and match history detail (`history.js`)
- **Summary mode**: after checkout, dialog asks which dart (1/2/3) closed the leg; `getValidClosingDarts()` filters valid options. Same "which dart opened?" dialog for double-in/master-in.
- **Dart-by-dart / Board mode**: buffer accumulates 3 darts, auto-submits; double-attempt detection per dart
- **Leg start alternation**: the player who starts each leg alternates from the previous leg
- **Leg/set/match result modal** (`#modal-leg-result`): shown by `showLegResultDialog(winnerName, num, type, callback)` in `ui.js`. Has two buttons: "↩ Cofnij" (`#btn-leg-result-undo`) and "Dalej" (`#btn-next-leg`). Cofnij calls `undoLastVisit()` — closes all modals, restores pre-visit state, re-renders game screen. Disabled when `undoStack` is empty (checked at modal open time).
- **Dart visit limit**: optional per-leg visit cap (30–54 darts, step 3) configured in setup (`#sel-dart-limit`) and tournament wizard step 3 (`#t-dart-limit`). Stored as `match.dartLimitVisits = dartLimit/3`. After every committed visit `checkLegVisitLimit()` tests if both players' `history.length >= dartLimitVisits` — if so, `#modal-dart-limit` opens asking who won. Winner awarded via `finalizeLimitLeg()` / `recordLegWinByLimit()` (no `fastestLeg` / `highestCheckout` update). Toast "Ostatnie podejście" shown via `showLastVisitToast()` as a separate `#last-visit-toast` element (blue) when active player has exactly `dartLimitVisits-1` visits. If bust happens on the same turn, both toasts show stacked (`#bust-toast` on top shifted up 44 px, `#last-visit-toast` below shifted down 44 px via `.stacked` CSS class).

## Screens

The app loads with `screen-home` as the initial active screen. Navigation flows:

`home` → `tournament-list` → `tournament-view` (liga standings); `home` → `setup` → `game` → `stats`; `players` and `history` accessible from `home`. Tournament wizard (`tournament`) accessible from `tournament-list`.

### Tournament flow

```
home → tournament-list → [tournament-view | tournament wizard → tournament-view]
```

**`screen-tournament-list`**: lists active (max 5) and finished (max 40) tournaments. "Nowy turniej" button disabled at limit. Delete single with `modal-delete-tournament`. Delete all active with `modal-delete-all-active`, delete all finished with `modal-delete-all-finished` (buttons rendered dynamically in section headers, delegated click handling). Rendered by `renderTournamentListScreen()` in `league.js`.

**`screen-tournament-view`**: for liga — tab bar (Tabela + Mecze). Standings rendered by `renderTournamentViewScreen(tournament)` — sort: pts desc → legDiff desc → avg desc → seeding index asc. Tied rows get green background `#0e1a0e`. Finished tournaments show gold/silver/bronze medal colors for top 3. Matches tab rendered by `renderTournamentMatchesScreen(tournament)` — 3-col grid, unplayed sorted by longest-waiting pair, clicking unplayed opens starter modal, clicking played opens stats. For bracket — no tabs; shows `#tv-bracket` only, rendered by `renderBracketScreen(tournament)`. When `config.thirdPlaceMatch` is true, the third-place match card is appended to the final column (`finalColEl`) below `bk-body`; semi-final losers are propagated in `saveTournamentMatchResult`. For groups — 3-tab bar (Grupy / Mecze gr. / Drabinka): Grupy tab shows per-group standings tables (`renderGroupsTab`); Mecze gr. tab shows **only group phase matches** sectioned by group name (`renderGroupMatchesTab`) — bracket matches not shown here; Drabinka tab shows the bracket rendered by `renderBracketScreen` — includes the third-place match card **inside the final column** (appended to `finalColEl` below `bk-body`) when `config.thirdPlaceMatch` is true; hidden together with the final column when navigating left. Niezafinalizowane mecze bye (przed `finalizeGroupPhase`) dostają klasę `tbd-card` zamiast `bye-card` w `_buildBracketCard`. Single-group format with `thirdPlaceMatch`: the third-place match in `_generateBracketTBD` gets `p1Label: 'A(advCount+1)', p2Label: 'A(advCount+2)'` (e.g. `A3`/`A4`); `finalizeGroupPhase` resolves these to real player indices from group standings. `computeRoundName` returns `'Finał'` for `numRounds === 1` (single-match bracket, e.g. 3-player groups tournament). Rematch detection in `openTournamentStarterModal` is liga-only — bracket/groups never trigger the rematch flow. Live standings update after every group match; bracket tab accessible throughout (TBD until `finalizeGroupPhase()`). Post-match navigation: after a group match → Mecze gr. tab; after a bracket match → Drabinka tab (`_returnToTournamentTab` in `app.js`). Info bar shows total played/total matches across all phases.

### Tournament wizard (`screen-tournament`)

4-step wizard (5 steps for groups format), state in `tournamentConfig`, steps managed by `showWizardStep(n)` in `tournament.js`:

| Step | Content |
|---|---|
| 1 | Tournament name (max 40) + number of players (3–16) |
| 2 | Format (liga, bracket, or groups+bracket); rounds (single/double, liga only); win/loss points (liga only). Format settings share the same vertical space via CSS grid overlay. Bracket format shows `#bracket-settings` div with hint text + `#t-bracket-third-place-match` checkbox inside `#t-bracket-third-place-wrap` — the wrap is hidden when `numPlayers < 4` (managed by `_updateBracketThirdPlaceWrap()`). For bracket/groups: `#t-phase-formats-wrap` checkbox „Różne formaty meczów dla każdej fazy" sets `tournamentConfig.usePhaseFormats`; hidden for liga. |
| 3 | Match settings — variant, sets, legs, in-mode, out-mode (no starter — asked per match). **When `usePhaseFormats` is true**: single form (`#t-single-match-form`) is hidden and replaced by collapsible per-phase cards (`#t-phase-forms`) rendered by `_renderPhaseMatchForms()`. Card order: group phase (groups format only) → bracket rounds → 3rd-place match. Each card has 3 summary chips (updated on collapse). Copy button propagates config to all subsequent phases. |
| 3b | **Groups format only** — number of groups (valid k where `3 ≤ floor(n/k) ≤ 8`); advance count per group (global input or per-group toggle with individual inputs, limit `groupSize−1`; minimum 2 when `n === 3 && numGroups === 1`); win/loss points; optional third-place match (shown when `total >= 3` OR `k === 1 && numPlayers − total >= 2`). `_initStep3bGroupButtons()` builds group-count buttons dynamically. |
| 4 | Player name inputs + 2 doubles selects each; seeding choice; BYE toggles (bracket/groups only); "👁 Podgląd drabinki" preview button (bracket/groups only); UTWÓRZ TURNIEJ button |

`validateStep4()` enables UTWÓRZ TURNIEJ when: all name fields non-empty, no duplicates (case-insensitive), and (bracket only) `byeCount === numByes`. Duplicate fields get red border + dark background. For bracket with `numByes > 0`: a counter bar (`#t-bye-counter`) above the player list shows current vs required count; green when correct, red otherwise. Below the hint text (`#t-bye-hint`), a `#t-bye-action-btn` button toggles between "Odznacz wszystkie" (when ≥1 BYE active; clears all) and "Wylosuj wolne losy" (when 0 BYE; randomly assigns `numByes`). Managed by `_updateByeActionBtn()`, called from `_updateByeCounter()`. BYE toggles pre-filled by `_computeByeSuggestion(n)` (interleaving formula) on fresh render; preserved from `savedValues` on drag-drop re-render. Each player input has its own `<datalist id="t-datalist-N">` managed by `_updateStep4Datalists()`. On UTWÓRZ click: reads `_getStep4Values()` (includes `bye` flag), Fisher-Yates shuffle applied if seeding=random (bye travels with player), for bracket reads `#t-bracket-third-place-match` into `tournamentConfig.thirdPlaceMatch`, unknown players added to `dart_players`, `createTournament(config, players)` called (strips `bye` before storage), navigates to `TOURNAMENT_VIEW`.

### Tournament data shape (`dart_tournaments` array)

```js
{
  id, name, status: 'active'|'finished', createdAt,
  config: {
    numPlayers, format,                          // format: 'liga' | 'bracket' | 'groups'
    // liga only:
    leagueRounds: 'single'|'double', winPoints, lossPoints,
    // bracket only:
    bracketSize,                                 // next power-of-2 ≥ numPlayers
    thirdPlaceMatch: boolean,
    matchConfig: {            // shared by bracket and groups (used when usePhaseFormats: false, or as fallback)
      variant: number,        // e.g. 501
      totalSets: number,      // 1 = no-set format
      totalLegs: number,
      inMode: 'straight'|'double'|'master',
      checkoutMode: 'straight'|'double'|'master',
      dartLimit: null|number, // raw dart count (e.g. 36); divide by 3 → dartLimitVisits
    },
    // bracket and groups only (optional):
    usePhaseFormats: boolean,           // true = per-phase configs active
    phaseMatchConfigs: {                // present only when usePhaseFormats: true
      group:      matchConfig,          // groups format only
      '0':        matchConfig,          // bracket R0 (string key — JSON round-trip)
      '1':        matchConfig,          // R1, etc.
      thirdPlace: matchConfig,          // optional
    } | undefined,
    // groups only:
    groups: [{ name, playerIndices, advanceCount }],  // one entry per group
    winPoints, lossPoints,                       // group-phase points
    thirdPlaceMatch: boolean,
    bracketSize,                                 // for the bracket phase
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
    // groups format adds:
    phase:        'group'|'bracket',
    groupIndex:   number,            // group matches only
    isThirdPlace: boolean,           // bracket matches only
    p1Label:      string|null,       // seed label before finalization (e.g. 'A1', 'B2')
    p2Label:      string|null,
  }]
}
```
`winner: 0` means `players[p1]` won; `winner: 1` means `players[p2]` won. `legs[0]` = legs won by p1, `legs[1]` = legs won by p2.

Groups format: `matches[]` contains both group matches (`phase:'group'`) and bracket matches (`phase:'bracket'`). `p1Label`/`p2Label` hold seed labels (e.g. `'A1'`) until `finalizeGroupPhase()` resolves them to real `p1`/`p2` player indices after all group matches are played. For single-group format with `thirdPlaceMatch`, the third-place bracket match gets `p1Label: 'A(advCount+1)', p2Label: 'A(advCount+2)'` (e.g. `'A3'`/`'A4'`); `finalizeGroupPhase` resolves these from group standings (non-advancing positions).

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
- **Phase 4** ✅: Single-elimination bracket — bye handling (3–10 players), bracket view with SVG connectors, vertical centering, left/right navigation, desktop zoom/centering; dart visit limit; groups+bracket format — group wizard step (3b), per-group standings, group matches tab, bracket finalization, third-place match
- **Phase 5**: PWA (manifest + service worker), export

## UI language

All UI text is in Polish. Identifiers and code comments are in English. The original project specification is in `dart-tournament-briefing.md`.

## Testing

Playwright is installed (`node_modules/playwright`) but no proper E2E tests exist. `test-run.mjs` is an ad-hoc smoke test that is currently broken (see Commands note above). Manual testing: open `index.html` directly in a browser.

**Debug autofill button**: a hidden 15×15 button (`#btn-debug-autofill`) sits in the top-left corner of the tournament wizard card (`index.html:623`). Clicking it fills player name fields from saved profiles. Wired in `tournament.js`. Remove before Phase 5 / release.

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
