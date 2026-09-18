# Jev Auto — wdrożenie i końcowe porównanie

**Porównanie zakończone: 119/119 poprawnych prób w zadeklarowanej próbce.** Gemini wybiera szybką pętlę Jev lub planowane grupy akcji w tej samej aplikacji. Zachowano UX, sesję, uprawnienia, dowody i Stop. Nowy tryb pozostaje eksperymentalny; domyślny Classic i main nie zostały zmienione.

**Wniosek architektoniczny:** warto zachować obecną aplikację i dobierać wykonanie do podzadania. Auto wyraźnie przyspieszyło długie formularze i porównania ofert. Nie uzyskuje najlepszego czasu w każdej kategorii; native Ultrafast i prostszy First nadal są ważnymi punktami odniesienia. Wyniki nie uzasadniają pełnej migracji aplikacji do Browser Use.

Formularz 10-etapowy: **26,14 s Auto / 74,49 s First / 40,21 s Browser Use**, każdy 3/3. Formularz 6-etapowy: 13,35 / 30,08 / 24,28 s. Hotel: 4,71 / 12,26 / 8,99 s. Nowe dane także zostały zmierzone: 27/27 sukcesów. Auto przyspieszyło nowy formularz i nowe porównanie cen; przy prostych zadaniach wyniki są mieszane. To pomiar pełnych wariantów, nie osobna ablacja batchowania, promptu, progu confidence i kontroli elementów.

## Google Flights: mediana i koszt wolnych prób

| Silnik | Sukcesy | Mediana s | Min–max s | Średnia wszystkich prób s | Koszt 5 prób USD |
|---|---:|---:|---:|---:|---:|
| app-auto | 5/5 | 21.79 | 17.83–64.02 | 30.11 | 0.359967 |
| app-first | 5/5 | 36.82 | 27.20–45.18 | 37.65 | 0.754658 |
| browser-use | 5/5 | 35.45 | 35.14–39.09 | 36.53 | 0.226265 |
| ultrafast | 5/5 | 13.32 | 11.70–14.38 | 13.25 | 0.024067 |

Pierwsza próba Auto trwała **64,02 s**: Jev zgłosił `uncertain_operation` po dwóch akcjach, więc zadanie ukończył Gemini (26 wywołań; 59,28 s głównego modelu, 1,78 s Jev). Wynik pozostał w próbie. Poprawny fallback chroni ukończenie zadania, ale może wyraźnie zwiększać czas i koszt. Piloty 18,65/18,90 s nie zastępują tej finalnej serii.

## Co dokładnie jest liczone

Próbka główna: 54 kompletne próby pierwszych sześciu grup z `final-local.json`, 18 prób **całego** wznowionego bloku research/kart z `final-recovery.json`, 27 nowych wariantów i 20 Flights. Dobór tego wznowionego bloku ustalono przed jego uruchomieniem. Pozostałe 18 rekordów pierwotnego research/kart — **4 sukcesy i 14 błędów kredytów** — zachowano jako osobny przerwany blok; nie usuwamy samych porażek i nie dokładamy samych sukcesów do median wznowienia.

Wszystkie zachowane rekordy Auto: **159 prób runnera**, **78 decyzji routingu**, **10 kontroli desktopu**. Tabele zawierają także piloty, celowy Stop i sprawdzenie 402. Koszt runner/routing: **$4.783456077**; desktop: **$0.102326586**; razem **$4.885782663**, wyłącznie ten etap Auto. Usage po przerwaniu może być niepełne. Nie należy sumować kopii danych i archiwów drugi raz.

Odczyt konta po doładowaniu potwierdził dostępne środki, a hashe kompilatów zgodność z zamrożoną aplikacją. Nie zmieniano promptów, modeli, progu ani kodu aplikacji między blokami. Jedyna wcześniejsza zmiana runnera po zamrożeniu to zatrzymanie na 401/402 (`69e3280`). Nie wpływa na poprawne wykonania. Oba warianty aplikacji używają wspólnej naprawy schematu OpenRouter.

