# PoC: Gemini + Jev Ultrafast / Browser Use

> Historical PoC snapshot from `c9ced3a`. Source and measurements are retained for provenance; local run commands are not portable installation instructions. See the [current application](../../APPLICATION.md), [research kit](../../research/README.md) and [release readiness](../../RELEASE-READINESS.md).

[Pełne archiwum wszystkich testów: wcześniejsze serie aplikacji, PoC, piloty i walidacja](../../research/ALL-RESULTS.md).

**Wniosek: szybka pętla Jev działa, ale nie zastępuje planowania i analizy.** Na Google Flights Ultrafast z Gemini był około **2,7× szybszy** od obecnej aplikacji. Przy długich formularzach wygrywał standardowy Browser Use. Przy analizie ofert najlepiej wypadła obecna aplikacja; sam Ultrafast nie ukończył tych zadań.

Wykonano **102 próby porównawcze**: 30 na Google Flights i 72 na ośmiu lokalnych scenariuszach. Wszystkie warianty używały Gemini `google/gemini-3.8-flash / low`, OpenRouter z przypiętym `google-ai-studio`; Jev to `jev-1.13.0`. Nie używano Mercury ani automatycznego przełączania modeli.

## Wyniki

Komórka zawiera medianę czasu poprawnie ukończonych prób oraz liczbę sukcesów. Sukces oznacza zakończenie pracy przez agenta **i** poprawny wynik niezależnego weryfikatora. Nieudane i nieukończone próby pozostają w mianowniku; nie otrzymują „szybkiego” wyniku.

| Zadanie | Obecna aplikacja: Jev First + Gemini | Jev Ultrafast + Gemini | Browser Use + Gemini |
|---|---:|---:|---:|
| Google Flights: Zurich–London | 30,78 s · 10/10 | **11,42 s · 10/10** | 34,82 s · 10/10 |
| Wyszukanie produktu | 3,54 s · 3/3 | **2,48 s · 3/3** | 4,45 s · 3/3 |
| Ustawienie i zastosowanie filtrów | 3,60 s · 3/3 | **1,74 s · 3/3** | 5,45 s · 3/3 |
| Wybranie podpowiedzi autocomplete | 4,37 s · 3/3 | **2,45 s · 3/3** | 8,20 s · 3/3 |
| Formularz: 6 etapów | 34,96 s · 3/3 | 24,07 s · 3/3 | **20,20 s · 3/3** |
| Formularz: 10 etapów | 51,84 s · 3/3 | 37,33 s · 3/3 | **33,46 s · 3/3** |
| Wybór hotelu i obliczenie kosztu | **9,11 s · 3/3** | — · 0/3 | 10,49 s · 3/3 |
| Przeczytanie 3 ofert i obliczenie kosztu rocznego | **13,80 s · 3/3** | — · 0/3 | 27,26 s · 3/3 |
| Otwarcie artykułu w nowej karcie | 4,93 s · 3/3 | — · 0/3* | **4,30 s · 3/3** |

Łącznie: obecna aplikacja **34/34**, Browser Use **34/34**, Ultrafast **25/34**. Ten rozkład zadań jest celowo zróżnicowany; liczby nie są estymacją skuteczności na całym internecie.

\* Ultrafast otworzył właściwy artykuł we wszystkich trzech próbach, więc stan strony przeszedł weryfikację. Silnik pozostał jednak przy poprzedniej karcie i zakończył się jako `blocked`. Nie liczymy tego jako samodzielnie ukończonego zadania. Przy kryterium ograniczonym do samego stanu strony Ultrafast miałby **28/34**, co nadal obejmuje sześć rzeczywistych porażek analizy ofert.

## Google Flights: czasy i koszty

Zadanie: lot w jedną stronę Zurich → London, 20 września 2026, jedna osoba dorosła, economy; zatrzymanie na pasujących wynikach, bez wybierania lub rezerwowania lotu. Weryfikacja sprawdza trasę, datę i rok, tryb podróży, pasażera, klasę oraz rzeczywiste wiersze wyników.

