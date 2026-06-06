# DartApp — stan projektu

## Stack

Vanilla HTML5 + CSS3 + JavaScript (bez frameworków, bez build step).
Otwierać `index.html` bezpośrednio w przeglądarce. Dane w `localStorage`.

---

## Co zostało zbudowane (Faza 1 — ukończona)

### Ekran ustawień
- Wybór wariantu X01 (101 / 201 / 301 / 401 / 501 / 601 / 701 / 801 / 901 / 1001)
- Wybór liczby legów (1 / Best of 3 / 5 / 7 / 9)
- Tryb wyjścia: Double-out (domyślny), Master-out, Straight-out
- Imiona graczy (do 20 znaków)
- Wybór gracza zaczynającego (Gracz 1 / Losuj / Gracz 2)

### Ekran gry
- Nagłówek: przycisk wyjścia z meczu, numer lega, przycisk cofnięcia tury
- Pasek wyniku meczu (wyniki legów obu graczy)
- Karty graczy: imię, aktualny wynik, liczba lotek, średnia, wynik ostatniej tury (z oznaczeniem BUST)
- Aktywna karta podświetlona czerwoną kreską; nieaktywna przyciemniona

#### Rząd podpowiedzi checkout
- Rząd 1 przycisków szybkiego wyniku nad podpowiedzią: 41, 45, 60, 100, 140, 180
- Podpowiedź checkout (26px, zielona) wyświetlana gdy wynik ≤ 170; placeholder gdy brak; brak przesunięcia layoutu
- Rząd 2 przycisków szybkiego wyniku pod podpowiedzią: 26 (żółty), 55, 57, 76, 85, 133
- Kliknięcie przycisku szybkiego wyniku odejmuje wartość od wyniku gracza i kończy turę (obsługuje bust i checkout)

#### Tryby wprowadzania
- **Suma** — pole numeryczne + klawiatura ekranowa (cyfry, DEL, OK); walidacja zakresu 0–180 i niemożliwych sum
- **Lotka po lotce** — wybór mnożnika (Single / Double / Triple), siatka pól 1–20 + Bull + Miss, sloty bufora (3 lotki), auto-zatwierdzenie po 3. lotce, cofnięcie ostatniej lotki
- **Tarcza** — interaktywny Canvas 2D; kliknięcie/dotknięcie wyznacza sektor i mnożnik; wspólny bufor lotek z trybem Lotka-po-lotce

#### Logika gry
- Bust: wynik > pozostało, wynik = 1, niedozwolone wyjście (np. nie-double w double-out)
- Checkout: dialog "Którą lotką zamknąłeś lega?" z filtrowanymi opcjami (1/2/3)
- Alternacja gracza zaczynającego każdy leg
- Undo: cofnięcie ostatniej zatwierdzonej tury (stos do 20 stanów)
- Zapis i odczyt niedokończonego meczu z localStorage

#### Historia rzutów
- Ostatnie 8 tur aktywnego gracza; bust wyróżniony czerwonym kolorem

### Ekran statystyk (po meczu)
- Baner zwycięzcy
- Tabela na gracza:
  - Legi wygrane
  - Średnia 3-lotek (uwzględnia rzeczywistą liczbę lotek, w tym zamknięcie na 1./2. lotce)
  - Średnia pierwszych 9 (pierwsze ≤3 wizyty, dzielona przez rzeczywistą liczbę lotek)
  - Najwyższe zamknięcie
  - Najszybszy leg (liczba lotek)
  - Trafione double (% oraz X/Y)

### Modale
- Potwierdzenie wyjścia z meczu
- Wybór lotki zamykającej leg
- Wynik lega / koniec meczu
- Toast BUST (animowany, centralny)

---

## Zmiany wizualne

- Przyciski "✕ Menu" i "↩ Cofnij turę" w nagłówku ekranu gry są bardziej widoczne:
  Menu — ciemnoczerwone tło, czerwona ramka i tekst; Cofnij turę — granatowe tło, niebieska ramka i tekst