Końcowy retest routingu: **13/16** standardowych i **6/6** nowych poleceń; **20/20** zaproponowanych wywołań ma poprawny schemat argumentów. W pierwszym reteście 2 przypadki nie dostały odpowiedzi z powodu HTTP 429, a w jednym Gemini wybrał dozwolone `browser_observe` dla nowej karty zamiast oczekiwanego fast. Osobna powtórka wyłącznie dwóch przypadków 429 dała 2/2 poprawne decyzje i argumenty; oryginalne błędy pozostają w tabelach. Nie zmieniano oczekiwanej kategorii nowej karty, więc odchylenie routingu pozostaje jawne. Jest to ocena wyboru ścieżki i formatu, nie poprawności wykonania ani całej polityki bezpieczeństwa. W 38 próbach Auto pierwsza ścieżka była fast 20 razy, planned 18 razy; zmiana ścieżki wystąpiła w 6 przebiegach. Routing korzysta z normalnej odpowiedzi planisty, bez osobnego wywołania klasyfikatora; nie zmierzono jego czystego narzutu osobną ablacją.

[Wykres PNG](benchmarks/jev-auto/comparison.png) · [Wykres SVG](benchmarks/jev-auto/comparison.svg). Pokazują mediany i zakres min–max, z osobną skalą każdego panelu.

18 września 2026. Implementacja w osobnym worktree `/home/bartek/linux-agent-auto`, branch `experiment/jev-auto`. [Uruchomienie i architektura](jev-auto.md), [plan i bramki](jev-auto-plan.md). Poniżej oddzielono zamrożone porównanie od pilotów, routingu i testów aplikacji.

## Metoda

Kod aplikacji zamrożony na `0ea227b271dbc71b5dc7d503a4a4438e3141c361`; każdy plik serii zawiera rewizję, `dirty`, SHA-256 runnera, fixture’ów i kompilatów. Baseline First: `77846cb0d97af218dd8a2832dab9f488c703b210`. Oba warianty aplikacji korzystają z **tego samego poprawionego adaptera OpenRouter**; First zachowuje bazowy kontroler, narzędzia i worker. Nie przypisujemy naprawy schematu tylko Auto. Native Browser Use/Ultrafast pochodzą z dotychczasowego, przypiętego PoC; nie są podłączone do polityki aplikacji.

Gemini `google/gemini-3.8-flash / low`, OpenRouter `google-ai-studio`, Jev `jev-1.13.0`. Ta sama wersja Chromium, viewport 1120×780, `en-US`, strefa `Europe/Zurich`, świeże profile, sekwencyjne wykonanie i rotacja kolejności silników. Nie prowadzono równolegle innych zadań modelowych ani suite testowej. Lokalny serwer fixture’ów; Flights na żywej stronie Google. Wyszukiwanie Zurich–London, 20 września 2026, one-way, jedna osoba, Economy; bez rezerwacji.

**Sukces wymaga ukończenia i niezależnej weryfikacji stanu strony**, a nie tylko deklaracji modelu. Formularze sprawdzają zapisane pola, porównania sprawdzają wybór i obliczoną kwotę, research wymaga wizyty na każdej z trzech stron. Weryfikator Flights sprawdza trasę, datę i rok, kierunek podróży, pasażerów, klasę i wyniki. Nowe warianty zostały sprawdzone deterministycznie wraz z negatywnymi przypadkami, a następnie odłożone do serii końcowej: cztery inne miasta i osoba, inne ceny i liczba nocy, Rome zamiast Paris. To nowe dane w znanych typach fixture’ów, **nie** dowód uogólnienia na nieznane witryny.

`taskMs` = praca agenta wraz z naprawami oraz niezależna weryfikacja. `setupMs` = uruchomienie drivera/przeglądarki, nawigacja, consent, pierwsza obserwacja. Screenshot i cleanup są poza czasem zadania. Uruchomienie całego Electron/Podman ma osobny test. Mediany dotyczą poprawnych prób, a porażki pozostają w mianowniku. Składniki czasu to średnie wszystkich prób danej grupy; adapter obejmuje transport i retry, nie samą inferencję. Pozostałe = czas zadania minus model i Jev, w tym narzędzia, oczekiwania i weryfikacja. Nie ma osobnego wywołania routera, ale nie zmierzono jego czystego narzutu przez ablację.

