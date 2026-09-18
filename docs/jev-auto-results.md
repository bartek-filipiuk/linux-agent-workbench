# Jev Auto — wdrożenie i dotychczasowe wyniki

**Status: kod i testy aplikacji gotowe; pełna seria porównawcza pozostaje niedokończona z powodu HTTP 402 OpenRouter (brak kredytów).** Nie zamykamy celu ani nie traktujemy pilotów Flights jako pomiaru finalnego. Po doładowaniu trzeba dokończyć research/karty, nowe warianty zadań i pięć prób Flights na każdy z czterech silników.

Najmocniejszy obecny wynik: formularz 10-etapowy **26,14 s Auto vs 74,49 s First vs 40,21 s Browser Use** (mediany, każdy 3/3 poprawny). Formularz 6-etapowy: 13,35 / 30,08 / 24,28 s. Porównanie hoteli: 4,71 / 12,26 / 8,99 s. Auto nie wygrywa wszędzie: filtry i autocomplete były w tej próbie szybsze w First. **Zachowujemy wybór trybu i obecny domyślny Classic; nie ma podstaw do pełnej migracji na Browser Use.**

Seria końcowa ma **72 zarejestrowane próby: 58 PASS i 14 błędów kredytowych**. Sześć typów zadań ukończono w pełni: 54/54. Research ma tylko 4 poprawne próby łącznie; wszystkie końcowe próby kart zatrzymał provider przed wykonaniem zadania. Nie są dowodem awarii funkcji kart. Klasyfikację przyczyn potwierdzają `endReason` oraz logi native drivera, zapisane w `validation/billing-failures.json`.

Razem z pilotami zachowano **91 prób runnera (76 PASS, 1 FAIL pilota, 14 HTTP 402)**, **54 odpowiedzi w testach routingu** i **10 kontroli desktopu** (dwie nieudane kontrole Classic przed poprawką schematu). Koszt zarejestrowany: **$2,666184612** runner/routing + **$0,102326586** desktop = **$2,768511198**. To wyłącznie ten etap Auto, bez kosztów wcześniejszego PoC. Niepełne usage po Stop może zaniżać rachunek.

Po wykryciu 402 dodano zatrzymanie całego runnera po pierwszej próbie z błędem 401/402 (`69e3280`). Nie zmienia to działania modeli ani aplikacji; wcześniejszych 14 błędów nie usunięto. Zamrożone kompilaty aplikacji pozostają takie jak w zmierzonej serii.

18 września 2026. Implementacja w osobnym worktree `/home/bartek/linux-agent-auto`, branch `experiment/jev-auto`. [Uruchomienie i architektura](jev-auto.md), [plan i bramki](jev-auto-plan.md). Poniżej oddzielono zamrożone porównanie od pilotów, routingu i testów aplikacji.

## Metoda

Kod porównania zamrożony na `0ea227b271dbc71b5dc7d503a4a4438e3141c361`; każdy plik serii zawiera rewizję, `dirty`, SHA-256 runnera, fixture’ów i kompilatów. Baseline First: `77846cb0d97af218dd8a2832dab9f488c703b210`. Oba warianty aplikacji korzystają z **tego samego poprawionego adaptera OpenRouter**; First zachowuje bazowy kontroler, narzędzia i worker. Nie przypisujemy naprawy schematu tylko Auto. Native Browser Use/Ultrafast pochodzą z dotychczasowego, przypiętego PoC; nie są podłączone do polityki aplikacji.

Gemini `google/gemini-3.8-flash / low`, OpenRouter `google-ai-studio`, Jev `jev-1.13.0`. Ta sama wersja Chromium, viewport 1120×780, `en-US`, strefa `Europe/Zurich`, świeże profile, sekwencyjne wykonanie i rotacja kolejności silników. Nie prowadzono równolegle innych zadań modelowych ani suite testowej. Lokalny serwer fixture’ów; Flights na żywej stronie Google. Wyszukiwanie Zurich–London, 20 września 2026, one-way, jedna osoba, Economy; bez rezerwacji.

**Sukces wymaga ukończenia i niezależnej weryfikacji stanu strony**, a nie tylko deklaracji modelu. Formularze sprawdzają zapisane pola, porównania sprawdzają wybór i obliczoną kwotę, research wymaga wizyty na każdej z trzech stron. Weryfikator Flights sprawdza trasę, datę i rok, kierunek podróży, pasażerów, klasę i wyniki. Nowe warianty zostały sprawdzone deterministycznie wraz z negatywnymi przypadkami, a następnie odłożone do serii końcowej: cztery inne miasta i osoba, inne ceny i liczba nocy, Rome zamiast Paris. To nowe dane w znanych typach fixture’ów, **nie** dowód uogólnienia na nieznane witryny.

