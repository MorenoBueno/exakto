const C = require('../../dist/core.cjs');
let pass = 0, fail = 0;
const eq = (n, g, w) => { if (g === w) pass++; else { fail++; console.log('FAIL', n, 'got', JSON.stringify(g), 'want', JSON.stringify(w)); } };
const near = (n, g, w, tol = 1e-6) => { if (Math.abs(g - w) <= tol * Math.max(1, Math.abs(w))) pass++; else { fail++; console.log('FAIL', n, g, w); } };
const code = f => { try { f(); return 'no error'; } catch (e) { return e.code || String(e); } };
const xs = a => a.map(p => p.x);
const E = (ms, ...rest) => rest;
const fm = (tokens) => C.curveFn(tokens);
// Nullstellen im Fenster
{ const r = C.curveRoots(x => x * x - 4, -10, 10); eq('x²-4 Anzahl', r.length, 2); near('x²-4 a', r[0].x, -2); near('x²-4 b', r[1].x, 2); eq('bestaetigt', r.every(p => p.confirmed), true); }
{ const r = C.curveRoots(Math.sin, 0.5, 10); eq('sin Anzahl', r.length, 3); near('π', r[0].x, Math.PI); near('3π', r[2].x, 3 * Math.PI); }
{ const r = C.curveRoots(x => x * x - 4, -1, 1); eq('keine Nullstelle im Fenster', r.length, 0); }
{ const r = C.curveRoots(x => (x - 0.5) * (x - 0.5002), 0.4, 0.6); eq('dicht benachbarte (Fenster-Raster)', r.filter(p => p.confirmed).length, 2); }
{ const r = C.curveRoots(x => 1 / (x - 1), -5, 5); eq('Polstelle keine Nullstelle', r.length, 0); }
{ const r = C.curveRoots(x => (x - 1) * (x - 1), -5, 5); eq('doppelte NS unbestaetigt', r.length === 1 && !r[0].confirmed, true); }
// Extrema
{ const e = C.curveExtrema(x => x * x * x - 3 * x, -3, 3); eq('x³-3x max', e.max.length, 1); near('max x', e.max[0].x, -1); near('max y', e.max[0].y, 2); eq('min', e.min.length, 1); near('min x', e.min[0].x, 1); near('min y', e.min[0].y, -2); }
{ const e = C.curveExtrema(x => x * x, -5, 5); eq('x² min 1', e.min.length, 1); near('x² min x', e.min[0].x, 0); eq('x² max 0', e.max.length, 0); }
{ const e = C.curveExtrema(Math.abs, -2, 2); eq('|x| Spitze', e.min.length, 1); near('|x| x', e.min[0].x, 0, 1e-6); }
{ const e = C.curveExtrema(Math.sin, 0, 7); eq('sin max', e.max.length, 1); near('sin max x', e.max[0].x, Math.PI / 2); eq('sin min', e.min.length, 1); near('sin min x', e.min[0].x, 3 * Math.PI / 2); }
{ const e = C.curveExtrema(x => 1 / x, -5, 5); eq('1/x keine Extrema', e.min.length + e.max.length, 0); }
{ const e = C.curveExtrema(Math.tan, -1.5, 4.5); eq('tan keine Extrema', e.min.length + e.max.length, 0); }
{ const e = C.curveExtrema(x => 3, -5, 5); eq('Konstante keine Extrema', e.min.length + e.max.length, 0); }
{ const e = C.curveExtrema(x => 2 * x + 1, -5, 5); eq('Gerade keine Extrema', e.min.length + e.max.length, 0); }
{ const e = C.curveExtrema(x => (x < 0 ? -1 : 1), -5, 5); eq('Sprung keine Extrema', e.min.length + e.max.length, 0); }
{ const e = C.curveExtrema(x => Math.sin(x) / x, 0.1, 30); eq('sinc Extrema (>=8)', e.min.length + e.max.length >= 8, true); }
{ const e = C.curveExtrema(x => Math.sqrt(x), -5, 5); eq('√x nur halbseitig, kein Extremum', e.min.length + e.max.length, 0); }
// Schnittpunkte
{ const r = C.curveIntersections(x => x * x, x => x + 2, -5, 5); eq('x² ∩ x+2', r.pts.length, 2); near('a', r.pts[0].x, -1); near('b', r.pts[1].x, 2); near('y', r.pts[1].y, 4); }
{ const r = C.curveIntersections(x => x, x => x, -5, 5); eq('identisch', r.identical, true); }
{ const r = C.curveIntersections(x => x, x => x + 1, -5, 5); eq('parallel', r.pts.length, 0); eq('parallel nicht identisch', r.identical, false); }
{ const r = C.curveIntersections(x => x * x, x => 0, -5, 5); eq('Beruehrung unbestaetigt', r.pts.length === 1 && !r.pts[0].confirmed, true); }
{ const r = C.curveIntersections(Math.sin, Math.cos, 0, 7); eq('sin ∩ cos', r.pts.length, 2); near('π/4', r.pts[0].x, Math.PI / 4); near('5π/4', r.pts[1].x, 5 * Math.PI / 4); }
// Integral-Warnung
{ const T = (b, lo, hi) => ['{int', ...b, '|int', 'x', '|int', ...lo, '|int', ...hi, '}int'];
  eq('∫x² keine Warnung', !!C.evalTokens(T(['x', '×', 'x'], ['0'], ['1'])).warn, false);
  eq('∫1/x 0..1 Warnung', !!C.evalTokens(T(['1', '÷', 'x'], ['0'], ['1'])).warn, true);
  eq('∫1/√x 0..1 ≈2 keine Warnung', !!C.evalTokens(T(['1', '÷', '{sqrt', 'x', '}sqrt'], ['0'], ['1'])).warn, false);
  near('∫1/√x Wert', C.toNum(C.evalTokens(T(['1', '÷', '{sqrt', 'x', '}sqrt'], ['0'], ['1']))), 2, 1e-6);
  eq('∫sin(1/x) Warnung', !!C.evalTokens(T(['sin(', '1', '÷', 'x', ')'], ['0'], ['1'])).warn, true);
  eq('Warnung im Text', C.fmtText(C.evalTokens(T(['1', '÷', 'x'], ['0'], ['1']))).includes('⚠'), true);
  eq('∫ ln x = -1', C.fmtText(C.evalTokens(T(['ln(', 'x', ')'], ['0'], ['1']))), '−1');
  eq('∫ Pol -> Fehler', code(() => C.evalTokens(T(['1', '÷', 'x'], ['-', '1'], ['1']))), 'DIVIDE BY 0'); }