Kwoty to usage kosztu OpenRouter plus koszt Jev obliczony z tokenów wejściowych i skonfigurowanej stawki $0,042 / mln. Nie obejmują opłat infrastrukturalnych ani ewentualnych przerwanych zapytań bez zwróconego usage. Desktop ma osobne kontrole; eksport 10 przebiegów z nowej izolowanej bazy (`validation/desktop-usage.json`) wykazuje dodatkowe $0,102326586 zwróconego usage, w tym nieudane kontrole i Stop. Mała próbka 3 lub 5 powtórzeń nie dowodzi produkcyjnej niezawodności ani stabilnego rankingu opóźnień dostawcy.

## Etapy i wszystkie niepowodzenia przed zamrożeniem

1. Routing bez wykonania narzędzi: 12/16 → 15/16 → 16/16 po poprawieniu instrukcji wyboru w już otwartej stronie i wizardach. Następnie 6/6 nowych poleceń. Nie mylić z sukcesem zadania. Późniejszy audyt argumentów wykazał po 2 niepoprawne wywołania batch w każdej z trzech wcześniejszych serii routingu (JSON jako tekst); ich wynik 16/16 dotyczy wyłącznie wyboru ścieżki. Po poprawce schematu dodatkowy audyt 97 rzeczywistych wywołań `browser_task`/`browser_batch` w serii końcowej wykazał 0 niepoprawnych argumentów (`validation/final-arguments-audit.json`). Końcowy retest wykonano po doładowaniu; wynik podano wyżej.
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

Końcowy audyt śladów wszystkich porównań: **193/194** wywołania task/batch zgodne ze schematem. Jedyny błąd to `wait` z `durationMs` zamiast `ms` w drugim Auto Flights. Runtime odmówił wykonania, model poprawił argument i ukończył zadanie. To nie błąd obiektowego `oneOf`; walidacja pozostała ścisła, a koszt naprawy jest w czasie próby.

Dodatkowy test z widoczną przeglądarką: search Auto **PASS, 3,927 s**. Celowy Stop na Flights po 2,5 s: stan stopped, zamknięcie przeglądarki **129,9 ms**, całe sprzątanie **139,1 ms**; `success=false` w tym rekordzie jest oczekiwane, bo zadanie zostało celowo przerwane. Niezależne testy jednostkowe obejmują również Stop podczas inferencji Jev i pomiędzy edycjami batcha. Skan po wznowieniu objął 1062 pliki/eksporty, a końcowy skan po przygotowaniu eksportów 1081: brak rzeczywistych kluczy. Runtime Chrome sprawdzano osobno wcześniej; końcowa kontrola potwierdziła brak pozostawionych własnych procesów.

## Dane i każda zachowana próba

[JSON-y, ślady i logi](benchmarks/jev-auto) zawierają wszystkie serie. Eksporty usuwają identyfikatory konta dostawcy, zachowując pomiary; manifesty podają hashe. Pełna wcześniejsza historia jest w [zbiorczym archiwum](../../linux-agent-browser-poc/WSZYSTKIE-WYNIKI-TESTOW.md).

