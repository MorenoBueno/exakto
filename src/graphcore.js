/* ===== graphcore.js : Kurvenabtastung (reine Logik, ohne Oberflaeche) ===== */
/* Zeichenbare Funktion aus Tokens: x -> Zahl oder NaN (Fehler, nicht reell, Ueberlauf) */
function curveFn(tokens) {
  const ast = compileTokens(tokens);
  return x => { try { const n = toNum(evalAst(ast, { x: F(x) })); return Number.isFinite(n) ? n : NaN; } catch (e) { return NaN; } };
}
/* "schoene" Gitterweite (1, 2, 5 x 10^k) */
function niceStep(range, target) {
  const raw = Math.abs(range) / (target || 8); if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
/* Tastet f auf [xmin,xmax] ab. Gibt Polylinien zurueck; getrennt wird an nicht definierten Stellen
   und an Polstellen/Spruengen (grosser Sprung, der das Fenster ueberbrueckt oder das Vorzeichen wechselt). */
function sampleCurve(f, xmin, xmax, ymin, ymax, n) {
  const segs = []; let cur = []; let py = NaN; const yr = ymax - ymin;
  for (let i = 0; i <= n; i++) {
    const x = xmin + (xmax - xmin) * i / n, y = f(x);
    if (!Number.isFinite(y)) { if (cur.length > 1) segs.push(cur); cur = []; py = NaN; continue; }
    if (Number.isFinite(py) && Math.abs(y - py) > 2 * yr && (Math.sign(py) !== Math.sign(y) || (py > ymax && y < ymin) || (py < ymin && y > ymax))) {
      if (cur.length > 1) segs.push(cur); cur = [];
    }
    cur.push([x, y]); py = y;
  }
  if (cur.length > 1) segs.push(cur);
  return segs;
}
/* y-Bereich passend zu den Funktionswerten waehlen (ohne Ausreisser) */
function fitY(fs, xmin, xmax) {
  const ys = [];
  for (const f of fs) for (let i = 0; i <= 200; i++) { const y = f(xmin + (xmax - xmin) * i / 200); if (Number.isFinite(y) && Math.abs(y) < 1e6) ys.push(y); }
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  let lo = ys[Math.floor(ys.length * 0.02)], hi = ys[Math.ceil(ys.length * 0.98) - 1];
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const m = (hi - lo) * 0.12; return [lo - m, hi + m];
}
