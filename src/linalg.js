/* ===== linalg.js : komplexe Zahlen, Matrizen, Vektoren, Zahlen-Operationen, Mengen (ohne Oberflaeche) ===== */

/* ---------- Komplexe Zahlen: {re, im} mit exakten bzw. dezimalen Werten ---------- */
const czMk = (re, im) => ({ re, im });
const CZ0 = () => czMk(int(0), int(0));
const CZ1 = () => czMk(int(1), int(0));
const czIsReal = z => isZero(z.im);
const czAdd = (a, b) => czMk(add(a.re, b.re), add(a.im, b.im));
const czSub = (a, b) => czMk(sub(a.re, b.re), sub(a.im, b.im));
const czMul = (a, b) => czMk(sub(mul(a.re, b.re), mul(a.im, b.im)), add(mul(a.re, b.im), mul(a.im, b.re)));
const czConj = a => czMk(a.re, neg(a.im));
function czDiv(a, b) {
  const d = add(mul(b.re, b.re), mul(b.im, b.im));
  if (isZero(d)) err('DIVIDE BY 0');
  const n = czMul(a, czConj(b));
  return czMk(div(n.re, d), div(n.im, d));
}
// Dezimalergebnis aufraeumen: Rundungsreste (< 1e-12 relativ) werden zu 0
function czClean(re, im) {
  const m = Math.max(Math.abs(re), Math.abs(im), 1e-300);
  const c = v => (Math.abs(v) < 1e-12 * m ? 0 : v);
  const f = v => { const w = c(v); return w === 0 ? int(0) : F(chk(w)); };
  return czMk(f(re), f(im));
}
const czAbs = z => (czIsReal(z) ? absV(z.re) : sqrtV(add(mul(z.re, z.re), mul(z.im, z.im))));
function czArgRad(z) { if (isZero(z.re) && isZero(z.im)) err('DOMAIN'); return Math.atan2(toNum(z.im), toNum(z.re)); }
// Winkel in der gewaehlten Einheit (DEG/RAD/GRAD), saubere Werte wie 45 statt 45.00000000000001
function czArgUnit(z) {
  const v = fromRad(czArgRad(z)); const r = Math.round(v * 1e9) / 1e9;
  return Math.abs(v - r) < 1e-10 * Math.max(1, Math.abs(v)) ? r : v;
}
// r * (cos th + i sin th); th in der gewaehlten Winkeleinheit (exakt bei 30/45/60/90 ... Grad)
function czFromPolar(r, th) { return czMk(mul(r, cosX(th)), mul(r, sinX(th))); }
function czPowInt(z, n) {
  if (n > 100000n || n < -100000n) err('OVERFLOW');
  let e = n < 0n ? -n : n, base = z, acc = CZ1();
  while (e > 0n) { if (e & 1n) acc = czMul(acc, base); e >>= 1n; if (e) base = czMul(base, base); }
  return n < 0n ? czDiv(CZ1(), acc) : acc;
}
function czSqrt(z) {
  if (czIsReal(z)) { const a = z.re; return (a.t === 'x' ? a.n >= 0n : a.v >= 0) ? czMk(sqrtV(a), int(0)) : czMk(int(0), sqrtV(neg(a))); }
  const a = toNum(z.re), b = toNum(z.im), r = Math.hypot(a, b);
  return czClean(Math.sqrt((r + a) / 2), (b < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - a) / 2)));
}
function czExp(z) {
  const m = Math.exp(toNum(z.re)), b = toNum(z.im); chk(m);
  return czClean(m * Math.cos(b), m * Math.sin(b));
}
function czLn(z) { const r = toNum(czAbs(z)); return czClean(Math.log(r), czArgRad(z)); }
function czPow(z, w) {
  if (czIsReal(w) && isInt(w.re)) { if (isZero(z.re) && isZero(z.im) && w.re.n <= 0n) err('DIVIDE BY 0'); return czPowInt(z, w.re.n); }
  if (isZero(z.re) && isZero(z.im)) { if (toNum(w.re) > 0) return CZ0(); err('DOMAIN'); }
  const L = czLn(z); return czExp(czMul(w, czMk(L.re, L.im)));
}
function czSin(z) { const a = toNum(z.re), b = toNum(z.im); return czClean(Math.sin(a) * Math.cosh(b), Math.cos(a) * Math.sinh(b)); }
function czCos(z) { const a = toNum(z.re), b = toNum(z.im); return czClean(Math.cos(a) * Math.cosh(b), -Math.sin(a) * Math.sinh(b)); }
const unitOne = a => (a.t === 'x' ? a.n === a.d && a.r === 1n && a.p === 0 : a.v === 1);
const isNegV = a => (a.t === 'x' ? a.n < 0n : a.v < 0);
// Darstellung a + bi (html und text); dec = Dezimaldarstellung erzwingen
function czFmt(z, dec) {
  const mk = f => {
    const rz = isZero(z.re), iz = isZero(z.im);
    if (iz) return f(fmtVal(z.re, dec));
    const bi = unitOne(absV(z.im)) ? 'i' : f(fmtVal(absV(z.im), dec)) + 'i';
    if (rz) return (isNegV(z.im) ? MINUS : '') + bi;
    return f(fmtVal(z.re, dec)) + (isNegV(z.im) ? ' − ' : ' + ') + bi;
  };
  return { html: mk(v => v.html), text: mk(v => v.text) };
}