`taskMs` = praca agenta wraz z naprawami oraz niezależna weryfikacja. `setupMs` = uruchomienie drivera/przeglądarki, nawigacja, consent, pierwsza obserwacja. Screenshot i cleanup są poza czasem zadania. Uruchomienie całego Electron/Podman ma osobny test. Mediany dotyczą poprawnych prób, a porażki pozostają w mianowniku. Składniki czasu to średnie wszystkich prób danej grupy; adapter obejmuje transport i retry, nie samą inferencję. Pozostałe = czas zadania minus model i Jev, w tym narzędzia, oczekiwania i weryfikacja. Nie ma osobnego wywołania routera, ale nie zmierzono jego czystego narzutu przez ablację.

Kwoty to usage kosztu OpenRouter plus koszt Jev obliczony z tokenów wejściowych i skonfigurowanej stawki $0,042 / mln. Nie obejmują opłat infrastrukturalnych ani ewentualnych przerwanych zapytań bez zwróconego usage. Desktop ma osobne kontrole; eksport 10 przebiegów z nowej izolowanej bazy (`validation/desktop-usage.json`) wykazuje dodatkowe $0,102326586 zwróconego usage, w tym nieudane kontrole i Stop. Mała próbka 3 lub 5 powtórzeń nie dowodzi produkcyjnej niezawodności ani stabilnego rankingu opóźnień dostawcy.

## Etapy i wszystkie niepowodzenia przed zamrożeniem

1. Routing bez wykonania narzędzi: 12/16 → 15/16 → 16/16 po poprawieniu instrukcji wyboru w już otwartej stronie i wizardach. Następnie 6/6 nowych poleceń. Nie mylić z sukcesem zadania. Późniejszy audyt argumentów wykazał po 2 niepoprawne wywołania batch w każdej z trzech wcześniejszych serii routingu (JSON jako tekst); ich wynik 16/16 dotyczy wyłącznie wyboru ścieżki. Po poprawce schematu dodatkowy audyt 97 rzeczywistych wywołań `browser_task`/`browser_batch` w serii końcowej wykazał 0 niepoprawnych argumentów (`validation/final-arguments-audit.json`). Dodatkowy płatny retest pierwszej decyzji po poprawce pozostaje odłożony przez brak kredytów.
2. Pierwszy pilot Auto ukończył 5/5 zadań, ale Flights wracało prawie całkowicie do Gemini: 41,02 s. Sam próg confidence 0,35 pogorszył kolejną próbę do 50,94 s.
3. Dokładniejsze podcele, wybór sugestii autocomplete, krótkie oczekiwania po edycji oraz mniejszy stan wejściowy Jev. Próba `pilot-context-v2` zakończyła się **FAIL** (18,33 s): niedokończona data, timeout zasłoniętej kontrolki i błąd transportu/dekodowania OpenRouter.
4. Oznaczanie zasłoniętych celów, ograniczony powrót po bezpiecznie odrzuconym stale ref, licznik kolejnych odrzuceń i kontrola zasłonięcia bezpośrednio przed dispatch. Piloty zachowują także wolną próbę 37,97 s. Końcowe dwa piloty Flights: 18,65 i 18,90 s, oba PASS, po 2 Gemini i 19 Jev. Nie użyto tych pilotów do finalnych median.
5. Poprawiono harness: osobno konfigurujemy oba egzemplarze Playwright z różnych worktree’ów; First używa własnego JevClient i workera. Wszystkie cztery silniki przeszły pilot wyszukiwania. Wcześniejsze piloty nie są identyczną konfiguracją finalną.
6. Dwa testy desktopu zaliczyły Auto i Stop, ale nie Classic po Stop. Gemini wysyłał `action` jako tekst zamiast obiektu. Konwerter schematu uwzględniał `anyOf`, a rzeczywiste narzędzie używało `oneOf`. Dodano jawny typ obiektu bez osłabiania walidacji i regresję na rzeczywistym schemacie. Powtórka zaliczyła nawigację Auto, Stop, Classic i follow-up. Zachowano oba nieudane wyniki.

## Walidacja aplikacji