| Statystyka | Obecna aplikacja | Ultrafast | Browser Use |
|---|---:|---:|---:|
| Poprawne próby | 10/10 | 10/10 | 10/10 |
| Mediana | 30,78 s | **11,42 s** | 34,82 s |
| P90 poprawnych prób | 32,25 s | **11,69 s** | 37,41 s |
| Mediana: świeży profil (5 prób) | 30,56 s | 11,43 s | 35,10 s |
| Mediana: ponownie użyty profil (5 prób) | 31,00 s | 11,42 s | 34,55 s |
| Wywołania Gemini, łącznie | 193 | **20** | 113 |
| Zapytania Jev, łącznie | 22 | 184 | 0 |
| Raportowany koszt 10 prób | $1,5893 | **$0,0501** | $0,4370 |

P90 jest opisem tej małej próby, a nie gwarancją czasu przyszłych zadań. Świeże i ponownie użyte profile miały bardzo zbliżone czasy zadania. Powtórzenia na ponownie użytym profilu nadal zaczynały z Wrocławiem jako punktem startowym, pustym celem i pustymi datami; zapisane wartości początkowe są w JSON.

Poniższe **średnie** są addytywne; nie należy sumować ich z medianami powyżej:

| Składnik, średnio na próbę | Obecna aplikacja | Ultrafast | Browser Use |
|---|---:|---:|---:|
| Gemini / główny adapter | 26,38 s | 2,09 s | 19,45 s |
| Jev | 1,68 s | 7,65 s | 0 |
| Pozostała praca, przeglądarka i weryfikacja | 2,15 s | 1,59 s | 15,43 s |
| **Średni czas zadania** | **30,21 s** | **11,33 s** | **34,88 s** |
| Przygotowanie przed zadaniem | 1,64 s | 2,25 s | 2,88 s |

W obecnej aplikacji Jev wcześnie przekazuje sterowanie do Gemini. Ultrafast prowadzi całą sekwencję, a Gemini wywołuje tylko do dwóch wartości pól. Standardowy Browser Use wykonuje mniej wywołań głównego modelu niż nasza aplikacja, ale w tej konfiguracji więcej czasu zajmuje pozostała praca agenta i przeglądarki. Pomiar nie rozdziela wszystkich wewnętrznych przyczyn tego czasu.

Wynik autora Jev Ultrafast, 7,073 s, pozostaje pomiarem innej konfiguracji i środowiska. Nasze dziesięć powtórzeń z Gemini daje wiarygodne lokalne odniesienie około 11,4 s. Najszybszy wcześniejszy pilot z Gemini miał 8,81 s; nie mieszamy go z finalną serią.

## Dlaczego dłuższe zadania zachowują się inaczej

- **Kliknięcia i filtry:** Jev wybiera akcję szybko, bez generowania pełnej odpowiedzi LLM przy każdym kroku. Tu przewaga Ultrafast jest wyraźna.
- **Wiele pól:** w formularzu z 10 etapami Ultrafast potrzebował 20 wywołań Gemini i 41 decyzji Jev na próbę. Browser Use potrzebował 11 wywołań Gemini, grupując działania. Nasza aplikacja wykonała 42–43 wywołania głównego modelu. Stąd zmiana kolejności silników.
- **Analiza ofert:** we wszystkich sześciu próbach Ultrafast wyczerpał limit 60 działań, nie wywołując Gemini ani razu. W hotelach przełączał wybór między Bello i droższą Dorią; w ofertach hostingowych powtarzał nawigację. Trwało to około 22–24 s i nie dawało poprawnego wyniku.
- **Pewność modelu:** część błędnych wyborów Doria miała confidence 0,57–0,63, powyżej progu 0,55 obecnej aplikacji. Usunięcie lub zmiana tego progu nie zastępuje wykrywania braku postępu, analizy i weryfikacji.
- **Nowe karty:** to ograniczenie możliwości obecnej pętli Ultrafast. Wynik otwarcia strony był poprawny, lecz silnik nie potrafił samodzielnie zakończyć pracy w nowej karcie.