/* ---------- Matrizen: Array von Zeilen mit Werten ---------- */
const MAT_MAX = 4;
const matRows = M => M.length, matCols = M => M[0].length;
function matSame(A, B) { if (matRows(A) !== matRows(B) || matCols(A) !== matCols(B)) err('DIMENSION'); }
const matAdd = (A, B) => { matSame(A, B); return A.map((r, i) => r.map((v, j) => add(v, B[i][j]))); };
const matSub = (A, B) => { matSame(A, B); return A.map((r, i) => r.map((v, j) => sub(v, B[i][j]))); };
const matScale = (A, k) => A.map(r => r.map(v => mul(v, k)));
const matT = A => A[0].map((_, j) => A.map(r => r[j]));
function matMul(A, B) {
  if (matCols(A) !== matRows(B)) err('DIMENSION');
  return A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => add(s, mul(v, B[k][j])), int(0))));
}
function matIdent(n) { return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => int(i === j ? 1 : 0))); }
// Nullpruefung: exakte Werte exakt, Dezimalwerte mit relativer Schwelle zur groessten Matrixzahl
function matZeroTest(M) {
  let mx = 0; for (const r of M) for (const v of r) mx = Math.max(mx, Math.abs(toNum(v)));
  return v => (v.t === 'x' ? v.n === 0n : Math.abs(v.v) <= 1e-12 * Math.max(mx, 1e-300));
}
// Gauss-Jordan; liefert { M (reduziert), rank, det (nur quadratisch, sonst null), perm }
function matGauss(A, aug) {
  const n = matRows(A), m = matCols(A); const iz = matZeroTest(A);
  const M = A.map((r, i) => r.concat(aug ? aug[i] : []));
  let rank = 0, det = int(1), swaps = 0;
  for (let c = 0; c < m && rank < n; c++) {
    let p = -1, best = -1;
    for (let r = rank; r < n; r++) { if (iz(M[r][c])) continue; const a = Math.abs(toNum(M[r][c])); if (M[r][c].t === 'x') { p = r; break; } if (a > best) { best = a; p = r; } }
    if (p < 0) continue;
    if (p !== rank) { [M[p], M[rank]] = [M[rank], M[p]]; swaps++; }
    const pv = M[rank][c]; det = mul(det, pv);
    M[rank] = M[rank].map(v => div(v, pv));
    for (let r = 0; r < n; r++) {
      if (r === rank || iz(M[r][c])) continue;
      const f = M[r][c]; M[r] = M[r].map((v, k) => sub(v, mul(f, M[rank][k])));
    }
    rank++;
  }
  return { M, rank, det: n === m ? (rank === n ? (swaps % 2 ? neg(det) : det) : int(0)) : null };
}
function matDet(A) { if (matRows(A) !== matCols(A)) err('DIMENSION'); return matGauss(A).det; }
function matInv(A) {
  if (matRows(A) !== matCols(A)) err('DIMENSION');
  const n = matRows(A), g = matGauss(A, matIdent(n));
  if (g.rank < n) err('SINGULAR MAT');
  return g.M.map(r => r.slice(n));
}
const matRref = A => matGauss(A).M;
const matRank = A => matGauss(A).rank;
const matTrace = A => { if (matRows(A) !== matCols(A)) err('DIMENSION'); return A.reduce((s, r, i) => add(s, r[i]), int(0)); };
function matPow(A, n) {
  if (matRows(A) !== matCols(A)) err('DIMENSION');
  if (n > 200n || n < -200n) err('OVERFLOW');
  let e = n < 0n ? -n : n, base = n < 0n ? matInv(A) : A, acc = matIdent(matRows(A));
  while (e > 0n) { if (e & 1n) acc = matMul(acc, base); e >>= 1n; if (e) base = matMul(base, base); }
  return acc;
}

