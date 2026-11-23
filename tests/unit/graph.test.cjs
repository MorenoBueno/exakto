// Graph-Abnahmetests aus der Projektvision (Kapitel "Graphenmodus")
const C = require('../../dist/core.cjs');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) pass++; else { fail++; console.log('FAIL', n); } };
const near = (n, g, w, tol) => ok(n + ' got ' + g + ' want ' + w, Math.abs(g - w) <= tol);
const fnOf = toks => C.curveFn(toks);
const win = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 };
const segs = f => C.sampleCurve(f, win.xmin, win.xmax, win.ymin, win.ymax, 401);
// y = x^2: Scheitel (0,0), Symmetrie, Trace an x = 1 liefert 1
{ const f = fnOf(['x', '{pow', '2', '}pow']); near('x^2(1)', f(1), 1, 1e-12); near('x^2(0)', f(0), 0, 1e-12); near('Symmetrie', f(-3), f(3), 1e-12); ok('eine zusammenhaengende Kurve', segs(f).length === 1); }
// y = 1/x und y = tan(x): keine Verbindung ueber Polstellen
{ const s = segs(fnOf(['{frac', '1', '|frac', 'x', '}frac'])); ok('1/x zwei Aeste', s.length === 2);
  ok('1/x kein Segment ueberquert x=0', s.every(g => g.every(p => p[0] < 0) || g.every(p => p[0] > 0))); }
{ C.S.angle = 'RAD'; const s = segs(fnOf(['tan(', 'x', ')']));
  ok('tan: viele Aeste', s.length >= 6);
  const crossing = s.some(g => g.some((p, i) => i > 0 && Math.abs(p[1] - g[i - 1][1]) > 2 * 14 && Math.sign(p[1]) !== Math.sign(g[i - 1][1]))); ok('tan: keine Linie ueber Pol', !crossing); }
// y = sqrt(x): im reellen Modus keine Werte fuer x < 0
{ const f = fnOf(['{sqrt', 'x', '}sqrt']); ok('sqrt(-1) NaN', Number.isNaN(f(-1))); ok('sqrt(4)=2', f(4) === 2);
  const s = segs(f); ok('sqrt nur x>=0', s.every(g => g.every(p => p[0] >= 0))); }
// y = sin(x), RAD: Nullstellen bei k*pi; Graph und Rechner nutzen denselben Winkelmodus
{ C.S.angle = 'RAD'; const f = fnOf(['sin(', 'x', ')']); const r = C.findRoots(f).filter(x => Math.abs(x) < 10);
  ok('sin RAD Nullstellen', r.length === 7 && r.every(x => Math.abs(x / Math.PI - Math.round(x / Math.PI)) < 1e-8));
  C.S.angle = 'DEG'; near('sin DEG(90)', fnOf(['sin(', 'x', ')'])(90), 1, 1e-12); C.S.angle = 'RAD'; near('sin RAD(pi/2)', f(Math.PI / 2), 1, 1e-12); C.S.angle = 'DEG'; }
// Fenster und Gitter
near('niceStep 20', C.niceStep(20, 8), 2, 0); near('niceStep 1', C.niceStep(1, 8), 0.1, 1e-12); near('niceStep 0.003', C.niceStep(0.003, 6), 0.0005, 1e-15);
{ const r = C.fitY([x => x * x], -2, 2); ok('fitY umfasst 0..4', r && r[0] < 0.1 && r[1] > 3.8); }
{ const r = C.fitY([x => 1 / x], -2, 2); ok('fitY ignoriert Pol-Ausreisser', r && Math.abs(r[1]) < 1e6); }
// Fehlerhafter Ausdruck bricht nicht ab
{ const f = fnOf(['{frac', '1', '|frac', '0', '}frac']); ok('1/0 -> NaN', Number.isNaN(f(1))); ok('leer', C.sampleCurve(f, -1, 1, -1, 1, 50).length === 0); }
console.log(`graph pass=${pass} fail=${fail}`); if (fail) process.exit(1);
