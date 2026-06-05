# Tournament View — Design Spec
**Date:** 2026-06-05
**Scope:** Tournament list screen + league standings table (Tabela tab). Matches view (Mecze tab) is a separate future task.

---

## Overview

Clicking TURNIEJ on the home screen opens a **tournament list screen** instead of going directly to the wizard. From there the user can open an existing tournament or start a new one. Each tournament has a persistent view with two tabs — **Tabela** (this task) and **Mecze** (next task).

---

## Navigation Flow

```
Home
 └─ TURNIEJ ──→ screen-tournament-list
                 ├─ Nowy turniej ──→ screen-tournament (wizard, step 1 now has name field)
                 │                   └─ UTWÓRZ TURNIEJ ──→ screen-tournament-view
                 └─ click existing ──→ screen-tournament-view
```

`screen-tournament-view` has two tabs. Tabela is always shown first. Mecze tab is visible but disabled for now.

Back button on `screen-tournament-list` → `SCREENS.HOME`.
Back button on `screen-tournament-view` → `SCREENS.TOURNAMENT_LIST`.

---

## Wizard Change — Step 1

Step 1 gains a **name input** above the player count field:

- Label: "Nazwa turnieju"
- Text input, maxlength 40, placeholder "np. Liga czwartkowa"
- Required — DALEJ blocked until non-empty
- Stored in `tournamentConfig.name`

Player count field moves below, label and hint unchanged.

---

## Data Model

### localStorage key: `dart_tournaments`

Array of tournament objects. Written on `createTournament()`, updated after each match result (next task).

```js
{
  id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
  name: 'Liga czwartkowa',        // from wizard step 1
  status: 'active',               // 'active' | 'finished'
  createdAt: 1717600000,          // Unix timestamp
  config: {                       // copy of tournamentConfig at creation
    numPlayers, format, leagueRounds,
    winPoints, lossPoints, matchConfig
  },
  players: [                      // in seeding order (random or ordered per wizard)
    { name: 'Jan', primaryDouble: 40, secondaryDouble: 32 },
    // … numPlayers entries
  ],
  matches: [
    {
      p1: 0, p2: 1,       // indices into players[]
      winner: null,       // null = not yet played; 0 = p1 won; 1 = p2 won
      legs: [null, null], // [legsWonByP1, legsWonByP2]; null until played
      avgs: [null, null], // [avgMatchP1, avgMatchP2]; null until played
    },
    // …all scheduled matches pre-generated at tournament creation
  ]
}
```

### Schedule generation (at UTWÓRZ TURNIEJ)

For `leagueRounds: 'single'` with N players: generate all N*(N-1)/2 unique pairs (i < j).
For `leagueRounds: 'double'`: each pair appears twice — once as (i, j) and once as (j, i).
Insertion order: pairs sorted by (p1, p2) ascending — simple and deterministic. All matches pre-inserted with `winner: null`. The Mecze tab (next task) will group matches into rounds visually.

### Limits

| Bucket | Limit | Enforcement |
|---|---|---|
| `status: 'active'` | max 5 | "Nowy turniej" button disabled with tooltip "Maksymalna liczba aktywnych turniejów: 5" |
| `status: 'finished'` | max 40 | On save: if count > 40, remove oldest finished tournament |

---

## Screen: Tournament List (`screen-tournament-list`)

**Header:** secondary-header with `← Powrót` (→ HOME) and title "Turnieje" centered.

**Body (scrollable):**

1. Section label "W toku" — list of active tournaments, newest first
2. Section label "Zakończone" — list of finished tournaments, newest first
3. Empty state (no tournaments at all): grey centered text "Brak turniejów" + large "Nowy turniej" button

**Tournament card** (clickable row → `screen-tournament-view`):
```
[card]
  Name (bold)
  format · N graczy · variant · legs    ← meta line, muted
  ▶ W toku — X/Y meczów               ← active
  ✓ Zakończony · Wygrał: <name>        ← finished
  [✕]                                  ← delete button, far right
```

Delete button: reuses `.btn-delete-record` class (transparent, red border, `✕`, `padding: 5px 11px`).
Delete → modal `modal-delete-tournament` with confirmation (same pattern as `modal-delete-record`).

