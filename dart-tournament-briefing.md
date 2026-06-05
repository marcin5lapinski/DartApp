# 🎯 Briefing: Aplikacja do organizacji turniejów w darta

## Kontekst projektu

Budujemy responsywną aplikację webową (HTML/CSS/JS, bez frameworka backendowego) do organizowania turniejów w darta oraz liczenia punktów i statystyk. Docelowo aplikacja ma działać jako PWA, a w przyszłości możliwe przekształcenie w React Native.

---

## Fazy projektu

Projekt podzielony jest na 5 faz. Zaczynamy od **Fazy 1**.

### Faza 1 — Ekran gry X01 ✅ ZACZNIJ TUTAJ
### Faza 2 — Zarządzanie graczami i meczami
### Faza 3 — Turniej Round-Robin
### Faza 4 — Drabinka eliminacyjna + fazy grupowe + play-off
### Faza 5 — PWA, eksport wyników, optymalizacja mobilna

---

## Szczegółowe wymagania

### 1. Warianty gry X01
- Obsługiwane warianty: **101, 201, 301, 401, 501, 601, 701, 801, 901, 1001**
- Domyślny tryb wyjścia: **double-out** (konfigurowalne per mecz: double-out / master-out / straight-out)

### 2. Tryby wprowadzania wyników (KLUCZOWE)
Aplikacja oferuje **trzy tryby** i użytkownik może **przełączać się między nimi w dowolnym momencie meczu**:

**Tryb A — Sumaryczny (domyślny)**
- Gracz wpisuje łączny wynik za 3 lotki (np. `85`)
- Szybki, najprostszy w obsłudze

**Tryb B — Lotka po lotce**
- Gracz wpisuje każdą lotkę osobno (np. `20`, `25`, `40`)
- Pozwala na dokładniejsze statystyki

**Tryb C — Klikalna tarcza**
- Interaktywna grafika tarczy do darta
- Gracz klika w pole tarczy, aplikacja rejestruje wartość

Przełącznik trybów widoczny zawsze na ekranie gry.

### 3. Logika gry X01
- Obsługa **bust** (przekroczenie — wynik wraca do poprzedniego)
- Walidacja **double-out**: ostatnia lotka musi trafić w pole podwójne lub bull (50)
- Obsługa **bull (50)** jako podwójnego przy double-out
- Obsługa **master-out**: można kończyć na double lub triple
- Obsługa **straight-out**: dowolna lotka może kończyć
- Walidacja checkoutów: aplikacja zna wszystkie możliwe kombinacje zamknięć

### 4. Statystyki (zbierane dla każdego gracza, per mecz i per leg)

| Statystyka | Opis |
|---|---|
| **Średnia rzutu (3-dart average)** | Suma punktów / liczba wizyt × 3 |
| **Średnia pierwszych 9 lotek** | Średnia z pierwszych 3 wizyt w legu |
| **Najwyższe zamknięcie lega** | Najwyższy wynik checkoutu |
| **Najszybciej zamknięty leg** | Leg zamknięty w najmniejszej liczbie rzutów |
| **Procent trafionych podwójnych** | Patrz szczegóły poniżej |

#### Logika liczenia prób na doublu (WAŻNE):

Próbą na doublu jest każda lotka rzucona gdy pozostało:
- **50 punktów** (bull)
- **2–40 punktów (tylko parzyste)** — każde pole double
- **NIE liczymy** wartości 41–49 jako próby na doublu (nieosiągalne jedną lotką na double)

**Wykrywanie prób automatycznie** (w trybach B i C):
Aplikacja analizuje stan punktów przed każdą lotką i wykrywa, czy lotka była próbą na doublu.

**W trybie sumarycznym** — po zamknięciu lega aplikacja pyta: *"Którą lotką zamknąłeś lega?"* (1., 2. lub 3.)
- Opcje są **filtrowane inteligentnie**:
  - Jeśli pozostało np. 170 → tylko 3. lotka (jedyny możliwy 3-dart checkout)
  - Jeśli pozostało np. 45 → wyklucz 1. lotkę (nie można zamknąć 45 na double pierwszą lotką)
  - Jeśli pozostało np. 32 → możliwa 1., 2. lub 3. lotka
- Na tej podstawie aplikacja liczy liczbę nieudanych prób = (numer lotki - 1)

**Procent = trafione doubly / wszystkie próby × 100%**

### 5. Format meczów
- Konfigurowalne: liczba legów (best of 3, 5, 7... lub fixed legs)
- Konfigurowalne: liczba setów (opcjonalnie)

### 6. Formaty turniejów (Fazy 3 i 4)
- **Round-robin** (każdy z każdym) — tabela punktowa
- **Drabinka eliminacyjna** — bracket z automatycznym awansowaniem
- **Fazy grupowe + play-off** — grupy → najlepsi awansują do drabinki

---

## Wymagania techniczne

- **Technologia**: czysty HTML5 + CSS3 + vanilla JavaScript (bez frameworków JS)
- **Responsywność**: mobile-first, działa na telefonie (duże przyciski, czytelne cyfry)
- **Brak backendu**: dane przechowywane w localStorage
- **Przyszłość**: przygotować kod pod konwersję do PWA (manifest, service worker)
- **Styl**: ciemny motyw, czytelny podczas gry w słabym oświetleniu

---

## Zadanie na teraz — Faza 1

Stwórz **ekran gry X01** jako działający prototyp (`index.html`):

1. Ekran konfiguracji meczu:
   - Wybór wariantu (101–1001)
   - Imiona 2 graczy
   - Tryb wyjścia (double-out domyślnie)
   - Liczba legów

2. Ekran gry:
   - Wynik obu graczy (duże cyfry)
   - Aktywny gracz wyróżniony
   - Pole wprowadzania wyniku (tryb sumaryczny na start)
   - Przełącznik trybów wprowadzania
   - Historia rzutów w legu
   - Podpowiedź checkoutu (np. przy 170 pokaż: T20, T20, Bull)

3. Logika:
   - Pełna obsługa bust, double-out, zmiana gracza
   - Zbieranie danych do statystyk w tle
   - Pop-up po zamknięciu lega z pytaniem o numer lotki (tryb sumaryczny)

4. Ekran statystyk po meczu (podstawowy)

---

## Uwagi dla Claude Code

- Pisz **modularny kod** — każda faza to osobne moduły JS
- Komentuj logikę checkoutów i statystyk — będziemy do niej wracać
- Tarcza do darta (Tryb C) może być na razie placeholderem — wrócimy do niej
- Checkout hints: przygotuj tablicę wszystkich możliwych checkoutów (2–170)
