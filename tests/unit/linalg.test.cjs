const C = require('../../dist/core.cjs');
let pass = 0, fail = 0;
const eq = (n, g, w) => { if (g === w) pass++; else { fail++; console.log('FAIL', n, 'got', JSON.stringify(g), 'want', JSON.stringify(w)); } };
const near = (n, g, w, tol = 1e-9) => { if (Math.abs(g - w) <= tol * Math.max(1, Math.abs(w))) pass++; else { fail++; console.log('FAIL', n, g, w); } };
const code = f => { try { f(); return 'no error'; } catch (e) { return e.code || String(e); } };
const { int, X, F, toNum, fmtText } = C;
const T = v => fmtText(v);                       // Text eines Werts
const M = rows => rows.map(r => r.map(v => (typeof v === 'number' ? int(v) : v)));
const MT = m => m.map(r => r.map(T).join(',')).join(';');
const Z = (a, b) => C.czMk(int(a), int(b));
const ZT = z => C.czFmt(z, false).text;
const ZD = z => C.czFmt(z, true).text;

// ---- Regression: sqrt(0) war ein ungueltiger Wert (1*sqrt(0)) ----
eq('sqrt(0) Text', fmtText(C.evalTokens(['{sqrt', '0', '}sqrt'])), '0'); eq('sqrt(0) isZero', C.isZero(C.evalTokens(['{sqrt', '0', '}sqrt'])), true);
eq('sqrt(0)+1', fmtText(C.evalTokens(['{sqrt', '0', '}sqrt', '+', '1'])), '1'); eq('sqrt(0)*5', fmtText(C.evalTokens(['{sqrt', '0', '}sqrt', '×', '5'])), '0');
eq('1/sqrt(0)', code(() => C.evalTokens(['1', '÷', '{sqrt', '0', '}sqrt'])), 'DIVIDE BY 0'); eq('sqrt(0)/sqrt(0)', code(() => C.evalTokens(['{sqrt', '0', '}sqrt', '÷', '{sqrt', '0', '}sqrt'])), 'DIVIDE BY 0');
eq('sqrt(0/5)', fmtText(C.evalTokens(['{sqrt', '0', '÷', '5', '}sqrt'])), '0');
// ---- komplexe Zahlen (exakt) ----
eq('(1+2i)+(3-i)', ZT(C.czAdd(Z(1, 2), Z(3, -1))), '4 + i');
eq('(1+2i)-(1+2i)', ZT(C.czSub(Z(1, 2), Z(1, 2))), '0');
eq('(1+2i)(3-i)', ZT(C.czMul(Z(1, 2), Z(3, -1))), '5 + 5i');
eq('i*i', ZT(C.czMul(Z(0, 1), Z(0, 1))), '−1');
eq('(1+2i)/(3-i)', ZT(C.czDiv(Z(1, 2), Z(3, -1))), '1/10 + 7/10i');
eq('1/i', ZT(C.czDiv(Z(1, 0), Z(0, 1))), '−i');
eq('conj', ZT(C.czConj(Z(3, 4))), '3 − 4i');
eq('|3+4i|', T(C.czAbs(Z(3, 4))), '5');
eq('|1+i| exakt', T(C.czAbs(Z(1, 1))), '√2');
eq('(1+i)^8', ZT(C.czPow(Z(1, 1), Z(8, 0))), '16');
eq('(1+i)^-2', ZT(C.czPow(Z(1, 1), Z(-2, 0))), '−1/2i');
eq('i^2023', ZT(C.czPowInt(Z(0, 1), 2023n)), '−i');
eq('sqrt(-4)', ZT(C.czSqrt(Z(-4, 0))), '2i');
eq('sqrt(9)', ZT(C.czSqrt(Z(9, 0))), '3');
{ const r = C.czSqrt(Z(3, 4)); near('sqrt(3+4i) re', toNum(r.re), 2); near('sqrt(3+4i) im', toNum(r.im), 1); }
{ const r = C.czExp(C.czMk(int(0), C.F(Math.PI))); near('e^(i pi) re', toNum(r.re), -1); eq('e^(i pi) im sauber 0', toNum(r.im), 0); }
{ const r = C.czLn(Z(-1, 0)); eq('ln(-1) re', toNum(r.re), 0); near('ln(-1) im', toNum(r.im), Math.PI); }
{ const r = C.czPow(Z(0, 1), Z(0, 1)); near('i^i = e^(-pi/2)', toNum(r.re), Math.exp(-Math.PI / 2)); }
eq('arg(1+i) DEG', C.czArgUnit(Z(1, 1)), 45);
eq('arg(-1) DEG', C.czArgUnit(Z(-1, 0)), 180);
eq('arg(0) Fehler', code(() => C.czArgUnit(Z(0, 0))), 'DOMAIN');
eq('1/0 Fehler', code(() => C.czDiv(Z(1, 1), Z(0, 0))), 'DIVIDE BY 0');
eq('0^0 Fehler', code(() => C.czPow(Z(0, 0), Z(0, 0))), 'DIVIDE BY 0');
{ const z = C.czFromPolar(int(2), int(60)); eq('2 cis 60° exakt', ZT(z), '1 + √3i'); }
{ const z = C.czFromPolar(int(1), int(90)); eq('cis 90°', ZT(z), 'i'); }
eq('Dezimaldarstellung', ZD(C.czDiv(Z(1, 2), Z(3, -1))), '0.1 + 0.7i');