**Footer (sticky bottom):**
Button "+ Nowy turniej" (`.btn btn-primary`).
When 5 active tournaments: button has `disabled` attribute + cursor-not-allowed style.

---

## Screen: Tournament View (`screen-tournament-view`)

**Header:** secondary-header with `← Turnieje` (→ TOURNAMENT_LIST) and tournament name centered.

**Tab bar:**
```
[ Tabela ]  [ Mecze ]
```
Tabela: active (red underline). Mecze: disabled (grey, `pointer-events: none`).

**Info bar** (below tabs, dark surface):
`<variant> · First to <legs> · <checkoutMode>  ·  <N> graczy`
`<leagueRounds label> · <played>/<total> meczów rozegranych`

**Standings table:**

| # | Gracz | M | W | L | Legi | Avg | Pkt |
|---|---|---|---|---|---|---|---|

- `#` — rank (1-based). Gold colour `#f5c218` for rank 1.
- `Gracz` — player name, left-aligned. Gold colour for rank 1. Bold.
- `M` — matches played (non-null winners)
- `W` — wins
- `L` — losses
- `Legi` — displayed as `"W-L"` string (e.g. `9-2`). Colour: green (`var(--green)`) if legs won > legs lost; red (`var(--accent)`) if legs won < legs lost; muted (`#888`) if equal. `—` if no matches played.
- `Avg` — average of match averages for this player. Orange (`var(--accent2)`). `—` if no matches.
- `Pkt` — points earned. Red (`var(--accent)`). Bold.

Tied groups (same Pkt AND same leg diff): subtle green background `#0e1a0e` on tied rows.

---

## Standings Calculation

Computed fresh on every render from `tournament.matches[]`. No caching.

```js
function computeStandings(tournament) {
  const { players, matches, config } = tournament;

  // Init row per player
  const rows = players.map((p, i) => ({
    index: i, name: p.name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  // Accumulate from played matches
  for (const m of matches) {
    if (m.winner === null) continue;
    const [w, l] = m.winner === 0 ? [m.p1, m.p2] : [m.p2, m.p1];
    rows[w].M++; rows[w].W++; rows[w].pts += config.winPoints;
    rows[l].M++; rows[l].L++; rows[l].pts += config.lossPoints;
    rows[m.p1].legsWon += m.legs[0]; rows[m.p1].legsLost += m.legs[1];
    rows[m.p2].legsWon += m.legs[1]; rows[m.p2].legsLost += m.legs[0];
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  // Sort: pts desc → legDiff desc → avg desc → seeding index asc
  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index; // seeding order as final tiebreaker
  });

  return rows;
}
```

`legDiff` = `legsWon - legsLost`. Tied rows: same pts AND same legDiff (avg still differs → position differs, but both get green background if pts+legDiff match).

---

## Architecture

### New files
- `js/league.js` — `computeStandings()`, `generateSchedule()`, `createTournament()`, `loadTournaments()`, `saveTournaments()`, `deleteTournament()`, `renderTournamentListScreen()`, `renderTournamentViewScreen()`

### Modified files
| File | Change |
|---|---|
| `index.html` | Add `screen-tournament-list`, `screen-tournament-view`, `modal-delete-tournament`; add name input to wizard step 1; add `<script src="js/league.js">` before `tournament.js` |
| `js/ui.js` | Add `TOURNAMENT_LIST: 'tournament-list'`, `TOURNAMENT_VIEW: 'tournament-view'` to `SCREENS` |
| `js/tournament.js` | Read name field in step 1 validation; save to `tournamentConfig.name`; on UTWÓRZ TURNIEJ: call `createTournament(tournamentConfig)` then navigate to `SCREENS.TOURNAMENT_VIEW` |
| `js/app.js` | Wire TURNIEJ button to `SCREENS.TOURNAMENT_LIST`; wire list screen events; wire modal confirm/cancel |
| `css/style.css` | Tournament list card, standings table, tab bar, info bar, tie-highlight row |

### Module load order
`checkouts → stats → game → players → history → board → ui → league → tournament → app`

---

## Out of Scope (this task)

- Mecze tab content (next task)
- Launching a match from the tournament
- Marking a tournament as finished
- "Kto zaczyna" dialog per match