- Pełna suite po poprawce: **452 PASS, 12 skip**; typecheck i build PASS. Poprzedni przebieg miał jeden niestabilny test terminala `idle_shell` podczas równoległego desktopu; powtórka pełnej suite bez tego obciążenia przeszła. Wcześniejszy taki sam przypadek i jego izolowana powtórka również są odnotowane. Nie zmieniano kodu terminala.
- Kontener: **4 PASS**. Obraz browser-worker `acdd06112e93b62d8909c13ddde4a42af8c029f4f31f0bfc3094d9c86829f044`, tag `8f78896`. Hostowa poprawka adaptera nie wymaga przebudowania workera.
- Desktop po poprawce: **4/4 PASS**, Auto → IANA 6,394 s, Stop **27 ms**, Classic po Stop i kontynuacja kontekstu. Brak błędów renderera i poziomego overflow w 1400×900 oraz 1024×768. To smoke, nie pełny audyt dostępności.
- Testy batch: zastąpiony lub zmieniony cel, zmiana kontekstu, brak efektu fill, częściowo wykonana operacja, odmowa approval, Stop/takeover pomiędzy akcjami, cykle pomimo nowych ref/revision. Zasłonięcie kontrolki przed dispatch odrzuca akcję. Każde dziecko nadal przechodzi normalną politykę.
- Audyt końcowy: 721 sprawdzonych plików/eksportów (w tym zdekompresowane archiwum), 0 trafień rzeczywistych kluczy; wcześniejsza kontrola objęła 8 procesów Chrome, także bez sekretów. Usunięto 4 własne kontenery desktop smoke, zachowując gotowy obraz i profil.
- Audyt rzeczywistych sekretów: skan plików, środowiska i argumentów Chrome oraz konfiguracji własnych kontenerów; wyniki w `security-audit.json`. Klucze nie są wypisywane. Nie jest to pełny pentest ani dowód odporności na każdy prompt injection.
- Obraz został zbudowany i działa w testach. Końcowa kontrola skryptu build zgłosiła istniejący wcześniej globalny limit storage Podmana: 22,40 GB przy limicie 14 GB (przed zadaniem ok. 22,34 GB). Nie usuwano cudzych obrazów. Jest to jawne ograniczenie środowiska przy kolejnej przebudowie, nie błąd wykonania aktualnego obrazu.

## Dane

JSON-y, ślady i logi kontroli są w katalogu [benchmarks/jev-auto](benchmarks/jev-auto). Eksporty usuwają jedynie identyfikatory konta dostawcy; manifest podaje hashe oryginałów i eksportów, pomiary pozostają niezmienione. Archiwum śladów zawiera także piloty i niepowodzenia; nie dublują one prób z tabel. Pełne historyczne wyniki wcześniejszych wariantów pozostają w [zbiorczym archiwum](../../linux-agent-browser-poc/WSZYSTKIE-WYNIKI-TESTOW.md).

**Uwaga do tabel:** niepowodzenia research/kart w końcowej serii są błędami kredytowymi. Ich czasy nie są czasami wykonania zadania i nie trafiają do median sukcesów. Flights występuje wyłącznie w osobno oznaczonych pilotach.

| Zadanie | Auto | First | Browser Use | Ultrafast | Zmiana mediany Auto vs First |
|---|---:|---:|---:|---:|---:|
| search | 4.64 s · 3/3 | 5.23 s · 3/3 | 6.68 s · 3/3 | — | -11.3% |
| filters | 4.98 s · 3/3 | 3.84 s · 3/3 | 6.07 s · 3/3 | — | +29.7% |
| autocomplete | 8.72 s · 3/3 | 4.61 s · 3/3 | 9.43 s · 3/3 | — | +89.1% |
| wizard-6 | 13.35 s · 3/3 | 30.08 s · 3/3 | 24.28 s · 3/3 | — | -55.6% |
| wizard-10 | 26.14 s · 3/3 | 74.49 s · 3/3 | 40.21 s · 3/3 | — | -64.9% |
| compare-offers | 4.71 s · 3/3 | 12.26 s · 3/3 | 8.99 s · 3/3 | — | -61.6% |
| research-offers | 17.09 s · 1/3 | 15.32 s · 2/3 | 31.16 s · 1/3 | — | +11.6% |
| tabs | — s · 0/3 | — s · 0/3 | — s · 0/3 | — | — |

Średnie składników ze wszystkich prób danej grupy (nie tylko sukcesów):

