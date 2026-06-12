# Format grupy+drabinka — specyfikacja

## Zakres

Dwa powiązane zadania realizowane razem (A jest prereq dla B):

- **A** — zwiększenie limitu graczy w turnieju z 10 do 16
- **B** — nowy format turnieju `'groups'`: faza grupowa (round-robin) + faza pucharowa (single-elimination)

---

## A — Limit graczy: 3→16

### Zmiany

**`js/tournament.js`** — walidacja w handlerze `t-next-1`:
```js
if (!raw || isNaN(val) || val < 3 || val > 16) {
  err.textContent = 'Wpisz liczbę graczy od 3 do 16.';
```

**`index.html`** — input kroku 1:
```html
<input id="t-num-players" type="number" min="3" max="16" placeholder="np. 6">
<p class="step-hint">Minimum: 3 &nbsp;·&nbsp; Maksimum: 16</p>
```

Brak innych zmian — `renderStep4Players` renderuje tyle wierszy ile `numPlayers`; drag-drop i datalisty działają dla dowolnej N. Bracket dla 16 graczy = `bracketSize: 16` = 0 bye (potęga 2). Bracket dla 11–15 graczy = `bracketSize: 16` z 1–5 bye.

---

## B — Format grupy+drabinka

### Model danych

#### `config` (nowe pola vs istniejące)

```js
{
  numPlayers, format: 'groups', matchConfig,
  // Nowe:
  groups: [
    { name: 'A', playerIndices: [0,1,2], advanceCount: 2 },
    { name: 'B', playerIndices: [3,4,5], advanceCount: 2 },
  ],
  winPoints: 3,
  lossPoints: 0,
  thirdPlaceMatch: false,   // mecz o 3. miejsce (tylko gdy totalAdvancing ≥ 4)
  bracketSize: 4,           // next power-of-2 ≥ Σ advanceCount
}
```

`groups[i].playerIndices` — indeksy do `tournament.players[]`. Gracze przypisywani w kolejności wizarda (seeding kolejność) lub losowo (seeding losuj).

#### Mecze — jedno `matches[]` z polem `phase`

```js
// Mecz grupowy
{
  p1, p2,                   // indeksy do tournament.players[]
  winner: null | 0 | 1,
  legs: [null,null], sets: [null,null], avgs: [null,null], stats: [null,null],
  starter: null | number,
  phase: 'group',
  groupIndex: 0,            // indeks do config.groups[]
  isBye: false,
}

// Mecz pucharowy (istniejący kształt + phase)
{
  p1, p2,                   // null = TBD (jeszcze nie znany)
  winner: null | 0 | 1,
  legs, sets, avgs, stats, starter,
  phase: 'bracket',
  round: 0,                 // 0 = R1 (półfinał przy 4 graczach), 1 = finał
  slot: 0,                  // 0-based pozycja w rundzie
  isBye: false | true,      // bye (p2=null, winner=0)
  isThirdPlace: false | true, // mecz o 3. miejsce
}
```

Mecze pucharowe tworzone przy `createTournament()` jako TBD (`p1=null, p2=null, winner=null`) i obsadzane przez `finalizeGroupPhase()` po zakończeniu wszystkich meczów grupowych.

---

### Wizard — zmiany

#### Krok 1 — bez zmian poza walidacją (limit → 16)

#### Krok 2 — tile `groups` odblokowany

Tile `data-format="groups"` (już istnieje w HTML jako `disabled`) — usunąć `disabled` + podpiąć obsługę. Przy wybraniu `groups`: ukryć opcje ligi (rundy, punkty), pokazać hint o konfiguracji w nowym kroku.

#### Krok 3 — bez zmian (variant, sets, legs, in/out/dart-limit)

#### Nowy krok 3b — konfiguracja grup (tylko format `groups`)

Wstawiony po kroku 3, przed krokiem 4. Wstępnie: `showWizardStep(4)` przesuwa się na `showWizardStep(5)` dla formatu `groups`; krok 3b to `wstep-3b`.