// ---- Matrizen ----
const A = M([[1, 2], [3, 4]]), B = M([[0, 1], [1, 0]]);
eq('A+B', MT(C.matAdd(A, B)), '1,3;4,4'); eq('A-B', MT(C.matSub(A, B)), '1,1;2,4');
eq('A*B', MT(C.matMul(A, B)), '2,1;4,3'); eq('2A', MT(C.matScale(A, int(2))), '2,4;6,8');
eq('A^T', MT(C.matT(A)), '1,3;2,4'); eq('det A', T(C.matDet(A)), '−2');
eq('A^-1 exakt', MT(C.matInv(A)), '−2,1;3/2,−1/2');
eq('A*A^-1 = I', MT(C.matMul(A, C.matInv(A))), '1,0;0,1');
eq('A^3', MT(C.matPow(A, 3n)), '37,54;81,118'); eq('A^-1 via pow', MT(C.matPow(A, -1n)), '−2,1;3/2,−1/2');
eq('A^0 = I', MT(C.matPow(A, 0n)), '1,0;0,1'); eq('tr', T(C.matTrace(A)), '5');
{ const D = M([[2, 0, 1], [1, 3, 2], [1, 1, 1]]); eq('det 3x3', T(C.matDet(D)), '0'); eq('rank 3x3 singulaer', C.matRank(D), 2);
  eq('inv singulaer', code(() => C.matInv(D)), 'SINGULAR MAT'); }
{ const D = M([[2, 1, 0], [1, 3, 1], [0, 1, 4]]); eq('det 3x3 b', T(C.matDet(D)), '18'); eq('D*D^-1', MT(C.matMul(D, C.matInv(D))), '1,0,0;0,1,0;0,0,1'); }
{ const D = M([[0, 2], [3, 0]]); eq('Pivottausch det', T(C.matDet(D)), '−6'); eq('Pivottausch inv', MT(C.matInv(D)), '0,1/3;1/2,0'); }
eq('rref', MT(C.matRref(M([[1, 2, 3], [4, 5, 6]]))), '1,0,−1;0,1,2'); eq('rank 2x3', C.matRank(M([[1, 2, 3], [4, 5, 6]])), 2);
eq('Dimension +', code(() => C.matAdd(A, M([[1, 2, 3]]))), 'DIMENSION');
eq('Dimension *', code(() => C.matMul(M([[1, 2, 3]]), A)), 'DIMENSION');
eq('det nicht quadratisch', code(() => C.matDet(M([[1, 2, 3]]))), 'DIMENSION');
eq('2x3 * 3x2', MT(C.matMul(M([[1, 2, 3], [4, 5, 6]]), M([[1, 0], [0, 1], [1, 1]]))), '4,5;10,11');
{ const D = [[F(0.5), F(0.25)], [F(1), F(2)]]; near('det dezimal', toNum(C.matDet(D)), 0.75); near('inv dezimal', toNum(C.matInv(D)[0][0]), 2 / 0.75); }
eq('4x4 Einheit', C.matDet(M([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])).n, 1n);
{ // Zufallstest: A * A^-1 = I fuer ganzzahlige 3x3, exakt
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s % 11 - 5; };
  let tested = 0, bad = 0;
  for (let k = 0; k < 400; k++) { const D = M([[rnd(), rnd(), rnd()], [rnd(), rnd(), rnd()], [rnd(), rnd(), rnd()]]);
    const d = C.matDet(D); if (C.isZero(d)) { if (C.matRank(D) === 3) bad++; continue; }
    tested++; if (MT(C.matMul(D, C.matInv(D))) !== '1,0,0;0,1,0;0,0,1') bad++; }
  eq('Zufall 3x3 invers (' + tested + ')', bad, 0); }

