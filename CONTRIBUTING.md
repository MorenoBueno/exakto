# Beitragen

Danke für dein Interesse an Exakto!

1. Issue eröffnen und das Problem mit einem **reproduzierbaren Beispiel** beschreiben (Eingabe, erwartetes und tatsächliches Ergebnis).
2. Repository forken, Branch anlegen.
3. `npm ci` und `npm test` ausführen. Jede Änderung an der Mathematik braucht einen Testfall in `tests/unit/`. Für Näherungen gilt `|Ist − Soll| ≤ atol + rtol·|Soll|`; Toleranzen begründen.
4. Pull Request senden. Die CI führt Tests und Builds aus; veröffentlicht wird nur nach Merge auf `main`.

Regeln: kein `eval`, keine Laufzeit-Abhängigkeiten, keine Netzwerkzugriffe im Kern. Fremden Code, Schriften und Icons nur mit passender Lizenz übernehmen.