| Zadanie / silnik | n | Setup s | Zadanie s | Model s | Jev s | Pozostałe s | Wywołania model / Jev | Koszt USD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| search / app-auto | 3 | 0.42 | 4.51 | 2.39 | 1.77 | 0.34 | 2.0 / 3.0 | 0.011820 |
| search / app-first | 3 | 0.39 | 5.18 | 3.15 | 1.87 | 0.16 | 2.0 / 3.0 | 0.013154 |
| search / browser-use | 3 | 2.05 | 6.29 | 4.47 | 0.00 | 1.82 | 2.3 / 0.0 | 0.010120 |
| filters / app-auto | 3 | 0.40 | 5.10 | 2.95 | 1.80 | 0.35 | 2.0 / 4.0 | 0.012271 |
| filters / app-first | 3 | 0.40 | 4.16 | 2.58 | 1.38 | 0.20 | 2.0 / 4.0 | 0.012329 |
| filters / browser-use | 3 | 2.01 | 6.95 | 4.49 | 0.00 | 2.47 | 2.0 / 0.0 | 0.008157 |
| autocomplete / app-auto | 3 | 0.40 | 7.95 | 5.65 | 1.65 | 0.65 | 2.0 / 4.0 | 0.011854 |
| autocomplete / app-first | 3 | 0.40 | 4.95 | 3.11 | 1.47 | 0.37 | 2.3 / 3.3 | 0.014392 |
| autocomplete / browser-use | 3 | 2.05 | 9.02 | 7.26 | 0.00 | 1.76 | 4.0 / 0.0 | 0.014117 |
| wizard-6 / app-auto | 3 | 0.40 | 15.39 | 14.61 | 0.00 | 0.78 | 8.0 / 0.0 | 0.082901 |
| wizard-6 / app-first | 3 | 0.40 | 33.13 | 28.32 | 4.10 | 0.72 | 17.7 / 9.3 | 0.288738 |
| wizard-6 / browser-use | 3 | 2.08 | 24.10 | 15.17 | 0.00 | 8.93 | 7.0 / 0.0 | 0.034771 |
| wizard-10 / app-auto | 3 | 0.40 | 25.91 | 24.64 | 0.00 | 1.27 | 12.0 / 0.0 | 0.153008 |
| wizard-10 / app-first | 3 | 0.39 | 71.00 | 68.85 | 0.98 | 1.18 | 42.7 / 1.0 | 0.793285 |
| wizard-10 / browser-use | 3 | 2.12 | 41.47 | 26.89 | 0.00 | 14.58 | 11.0 / 0.0 | 0.063287 |
| compare-offers / app-auto | 3 | 0.40 | 5.13 | 4.97 | 0.00 | 0.16 | 3.0 / 0.0 | 0.022216 |
| compare-offers / app-first | 3 | 0.40 | 12.65 | 11.23 | 1.22 | 0.20 | 5.7 / 2.3 | 0.047695 |
| compare-offers / browser-use | 3 | 2.06 | 10.23 | 8.44 | 0.00 | 1.79 | 2.0 / 0.0 | 0.047077 |
| research-offers / app-auto | 3 | 0.40 | 5.82 | 5.53 | 0.00 | 0.28 | 3.7 / 0.0 | 0.033310 |
| research-offers / app-first | 3 | 0.40 | 10.26 | 8.97 | 0.86 | 0.43 | 6.7 / 1.3 | 0.073241 |
| research-offers / browser-use | 3 | 2.00 | 11.41 | 8.47 | 0.00 | 2.95 | 5.3 / 0.0 | 0.050451 |
| tabs / app-auto | 3 | 0.39 | 0.17 | 0.17 | 0.00 | 0.01 | 1.0 / 0.0 | 0.000000 |
| tabs / app-first | 3 | 0.40 | 0.11 | 0.10 | 0.00 | 0.01 | 1.0 / 0.0 | 0.000000 |
| tabs / browser-use | 3 | 1.99 | 1.38 | 0.49 | 0.00 | 0.90 | 4.0 / 0.0 | 0.000000 |

Wszystkie serie (routing i desktop mają osobne kryteria):

| Plik | Rodzaj | Wynik | Raportowany USD |
|---|---|---:|---:|
| decisions-final-heldout.json | routing | 6/6 | 0.009403 |
| decisions-pilot-1.json | routing | 12/16 | 0.023632 |
| decisions-pilot-2.json | routing | 15/16 | 0.025827 |
| decisions-pilot-3.json | routing | 16/16 | 0.025509 |
| desktop-auto-recheck.json | desktop | 2/3 | nie zmierzono tutaj |
| desktop-auto-schema.json | desktop | 4/4 | nie zmierzono tutaj |
| desktop-auto.json | desktop | 2/3 | nie zmierzono tutaj |
| final-local.json | wykonanie | 58/72 | 1.798193 |
| pilot-auto-1.json | wykonanie | 5/5 | 0.281290 |
| pilot-confidence-035.json | wykonanie | 1/1 | 0.233415 |
| pilot-context-v2.json | wykonanie | 0/1 | 0.005164 |
| pilot-guard-v5.json | wykonanie | 2/2 | 0.036548 |
| pilot-occlusion-v3.json | wykonanie | 4/4 | 0.144828 |
| pilot-runner-validation.json | wykonanie | 4/4 | 0.011144 |
| pilot-stale-v4.json | wykonanie | 2/2 | 0.071233 |