```
┌─────────────────────────────┐
│  Krok 3b z 5                │
│  🎯 Konfiguracja grup       │
│                             │
│  Liczba grup                │
│  [1] [2] [3] [4]            │  ← seg. buttons; tylko opcje gdzie
│                             │    numPlayers/numGroups ≥ 3
│  Gracze awansujący          │
│  z każdej grupy  [ 2 ▲▼ ]  │  ← min 2, max floor(groupSize-1)
│                             │
│  Pkt za zwycięstwo [ 3 ▲▼ ]│
│  Pkt za porażkę    [ 0 ▲▼ ]│
│                             │
│  [ ] Mecz o 3. miejsce      │  ← visible gdy totalAdvancing ≥ 4
│                             │
│  ← Powrót    DALEJ →        │
└─────────────────────────────┘
```

**Dostępne liczby grup** dla N graczy = `{k : k ≥ 1 AND floor(N/k) ≥ 3}`.

Przykłady:
| N | Możliwe grupy |
|---|---|
| 3–5 | [1] |
| 6–8 | [1, 2] |
| 9–11 | [1, 3] |
| 12 | [1, 2, 3, 4] |
| 13–14 | [1, 2] (bo 13/3=4 ale 13/4=3.25 < 3 nie przechodzi; 14/4=3.5) → [1,2,4 nie,3 nie bo 14/3=4.7 ok, 14/4=3.5 ok] |
| 15 | [1, 3, 5] |
| 16 | [1, 2, 4] |

*Uwaga: podział nie musi być równy. Gracze dzieleni po kolei: grupy 0..k-2 mają `ceil(N/k)` graczy, ostatnia `floor(N/k)` lub odwrotnie — wyrównanie tak by różnica nie > 1.*

**`advanceCount`** — wspólna dla wszystkich grup (UI: jeden number input). Min 2, max `floor(groupSize - 1)` (przynajmniej 1 gracz musi odpaść). Zmiana liczby grup → recalc `advanceCount` max.

#### Krok 4 — gracze (tylko nieznaczne zmiany)

- Brak BYE toggle (bye tylko dla formatu bracket)
- Seeding: `kolejność` / `losuj` (bez zmian)
- Przycisk `👁 Podgląd grup` (zamiast `👁 Podgląd drabinki`) — pokazuje modal z grupami i przypisanymi graczami
- Walidacja: wszystkie pola wypełnione, brak duplikatów

**Podział graczy na grupy** (krok 4):
- `seeding = 'fixed'` — po kolei: gracz 0→A, 1→B, 2→C, ..., k→A, k+1→B itd. (snake draft lub round-robin fill)
- `seeding = 'random'` — losowanie wykonywane przy kliknięciu „Utwórz turniej" (Fisher-Yates na indeksach, potem round-robin fill)

---

### `createTournament()` — logika dla `groups`

```js
function createTournament(config, players) {
  // ... istniejący kod dla liga/bracket ...
  if (config.format === 'groups') {
    // 1. Oblicz grupy (podział graczy)
    const groups = _buildGroups(players, config.numGroups, config.seeding);
    config.groups = groups;

    // 2. Generuj mecze grupowe
    const groupMatches = [];
    groups.forEach((g, gi) => {
      generateSchedule(g.playerIndices.length, 'single').forEach(pair => {
        groupMatches.push({
          p1: g.playerIndices[pair[0]], p2: g.playerIndices[pair[1]],
          winner: null, legs:[null,null], sets:[null,null],
          avgs:[null,null], stats:[null,null], starter:null,
          phase:'group', groupIndex: gi, isBye: false
        });
      });
    });

    // 3. Generuj mecze pucharowe jako TBD
    const totalAdvancing = groups.reduce((s,g) => s + g.advanceCount, 0);
    const bracketSize = nextPowerOf2(totalAdvancing);
    config.bracketSize = bracketSize;
    const bracketMatches = generateBracketTBD(bracketSize);

    // 4. Mecz o 3. miejsce (opcjonalnie)
    if (config.thirdPlaceMatch && totalAdvancing >= 4) {
      bracketMatches.push({ ..., isThirdPlace: true });
    }

    return { ..., matches: [...groupMatches, ...bracketMatches] };
  }
}
```

