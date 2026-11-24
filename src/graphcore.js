/* ===== graphcore.js : Kurvenabtastung (reine Logik, ohne Oberflaeche) ===== */
/* Zeichenbare Funktion aus Tokens: x -> Zahl oder NaN (Fehler, nicht reell, Ueberlauf) */
function curveFn(tokens) {
  const ast = compileTokens(tokens);
  return x => { try { const n = toNum(evalAst(ast, { x: F(x) })); return Number.isFinite(n) ? n : NaN; } catch (e) { if (e && e.code === 'TIMEOUT') throw e; return NaN; } };
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

/* ---------- Graph-Analyse im sichtbaren Fenster [lo, hi] ---------- */
const AN_N = 1600;
/* Nullstellen von f: Liste {x, confirmed} (unbestaetigt = Beruehrung ohne nachweisbaren Vorzeichenwechsel) */
function curveRoots(f, lo, hi) { return findRoots(f, { lo, hi }).filter(r => r.x >= lo && r.x <= hi).map(r => ({ x: r.x, y: 0, confirmed: r.confirmed })); }
/* Schnittpunkte von f und g; identical = Kurven stimmen im Fenster ueberein */
function curveIntersections(f, g, lo, hi) {
  let same = 0, tot = 0;
  for (let i = 0; i <= 200; i++) { const x = lo + (hi - lo) * i / 200, a = f(x), b = g(x); if (Number.isFinite(a) && Number.isFinite(b)) { tot++; if (Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b))) same++; } }
  if (tot >= 20 && same >= 0.98 * tot) return { identical: true, pts: [] };
  const d = x => { const a = f(x), b = g(x); return Number.isFinite(a) && Number.isFinite(b) ? a - b : NaN; };
  const pts = findRoots(d, { lo, hi }).filter(r => r.x >= lo && r.x <= hi).map(r => ({ x: r.x, y: f(r.x), confirmed: r.confirmed }));
  return { identical: false, pts };
}
/* Lokale Minima/Maxima im Fenster. Polstellen und Spruenge werden verworfen (Glattheitspruefung). */
function curveExtrema(f, lo, hi) {
  const xs = [], ys = [];
  for (let i = 0; i <= AN_N; i++) { const x = lo + (hi - lo) * i / AN_N; xs.push(x); ys.push(f(x)); }
  const fin = ys.filter(Number.isFinite).sort((a, b) => a - b);
  if (fin.length < 10) return { min: [], max: [] };
  const q = p => fin[Math.min(fin.length - 1, Math.floor(p * (fin.length - 1)))];
  const rng = Math.max(q(0.95) - q(0.05), 1e-12), h = (hi - lo) / AN_N;
  const out = { min: [], max: [] };
  const refine = (a, b, sgn) => { // Goldener Schnitt auf sgn*f (sgn=1: Minimum)
    for (let k = 0; k < 100; k++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (sgn * f(m1) < sgn * f(m2)) b = m2; else a = m1; }
    return (a + b) / 2;
  };
  for (let i = 1; i < AN_N; i++) {
    const a = ys[i - 1], b = ys[i], c = ys[i + 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) continue;
    const isMin = b < a && b <= c, isMax = b > a && b >= c;
    if (!isMin && !isMax) continue;
    const sgn = isMin ? 1 : -1, x0 = refine(xs[i - 1], xs[i + 1], sgn), y0 = f(x0);
    if (!Number.isFinite(y0)) continue;
    // Glattheit: in der Naehe darf f sich nicht sprunghaft aendern (sonst Polstelle/Sprung)
    const dl = f(x0 - 2 * h), dr = f(x0 + 2 * h);
    if (!Number.isFinite(dl) || !Number.isFinite(dr) || Math.abs(dl - y0) > 0.25 * rng || Math.abs(dr - y0) > 0.25 * rng) continue;
    // Muss tatsaechlich Extremum sein (nicht nur Rauschen auf einer Geraden): beidseits mindestens so gross/klein
    if (isMin ? !(dl >= y0 - 1e-12 * rng && dr >= y0 - 1e-12 * rng) : !(dl <= y0 + 1e-12 * rng && dr <= y0 + 1e-12 * rng)) continue;
    if (Math.abs(dl - y0) < 1e-9 * rng && Math.abs(dr - y0) < 1e-9 * rng) continue; // flach (Konstante/Plateau)
    const list = isMin ? out.min : out.max;
    if (!list.some(p => Math.abs(p.x - x0) < 4 * h)) list.push({ x: x0, y: y0 });
  }
  out.min.sort((p, q2) => p.x - q2.x); out.max.sort((p, q2) => p.x - q2.x);
  return out;
}
