# Changelog

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
