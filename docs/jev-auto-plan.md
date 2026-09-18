# Jev Auto: plan wdrożenia i bramki decyzyjne

Cel z 18 września 2026: działająca hybryda w obecnej aplikacji, sprawdzona etapami. Osobny worktree `/home/bartek/linux-agent-auto`, branch `experiment/jev-auto`, baseline `77846cb`. Zachowujemy dotychczasowe UI, RunController, jedną sesję, politykę każdej akcji i Stop. Nie zmieniamy main ani baseline’u Jev First. Poprzednie wyniki: [pełne archiwum](../../linux-agent-browser-poc/WSZYSTKIE-WYNIKI-TESTOW.md).

## Hipotezy wynikające z pomiarów

- Flights i proste UI: koszt ogranicza liczba wizyt u głównego modelu. Krótkie cele z wartościami może wykonywać Jev bez analizy Gemini po każdym kliknięciu.
- Długie formularze: potrzebne jest grupowanie działań i wartości pochodzące z planu. Browser Use wygrywał przy 11 wywołaniach Gemini wobec 20 helperów Ultrafast i 42–43 wywołań obecnej aplikacji.
- Analiza: Gemini czyta, pamięta i liczy; nie delegujemy nierozstrzygniętego porównania samej pętli Jev. W finalnym PoC Ultrafast przegrał wszystkie sześć takich prób.
- Brak postępu i nowe karty: kontrolowany powrót do planisty zamiast wielokrotnego powtarzania działań. Confidence nie jest weryfikatorem wyniku.

## Implementacja

1. Nowy wybieralny tryb `jev-auto`, bez zmiany zachowania Classic/Hybrid/First. Wyboru wykonawcy dokonuje główny model przez wybór narzędzia podczas normalnego planowania, bez osobnego płatnego klasyfikatora.
2. `browser_task`: krótki cel mechaniczny, adres opcjonalny i dokładne niesekretne wartości. Szybka pętla Jev z historią semantyczną, ograniczonym budżetem, wykrywaniem cykli niezależnie od numerów obserwacji i świeżymi dowodami po zakończeniu. Zachować sprawdzanie celu przed wykonaniem.
3. `browser_batch`: ograniczona sekwencja działań zaplanowana na podstawie jednej obserwacji. Każda akcja otrzymuje świeżą obserwację, sprawdzenie zgodności celu/kontekstu, indywidualną autoryzację i zapis w dzienniku. Sekwencja kończy się przy zmianie strony, błędzie, odmowie, przejęciu przez człowieka lub niepewnym wyniku; nie powtarza wykonanych akcji. Wartości ustala model z polecenia lub przeczytanych danych, nie skrypt z odpowiedziami benchmarku.
4. Odczyty i analiza pozostają u planisty. Przejścia między fast/planned są zdarzeniami dziennika, możliwymi do zmierzenia. Jedna sesja przeglądarki i brak równoległych wykonawców.
5. Browser Use pozostaje trzecim eksperymentalnym punktem odniesienia w istniejącym PoC. Pełne podłączenie do aplikacji jest warunkowe: musi dawać korzyść, której nie osiąga bezpieczny batch, oraz respektować obecną politykę akcji. Nie wystawiamy użytkownikowi niedziałającego wyboru Browser Use.

## Etapy i kryteria

### A. Kontrakty i bezpieczeństwo — przed płatnym wykonaniem

Testy routera/narzędzi: zadanie mechaniczne kontra analiza, wartości i wybór narzędzia, brak skryptów lub sekretów. Testy wykonania: nieaktualny ref, zmieniony cel, zmiana strony/karty, cykle A–B–A mimo zmiany ref/revision, brak postępu, częściowo wykonany batch, odmowa approval, Stop w trakcie inferencji i pomiędzy akcjami, takeover i pauza budżetu. Każda mutacja przechodzi normalną politykę. Porażka blokuje dalszy etap.

### B. Test decyzji Gemini i małe piloty

Najpierw płatne odpowiedzi na zróżnicowane polecenia bez wykonywania narzędzi: sprawdzić wybór fast/planned/read i brak utraty wartości. Oczekiwane kategorie opisane przed uruchomieniem. Niezgodne decyzje zachować, przeanalizować; nie udawać, że klasyfikacja dowodzi poprawności całego zadania.

Następnie po jednym zadaniu search, formularz, analiza, karty i Flights z niezależnymi weryfikatorami. Zachować wszystkie piloty i poprawki. Nie osłabiać walidacji w celu uzyskania dobrego czasu. Jeżeli szybka ścieżka ciągle wraca do LLM, sprawdzić przyczynę w śladzie przed rozszerzeniem benchmarku.

### C. Zamrożone porównanie

Zamrozić kod i zestaw zadań przed serią. Porównać Auto z niezmienionym First + Gemini oraz Ultrafast/Browser Use na wspólnej przeglądarce i zegarze. Co najmniej trzy powtórzenia lokalnych zadań różnych typów i pięć Flights na świeżych profilach; rotacja kolejności, sekwencyjne wykonanie. Dołączyć nowe warianty danych/zadań niewykorzystywane przy dostrajaniu. Jeśli koszt lub czas wymusi redukcję, jawnie opisać liczność i ograniczenia.

Sukces = zakończenie + niezależnie poprawny wynik. Wszystkie błędy pozostają w danych. Osobno: setup, czas zadania z weryfikacją, model główny, Jev, reszta, liczby wywołań, tryby i przełączenia, koszt. Wybór trybu jest częścią odpowiedzi planisty: nie nazywać całego czasu tej odpowiedzi czystym narzutem routera. Mała próbka nie dowodzi równej niezawodności.

Cel praktyczny: wyraźny zysk (~30% mediany) na mechanicznych lub długich zadaniach, zachowana obserwowana poprawność analizy. Jeśli hipoteza zawiedzie, nie promować Auto jako domyślnego i zapisać ograniczenia; nie porzucać naprawialnej implementacji bez diagnostyki.

### D. Gotowość aplikacji i przekazanie

Typecheck/build, pełna suite, headful, realny desktop/container smoke z nowym wyborem, Stop i Classic po Stop. Potwierdzić izolację kluczy i brak pozostawionych procesów. Raport porównań, instrukcja uruchomienia, rewizje i osobne źródła wszystkich prób. Nowy tryb eksperymentalny, bez automatycznego przestawiania preferencji użytkownika na nieudowodniony wariant.

## Granice i koszt

Gemini `google/gemini-3.8-flash / low`, OpenRouter `google-ai-studio`; Jev `jev-1.13.0`. Bez Mercury i eskalacji modelu. Zachowane klucze pobierane z OS keyring tylko do pamięci hosta, nigdy do repo, argumentów komend lub środowiska Chrome. Dedykowane profile i dozwolone domeny. Początkowy limit wykonawczy nowych eksperymentów: $15 raportowanego usage, $1 na próbę, 240 s na zadanie; koszty przerwanych zapytań mogą nie wrócić w usage. To nie budżet tokenów celu.