// Zeitlimit
{ const S3 = (b, v, hi) => ['{sum', ...b, '|sum', v, '|sum', '1', '|sum', ...hi, '}sum'];
  const t0 = Date.now(); eq('3fach verschachtelte Summe -> TIMEOUT', code(() => C.evalTokens(S3(S3(S3(['1'], 'x', ['1', '0', '0', '0']), 'y', ['1', '0', '0', '0']), 'z', ['1', '0', '0', '0']))), 'TIMEOUT');
  eq('Abbruch nach < 9 s', Date.now() - t0 < 9000, true);
  eq('danach wieder normal', C.fmtText(C.evalTokens(['1', '+', '1'])), '2');
  eq('Σ 1e5 ok', C.fmtText(C.evalTokens(S3(['x'], 'x', ['1', '0', '0', '0', '0', '0']))), '5000050000'); }
// findRoots mit TIMEOUT im Funktionsaufruf wird weitergereicht
{ let n = 0; const slow = x => { if (++n > 3) { const e = new C.CalcError('TIMEOUT'); throw e; } return x; };
  eq('findRoots reicht TIMEOUT durch', code(() => C.findRoots(slow)), 'TIMEOUT'); }
console.log(`analysis pass=${pass} fail=${fail}`); if (fail) process.exit(1);