Gemini jako helper tekstu nie jest równoważny Gemini jako model decyzyjny. Zmiana helpera na inteligentniejszy model nie pomaga, jeśli pętla nigdy go nie wywołuje w miejscu wymagającym rozumowania.

## Rekomendacja integracji

**Zachować obecną aplikację, UX i warstwę uprawnień. Rozwijać wykonawcę i sposób planowania zamiast przepisywać całość na standardowy Browser Use.** Wyniki wspierają następujący kierunek; taki zintegrowany silnik nie został jeszcze zmierzony:

1. Gemini prowadzi plan, pamięta fakty z odwiedzonych stron, rozstrzyga porównania i przekazuje krótkie cele wykonawcze. Dla prostego zadania nie musi analizować każdego kliknięcia.
2. Jev wykonuje obsługiwane sekwencje UI. Walidacja aktualności powinna dotyczyć celu akcji i istotnego stanu formularza, z zachowaniem sprawdzeń polityki. Sama animacja lub niezwiązana zmiana strony nie powinna wymuszać pełnego powrotu do LLM.
3. Wprowadzić grupowanie bezpiecznych działań i ponowne użycie wcześniej ustalonych wartości w ich właściwym kontekście. Stałego „Ada w każdym etapie” nie trzeba generować dwadzieścia razy. Dane nadal muszą pochodzić z celu użytkownika lub zweryfikowanego planu.
4. Cykl dwóch stanów, brak postępu, brak danych do analizy lub nieobsługiwane UI uruchamiają kontrolowany powrót do Gemini. Po niepewnym wyniku mutacji najpierw obserwacja; bez ślepego powtarzania kliknięć.
5. Niezależna kontrola wyniku, Stop i obecne granice uprawnień pozostają częścią wykonania. Następny test integracyjny powinien obejmować nowe zadania spoza tego zestawu.

Browser Use warto zachować jako punkt odniesienia dla grupowania działań i obsługi bardziej rozbudowanych interfejsów. Ten eksperyment nie uzasadnia migracji całej aplikacji do jego standardowego agenta z Gemini: na formularzach pomógł, na Flights i analizie ofert był wolniejszy od najlepszego z pozostałych wariantów. Własne modele/chmura Browser Use nie były testowane.

## Metodologia, ograniczenia i odtworzenie

