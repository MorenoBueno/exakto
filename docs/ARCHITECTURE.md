# Architektur

Eine Engine, zwei Ausgaben: `npm run build` erzeugt die Website (`dist/`), `npm run build:standalone` die Einzeldatei (`release/exakto.html`).

| Datei | Aufgabe |
|---|---|
| `src/num.js` | Zahlentyp (exakt/Gleitkomma), Arithmetik, Formatierung |
| `src/parse.js` | Parser (kein `eval`), Funktionen, Verteilungen, Integral/Ableitung |
| `src/editor.js` | Strukturierter Editor, Statistik, Löser |
| `src/graphcore.js` | Kurvenabtastung, Gitterweite, Fenster-Anpassung (reine Logik) |
| `src/eng.js` | SI-Präfixe, Einheitenprüfung, Elektrotechnik (reine Logik) |
| `src/linalg.js` | Komplexe Zahlen, Matrizen, Vektoren, Mengenoperationen (reine Logik) |
| `src/ui1.js` / `src/ui2.js` / `src/ui3.js` | Display, Tasten, Menüs, Bildschirme, Tastatur/Touch; ui3: Komplex/Matrix/Vektor-Bildschirme |
| `src/fmenu.js` | Funktionsmenü (Gitter-Symbol): Kategorien und „zuletzt benutzt“ |
| `src/graph.js` | Graph-Bildschirm (SVG im Display) |
| `src/tools.js` | Engineering-Panel, Schnellwechsel (F2/F3) |
| `tests/e2e/run.mjs` | Browser-Tests (Playwright) gegen `release/exakto.html` |
| `src/settings.js` | Einstellungen, Teilen-Link, CSV-Export, Service Worker |
| `public/` | Manifest, Service Worker, Icons |
| `tests/unit` | Rechentests (Node, ohne Abhängigkeiten) |

`num.js`, `parse.js`, `editor.js`, `graphcore.js` und `eng.js` kommen ohne DOM aus und werden von den Tests direkt geladen (`dist/core.cjs`).

## Eingabe ist Text, nie Code

Ausdrücke sind Token-Listen und werden von einem eigenen Parser ausgewertet. Es gibt kein `eval()` und kein `new Function()` auf Nutzereingaben. Exportierte Ausdrücke sind reiner Text. Der Link zum Teilen enthält nur die Tokens und wird beim Laden streng geprüft (nur Strings, begrenzte Länge).

## Offline

`public/sw.js` lädt beim Installieren alle Dateien in einen versionierten Cache (`exakto-v2`) und entfernt alte eigene Caches. Er wird nur unter `http(s)` registriert; die Einzeldatei läuft ohne Service Worker.

## Noch nicht umgesetzt

Berechnungen laufen im Hauptthread (Web Worker ist offen); Schutz bieten die Grenzen für Tokenzahl, Verschachtelung und Zahlengrösse.