**`_buildGroups(players, numGroups, seeding)`** — zwraca `config.groups[]` z `playerIndices`. Round-robin fill: gracz i → grupa `i % numGroups`. Wyrównuje nierówne grupy (ostatnia może mieć +1 gracza).

**`generateBracketTBD(bracketSize)`** — tworzy puste mecze pucharowe (p1/p2 = null) z odpowiednimi `round`/`slot`. Sloty z bye (gdy totalAdvancing < bracketSize) ustawiane z `winner:0, isBye:true` już na starcie.

---

### `finalizeGroupPhase()` — obsadzanie bracket po fazach grupowych

Wywoływane gdy `isGroupPhaseComplete(tournament) === true` (wszystkie group-matches mają `winner !== null`).

```js
function finalizeGroupPhase(tournament) {
  // 1. Oblicz standings każdej grupy (pts → legDiff → avg → seedingIndex)
  const groupStandings = tournament.config.groups.map((g, gi) =>
    computeGroupStandings(tournament, gi)
  );

  // 2. Wyłoń awansujących: groupStandings[gi].slice(0, advanceCount)
  // Etykieta: gracze[0] z grupy A = 'A1', gracze[1] z grupy B = 'B2' itd.

  // 3. Seeding piłkarski → obsadź sloty bracket
  // Schemat: 1. miejsca grup vs 2. miejsca grup (cross-bracket)
  // A1 slot 0, B2 slot 1 → mecz 0
  // B1 slot 2, A2 slot 3 → mecz 1 (itd. dla większych bracketów)
  _seedBracketFromGroups(tournament, groupStandings);

  // 4. Jeśli były bye w bracket (bracketSize > totalAdvancing) — już ustawione
}
```

**Seeding piłkarski** (dla 2 grup, 2 awansuje = 4 graczy, bracketSize=4):
- Slot 0: A1, Slot 1: B2 → SF1
- Slot 2: B1, Slot 3: A2 → SF2

Dla 4 grup, 2 awansuje = 8 graczy, bracketSize=8:
- SF1: A1 vs D2, SF2: B1 vs C2, SF3: C1 vs B2, SF4: D1 vs A2

Dla bracketów z bye (np. 6 awansuje, bracketSize=8): 2 bye-sloty rozłożone jak w istniejącym `generateBracket()`.

---

### Widok turnieju (`screen-tournament-view`)

#### Faza grupowa (zakładka Grupy)

Dla każdej grupy: nagłówek „Grupa X — awansują N" + tabela `standings-table` z kolumnami `# | Gracz | M | W | L | Legi | Avg | Pkt`. Grupy ułożone jedna pod drugą. Wiersze z awansującymi mają klasę `advancing` (zielone tło, zielona kropka). Tiebreaker: pts → legDiff → avg → seedingIndex (jak liga).

Szerokość: `max-width: 600px; margin: 0 auto` (identycznie jak `.tv-standings`).

#### Zakładka Mecze

Sekcje nagłówkowe `tv-matches-section` dla każdej grupy, potem (po zakończeniu fazy grupowej) sekcja „Faza pucharowa". Siatka meczów `matches-grid` — identyczna jak liga. Mecze grupowe uporządkowane: A#1, B#1, A#2, B#2... (naprzemienne). Kliknięcie nierozegraneego → starter modal. Kliknięcie rozegraneego → stats modal (jak liga).

#### Zakładka Drabinka

`renderBracketScreen()` — bez zmian, z jedną modyfikacją: podczas fazy grupowej karty TBD wyświetlają etykiety `A1`, `B2` zamiast pustego `—`. Etykieta generowana w `_buildBracketCard()` gdy `p1/p2 === null`.

Kliknięcie meczu pucharowego (gdy p1/p2 znane, match jeszcze nie rozegrany) → starter modal (istniejący flow).

#### Status bar (`tv-info-bar`)

Podczas fazy grupowej: `● Faza grupowa · X/Y meczów rozegranych`
Podczas fazy pucharowej: `● Faza pucharowa`

