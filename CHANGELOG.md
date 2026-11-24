# Changelog

## 1.2.0
- **Funktionsmenü** (Gitter-Symbol): alle Funktionen nach Kategorien, Tab „RECENT“ mit zuletzt benutzten, ohne 2nd erreichbar
- **Antippbare Zweitfunktionen:** die blauen Beschriftungen über den Tasten lösen die Funktion direkt aus
- **Zweitfunktionen:** komplexe Zahlen (`complex`), Matrizen A–C bis 4×4 (`matrix`), Vektoren 2D/3D (`vector`), `op` (Pol/Rec, Primfaktoren, Teiler, Division mit Rest) und `set op` (Mengen aus L1–L3)
- **Numerischer Löser:** Nullstellen nur bei nachgewiesenem Vorzeichenwechsel und über dem Rundungsrauschen bestätigt; Berührungen werden als „unbestätigt“ markiert, positive Minima und Polstellen sind keine Lösungen; Anzeige immer mit ≈
- **Graph-Analyse** (Enter im Graphen): Nullstellen, Minimum/Maximum, Schnittpunkte, y-Achsenabschnitt
- **Bedienung per Touch und Maus:** Menüs, Formulare, Buttons, Mode, Listen und Verlauf antippbar; Graph zieht, zoomt mit zwei Fingern und passt sich der Displaygröße an
- **Handy:** Oberfläche passt im Hochformat auf den Bildschirm (kein Scrollen), größeres Pfeilfeld
- **Sicherheit:** Zeitlimit für lange Rechnungen (`TIMEOUT`), Warnung ⚠ bei nicht gesicherter Integral-Konvergenz
- **Fehler behoben:** `√0` wurde als „√0“ statt 0 angezeigt; Display-Menüs waren im Dunkelmodus kaum lesbar
- Browser-Tests (End-to-End) in der CI, neue Screenshots und überarbeitete READMEs

## 1.1.0
- **Graphenmodus (F2):** bis zu drei Funktionen, Zoom, Verschieben, Trace; Polstellen und Definitionslücken werden nicht verbunden
- **Engineering (F3):** Elektrotechnik mit SI-Präfixen und Einheitenprüfung (Ohm, Spannungsteiler, Reihen-RLC)
- **Hauptmenü** (Wissenschaftlich, Graph, Engineering, Einstellungen)
- **Rechenkern:** numerisch stabile quadratische Gleichung, Doppelnullstellen werden gefunden, Polstellen sind keine Nullstellen, Grenzen für Ausdruckslänge und Verschachtelung
- Rückgängig/Wiederholen (Strg+Z / Strg+Y)
- Barrierefreiheit: beschriftete Tasten, Ansage der Ergebnisse, Touch-Ziele ≥ 44 px, reduzierte Bewegung
- Neues Logo, Manifest mit maskable Icon; Einzeldatei-Build (`npm run build:standalone`), Release-Workflow
- Abnahmetests aus der Projektvision, Dokumentation (`docs/`)

## 1.0.0
- Erste Version: exakte Arithmetik, MathPrint-Eingabe, Statistik, Löser, Zahlensysteme
- Modernes Design (hell/dunkel), Hilfe und Einstellungen hinter dem ?-Knopf
- Rechnung als Link teilen, Verlauf als CSV exportieren
- PWA (offline, installierbar), Deutsch/Englisch, Grössenwahl, Vibration
- Build-Skript, Rechentests, CI und GitHub-Pages-Workflow