Każda próba wykonawcza, również nieudana (czas zadania w s):

| Seria | Zadanie | Silnik | Powt. | Wynik | Czas s | Model / Jev | USD |
|---|---|---|---:|---|---:|---:|---:|
| final-local.json | search | app-auto | 1 | PASS | 4.16 | 2 / 3 | 0.003938 |
| final-local.json | search | app-first | 1 | PASS | 5.94 | 2 / 3 | 0.003989 |
| final-local.json | search | browser-use | 1 | PASS | 4.85 | 2 / 0 | 0.002577 |
| final-local.json | search | app-first | 2 | PASS | 4.38 | 2 / 3 | 0.004267 |
| final-local.json | search | browser-use | 2 | PASS | 7.34 | 3 / 0 | 0.004485 |
| final-local.json | search | app-auto | 2 | PASS | 4.64 | 2 / 3 | 0.003938 |
| final-local.json | search | browser-use | 3 | PASS | 6.68 | 2 / 0 | 0.003058 |
| final-local.json | search | app-auto | 3 | PASS | 4.72 | 2 / 3 | 0.003944 |
| final-local.json | search | app-first | 3 | PASS | 5.23 | 2 / 3 | 0.004898 |
| final-local.json | filters | app-first | 1 | PASS | 3.69 | 2 / 4 | 0.004092 |
| final-local.json | filters | browser-use | 1 | PASS | 6.07 | 2 / 0 | 0.002983 |
| final-local.json | filters | app-auto | 1 | PASS | 5.51 | 2 / 4 | 0.004056 |
| final-local.json | filters | browser-use | 2 | PASS | 5.45 | 2 / 0 | 0.002469 |
| final-local.json | filters | app-auto | 2 | PASS | 4.80 | 2 / 4 | 0.004063 |
| final-local.json | filters | app-first | 2 | PASS | 4.97 | 2 / 4 | 0.004143 |
| final-local.json | filters | app-auto | 3 | PASS | 4.98 | 2 / 4 | 0.004152 |
| final-local.json | filters | app-first | 3 | PASS | 3.84 | 2 / 4 | 0.004094 |
| final-local.json | filters | browser-use | 3 | PASS | 9.35 | 2 / 0 | 0.002705 |
| final-local.json | autocomplete | browser-use | 1 | PASS | 9.52 | 4 / 0 | 0.004930 |
| final-local.json | autocomplete | app-auto | 1 | PASS | 10.61 | 2 / 4 | 0.003946 |
| final-local.json | autocomplete | app-first | 1 | PASS | 6.05 | 3 / 2 | 0.006303 |
| final-local.json | autocomplete | app-auto | 2 | PASS | 4.52 | 2 / 4 | 0.003943 |
| final-local.json | autocomplete | app-first | 2 | PASS | 4.20 | 2 / 4 | 0.004074 |
| final-local.json | autocomplete | browser-use | 2 | PASS | 8.09 | 4 / 0 | 0.004545 |
| final-local.json | autocomplete | app-first | 3 | PASS | 4.61 | 2 / 4 | 0.004015 |
| final-local.json | autocomplete | browser-use | 3 | PASS | 9.43 | 4 / 0 | 0.004641 |
| final-local.json | autocomplete | app-auto | 3 | PASS | 8.72 | 2 / 4 | 0.003964 |
| final-local.json | wizard-6 | app-auto | 1 | PASS | 13.35 | 8 / 0 | 0.027760 |
| final-local.json | wizard-6 | app-first | 1 | PASS | 24.51 | 13 / 14 | 0.054731 |
| final-local.json | wizard-6 | browser-use | 1 | PASS | 24.28 | 7 / 0 | 0.011786 |
| final-local.json | wizard-6 | app-first | 2 | PASS | 30.08 | 14 / 13 | 0.061246 |
| final-local.json | wizard-6 | browser-use | 2 | PASS | 26.62 | 7 / 0 | 0.011758 |
| final-local.json | wizard-6 | app-auto | 2 | PASS | 21.56 | 8 / 0 | 0.027564 |
| final-local.json | wizard-6 | browser-use | 3 | PASS | 21.41 | 7 / 0 | 0.011227 |
| final-local.json | wizard-6 | app-auto | 3 | PASS | 11.27 | 8 / 0 | 0.027577 |
| final-local.json | wizard-6 | app-first | 3 | PASS | 44.82 | 26 / 1 | 0.172761 |
| final-local.json | wizard-10 | app-first | 1 | PASS | 60.36 | 42 / 1 | 0.256966 |
| final-local.json | wizard-10 | browser-use | 1 | PASS | 40.21 | 11 / 0 | 0.020710 |
| final-local.json | wizard-10 | app-auto | 1 | PASS | 26.14 | 12 / 0 | 0.051791 |
| final-local.json | wizard-10 | browser-use | 2 | PASS | 47.80 | 11 / 0 | 0.020476 |
| final-local.json | wizard-10 | app-auto | 2 | PASS | 26.79 | 12 / 0 | 0.052034 |
| final-local.json | wizard-10 | app-first | 2 | PASS | 74.49 | 42 / 1 | 0.261911 |
| final-local.json | wizard-10 | app-auto | 3 | PASS | 24.80 | 12 / 0 | 0.049183 |
| final-local.json | wizard-10 | app-first | 3 | PASS | 78.16 | 44 / 1 | 0.274408 |
| final-local.json | wizard-10 | browser-use | 3 | PASS | 36.40 | 11 / 0 | 0.022101 |
| final-local.json | compare-offers | browser-use | 1 | PASS | 13.53 | 2 / 0 | 0.017121 |
| final-local.json | compare-offers | app-auto | 1 | PASS | 4.71 | 3 / 0 | 0.007447 |
| final-local.json | compare-offers | app-first | 1 | PASS | 14.18 | 5 / 4 | 0.014436 |
| final-local.json | compare-offers | app-auto | 2 | PASS | 4.59 | 3 / 0 | 0.007362 |
| final-local.json | compare-offers | app-first | 2 | PASS | 11.50 | 6 / 2 | 0.016200 |
| final-local.json | compare-offers | browser-use | 2 | PASS | 8.99 | 2 / 0 | 0.014877 |
| final-local.json | compare-offers | app-first | 3 | PASS | 12.26 | 6 / 1 | 0.017059 |
| final-local.json | compare-offers | browser-use | 3 | PASS | 8.17 | 2 / 0 | 0.015079 |
| final-local.json | compare-offers | app-auto | 3 | PASS | 6.09 | 3 / 0 | 0.007407 |
| final-local.json | research-offers | app-auto | 1 | PASS | 17.09 | 9 / 0 | 0.033310 |
| final-local.json | research-offers | app-first | 1 | PASS | 14.82 | 9 / 2 | 0.034103 |
| final-local.json | research-offers | browser-use | 1 | PASS | 31.16 | 8 / 0 | 0.050451 |
| final-local.json | research-offers | app-first | 2 | PASS | 15.81 | 10 / 2 | 0.039138 |
| final-local.json | research-offers | browser-use | 2 | FAIL | 1.50 | 4 / 0 | 0.000000 |
| final-local.json | research-offers | app-auto | 2 | FAIL | 0.20 | 1 / 0 | 0.000000 |
| final-local.json | research-offers | browser-use | 3 | FAIL | 1.58 | 4 / 0 | 0.000000 |
| final-local.json | research-offers | app-auto | 3 | FAIL | 0.16 | 1 / 0 | 0.000000 |
| final-local.json | research-offers | app-first | 3 | FAIL | 0.14 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-first | 1 | FAIL | 0.09 | 1 / 0 | 0.000000 |
| final-local.json | tabs | browser-use | 1 | FAIL | 1.42 | 4 / 0 | 0.000000 |
| final-local.json | tabs | app-auto | 1 | FAIL | 0.17 | 1 / 0 | 0.000000 |
| final-local.json | tabs | browser-use | 2 | FAIL | 1.22 | 4 / 0 | 0.000000 |
| final-local.json | tabs | app-auto | 2 | FAIL | 0.16 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-first | 2 | FAIL | 0.07 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-auto | 3 | FAIL | 0.19 | 1 / 0 | 0.000000 |
| final-local.json | tabs | app-first | 3 | FAIL | 0.16 | 1 / 0 | 0.000000 |
| final-local.json | tabs | browser-use | 3 | FAIL | 1.51 | 4 / 0 | 0.000000 |
| pilot-auto-1.json | search | app-auto | 1 | PASS | 3.72 | 2 / 3 | 0.004716 |
| pilot-auto-1.json | wizard-6 | app-auto | 1 | PASS | 9.93 | 7 / 5 | 0.024082 |
| pilot-auto-1.json | compare-offers | app-auto | 1 | PASS | 7.51 | 4 / 0 | 0.009110 |
| pilot-auto-1.json | tabs | app-auto | 1 | PASS | 7.55 | 3 / 4 | 0.005870 |
| pilot-auto-1.json | google-flights | app-auto | 1 | PASS | 41.02 | 24 / 1 | 0.237512 |
| pilot-confidence-035.json | google-flights | app-auto | 1 | PASS | 50.94 | 25 / 9 | 0.233415 |
| pilot-context-v2.json | google-flights | app-auto | 1 | FAIL | 18.33 | 2 / 11 | 0.005164 |
| pilot-guard-v5.json | google-flights | app-auto | 1 | PASS | 18.65 | 2 / 19 | 0.018395 |
| pilot-guard-v5.json | google-flights | app-auto | 2 | PASS | 18.90 | 2 / 19 | 0.018153 |
| pilot-occlusion-v3.json | autocomplete | app-auto | 1 | PASS | 5.39 | 2 / 4 | 0.003967 |
| pilot-occlusion-v3.json | wizard-6 | app-auto | 1 | PASS | 10.54 | 8 / 0 | 0.027515 |
| pilot-occlusion-v3.json | research-offers | app-auto | 1 | PASS | 19.45 | 9 / 0 | 0.030766 |
| pilot-occlusion-v3.json | google-flights | app-auto | 1 | PASS | 22.85 | 9 / 11 | 0.082580 |
| pilot-runner-validation.json | search | app-auto | 1 | PASS | 4.01 | 2 / 3 | 0.003914 |
| pilot-runner-validation.json | search | app-first | 1 | PASS | 3.36 | 2 / 3 | 0.003997 |
| pilot-runner-validation.json | search | ultrafast | 1 | PASS | 2.86 | 1 / 3 | 0.000476 |
| pilot-runner-validation.json | search | browser-use | 1 | PASS | 5.03 | 2 / 0 | 0.002756 |
| pilot-stale-v4.json | google-flights | app-auto | 1 | PASS | 17.55 | 2 / 18 | 0.017521 |
| pilot-stale-v4.json | google-flights | app-auto | 2 | PASS | 37.97 | 6 / 14 | 0.053712 |