/* ---------- Vektoren (2D/3D): Array von Werten ---------- */
function vecSame(a, b) { if (a.length !== b.length) err('DIMENSION'); }
const vecAdd = (a, b) => { vecSame(a, b); return a.map((v, i) => add(v, b[i])); };
const vecSub = (a, b) => { vecSame(a, b); return a.map((v, i) => sub(v, b[i])); };
const vecDot = (a, b) => { vecSame(a, b); return a.reduce((s, v, i) => add(s, mul(v, b[i])), int(0)); };
function vecCross(a, b) {
  if (a.length !== 3 || b.length !== 3) err('DIMENSION');
  return [sub(mul(a[1], b[2]), mul(a[2], b[1])), sub(mul(a[2], b[0]), mul(a[0], b[2])), sub(mul(a[0], b[1]), mul(a[1], b[0]))];
}
const vecNorm = a => sqrtV(vecDot(a, a));
function vecUnit(a) { const n = vecNorm(a); if (isZero(n)) err('DIVIDE BY 0'); return a.map(v => div(v, n)); }
function vecAngle(a, b) { // Winkel in der gewaehlten Einheit
  const na = toNum(vecNorm(a)), nb = toNum(vecNorm(b)); if (!na || !nb) err('DIVIDE BY 0');
  const c = Math.max(-1, Math.min(1, toNum(vecDot(a, b)) / (na * nb)));
  const v = fromRad(Math.acos(c)), r = Math.round(v * 1e9) / 1e9;
  return F(Math.abs(v - r) < 1e-10 * Math.max(1, Math.abs(v)) ? r : v);
}
function vecProj(a, b) { const d = vecDot(b, b); if (isZero(d)) err('DIVIDE BY 0'); const k = div(vecDot(a, b), d); return b.map(v => mul(v, k)); }

/* ---------- Zahlen-Operationen ---------- */
function polar(x, y) { // Pol(x, y) -> r, theta (gewaehlte Winkeleinheit)
  const z = czMk(x, y); if (isZero(x) && isZero(y)) return { r: int(0), th: F(0) };
  return { r: czAbs(z), th: F(czArgUnit(z)) };
}
function rect(r, th) { const z = czFromPolar(r, th); return { x: z.re, y: z.im }; }
// Primfaktorzerlegung einer natuerlichen Zahl (<= 1e15): Liste [primzahl, exponent]
function primeFactors(a) {
  if (!isInt(a) || a.n < 2n) err('DOMAIN');
  if (a.n > 1000000000000000n) err('OVERFLOW');
  let n = Number(a.n); const out = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
    if (n % p === 0) { let e = 0; while (n % p === 0) { n /= p; e++; } out.push([p, e]); }
  }
  if (n > 1) out.push([n, 1]);
  return out;
}
function divisors(a) {
  if (!isInt(a) || a.n < 1n) err('DOMAIN');
  if (a.n > 1000000000000n) err('OVERFLOW');
  const n = Number(a.n), small = [], big = [];
  for (let d = 1; d * d <= n; d++) if (n % d === 0) { small.push(d); if (d * d !== n) big.push(n / d); }
  return small.concat(big.reverse());
}
function divRem(a, b) { // Division mit Rest fuer ganze Zahlen: a = q*b + r, 0 <= r < |b|
  if (!isInt(a) || !isInt(b)) err('DOMAIN');
  if (b.n === 0n) err('DIVIDE BY 0');
  let q = a.n / b.n, r = a.n % b.n; if (r < 0n) { r += babs(b.n); q = (a.n - r) / b.n; }
  return { q: X(q), r: X(r) };
}

/* ---------- Mengen aus Listen (Zahlen, ohne Duplikate, aufsteigend) ---------- */
function setOf(list) {
  const s = []; for (const v of list) { if (v === null || v === undefined || Number.isNaN(v)) continue; if (!s.some(w => w === v)) s.push(v); }
  return s.sort((a, b) => a - b);
}
function setOp(A, B, op) {
  const a = setOf(A), b = setOf(B), inB = v => b.indexOf(v) >= 0, inA = v => a.indexOf(v) >= 0;
  switch (op) {
    case 'union': return setOf(a.concat(b));
    case 'inter': return a.filter(inB);
    case 'minus': return a.filter(v => !inB(v));
    case 'rminus': return b.filter(v => !inA(v));
    case 'sym': return setOf(a.filter(v => !inB(v)).concat(b.filter(v => !inA(v))));
  }
  err('SYNTAX'); return [];
}