- Imiona graczy nad licznikiem: font 24px, font-weight 700
- Przycisk szybkiego wyniku 95 (dawniej 76), kolejność w rzędzie: 26, 55, 57, 85, 95, 133
- Przycisk szybkiego wyniku 180 podświetlony na pomarańczowo
- Przyciski trybu wprowadzania (Suma / Lotka po lotce / Tarcza): mobilnie 12px / padding 5px, desktop 20px / padding 8px
- Przyciski szybkiego wyniku (poza 26 i 180): tło #343d3d, ramka #566a6a
- Historia meczów: imię lewego gracza wyrównane do prawej (lustrzane), "↑" zastąpione "najw. zamknięcie", liczby jaśniejszym kolorem (#c8c8c8)
- Historia meczów: kliknięcie w rekord otwiera ekran szczegółowych statystyk (identyczny układ jak po meczu)
- Interaktywna tarcza: pola double i triple poszerzone ~3× dla wygody dotykowej na mobile
- Ekran statystyk pomeczowych: karty graczy układają się jeden pod drugim dla szerokości 600–844px; obok siebie tylko przy ≥844px
- Historia meczów: przycisk usuń przy rekordzie — większy (padding 5px 11px, font 0.9rem), czerwona ramka i tekst; przycisk "Usuń wszystkie" też czerwony
- Historia meczów: modal potwierdzenia przed usunięciem pojedynczego meczu (zamiast natywnego `confirm()`)
- Historia meczów: modal potwierdzenia przed usunięciem całej historii (zamiast natywnego `confirm()`)
- Historia rzutów: obie kolumny wyświetlane jednocześnie — gracz 1 po lewej, gracz 2 lustrzanie po prawej (tekst i ramka przy prawej krawędzi); przerwa 10px; bez nagłówków z imionami
- Nagłówek ekranu gry: wskaźnik lega zmieniony na format `Leg 3 (First to 5)`
- Format legów: zmieniony z "Best of X" na "First to X" (1–16); domyślnie First to 2; gracz wygrywa po osiągnięciu wymaganej liczby legów
- Tryb wejścia w lega: Double-in (otwierasz podwójną) i Master-in (otwierasz podwójną lub potrójną); domyślnie Straight-in; konfigurowane przed meczem
  - Tryb suma: wpisanie 0 = zmarnowana tura (3 lotki); wpisanie >0 → dialog "którą lotką otworzyłeś?" (opcje filtrowane jak w zamknięciu)
  - Tryb lotka po lotce / tarcza: każda lotka sprawdzana na bieżąco; nie-otwierające = 0 w buforze; 3 zmarnowane = koniec tury
  - Undo poprawnie przywraca `legOpened=false`; nowy leg resetuje blokadę
- Ekran statystyk po meczu: informacje o trybie meczu (wariant, First to X, tryb wejścia, tryb wyjścia) w zielonym polu pod zwycięzcą; desktop — każda informacja w osobnej linii; mobile — jedna linia z separatorem ·
- Historia meczów: tryb wejścia (DIn/MIn) widoczny w liście i widoku szczegółowym; Straight-in (domyślny) ukryty
- Wynik meczu przeniesiony z paska nad kartami graczy do kolumny środkowej między kartami; nazwy graczy z paska usunięte (redundantne — widoczne na kartach); siatka `.players-row` zmieniona na `1fr auto 1fr`
- Mobile < 420px, tryb setowy: czcionka wyniku zmniejszona do `1.1rem` (z `2rem`), `letter-spacing: 0`, padding `4px` — zapobiega wyjeżdżaniu karty gracza 2 poza ekran; tryb legowy bez zmian
- Mobile < 600px: czcionka nazwy gracza zmniejszona do `18px` (z `24px`), czcionka licznika do `2.4rem` (z `3.2rem`) — poprawia czytelność w wariancie 1001 i przy dłuższych imionach
- Tarcza (tryb Board): automatyczny resize przy zmianie orientacji/rozmiaru okna — listener `resize` z debounce 100ms, aktywny tylko gdy canvas jest widoczny
- Tarcza: pole outu (pas z numerami) poszerzone — dysk tła `R*1.15→1.22`, pozycja numerów `R*1.08→1.13`, czcionka numerów `R*0.09→0.10`
- Tarcza: rozmiar na ekranach < 600px zwiększony do max 340px (z 320px)
- Średnia 3-lotkowa i średnia pierwszych 9 uwzględniają zmarnowane tury w trybie blokady (0 punktów, 3 lotki); wyświetlana od pierwszej rzuconej lotki nawet przy wyniku 0,00
- Filtrowanie opcji "którą lotką otworzyłeś lega?" — dialog pokazuje tylko matematycznie możliwe warianty (analogicznie do filtrowania przy zamknięciu); jeśli tylko jedna opcja — dialog pomijany

---

## Naprawione błędy

- Przegrywający gracz w formacie 1-leg pokazywał 0,00 w Średniej pierwszych 9 —
  naprawione: `getFirst9Average` uwzględnia `legFirst9Scores` gdy gracz nie wygrał żadnego lega
- Przycisk OK w trybie sumy wyjeżdżał poza ekran na wąskich telefonach —
  naprawione: `min-width: 0` na inpucie, `flex-shrink: 0` na przycisku OK,
  `min-width: 0` + `overflow: hidden` na `.quick-scores`
- Średnia 3-lotek i Średnia pierwszych 9 różniły się gdy mecz skończył się w ≤9 lotkach —
  naprawione trzy powiązane błędy w `stats.js`:
  1. `totalDartsThrown` w trybie sumarycznym nie był korygowany o numer lotki zamykającej (zawsze +3); teraz odejmuje `3 − dartNumber`
  2. `getFirst9Average` dzieliło przez liczbę wizyt (×3 darts każda) zamiast przez rzeczywistą liczbę lotek — teraz śledzone jest `legFirst9Darts` (rzeczywista suma lotek w pierwszych ≤3 wizytach)
  3. Po wygraniu lega `legFirst9Scores` nie było czyszczone, więc `getFirst9Average` liczyło dane raz z `stats.legs` i raz z `legFirst9Scores`; teraz `recordLegWin` czyści `legFirst9Scores` po zapisaniu snapshotа
- Trafione double w trybie sumarycznym nie liczyły oczywistych prób na podwójnej poza zamknięciem lega —
  naprawione: `recordSummaryDoubleAttempts` (stats.js) wywołuje się w dwóch jednoznacznych przypadkach:
  1. bust gdy remaining ∈ DOUBLE_FINISHES → +3 próby, 0 trafień
  2. score=0 gdy remaining ∈ DOUBLE_FINISHES → +3 próby, 0 trafień;
  przypadki niejednoznaczne (np. remaining=55, score=15) są ignorowane
- Trafione double w trybie sumarycznym nie były liczone dla gracza przegrywającego lega —
  naprawione: warunek rozszerzono z `score=0` na każdą wizytę gdy remaining ∈ DOUBLE_FINISHES
  (gracz na podwójnej strzelający singla zamiast dubla również ma naliczone 3 próby)
- Trafione double przy zamknięciu lega liczone błędnie dla wyników wymagających setupu —
  naprawione: jeśli checkoutScore ∉ DOUBLE_FINISHES (np. 51), pierwsza lotka była setupem,
  więc próby na doublu = dartNumber − 1 (np. 51 zamknięte dart3 → 1/2; dart2 → 1/1);
  dla bezpośrednich podwójnych (checkoutScore ∈ DOUBLE_FINISHES, np. 40) bez zmian (dartNumber prób)
- Podpowiedź checkout w trybie Tarcza wyświetlała się nawet gdy pozostałej wartości nie dało się zamknąć w liczbie pozostałych lotek (np. 170 przy 1 rzucie) —
  naprawione: `renderCheckoutHint` w `ui.js` teraz przekazuje `3 − dartBuffer.length` do `getCheckoutHint` dla trybów BOARD i DART_BY_DART tak samo
- Modal "Którą lotką zamknąłeś lega?" — dodano przycisk "Cofnij" na dole modala; cofa ostatnią turę i pozwala wpisać wynik od nowa

---

## Ulubione podwójne (2026-06-03)

### Nowe funkcje
- **Profile graczy — ulubione podwójne**: każdy gracz może mieć przypisaną primary i secondary podwójną (D1–D20 lub Bull); wybór z listy przy dodawaniu gracza
- **Edycja gracza przez modal**: kliknięcie ikony edycji otwiera modal z polem nazwy i selectami podwójnych (zamiast natywnego `prompt()`); kliknięcie ikony usuwania otwiera modal potwierdzenia (zamiast natywnego `confirm()`)
- **Personalizowana podpowiedź checkout**: podczas meczu hint preferuje ścieżkę do primary podwójnej gracza (wyróżniona żółtym), jeśli niemożliwa — do secondary (niebieski), jeśli żadna — standardowy hint bez koloru
- **`findCheckoutPath(score, targetDouble, dartsLeft)`** w `checkouts.js` — algorytmiczny generator ścieżek do dowolnej podwójnej; zastępuje potrzebę ręcznego rozszerzania tabeli; Bull (50) dopuszczony jako lotka setupowa (np. Bull+D16=82, Bull+Bull+D16=132)

### Zmiany w plikach
- `js/checkouts.js` — dodano `SETUP_DARTS_ORDERED`, `SETUP_DART_LABEL`, `closeDoubleLabel()`, `findCheckoutPath()`; Bull dodany do listy lotek setupowych
- `js/players.js` — `createPlayer()` przyjmuje `primaryDouble`/`secondaryDouble`; nowa funkcja `updatePlayer()`; `renderPlayersScreen()` wyświetla ulubione podwójne w wierszu gracza
- `js/game.js` — `createMatch()` przechowuje `playerFavorites` w stanie meczu
- `js/ui.js` — `buildHintHtml()` owijający zamknięcie kolorowym `<span>`; przepisany `renderCheckoutHint()` z logiką primary→secondary→fallback; switch z `textContent` na `innerHTML`
- `js/app.js` — `startMatch()` wyszukuje profile graczy i przekazuje favorites do meczu; `addPlayerFromInput()` odczytuje selecty podwójnych; modale edycji i usuwania gracza
- `index.html` — selecty D1–D20/Bull w formularzu dodawania gracza i w modalu edycji; modale `modal-edit-player` i `modal-delete-player`
- `css/style.css` — style selectów podwójnych (dark theme, custom arrow), `.edit-player-form`, centrowanie nagłówka "Gracze", `.secondary-body` wyśrodkowane z `max-width: 420px`

---

## Format setowy (2026-06-03)

### Nowe funkcje
- **Format setowy**: mecz można rozgrywać jako "First to N sets, each set first to M legs"; konfiguracja w ustawieniach meczu
- **Select "Liczba setów"** (1–10) na ekranie setup, obok "Wariant"; etykieta "Liczba legów" zmienia się dynamicznie na "Legi na seta" gdy wybrano > 1 set
- **Wynik meczu w formacie setowym**: `(setsWon[0]) legsWonInSet[0]:legsWonInSet[1] (setsWon[1])` — sety w nawiasach, legi bieżącego seta w środku
- **Wskaźnik postępu**: `Set N | Leg M (First to X)` gdy format setowy; bez zmian przy 1 secie
- **Dialog po secie**: "Gracz X wygrał set N!" gdy wygrany set (nie cały mecz)
- **Alternacja starterów setów**: gracz zaczynający set alternuje między setami (standard PDC/WDF); wewnątrz seta legi alternują jak dotychczas
- **Undo** przez granice setów: stos undo zawiera `setsWon`, `legsWonInSet`, `currentSet`, `setStartingPlayer`
- **Statystyki po meczu**: wiersz "Sety wygrane" nad "Legi wygrane" w trybie setowym; format meczu wyświetla "First to N sets × M legs"
- **Historia meczów**: wynik setowy w liście (`setsWon[0] : setsWon[1]`); tag formatu `3S×3L` obok wariantu; widok szczegółowy z wierszem "Sety wygrane" i opisem formatu
- **Wsteczna kompatybilność**: stare zapisy w localStorage bez `totalSets` traktowane jako 1 set — zachowanie identyczne z poprzednim

### Zmiany w plikach
- `js/game.js` — `createMatch()` +5 pól (`totalSets`, `currentSet`, `setsWon`, `legsWonInSet`, `setStartingPlayer`); `finalizeLeg()` przepisany z warstwą logiki setów, zwraca flagę `setOver`
- `index.html` — nowy `<select id="sel-sets">` (1–10) w `form-row` z wariantem; `sel-legs` przeniesiony do własnego `form-group` poniżej z `id="lbl-legs"` na etykiecie
- `js/app.js` — `startMatch()` czyta `sel-sets`; listener dynamicznej etykiety `sel-legs`; `pushUndoState`/`undoLastVisit` z nowymi polami; `handleLegClose()` obsługuje `setOver`
- `js/ui.js` — `showLegResultDialog()` nowa sygnatura `(name, num, type, cb)` z typami `'match'`/`'set'`/`'leg'`; `renderGameScreen()` format setowy; `renderStatsScreen()` wiersz sety + label formatu
- `js/history.js` — `saveMatchToHistory()` zapisuje `totalSets`/`setsWon`; lista i szczegóły historii wyświetlają dane setowe

---

## Faza 3 — wizard turnieju (2026-06-05)

### Nowe funkcje
- **Ekran główny (Home)**: nowy ekran startowy z przyciskami MECZ, TURNIEJ, Gracze, Historia meczów; przyciski Gracze/Historia przeniesione z ekranu ustawień; przycisk Powrót na ekranie ustawień meczu
- **Wizard turnieju** (4 kroki, `js/tournament.js`):
  - **Krok 1**: nazwa turnieju (max 40 znaków) + liczba graczy (3–6 na razie, docelowo 64); walidacja inline
  - **Krok 2**: format turnieju — Liga (Round-Robin) aktywna; Grupy+Drabinka i Drabinka zablokowane; wybór jednej lub dwóch rund; konfigurowalne punkty za wygraną/przegraną (domyślnie 2/0)
  - **Krok 3**: ustawienia meczów (wariant, sety, legi, tryb wejścia/wyjścia); etykieta "Legi na seta" gdy sety > 1; brak "kto zaczyna" — pytanie pojawi się przed każdym meczem
  - **Krok 4**: N bloków graczy (imię + ulub. podwójna 1. + ulub. podwójna 2.); wybór rozstawienia (Losuj / Użyj kolejności); przycisk UTWÓRZ TURNIEJ aktywny gdy wszystkie pola wypełnione
- **Auto-wypełnianie podwójnych**: wpisanie imienia zapisanego gracza automatycznie ustawia jego ulubione podwójne (z możliwością zmiany)
- **Auto-zapis nowych graczy**: UTWÓRZ TURNIEJ dodaje do `dart_players` graczy, którzy nie byli jeszcze zapisani (bez podwójnych ustawionych w turnieju)
- **Wskaźnik kroków**: 4 kropki na górze wizarda (szare → ciemnoczerwone → czerwone)
- **Nawigacja**: Powrót na krok 1 → lista turniejów; Wstecz zachowuje wpisane dane

### Nowe pliki (Faza 3 — wizard)
- `js/tournament.js` — `tournamentConfig`, `initTournamentWizard()`, `showWizardStep()`, `renderStep4Players()`, `buildDoublesOptions()`, `validateStep4()`

### Zmiany w plikach (Faza 3 — wizard)
- `index.html` — nowy `<section id="screen-home">`, `<section id="screen-tournament">` z 4 krokami; skrypt `tournament.js` między ui.js a app.js; przycisk TURNIEJ odblokowany
- `js/ui.js` — `SCREENS` rozszerzone o `HOME` i `TOURNAMENT`
- `js/app.js` — routing ekranu głównego (MECZ, TURNIEJ, Gracze, Historia); "Wyjdź z meczu" i "Nowy mecz" wracają do HOME
- `css/style.css` — style ekranu głównego, wizarda turnieju (karta, kropki, kafelki formatu, bloki graczy, przyciski nawigacji); `.btn-create-tournament` zielony gdy aktywny

### Naprawione błędy (Faza 3 — wizard)
- Belki Gracze/Historia: `position: absolute` z `.btn-back` na ekranie setup wyciekało na belki drugorzędnych ekranów — zawężono do `.setup-header .btn-back`
- Tytuł "Historia meczów" wyśrodkowany w belce (identycznie jak "Gracze")

---

## Faza 3 — lista turniejów i tabela klasyfikacji (2026-06-05)

### Nowe funkcje
- **Lista turniejów** (`screen-tournament-list`): ekran między przyciskiem TURNIEJ a wizardem; sekcje "W toku" (max 5) i "Zakończone" (max 40, najstarsze usuwane automatycznie); stan pusty "Brak turniejów"; kliknięcie karty otwiera widok turnieju; usuwanie z potwierdzeniem (modal); przycisk "Nowy turniej" zablokowany przy 5 aktywnych
- **Widok turnieju** (`screen-tournament-view`): zakładki Tabela (aktywna) i Mecze (zablokowane — kolejne zadanie); pasek info z wariantem, legami, trybem wyjścia, liczbą graczy, rundami, postępem meczów
- **Tabela klasyfikacji**: kolumny # · Gracz · M · W · L · Legi · Avg · Pkt; lider oznaczony złotym kolorem (#f5c218) gdy rozegrano ≥1 mecz; kolor legów (zielony/szary/czerwony wg bilansu); Avg pomarańczowy; Pkt czerwony; remisowe wiersze (taki sam bilans pkt i legów) — subtelne zielone tło #0e1a0e
- **Algorytm rankingu**: punkty malejąco → bilans legów (W−L) malejąco → średnia turniejowa malejąco → kolejność rozstawienia (deterministyczny tiebreaker)
- **Generowanie harmonogramu**: przy UTWÓRZ TURNIEJ — wszystkie pary N*(N-1)/2 (single) lub N*(N-1) (double); mecze pre-inserowane z `winner: null`
- **Zapis turniejów**: `dart_tournaments` w localStorage; każdy turniej: id, name, status, createdAt, config, players (w kolejności rozstawienia po opcjonalnym losowaniu), matches[]
- **Desktop responsive**: lista i tabela ograniczone do `max-width: 600px; margin: 0 auto`; na ekranach ≥600px fonty tabeli powiększone o 20%

### Nowe pliki (Faza 3 — liga)
- `js/league.js` — `loadTournaments()`, `saveTournaments()`, `generateSchedule()`, `createTournament()`, `deleteTournament()`, `computeStandings()`, `renderTournamentListScreen()`, `buildTournamentCard()`, `renderTournamentViewScreen()`

### Zmiany w plikach (Faza 3 — liga)
- `index.html` — `screen-tournament-list`, `screen-tournament-view`, `modal-delete-tournament`; pole nazwy w kroku 1 wizarda; skrypt `league.js` między ui.js a tournament.js
- `js/ui.js` — `SCREENS` rozszerzone o `TOURNAMENT_LIST` i `TOURNAMENT_VIEW`
- `js/tournament.js` — walidacja nazwy w kroku 1; `t-back-1` → TOURNAMENT_LIST; `btn-create-tournament` buduje tablicę players, stosuje Fisher-Yates shuffle przy losowym rozstawieniu, wywołuje `createTournament()` i nawiguje do widoku
- `js/app.js` — TURNIEJ → TOURNAMENT_LIST; okablowanie listy, widoku i modalu usuwania; `pendingDeleteTournamentId`
- `css/style.css` — style listy turniejów, widoku turnieju, tabeli klasyfikacji, media query dla fontu tabeli na desktopie

---

---

## Faza 3 — widok meczów i rozgrywka turniejowa (2026-06-05)

### Nowe funkcje
- **Zakładka Mecze** w widoku turnieju: siatka 3-kolumnowa z kartami meczów; sekcje "Do rozegrania" i "Rozegrane"; sortowanie wg najdłużej czekającej pary
- **Modal startera** przed każdym meczem: wybór gracza zaczynającego (Gracz 1 / Losuj / Gracz 2) + START; rewanż automatycznie przypisuje starter drugiego gracza z info-boxem zamiast wyboru
- **Rozgrywanie meczów turniejowych**: mecz uruchamia się przez istniejący silnik gry; wynik zapisywany do turnieju (nie do `dart_history`); turniej oznaczany jako `finished` gdy wszystkie mecze rozegrane
- **Statystyki po meczu turniejowym**: ekran statystyk z przyciskiem "Wróć do meczów"; kliknięcie ukończonego meczu w zakładce Mecze otwiera te same statystyki
- **Tabela live** (`📊 Tabela live`): przycisk widoczny podczas meczu turniejowego; modal z bieżącą klasyfikacją uwzględniającą tymczasowe punkty i aktualną średnią turnieju (wliczając mecz w toku); znacznik LIVE obok graczy; na mobile — zielona kropka 4×4px zamiast tekstu
- **Kolory medalowe w tabeli**: po ukończeniu wszystkich meczów — złoty (#f5c218) dla 1. miejsca, srebrny (#a8a9ad) dla 2., brązowy (#cd7f32) dla 3.
- **Podświetlenie wyższej średniej w kartach meczów**: pomarańczowy kolor dla gracza z lepszą średnią (niezależnie od wyniku meczu)
- **Drag & drop w kroku 4 wizarda**: bloki graczy można przeciągać uchwytem ⠿ — zmiana kolejności przebudowuje bloki zachowując wpisane wartości; uchwyt grab/grabbing, wizualne podświetlenie celu
- **Historia rzutów w meczu**: bust zawsze wyświetla `0 BUST` (nie wartość rzuconych lotek)
- **Ograniczenie szerokości widoków**: historia meczów, szczegóły historii, statystyki po meczu (`max-width: 972px`), widok meczów turnieju (`max-width: 600px`) — wszystkie wyśrodkowane na szerokich ekranach

### Naprawione błędy (Faza 3 — mecze)
- Kolory medalowe nie działały — `.standings-table td` (`0,1,1`) nadpisywało `.pos-gold` (`0,1,0`); naprawione przez podniesienie specyficzności do `.standings-table td.pos-gold` (`0,2,1`)
- `turniej.status !== 'finished'` dla starszych turniejów — dodano fallback `tournament.matches.every(m => m.winner !== null)`
- Impossible opening scores w trybie double-in: `getValidOpeningDarts` używało `score - d <= 120` zamiast weryfikować osiągalność 2 rzutami; nowa funkcja `_achievable2Darts()` eliminuje fałszywie-pozytywne wyniki dla 162, 165, 168, 171–180 i innych (np. 159)
- Fallback `[1,2,3]` w `getValidOpeningDarts` maskował niemożliwe wartości (np. 180 w double-in); usunięty — puste `[]` + guard w `submitSummaryScore` blokuje wynik
- `escapeHtml()` na nazwach graczy przed `textContent` powodowało double-encoding (`&amp;`); usunięte z `_buildMatchCell` i `renderLiveStandingsModal`
- Tab state reset przy powrocie do widoku turnieju — otwieranie turnieju B po zakładce Mecze turnieju A zostawiało złamany widok

### Zmiany w plikach (Faza 3 — mecze)
- `js/league.js` — `generateSchedule()` dodaje `sets/stats: [null,null]`; `renderTournamentMatchesScreen()`; `_buildMatchCell()`, `_buildMatchPlayerRow(name, score, avg, rowClass, avgBest)`; `computeLiveStandings(tournament, liveData)`; kolory medalowe w `renderTournamentViewScreen()`; podświetlenie wyższej średniej
- `js/app.js` — `pendingTournamentMatch`, `pendingTournamentStarterData`; `openTournamentStarterModal()` z detekcją rewanżu; `startTournamentMatch()` z zapisem `starter`; `saveTournamentMatchResult()` z `m.starter`; `openTournamentMatchStats()`; `renderLiveStandingsModal()` z turniej-avg; obsługa `btn-new-match` i `btn-exit-confirm` dla kontekstu turniejowego; `loadFromLocalStorage()` przywraca kontekst po przeładowaniu
- `js/tournament.js` — `renderStep4Players(savedValues)` z uchwytem drag; `_getStep4Values()`; `_initStep4DragDrop()`
- `js/game.js` — `_achievable2Darts()`; poprawiony `getValidOpeningDarts()` (dart 1 check); usunięty fallback
- `js/ui.js` — bust w historii rzutów zawsze `0 BUST`
- `index.html` — `#tv-matches`, `#modal-tournament-starter`, `#modal-live-standings`, `#btn-live-standings`, `.game-header-right`
- `css/style.css` — `.matches-grid`, `.match-card`, `.match-player-row`, `.mpavg.avg-best`; `.modal-inner-rel`, `.btn-modal-corner-close`; `.modal-starter-opt`, `.modal-starter-info`; `.live-badge`, `.live-col`; `.drag-handle`, `.player-block-top`, `.player-block.dragging/.drag-over`; `.pos-silver/bronze`, `.name-silver/bronze`; `max-width` na history/stats/matches

---

## Poprawki UI i wizard — lista turniejów / wizard krok 4 (2026-06-06)

### Nowe funkcje
- **Licznik przy sekcjach listy turniejów**: etykiety „W toku" i „Zakończone" zawierają teraz licznik `X / 5` i `X / 40` wyrównany do prawej; gdy limit osiągnięty — licznik zmienia kolor na czerwony (`--accent`)
- **Przycisk „Nowy turniej" przy limicie**: zamiast domyślnego `opacity` przeglądarka, disabled przyjmuje styl `btn-secondary` z muted tekstem — wyraźnie komunikuje blokadę bez wyglądania jak awaria
- **Maksymalna liczba graczy w turnieju: 10** (poprzednio 6) — zmiana w HTML (hint + `max`), walidacja JS
- **Walidacja duplikatów w kroku 4 wizarda**: `validateStep4()` wykrywa zduplikowane nazwy (case-insensitive) zarówno dla graczy z listy jak i niestandardowych; zduplikowane pola dostają czerwoną ramkę i ciemne tło; nad przyciskiem pojawia się komunikat `Zduplikowane nazwy graczy: "X"`; reakcja natychmiastowa (na każdy `input`)
- **Filtrowanie datalistów w kroku 4**: każdy input gracza ma własny `<datalist id="t-datalist-N">`; `_updateStep4Datalists()` po każdej zmianie usuwa z sugestii pozostałych pól graczy już wybranych gdzie indziej (porównanie case-insensitive); po wyczyszczeniu pola gracz wraca do sugestii
- **Przycisk TURNIEJ na ekranie głównym**: zielone tło `--green` (#2a9d4f) — spójne z przyciskiem „UTWÓRZ TURNIEJ" i bannerem zwycięzcy; hover ciemnieje do #238a44

### Zmiany w plikach
- `js/league.js` — `renderTournamentListScreen()`: etykiety sekcji z licznikiem i klasą `t-list-limit--full`
- `js/tournament.js` — walidacja kroku 1: `max 10`; `renderStep4Players()`: per-input datalisty; nowa `_updateStep4Datalists()`; przepisana `validateStep4()` z detekcją duplikatów i podświetleniem pól
- `index.html` — hint i `max="10"` w kroku 1; `<p id="t-step4-error">` w kroku 4; per-input `<datalist id="t-datalist-N">`
- `css/style.css` — `.t-list-section-label` flex; `.t-list-limit` / `.t-list-limit--full`; `#btn-new-tournament:disabled`; `.player-name-input.inp-duplicate`; `.btn-home-tournament` → zielony

---

## Faza 4 — drabinka eliminacyjna (2026-06-06)

### Nowe funkcje
- **Format drabinki** (`bracket`) w wizardzie kroku 2: kafelek "Drabinka" odblokowany (usunięto `disabled`), podtytuł "pucharowa"; kliknięcie chowa ustawienia ligi i pokazuje opis `t-bracket-desc`
- **Generowanie drabinki** (`generateBracket`): bracket size B = następna potęga 2 ≥ N; `numByes = B − N` bye-slotów w rundzie 0 (zwycięzca = gracz niżej rozstawiony, pre-ustawiony); pozostałe sloty R1 = pary seedowych graczy; rundy 2..log2(B) tworzone z p1/p2=null
- **Propagacja zwycięzcy** (`advanceBracketWinner`): po każdym meczu winner → p1 lub p2 kolejnego slotu wg parzystości slotu; wywołanie przy zapisie wyniku meczu turniejowego
- **Widok drabinki** (`renderBracketScreen`): kolumny rund (`bk-col`), karty meczów (`bk-card-wrap .match-card`), łączniki SVG między rundami, etykiety rund (Ćwierćfinał, Półfinał, Finał itd.)
- **Pionowe centrowanie** (`_bracketCenterY`): rekurencja — karta R0: `slot*(CARD_H+GAP)+CARD_H/2`; karta Rk: średnia dzieci z R(k-1); łącznik SVG wyznacza ramiona na tych samych y-koordynatach
- **Nawigacja lewo/prawo** (przyciski `bk-arrow`): widoczna tylko gdy numRounds > 3; przesuwa okno 3 widocznych kolumn; skrajne przyciski blokowane na granicy
- **Brak zakładek** dla bracketów: `renderTournamentViewScreen` ukrywa `tv-tabs`, `tv-standings`, `tv-matches` i pokazuje `tv-bracket`; wywołuje `renderBracketScreen`
- **Karty meczów w drabince**: typy `bye-card` (pomijane przy kliknięciu), `tbd-card` (obaj null), częściowo obsadzone (p1 znany, p2 TBD = "?"); rozegrane karty z avgami; kliknięcie uruchamia modal startera lub statystyki
- **Karta turnieju** na liście: meta "Drabinka", postęp zliczony z wyłączeniem bye-matchów, nazwa zwycięzcy z meczu finałowego
- **Desktopowe skalowanie**: `zoom: 1.25` na `.bk-nav-wrap`, stały viewport 370px, `justify-content: center` — drabinka wyśrodkowana na szerokich ekranach
- **Mobilne centrowanie**: `display: flex; justify-content: center` na `.tv-bracket` — drabinka wyśrodkowana na każdej szerokości

### Naprawione błędy (drabinka)
- **Nachodzenie kart**: base `.match-card { min-height: 60px }` nadpisywało `height: 44px` → dodano `min-height: 0` i `overflow: hidden` w `.bk-card-wrap .match-card`
- **SVG connector złe y**: łączniki używały liniowego spacing zamiast `_bracketCenterY` dla R1+ → przekazano `round` do `buildBracketConnectorSvg`
- **SVG obcięty**: wysokość SVG obliczona dla R0 nie wystarczała dla R1+ → SVG dostaje pełną `bodyH` (R0-based)
- **Crash po meczu bracket** (tab click): `btn-new-match`/`btn-exit-confirm` wywoływały `tv-tab-matches.click()` → guard `if (t.config.format !== 'bracket')`
- **Live standings na bracket** przy restore z localStorage: `btn-live-standings` pokazywał się bezwarunkowo → sprawdzenie `restoredT.config.format`
- **CARD_H / CSS coupling**: `height` w CSS i `CARD_H` w JS muszą być zsynchronizowane; przy zwiększaniu paddingu obie wartości zmieniane razem (36→44)

### Zmiany w plikach (drabinka)
- `js/league.js` — `nextPowerOf2()`, `computeRoundName()`, `_bracketCenterY()`, `advanceBracketWinner()`, `generateBracket()`; `createTournament()` — branch bracket; `_buildBracketCard()`, `buildBracketRound()`, `buildBracketConnectorSvg()`; `renderBracketScreen()`; `renderTournamentViewScreen()` — branch bracket; `buildTournamentCard()` — meta, postęp, zwycięzca dla bracket
- `js/tournament.js` — kliknięcie kafelka formatu (liga/bracket toggle), reset wizarda
- `js/app.js` — `#tv-bracket` click handler; `saveTournamentMatchResult()` wywołuje `advanceBracketWinner`; `startTournamentMatch()` ukrywa btn-live-standings dla bracket; guardy w `btn-new-match`/`btn-exit-confirm`; `loadFromLocalStorage()` sprawdza format przy btn-live-standings
- `index.html` — `<div id="tv-bracket">`, kafelek bracket odblokowany, `t-bracket-desc`, max graczy 10, `id="tv-tabs"` na belce zakładek
- `css/style.css` — pełna sekcja bracket: `.tv-bracket`, `.bk-nav-wrap`, `.bk-arrow`, `.bk-viewport`, `.bk-track`, `.bk-col`, `.bk-label`, `.bk-body`, `.bk-card-wrap .match-card` (height 44px, min-height 0, padding 6px 7px), `.bye-card`, `.tbd-card`, `.bye-slot-row`; media query desktop (zoom 1.25, stały viewport)

---

## Wolne losy — równomierne rozłożenie w drabince (2026-06-06)

### Nowe funkcje
- **Algorytm przeplatania** (`_computeByeSuggestion`): dla N graczy oblicza, którzy dostają wolny los tak, żeby były rozłożone równomiernie (np. N=10: gracze 3,4,5,8,9,10; N=6: gracze 3,6); formuła `floor(i * r1Slots / numReal)` wyznacza sloty realnych meczów, reszta to bye-sloty
- **Przyciski BYE w kroku 4 wizarda**: każdy blok gracza (tylko bracket) ma przycisk-toggle `BYE` / `BYE ✓`; aktywny → czerwona ramka bloku, akcent na etykiecie; disabled przy N ∈ {4,8} (potęgi 2)
- **Licznik wolnych losów** (`#t-bye-counter`): pasek nad listą graczy; zielony gdy `count === numByes`, czerwony w pozostałych przypadkach; ukryty dla ligi i gdy numByes=0
- **Notatka informacyjna** (`#t-bye-note`): pod kontrolkami rozstawienia; treść `ℹ️ Wolny los = gracz zaczyna od [runda]. Sugestia rozłożona równomiernie.`; ukryta dla ligi i numByes=0
- **Walidacja UTWÓRZ TURNIEJ**: dla bracket z numByes > 0 przycisk aktywny tylko gdy `byeCount === numByes` (plus wypełnione imiona i brak duplikatów); counter bar pełni rolę komunikatu
- **Losuj → auto-bye**: kliknięcie `🎲 Losuj rozstawienie` w kroku 4 automatycznie losuje, którzy gracze dostają BYE, jeśli żaden nie jest jeszcze zaznaczony
- **Przeniesienie bye przez shuffle**: handler UTWÓRZ TURNIEJ korzysta z `_getStep4Values()` — pole `bye` jest częścią obiektu gracza i podąża za nim przez Fisher-Yates
- **Rewrite `generateBracket(players)`**: nowa sygnatura `(players)` zamiast `(numPlayers, players)`; ten sam algorytm przeplatania co `_computeByeSuggestion` wyznacza sloty realne i bye; `byePlayers` / `realPlayers` tworzone wg flagi `p.bye`; wynik zawsze równomiernie rozłożony niezależnie od tego, którzy gracze mają bye; `bye` usuwane z `tournament.players` przed zapisem do localStorage

### Naprawione błędy
- **Stary `generateBracket` kładł wszystkie bye na górze**: sloty 0..numByes-1 → wyłącznie byes w górnej połowie; nowy algorytm przeplatania zapewnia 50/50 podziału

### Zmiany w plikach
- `js/tournament.js` — `_computeByeSuggestion(numPlayers)`, `_updateByeCounter(numByes)`, `renderStep4Players()` z toggleami BYE, `_getStep4Values()` z polem `bye`, `validateStep4()` z walidacją liczby bye, handler UTWÓRZ TURNIEJ z `_getStep4Values()`, handler Losuj z auto-bye
- `js/league.js` — `generateBracket(players)` przerobiony z nowym algorytmem; `createTournament()` usuwa `bye` przed zapisem, wywołuje `generateBracket(players)` zamiast `generateBracket(numPlayers, players)`
- `css/style.css` — `.bye-toggle`, `.bye-toggle.active`, `.bye-toggle:disabled`, `.bye-counter`, `.bye-counter.ok`, `.bye-counter.warn`, `.player-block.has-bye`, `.player-block.has-bye .player-block-label`, `.bye-note`

---

## Poprawki UI wizarda i ekranu gry (2026-06-06)

### Nowe funkcje
- **Podgląd drabinki w kroku 4**: przycisk `👁 Podgląd drabinki` nad UTWÓRZ TURNIEJ (widoczny tylko w formacie bracket); otwiera modal z pełną renderowaną drabinką (te same karty, SVG łączniki, nawigacja strzałkami co w widoku turnieju); przy losowym rozstawieniu wylosowuje jedną możliwą kolejność i pokazuje żółte ostrzeżenie; puste imiona wyświetlają się jako `?`
- **Undo w modalu wyniku lega/seta/meczu**: modal `#modal-leg-result` ma teraz dwa przyciski obok siebie — `↩ Cofnij` (po lewej) i `Dalej` (po prawej); `Cofnij` wywołuje `undoLastVisit()` — przywraca stan sprzed ostatniej wizyty, zamyka modal, rerenderuje ekran gry; disabled gdy stos undo pusty

### Naprawione błędy
- **Zmiana formatu w kroku 2 wizarda zmieniała wysokość kontenera**: `#league-settings` i `#t-bracket-desc` owinięte w `.format-details-panel` (CSS grid, `grid-area: 1/1`); przełącznik używa klasy `format-hidden` (`visibility:hidden` + `pointer-events:none`) zamiast `display:none` — kontener ma zawsze stałą wysokość = wysokość `#league-settings`

### Zmiany w plikach
- `index.html` — `.format-details-panel` wrapper w kroku 2; `#t-bracket-desc` z klasą `format-hidden` (bez inline `display:none`); `#btn-preview-bracket` w kroku 4; `#modal-bracket-preview` z nagłówkiem, notatką o losowaniu i kontenerem; `#btn-leg-result-undo` w `#modal-leg-result` obok `#btn-next-leg`
- `js/tournament.js` — handler `btn-preview-bracket` buduje fake tournament i wywołuje `renderBracketScreen`; toggle formatu i reset wizarda używają klasy `format-hidden` zamiast `style.display`; `renderStep4Players` pokazuje/ukrywa `btn-preview-bracket`
- `js/league.js` — `renderBracketScreen(tournament, container)` — parametr `container` opcjonalny (domyślnie `#tv-bracket`); umożliwia renderowanie do modalu podglądu
- `js/ui.js` — `showLegResultDialog` aktualizuje disabled state `#btn-leg-result-undo` przy każdym otwarciu modalu
- `js/app.js` — `#btn-leg-result-undo` podpięty pod `undoLastVisit`
- `css/style.css` — `.format-details-panel`, `.format-details-panel > *` (grid-area), `.format-hidden`, `.wizard-hint`; `.btn-preview-bracket` (outline secondary); `.modal-bracket-preview`, `.bracket-preview-header`, `.modal-close-x`, `.bracket-preview-note`; `.leg-result-actions` (flex row), `.leg-result-actions .btn` (flex: 1)

---

## Co jest do zrobienia

### Faza 2 — zarządzanie graczami i historia ✅ UKOŃCZONA
- [x] Profile graczy (tworzenie, edycja, usuwanie) — ekran "Gracze", zapis w localStorage (`dart_players`)
- [x] Historia rozegranych meczów (zapis, przeglądanie) — ekran "Historia", auto-zapis po każdym meczu, usuwanie rekordów
- [x] Interaktywna tarcza (tryb "Tarcza") — Canvas 2D, pełna detekcja sektorów × mnożnik, animacja trafienia

### Nowe pliki (Faza 2)
- `js/players.js` — CRUD profili graczy
- `js/history.js` — zapis/odczyt/renderowanie historii meczów
- `js/board.js` — interaktywna tarcza, rendering i hit-detection

---

### Faza 3 — turniej round-robin ✅ UKOŃCZONA
- [x] Ekran główny (MECZ / TURNIEJ / Gracze / Historia)
- [x] Wizard konfiguracji turnieju — 4 kroki (nazwa, liczba graczy, format+liga, ustawienia meczu, gracze+rozstawienie)
- [x] Lista turniejów (aktywne / zakończone, usuwanie, limit 5/40)
- [x] Tabela klasyfikacji ligi (obliczana dynamicznie, ranking pkt→legi→avg)
- [x] Generowanie harmonogramu (wszystkie pary pre-inserowane przy tworzeniu)
- [x] Widok meczów (zakładka Mecze) — lista par, uruchamianie meczu
- [x] Dialog "kto zaczyna" przed każdym meczem turniejowym
- [x] Zapis wyniku meczu do turnieju po rozegraniu
- [x] Oznaczanie turnieju jako zakończonego

### Faza 4 — bracket turniejowy ✅ UKOŃCZONA
- [x] Drabinka eliminacyjna (single-elimination) dla 3–10 graczy
- [x] Widok bracket (drzewo) — pionowe centrowanie, łączniki SVG, nawigacja lewo/prawo

### Faza 5 — PWA i eksport
- [ ] manifest.json + Service Worker (tryb offline)
- [ ] Eksport statystyk / historii (JSON lub CSV)
- [ ] Instalacja jako aplikacja na telefonie
