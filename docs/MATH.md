# Mathematik in Exakto

Dieses Dokument beschreibt, wie Exakto rechnet. Es hält nur fest, was im Code umgesetzt und getestet ist (`tests/`).

## Zahlen

- **Exakt:** Brüche (BigInt-Zähler/-Nenner, gekürzt, Nenner positiv), vereinfachte Wurzeln `n/d · √r`, Vielfache von π. Ganzzahl- und Bruch-Eingaben bleiben exakt.
- **Näherung (≈):** Dezimaleingaben wie `0.1` werden als Gleitkommazahl gespeichert und beim Anzeigen sauber gerundet (`0.1 + 0.2` zeigt `0.3`). Mit `◀▶≈` wechselst du zwischen exakter und dezimaler Anzeige.
- **Grenzen:** Beträge über 1E100 melden `OVERFLOW`. Ausdrücke mit mehr als 2000 Tokens oder extremer Verschachtelung melden `TOO COMPLEX`. So kann ein Ausdruck das Programm nicht aufhängen.

## Rangfolge

1. Klammern, Brüche, Wurzeln, Betrag
2. Potenz `^` – **rechtsassoziativ**: `2^3^2 = 512`
3. Negatives Vorzeichen steht **unter** der Potenz: `−2^2 = −4`, `(−2)^2 = 4`
4. Postfix: `!`, `%`, `°`, Basisumwandlungen
5. Multiplikation, Division und **implizite Multiplikation** gleichrangig, von links nach rechts: `6÷2(1+2) = 9`, `1÷2(3) = 3/2`
6. Addition, Subtraktion

## Winkel

DEG, RAD und GRAD gelten für Rechner **und** Graph gemeinsam (Anzeige oben rechts im Display). Bei Vielfachen von 30° und 45° liefert DEG exakte Werte (`sin 60° = √3/2`, `sin 180° = 0`); `tan 90°` meldet `DOMAIN`.

## Definitionsbereich

`1÷0` meldet `DIVIDE BY 0`, `√(−1)` meldet `NONREAL ANSWER` (komplexe Zahlen sind noch nicht enthalten).

## Löser

- **Quadratisch:** numerisch stabil (`q = −½(b + sgn(b)√D)`, `x₁ = q/a`, `x₂ = c/q`). Exakte Wurzeln bei rationaler Diskriminante, komplexe Wurzeln werden angezeigt.
- **Kubisch, 2×2/3×3-Systeme:** exakt, wenn die Koeffizienten exakt sind.
- **Numerische Nullstellen:** Abtastung mit Vorzeichenwechsel plus Bisektion; Residuum und Polstellen werden geprüft (`1/(x−a)` hat keine Nullstelle). Nullstellen gerader Vielfachheit (`(x−a)²`) werden über lokale Minima von |f| gefunden. **Kein endliches Raster garantiert alle Nullstellen.**
- **Integral/Ableitung:** adaptive Gauss-Kronrod-Integration bzw. Ridders-Verfahren; Ergebnisse sind Näherungen.

## Graph

Bis zu drei Funktionen `y = f(x)`. Die Kurve wird getrennt an nicht definierten Stellen und an Polstellen oder Sprüngen (`1/x`, `tan x`). Stark oszillierende Funktionen können bei zu geringer Auflösung irreführen (400 Stützstellen pro Funktion, begrenztes Budget). Trace-Werte sind Näherungen (≈).

## Engineering (Elektrotechnik)

Alle Werte sind Gleitkommazahlen und als Näherung gekennzeichnet. SI-Präfixe `f p n µ m k M G T` (Gross-/Kleinschreibung zählt; `u` ist Alias für µ). Die erwartete Einheit je Feld wird geprüft: `5 A` in einem Spannungsfeld meldet einen Einheitenfehler. Eine Einheitenrechnung im Hauptrechner gibt es nicht.