Każda decyzja routingu (narzędzia nie są wykonywane):

| Seria | Przypadek | Oczekiwano | Wybrano | Wynik | Czas s | USD |
|---|---|---|---|---|---:|---:|
| decisions-final-heldout.json | italian-city | fast | fast | PASS | 1.24 | 0.001599 |
| decisions-final-heldout.json | inventory | fast | fast | PASS | 1.46 | 0.001605 |
| decisions-final-heldout.json | lease-cost | planned | planned | PASS | 1.01 | 0.001539 |
| decisions-final-heldout.json | multi-page | planned | planned | PASS | 0.97 | 0.001470 |
| decisions-final-heldout.json | registration-wizard | planned | planned | PASS | 1.10 | 0.001540 |
| decisions-final-heldout.json | missing-card | planned | planned | PASS | 1.10 | 0.001650 |
| decisions-pilot-1.json | search | fast | fast | PASS | 1.46 | 0.001586 |
| decisions-pilot-1.json | filters | fast | planned | FAIL | 1.01 | 0.001371 |
| decisions-pilot-1.json | autocomplete | fast | planned | FAIL | 1.09 | 0.001346 |
| decisions-pilot-1.json | flights | fast | planned | FAIL | 2.34 | 0.001388 |
| decisions-pilot-1.json | polish-search | fast | fast | PASS | 1.22 | 0.001643 |
| decisions-pilot-1.json | new-tab | fast | planned | FAIL | 0.89 | 0.001369 |
| decisions-pilot-1.json | hotel | planned | planned | PASS | 0.79 | 0.001385 |
| decisions-pilot-1.json | research | planned | planned | PASS | 1.29 | 0.001384 |
| decisions-pilot-1.json | polish-analysis | planned | planned | PASS | 1.06 | 0.001385 |
| decisions-pilot-1.json | missing-values | planned | planned | PASS | 1.07 | 0.001732 |
| decisions-pilot-1.json | article | planned | planned | PASS | 2.50 | 0.001347 |
| decisions-pilot-1.json | mixed | planned | planned | PASS | 1.01 | 0.001377 |
| decisions-pilot-1.json | wizard | planned | planned | PASS | 0.81 | 0.001396 |
| decisions-pilot-1.json | form | planned | planned | PASS | 0.91 | 0.001672 |
| decisions-pilot-1.json | form-polish | planned | planned | PASS | 1.13 | 0.001870 |
| decisions-pilot-1.json | cycle-recovery | planned | planned | PASS | 0.79 | 0.001382 |
| decisions-pilot-2.json | search | fast | fast | PASS | 1.39 | 0.001636 |
| decisions-pilot-2.json | filters | fast | fast | PASS | 0.97 | 0.001489 |
| decisions-pilot-2.json | autocomplete | fast | fast | PASS | 1.02 | 0.001528 |
| decisions-pilot-2.json | flights | fast | fast | PASS | 1.31 | 0.001990 |
| decisions-pilot-2.json | polish-search | fast | fast | PASS | 0.94 | 0.001674 |
| decisions-pilot-2.json | new-tab | fast | fast | PASS | 1.47 | 0.001490 |
| decisions-pilot-2.json | hotel | planned | planned | PASS | 0.91 | 0.001427 |
| decisions-pilot-2.json | research | planned | planned | PASS | 2.41 | 0.001427 |
| decisions-pilot-2.json | polish-analysis | planned | planned | PASS | 1.05 | 0.001427 |
| decisions-pilot-2.json | missing-values | planned | planned | PASS | 1.08 | 0.001561 |
| decisions-pilot-2.json | article | planned | planned | PASS | 1.06 | 0.001412 |
| decisions-pilot-2.json | mixed | planned | planned | PASS | 1.02 | 0.001420 |
| decisions-pilot-2.json | wizard | planned | fast | FAIL | 1.62 | 0.002297 |
| decisions-pilot-2.json | form | planned | planned | PASS | 0.98 | 0.001718 |
| decisions-pilot-2.json | form-polish | planned | planned | PASS | 1.08 | 0.001906 |
| decisions-pilot-2.json | cycle-recovery | planned | planned | PASS | 0.95 | 0.001425 |
| decisions-pilot-3.json | search | fast | fast | PASS | 1.15 | 0.001618 |
| decisions-pilot-3.json | filters | fast | fast | PASS | 1.17 | 0.001572 |
| decisions-pilot-3.json | autocomplete | fast | fast | PASS | 1.15 | 0.001562 |
| decisions-pilot-3.json | flights | fast | fast | PASS | 2.42 | 0.002002 |
| decisions-pilot-3.json | polish-search | fast | fast | PASS | 1.15 | 0.001716 |
| decisions-pilot-3.json | new-tab | fast | fast | PASS | 7.58 | 0.001543 |
| decisions-pilot-3.json | hotel | planned | planned | PASS | 1.02 | 0.001462 |
| decisions-pilot-3.json | research | planned | planned | PASS | 1.03 | 0.001461 |
| decisions-pilot-3.json | polish-analysis | planned | planned | PASS | 1.08 | 0.001466 |
| decisions-pilot-3.json | missing-values | planned | planned | PASS | 1.16 | 0.001502 |
| decisions-pilot-3.json | article | planned | planned | PASS | 1.17 | 0.001447 |
| decisions-pilot-3.json | mixed | planned | planned | PASS | 1.01 | 0.001525 |
| decisions-pilot-3.json | wizard | planned | planned | PASS | 2.34 | 0.001533 |
| decisions-pilot-3.json | form | planned | planned | PASS | 2.36 | 0.001749 |
| decisions-pilot-3.json | form-polish | planned | planned | PASS | 1.14 | 0.001891 |
| decisions-pilot-3.json | cycle-recovery | planned | planned | PASS | 1.29 | 0.001460 |

Każda kontrola desktopu:

| Seria | Kontrola | Wynik | Czas s (jeśli zmierzono) |
|---|---|---|---:|
| desktop-auto-recheck.json | auto_navigation | PASS | 7.39 |
| desktop-auto-recheck.json | stop | PASS | 0.03 |
| desktop-auto-recheck.json | classic_after_stop | FAIL | — |
| desktop-auto-schema.json | auto_navigation | PASS | 6.39 |
| desktop-auto-schema.json | stop | PASS | 0.03 |
| desktop-auto-schema.json | classic_after_stop | PASS | — |
| desktop-auto-schema.json | followup_context | PASS | — |
| desktop-auto.json | auto_navigation | PASS | 15.51 |
| desktop-auto.json | stop | PASS | 0.03 |
| desktop-auto.json | classic_after_stop | FAIL | — |