// ---- Vektoren ----
const V = a => a.map(int);
eq('u+v', C.vecAdd(V([1, 2, 3]), V([4, 5, 6])).map(T).join(), '5,7,9'); eq('u-v', C.vecSub(V([1, 2, 3]), V([4, 5, 6])).map(T).join(), '−3,−3,−3');
eq('u.v', T(C.vecDot(V([1, 2, 3]), V([4, 5, 6]))), '32'); eq('uxv', C.vecCross(V([1, 0, 0]), V([0, 1, 0])).map(T).join(), '0,0,1');
eq('uxv 2', C.vecCross(V([1, 2, 3]), V([4, 5, 6])).map(T).join(), '−3,6,−3');
eq('|u| exakt', T(C.vecNorm(V([1, 2, 2]))), '3'); eq('|u| Wurzel', T(C.vecNorm(V([1, 1]))), '√2');
eq('unit', C.vecUnit(V([0, 3, 4])).map(T).join(), '0,3/5,4/5'); eq('unit 0', code(() => C.vecUnit(V([0, 0]))), 'DIVIDE BY 0');
eq('Winkel 90', toNum(C.vecAngle(V([1, 0]), V([0, 1]))), 90); eq('Winkel 45', toNum(C.vecAngle(V([1, 0]), V([1, 1]))), 45);
eq('Winkel 180', toNum(C.vecAngle(V([1, 0]), V([-1, 0]))), 180);
eq('proj', C.vecProj(V([3, 4]), V([1, 0])).map(T).join(), '3,0'); eq('proj auf 0', code(() => C.vecProj(V([1, 1]), V([0, 0]))), 'DIVIDE BY 0');
eq('2D x 3D', code(() => C.vecAdd(V([1, 2]), V([1, 2, 3]))), 'DIMENSION'); eq('cross 2D', code(() => C.vecCross(V([1, 2]), V([3, 4]))), 'DIMENSION');
{ let bad = 0; for (let k = 0; k < 200; k++) { const a = V([k % 7 - 3, k % 5 - 2, k % 3 - 1]), b = V([k % 4 - 1, k % 6 - 3, k % 2 + 1]), c = C.vecCross(a, b);
    if (!C.isZero(C.vecDot(a, c)) || !C.isZero(C.vecDot(b, c))) bad++; } eq('a×b ⟂ a,b (200)', bad, 0); }