| Zadanie | Auto | First | Browser Use | Ultrafast | Zmiana mediany Auto vs First |
|---|---:|---:|---:|---:|---:|
| search | 4.64 s · 3/3 | 5.23 s · 3/3 | 6.68 s · 3/3 | — | -11.3% |
| filters | 4.98 s · 3/3 | 3.84 s · 3/3 | 6.07 s · 3/3 | — | +29.7% |
| autocomplete | 8.72 s · 3/3 | 4.61 s · 3/3 | 9.43 s · 3/3 | — | +89.1% |
| wizard-6 | 13.35 s · 3/3 | 30.08 s · 3/3 | 24.28 s · 3/3 | — | -55.6% |
| wizard-10 | 26.14 s · 3/3 | 74.49 s · 3/3 | 40.21 s · 3/3 | — | -64.9% |
| compare-offers | 4.71 s · 3/3 | 12.26 s · 3/3 | 8.99 s · 3/3 | — | -61.6% |
| research-offers | 13.72 s · 3/3 | 18.97 s · 3/3 | 29.03 s · 3/3 | — | -27.6% |
| tabs | 5.99 s · 3/3 | 5.15 s · 3/3 | 7.05 s · 3/3 | — | +16.3% |
| wizard-4-new | 10.29 s · 3/3 | 14.77 s · 3/3 | 15.01 s · 3/3 | — | -30.3% |
| compare-new | 3.99 s · 3/3 | 8.27 s · 3/3 | 12.93 s · 3/3 | — | -51.7% |
| autocomplete-new | 4.76 s · 3/3 | 4.91 s · 3/3 | 12.84 s · 3/3 | — | -3.1% |
| google-flights | 21.79 s · 5/5 | 36.82 s · 5/5 | 35.45 s · 5/5 | 13.32 s · 5/5 | -40.8% |

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
| research-offers / app-auto | 3 | 0.41 | 13.71 | 12.99 | 0.00 | 0.73 | 8.3 / 0.0 | 0.086534 |
| research-offers / app-first | 3 | 0.41 | 18.44 | 14.75 | 3.00 | 0.69 | 9.0 / 2.0 | 0.100939 |
| research-offers / browser-use | 3 | 2.01 | 30.44 | 23.40 | 0.00 | 7.04 | 8.0 / 0.0 | 0.167667 |
| tabs / app-auto | 3 | 0.39 | 6.01 | 4.02 | 1.76 | 0.23 | 3.0 / 4.0 | 0.018245 |
| tabs / app-first | 3 | 0.38 | 5.91 | 4.35 | 1.30 | 0.25 | 3.0 / 2.7 | 0.018865 |
| tabs / browser-use | 3 | 2.00 | 7.05 | 5.15 | 0.00 | 1.90 | 3.0 / 0.0 | 0.008117 |
| wizard-4-new / app-auto | 3 | 0.41 | 10.89 | 10.33 | 0.00 | 0.56 | 6.0 / 0.0 | 0.053623 |
| wizard-4-new / app-first | 3 | 0.41 | 16.92 | 10.85 | 5.57 | 0.49 | 5.7 / 13.3 | 0.058475 |
| wizard-4-new / browser-use | 3 | 2.12 | 15.70 | 9.47 | 0.00 | 6.24 | 5.0 / 0.0 | 0.023171 |
| compare-new / app-auto | 3 | 0.41 | 4.70 | 4.53 | 0.00 | 0.17 | 3.3 / 0.0 | 0.024005 |
| compare-new / app-first | 3 | 0.40 | 9.21 | 7.88 | 1.15 | 0.19 | 4.7 / 1.3 | 0.040009 |
| compare-new / browser-use | 3 | 2.21 | 12.95 | 11.00 | 0.00 | 1.95 | 3.0 / 0.0 | 0.070527 |
| autocomplete-new / app-auto | 3 | 0.39 | 5.95 | 3.41 | 1.90 | 0.64 | 2.0 / 4.0 | 0.011867 |
| autocomplete-new / app-first | 3 | 0.39 | 4.86 | 2.94 | 1.56 | 0.36 | 2.3 / 3.3 | 0.014471 |
| autocomplete-new / browser-use | 3 | 2.03 | 13.75 | 11.33 | 0.00 | 2.42 | 4.0 / 0.0 | 0.015052 |
| google-flights / app-auto | 5 | 3.17 | 30.11 | 17.80 | 8.66 | 3.65 | 8.2 / 14.4 | 0.359967 |
| google-flights / app-first | 5 | 3.24 | 37.65 | 33.26 | 1.33 | 3.07 | 19.2 / 1.4 | 0.754658 |
| google-flights / browser-use | 5 | 4.82 | 36.53 | 19.09 | 0.00 | 17.44 | 11.4 / 0.0 | 0.226265 |
| google-flights / ultrafast | 5 | 3.85 | 13.25 | 2.48 | 8.64 | 2.14 | 2.0 / 18.0 | 0.024067 |

Wszystkie serie (routing i desktop mają osobne kryteria):