---

### Harmonogram meczów — minimalizacja czekania

Mecze grupowe interleave: `flatMap` rund per-grupę:

```js
// rounds[r] = lista meczów z rundy r we wszystkich grupach
const rounds = [];
for (let r = 0; r < maxRound; r++) {
  groups.forEach((g, gi) => {
    if (groupRounds[gi][r]) rounds.push(groupRounds[gi][r]);
  });
}
```

`generateSchedule` zwraca mecze w kolejności rund round-robina. Interleave rund między grupami = każdy gracz czeka nie dłużej niż 1 mecz przed swoim następnym.

---

### Funkcje nowe/zmienione

| Funkcja | Plik | Opis |
|---|---|---|
| `_buildGroups(players, numGroups, seeding)` | `league.js` | Podział graczy na grupy |
| `generateBracketTBD(bracketSize)` | `league.js` | Puste mecze pucharowe |
| `isGroupPhaseComplete(tournament)` | `league.js` | Czy wszystkie group-matches zakończone |
| `computeGroupStandings(tournament, gi)` | `league.js` | Standings jednej grupy |
| `finalizeGroupPhase(tournament)` | `league.js` | Obsadza bracket po fazach grupowych |
| `_seedBracketFromGroups(tournament, standings)` | `league.js` | Seeding piłkarski |
| `renderGroupsTab(tournament)` | `league.js` | Renderuje zakładkę Grupy |
| `renderTournamentViewScreen()` | `league.js` | Rozszerzona o obsługę format=groups |
| `initTournamentWizard()` | `tournament.js` | Odblokowuje tile groups, dodaje krok 3b |
| `showWizardStep()` | `tournament.js` | Obsługuje krok 3b |
| `_buildGroupsConfig()` | `tournament.js` | Czyta wartości kroku 3b |
| `renderGroupPreviewModal()` | `tournament.js` | Podgląd grup w kroku 4 |
| `createTournament()` | `league.js` | Obsługuje format=groups |

---

### Zmiany w `index.html`

- `t-num-players`: `max="10"` → `max="16"`, hint tekst
- Tile `groups`: usunąć `disabled`, dodać `data-format="groups"`
- Nowy `wstep-3b`: segmented buttons liczby grup, input advanceCount, pkt W/L, checkbox thirdPlaceMatch
- Nowy `#modal-group-preview`: podgląd grup w kroku 4

---

### Istniejące funkcje bez zmian

`renderBracketScreen`, `generateBracket`, `generateSchedule`, `computeStandings` (liga), `buildBracketRound`, `buildBracketConnectorSvg`, `_computeByeSuggestion`, `_assignRandomByes` — wszystkie działają dla formatu bracket bez modyfikacji.

---

### Fazy turnieju

```
Faza grupowa
  → wszystkie group-matches winner !== null
  → finalizeGroupPhase() obsadza bracket
  → isGroupPhaseComplete() === true

Faza pucharowa
  → identyczna jak istniejący format bracket
  → advanceBracketWinner() propaguje wyniki
  → mecz o 3. miejsce (jeśli thirdPlaceMatch)
  → tournament.status = 'finished' gdy finał rozegrany
```

---

### Ograniczenia / decyzje projektowe

- **Jeden `advanceCount` dla wszystkich grup** — brak "ustaw inne dla różnych grup" w v1 (zbyt złożone UI)
- **Snake draft NIE** — prosty round-robin fill: gracz i → grupa `i % numGroups`
- **Tiebreaker** — identyczny jak liga: pts → legDiff → avg → seedingIndex
- **Seeding piłkarski** — dla bracketów z nieparzystą liczbą grup lub bye: bye-sloty rozłożone wg istniejącej logiki `generateBracket`
- **Mecz o 3. miejsce** — tylko gdy `totalAdvancing ≥ 4`; między przegranymi SF (round przed finałem)
- **Live standings w trakcie meczu** — przycisk `📊 Tabela live` w headerze gry (istniejący `btn-live-standings`) pokazuje standings bieżącej grupy (nie całego turnieju)