// ---- op ----
{ const p = C.polar(int(1), int(1)); eq('Pol r', T(p.r), '√2'); eq('Pol theta', toNum(p.th), 45); }
{ const p = C.polar(int(-3), int(0)); eq('Pol 180', toNum(p.th), 180); eq('Pol r=3', T(p.r), '3'); }
{ const p = C.polar(int(0), int(0)); eq('Pol(0,0)', T(p.r), '0'); }
{ const p = C.rect(int(2), int(60)); eq('Rec x', T(p.x), '1'); eq('Rec y', T(p.y), '√3'); }
{ const p = C.rect(int(5), int(90)); eq('Rec 90 x', T(p.x), '0'); eq('Rec 90 y', T(p.y), '5'); }
eq('Primfaktoren 360', JSON.stringify(C.primeFactors(int(360))), '[[2,3],[3,2],[5,1]]'); eq('Primfaktoren Primzahl', JSON.stringify(C.primeFactors(int(97))), '[[97,1]]');
eq('Primfaktoren 2^40', JSON.stringify(C.primeFactors(X(2n ** 40n))), '[[2,40]]'); eq('Primfaktoren 1', code(() => C.primeFactors(int(1))), 'DOMAIN');
eq('Primfaktoren 1/2', code(() => C.primeFactors(X(1n, 2n))), 'DOMAIN'); eq('Primfaktoren riesig', code(() => C.primeFactors(X(10n ** 20n))), 'OVERFLOW');
eq('Primfaktoren 1e15-37 ok', C.primeFactors(X(999999999999989n)).length > 0, true);
eq('Teiler 36', C.divisors(int(36)).join(), '1,2,3,4,6,9,12,18,36'); eq('Teiler 1', C.divisors(int(1)).join(), '1'); eq('Teiler 0', code(() => C.divisors(int(0))), 'DOMAIN');
eq('Teiler 49', C.divisors(int(49)).join(), '1,7,49');
{ const d = C.divRem(int(17), int(5)); eq('17/5 q', T(d.q), '3'); eq('17/5 r', T(d.r), '2'); }
{ const d = C.divRem(int(-17), int(5)); eq('-17/5 q', T(d.q), '−4'); eq('-17/5 r', T(d.r), '3'); }
{ const d = C.divRem(int(17), int(-5)); eq('17/-5 q', T(d.q), '−3'); eq('17/-5 r', T(d.r), '2'); }
eq('div 0', code(() => C.divRem(int(1), int(0))), 'DIVIDE BY 0'); eq('div Bruch', code(() => C.divRem(X(1n, 2n), int(2))), 'DOMAIN');
{ let bad = 0; for (let a = -30; a <= 30; a++) for (const b of [-7, -3, -1, 1, 2, 5, 9]) { const d = C.divRem(int(a), int(b)); const r = Number(d.r.n), q = Number(d.q.n); if (q * b + r !== a || r < 0 || r >= Math.abs(b)) bad++; } eq('divRem q*b+r=a', bad, 0); }

// ---- Mengen ----
eq('Vereinigung', C.setOp([1, 2, 3], [3, 4], 'union').join(), '1,2,3,4'); eq('Schnitt', C.setOp([1, 2, 3], [3, 4, 2], 'inter').join(), '2,3');
eq('A\\B', C.setOp([1, 2, 3], [3, 4], 'minus').join(), '1,2'); eq('B\\A', C.setOp([1, 2, 3], [3, 4], 'rminus').join(), '4');
eq('sym. Differenz', C.setOp([1, 2, 3], [3, 4], 'sym').join(), '1,2,4'); eq('Duplikate', C.setOp([2, 2, 1, 1], [], 'union').join(), '1,2');
eq('null ignoriert', C.setOp([1, null, 2], [undefined, 2], 'inter').join(), '2'); eq('leer', C.setOp([], [], 'union').length, 0);
eq('unbekannte Op', code(() => C.setOp([1], [1], 'x')), 'SYNTAX'); eq('negative sortiert', C.setOp([3, -1, 0.5], [-1], 'union').join(), '-1,0.5,3');
console.log(`linalg pass=${pass} fail=${fail}`); if (fail) process.exit(1);