| Plik | Rodzaj | Wynik | Raportowany USD |
|---|---|---:|---:|
| credit-recheck-1.json | wykonanie | 0/1 | 0.000000 |
| decisions-final-heldout.json | routing | 6/6 | 0.009403 |
| decisions-pilot-1.json | routing | 12/16 | 0.023632 |
| decisions-pilot-2.json | routing | 15/16 | 0.025827 |
| decisions-pilot-3.json | routing | 16/16 | 0.025509 |
| decisions-post-schema-heldout.json | routing | 6/6 | 0.009306 |
| decisions-post-schema-retry.json | routing | 2/2 | 0.003716 |
| decisions-post-schema.json | routing | 13/16 | 0.021797 |
| desktop-auto-recheck.json | desktop | 2/3 | nie zmierzono tutaj |
| desktop-auto-schema.json | desktop | 4/4 | nie zmierzono tutaj |
| desktop-auto.json | desktop | 2/3 | nie zmierzono tutaj |
| final-flights.json | wykonanie | 20/20 | 1.364958 |
| final-holdout.json | wykonanie | 27/27 | 0.311200 |
| final-local.json | wykonanie | 58/72 | 1.798193 |
| final-recovery.json | wykonanie | 18/18 | 0.400367 |
| headful-auto.json | wykonanie | 1/1 | 0.003941 |
| pilot-auto-1.json | wykonanie | 5/5 | 0.281290 |
| pilot-confidence-035.json | wykonanie | 1/1 | 0.233415 |
| pilot-context-v2.json | wykonanie | 0/1 | 0.005164 |
| pilot-guard-v5.json | wykonanie | 2/2 | 0.036548 |
| pilot-occlusion-v3.json | wykonanie | 4/4 | 0.144828 |
| pilot-runner-validation.json | wykonanie | 4/4 | 0.011144 |
| pilot-stale-v4.json | wykonanie | 2/2 | 0.071233 |
| stop-auto.json | wykonanie | 0/1 | 0.001987 |

Każda próba wykonawcza, również nieudana (czas zadania w s):