- Kod pomiarowy zamrożono w `6354eac83e6985d4082fb116e986da089886fc7c`. Obie finalne serie mają identyczne hashe `run.mjs`, `driver.py`, `tasks.mjs` i czysty stan repo. Baseline aplikacji: `77846cb`, bez zmian w jej źródłach. [Piny upstreamu](sources.json).
- Po pomiarach poprawiono wyłącznie obsługę i pomiar Stop oraz redakcję logów: oczekiwanie na zakończenie zamykania przeglądarki, pomijanie zrzutu po Stop, anulowanie timera Stop i redakcję całego zapisanego bufora. Te zmiany nie optymalizują zwykłej ścieżki benchmarku; finalnych wyników nie przeliczano na nowszym kodzie.
- Jeden lokalny Chrome for Testing 151.0.7922.34, Python 3.12.12, Node 24.20.0; viewport 1120×780, en-US, Europe/Zurich, osobne profile. Kolejność silników rotuje między powtórzeniami; pomiary są sekwencyjne.
- Zegar zadania obejmuje pracę agenta, powtórzenia zapytań, naprawianie błędów i niezależną weryfikację. Przygotowanie obejmuje start przeglądarki/drivera, nawigację, zgodę cookies i pierwszą obserwację. Zrzut końcowy i sprzątanie procesów są poza zegarem zadania. Konsolowy wpis wyniku pojawia się po sprzątaniu.
- Powtórzenia 6–10 Flights wykorzystują profil z próby 5, wraz z cache i preferencjami. Nie jest to eksperyment izolujący wyłącznie cache. Początkowe wartości pól są zapisane.
- Ultrafast zachowuje oryginalne wybory Jev, snapshoty, wykonanie akcji, confidence i limit 60 działań. Adapter tylko podłącza przygotowaną kartę, mierzy API i przypina dostawcę Gemini. Browser Use ma `flash_mode` przy zadaniach mechanicznych, planowanie przy analizie, vision na żądanie i do 5 działań na odpowiedź. Dodatkowy LLM judge jest wyłączony na rzecz wspólnego weryfikatora.
- Wspólny limit czasu zadania wynosi 240 s; limit kosztu próby wynosi $1 raportowanego usage. Natywne ograniczenia liczby działań różnią się: Ultrafast ma 60 działań, Browser Use do 60 kroków po maksymalnie 5 działań, aplikacja do 80 tur i 240 wywołań narzędzi. Porażki Ultrafast przy ofertach to powtarzające się cykle, a nie poprawna sekwencja przerwana tuż przed wynikiem.
- Poza Flights są to lokalne, syntetyczne zadania. Trzy powtórzenia na scenariusz nie dowodzą ogólnej niezawodności w internecie. Brak też pomiaru pracy na zalogowanych kontach, uploadów, canvas czy skomplikowanych aplikacji osadzonych w ramkach.
- Przeglądarki nie otrzymują kluczy API. Kontrola środowiska uruchomionych procesów nie wykazała zmiennych z kluczami/tokenami. Klucze trafiają ze schowka systemowego do pamięci hosta i prywatnych potoków. Testy używają izolowanych profili, ograniczonego ruchu sieciowego i wyłączonych narzędzi dowolnego kodu/plików. Nie zastępuje to pełnej polityki produkcyjnej.
- Przeszło 31 testów kontraktów upstreamu oraz test niezależnych weryfikatorów, obejmujący błędne dane, niezatwierdzone pola i pominięte strony. Uruchomienie z widocznym oknem przeszło wyszukiwanie w 2,34 s. W pojedynczych próbach Stop zamknął przeglądarkę po około 0,96 s dla aplikacji i 0,15 s dla obu pozostałych driverów; pełne sprzątanie Ultrafast trwało około 2,09 s. To pomiar zamknięcia przeglądarki, nie wcześniejszego przełączenia stanu UI. [Walidacja](results/validation.json) · [Zachowane diagnostyki](results/diagnostics.json.gz) · [Kontrola kluczy](results/security.json).

Koszt finalnych porównań: **$3,9988**, w tym obecna aplikacja $3,0487, Ultrafast $0,1665, Browser Use $0,7836. Wszystkie zachowane uruchomienia wraz z pilotami i kontrolami: około **$4,30**. Są to zwrócone koszty OpenRouter plus oszacowanie Jev według $0,042/M tokenów wejściowych. Przerwane zapytania mogą zostać naliczone bez zwrócenia usage; to nie jest faktura ani koszt całej pracy Codex.

Diagnostyki są oddzielone od zamrożonego porównania. Zachowano m.in. początkowy błąd zbyt długiej ścieżki gniazda Browser Harness, wybór pustej karty przez weryfikator, wyścig przekierowań zgody Google, 25-sekundowy timeout Jev w pilocie formularza, zapętlenie porównania hoteli oraz błędy próby zrzutu po Stop. Poprawki środowiska i runnera nie zmieniały gotowych wyników; każdy pilot ma własny plik. Porażki finalnego Ultrafast pozostają w tabeli.

[Uruchomienie PoC](README.md) · [Flights: wszystkie próby](results/final-flights.json) · [Lokalne: wszystkie próby](results/final-local.json) · [Statystyki](results/summary.json) · [102 ślady wykonania](results/final-traces.json.gz) · [Zweryfikowany ekran Flights](results/flights-ultrafast.png).

Nowszy eksperyment **Jev Auto** jest zaimplementowany w osobnej aplikacji; końcowe porównanie 119 prób, razem z historią błędów HTTP 402, opisano w [zbiorczym archiwum](../../research/ALL-RESULTS.md#auto). Wyniki tego PoC pozostają historycznym, osobnym pomiarem.
