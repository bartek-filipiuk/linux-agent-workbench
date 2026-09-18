# Wszystkie wyniki testów: Classic, Jev Hybrid, Jev First, Jev Auto, Gemini, Ultrafast i Browser Use

Zestawienie zapisane **18 września 2026**. Archiwum wyników istniejących w repozytoriach po eksperymentach z 17 września 2026; przy uruchomieniach PoC podano oryginalne daty UTC. Ten dokument nie oznacza ponownego uruchomienia testów. Wszystkie liczby pochodzą z zachowanych metryk lub wskazanych raportów walidacji.

**Aktualizacja Jev Auto:** hybryda została wdrożona i zakończyła **119/119 poprawnych prób** w zadeklarowanym porównaniu. Przyspiesza długie formularze i analizy, lecz nie wygrywa każdej kategorii; native Ultrafast nadal prowadzi na Flights. [Pełne wyniki Auto](#auto) są na końcu tego pliku. Wcześniejsze sekcje zachowują historyczne pomiary sprzed Auto. Łącznie zapisano **606 rekordów runnerów** (447 wcześniejszych + 159 Auto), osobno 78 decyzji routingu Auto, 8 wcześniejszych prób bezpośredniego drivera oraz 24 kontrole desktopu (14 + 10). Wszystkie błędy kredytów, rate limit, pilotów i odchylenia routingu pozostają w danych.

Łączny znany koszt zachowanych badań: **11,050362711 USD** (około 11,05 USD), bez wyceny abonamentu, części przerwanych zapytań i pracy programistycznej. Zobacz [ledger kosztów](COSTS.md) oraz [CSV każdej próby i decyzji](trials.csv).

Archiwum historyczne w języku polskim; aktualny [przewodnik po badaniach](README.md), [koszty](COSTS.md) i [opis aplikacji](../APPLICATION.md) są dokumentacją publikacyjną.

Nawigacja: [zakres](#zakres) · [finalny PoC](#poc) · [rozkład czasu](#czas) · [wcześniejsze porównania](#historia) · [piloty i błędy](#diagnostyka) · [Stop i desktop](#walidacja) · [koszty](#koszty) · [referencja 7 sekund](#referencja) · [wnioski do filmu i artykułu](#wnioski) · [każda próba](#proby) · [źródła](#zrodla).

<a id="zakres"></a>

## Zakres i zasady porównania

| Grupa | Liczba rekordów | Sposób użycia |
| --- | --- | --- |
| Finalne wcześniejsze porównania w aplikacji | 281 | 5 osobnych serii; nie łączyć różnych konfiguracji w jeden ranking |
| Wcześniejsze piloty i diagnostyki | 40 | W tym 2 celowo przerwane próby; poza rankingiem finalnym |
| Finalny PoC | 102 | 30 Flights + 72 lokalne; 3 silniki |
| Piloty PoC | 16 | W tym błędy setupu i weryfikatora |
| Celowe testy Stop w PoC | 7 | Osobny zegar zamknięcia przeglądarki i sprzątania |
| PoC z widocznym oknem | 1 | Jedna próba wyszukiwania |
| Bezpośredni driver Jev | 8 | Wynik funkcjonalny i czas podzadania; inny zegar |
| Kontrole desktopu z 4 raportów | 14 | W tym gotowość środowiska, nawigacja, Stop i dalsza praca |

Łącznie **383 próby w finalnych porównaniach** oraz **447 rekordów uruchomień runnerów** po uwzględnieniu pilotów, diagnostyk, Stop i widocznego okna. Dodatkowo 8 prób bezpośredniego drivera i 14 rekordów kontroli desktopu. Testy jednostkowe, kontenerowe i audyty opisano osobno; nie są próbami benchmarku. Kopie `artifacts/final-*.json`, archiwum diagnostyk i pełne ślady nie zwiększają liczby prób.

Zakres „wszystkie” oznacza wszystkie zachowane serie metryk znalezione w trzech workspace’ach oraz kontrole opisane w raportach. Robocze sprawdzenia, dla których nie zachowano osobnego wyniku, wymieniono opisowo. Nie dorabiamy im czasów ani liczby prób. Rekord `success` zachowuje historyczne kryterium danej serii; w finalnym PoC wymaga zarówno ukończenia przez agenta, jak i pozytywnego niezależnego weryfikatora.

**Zegar:** `taskMs` obejmuje pracę agenta, naprawy/powtórzenia zapytań i niezależną weryfikację. `setupMs` mierzy przygotowanie przeglądarki, początkową nawigację, a na Flights również zgodę cookies i pierwszą obserwację. Start Electron/Podman nie jest częścią wcześniejszych benchmarków. Zrzut końcowy i sprzątanie procesów PoC są poza czasem zadania. Czas wywołań głównego adaptera obejmuje transport/runtime; to nie jest pomiar samej inferencji. Pomiar UI, zamknięcia przeglądarki i czas podzadania drivera mają inne granice.

Mediany czasów liczymy wyłącznie z poprawnych prób, ale porażki pozostają w mianowniku skuteczności. Średnie składników uwzględniają wszystkie zmierzone próby danej grupy. Brak pomiaru oznaczamy `—`, nigdy zerem. Iloraz dwóch median, mediana ilorazów sparowanych prób i procent zmiany mediany to różne statystyki. Łączny wynik kilku typów zadań zależy od ich udziału w zestawie.

Nazwy modeli w metrykach: Sol = `gpt-5.6-sol / low`, Luna = `gpt-5.6-luna / low`, Gemini = `google/gemini-3.8-flash / low` przez OpenRouter, dostawca `google-ai-studio`. Jev = `jev-1.13.0`. Wariant bierze model z rekordu próby, ponieważ starsze pliki zawierają także domyślne pole modelu na poziomie całego runnera. W naszych seriach nie ma Mercury ani automatycznej eskalacji do Astra.

<a id="poc"></a>

## Finalny PoC: który silnik do którego zadania

| Zadanie | Aplikacja: Jev First + Gemini | Jev Ultrafast + Gemini | Browser Use + Gemini |
| --- | --- | --- | --- |
| Google Flights: Zurich → London | 30.78 s · 10/10 | 11.42 s · 10/10 | 34.82 s · 10/10 |
| Wyszukanie produktu | 3.54 s · 3/3 | 2.48 s · 3/3 | 4.45 s · 3/3 |
| Ustawienie i zastosowanie filtrów | 3.60 s · 3/3 | 1.74 s · 3/3 | 5.45 s · 3/3 |
| Wybranie podpowiedzi autocomplete | 4.37 s · 3/3 | 2.45 s · 3/3 | 8.20 s · 3/3 |
| Formularz: 6 etapów | 34.96 s · 3/3 | 24.07 s · 3/3 | 20.20 s · 3/3 |
| Formularz: 10 etapów | 51.84 s · 3/3 | 37.33 s · 3/3 | 33.46 s · 3/3 |
| Hotel: warunki i koszt 3 nocy | 9.11 s · 3/3 | — · 0/3 | 10.49 s · 3/3 |
| 3 strony ofert: warunki i koszt roczny | 13.80 s · 3/3 | — · 0/3 | 27.26 s · 3/3 |
| Artykuł w nowej karcie | 4.93 s · 3/3 | — · 0/3 | 4.30 s · 3/3 |

Sukcesy: **app-first 34/34**, **Browser Use 34/34**, **Ultrafast 25/34**. Razem 93/102 samodzielnie ukończone i zweryfikowane zadania. W `tabs` Ultrafast otworzył właściwy artykuł 3/3, ale pozostał przy poprzedniej karcie i zwrócił `blocked`. Przy ocenie samego stanu strony byłoby 28/34 dla Ultrafast i 96/102 łącznie. Te trzy próby pozostają porażkami ukończenia, a sześć zadań analizy ofert to rzeczywiste niepowodzenia.

Scenariusze mają konkretne kryteria: wyszukanie `blue notebook` z widocznymi wynikami; Books + In stock i zastosowanie filtrów; wybrana podpowiedź Paris, France; każdy etap formularza zapisany we właściwej kolejności, podróżny Ada i transport Train. Hotel: Bello i 327 EUR po uwzględnieniu śniadania oraz bezpłatnego anulowania. Hosting: przeczytane wszystkie 3 strony, minimum 20 użytkowników, SSO, dane w UE; Boreal i 744 EUR za pierwszy rok, po uwzględnieniu opłat początkowych. Sam nagłówek sukcesu lub poprawny domysł bez przeczytania wymaganych stron nie wystarcza.

Flights: lot w jedną stronę Zurich → London, 20 września 2026, 1 dorosły, economy. Koniec na rzeczywistych pasujących wynikach, bez wybierania i rezerwowania lotu. Sprawdzane są trasa, data i rok, tryb podróży, pasażer, klasa i wiersze wyników. Zakazane są zgadywane zakodowane URL-e wyszukiwania; wszystkie warianty używają kontrolek strony.

Warunki finalnego PoC: Chrome for Testing 151.0.7922.34, viewport 1120×780, en-US, Europe/Zurich, Python 3.12.12 i Node 24.20.0. Sekwencyjne uruchomienia z rotacją kolejności silników. Kod pomiarowy `6354eac83e6985d4082fb116e986da089886fc7c`, baseline aplikacji `77846cb`; identyczne hashe plików pomiarowych i czyste repo przy obu finalnych seriach. Późniejsze zmiany dotyczą Stop i redakcji logów, bez ponownego pomiaru zwykłej ścieżki.

Ultrafast używa oryginalnej pętli Jev i Gemini do wartości pól. Browser Use: maksymalnie 5 działań na odpowiedź, vision na żądanie, `flash_mode` przy mechanicznych zadaniach, planowanie przy analizie. Dodatkowy LLM judge jest wyłączony na rzecz wspólnego weryfikatora. Limit czasu 240 s i raportowanego kosztu $1 na próbę. Natywne limity nie są identyczne: Ultrafast 60 działań, Browser Use 60 kroków do 5 działań, aplikacja 80 tur/240 narzędzi. Porażki analizy Ultrafast to cykle bez postępu. Nie testowano własnych modeli ani chmury Browser Use.

<a id="czas"></a>

## Rozkład czasu: finalne Flights i długie formularze

| Statystyka | app-first | ultrafast | browser-use |
| --- | --- | --- | --- |
| Mediana zadania, s | 30.782 | 11.424 | 34.824 |
| P90 poprawnych prób, s | 32.251 | 11.689 | 37.406 |
| Średni czas zadania, s | 30.213 | 11.329 | 34.878 |
| Średnio główny adapter / Gemini, s | 26.382 | 2.086 | 19.452 |
| Średnio Jev, s | 1.678 | 7.654 | 0.000 |
| Średnio pozostała praca + weryfikator, s | 2.153 | 1.589 | 15.425 |
| Średnio setup poza zadaniem, s | 1.643 | 2.247 | 2.881 |
| Wywołania Gemini / Jev, suma 10 prób | 193 / 22 | 20 / 184 | 113 / 0 |
| Koszt 10 prób, USD | 1.589341 | 0.050071 | 0.437021 |

| Powtórzenia / profil | app-first: mediana s | ultrafast: mediana s | browser-use: mediana s |
| --- | --- | --- | --- |
| 1–5: świeży | 30.560 | 11.430 | 35.097 |
| 6–10: ponownie użyty | 31.004 | 11.417 | 34.550 |

Powtórzenia 6–10 używają profilu z próby 5, z cache i preferencjami; każda próba uruchamia nowy proces Chrome. Nadal zaczynają z Wrocławiem, pustym celem i pustą datą. To nie izoluje wpływu samego cache. P90 z 10 prób jest opisem tej próbki, nie gwarancją opóźnienia. Stosunek median: Ultrafast około **2,69× szybszy od aplikacji** i **3,05× od standardowego Browser Use** na tym jednym zadaniu.

W aplikacji główny adapter zajmuje średnio 26,38 s, a w Ultrafast Gemini-helper około 2,09 s. Zysk pochodzi przede wszystkim ze zmiany pętli i liczby wywołań: 193 vs 20 wywołań Gemini w 10 próbach. W Browser Use pozostaje 15,43 s średniej pozostałej pracy; pomiar nie rozdziela wszystkich jej wewnętrznych przyczyn.

| Formularz | Silnik | Mediana s | Wywołania Gemini w poszczególnych próbach | Decyzje Jev w poszczególnych próbach |
| --- | --- | --- | --- | --- |
| wizard-6 | app-first | 34.960 | 14, 29, 28 | 29, 1, 1 |
| wizard-6 | ultrafast | 24.069 | 12, 12, 12 | 25, 25, 25 |
| wizard-6 | browser-use | 20.202 | 7, 7, 7 | 0, 0, 0 |
| wizard-10 | app-first | 51.841 | 42, 43, 42 | 1, 1, 1 |
| wizard-10 | ultrafast | 37.329 | 20, 20, 20 | 41, 41, 41 |
| wizard-10 | browser-use | 33.459 | 11, 11, 11 | 0, 0, 0 |

W formularzu 10-etapowym Browser Use grupuje działania i wystarcza mu 11 odpowiedzi Gemini. Ultrafast generuje 20 wartości pól przez Gemini i potrzebuje 41 decyzji Jev. Aplikacja wykonuje 42–43 wywołania modelu. Dlatego szybkość pojedynczej decyzji Jev nie gwarantuje najlepszego czasu całego zadania.

<a id="historia"></a>

## Wcześniejsze porównania: osobne, dopasowane serie

### H1 — opcjonalny Hybrid kontra Classic, Sol

Źródło: [jev-2026-09-17.json](../../docs/benchmarks/jev-2026-09-17.json); commit `daf2176d6ec8240104d332c999d0f80f927350f6`, dirty=`false`. Liczba prób: 80. Mediany poniżej dotyczą tej serii; model i kolejność scenariuszy są zapisane dla każdego rekordu.

| Wariant | Sukces | Mediana udanych, s | Średnia wszystkich zmierzonych, s | Wywołania LLM / Jev |
| --- | --- | --- | --- | --- |
| classic / sol | 40/40 | 15.973 | 16.528 | 244 / 0 |
| jev-hybrid / sol | 40/40 | 14.760 | 16.114 | 226 / 39 |

| Wariant | Śr. LLM s | Śr. Jev s | Śr. pozostałe s | Śr. setup s | Raportowane LLM USD | Szacowane Jev USD |
| --- | --- | --- | --- | --- | --- | --- |
| classic / sol | 16.435 | 0.000 | 0.093 | 0.191 | n/d (abonament) | 0.000000 |
| jev-hybrid / sol | 15.574 | 0.402 | 0.138 | 0.190 | n/d (abonament) | 0.002189 |

| Scenariusz | classic / sol · mediana s / sukces | jev-hybrid / sol · mediana s / sukces |
| --- | --- | --- |
| search | 17.203 · 5/5 | 12.966 · 5/5 |
| filters | 19.912 · 5/5 | 20.239 · 5/5 |
| autocomplete | 16.276 · 5/5 | 17.206 · 5/5 |
| form | 22.666 · 5/5 | 14.686 · 5/5 |
| navigation | 15.138 · 5/5 | 15.514 · 5/5 |
| tabs | 15.724 · 5/5 | 16.691 · 5/5 |
| scroll | 15.689 · 5/5 | 18.676 · 5/5 |
| disclosure | 10.600 · 5/5 | 10.840 · 5/5 |

Mediana 40 sparowanych ilorazów Classic/Hybrid: **1,01×**; suma czasu Classic 661,13 s, Hybrid 644,55 s. Hybrid nie wykonał żadnej decyzji Jev w 28/40 prób. Mediana 39 decyzji Jev: 290 ms. Wynik nie potwierdzał ogólnego przyspieszenia. Obie wersje pochodzą z eksperymentalnego brancha, nie jest to porównanie z niezmienionym main.

### H2 — Jev First, porównanie Sol i Luna

Źródło: [jev-first-comparison-2026-09-17.json](../../docs/benchmarks/jev-first-comparison-2026-09-17.json); commit `df45d2c2e995b9e1004afcb69cff05634474d6c5`, dirty=`false`. Liczba prób: 72. Mediany poniżej dotyczą tej serii; model i kolejność scenariuszy są zapisane dla każdego rekordu.

| Wariant | Sukces | Mediana udanych, s | Średnia wszystkich zmierzonych, s | Wywołania LLM / Jev |
| --- | --- | --- | --- | --- |
| classic / sol | 24/24 | 16.487 | 17.291 | 147 / 0 |
| jev-first / sol | 24/24 | 17.322 | 16.423 | 86 / 69 |
| jev-first / luna | 24/24 | 12.537 | 13.692 | 83 / 64 |

| Wariant | Śr. LLM s | Śr. Jev s | Śr. pozostałe s | Śr. setup s | Raportowane LLM USD | Szacowane Jev USD |
| --- | --- | --- | --- | --- | --- | --- |
| classic / sol | 17.192 | 0.000 | 0.098 | 0.191 | n/d (abonament) | 0.000000 |
| jev-first / sol | 14.791 | 1.508 | 0.124 | 0.187 | n/d (abonament) | 0.003720 |
| jev-first / luna | 12.159 | 1.411 | 0.122 | 0.189 | n/d (abonament) | 0.003233 |

| Scenariusz | classic / sol · mediana s / sukces | jev-first / sol · mediana s / sukces | jev-first / luna · mediana s / sukces |
| --- | --- | --- | --- |
| search | 16.561 · 3/3 | 22.388 · 3/3 | 9.471 · 3/3 |
| filters | 20.150 · 3/3 | 17.649 · 3/3 | 11.830 · 3/3 |
| autocomplete | 16.212 · 3/3 | 23.439 · 3/3 | 13.454 · 3/3 |
| form | 24.707 · 3/3 | 21.767 · 3/3 | 25.131 · 3/3 |
| navigation | 13.894 · 3/3 | 9.277 · 3/3 | 13.405 · 3/3 |
| tabs | 12.066 · 3/3 | 13.009 · 3/3 | 8.350 · 3/3 |
| scroll | 22.314 · 3/3 | 16.996 · 3/3 | 15.364 · 3/3 |
| disclosure | 12.654 · 3/3 | 10.952 · 3/3 | 7.248 · 3/3 |

Mediana sparowanych ilorazów czasu względem Classic/Sol: First/Sol **1,15×**, First/Luna **1,34×**. Wszystkie 72 próby poprawne. Dwa zarejestrowane HTTP 503 dla First/Sol i jeden dla First/Luna; kontrolowany fallback ukończył zadania. To wcześniejsza wersja niż H3.

### H3 — finalne First i Classic na tym samym modelu Luna

Źródło: [jev-first-luna-final-2026-09-17.json](../../docs/benchmarks/jev-first-luna-final-2026-09-17.json); commit `5663da8837238e206faecc7efd58dee84d8f4b73`, dirty=`false`. Liczba prób: 48. Mediany poniżej dotyczą tej serii; model i kolejność scenariuszy są zapisane dla każdego rekordu.

| Wariant | Sukces | Mediana udanych, s | Średnia wszystkich zmierzonych, s | Wywołania LLM / Jev |
| --- | --- | --- | --- | --- |
| classic / luna | 23/24 | 24.931 | 27.660 | 152 / 0 |
| jev-first / luna | 24/24 | 15.123 | 15.350 | 70 / 66 |

| Wariant | Śr. LLM s | Śr. Jev s | Śr. pozostałe s | Śr. setup s | Raportowane LLM USD | Szacowane Jev USD |
| --- | --- | --- | --- | --- | --- | --- |
| classic / luna | 27.549 | 0.000 | 0.111 | 0.191 | n/d (abonament) | 0.000000 |
| jev-first / luna | 13.606 | 1.619 | 0.125 | 0.186 | n/d (abonament) | 0.003530 |

| Scenariusz | classic / luna · mediana s / sukces | jev-first / luna · mediana s / sukces |
| --- | --- | --- |
| search | 40.112 · 2/3 | 14.022 · 3/3 |
| filters | 24.931 · 3/3 | 16.011 · 3/3 |
| autocomplete | 38.618 · 3/3 | 12.912 · 3/3 |
| form | 23.920 · 3/3 | 19.665 · 3/3 |
| navigation | 34.098 · 3/3 | 16.181 · 3/3 |
| tabs | 11.010 · 3/3 | 8.356 · 3/3 |
| scroll | 33.164 · 3/3 | 18.800 · 3/3 |
| disclosure | 11.268 · 3/3 | 15.105 · 3/3 |

Mediana sparowanych ilorazów Classic/First w 23 poprawnych parach: **1,48×**. Zmiana zbiorczej mediany 24,93 → 15,12 s to 39,3%. Classic raz zakończył wyszukiwanie bez widocznych wyników (33,42 s). First miał HTTP 503 oraz timeout/transport error, lecz oba zadania ukończył przez Lunę. Koszt subskrypcji pozostaje nieprzeliczony.

### H4 — lokalne zadania: Luna i Gemini przez OpenRouter

Źródło: [jev-openrouter-local-2026-09-17.json](../../docs/benchmarks/jev-openrouter-local-2026-09-17.json); commit `8d99ab025eae315ec909ff75e1ec5f1a6d7ca454`, dirty=`false`. Liczba prób: 72. Mediany poniżej dotyczą tej serii; model i kolejność scenariuszy są zapisane dla każdego rekordu.

| Wariant | Sukces | Mediana udanych, s | Średnia wszystkich zmierzonych, s | Wywołania LLM / Jev |
| --- | --- | --- | --- | --- |
| jev-first / luna | 23/24 | 9.940 | 11.063 | 61 / 70 |
| jev-first / Gemini | 24/24 | 4.045 | 4.287 | 58 / 77 |
| classic / Gemini | 23/24 | 8.678 | 9.215 | 173 / 0 |

| Wariant | Śr. LLM s | Śr. Jev s | Śr. pozostałe s | Śr. setup s | Raportowane LLM USD | Szacowane Jev USD |
| --- | --- | --- | --- | --- | --- | --- |
| jev-first / luna | 9.726 | 1.217 | 0.120 | 0.190 | n/d (abonament) | 0.003632 |
| jev-first / Gemini | 2.956 | 1.126 | 0.205 | 0.197 | 0.113829 | 0.003824 |
| classic / Gemini | 9.126 | 0.000 | 0.089 | 0.186 | 0.236642 | 0.000000 |

| Scenariusz | jev-first / luna · mediana s / sukces | jev-first / Gemini · mediana s / sukces | classic / Gemini · mediana s / sukces |
| --- | --- | --- | --- |
| search | 8.119 · 3/3 | 3.468 · 3/3 | 12.209 · 2/3 |
| filters | 11.500 · 3/3 | 4.156 · 3/3 | 9.190 · 3/3 |
| autocomplete | 11.643 · 2/3 | 4.027 · 3/3 | 8.678 · 3/3 |
| form | 21.287 · 3/3 | 3.795 · 3/3 | 12.147 · 3/3 |
| navigation | 10.622 · 3/3 | 5.511 · 3/3 | 7.498 · 3/3 |
| tabs | 8.261 · 3/3 | 4.063 · 3/3 | 5.381 · 3/3 |
| scroll | 12.586 · 3/3 | 4.133 · 3/3 | 6.689 · 3/3 |
| disclosure | 7.598 · 3/3 | 3.867 · 3/3 | 5.578 · 3/3 |

Mediana sparowanych ilorazów First/Luna do First/Gemini: **2,54×** w 23 obustronnie poprawnych parach. Aktualny baseline Luny wynosi tutaj **9,94 s**, a nie wcześniejsze 15,12 s. Mediana jednego wywołania głównego adaptera: Luna 2,81 s, Gemini 1,05 s. Luna raz wpisała tekst bez wybrania autocomplete; Classic/Gemini podał niepoprawny kształt akcji i otrzymał pustą odpowiedź API. First/Gemini 24/24.

### H5 — pierwsze porównanie Google Flights

Źródło: [jev-openrouter-flights-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-2026-09-17.json); commit `8d99ab025eae315ec909ff75e1ec5f1a6d7ca454`, dirty=`false`. Liczba prób: 9. Mediany poniżej dotyczą tej serii; model i kolejność scenariuszy są zapisane dla każdego rekordu.

| Wariant | Sukces | Mediana udanych, s | Średnia wszystkich zmierzonych, s | Wywołania LLM / Jev |
| --- | --- | --- | --- | --- |
| jev-first / luna | 3/3 | 84.067 | 107.863 | 68 / 13 |
| jev-first / Gemini | 3/3 | 33.063 | 32.254 | 58 / 5 |
| classic / Gemini | 3/3 | 30.851 | 34.763 | 73 / 0 |

| Wariant | Śr. LLM s | Śr. Jev s | Śr. pozostałe s | Śr. setup s | Raportowane LLM USD | Szacowane Jev USD |
| --- | --- | --- | --- | --- | --- | --- |
| jev-first / luna | 99.616 | 2.979 | 5.268 | 2.771 | n/d (abonament) | 0.006516 |
| jev-first / Gemini | 28.927 | 1.125 | 2.202 | 2.783 | 0.456230 | 0.002325 |
| classic / Gemini | 33.967 | 0.000 | 0.797 | 2.821 | 0.470984 | 0.000000 |

| Scenariusz | jev-first / luna · mediana s / sukces | jev-first / Gemini · mediana s / sukces | classic / Gemini · mediana s / sukces |
| --- | --- | --- | --- |
| google-flights | 84.067 · 3/3 | 33.063 · 3/3 | 30.851 · 3/3 |

Wszystkie 9 prób Flights poprawne. Czasy w sekundach: First/Luna **78,587; 160,935; 84,067**; First/Gemini **35,330; 28,368; 33,063**; Classic/Gemini **44,120; 30,851; 29,319**. Classic/Gemini ma niższą medianę, lecz First/Gemini wygrywa 2/3 dopasowanych par i ma niższą średnią. Trzy pary nie ustalają stabilnego zwycięzcy. First/Gemini potrzebował 58 wywołań modelu i tylko 5 Jev; około 90% czasu zajmował główny adapter. To wyjaśnia sens późniejszego PoC z pętlą Jev.

<a id="diagnostyka"></a>

## Piloty, porażki i poprawki — poza finalnym rankingiem

W aneksie zachowano każdą próbę pilota i jej oryginalny wynik. Poniższe interpretacje nie zmieniają historycznych pól `success`.

| Etap | Obserwacja / wynik | Znaczenie |
| --- | --- | --- |
| Przed H1 | Wadliwy fixture autocomplete i brak jawnego start URL; poprawiono przed finalnymi 80 próbami | 8 fixture’ów przeszło deterministyczną kontrolę; brak osobnych metryk tych roboczych prób |
| First: pilot | 2 poprawne próby | Wstępny smoke, osobny kod i próba |
| First: redundant-read diagnostic | 16 rekordów; 1 celowo przerwany | Zidentyfikowano zbędne odczyty; Stop nie jest porażką jakości modelu |
| First: service-errors diagnostic | 16 rekordów; 1 celowo przerwany | Minimalne zapytanie Jev: HTTP 503 o 20:08, poprawna odpowiedź o 20:11 Europe/Warsaw; stare błędy ogólne nie identyfikują statusu każdego fallbacku |
| OpenRouter: lokalny pilot | 2 próby | Oddzielnie od finalnych 72 |
| OpenRouter: Flights pilot | First/Gemini 31,395 s, FAIL historycznego weryfikatora; Classic/Gemini 5,815 s, FAIL API | Nazwy kontrolek zmieniały się po wyborze; potrzebna obsługa aria-labelledby. Nie relabelujemy wyniku First |
| OpenRouter: Flights diagnostic | First/Gemini 66,077 s: rzeczywiście nieudane wyszukiwanie; Classic: FAIL setup | Brak celu/dat/wyników; osobno ERR_ABORTED podczas zgody cookies |
| PoC: pilot-search | app-first 3,381 s PASS; Browser Use 5,961 s PASS; Ultrafast FAIL setup | Za długa ścieżka gniazda AF_UNIX w Browser Harness |
| PoC: pilot-ultrafast-search | 2,305 s, FAIL odczytu weryfikatora | Weryfikator wybrał about:blank; wykonanie wyszukiwania nie staje się przez to zaliczonym pomiarem |
| PoC: pilot-ultrafast-v2 | search 2,492 s PASS; Flights FAIL setup | Wyścig przekierowania zgody Google, ERR_ABORTED |
| PoC: pilot-flights-v3 | app-first 30,079 s; Ultrafast 8,806 s; Browser Use 29,788 s; 3/3 PASS | 8,81 s jest pojedynczym pilotem; finalna mediana Ultrafast to 11,42 s |
| PoC: pilot-complex | wizard-6: app 21,285 s PASS, Ultrafast 33,857 s FAIL, Browser Use 19,332 s PASS | Jev timeout około 25 s po częściowym wypełnieniu; nie ma pełnego wyniku |
| PoC: pilot-complex | hotel: Ultrafast 20,362 s FAIL, Browser Use 11,778 s PASS, app 6,161 s PASS | Ultrafast wyczerpał 60 działań w cyklu bez Gemini-helpera |
| PoC: pilot-cleanup | Browser Use search 6,814 s PASS | Sprawdzenie po korekcie sprzątania |
| Finalny PoC: analiza | 6/6 porażek Ultrafast; około 22–24 s; 60 działań / 61 decyzji Jev / 0 Gemini | Hotel: oscylacja Bello/Doria; hosting: powtarzana nawigacja; brak analizy |
| Finalny PoC: nowa karta | 3/3 właściwie otwarte strony, 0/3 samodzielne ukończenia Ultrafast | Silnik zwraca blocked; stan strony i ukończenie to różne kryteria |

Część błędnych wyborów hotelu Doria miała confidence 0,57–0,63, powyżej progu 0,55 aplikacji. Wysoka pewność nie dowodzi poprawności semantycznej. Inteligentniejszy helper tekstowy też nie pomoże, jeśli pętla nie wywoła go w miejscu wymagającym rozumowania. Upstreamowy Ultrafast i aplikacyjny First nie mają identycznej polityki fallbacku.

<a id="walidacja"></a>

## Stop, widoczne okno, desktop i testy techniczne

| Źródło PoC | Silnik | Zamknięcie browsera ms | Pełne sprzątanie ms | Oryginalny stan / uwaga |
| --- | --- | --- | --- | --- |
| stop-ultrafast.json | ultrafast | 328.3 | 2098.9 | stan=ready; stopped; weryfikator FAIL: count, values |
| stop-browser-use.json | browser-use | 143.1 | 431.8 | stan=error; Cannot read properties of undefined (reading 'evaluate') |
| stop-app-first.json | app-first | — | 16.9 | stan=stopped; koniec=benchmark_stop; weryfikator FAIL; interrupted before verification |
| stop-final-app-first.json | app-first | 962.7 | 968.4 | stan=stopped; koniec=benchmark_stop; weryfikator FAIL; interrupted before verification |
| stop-final-ultrafast.json | ultrafast | 150.0 | 2086.3 | stan=ready; stopped; weryfikator FAIL; interrupted before verification |
| stop-final-browser-use.json | browser-use | 145.5 | 377.9 | stan=error; Cannot read properties of undefined (reading 'screenshot'); weryfikator FAIL; interrupted before verification |
| stop-verified-browser-use.json | browser-use | 149.0 | 369.4 | stan=stopped; weryfikator FAIL; interrupted before verification |

To **celowo przerywane zadania**, nie próby znalezienia najlepszego czasu ukończenia. Wczesne `stop-app-first` zapisało 16,9 ms bez `browserStopMs`: runner nie oczekiwał wtedy na asynchroniczne zamknięcie, więc tej liczby nie traktujemy jako pełnego sprzątania mimo nazwy pola. Finalny poprawny pomiar aplikacji: 962,7 ms zamknięcia i 968,4 ms całości. Ultrafast: 150,0 ms / 2086,3 ms. Ostateczny Browser Use: 149,0 ms / 369,4 ms, stan stopped, bez błędu. Wcześniejsze błędy odczytu/screenshot po Stop pozostają w archiwum; poprawiono pomijanie operacji po zamknięciu.

Widoczne okno Chrome: `headed-smoke.json`, Ultrafast search **2,344 s PASS**, setup **1,126 s**. Jedna kontrola zgodności działania headful, bez wniosku o różnicy wydajności względem headless.

### Desktop: [jev-desktop-2026-09-17.json](../../docs/benchmarks/jev-desktop-2026-09-17.json)

| # | Kontrola | Wynik | Czas UI ms | Stan | Jev decyzje | Jev czas s | Dowód / uwaga |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | environment_ready | PASS | — | ready | — | — | — |
| 2 | hybrid_navigation | PASS | — | completed | 2 | 1.260 | brak błędów renderera |
| 3 | stop | PASS | 227.0 | stopped | — | — | — |
| 4 | classic_after_stop | PASS | — | completed | — | — | brak błędów renderera |

### Desktop: [jev-first-desktop-2026-09-17.json](../../docs/benchmarks/jev-first-desktop-2026-09-17.json)

| # | Kontrola | Wynik | Czas UI ms | Stan | Jev decyzje | Jev czas s | Dowód / uwaga |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | first_luna_navigation | PASS | 11465.0 | completed | 1 | 0.736 | Example Domains |
| 2 | stop | PASS | 22.0 | — | — | — | — |
| 3 | classic_after_stop | PASS | — | completed | — | — | Example Domain |

### Desktop: [jev-first-desktop-final-2026-09-17.json](../../docs/benchmarks/jev-first-desktop-final-2026-09-17.json)

| # | Kontrola | Wynik | Czas UI ms | Stan | Jev decyzje | Jev czas s | Dowód / uwaga |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | first_luna_navigation | PASS | 11622.0 | completed | 1 | 0.770 | Example Domains |
| 2 | stop | PASS | 19.0 | — | — | — | — |
| 3 | classic_after_stop | PASS | — | completed | — | — | Example Domain |

### Desktop: [jev-openrouter-desktop-2026-09-17.json](../../docs/benchmarks/jev-openrouter-desktop-2026-09-17.json)

| # | Kontrola | Wynik | Czas UI ms | Stan | Jev decyzje | Jev czas s | Dowód / uwaga |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | first_navigation | PASS | 7658.0 | completed | 3 | 1.436 | Example Domains |
| 2 | stop | PASS | 173.0 | — | — | — | — |
| 3 | classic_after_stop | PASS | — | completed | — | — | Example Domain |
| 4 | followup_context | PASS | — | completed | — | — | Example Domains |

Czasy desktopu mierzą ścieżkę Electron → daemon → browser-container i obejmują wysłanie z UI. Stop mierzy dojście do stanu UI; **19/22/173/227 ms nie oznacza zamknięcia procesu Chrome**. Wszystkie serie desktopu sprawdziły dalszą pracę Classic po Stop; OpenRouter dodatkowo sprawdził follow-up z utrwalonym kontekstem. Pierwsza asercja First wskazywała stary URL IANA; po poprawieniu oczekiwanego `/help/example-domains` kontrola przeszła.

| Etap | Wynik zachowany w raportach | Uwagi |
| --- | --- | --- |
| Początkowy Hybrid | 404 testy PASS, 12 skipped; typecheck i build PASS; 4 testy browser-container PASS | Budowa obrazu zwróciła exit 3 w końcowej globalnej kontroli miejsca; obraz był zbudowany i testowalny. Po usunięciu zastąpionego obrazu store 22,34 GB |
| Końcowy Hybrid | 407 testów PASS, 12 skipped | Regresje anulowania streamu, limitu kontekstu i braku postępu |
| Końcowy First/Luna | 421 testów PASS, 12 skipped; typecheck i build PASS | Fallback, świeże dowody, brak powtórzeń niepewnych mutacji, Stop/backoff, takeover, budżet i approval |
| Końcowy OpenRouter | 432 testy PASS, 12 skipped; typecheck i build PASS | Wcześniej pełna seria równolegle z UI trafiła timing failure terminal idle detection; izolowany i finalny pełny rerun PASS |
| PoC upstream offline | 31 testów PASS | Wcześniej błędna ścieżka testu: nie uruchomiła testów; następnie 27 PASS + 4 import errors przez konflikt pakietu examples; po poprawce ścieżek 31 PASS |
| PoC niezależne weryfikatory | 1 suite PASS, wiele asercji negatywnych | Niepełny formularz, błędny segment ukryty pod sukcesem, niezapisane pola, zła cena, nieodwiedzone wymagane strony |
| PoC statyczne i integralność | Node syntax / Python compile PASS; piny upstreamu zgodne | Źródła decyzji Jev nie zostały zmodyfikowane |
| Sekrety i środowisko | 702 pliki sprawdzone, 0 dopasowań rzeczywistych kluczy; 0 zmiennych z sekretami w browserze | Kontrola obejmowała rozpakowane archiwa; po testach brak pozostawionych procesów agentów/harness |
| UI i konfiguracja aplikacji | Wybór silnika, trwałość ustawień, brak klucza, metryki i layout 1400/1024 px: PASS | OpenRouter w OS safeStorage; uprawnienia ustawień 0600; bez klucza w repo |

Liczby 404, 407, 421 i 432 odnoszą się do kolejnych wersji tej samej rozwijanej suite; **nie sumujemy ich jako liczby unikalnych testów**. Kontrole nie oznaczają pełnego audytu bezpieczeństwa produkcyjnego. PoC izoluje profile i ruch sieciowy, nie przekazuje kluczy do Chrome, wyłącza dowolny kod/shell/pliki/upload oraz rezerwację. Przyszła integracja musi zachować sprawdzanie uprawnień każdej akcji, Stop i niezależną ocenę wyniku.

<a id="koszty"></a>

## Koszty bez podwójnego liczenia

| Seria wcześniejsza | Raportowane OpenRouter USD | Szacowane Jev USD |
| --- | --- | --- |
| H1 — opcjonalny Hybrid kontra Classic, Sol | n/d — Codex abonament | 0.002189 |
| H2 — Jev First, porównanie Sol i Luna | n/d — Codex abonament | 0.006952 |
| H3 — finalne First i Classic na tym samym modelu Luna | n/d — Codex abonament | 0.003530 |
| H4 — lokalne zadania: Luna i Gemini przez OpenRouter | 0.350471 | 0.007456 |
| H5 — pierwsze porównanie Google Flights | 0.927214 | 0.008841 |

| PoC | Raportowany koszt + oszacowanie Jev, USD |
| --- | --- |
| app-first | 3.048718734 |
| ultrafast | 0.166502928 |
| browser-use | 0.783618750 |
| Finalne 102 próby łącznie | 3.998840412 |
| Wszystkie zachowane uruchomienia PoC (finalne + piloty + Stop + headful) | 4.295353056 |

Dwie finalne serie OpenRouter w aplikacji kosztowały **$1,277685 samego OpenRouter**, do tego osobno oszacowania Jev. Finalny PoC: **$3,998840412**, wszystkie zachowane uruchomienia PoC: **$4,295353056**. Ta druga liczba zawiera pierwszą. Nie dodawać kopii `artifacts/`, `results/`, archiwów trace ani rekordów powtórzonych w `validation.json`.

Jev oszacowano według $0,042 za milion tokenów wejściowych. Cena Luny/Sol w abonamencie Codex jest nieustalona. Przerwane lub nieudane zapytania mogą zostać naliczone bez zwrócenia usage. Nie ma tu pełnej faktury kosztu całego projektu ani kosztu pracy Codex. Dokładne zgłoszone koszty każdej zachowanej próby są w aneksie; `J; LLM n/d` oznacza wyłącznie wycenione Jev, nie darmowy główny model.

<a id="referencja"></a>

## Zewnętrzna referencja „7 sekund” — inny eksperyment

To wynik autora **Jev Ultrafast**, nie wynik naszej aplikacji ani standardowego agenta Browser Use z Gemini. Zachowany plik autora podaje **7,073 s**, 17 zapytań Jev (łącznie 3,720 s, mediana 178 ms), dwa wywołania Mercury 581 + 346 ms = 0,927 s oraz 11 działań, w tym jedno oczekiwanie. Pozostałe 2,426 s obejmuje resztę pracy. Zegar zaczyna się po pierwszej obserwacji i kończy na DONE; setup i późniejszy niezależny verifier są poza nim. Źródło: [metryki autora](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/flights-measurement.json).

| Porównanie autora: wariant | Para | Czas s | Weryfikacja | Decyzje Jev |
| --- | --- | --- | --- | --- |
| baseline | 1 | 11.214 | PASS | 26 |
| candidate | 1 | 6.964 | PASS | 17 |
| candidate | 2 | 7.913 | PASS | 18 |
| baseline | 2 | 8.984 | PASS | 21 |
| baseline | 3 | 9.450 | PASS | 22 |
| candidate | 3 | 7.092 | PASS | 16 |

Powyższe pomiary są zewnętrzne, nie powiększają naszych liczników. Autor porównywał warianty własnej pętli na istniejącym profilu i Mercury jako helperze; nasze finalne powtórzenia z Gemini dały medianę 11,42 s i 10/10 poprawnych wyników. To pokazuje duży zysk architektury, ale nie odtwarza identycznego środowiska ani 7,073 s. [Porównanie autora](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/full-speed-measurement.json).

W historycznych materiałach autora był też przygotowany prototyp Flights **12,884 s** z pięcioma podcelami i statycznymi wartościami; nie należy mylić go z późniejszą dynamiczną pętlą. README autora wymienia pojedyncze smokes: Wikipedia **2,798 s** i lokalne wyszukiwanie/filtrowanie hotelu **1,896 s**. Nie są to nasze testy ani dopasowane porównanie tych samych zadań. [Opis prototypu](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/docs/performance-prepared.md) · [README autora](https://github.com/browser-use/jev-ultrafast/blob/452c1ad2dd628008f1d5608f28158d76e49e6cc0/README.md).

<a id="wnioski"></a>

## Wnioski do dynamicznej hybrydy, filmu i artykułu

| Typ pracy | Co wspierają wyniki | Kandydat do przyszłej hybrydy |
| --- | --- | --- |
| Krótkie mechaniczne UI / Flights | Mało wywołań generatywnego modelu, szybkie decyzje Jev | Gemini ustala cel; Jev wykonuje obsługiwaną sekwencję |
| Długi formularz ze znanymi wartościami | Wygrywa grupowanie działań i redukcja liczby wywołań | Wartości z planu i ich ponowne użycie w odpowiednim kontekście; batch bezpiecznych działań |
| Porównanie / pamięć / obliczenia | Sam Jev wpada w cykle; Gemini jako helper nie jest planistą | Gemini analizuje i pamięta fakty; Jev realizuje krótkie podcele |
| Nowa karta / brak postępu / nieobsługiwane UI | Samo poprawne kliknięcie może nie kończyć zadania | Wykrycie ograniczenia i kontrolowany fallback do pełnego agenta |

Rekomendacja: zachować obecne UX, RunController i uprawnienia; eksperymentować z wyborem wykonawcy i częstotliwością planowania. Router może działać na poziomie podzadania, nie tylko raz na początku. Musi płacić za własną decyzję, przekazanie stanu i ewentualny fallback — dlatego suma najlepszych czasów z osobnych silników nie jest wynikiem hybrydy. Sama zmiana progu confidence nie rozwiązuje analizy; potrzebne są wykrywanie cykli, braków danych i braków możliwości.

Następny benchmark hybrydy: zamrozić konfigurację przed pomiarem; użyć części nowych zadań nieużytych do projektowania routera; zachować te same kryteria, stan początkowy, limity i rotację kolejności. Osobno mierzyć koszt/czas decyzji routera, wykonawcy, fallbacków i weryfikacji. Raportować sukces, medianę, P90, koszt oraz odsetek zmian wykonawcy. Nie powtarzać mutacji po niepewnym wyniku bez świeżej obserwacji i kontroli uprawnień.

Proponowana oś materiału:

1. „Agent zrobił to w 7 sekund” — pokazać zadanie i dokładnie granice zegara autora.
2. Nasza historia: opcjonalny Hybrid bez ogólnego zysku → First z Luną → szybszy główny model Gemini.
3. Zmiana pętli daje 30,78 → 11,42 s na Flights; pokazać 10 powtórzeń, nie tylko pilot 8,81 s.
4. Długi formularz odwraca ranking: Browser Use potrzebuje 11 wywołań Gemini zamiast 20 lub 42–43.
5. Analiza ofert ujawnia granicę: Ultrafast 0/6, podczas gdy aplikacja i Browser Use kończą poprawnie.
6. Hipoteza następnego odcinka: dobór narzędzia do podzadania, z policzonym narzutem routera i fallbacków.

Nieuprawnione tezy: „Jev zawsze 3× szybszy”, „Browser Use zawsze wygrywa”, „Gemini sam wystarczy do każdego problemu”, „7 sekund to oszustwo”, „już mamy najszybszą dynamiczną hybrydę”. Uzasadniona teza: **architektura pętli, liczba wywołań i dopasowanie wykonawcy do rodzaju zadania mogą być ważniejsze niż szybkość pojedynczego modelu**. Lokalnych fixture’ów i 10 powtórzeń jednej trasy Flights nie uogólniamy na cały internet; nie badano zalogowanych kont, uploadów, canvas ani złożonych ramek.

<a id="proby"></a>

## Aneks: każda zachowana próba runnera

Indeks serii w aneksie:

- [H1 — jev-2026-09-17.json](#seria-h1)
- [H2 — jev-first-comparison-2026-09-17.json](#seria-h2)
- [H3 — jev-first-luna-final-2026-09-17.json](#seria-h3)
- [H4 — jev-openrouter-local-2026-09-17.json](#seria-h4)
- [H5 — jev-openrouter-flights-2026-09-17.json](#seria-h5)
- [D1 — jev-first-diagnostic-2026-09-17.json](#seria-d1)
- [D2 — jev-first-pilot-2026-09-17.json](#seria-d2)
- [D3 — jev-first-service-errors-2026-09-17.json](#seria-d3)
- [D4 — jev-openrouter-flights-diagnostic-2026-09-17.json](#seria-d4)
- [D5 — jev-openrouter-flights-pilot-2026-09-17.json](#seria-d5)
- [D6 — jev-openrouter-pilot-2026-09-17.json](#seria-d6)
- [P1 — final-flights.json](#seria-p1)
- [P2 — final-local.json](#seria-p2)
- [X1 — pilot-search.json](#seria-x1)
- [X2 — pilot-ultrafast-search.json](#seria-x2)
- [X3 — pilot-ultrafast-v2.json](#seria-x3)
- [X4 — pilot-flights-v3.json](#seria-x4)
- [X5 — stop-ultrafast.json](#seria-x5)
- [X6 — stop-browser-use.json](#seria-x6)
- [X7 — pilot-complex.json](#seria-x7)
- [X8 — pilot-cleanup.json](#seria-x8)
- [X9 — stop-app-first.json](#seria-x9)
- [X10 — stop-final-app-first.json](#seria-x10)
- [X11 — stop-final-ultrafast.json](#seria-x11)
- [X12 — stop-final-browser-use.json](#seria-x12)
- [X13 — headed-smoke.json](#seria-x13)
- [X14 — stop-verified-browser-use.json](#seria-x14)

Każdy wiersz odpowiada jednemu rekordowi źródłowego `results`, w tej samej kolejności. Czasy w sekundach, 3 miejsca po przecinku; USD z 6 miejscami. `LLM/Jev #` to liczby wywołań, `akcje` to licznik natywny danego runnera (nie zawsze porównywalny między silnikami). `LLM s` i `Jev s` są sumami czasu adapterów; różnica względem `task s` to pozostała praca i weryfikacja. Setup jest osobno. `FAIL setup` nie ma zmierzonego czasu zadania. Po każdej tabeli znajdują się szczegóły porażek i zarejestrowanych błędów Jev; pełne fallbacki są także w JSON i traces.

<a id="seria-h1"></a>

### H1 — jev-2026-09-17.json

Typ: **finalne wcześniejsze porównanie**. Źródło: [jev-2026-09-17.json](../../docs/benchmarks/jev-2026-09-17.json). Rekordy: 80; historyczne `success=true`: 80. Commit: `daf2176d6ec8240104d332c999d0f80f927350f6`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1-001 | search | classic / sol | 1 | PASS | 15.897 | 0.191 | 15.800 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-002 | search | jev-hybrid / sol | 1 | PASS | 12.029 | 0.194 | 10.667 | 1.266 | 4/3 | 2 | 0.000138 J; LLM n/d |
| H1-003 | search | jev-hybrid / sol | 2 | PASS | 12.966 | 0.184 | 11.436 | 1.425 | 5/3 | 2 | 0.000138 J; LLM n/d |
| H1-004 | search | classic / sol | 2 | PASS | 13.029 | 0.191 | 12.943 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-005 | search | classic / sol | 3 | PASS | 17.203 | 0.190 | 17.128 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-006 | search | jev-hybrid / sol | 3 | PASS | 14.834 | 0.180 | 13.646 | 1.095 | 4/3 | 2 | 0.000138 J; LLM n/d |
| H1-007 | search | jev-hybrid / sol | 4 | PASS | 14.472 | 0.187 | 13.089 | 1.285 | 4/3 | 2 | 0.000139 J; LLM n/d |
| H1-008 | search | classic / sol | 4 | PASS | 17.793 | 0.185 | 17.710 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-009 | search | classic / sol | 5 | PASS | 20.416 | 0.189 | 20.342 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-010 | search | jev-hybrid / sol | 5 | PASS | 12.888 | 0.189 | 11.586 | 1.204 | 4/3 | 2 | 0.000139 J; LLM n/d |
| H1-011 | filters | classic / sol | 1 | PASS | 20.674 | 0.187 | 20.530 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-012 | filters | jev-hybrid / sol | 1 | PASS | 13.485 | 0.187 | 11.799 | 1.561 | 5/4 | 3 | 0.000230 J; LLM n/d |
| H1-013 | filters | jev-hybrid / sol | 2 | PASS | 20.239 | 0.201 | 20.141 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-014 | filters | classic / sol | 2 | PASS | 19.912 | 0.194 | 19.812 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-015 | filters | classic / sol | 3 | PASS | 15.509 | 0.189 | 15.406 | 0.000 | 9/0 | 3 | 0.000000 J; LLM n/d |
| H1-016 | filters | jev-hybrid / sol | 3 | PASS | 14.481 | 0.186 | 12.747 | 1.597 | 5/4 | 3 | 0.000230 J; LLM n/d |
| H1-017 | filters | jev-hybrid / sol | 4 | PASS | 23.552 | 0.195 | 23.451 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-018 | filters | classic / sol | 4 | PASS | 17.148 | 0.201 | 17.037 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-019 | filters | classic / sol | 5 | PASS | 21.464 | 0.197 | 21.354 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-020 | filters | jev-hybrid / sol | 5 | PASS | 20.406 | 0.197 | 20.309 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-021 | autocomplete | classic / sol | 1 | PASS | 16.617 | 0.193 | 16.506 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-022 | autocomplete | jev-hybrid / sol | 1 | PASS | 17.206 | 0.193 | 17.128 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-023 | autocomplete | jev-hybrid / sol | 2 | PASS | 17.117 | 0.192 | 17.042 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-024 | autocomplete | classic / sol | 2 | PASS | 13.031 | 0.219 | 12.959 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-025 | autocomplete | classic / sol | 3 | PASS | 15.876 | 0.193 | 15.791 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-026 | autocomplete | jev-hybrid / sol | 3 | PASS | 29.823 | 0.185 | 29.077 | 0.665 | 9/1 | 3 | 0.000041 J; LLM n/d |
| H1-027 | autocomplete | jev-hybrid / sol | 4 | PASS | 14.626 | 0.189 | 14.553 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-028 | autocomplete | classic / sol | 4 | PASS | 17.627 | 0.194 | 17.558 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-029 | autocomplete | classic / sol | 5 | PASS | 16.276 | 0.187 | 16.163 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-030 | autocomplete | jev-hybrid / sol | 5 | PASS | 17.644 | 0.180 | 17.543 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-031 | form | classic / sol | 1 | PASS | 26.775 | 0.183 | 26.674 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-032 | form | jev-hybrid / sol | 1 | PASS | 13.250 | 0.194 | 11.488 | 1.644 | 4/4 | 3 | 0.000265 J; LLM n/d |
| H1-033 | form | jev-hybrid / sol | 2 | PASS | 13.815 | 0.192 | 11.933 | 1.782 | 4/4 | 3 | 0.000265 J; LLM n/d |
| H1-034 | form | classic / sol | 2 | PASS | 29.916 | 0.195 | 29.830 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-035 | form | classic / sol | 3 | PASS | 22.666 | 0.183 | 22.575 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-036 | form | jev-hybrid / sol | 3 | PASS | 20.299 | 0.193 | 20.204 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-037 | form | jev-hybrid / sol | 4 | PASS | 14.686 | 0.202 | 13.185 | 1.400 | 4/4 | 3 | 0.000267 J; LLM n/d |
| H1-038 | form | classic / sol | 4 | PASS | 14.066 | 0.185 | 13.970 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-039 | form | classic / sol | 5 | PASS | 18.652 | 0.194 | 18.555 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-040 | form | jev-hybrid / sol | 5 | PASS | 16.784 | 0.195 | 15.106 | 1.172 | 5/3 | 3 | 0.000198 J; LLM n/d |
| H1-041 | navigation | classic / sol | 1 | PASS | 16.048 | 0.187 | 15.908 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-042 | navigation | jev-hybrid / sol | 1 | PASS | 15.807 | 0.198 | 15.659 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-043 | navigation | jev-hybrid / sol | 2 | PASS | 13.276 | 0.187 | 13.111 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-044 | navigation | classic / sol | 2 | PASS | 14.147 | 0.194 | 13.995 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-045 | navigation | classic / sol | 3 | PASS | 14.300 | 0.192 | 14.147 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-046 | navigation | jev-hybrid / sol | 3 | PASS | 16.689 | 0.192 | 16.545 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-047 | navigation | jev-hybrid / sol | 4 | PASS | 15.514 | 0.195 | 15.371 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-048 | navigation | classic / sol | 4 | PASS | 15.138 | 0.181 | 15.003 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-049 | navigation | classic / sol | 5 | PASS | 19.867 | 0.187 | 19.728 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-050 | navigation | jev-hybrid / sol | 5 | PASS | 12.773 | 0.177 | 12.619 | 0.000 | 8/0 | 2 | 0.000000 J; LLM n/d |
| H1-051 | tabs | classic / sol | 1 | PASS | 20.182 | 0.193 | 20.115 | 0.000 | 5/0 | 2 | 0.000000 J; LLM n/d |
| H1-052 | tabs | jev-hybrid / sol | 1 | PASS | 9.849 | 0.187 | 9.782 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-053 | tabs | jev-hybrid / sol | 2 | PASS | 11.058 | 0.194 | 10.993 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-054 | tabs | classic / sol | 2 | PASS | 15.724 | 0.181 | 15.643 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-055 | tabs | classic / sol | 3 | PASS | 18.849 | 0.186 | 18.782 | 0.000 | 5/0 | 2 | 0.000000 J; LLM n/d |
| H1-056 | tabs | jev-hybrid / sol | 3 | PASS | 16.691 | 0.186 | 16.621 | 0.000 | 5/0 | 2 | 0.000000 J; LLM n/d |
| H1-057 | tabs | jev-hybrid / sol | 4 | PASS | 22.024 | 0.185 | 20.753 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-058 | tabs | classic / sol | 4 | PASS | 13.756 | 0.188 | 13.678 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-059 | tabs | classic / sol | 5 | PASS | 13.059 | 0.200 | 12.986 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-060 | tabs | jev-hybrid / sol | 5 | PASS | 23.871 | 0.189 | 23.794 | 0.000 | 7/0 | 3 | 0.000000 J; LLM n/d |
| H1-061 | scroll | classic / sol | 1 | PASS | 16.221 | 0.185 | 16.140 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-062 | scroll | jev-hybrid / sol | 1 | PASS | 15.694 | 0.192 | 15.612 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-063 | scroll | jev-hybrid / sol | 2 | PASS | 18.676 | 0.188 | 18.576 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-064 | scroll | classic / sol | 2 | PASS | 17.998 | 0.197 | 17.914 | 0.000 | 7/0 | 3 | 0.000000 J; LLM n/d |
| H1-065 | scroll | classic / sol | 3 | PASS | 14.228 | 0.196 | 14.152 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-066 | scroll | jev-hybrid / sol | 3 | PASS | 25.327 | 0.197 | 25.219 | 0.000 | 9/0 | 4 | 0.000000 J; LLM n/d |
| H1-067 | scroll | jev-hybrid / sol | 4 | PASS | 14.601 | 0.193 | 14.501 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-068 | scroll | classic / sol | 4 | PASS | 12.655 | 0.191 | 12.580 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-069 | scroll | classic / sol | 5 | PASS | 15.689 | 0.188 | 15.598 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H1-070 | scroll | jev-hybrid / sol | 5 | PASS | 22.085 | 0.186 | 21.953 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H1-071 | disclosure | classic / sol | 1 | PASS | 10.600 | 0.191 | 10.529 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-072 | disclosure | jev-hybrid / sol | 1 | PASS | 12.848 | 0.188 | 12.786 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-073 | disclosure | jev-hybrid / sol | 2 | PASS | 10.840 | 0.187 | 10.781 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-074 | disclosure | classic / sol | 2 | PASS | 12.047 | 0.193 | 11.979 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-075 | disclosure | classic / sol | 3 | PASS | 9.840 | 0.190 | 9.775 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-076 | disclosure | jev-hybrid / sol | 3 | PASS | 9.816 | 0.188 | 9.760 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-077 | disclosure | jev-hybrid / sol | 4 | PASS | 11.898 | 0.191 | 11.834 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-078 | disclosure | classic / sol | 4 | PASS | 10.749 | 0.185 | 10.687 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-079 | disclosure | classic / sol | 5 | PASS | 9.489 | 0.186 | 9.425 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H1-080 | disclosure | jev-hybrid / sol | 5 | PASS | 10.617 | 0.188 | 10.549 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |

<a id="seria-h2"></a>

### H2 — jev-first-comparison-2026-09-17.json

Typ: **finalne wcześniejsze porównanie**. Źródło: [jev-first-comparison-2026-09-17.json](../../docs/benchmarks/jev-first-comparison-2026-09-17.json). Rekordy: 72; historyczne `success=true`: 72. Commit: `df45d2c2e995b9e1004afcb69cff05634474d6c5`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H2-001 | search | classic / sol | 1 | PASS | 18.731 | 0.195 | 18.639 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-002 | search | jev-first / sol | 1 | PASS | 23.492 | 0.189 | 22.227 | 1.145 | 6/0 | 3 | 0.000000 J; LLM n/d |
| H2-003 | search | jev-first / luna | 1 | PASS | 20.512 | 0.185 | 18.275 | 2.126 | 6/0 | 3 | 0.000000 J; LLM n/d |
| H2-004 | search | jev-first / sol | 2 | PASS | 22.388 | 0.195 | 19.953 | 2.326 | 6/0 | 3 | 0.000000 J; LLM n/d |
| H2-005 | search | jev-first / luna | 2 | PASS | 9.471 | 0.196 | 7.446 | 1.929 | 2/3 | 3 | 0.000166 J; LLM n/d |
| H2-006 | search | classic / sol | 2 | PASS | 16.561 | 0.189 | 16.484 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-007 | search | jev-first / luna | 3 | PASS | 8.840 | 0.184 | 7.207 | 1.533 | 2/3 | 3 | 0.000162 J; LLM n/d |
| H2-008 | search | classic / sol | 3 | PASS | 16.412 | 0.179 | 16.328 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-009 | search | jev-first / sol | 3 | PASS | 9.113 | 0.183 | 7.375 | 1.630 | 2/3 | 3 | 0.000172 J; LLM n/d |
| H2-010 | filters | jev-first / sol | 1 | PASS | 17.649 | 0.186 | 16.058 | 1.473 | 4/3 | 4 | 0.000201 J; LLM n/d |
| H2-011 | filters | jev-first / luna | 1 | PASS | 11.830 | 0.193 | 9.448 | 2.259 | 3/4 | 4 | 0.000263 J; LLM n/d |
| H2-012 | filters | classic / sol | 1 | PASS | 22.720 | 0.193 | 22.608 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H2-013 | filters | jev-first / luna | 2 | PASS | 8.342 | 0.190 | 6.450 | 1.775 | 2/4 | 4 | 0.000263 J; LLM n/d |
| H2-014 | filters | classic / sol | 2 | PASS | 20.131 | 0.194 | 20.031 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H2-015 | filters | jev-first / sol | 2 | PASS | 12.550 | 0.181 | 10.651 | 1.764 | 2/4 | 4 | 0.000267 J; LLM n/d |
| H2-016 | filters | classic / sol | 3 | PASS | 20.150 | 0.188 | 20.017 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H2-017 | filters | jev-first / sol | 3 | PASS | 18.561 | 0.177 | 16.868 | 1.571 | 4/4 | 4 | 0.000279 J; LLM n/d |
| H2-018 | filters | jev-first / luna | 3 | PASS | 12.496 | 0.189 | 10.804 | 1.545 | 3/4 | 4 | 0.000263 J; LLM n/d |
| H2-019 | autocomplete | jev-first / luna | 1 | PASS | 12.578 | 0.183 | 11.494 | 0.992 | 4/2 | 3 | 0.000093 J; LLM n/d |
| H2-020 | autocomplete | classic / sol | 1 | PASS | 14.470 | 0.190 | 14.391 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-021 | autocomplete | jev-first / sol | 1 | PASS | 23.439 | 0.187 | 21.657 | 1.670 | 6/3 | 3 | 0.000156 J; LLM n/d |
| H2-022 | autocomplete | classic / sol | 2 | PASS | 16.212 | 0.188 | 16.092 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-023 | autocomplete | jev-first / sol | 2 | PASS | 24.514 | 0.184 | 23.699 | 0.710 | 7/1 | 3 | 0.000049 J; LLM n/d |
| H2-024 | autocomplete | jev-first / luna | 2 | PASS | 13.854 | 0.189 | 12.404 | 1.359 | 4/2 | 3 | 0.000094 J; LLM n/d |
| H2-025 | autocomplete | jev-first / sol | 3 | PASS | 22.986 | 0.181 | 21.762 | 1.124 | 5/2 | 3 | 0.000102 J; LLM n/d |
| H2-026 | autocomplete | jev-first / luna | 3 | PASS | 13.454 | 0.191 | 12.384 | 0.969 | 4/2 | 3 | 0.000093 J; LLM n/d |
| H2-027 | autocomplete | classic / sol | 3 | PASS | 17.759 | 0.186 | 17.688 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-028 | form | classic / sol | 1 | PASS | 17.887 | 0.192 | 17.756 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H2-029 | form | jev-first / sol | 1 | PASS | 24.227 | 0.187 | 21.647 | 2.437 | 5/5 | 4 | 0.000373 J; LLM n/d |
| H2-030 | form | jev-first / luna | 1 | PASS | 21.223 | 0.191 | 20.039 | 1.024 | 8/2 | 5 | 0.000128 J; LLM n/d |
| H2-031 | form | jev-first / sol | 2 | PASS | 21.767 | 0.202 | 20.016 | 1.638 | 3/4 | 4 | 0.000334 J; LLM n/d |
| H2-032 | form | jev-first / luna | 2 | PASS | 25.131 | 0.182 | 24.201 | 0.811 | 8/1 | 4 | 0.000064 J; LLM n/d |
| H2-033 | form | classic / sol | 2 | PASS | 24.707 | 0.200 | 24.589 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H2-034 | form | jev-first / luna | 3 | PASS | 37.848 | 0.187 | 34.721 | 2.965 | 3/6 | 5 | 0.000440 J; LLM n/d |
| H2-035 | form | classic / sol | 3 | PASS | 25.796 | 0.194 | 25.671 | 0.000 | 9/0 | 3 | 0.000000 J; LLM n/d |
| H2-036 | form | jev-first / sol | 3 | PASS | 20.310 | 0.185 | 17.767 | 2.419 | 4/5 | 4 | 0.000399 J; LLM n/d |
| H2-037 | navigation | jev-first / sol | 1 | PASS | 8.444 | 0.187 | 7.086 | 1.172 | 2/3 | 3 | 0.000121 J; LLM n/d |
| H2-038 | navigation | jev-first / luna | 1 | PASS | 13.405 | 0.184 | 12.293 | 0.934 | 4/2 | 3 | 0.000087 J; LLM n/d |
| H2-039 | navigation | classic / sol | 1 | PASS | 13.894 | 0.188 | 13.762 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-040 | navigation | jev-first / luna | 2 | PASS | 8.630 | 0.184 | 7.185 | 1.276 | 2/3 | 3 | 0.000120 J; LLM n/d |
| H2-041 | navigation | classic / sol | 2 | PASS | 13.173 | 0.191 | 13.027 | 0.000 | 8/0 | 2 | 0.000000 J; LLM n/d |
| H2-042 | navigation | jev-first / sol | 2 | PASS | 10.008 | 0.189 | 8.493 | 1.345 | 2/3 | 3 | 0.000120 J; LLM n/d |
| H2-043 | navigation | classic / sol | 3 | PASS | 15.105 | 0.193 | 14.961 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-044 | navigation | jev-first / sol | 3 | PASS | 9.277 | 0.189 | 7.533 | 1.587 | 2/3 | 3 | 0.000121 J; LLM n/d |
| H2-045 | navigation | jev-first / luna | 3 | PASS | 14.767 | 0.193 | 13.519 | 1.085 | 4/2 | 3 | 0.000086 J; LLM n/d |
| H2-046 | tabs | jev-first / luna | 1 | PASS | 7.782 | 0.190 | 6.675 | 1.002 | 2/2 | 2 | 0.000082 J; LLM n/d |
| H2-047 | tabs | classic / sol | 1 | PASS | 9.776 | 0.191 | 9.711 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H2-048 | tabs | jev-first / sol | 1 | PASS | 9.301 | 0.185 | 7.914 | 1.286 | 2/2 | 2 | 0.000087 J; LLM n/d |
| H2-049 | tabs | classic / sol | 2 | PASS | 12.319 | 0.192 | 12.236 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H2-050 | tabs | jev-first / sol | 2 | PASS | 19.700 | 0.190 | 17.618 | 1.907 | 3/4 | 4 | 0.000187 J; LLM n/d |
| H2-051 | tabs | jev-first / luna | 2 | PASS | 9.054 | 0.186 | 8.067 | 0.877 | 2/2 | 2 | 0.000083 J; LLM n/d |
| H2-052 | tabs | jev-first / sol | 3 | PASS | 13.009 | 0.174 | 11.892 | 1.028 | 2/2 | 2 | 0.000087 J; LLM n/d |
| H2-053 | tabs | jev-first / luna | 3 | PASS | 8.350 | 0.185 | 7.268 | 0.993 | 2/2 | 2 | 0.000085 J; LLM n/d |
| H2-054 | tabs | classic / sol | 3 | PASS | 12.066 | 0.190 | 11.991 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H2-055 | scroll | classic / sol | 1 | PASS | 29.862 | 0.194 | 29.776 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-056 | scroll | jev-first / sol | 1 | PASS | 19.728 | 0.183 | 18.013 | 1.567 | 4/4 | 5 | 0.000134 J; LLM n/d |
| H2-057 | scroll | jev-first / luna | 1 | PASS | 14.911 | 0.186 | 12.897 | 1.861 | 4/4 | 5 | 0.000135 J; LLM n/d |
| H2-058 | scroll | jev-first / sol | 2 | PASS | 14.119 | 0.184 | 12.440 | 1.544 | 4/4 | 5 | 0.000134 J; LLM n/d |
| H2-059 | scroll | jev-first / luna | 2 | PASS | 15.364 | 0.197 | 13.425 | 1.801 | 4/4 | 5 | 0.000134 J; LLM n/d |
| H2-060 | scroll | classic / sol | 2 | PASS | 16.710 | 0.190 | 16.623 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-061 | scroll | jev-first / luna | 3 | PASS | 15.726 | 0.191 | 13.801 | 1.780 | 4/4 | 5 | 0.000134 J; LLM n/d |
| H2-062 | scroll | classic / sol | 3 | PASS | 22.314 | 0.191 | 22.215 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H2-063 | scroll | jev-first / sol | 3 | PASS | 16.996 | 0.199 | 15.173 | 1.674 | 4/4 | 5 | 0.000135 J; LLM n/d |
| H2-064 | disclosure | jev-first / sol | 1 | PASS | 13.141 | 0.189 | 11.935 | 1.120 | 3/2 | 2 | 0.000088 J; LLM n/d |
| H2-065 | disclosure | jev-first / luna | 1 | PASS | 7.246 | 0.191 | 6.056 | 1.110 | 2/2 | 2 | 0.000087 J; LLM n/d |
| H2-066 | disclosure | classic / sol | 1 | PASS | 14.751 | 0.193 | 14.687 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H2-067 | disclosure | jev-first / luna | 2 | PASS | 10.546 | 0.188 | 9.529 | 0.936 | 2/2 | 2 | 0.000087 J; LLM n/d |
| H2-068 | disclosure | classic / sol | 2 | PASS | 10.813 | 0.196 | 10.749 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H2-069 | disclosure | jev-first / sol | 2 | PASS | 8.480 | 0.192 | 7.298 | 1.080 | 2/2 | 2 | 0.000089 J; LLM n/d |
| H2-070 | disclosure | classic / sol | 3 | PASS | 12.654 | 0.179 | 12.585 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H2-071 | disclosure | jev-first / sol | 3 | PASS | 10.952 | 0.183 | 9.900 | 0.972 | 2/2 | 2 | 0.000087 J; LLM n/d |
| H2-072 | disclosure | jev-first / luna | 3 | PASS | 7.248 | 0.194 | 6.226 | 0.931 | 2/2 | 2 | 0.000086 J; LLM n/d |

- **H2-002**: stan=completed; koniec=final_answer; błędy Jev=[{"reason":"http_error","elapsedMs":1145.0158440000014,"httpStatus":503,"parentCallId":"exec-13de019f-d617-4ade-80df-8b3e256e8522"}]; fallback=["jev_unavailable_or_invalid_response"].
- **H2-003**: stan=completed; koniec=final_answer; błędy Jev=[{"reason":"http_error","elapsedMs":2125.9177710000004,"httpStatus":503,"parentCallId":"exec-0ea465f6-7384-4db0-afc7-29a670c2e99f"}]; fallback=["jev_unavailable_or_invalid_response"].
- **H2-004**: stan=completed; koniec=final_answer; błędy Jev=[{"reason":"http_error","elapsedMs":2326.337962999998,"httpStatus":503,"parentCallId":"exec-b3478eff-05b5-4595-97a1-6a56f1a31b78"}]; fallback=["jev_unavailable_or_invalid_response"].

<a id="seria-h3"></a>

### H3 — jev-first-luna-final-2026-09-17.json

Typ: **finalne wcześniejsze porównanie**. Źródło: [jev-first-luna-final-2026-09-17.json](../../docs/benchmarks/jev-first-luna-final-2026-09-17.json). Rekordy: 48; historyczne `success=true`: 47. Commit: `5663da8837238e206faecc7efd58dee84d8f4b73`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H3-001 | search | classic / luna | 1 | FAIL | 33.415 | 0.197 | 33.352 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H3-002 | search | jev-first / luna | 1 | PASS | 16.860 | 0.195 | 15.437 | 1.319 | 2/3 | 3 | 0.000168 J; LLM n/d |
| H3-003 | search | jev-first / luna | 2 | PASS | 14.022 | 0.188 | 12.655 | 1.268 | 2/3 | 3 | 0.000167 J; LLM n/d |
| H3-004 | search | classic / luna | 2 | PASS | 50.141 | 0.186 | 49.981 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-005 | search | classic / luna | 3 | PASS | 30.083 | 0.215 | 29.991 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-006 | search | jev-first / luna | 3 | PASS | 10.138 | 0.187 | 8.692 | 1.342 | 2/3 | 3 | 0.000162 J; LLM n/d |
| H3-007 | filters | jev-first / luna | 1 | PASS | 12.554 | 0.192 | 10.425 | 1.996 | 3/4 | 4 | 0.000267 J; LLM n/d |
| H3-008 | filters | classic / luna | 1 | PASS | 24.931 | 0.195 | 24.777 | 0.000 | 9/0 | 4 | 0.000000 J; LLM n/d |
| H3-009 | filters | classic / luna | 2 | PASS | 18.974 | 0.194 | 18.873 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H3-010 | filters | jev-first / luna | 2 | PASS | 16.011 | 0.188 | 14.257 | 1.585 | 4/4 | 5 | 0.000271 J; LLM n/d |
| H3-011 | filters | jev-first / luna | 3 | PASS | 19.124 | 0.188 | 17.675 | 1.327 | 3/3 | 4 | 0.000197 J; LLM n/d |
| H3-012 | filters | classic / luna | 3 | PASS | 63.821 | 0.224 | 63.711 | 0.000 | 9/0 | 4 | 0.000000 J; LLM n/d |
| H3-013 | autocomplete | classic / luna | 1 | PASS | 41.561 | 0.199 | 41.419 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-014 | autocomplete | jev-first / luna | 1 | PASS | 15.141 | 0.187 | 13.535 | 1.495 | 4/2 | 4 | 0.000092 J; LLM n/d |
| H3-015 | autocomplete | jev-first / luna | 2 | PASS | 11.657 | 0.193 | 10.190 | 1.362 | 3/2 | 3 | 0.000100 J; LLM n/d |
| H3-016 | autocomplete | classic / luna | 2 | PASS | 27.569 | 0.186 | 27.422 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-017 | autocomplete | classic / luna | 3 | PASS | 38.618 | 0.184 | 38.469 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-018 | autocomplete | jev-first / luna | 3 | PASS | 12.912 | 0.188 | 11.791 | 1.022 | 3/2 | 3 | 0.000093 J; LLM n/d |
| H3-019 | form | jev-first / luna | 1 | PASS | 19.665 | 0.187 | 16.922 | 2.582 | 3/6 | 5 | 0.000420 J; LLM n/d |
| H3-020 | form | classic / luna | 1 | PASS | 23.392 | 0.190 | 23.276 | 0.000 | 9/0 | 4 | 0.000000 J; LLM n/d |
| H3-021 | form | classic / luna | 2 | PASS | 23.920 | 0.193 | 23.833 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H3-022 | form | jev-first / luna | 2 | PASS | 17.025 | 0.181 | 15.673 | 1.207 | 5/2 | 5 | 0.000130 J; LLM n/d |
| H3-023 | form | jev-first / luna | 3 | PASS | 19.855 | 0.188 | 16.931 | 2.775 | 3/6 | 5 | 0.000455 J; LLM n/d |
| H3-024 | form | classic / luna | 3 | PASS | 29.347 | 0.191 | 29.240 | 0.000 | 9/0 | 4 | 0.000000 J; LLM n/d |
| H3-025 | navigation | classic / luna | 1 | PASS | 37.831 | 0.189 | 37.691 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-026 | navigation | jev-first / luna | 1 | PASS | 12.893 | 0.176 | 11.749 | 0.967 | 3/2 | 3 | 0.000089 J; LLM n/d |
| H3-027 | navigation | jev-first / luna | 2 | PASS | 18.559 | 0.176 | 17.374 | 1.013 | 3/2 | 3 | 0.000087 J; LLM n/d |
| H3-028 | navigation | classic / luna | 2 | PASS | 23.729 | 0.189 | 23.574 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-029 | navigation | classic / luna | 3 | PASS | 34.098 | 0.190 | 33.946 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| H3-030 | navigation | jev-first / luna | 3 | PASS | 16.181 | 0.184 | 15.025 | 0.992 | 3/2 | 3 | 0.000087 J; LLM n/d |
| H3-031 | tabs | jev-first / luna | 1 | PASS | 8.356 | 0.183 | 7.183 | 1.079 | 2/2 | 2 | 0.000085 J; LLM n/d |
| H3-032 | tabs | classic / luna | 1 | PASS | 10.916 | 0.174 | 10.829 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H3-033 | tabs | classic / luna | 2 | PASS | 12.969 | 0.187 | 12.899 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H3-034 | tabs | jev-first / luna | 2 | PASS | 8.022 | 0.186 | 6.979 | 0.951 | 2/2 | 2 | 0.000084 J; LLM n/d |
| H3-035 | tabs | jev-first / luna | 3 | PASS | 9.855 | 0.188 | 8.790 | 0.975 | 2/2 | 2 | 0.000085 J; LLM n/d |
| H3-036 | tabs | classic / luna | 3 | PASS | 11.010 | 0.185 | 10.940 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H3-037 | scroll | classic / luna | 1 | PASS | 20.865 | 0.185 | 20.748 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H3-038 | scroll | jev-first / luna | 1 | PASS | 14.541 | 0.182 | 12.634 | 1.762 | 3/4 | 5 | 0.000135 J; LLM n/d |
| H3-039 | scroll | jev-first / luna | 2 | PASS | 18.800 | 0.185 | 16.667 | 1.983 | 3/4 | 5 | 0.000134 J; LLM n/d |
| H3-040 | scroll | classic / luna | 2 | PASS | 33.164 | 0.187 | 33.049 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H3-041 | scroll | classic / luna | 3 | PASS | 33.798 | 0.189 | 33.692 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| H3-042 | scroll | jev-first / luna | 3 | PASS | 26.851 | 0.183 | 24.214 | 2.497 | 4/4 | 5 | 0.000134 J; LLM n/d |
| H3-043 | disclosure | jev-first / luna | 1 | PASS | 15.105 | 0.183 | 10.009 | 5.001 | 3/0 | 2 | 0.000000 J; LLM n/d |
| H3-044 | disclosure | classic / luna | 1 | PASS | 9.415 | 0.185 | 9.344 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H3-045 | disclosure | classic / luna | 2 | PASS | 18.999 | 0.186 | 18.924 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |
| H3-046 | disclosure | jev-first / luna | 2 | PASS | 14.255 | 0.182 | 12.900 | 1.270 | 3/0 | 2 | 0.000000 J; LLM n/d |
| H3-047 | disclosure | jev-first / luna | 3 | PASS | 20.020 | 0.183 | 18.829 | 1.086 | 2/2 | 2 | 0.000089 J; LLM n/d |
| H3-048 | disclosure | classic / luna | 3 | PASS | 11.268 | 0.185 | 11.193 | 0.000 | 4/0 | 1 | 0.000000 J; LLM n/d |

- **H3-001**: stan=completed; koniec=final_answer; weryfikator FAIL.
- **H3-043**: stan=completed; koniec=final_answer; błędy Jev=[{"reason":"timeout_or_transport","elapsedMs":5001.199934999924,"parentCallId":"exec-4f1f02f8-81ea-402e-a0b6-a3715e3a43ad"}]; fallback=["jev_timeout_or_transport; inspect attached evidence and use fallback instead of immediately repeating the same delegation"].
- **H3-046**: stan=completed; koniec=final_answer; błędy Jev=[{"reason":"http_error","elapsedMs":1270.2857690000674,"httpStatus":503,"parentCallId":"exec-e6aaa7c1-65d2-4064-b97e-2988b42e952f"}]; fallback=["jev_http_error_503; inspect attached evidence and use fallback instead of immediately repeating the same delegation"].

<a id="seria-h4"></a>

### H4 — jev-openrouter-local-2026-09-17.json

Typ: **finalne wcześniejsze porównanie**. Źródło: [jev-openrouter-local-2026-09-17.json](../../docs/benchmarks/jev-openrouter-local-2026-09-17.json). Rekordy: 72; historyczne `success=true`: 70. Commit: `8d99ab025eae315ec909ff75e1ec5f1a6d7ca454`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H4-001 | search | jev-first / luna | 1 | PASS | 8.570 | 0.206 | 6.959 | 1.484 | 2/3 | 3 | 0.000163 J; LLM n/d |
| H4-002 | search | jev-first / Gemini | 1 | PASS | 3.897 | 0.193 | 2.967 | 0.826 | 2/3 | 3 | 0.003895 |
| H4-003 | search | classic / Gemini | 1 | PASS | 14.953 | 0.191 | 14.881 | 0.000 | 7/0 | 3 | 0.009322 |
| H4-004 | search | jev-first / Gemini | 2 | PASS | 3.468 | 0.197 | 2.154 | 1.222 | 2/3 | 3 | 0.003883 |
| H4-005 | search | classic / Gemini | 2 | FAIL | 9.296 | 0.175 | 9.274 | 0.000 | 7/0 | 4 | 0.007619 |
| H4-006 | search | jev-first / luna | 2 | PASS | 7.455 | 0.170 | 6.169 | 1.194 | 2/3 | 3 | 0.000163 J; LLM n/d |
| H4-007 | search | classic / Gemini | 3 | PASS | 9.464 | 0.184 | 9.391 | 0.000 | 7/0 | 3 | 0.009352 |
| H4-008 | search | jev-first / luna | 3 | PASS | 8.119 | 0.190 | 6.866 | 1.146 | 2/3 | 3 | 0.000160 J; LLM n/d |
| H4-009 | search | jev-first / Gemini | 3 | PASS | 2.967 | 0.226 | 2.067 | 0.771 | 2/3 | 3 | 0.003886 |
| H4-010 | filters | jev-first / Gemini | 1 | PASS | 5.496 | 0.227 | 4.296 | 1.066 | 2/4 | 4 | 0.003981 |
| H4-011 | filters | classic / Gemini | 1 | PASS | 9.190 | 0.184 | 9.089 | 0.000 | 9/0 | 4 | 0.013268 |
| H4-012 | filters | jev-first / luna | 1 | PASS | 11.500 | 0.193 | 9.826 | 1.554 | 3/4 | 4 | 0.000270 J; LLM n/d |
| H4-013 | filters | classic / Gemini | 2 | PASS | 8.901 | 0.187 | 8.792 | 0.000 | 9/0 | 4 | 0.013287 |
| H4-014 | filters | jev-first / luna | 2 | PASS | 13.566 | 0.190 | 11.915 | 1.537 | 3/4 | 4 | 0.000265 J; LLM n/d |
| H4-015 | filters | jev-first / Gemini | 2 | PASS | 4.156 | 0.200 | 2.593 | 1.444 | 2/4 | 4 | 0.003994 |
| H4-016 | filters | jev-first / luna | 3 | PASS | 9.860 | 0.195 | 8.308 | 1.435 | 2/4 | 4 | 0.000256 J; LLM n/d |
| H4-017 | filters | jev-first / Gemini | 3 | PASS | 3.526 | 0.180 | 2.188 | 1.217 | 2/4 | 4 | 0.004056 |
| H4-018 | filters | classic / Gemini | 3 | PASS | 21.040 | 0.186 | 20.937 | 0.000 | 9/0 | 4 | 0.013283 |
| H4-019 | autocomplete | classic / Gemini | 1 | PASS | 11.897 | 0.206 | 11.814 | 0.000 | 8/0 | 4 | 0.010919 |
| H4-020 | autocomplete | jev-first / luna | 1 | PASS | 13.345 | 0.187 | 12.349 | 0.890 | 4/2 | 3 | 0.000097 J; LLM n/d |
| H4-021 | autocomplete | jev-first / Gemini | 1 | PASS | 4.027 | 0.202 | 2.267 | 1.365 | 2/4 | 4 | 0.003935 |
| H4-022 | autocomplete | jev-first / luna | 2 | FAIL | 7.667 | 0.181 | 6.591 | 1.007 | 2/2 | 2 | 0.000100 J; LLM n/d |
| H4-023 | autocomplete | jev-first / Gemini | 2 | PASS | 4.248 | 0.182 | 3.653 | 0.502 | 3/2 | 3 | 0.006186 |
| H4-024 | autocomplete | classic / Gemini | 2 | PASS | 8.466 | 0.178 | 8.390 | 0.000 | 8/0 | 4 | 0.010882 |
| H4-025 | autocomplete | jev-first / Gemini | 3 | PASS | 3.913 | 0.192 | 1.916 | 1.593 | 2/4 | 4 | 0.003978 |
| H4-026 | autocomplete | classic / Gemini | 3 | PASS | 8.678 | 0.188 | 8.589 | 0.000 | 8/0 | 4 | 0.010689 |
| H4-027 | autocomplete | jev-first / luna | 3 | PASS | 9.940 | 0.189 | 8.882 | 0.945 | 3/2 | 3 | 0.000098 J; LLM n/d |
| H4-028 | form | jev-first / luna | 1 | PASS | 22.154 | 0.206 | 19.507 | 2.486 | 3/6 | 5 | 0.000438 J; LLM n/d |
| H4-029 | form | jev-first / Gemini | 1 | PASS | 4.891 | 0.216 | 3.199 | 1.566 | 2/4 | 4 | 0.004254 |
| H4-030 | form | classic / Gemini | 1 | PASS | 12.147 | 0.203 | 12.048 | 0.000 | 11/0 | 5 | 0.016749 |
| H4-031 | form | jev-first / Gemini | 2 | PASS | 3.644 | 0.176 | 1.945 | 1.578 | 2/4 | 4 | 0.004317 |
| H4-032 | form | classic / Gemini | 2 | PASS | 13.074 | 0.182 | 12.976 | 0.000 | 13/0 | 7 | 0.020185 |
| H4-033 | form | jev-first / luna | 2 | PASS | 15.930 | 0.191 | 15.158 | 0.654 | 5/1 | 4 | 0.000066 J; LLM n/d |
| H4-034 | form | classic / Gemini | 3 | PASS | 11.848 | 0.183 | 11.745 | 0.000 | 9/0 | 4 | 0.013221 |
| H4-035 | form | jev-first / luna | 3 | PASS | 21.287 | 0.189 | 19.625 | 1.547 | 2/4 | 4 | 0.000314 J; LLM n/d |
| H4-036 | form | jev-first / Gemini | 3 | PASS | 3.795 | 0.195 | 2.233 | 1.447 | 2/4 | 4 | 0.004189 |
| H4-037 | navigation | jev-first / Gemini | 1 | PASS | 7.555 | 0.186 | 6.521 | 0.869 | 3/2 | 3 | 0.006183 |
| H4-038 | navigation | classic / Gemini | 1 | PASS | 7.498 | 0.185 | 7.345 | 0.000 | 8/0 | 4 | 0.011162 |
| H4-039 | navigation | jev-first / luna | 1 | PASS | 10.622 | 0.189 | 9.475 | 0.996 | 3/2 | 3 | 0.000086 J; LLM n/d |
| H4-040 | navigation | classic / Gemini | 2 | PASS | 6.228 | 0.189 | 6.059 | 0.000 | 7/0 | 3 | 0.009473 |
| H4-041 | navigation | jev-first / luna | 2 | PASS | 9.199 | 0.214 | 7.816 | 1.197 | 2/3 | 3 | 0.000118 J; LLM n/d |
| H4-042 | navigation | jev-first / Gemini | 2 | PASS | 5.511 | 0.225 | 4.311 | 1.050 | 3/2 | 3 | 0.006112 |
| H4-043 | navigation | jev-first / luna | 3 | PASS | 10.652 | 0.178 | 9.158 | 1.338 | 2/3 | 3 | 0.000119 J; LLM n/d |
| H4-044 | navigation | jev-first / Gemini | 3 | PASS | 3.187 | 0.225 | 1.953 | 0.954 | 2/3 | 3 | 0.003869 |
| H4-045 | navigation | classic / Gemini | 3 | PASS | 10.852 | 0.193 | 10.716 | 0.000 | 7/0 | 3 | 0.009466 |
| H4-046 | tabs | classic / Gemini | 1 | PASS | 8.982 | 0.180 | 8.902 | 0.000 | 6/0 | 3 | 0.007760 |
| H4-047 | tabs | jev-first / luna | 1 | PASS | 8.261 | 0.183 | 7.239 | 0.914 | 2/2 | 2 | 0.000086 J; LLM n/d |
| H4-048 | tabs | jev-first / Gemini | 1 | PASS | 7.185 | 0.186 | 5.832 | 1.216 | 5/3 | 4 | 0.011463 |
| H4-049 | tabs | jev-first / luna | 2 | PASS | 8.266 | 0.181 | 7.257 | 0.915 | 2/2 | 2 | 0.000086 J; LLM n/d |
| H4-050 | tabs | jev-first / Gemini | 2 | PASS | 3.837 | 0.182 | 3.009 | 0.589 | 3/2 | 2 | 0.006018 |
| H4-051 | tabs | classic / Gemini | 2 | PASS | 5.381 | 0.189 | 5.312 | 0.000 | 5/0 | 2 | 0.006383 |
| H4-052 | tabs | jev-first / Gemini | 3 | PASS | 4.063 | 0.196 | 3.074 | 0.884 | 3/2 | 3 | 0.006187 |
| H4-053 | tabs | classic / Gemini | 3 | PASS | 4.977 | 0.183 | 4.904 | 0.000 | 5/0 | 2 | 0.006379 |
| H4-054 | tabs | jev-first / luna | 3 | PASS | 7.577 | 0.187 | 6.611 | 0.874 | 2/2 | 2 | 0.000083 J; LLM n/d |
| H4-055 | scroll | jev-first / luna | 1 | PASS | 12.586 | 0.186 | 10.969 | 1.445 | 3/4 | 5 | 0.000134 J; LLM n/d |
| H4-056 | scroll | jev-first / Gemini | 1 | PASS | 4.133 | 0.187 | 2.013 | 1.923 | 2/6 | 6 | 0.003924 |
| H4-057 | scroll | classic / Gemini | 1 | PASS | 6.269 | 0.180 | 6.186 | 0.000 | 5/0 | 2 | 0.006274 |
| H4-058 | scroll | jev-first / Gemini | 2 | PASS | 4.102 | 0.184 | 2.506 | 1.446 | 3/4 | 5 | 0.006217 |
| H4-059 | scroll | classic / Gemini | 2 | PASS | 6.689 | 0.184 | 6.621 | 0.000 | 5/0 | 2 | 0.006274 |
| H4-060 | scroll | jev-first / luna | 2 | PASS | 12.931 | 0.184 | 11.380 | 1.419 | 3/4 | 5 | 0.000134 J; LLM n/d |
| H4-061 | scroll | classic / Gemini | 3 | PASS | 7.274 | 0.178 | 7.213 | 0.000 | 5/0 | 2 | 0.006274 |
| H4-062 | scroll | jev-first / luna | 3 | PASS | 12.000 | 0.181 | 10.397 | 1.431 | 3/4 | 5 | 0.000135 J; LLM n/d |
| H4-063 | scroll | jev-first / Gemini | 3 | PASS | 4.885 | 0.181 | 3.270 | 1.453 | 3/4 | 5 | 0.006188 |
| H4-064 | disclosure | jev-first / Gemini | 1 | PASS | 2.475 | 0.214 | 1.789 | 0.597 | 2/2 | 2 | 0.003662 |
| H4-065 | disclosure | classic / Gemini | 1 | PASS | 5.578 | 0.188 | 5.506 | 0.000 | 5/0 | 2 | 0.006137 |
| H4-066 | disclosure | jev-first / luna | 1 | PASS | 7.598 | 0.180 | 6.581 | 0.930 | 2/2 | 2 | 0.000087 J; LLM n/d |
| H4-067 | disclosure | classic / Gemini | 2 | PASS | 4.842 | 0.184 | 4.768 | 0.000 | 5/0 | 2 | 0.006137 |
| H4-068 | disclosure | jev-first / luna | 2 | PASS | 6.933 | 0.204 | 5.932 | 0.919 | 2/2 | 2 | 0.000088 J; LLM n/d |
| H4-069 | disclosure | jev-first / Gemini | 2 | PASS | 3.867 | 0.186 | 2.131 | 0.530 | 2/2 | 2 | 0.003637 |
| H4-070 | disclosure | jev-first / luna | 3 | PASS | 9.490 | 0.196 | 8.461 | 0.939 | 2/2 | 2 | 0.000086 J; LLM n/d |
| H4-071 | disclosure | jev-first / Gemini | 3 | PASS | 4.064 | 0.188 | 3.060 | 0.915 | 2/2 | 2 | 0.003639 |
| H4-072 | disclosure | classic / Gemini | 3 | PASS | 7.635 | 0.192 | 7.571 | 0.000 | 5/0 | 2 | 0.006148 |

- **H4-005**: stan=failed; koniec=OpenRouter returned an empty response; weryfikator FAIL.
- **H4-022**: stan=completed; koniec=final_answer; weryfikator FAIL.

<a id="seria-h5"></a>

### H5 — jev-openrouter-flights-2026-09-17.json

Typ: **finalne wcześniejsze porównanie**. Źródło: [jev-openrouter-flights-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-2026-09-17.json). Rekordy: 9; historyczne `success=true`: 9. Commit: `8d99ab025eae315ec909ff75e1ec5f1a6d7ca454`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H5-001 | google-flights | jev-first / luna | 1 | PASS | 78.587 | 2.776 | 73.171 | 3.470 | 24/4 | 20 | 0.001939 J; LLM n/d |
| H5-002 | google-flights | jev-first / Gemini | 1 | PASS | 35.330 | 2.920 | 30.255 | 0.941 | 18/1 | 16 | 0.145695 |
| H5-003 | google-flights | classic / Gemini | 1 | PASS | 44.120 | 2.877 | 43.347 | 0.000 | 24/0 | 10 | 0.174697 |
| H5-004 | google-flights | jev-first / Gemini | 2 | PASS | 28.368 | 2.675 | 25.626 | 1.532 | 18/3 | 15 | 0.140514 |
| H5-005 | google-flights | classic / Gemini | 2 | PASS | 30.851 | 2.666 | 29.998 | 0.000 | 25/0 | 12 | 0.146569 |
| H5-006 | google-flights | jev-first / luna | 2 | PASS | 160.935 | 2.820 | 147.769 | 1.227 | 25/2 | 19 | 0.000971 J; LLM n/d |
| H5-007 | google-flights | classic / Gemini | 3 | PASS | 29.319 | 2.920 | 28.555 | 0.000 | 24/0 | 10 | 0.149717 |
| H5-008 | google-flights | jev-first / luna | 3 | PASS | 84.067 | 2.716 | 77.907 | 4.241 | 19/7 | 21 | 0.003605 J; LLM n/d |
| H5-009 | google-flights | jev-first / Gemini | 3 | PASS | 33.063 | 2.753 | 30.899 | 0.903 | 22/1 | 17 | 0.172346 |

<a id="seria-d1"></a>

### D1 — jev-first-diagnostic-2026-09-17.json

Typ: **wcześniejszy pilot / diagnostyka**. Źródło: [jev-first-diagnostic-2026-09-17.json](../../docs/benchmarks/jev-first-diagnostic-2026-09-17.json). Rekordy: 16; historyczne `success=true`: 15. Commit: `3fc31ed829700292036f349113f83282db05ef24`; dirty=`False`.

Uwaga źródłowa: Intentionally interrupted after redundant verification calls were identified. The interrupted attempt is retained. This is diagnostic data, not the final comparison.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1-001 | search | classic / sol | 1 | PASS | 17.895 | 0.194 | 17.805 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| D1-002 | search | jev-first / sol | 1 | PASS | 9.117 | 0.194 | 7.614 | 1.406 | 2/3 | 3 | 0.000166 J; LLM n/d |
| D1-003 | search | jev-first / luna | 1 | PASS | 8.965 | 0.182 | 7.682 | 1.184 | 2/3 | 3 | 0.000162 J; LLM n/d |
| D1-004 | search | jev-first / sol | 2 | PASS | 11.940 | 0.190 | 10.627 | 1.209 | 2/3 | 3 | 0.000173 J; LLM n/d |
| D1-005 | search | jev-first / luna | 2 | PASS | 10.858 | 0.194 | 9.580 | 1.182 | 2/3 | 3 | 0.000168 J; LLM n/d |
| D1-006 | search | classic / sol | 2 | PASS | 15.315 | 0.190 | 15.242 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| D1-007 | search | jev-first / luna | 3 | PASS | 8.743 | 0.188 | 7.407 | 1.231 | 2/3 | 3 | 0.000166 J; LLM n/d |
| D1-008 | search | classic / sol | 3 | PASS | 15.527 | 0.185 | 15.456 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| D1-009 | search | jev-first / sol | 3 | PASS | 10.631 | 0.187 | 9.298 | 1.228 | 2/3 | 3 | 0.000165 J; LLM n/d |
| D1-010 | filters | jev-first / sol | 1 | PASS | 11.589 | 0.190 | 9.953 | 1.525 | 2/4 | 4 | 0.000275 J; LLM n/d |
| D1-011 | filters | jev-first / luna | 1 | PASS | 13.327 | 0.185 | 11.719 | 1.488 | 3/4 | 4 | 0.000263 J; LLM n/d |
| D1-012 | filters | classic / sol | 1 | PASS | 21.019 | 0.192 | 20.913 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| D1-013 | filters | jev-first / luna | 2 | PASS | 11.600 | 0.195 | 9.194 | 2.270 | 3/4 | 4 | 0.000265 J; LLM n/d |
| D1-014 | filters | classic / sol | 2 | PASS | 18.809 | 0.190 | 18.689 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| D1-015 | filters | jev-first / sol | 2 | PASS | 21.001 | 0.190 | 19.267 | 1.592 | 4/4 | 4 | 0.000273 J; LLM n/d |
| D1-016 | filters | classic / sol | 3 | STOP celowy | 17.909 | 0.185 | 16.702 | 0.000 | 7/0 | 3 | 0.000000 J; LLM n/d |

- **D1-016**: stan=stopped; Browser is unresponsive. Restart browser to recover.; koniec=benchmark_interrupted; weryfikator FAIL.

<a id="seria-d2"></a>

### D2 — jev-first-pilot-2026-09-17.json

Typ: **wcześniejszy pilot / diagnostyka**. Źródło: [jev-first-pilot-2026-09-17.json](../../docs/benchmarks/jev-first-pilot-2026-09-17.json). Rekordy: 2; historyczne `success=true`: 2. Commit: `025bbc36cf6920989891056239fdb99631468421`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D2-001 | search | jev-first / sol | 1 | PASS | 11.388 | 0.392 | 9.763 | 1.501 | 2/3 | 3 | 0.000172 J; LLM n/d |
| D2-002 | search | jev-first / luna | 1 | PASS | 8.308 | 0.182 | 6.857 | 1.358 | 2/3 | 3 | 0.000170 J; LLM n/d |

<a id="seria-d3"></a>

### D3 — jev-first-service-errors-2026-09-17.json

Typ: **wcześniejszy pilot / diagnostyka**. Źródło: [jev-first-service-errors-2026-09-17.json](../../docs/benchmarks/jev-first-service-errors-2026-09-17.json). Rekordy: 16; historyczne `success=true`: 15. Commit: `66d3a257f0ab2eb300adf69233e5a6e017f5df7e`; dirty=`False`.

Uwaga źródłowa: Intentionally interrupted to diagnose provider errors. An independent minimal Jev request returned HTTP 503 at 20:08 Europe/Warsaw; a subsequent probe at 20:11 succeeded. Per-run errors were still generic in this revision; not every fallback can be attributed to HTTP 503. All attempts including the interrupted one are retained.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D3-001 | search | classic / sol | 1 | PASS | 19.227 | 0.199 | 19.128 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| D3-002 | search | jev-first / sol | 1 | PASS | 9.248 | 0.187 | 7.789 | 1.349 | 2/3 | 3 | 0.000170 J; LLM n/d |
| D3-003 | search | jev-first / luna | 1 | PASS | 7.950 | 0.189 | 6.622 | 1.235 | 2/3 | 3 | 0.000162 J; LLM n/d |
| D3-004 | search | jev-first / sol | 2 | PASS | 9.119 | 0.185 | 7.705 | 1.312 | 2/3 | 3 | 0.000172 J; LLM n/d |
| D3-005 | search | jev-first / luna | 2 | PASS | 21.563 | 0.187 | 20.623 | 0.000 | 7/0 | 3 | 0.000000 J; LLM n/d |
| D3-006 | search | classic / sol | 2 | PASS | 16.229 | 0.186 | 16.160 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| D3-007 | search | jev-first / luna | 3 | PASS | 20.635 | 0.189 | 19.720 | 0.000 | 7/0 | 3 | 0.000000 J; LLM n/d |
| D3-008 | search | classic / sol | 3 | PASS | 17.889 | 0.184 | 17.821 | 0.000 | 6/0 | 2 | 0.000000 J; LLM n/d |
| D3-009 | search | jev-first / sol | 3 | PASS | 23.252 | 0.189 | 22.494 | 0.000 | 6/0 | 3 | 0.000000 J; LLM n/d |
| D3-010 | filters | jev-first / sol | 1 | PASS | 24.872 | 0.185 | 24.042 | 0.000 | 8/0 | 4 | 0.000000 J; LLM n/d |
| D3-011 | filters | jev-first / luna | 1 | PASS | 23.323 | 0.195 | 22.559 | 0.000 | 8/0 | 4 | 0.000000 J; LLM n/d |
| D3-012 | filters | classic / sol | 1 | PASS | 18.519 | 0.188 | 18.407 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| D3-013 | filters | jev-first / luna | 2 | PASS | 14.370 | 0.183 | 12.111 | 2.134 | 3/4 | 4 | 0.000273 J; LLM n/d |
| D3-014 | filters | classic / sol | 2 | PASS | 21.572 | 0.187 | 21.479 | 0.000 | 8/0 | 3 | 0.000000 J; LLM n/d |
| D3-015 | filters | jev-first / sol | 2 | PASS | 26.088 | 0.187 | 22.638 | 3.223 | 5/7 | 7 | 0.000480 J; LLM n/d |
| D3-016 | filters | classic / sol | 3 | STOP celowy | 5.375 | 0.193 | 3.784 | 0.000 | 1/0 | 0 | 0.000000 J; LLM n/d |

- **D3-016**: stan=stopped; Browser is unresponsive. Restart browser to recover.; koniec=benchmark_interrupted; weryfikator FAIL.

<a id="seria-d4"></a>

### D4 — jev-openrouter-flights-diagnostic-2026-09-17.json

Typ: **wcześniejszy pilot / diagnostyka**. Źródło: [jev-openrouter-flights-diagnostic-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-diagnostic-2026-09-17.json). Rekordy: 2; historyczne `success=true`: 0. Commit: `f9f8ecdc007f135cffc4632ce75329b357964b23`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D4-001 | google-flights | jev-first / Gemini | 1 | FAIL | 66.077 | 3.134 | 60.408 | 0.888 | 35/1 | 29 | 0.386763 |
| D4-002 | google-flights | classic / Gemini | 1 | FAIL setup | — | — | — | — | —/— | — | — |

- **D4-001**: stan=completed; koniec=final_answer; weryfikator FAIL: searchPage, destination, oneWay, departure, year, results; fallback=["uncertain_operation"].
- **D4-002**: page.waitForURL: net::ERR_ABORTED; maybe frame was detached?.

<a id="seria-d5"></a>

### D5 — jev-openrouter-flights-pilot-2026-09-17.json

Typ: **wcześniejszy pilot / diagnostyka**. Źródło: [jev-openrouter-flights-pilot-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-pilot-2026-09-17.json). Rekordy: 2; historyczne `success=true`: 0. Commit: `f9f8ecdc007f135cffc4632ce75329b357964b23`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D5-001 | google-flights | jev-first / Gemini | 1 | FAIL | 31.395 | 2.732 | 25.740 | 1.155 | 19/2 | 15 | 0.140565 |
| D5-002 | google-flights | classic / Gemini | 1 | FAIL | 5.815 | 3.166 | 4.623 | 0.000 | 5/0 | 3 | 0.017641 |

- **D5-001**: stan=completed; koniec=final_answer; weryfikator FAIL: origin, oneWay, economy; fallback=["uncertain_operation"].
- **D5-002**: stan=failed; koniec=OpenRouter returned an empty response; weryfikator FAIL: searchPage, origin, destination, oneWay, departure, year, economy, results.

<a id="seria-d6"></a>

### D6 — jev-openrouter-pilot-2026-09-17.json

Typ: **wcześniejszy pilot / diagnostyka**. Źródło: [jev-openrouter-pilot-2026-09-17.json](../../docs/benchmarks/jev-openrouter-pilot-2026-09-17.json). Rekordy: 2; historyczne `success=true`: 2. Commit: `f9f8ecdc007f135cffc4632ce75329b357964b23`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D6-001 | search | classic / Gemini | 1 | PASS | 6.683 | 0.191 | 6.586 | 0.000 | 7/0 | 3 | 0.009143 |
| D6-002 | search | jev-first / Gemini | 1 | PASS | 3.744 | 0.193 | 2.299 | 1.332 | 2/3 | 3 | 0.003584 |

<a id="seria-p1"></a>

### P1 — final-flights.json

Typ: **finalne porównanie PoC**. Źródło: [final-flights.json](../benchmarks/browser-poc/results/final-flights.json). Rekordy: 30; historyczne `success=true`: 30. Data UTC: `2026-09-17T20:59:48.926Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-001 | google-flights | app-first / Gemini | 1 | PASS | 32.165 | 1.766 | 27.359 | 2.801 | 20/4 | 19 | 0.162419 |
| P1-002 | google-flights | ultrafast / Gemini | 1 | PASS | 11.609 | 3.174 | 2.190 | 7.798 | 2/18 | 10 | 0.004910 |
| P1-003 | google-flights | browser-use / Gemini | 1 | PASS | 35.097 | 3.329 | 20.083 | 0.000 | 11/0 | 12 | 0.044740 |
| P1-004 | google-flights | ultrafast / Gemini | 2 | PASS | 11.430 | 3.147 | 1.916 | 7.791 | 2/18 | 10 | 0.004961 |
| P1-005 | google-flights | browser-use / Gemini | 2 | PASS | 36.028 | 3.166 | 19.871 | 0.000 | 12/0 | 13 | 0.047273 |
| P1-006 | google-flights | app-first / Gemini | 2 | PASS | 26.232 | 2.742 | 24.112 | 0.873 | 20/1 | 16 | 0.199006 |
| P1-007 | google-flights | browser-use / Gemini | 3 | PASS | 37.356 | 4.192 | 20.800 | 0.000 | 12/0 | 14 | 0.041664 |
| P1-008 | google-flights | app-first / Gemini | 3 | PASS | 28.056 | 2.762 | 26.010 | 0.899 | 20/1 | 16 | 0.162830 |
| P1-009 | google-flights | ultrafast / Gemini | 3 | PASS | 10.886 | 3.197 | 1.957 | 7.243 | 2/18 | 10 | 0.004961 |
| P1-010 | google-flights | app-first / Gemini | 4 | PASS | 30.560 | 1.551 | 26.880 | 1.789 | 18/3 | 17 | 0.142003 |
| P1-011 | google-flights | ultrafast / Gemini | 4 | PASS | 10.148 | 3.242 | 2.310 | 6.478 | 2/17 | 10 | 0.004372 |
| P1-012 | google-flights | browser-use / Gemini | 4 | PASS | 34.388 | 3.082 | 18.556 | 0.000 | 12/0 | 13 | 0.043877 |
| P1-013 | google-flights | ultrafast / Gemini | 5 | PASS | 11.468 | 3.111 | 2.116 | 7.800 | 2/19 | 10 | 0.005163 |
| P1-014 | google-flights | browser-use / Gemini | 5 | PASS | 31.156 | 3.078 | 15.922 | 0.000 | 11/0 | 12 | 0.046025 |
| P1-015 | google-flights | app-first / Gemini | 5 | PASS | 32.069 | 2.868 | 25.979 | 0.917 | 18/1 | 17 | 0.157999 |
| P1-016 | google-flights | browser-use / Gemini | 6 warm | PASS | 34.550 | 2.292 | 19.456 | 0.000 | 11/0 | 12 | 0.042939 |
| P1-017 | google-flights | app-first / Gemini | 6 warm | PASS | 32.717 | 0.869 | 28.250 | 3.232 | 20/4 | 19 | 0.162088 |
| P1-018 | google-flights | ultrafast / Gemini | 6 warm | PASS | 11.629 | 1.413 | 2.199 | 7.830 | 2/19 | 10 | 0.005163 |
| P1-019 | google-flights | app-first / Gemini | 7 warm | PASS | 27.179 | 0.866 | 24.719 | 0.900 | 20/1 | 17 | 0.160244 |
| P1-020 | google-flights | ultrafast / Gemini | 7 warm | PASS | 11.069 | 1.172 | 2.382 | 7.396 | 2/18 | 10 | 0.004910 |
| P1-021 | google-flights | browser-use / Gemini | 7 warm | PASS | 37.856 | 2.484 | 22.186 | 0.000 | 12/0 | 13 | 0.046313 |
| P1-022 | google-flights | ultrafast / Gemini | 8 warm | PASS | 11.403 | 1.320 | 1.956 | 7.699 | 2/18 | 10 | 0.004961 |
| P1-023 | google-flights | browser-use / Gemini | 8 warm | PASS | 35.507 | 2.494 | 20.990 | 0.000 | 10/0 | 12 | 0.037738 |
| P1-024 | google-flights | app-first / Gemini | 8 warm | PASS | 31.004 | 1.078 | 28.265 | 0.904 | 20/1 | 17 | 0.153412 |
| P1-025 | google-flights | browser-use / Gemini | 9 warm | PASS | 33.027 | 2.179 | 17.905 | 0.000 | 11/0 | 12 | 0.042928 |
| P1-026 | google-flights | app-first / Gemini | 9 warm | PASS | 32.199 | 0.806 | 25.594 | 2.380 | 18/3 | 19 | 0.147789 |
| P1-027 | google-flights | ultrafast / Gemini | 9 warm | PASS | 12.229 | 1.320 | 1.775 | 8.773 | 2/19 | 11 | 0.005307 |
| P1-028 | google-flights | app-first / Gemini | 10 warm | PASS | 29.945 | 1.126 | 26.650 | 2.089 | 19/3 | 17 | 0.141552 |
| P1-029 | google-flights | ultrafast / Gemini | 10 warm | PASS | 11.417 | 1.377 | 2.054 | 7.733 | 2/20 | 11 | 0.005361 |
| P1-030 | google-flights | browser-use / Gemini | 10 warm | PASS | 33.813 | 2.514 | 18.755 | 0.000 | 11/0 | 12 | 0.043524 |

<a id="seria-p2"></a>

### P2 — final-local.json

Typ: **finalne porównanie PoC**. Źródło: [final-local.json](../benchmarks/browser-poc/results/final-local.json). Rekordy: 72; historyczne `success=true`: 63. Data UTC: `2026-09-17T21:14:41.945Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P2-001 | search | app-first / Gemini | 1 | PASS | 4.334 | 0.367 | 2.071 | 2.125 | 2/3 | 3 | 0.004061 |
| P2-002 | search | ultrafast / Gemini | 1 | PASS | 2.477 | 0.687 | 1.108 | 1.275 | 1/3 | 2 | 0.000476 |
| P2-003 | search | browser-use / Gemini | 1 | PASS | 4.571 | 1.444 | 3.075 | 0.000 | 2/0 | 3 | 0.003154 |
| P2-004 | search | ultrafast / Gemini | 2 | PASS | 2.296 | 0.683 | 1.009 | 1.183 | 1/3 | 2 | 0.000596 |
| P2-005 | search | browser-use / Gemini | 2 | PASS | 4.314 | 2.812 | 2.816 | 0.000 | 2/0 | 3 | 0.002620 |
| P2-006 | search | app-first / Gemini | 2 | PASS | 3.528 | 0.312 | 2.132 | 1.288 | 2/3 | 3 | 0.004016 |
| P2-007 | search | browser-use / Gemini | 3 | PASS | 4.452 | 1.442 | 2.947 | 0.000 | 2/0 | 3 | 0.002393 |
| P2-008 | search | app-first / Gemini | 3 | PASS | 3.542 | 0.315 | 2.128 | 1.300 | 2/3 | 3 | 0.003965 |
| P2-009 | search | ultrafast / Gemini | 3 | PASS | 3.202 | 0.683 | 2.001 | 1.103 | 1/3 | 2 | 0.000476 |
| P2-010 | filters | ultrafast / Gemini | 1 | PASS | 1.673 | 0.694 | 0.000 | 1.502 | 0/4 | 3 | 0.000366 |
| P2-011 | filters | browser-use / Gemini | 1 | PASS | 5.447 | 1.518 | 3.106 | 0.000 | 2/0 | 4 | 0.002598 |
| P2-012 | filters | app-first / Gemini | 1 | PASS | 3.414 | 0.320 | 1.760 | 1.527 | 2/4 | 4 | 0.004098 |
| P2-013 | filters | browser-use / Gemini | 2 | PASS | 5.896 | 1.458 | 3.683 | 0.000 | 2/0 | 4 | 0.002597 |
| P2-014 | filters | app-first / Gemini | 2 | PASS | 3.597 | 0.313 | 1.895 | 1.569 | 2/4 | 4 | 0.004085 |
| P2-015 | filters | ultrafast / Gemini | 2 | PASS | 1.736 | 0.691 | 0.000 | 1.635 | 0/4 | 3 | 0.000366 |
| P2-016 | filters | app-first / Gemini | 3 | PASS | 4.254 | 0.314 | 2.348 | 1.776 | 2/4 | 4 | 0.004079 |
| P2-017 | filters | ultrafast / Gemini | 3 | PASS | 1.940 | 0.670 | 0.000 | 1.810 | 0/4 | 3 | 0.000366 |
| P2-018 | filters | browser-use / Gemini | 3 | PASS | 5.302 | 1.434 | 3.079 | 0.000 | 2/0 | 4 | 0.002856 |
| P2-019 | autocomplete | browser-use / Gemini | 1 | PASS | 8.487 | 1.423 | 6.057 | 0.000 | 4/0 | 4 | 0.004689 |
| P2-020 | autocomplete | app-first / Gemini | 1 | PASS | 4.407 | 0.301 | 3.240 | 1.064 | 3/2 | 3 | 0.006277 |
| P2-021 | autocomplete | ultrafast / Gemini | 1 | PASS | 2.447 | 0.687 | 0.771 | 1.561 | 1/4 | 3 | 0.000544 |
| P2-022 | autocomplete | app-first / Gemini | 2 | PASS | 4.042 | 0.312 | 1.991 | 1.634 | 2/4 | 4 | 0.004022 |
| P2-023 | autocomplete | ultrafast / Gemini | 2 | PASS | 2.454 | 0.679 | 0.796 | 1.521 | 1/4 | 3 | 0.000544 |
| P2-024 | autocomplete | browser-use / Gemini | 2 | PASS | 8.200 | 1.424 | 5.809 | 0.000 | 4/0 | 6 | 0.004971 |
| P2-025 | autocomplete | ultrafast / Gemini | 3 | PASS | 2.865 | 0.694 | 1.021 | 1.715 | 1/4 | 3 | 0.000544 |
| P2-026 | autocomplete | browser-use / Gemini | 3 | PASS | 7.091 | 1.417 | 5.650 | 0.000 | 4/0 | 4 | 0.004802 |
| P2-027 | autocomplete | app-first / Gemini | 3 | PASS | 4.368 | 0.315 | 2.250 | 1.705 | 2/4 | 4 | 0.004015 |
| P2-028 | wizard-6 | app-first / Gemini | 1 | PASS | 28.746 | 0.318 | 18.664 | 9.453 | 14/29 | 28 | 0.063911 |
| P2-029 | wizard-6 | ultrafast / Gemini | 1 | PASS | 21.100 | 0.744 | 11.678 | 8.441 | 12/25 | 24 | 0.007575 |
| P2-030 | wizard-6 | browser-use / Gemini | 1 | PASS | 20.884 | 1.934 | 12.516 | 0.000 | 7/0 | 25 | 0.012103 |
| P2-031 | wizard-6 | ultrafast / Gemini | 2 | PASS | 29.949 | 0.879 | 20.941 | 8.081 | 12/25 | 24 | 0.008055 |
| P2-032 | wizard-6 | browser-use / Gemini | 2 | PASS | 19.759 | 1.931 | 11.389 | 0.000 | 7/0 | 25 | 0.011798 |
| P2-033 | wizard-6 | app-first / Gemini | 2 | PASS | 34.960 | 0.301 | 33.722 | 0.700 | 29/1 | 27 | 0.200153 |
| P2-034 | wizard-6 | browser-use / Gemini | 3 | PASS | 20.202 | 1.936 | 11.807 | 0.000 | 7/0 | 25 | 0.012356 |
| P2-035 | wizard-6 | app-first / Gemini | 3 | PASS | 42.798 | 0.318 | 41.591 | 0.667 | 28/1 | 27 | 0.194110 |
| P2-036 | wizard-6 | ultrafast / Gemini | 3 | PASS | 24.069 | 0.712 | 13.836 | 9.194 | 12/25 | 24 | 0.007972 |
| P2-037 | wizard-10 | ultrafast / Gemini | 1 | PASS | 37.329 | 0.694 | 21.724 | 13.966 | 20/41 | 40 | 0.014472 |
| P2-038 | wizard-10 | browser-use / Gemini | 1 | PASS | 33.459 | 1.922 | 19.695 | 0.000 | 11/0 | 41 | 0.021062 |
| P2-039 | wizard-10 | app-first / Gemini | 1 | PASS | 47.593 | 0.310 | 46.031 | 0.713 | 42/1 | 41 | 0.259858 |
| P2-040 | wizard-10 | browser-use / Gemini | 2 | PASS | 31.301 | 1.921 | 17.552 | 0.000 | 11/0 | 41 | 0.021761 |
| P2-041 | wizard-10 | app-first / Gemini | 2 | PASS | 51.841 | 0.309 | 50.231 | 0.728 | 43/1 | 42 | 0.272538 |
| P2-042 | wizard-10 | ultrafast / Gemini | 2 | PASS | 36.744 | 0.695 | 22.609 | 12.484 | 20/41 | 40 | 0.014010 |
| P2-043 | wizard-10 | app-first / Gemini | 3 | PASS | 60.242 | 0.306 | 58.753 | 0.619 | 42/1 | 41 | 0.261231 |
| P2-044 | wizard-10 | ultrafast / Gemini | 3 | PASS | 38.321 | 0.703 | 22.684 | 13.954 | 20/41 | 40 | 0.013245 |
| P2-045 | wizard-10 | browser-use / Gemini | 3 | PASS | 34.246 | 1.912 | 20.508 | 0.000 | 11/0 | 41 | 0.020121 |
| P2-046 | compare-offers | browser-use / Gemini | 1 | PASS | 11.004 | 1.912 | 9.473 | 0.000 | 2/0 | 4 | 0.018190 |
| P2-047 | compare-offers | app-first / Gemini | 1 | PASS | 9.105 | 0.310 | 6.285 | 2.644 | 4/6 | 8 | 0.010922 |
| P2-048 | compare-offers | ultrafast / Gemini | 1 | FAIL | 22.684 | 0.677 | 0.000 | 20.455 | 0/61 | 60 | 0.008582 |
| P2-049 | compare-offers | app-first / Gemini | 2 | PASS | 5.489 | 0.312 | 4.467 | 0.890 | 4/2 | 4 | 0.010677 |
| P2-050 | compare-offers | ultrafast / Gemini | 2 | FAIL | 22.352 | 0.684 | 0.000 | 20.286 | 0/61 | 60 | 0.008582 |
| P2-051 | compare-offers | browser-use / Gemini | 2 | PASS | 10.488 | 1.918 | 8.917 | 0.000 | 2/0 | 4 | 0.017927 |
| P2-052 | compare-offers | ultrafast / Gemini | 3 | FAIL | 23.498 | 0.706 | 0.000 | 21.350 | 0/61 | 60 | 0.008582 |
| P2-053 | compare-offers | browser-use / Gemini | 3 | PASS | 7.966 | 1.947 | 6.441 | 0.000 | 2/0 | 4 | 0.015154 |
| P2-054 | compare-offers | app-first / Gemini | 3 | PASS | 11.184 | 0.318 | 5.655 | 5.174 | 4/12 | 12 | 0.012563 |
| P2-055 | research-offers | app-first / Gemini | 1 | PASS | 13.797 | 0.301 | 12.524 | 0.690 | 11/2 | 11 | 0.044532 |
| P2-056 | research-offers | ultrafast / Gemini | 1 | FAIL | 24.298 | 0.709 | 0.000 | 21.835 | 0/61 | 60 | 0.006874 |
| P2-057 | research-offers | browser-use / Gemini | 1 | PASS | 29.518 | 1.948 | 23.062 | 0.000 | 8/0 | 10 | 0.055947 |
| P2-058 | research-offers | ultrafast / Gemini | 2 | FAIL | 22.698 | 0.712 | 0.000 | 20.262 | 0/61 | 60 | 0.006874 |
| P2-059 | research-offers | browser-use / Gemini | 2 | PASS | 27.257 | 1.947 | 20.771 | 0.000 | 8/0 | 10 | 0.056165 |
| P2-060 | research-offers | app-first / Gemini | 2 | PASS | 16.017 | 0.311 | 14.460 | 0.934 | 11/2 | 11 | 0.044777 |
| P2-061 | research-offers | browser-use / Gemini | 3 | PASS | 25.815 | 1.455 | 19.355 | 0.000 | 8/0 | 10 | 0.045817 |
| P2-062 | research-offers | app-first / Gemini | 3 | PASS | 13.198 | 0.312 | 10.127 | 2.355 | 9/7 | 14 | 0.033629 |
| P2-063 | research-offers | ultrafast / Gemini | 3 | FAIL | 22.901 | 0.697 | 0.000 | 20.530 | 0/61 | 60 | 0.006874 |
| P2-064 | tabs | ultrafast / Gemini | 1 | FAIL ukończenia; stan PASS | 1.339 | 0.910 | 0.000 | 1.130 | 0/3 | 3 | 0.000171 |
| P2-065 | tabs | browser-use / Gemini | 1 | PASS | 4.157 | 1.450 | 2.925 | 0.000 | 2/0 | 2 | 0.002388 |
| P2-066 | tabs | app-first / Gemini | 1 | PASS | 2.850 | 0.318 | 1.873 | 0.847 | 2/2 | 2 | 0.003917 |
| P2-067 | tabs | browser-use / Gemini | 2 | PASS | 4.324 | 1.465 | 3.094 | 0.000 | 2/0 | 2 | 0.002612 |
| P2-068 | tabs | app-first / Gemini | 2 | PASS | 4.931 | 0.323 | 3.841 | 0.958 | 2/2 | 2 | 0.003950 |
| P2-069 | tabs | ultrafast / Gemini | 2 | FAIL ukończenia; stan PASS | 1.043 | 0.681 | 0.000 | 0.989 | 0/2 | 1 | 0.000113 |
| P2-070 | tabs | app-first / Gemini | 3 | PASS | 7.685 | 0.323 | 6.062 | 1.456 | 2/4 | 4 | 0.003989 |
| P2-071 | tabs | ultrafast / Gemini | 3 | FAIL ukończenia; stan PASS | 1.317 | 0.675 | 0.000 | 1.154 | 0/3 | 3 | 0.000171 |
| P2-072 | tabs | browser-use / Gemini | 3 | PASS | 4.305 | 1.431 | 3.066 | 0.000 | 2/0 | 2 | 0.002517 |

- **P2-048**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.
- **P2-050**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.
- **P2-052**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.
- **P2-056**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.
- **P2-058**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.
- **P2-063**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.
- **P2-064**: stan=blocked.
- **P2-069**: stan=blocked.
- **P2-071**: stan=blocked.

<a id="seria-x1"></a>

### X1 — pilot-search.json

Typ: **pilot PoC**. Źródło: [pilot-search.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 3; historyczne `success=true`: 2. Data UTC: `2026-09-17T20:49:54.152Z`. PoC commit: `e6e38c61dfc16fb07dd5f828229ef7481aa6e76f`; dirty=`brak`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X1-001 | search | app-first / Gemini | 1 | PASS | 3.381 | 0.398 | 2.033 | 1.207 | 2/3 | 3 | 0.004008 |
| X1-002 | search | ultrafast / Gemini | 1 | FAIL setup | — | 1.144 | — | — | —/— | — | — |
| X1-003 | search | browser-use / Gemini | 1 | PASS | 5.961 | 2.987 | 4.277 | 0.000 | 2/0 | 3 | 0.003071 |

- **X1-002**: fatal: AF_UNIX path too long.

<a id="seria-x2"></a>

### X2 — pilot-ultrafast-search.json

Typ: **pilot PoC**. Źródło: [pilot-ultrafast-search.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T20:50:45.278Z`. PoC commit: `e6e38c61dfc16fb07dd5f828229ef7481aa6e76f`; dirty=`brak`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X2-001 | search | ultrafast / Gemini | 1 | FAIL | 2.305 | 1.002 | 1.061 | 1.157 | 1/3 | 2 | 0.000476 |

- **X2-001**: stan=done; Open an HTTP or HTTPS page before reading.

<a id="seria-x3"></a>

### X3 — pilot-ultrafast-v2.json

Typ: **pilot PoC**. Źródło: [pilot-ultrafast-v2.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 2; historyczne `success=true`: 1. Data UTC: `2026-09-17T20:51:32.205Z`. PoC commit: `e6e38c61dfc16fb07dd5f828229ef7481aa6e76f`; dirty=`brak`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X3-001 | search | ultrafast / Gemini | 1 | PASS | 2.492 | 0.709 | 1.104 | 1.281 | 1/3 | 2 | 0.000476 |
| X3-002 | google-flights | ultrafast / Gemini | 1 | FAIL setup | — | 0.928 | — | — | —/— | — | — |

- **X3-002**: page.waitForURL: net::ERR_ABORTED; maybe frame was detached?.

<a id="seria-x4"></a>

### X4 — pilot-flights-v3.json

Typ: **pilot PoC**. Źródło: [pilot-flights-v3.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 3; historyczne `success=true`: 3. Data UTC: `2026-09-17T20:52:11.078Z`. PoC commit: `e6e38c61dfc16fb07dd5f828229ef7481aa6e76f`; dirty=`brak`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X4-001 | google-flights | app-first / Gemini | 1 | PASS | 30.079 | 2.668 | 27.921 | 0.875 | 19/1 | 15 | 0.149043 |
| X4-002 | google-flights | ultrafast / Gemini | 1 | PASS | 8.806 | 3.565 | 1.639 | 5.668 | 2/17 | 10 | 0.004372 |
| X4-003 | google-flights | browser-use / Gemini | 1 | PASS | 29.788 | 3.249 | 16.198 | 0.000 | 10/0 | 11 | 0.043280 |

<a id="seria-x5"></a>

### X5 — stop-ultrafast.json

Typ: **Stop celowy**. Źródło: [stop-ultrafast.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T20:54:29.682Z`. PoC commit: `e6e38c61dfc16fb07dd5f828229ef7481aa6e76f`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X5-001 | wizard-6 | ultrafast / Gemini | 1 | STOP celowy | 0.353 | 0.979 | 0.000 | 0.000 | 0/0 | 0 | 0.000000 |

- **X5-001**: stan=ready; stopped; weryfikator FAIL: count, values.

<a id="seria-x6"></a>

### X6 — stop-browser-use.json

Typ: **Stop celowy**. Źródło: [stop-browser-use.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T20:54:59.634Z`. PoC commit: `e6e38c61dfc16fb07dd5f828229ef7481aa6e76f`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X6-001 | wizard-6 | browser-use / Gemini | 1 | STOP celowy | 0.440 | 1.796 | 0.000 | 0.000 | 0/0 | — | 0.000000 |

- **X6-001**: stan=error; Cannot read properties of undefined (reading 'evaluate').

<a id="seria-x7"></a>

### X7 — pilot-complex.json

Typ: **pilot PoC**. Źródło: [pilot-complex.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 6; historyczne `success=true`: 4. Data UTC: `2026-09-17T20:55:15.361Z`. PoC commit: `0bbb7859b1f7a0772ad96795239d99ea3285e7bc`; dirty=`False`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X7-001 | wizard-6 | app-first / Gemini | 1 | PASS | 21.285 | 0.323 | 11.425 | 9.195 | 8/27 | 30 | 0.031155 |
| X7-002 | wizard-6 | ultrafast / Gemini | 1 | FAIL | 33.857 | 0.712 | 4.749 | 28.718 | 5/10 | 9 | 0.002880 |
| X7-003 | wizard-6 | browser-use / Gemini | 1 | PASS | 19.332 | 1.965 | 10.954 | 0.000 | 7/0 | 25 | 0.013339 |
| X7-004 | compare-offers | ultrafast / Gemini | 1 | FAIL | 20.362 | 0.915 | 0.000 | 18.235 | 0/61 | 60 | 0.008582 |
| X7-005 | compare-offers | browser-use / Gemini | 1 | PASS | 11.778 | 1.918 | 10.233 | 0.000 | 2/0 | 4 | 0.016405 |
| X7-006 | compare-offers | app-first / Gemini | 1 | PASS | 6.161 | 0.316 | 5.361 | 0.652 | 5/1 | 4 | 0.014217 |

- **X7-002**: stan=ready; Model connection failed; no action executed.; weryfikator FAIL: count, values.
- **X7-004**: stan=blocked; Stopped at the 60-action demo budget; weryfikator FAIL.

<a id="seria-x8"></a>

### X8 — pilot-cleanup.json

Typ: **pilot PoC**. Źródło: [pilot-cleanup.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 1. Data UTC: `2026-09-17T20:59:00.079Z`. PoC commit: `0bbb7859b1f7a0772ad96795239d99ea3285e7bc`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X8-001 | search | browser-use / Gemini | 1 | PASS | 6.814 | 1.767 | 5.382 | 0.000 | 3/0 | 3 | 0.004732 |

<a id="seria-x9"></a>

### X9 — stop-app-first.json

Typ: **Stop celowy**. Źródło: [stop-app-first.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T20:59:20.161Z`. PoC commit: `0bbb7859b1f7a0772ad96795239d99ea3285e7bc`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X9-001 | wizard-6 | app-first / Gemini | 1 | STOP celowy | 0.356 | 0.325 | 0.354 | 0.000 | 1/0 | 0 | 0.000000 |

- **X9-001**: stan=stopped; koniec=benchmark_stop; weryfikator FAIL; interrupted before verification.

<a id="seria-x10"></a>

### X10 — stop-final-app-first.json

Typ: **Stop celowy**. Źródło: [stop-final-app-first.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T21:36:47.444Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X10-001 | wizard-6 | app-first / Gemini | 1 | STOP celowy | 0.355 | 0.352 | 0.353 | 0.000 | 1/0 | 0 | 0.000000 |

- **X10-001**: stan=stopped; koniec=benchmark_stop; weryfikator FAIL; interrupted before verification.

<a id="seria-x11"></a>

### X11 — stop-final-ultrafast.json

Typ: **Stop celowy**. Źródło: [stop-final-ultrafast.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T21:36:49.797Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X11-001 | wizard-6 | ultrafast / Gemini | 1 | STOP celowy | 0.352 | 0.708 | 0.000 | 0.000 | 0/0 | 0 | 0.000000 |

- **X11-001**: stan=ready; stopped; weryfikator FAIL; interrupted before verification.

<a id="seria-x12"></a>

### X12 — stop-final-browser-use.json

Typ: **Stop celowy**. Źródło: [stop-final-browser-use.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T21:36:53.605Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X12-001 | wizard-6 | browser-use / Gemini | 1 | STOP celowy | 0.435 | 1.492 | 0.000 | 0.000 | 0/0 | — | 0.000000 |

- **X12-001**: stan=error; Cannot read properties of undefined (reading 'screenshot'); weryfikator FAIL; interrupted before verification.

<a id="seria-x13"></a>

### X13 — headed-smoke.json

Typ: **kontrola headful**. Źródło: [headed-smoke.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 1. Data UTC: `2026-09-17T21:36:56.466Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X13-001 | search | ultrafast / Gemini | 1 | PASS | 2.344 | 1.126 | 1.045 | 1.233 | 1/3 | 2 | 0.000476 |

<a id="seria-x14"></a>

### X14 — stop-verified-browser-use.json

Typ: **Stop celowy**. Źródło: [stop-verified-browser-use.json — wpis archiwum](../benchmarks/browser-poc/results/diagnostics.json.gz). Rekordy: 1; historyczne `success=true`: 0. Data UTC: `2026-09-17T21:38:07.481Z`. PoC commit: `6354eac83e6985d4082fb116e986da089886fc7c`; dirty=`True`.

| ID | Zadanie | Silnik / model | Powt. | Wynik | task s | setup s | LLM s | Jev s | LLM/Jev # | Akcje | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X14-001 | wizard-6 | browser-use / Gemini | 1 | STOP celowy | 0.423 | 1.772 | 0.000 | 0.000 | 0/0 | 0 | 0.000000 |

- **X14-001**: stan=stopped; weryfikator FAIL; interrupted before verification.

### Bezpośredni driver Jev — 8 prób, osobny zegar

| Zadanie | Historyczny success | Status podzadania | Czas podzadania s | Jev s | Decyzje / fallbacki | Akcje | Jev USD |
| --- | --- | --- | --- | --- | --- | --- | --- |
| search | PASS | completion_candidate | 1.568 | 1.491 | 3 / 0 | 2 | 0.000136 |
| filters | PASS | completion_candidate | 1.345 | 1.246 | 4 / 0 | 3 | 0.000227 |
| autocomplete | PASS | completion_candidate | 1.554 | 1.172 | 4 / 0 | 3 | 0.000169 |
| form | PASS | completion_candidate | 1.474 | 1.388 | 4 / 0 | 3 | 0.000253 |
| navigation | FAIL | needs_help | 0.714 | 0.648 | 2 / 1 | 1 | 0.000075 |
| tabs | PASS | needs_help | 1.029 | 0.957 | 2 / 1 | 1 | 0.000071 |
| scroll | PASS | completion_candidate | 1.717 | 1.595 | 6 / 0 | 5 | 0.000196 |
| disclosure | PASS | completion_candidate | 0.625 | 0.554 | 2 / 0 | 1 | 0.000076 |

Historyczne wyniki funkcjonalne: **7/8**. Nawigacja potrzebowała pomocy (`uncertain_operation`) i nie dotarła do końca. Nowa karta była poprawnie otwarta, lecz również zwróciła `needs_help`; ten wynik PASS dotyczy stanu strony. `completion_candidate` ma `verified=false` i wymaga niezależnej oceny. Te czasy nie obejmują pełnego cyklu głównego planisty i nie są konkurentem czasów taskMs z finalnych benchmarków. [Pełny wynik drivera](../../docs/benchmarks/jev-driver-2026-09-17.json).

<a id="zrodla"></a>

## Źródła, integralność i odtworzenie

Ten jeden plik zawiera zestawienie i wyniki każdej zachowanej próby; surowe obserwacje, metryki API i sekwencje narzędzi pozostają w podlinkowanych JSON/archiwach. Kopia publikacyjna zawiera źródła w tym samym repozytorium. Linki są względne; metryki i hashe oryginałów pozostają bez zmian. Historyczne ścieżki w surowych danych opisują środowisko pomiaru, nie wymóg odczytu archiwum.

Raporty interpretacyjne: [Hybrid](../../docs/benchmarks/jev-2026-09-17.md) · [First/Luna](../../docs/benchmarks/jev-first-2026-09-17.md) · [OpenRouter](../../docs/benchmarks/jev-openrouter-2026-09-17.md) · [architektura i starsze walidacje](../../docs/jev-hybrid.md) · [finalny PoC](../benchmarks/browser-poc/RESULTS.md) · [plan PoC](../benchmarks/browser-poc/PLAN.md) · [uruchomienie](../benchmarks/browser-poc/README.md).

| Plik kanoniczny | SHA-256 zapisanej zawartości |
| --- | --- |
| [jev-2026-09-17.json](../../docs/benchmarks/jev-2026-09-17.json) | 78c76984c5553c5fa4dd15a1199c91ec9ee9bbd0ae32efbcdd26bfddd1e64ec0 |
| [jev-desktop-2026-09-17.json](../../docs/benchmarks/jev-desktop-2026-09-17.json) | 04bb1002b8c01ac1aaac1a0be3c661f450521e5555d6bac36accc65761d149ce |
| [jev-driver-2026-09-17.json](../../docs/benchmarks/jev-driver-2026-09-17.json) | aeb282442a20d34f4bbc49b5cb72c8c0a7570f157fd5f2b74a35b316a5b5e040 |
| [jev-first-comparison-2026-09-17.json](../../docs/benchmarks/jev-first-comparison-2026-09-17.json) | dca4345a2d1f21b4a7910b3980bf1d34080d9ea14087fab1b89fcd721827219e |
| [jev-first-desktop-2026-09-17.json](../../docs/benchmarks/jev-first-desktop-2026-09-17.json) | 79797c2faff6aadd0a0b620db00b18f2425dfab81ce94e34dff5be610fc193eb |
| [jev-first-desktop-final-2026-09-17.json](../../docs/benchmarks/jev-first-desktop-final-2026-09-17.json) | c846b1f7101542590163fe674f4958788c910bc06585e6e30932791e19dc340b |
| [jev-first-diagnostic-2026-09-17.json](../../docs/benchmarks/jev-first-diagnostic-2026-09-17.json) | 4d764efcfc3a66da97cab7eb7f432ca198a6a8c440fd30109610e3c6dcfab616 |
| [jev-first-luna-final-2026-09-17.json](../../docs/benchmarks/jev-first-luna-final-2026-09-17.json) | 23ed3898053babade7a1d98e0813b8069e9c8b37dc019eece48aaa01e87bba73 |
| [jev-first-pilot-2026-09-17.json](../../docs/benchmarks/jev-first-pilot-2026-09-17.json) | 2f1c5b37063517e1e1f3c23d5576cded2cfb94b3c35e66b24c7471327e661926 |
| [jev-first-service-errors-2026-09-17.json](../../docs/benchmarks/jev-first-service-errors-2026-09-17.json) | 100c27cd2d0e80152a26cf5a36e7210050e7662cbd24d39c2187cc171dc8819b |
| [jev-openrouter-desktop-2026-09-17.json](../../docs/benchmarks/jev-openrouter-desktop-2026-09-17.json) | d126bb25979a7568d560502fdf1115c550761bb5c752c15e4969b056f83fa612 |
| [jev-openrouter-flights-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-2026-09-17.json) | 611abeaaa3d5b0e843db072b8c557867048ab063cd8753cad47fdc931204b00b |
| [jev-openrouter-flights-diagnostic-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-diagnostic-2026-09-17.json) | 3e4b06ffc5b849a60ea0b4a74ce1a401061d90b3c0726b6df5d7e5e8cb1cd1f9 |
| [jev-openrouter-flights-pilot-2026-09-17.json](../../docs/benchmarks/jev-openrouter-flights-pilot-2026-09-17.json) | 671d8875b7f7e28783b36e7f2e2774ad42d167d6752eb093e452db593a2c93d1 |
| [jev-openrouter-local-2026-09-17.json](../../docs/benchmarks/jev-openrouter-local-2026-09-17.json) | 18094532841126b54ee75a8b60dd1e931f29f99b387400a58291dd65a6f0b503 |
| [jev-openrouter-pilot-2026-09-17.json](../../docs/benchmarks/jev-openrouter-pilot-2026-09-17.json) | 58cc538e835e98298cef50dae59cbb0ec73ec88fef449301559a36f264c4441d |
| [jev-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-2026-09-17-traces.json.gz) | 46e353f4204904178c28175f20749361ed069e2123883a95d7f2804935272999 |
| [jev-first-comparison-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-first-comparison-2026-09-17-traces.json.gz) | 10580729f5234e43ae658db8a474df546237bcd71d5b4027115f608a1448aad9 |
| [jev-first-diagnostic-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-first-diagnostic-2026-09-17-traces.json.gz) | 2e0d8d53602fa664257db77547d1e15a7aeb1ed54c6d676f7cd61121a90e8bfc |
| [jev-first-luna-final-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-first-luna-final-2026-09-17-traces.json.gz) | c08159a7bde7b1dd4765c71798119e1051a0958d53e4bf9b015d80701a936ee6 |
| [jev-first-pilot-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-first-pilot-2026-09-17-traces.json.gz) | 249e6866d83a869db76ffc34b63e40fe9c4f959d143bd4097382d67fdd8e0ef3 |
| [jev-first-service-errors-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-first-service-errors-2026-09-17-traces.json.gz) | ad5c37708149373f5dcc2db9559d31c6a271a0c7e7a3510e8127c803f2406a9f |
| [jev-openrouter-flights-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-openrouter-flights-2026-09-17-traces.json.gz) | c4db8f07534c29a6f7e091a387c0128c907120410b63af43822c8fbed246a928 |
| [jev-openrouter-flights-diagnostic-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-openrouter-flights-diagnostic-2026-09-17-traces.json.gz) | 82ade4a0bf1412ffefb832df3ef0ce5c28baea720c0e351ba7e6e70569f2971f |
| [jev-openrouter-flights-pilot-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-openrouter-flights-pilot-2026-09-17-traces.json.gz) | 6fbe5ec7ecc3a6450f78378dc8da42077f8f1a6c5b284362034c283022f6f9ee |
| [jev-openrouter-local-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-openrouter-local-2026-09-17-traces.json.gz) | 84ff8cb36e6077daf8c50b20e6301a9b5a5a7ec3381be31f6f6971cf6a42567e |
| [jev-openrouter-pilot-2026-09-17-traces.json.gz](../../docs/benchmarks/jev-openrouter-pilot-2026-09-17-traces.json.gz) | 4b8013aec45c74be00332417e5e3535fcdf71adbe20517b328fd86c29cc1b748 |
| [final-flights.json](../benchmarks/browser-poc/results/final-flights.json) | 028c411d90f4a63c65faf8cd67681b4f7c1bfb540bef5f61905448a20019a922 |
| [final-local.json](../benchmarks/browser-poc/results/final-local.json) | fd571311b5d09fefbbb58b8d2cb29660cf1bd690863a3ca503dac3b670c2f112 |
| [summary.json](../benchmarks/browser-poc/results/summary.json) | e38e00eb6ff2bb4c75689c00809bcc01835173cd33057bfb359f9366302c3b4b |
| [final-traces.json.gz](../benchmarks/browser-poc/results/final-traces.json.gz) | 0298c3fcbcba70e7fcf129194485fabfb509bb5d5b3f4a7d3d5c7eecf943308c |
| [diagnostics.json.gz](../benchmarks/browser-poc/results/diagnostics.json.gz) | e17deac662515c2f5f678bee41d98873c43e2e0d430cd84c44dbe186457a024f |
| [validation.json](../benchmarks/browser-poc/results/validation.json) | 220b13b55a51c3ccf28600f9bcad7f4d9ad74a5c6d916a4e95c6af050b835599 |
| [security.json](../benchmarks/browser-poc/results/security.json) | eb7bc5efc161d9ae180f39d8c85b4b580feee1b50267e0868b02238b5e0f224b |
| [sources.json](../benchmarks/browser-poc/sources.json) | 48370c92777310acbb02524ae96bbccec7fb4f1581478118078b2914a4ff8eda |

SHA-256 powyżej dotyczy bajtów pliku, w tym skompresowanych bajtów `.gz`. Nie należy mylić go z zawartym w starszych metrykach hashem nieskompresowanego trace. Finalne kopie `artifacts/final-*.json` odpowiadają danym `results/final-*.json`; każde uruchomienie liczone raz. Archiwum diagnostyk zawiera 14 nazwanych dokumentów, wraz ze wszystkimi 7 kontrolami Stop.

Materiały wizualne: [Flights w PoC](../benchmarks/browser-poc/results/flights-ultrafast.png) · [Flights we wcześniejszej aplikacji](../../docs/benchmarks/jev-openrouter-flights-result-2026-09-17.png). Komendy odtworzenia są w [README](../benchmarks/browser-poc/README.md) i starszych raportach; reprodukcja wymaga działających dostawców i istniejących bezpiecznie zapisanych poświadczeń. Kluczy API nie umieszczamy w raporcie.


<a id="auto"></a>

## Jev Auto — wdrożenie i końcowe porównanie

**Porównanie zakończone: 119/119 poprawnych prób w zadeklarowanej próbce.** Gemini wybiera szybką pętlę Jev lub planowane grupy akcji w tej samej aplikacji. Zachowano UX, sesję, uprawnienia, dowody i Stop. Nowy tryb pozostaje eksperymentalny; domyślny Classic i main nie zostały zmienione.

**Wniosek architektoniczny:** warto zachować obecną aplikację i dobierać wykonanie do podzadania. Auto wyraźnie przyspieszyło długie formularze i porównania ofert. Nie uzyskuje najlepszego czasu w każdej kategorii; native Ultrafast i prostszy First nadal są ważnymi punktami odniesienia. Wyniki nie uzasadniają pełnej migracji aplikacji do Browser Use.

Formularz 10-etapowy: **26,14 s Auto / 74,49 s First / 40,21 s Browser Use**, każdy 3/3. Formularz 6-etapowy: 13,35 / 30,08 / 24,28 s. Hotel: 4,71 / 12,26 / 8,99 s. Nowe dane także zostały zmierzone: 27/27 sukcesów. Auto przyspieszyło nowy formularz i nowe porównanie cen; przy prostych zadaniach wyniki są mieszane. To pomiar pełnych wariantów, nie osobna ablacja batchowania, promptu, progu confidence i kontroli elementów.

### Google Flights: mediana i koszt wolnych prób

| Silnik | Sukcesy | Mediana s | Min–max s | Średnia wszystkich prób s | Koszt 5 prób USD |
|---|---:|---:|---:|---:|---:|
| app-auto | 5/5 | 21.79 | 17.83–64.02 | 30.11 | 0.359967 |
| app-first | 5/5 | 36.82 | 27.20–45.18 | 37.65 | 0.754658 |
| browser-use | 5/5 | 35.45 | 35.14–39.09 | 36.53 | 0.226265 |
| ultrafast | 5/5 | 13.32 | 11.70–14.38 | 13.25 | 0.024067 |

Pierwsza próba Auto trwała **64,02 s**: Jev zgłosił `uncertain_operation` po dwóch akcjach, więc zadanie ukończył Gemini (26 wywołań; 59,28 s głównego modelu, 1,78 s Jev). Wynik pozostał w próbie. Poprawny fallback chroni ukończenie zadania, ale może wyraźnie zwiększać czas i koszt. Piloty 18,65/18,90 s nie zastępują tej finalnej serii.

### Co dokładnie jest liczone

Próbka główna: 54 kompletne próby pierwszych sześciu grup z `final-local.json`, 18 prób **całego** wznowionego bloku research/kart z `final-recovery.json`, 27 nowych wariantów i 20 Flights. Dobór tego wznowionego bloku ustalono przed jego uruchomieniem. Pozostałe 18 rekordów pierwotnego research/kart — **4 sukcesy i 14 błędów kredytów** — zachowano jako osobny przerwany blok; nie usuwamy samych porażek i nie dokładamy samych sukcesów do median wznowienia.

Wszystkie zachowane rekordy Auto: **159 prób runnera**, **78 decyzji routingu**, **10 kontroli desktopu**. Tabele zawierają także piloty, celowy Stop i sprawdzenie 402. Koszt runner/routing: **$4.783456077**; desktop: **$0.102326586**; razem **$4.885782663**, wyłącznie ten etap Auto. Usage po przerwaniu może być niepełne. Nie należy sumować kopii danych i archiwów drugi raz.

Odczyt konta po doładowaniu potwierdził dostępne środki, a hashe kompilatów zgodność z zamrożoną aplikacją. Nie zmieniano promptów, modeli, progu ani kodu aplikacji między blokami. Jedyna wcześniejsza zmiana runnera po zamrożeniu to zatrzymanie na 401/402 (`69e3280`). Nie wpływa na poprawne wykonania. Oba warianty aplikacji używają wspólnej naprawy schematu OpenRouter.

Końcowy retest routingu: **13/16** standardowych i **6/6** nowych poleceń; **20/20** zaproponowanych wywołań ma poprawny schemat argumentów. W pierwszym reteście 2 przypadki nie dostały odpowiedzi z powodu HTTP 429, a w jednym Gemini wybrał dozwolone `browser_observe` dla nowej karty zamiast oczekiwanego fast. Osobna powtórka wyłącznie dwóch przypadków 429 dała 2/2 poprawne decyzje i argumenty; oryginalne błędy pozostają w tabelach. Nie zmieniano oczekiwanej kategorii nowej karty, więc odchylenie routingu pozostaje jawne. Jest to ocena wyboru ścieżki i formatu, nie poprawności wykonania ani całej polityki bezpieczeństwa. W 38 próbach Auto pierwsza ścieżka była fast 20 razy, planned 18 razy; zmiana ścieżki wystąpiła w 6 przebiegach. Routing korzysta z normalnej odpowiedzi planisty, bez osobnego wywołania klasyfikatora; nie zmierzono jego czystego narzutu osobną ablacją.

[Wykres PNG](../../docs/benchmarks/jev-auto/comparison.png) · [Wykres SVG](../../docs/benchmarks/jev-auto/comparison.svg). Pokazują mediany i zakres min–max, z osobną skalą każdego panelu.

18 września 2026. Implementacja w osobnym worktree `/home/bartek/linux-agent-auto`, branch `experiment/jev-auto`. [Uruchomienie i architektura](../../docs/jev-auto.md), [plan i bramki](../../docs/jev-auto-plan.md). Poniżej oddzielono zamrożone porównanie od pilotów, routingu i testów aplikacji.

### Metoda

Kod aplikacji zamrożony na `0ea227b271dbc71b5dc7d503a4a4438e3141c361`; każdy plik serii zawiera rewizję, `dirty`, SHA-256 runnera, fixture’ów i kompilatów. Baseline First: `77846cb0d97af218dd8a2832dab9f488c703b210`. Oba warianty aplikacji korzystają z **tego samego poprawionego adaptera OpenRouter**; First zachowuje bazowy kontroler, narzędzia i worker. Nie przypisujemy naprawy schematu tylko Auto. Native Browser Use/Ultrafast pochodzą z dotychczasowego, przypiętego PoC; nie są podłączone do polityki aplikacji.

Gemini `google/gemini-3.8-flash / low`, OpenRouter `google-ai-studio`, Jev `jev-1.13.0`. Ta sama wersja Chromium, viewport 1120×780, `en-US`, strefa `Europe/Zurich`, świeże profile, sekwencyjne wykonanie i rotacja kolejności silników. Nie prowadzono równolegle innych zadań modelowych ani suite testowej. Lokalny serwer fixture’ów; Flights na żywej stronie Google. Wyszukiwanie Zurich–London, 20 września 2026, one-way, jedna osoba, Economy; bez rezerwacji.

**Sukces wymaga ukończenia i niezależnej weryfikacji stanu strony**, a nie tylko deklaracji modelu. Formularze sprawdzają zapisane pola, porównania sprawdzają wybór i obliczoną kwotę, research wymaga wizyty na każdej z trzech stron. Weryfikator Flights sprawdza trasę, datę i rok, kierunek podróży, pasażerów, klasę i wyniki. Nowe warianty zostały sprawdzone deterministycznie wraz z negatywnymi przypadkami, a następnie odłożone do serii końcowej: cztery inne miasta i osoba, inne ceny i liczba nocy, Rome zamiast Paris. To nowe dane w znanych typach fixture’ów, **nie** dowód uogólnienia na nieznane witryny.

`taskMs` = praca agenta wraz z naprawami oraz niezależna weryfikacja. `setupMs` = uruchomienie drivera/przeglądarki, nawigacja, consent, pierwsza obserwacja. Screenshot i cleanup są poza czasem zadania. Uruchomienie całego Electron/Podman ma osobny test. Mediany dotyczą poprawnych prób, a porażki pozostają w mianowniku. Składniki czasu to średnie wszystkich prób danej grupy; adapter obejmuje transport i retry, nie samą inferencję. Pozostałe = czas zadania minus model i Jev, w tym narzędzia, oczekiwania i weryfikacja. Nie ma osobnego wywołania routera, ale nie zmierzono jego czystego narzutu przez ablację.

Kwoty to usage kosztu OpenRouter plus koszt Jev obliczony z tokenów wejściowych i skonfigurowanej stawki $0,042 / mln. Nie obejmują opłat infrastrukturalnych ani ewentualnych przerwanych zapytań bez zwróconego usage. Desktop ma osobne kontrole; eksport 10 przebiegów z nowej izolowanej bazy (`validation/desktop-usage.json`) wykazuje dodatkowe $0,102326586 zwróconego usage, w tym nieudane kontrole i Stop. Mała próbka 3 lub 5 powtórzeń nie dowodzi produkcyjnej niezawodności ani stabilnego rankingu opóźnień dostawcy.

### Etapy i wszystkie niepowodzenia przed zamrożeniem

1. Routing bez wykonania narzędzi: 12/16 → 15/16 → 16/16 po poprawieniu instrukcji wyboru w już otwartej stronie i wizardach. Następnie 6/6 nowych poleceń. Nie mylić z sukcesem zadania. Późniejszy audyt argumentów wykazał po 2 niepoprawne wywołania batch w każdej z trzech wcześniejszych serii routingu (JSON jako tekst); ich wynik 16/16 dotyczy wyłącznie wyboru ścieżki. Po poprawce schematu dodatkowy audyt 97 rzeczywistych wywołań `browser_task`/`browser_batch` w serii końcowej wykazał 0 niepoprawnych argumentów (`validation/final-arguments-audit.json`). Końcowy retest wykonano po doładowaniu; wynik podano wyżej.
2. Pierwszy pilot Auto ukończył 5/5 zadań, ale Flights wracało prawie całkowicie do Gemini: 41,02 s. Sam próg confidence 0,35 pogorszył kolejną próbę do 50,94 s.
3. Dokładniejsze podcele, wybór sugestii autocomplete, krótkie oczekiwania po edycji oraz mniejszy stan wejściowy Jev. Próba `pilot-context-v2` zakończyła się **FAIL** (18,33 s): niedokończona data, timeout zasłoniętej kontrolki i błąd transportu/dekodowania OpenRouter.
4. Oznaczanie zasłoniętych celów, ograniczony powrót po bezpiecznie odrzuconym stale ref, licznik kolejnych odrzuceń i kontrola zasłonięcia bezpośrednio przed dispatch. Piloty zachowują także wolną próbę 37,97 s. Końcowe dwa piloty Flights: 18,65 i 18,90 s, oba PASS, po 2 Gemini i 19 Jev. Nie użyto tych pilotów do finalnych median.
5. Poprawiono harness: osobno konfigurujemy oba egzemplarze Playwright z różnych worktree’ów; First używa własnego JevClient i workera. Wszystkie cztery silniki przeszły pilot wyszukiwania. Wcześniejsze piloty nie są identyczną konfiguracją finalną.
6. Dwa testy desktopu zaliczyły Auto i Stop, ale nie Classic po Stop. Gemini wysyłał `action` jako tekst zamiast obiektu. Konwerter schematu uwzględniał `anyOf`, a rzeczywiste narzędzie używało `oneOf`. Dodano jawny typ obiektu bez osłabiania walidacji i regresję na rzeczywistym schemacie. Powtórka zaliczyła nawigację Auto, Stop, Classic i follow-up. Zachowano oba nieudane wyniki.

### Walidacja aplikacji

- Pełna suite po poprawce: **452 PASS, 12 skip**; typecheck i build PASS. Poprzedni przebieg miał jeden niestabilny test terminala `idle_shell` podczas równoległego desktopu; powtórka pełnej suite bez tego obciążenia przeszła. Wcześniejszy taki sam przypadek i jego izolowana powtórka również są odnotowane. Nie zmieniano kodu terminala.
- Kontener: **4 PASS**. Obraz browser-worker `acdd06112e93b62d8909c13ddde4a42af8c029f4f31f0bfc3094d9c86829f044`, tag `8f78896`. Hostowa poprawka adaptera nie wymaga przebudowania workera.
- Desktop po poprawce: **4/4 PASS**, Auto → IANA 6,394 s, Stop **27 ms**, Classic po Stop i kontynuacja kontekstu. Brak błędów renderera i poziomego overflow w 1400×900 oraz 1024×768. To smoke, nie pełny audyt dostępności.
- Testy batch: zastąpiony lub zmieniony cel, zmiana kontekstu, brak efektu fill, częściowo wykonana operacja, odmowa approval, Stop/takeover pomiędzy akcjami, cykle pomimo nowych ref/revision. Zasłonięcie kontrolki przed dispatch odrzuca akcję. Każde dziecko nadal przechodzi normalną politykę.
- Audyt końcowy: 721 sprawdzonych plików/eksportów (w tym zdekompresowane archiwum), 0 trafień rzeczywistych kluczy; wcześniejsza kontrola objęła 8 procesów Chrome, także bez sekretów. Usunięto 4 własne kontenery desktop smoke, zachowując gotowy obraz i profil.
- Audyt rzeczywistych sekretów: skan plików, środowiska i argumentów Chrome oraz konfiguracji własnych kontenerów; wyniki w `security-audit.json`. Klucze nie są wypisywane. Nie jest to pełny pentest ani dowód odporności na każdy prompt injection.
- Obraz został zbudowany i działa w testach. Końcowa kontrola skryptu build zgłosiła istniejący wcześniej globalny limit storage Podmana: 22,40 GB przy limicie 14 GB (przed zadaniem ok. 22,34 GB). Nie usuwano cudzych obrazów. Jest to jawne ograniczenie środowiska przy kolejnej przebudowie, nie błąd wykonania aktualnego obrazu.

Końcowy audyt śladów wszystkich porównań: **193/194** wywołania task/batch zgodne ze schematem. Jedyny błąd to `wait` z `durationMs` zamiast `ms` w drugim Auto Flights. Runtime odmówił wykonania, model poprawił argument i ukończył zadanie. To nie błąd obiektowego `oneOf`; walidacja pozostała ścisła, a koszt naprawy jest w czasie próby.

Dodatkowy test z widoczną przeglądarką: search Auto **PASS, 3,927 s**. Celowy Stop na Flights po 2,5 s: stan stopped, zamknięcie przeglądarki **129,9 ms**, całe sprzątanie **139,1 ms**; `success=false` w tym rekordzie jest oczekiwane, bo zadanie zostało celowo przerwane. Niezależne testy jednostkowe obejmują również Stop podczas inferencji Jev i pomiędzy edycjami batcha. Skan po wznowieniu objął 1062 pliki/eksporty, a końcowy skan po przygotowaniu eksportów 1081: brak rzeczywistych kluczy. Runtime Chrome sprawdzano osobno wcześniej; końcowa kontrola potwierdziła brak pozostawionych własnych procesów.

### Dane i każda zachowana próba

[JSON-y, ślady i logi](../../docs/benchmarks/jev-auto) zawierają wszystkie serie. Eksporty usuwają identyfikatory konta dostawcy, zachowując pomiary; manifesty podają hashe. Pełna wcześniejsza historia jest w [zbiorczym archiwum](ALL-RESULTS.md).

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