| Seria | Zadanie | Silnik | Powt. | Wynik | Czas s | Model / Jev | USD |
|---|---|---|---:|---|---:|---:|---:|
| credit-recheck-1.json | search | app-auto | 1 | FAIL | 0.46 | 1 / 0 | 0.000000 |
| final-flights.json | google-flights | app-auto | 1 | PASS | 64.02 | 26 / 3 | 0.224888 |
| final-flights.json | google-flights | app-first | 1 | PASS | 27.20 | 15 / 3 | 0.117888 |
| final-flights.json | google-flights | ultrafast | 1 | PASS | 13.32 | 2 / 19 | 0.005259 |
| final-flights.json | google-flights | browser-use | 1 | PASS | 39.09 | 12 / 0 | 0.047603 |
| final-flights.json | google-flights | app-first | 2 | PASS | 45.18 | 20 / 1 | 0.155895 |
| final-flights.json | google-flights | ultrafast | 2 | PASS | 14.38 | 2 / 19 | 0.005139 |
| final-flights.json | google-flights | browser-use | 2 | PASS | 35.45 | 11 / 0 | 0.043342 |
| final-flights.json | google-flights | app-auto | 2 | PASS | 26.71 | 5 / 15 | 0.047684 |
| final-flights.json | google-flights | ultrafast | 3 | PASS | 13.65 | 2 / 16 | 0.004164 |
| final-flights.json | google-flights | browser-use | 3 | PASS | 35.14 | 11 / 0 | 0.045314 |
| final-flights.json | google-flights | app-auto | 3 | PASS | 20.18 | 2 / 19 | 0.017911 |
| final-flights.json | google-flights | app-first | 3 | PASS | 35.81 | 19 / 1 | 0.157691 |
| final-flights.json | google-flights | browser-use | 4 | PASS | 35.43 | 11 / 0 | 0.043614 |
| final-flights.json | google-flights | app-auto | 4 | PASS | 21.79 | 6 / 16 | 0.051692 |
| final-flights.json | google-flights | app-first | 4 | PASS | 36.82 | 18 / 1 | 0.139616 |
| final-flights.json | google-flights | ultrafast | 4 | PASS | 13.18 | 2 / 19 | 0.005028 |
| final-flights.json | google-flights | app-auto | 5 | PASS | 17.83 | 2 / 19 | 0.017793 |
| final-flights.json | google-flights | app-first | 5 | PASS | 43.25 | 24 / 1 | 0.183568 |
| final-flights.json | google-flights | ultrafast | 5 | PASS | 11.70 | 2 / 17 | 0.004477 |
| final-flights.json | google-flights | browser-use | 5 | PASS | 37.56 | 12 / 0 | 0.046391 |
| final-holdout.json | wizard-4-new | app-auto | 1 | PASS | 10.29 | 6 / 0 | 0.017770 |
| final-holdout.json | wizard-4-new | app-first | 1 | PASS | 14.16 | 2 / 17 | 0.006948 |
| final-holdout.json | wizard-4-new | browser-use | 1 | PASS | 15.01 | 5 / 0 | 0.007622 |
| final-holdout.json | wizard-4-new | app-first | 2 | PASS | 21.82 | 9 / 10 | 0.032373 |
| final-holdout.json | wizard-4-new | browser-use | 2 | PASS | 17.32 | 5 / 0 | 0.008051 |
| final-holdout.json | wizard-4-new | app-auto | 2 | PASS | 8.94 | 6 / 0 | 0.017926 |
| final-holdout.json | wizard-4-new | browser-use | 3 | PASS | 14.79 | 5 / 0 | 0.007498 |
| final-holdout.json | wizard-4-new | app-auto | 3 | PASS | 13.43 | 6 / 0 | 0.017927 |
| final-holdout.json | wizard-4-new | app-first | 3 | PASS | 14.77 | 6 / 13 | 0.019154 |
| final-holdout.json | compare-new | app-first | 1 | PASS | 8.27 | 5 / 1 | 0.014830 |
| final-holdout.json | compare-new | browser-use | 1 | PASS | 13.42 | 3 / 0 | 0.024883 |
| final-holdout.json | compare-new | app-auto | 1 | PASS | 6.22 | 4 / 0 | 0.009100 |
| final-holdout.json | compare-new | browser-use | 2 | PASS | 12.93 | 3 / 0 | 0.022957 |
| final-holdout.json | compare-new | app-auto | 2 | PASS | 3.99 | 3 / 0 | 0.007561 |
| final-holdout.json | compare-new | app-first | 2 | PASS | 11.41 | 4 / 3 | 0.010892 |
| final-holdout.json | compare-new | app-auto | 3 | PASS | 3.87 | 3 / 0 | 0.007345 |
| final-holdout.json | compare-new | app-first | 3 | PASS | 7.97 | 5 / 0 | 0.014287 |
| final-holdout.json | compare-new | browser-use | 3 | PASS | 12.50 | 3 / 0 | 0.022687 |
| final-holdout.json | autocomplete-new | browser-use | 1 | PASS | 20.15 | 4 / 0 | 0.004816 |
| final-holdout.json | autocomplete-new | app-auto | 1 | PASS | 4.76 | 2 / 4 | 0.003954 |
| final-holdout.json | autocomplete-new | app-first | 1 | PASS | 4.91 | 2 / 4 | 0.004055 |
| final-holdout.json | autocomplete-new | app-auto | 2 | PASS | 8.39 | 2 / 4 | 0.003962 |
| final-holdout.json | autocomplete-new | app-first | 2 | PASS | 5.06 | 2 / 4 | 0.004131 |
| final-holdout.json | autocomplete-new | browser-use | 2 | PASS | 8.26 | 4 / 0 | 0.005224 |
| final-holdout.json | autocomplete-new | app-first | 3 | PASS | 4.62 | 3 / 2 | 0.006285 |
| final-holdout.json | autocomplete-new | browser-use | 3 | PASS | 12.84 | 4 / 0 | 0.005012 |
| final-holdout.json | autocomplete-new | app-auto | 3 | PASS | 4.69 | 2 / 4 | 0.003951 |
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
| final-recovery.json | research-offers | app-auto | 1 | PASS | 13.72 | 7 / 0 | 0.022533 |
| final-recovery.json | research-offers | app-first | 1 | PASS | 21.49 | 10 / 2 | 0.039080 |
| final-recovery.json | research-offers | browser-use | 1 | PASS | 28.54 | 8 / 0 | 0.054545 |
| final-recovery.json | research-offers | app-first | 2 | PASS | 14.85 | 8 / 2 | 0.028531 |
| final-recovery.json | research-offers | browser-use | 2 | PASS | 33.75 | 8 / 0 | 0.056443 |
| final-recovery.json | research-offers | app-auto | 2 | PASS | 14.00 | 9 / 0 | 0.033011 |
| final-recovery.json | research-offers | browser-use | 3 | PASS | 29.03 | 8 / 0 | 0.056679 |
| final-recovery.json | research-offers | app-auto | 3 | PASS | 13.42 | 9 / 0 | 0.030990 |
| final-recovery.json | research-offers | app-first | 3 | PASS | 18.97 | 9 / 2 | 0.033328 |
| final-recovery.json | tabs | app-first | 1 | PASS | 4.99 | 3 / 2 | 0.006334 |
| final-recovery.json | tabs | browser-use | 1 | PASS | 9.16 | 5 / 0 | 0.002399 |
| final-recovery.json | tabs | app-auto | 1 | PASS | 5.99 | 3 / 4 | 0.006007 |
| final-recovery.json | tabs | browser-use | 2 | PASS | 4.95 | 2 / 0 | 0.002705 |
| final-recovery.json | tabs | app-auto | 2 | PASS | 6.61 | 3 / 4 | 0.006237 |
| final-recovery.json | tabs | app-first | 2 | PASS | 5.15 | 3 / 2 | 0.006142 |
| final-recovery.json | tabs | app-auto | 3 | PASS | 5.43 | 3 / 4 | 0.006001 |
| final-recovery.json | tabs | app-first | 3 | PASS | 7.58 | 3 / 4 | 0.006389 |
| final-recovery.json | tabs | browser-use | 3 | PASS | 7.05 | 2 / 0 | 0.003013 |
| headful-auto.json | search | app-auto | 1 | PASS | 3.93 | 2 / 3 | 0.003941 |
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
| stop-auto.json | google-flights | app-auto | 1 | STOP (celowy) | 2.50 | 1 / 0 | 0.001987 |

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
| decisions-post-schema-heldout.json | italian-city | fast | fast | PASS | 3.00 | 0.001622 |
| decisions-post-schema-heldout.json | inventory | fast | fast | PASS | 2.05 | 0.001591 |
| decisions-post-schema-heldout.json | lease-cost | planned | planned | PASS | 4.08 | 0.001476 |
| decisions-post-schema-heldout.json | multi-page | planned | planned | PASS | 1.10 | 0.001467 |
| decisions-post-schema-heldout.json | registration-wizard | planned | planned | PASS | 0.88 | 0.001533 |
| decisions-post-schema-heldout.json | missing-card | planned | planned | PASS | 1.10 | 0.001617 |
| decisions-post-schema-retry.json | form | planned | planned | PASS | 1.19 | 0.001794 |
| decisions-post-schema-retry.json | form-polish | planned | planned | PASS | 1.11 | 0.001922 |
| decisions-post-schema.json | search | fast | fast | PASS | 1.33 | 0.001656 |
| decisions-post-schema.json | filters | fast | fast | PASS | 1.74 | 0.001583 |
| decisions-post-schema.json | autocomplete | fast | fast | PASS | 0.97 | 0.001570 |
| decisions-post-schema.json | flights | fast | fast | PASS | 1.14 | 0.001874 |
| decisions-post-schema.json | polish-search | fast | fast | PASS | 1.10 | 0.001712 |
| decisions-post-schema.json | new-tab | fast | planned | FAIL | 1.79 | 0.001446 |
| decisions-post-schema.json | hotel | planned | planned | PASS | 0.94 | 0.001481 |
| decisions-post-schema.json | research | planned | planned | PASS | 1.09 | 0.001480 |
| decisions-post-schema.json | polish-analysis | planned | planned | PASS | 0.89 | 0.001484 |
| decisions-post-schema.json | missing-values | planned | planned | PASS | 1.02 | 0.001539 |
| decisions-post-schema.json | article | planned | planned | PASS | 1.31 | 0.001466 |
| decisions-post-schema.json | mixed | planned | planned | PASS | 2.55 | 0.001473 |
| decisions-post-schema.json | wizard | planned | planned | PASS | 0.99 | 0.001556 |
| decisions-post-schema.json | form | planned | — | FAIL | 1.29 | 0.000000 |
| decisions-post-schema.json | form-polish | planned | — | FAIL | 1.10 | 0.000000 |
| decisions-post-schema.json | cycle-recovery | planned | planned | PASS | 2.19 | 0.001478 |

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
