/* ===== editor.js : strukturierter Eingabe-Editor (flache Token-Liste mit Strukturmarken) ===== */
const VARSKIP = { sum: 1, prod: 1, int: 1, deriv: 1 };
const KIND_PARTS = { frac: 2, mix: 3, pow: 1, sqrt: 1, root: 2, abs: 1, sum: 4, prod: 4, int: 4, deriv: 3 };
// vertikale Bewegung: dir -> {aktueller Teil: Zielteil | 'exit'}
const VERT = {
  frac: { down: { 0: 1 }, up: { 1: 0 } },
  mix: { down: { 1: 2 }, up: { 2: 1 } },
  pow: { down: { 0: 'exit' } },
  root: { down: { 0: 1 }, up: { 1: 0 } },
  sum: { up: { 1: 3, 2: 3 }, down: { 3: 2 } },
  prod: { up: { 1: 3, 2: 3 }, down: { 3: 2 } },
  int: { up: { 1: 3, 2: 3 }, down: { 3: 2 } },
};

function structInfo(t, o) { // Trenner und Ende der Struktur ab Oeffner o
  const seps = []; let depth = 0;
  for (let j = o + 1; j < t.length; j++) {
    const k = t[j];
    if (isOpen(k)) depth++;
    else if (isClose(k)) { if (depth === 0) return { seps, end: j }; depth--; }
    else if (isSep(k) && depth === 0) seps.push(j);
  }
  return { seps, end: t.length };
}
function structStartOf(t, idx) { // Oeffner zu Trenner/Schliesser bei idx
  let depth = 0;
  for (let j = idx - 1; j >= 0; j--) {
    const k = t[j];
    if (isClose(k)) depth++;
    else if (isOpen(k)) { if (depth === 0) return j; depth--; }
  }
  return -1;
}
const GRAB_OK = k => k === 'π' || k === 'e' || k === 'Ans' || isVarTok(k) || k.startsWith('K:') || k.startsWith('SV:');

class Editor {
  constructor() { this.t = []; this.c = 0; this.ow = false; }
  isEmpty() { return this.t.length === 0; }
  clear() { this.t = []; this.c = 0; }
  set(tokens) { this.t = tokens.slice(); this.c = this.t.length; }
  ins(tok) {
    if (this.ow && this.c < this.t.length && isPlain(this.t[this.c])) this.t.splice(this.c, 1);
    this.t.splice(this.c, 0, tok); this.c++;
  }
  insMany(arr) { for (const k of arr) this.ins(k); }
  insStruct(kind, parts, focus) { // focus: Teilindex | -1 (hinter die Struktur)
    const toks = ['{' + kind]; const starts = [];
    parts.forEach((p, i) => { if (i > 0) toks.push('|' + kind); starts.push(toks.length); toks.push(...p); });
    toks.push('}' + kind);
    const base = this.c; this.t.splice(base, 0, ...toks);
    this.c = focus < 0 ? base + toks.length : base + starts[focus];
  }
  grabCount() { // Operand links vom Cursor (Zahl, Variable ...)
    let j = this.c; const t = this.t;
    while (j > 0 && (isDigit(t[j - 1]) || t[j - 1] === '.')) j--;
    if (j < this.c) return this.c - j;
    const p = t[this.c - 1];
    if (p !== undefined && isPlain(p) && GRAB_OK(p)) return 1;
    return 0;
  }
  takeOperand() {
    const n = this.grabCount(); if (!n) return [];
    const r = this.t.splice(this.c - n, n); this.c -= n; return r;
  }
  // Variablenfeld (Teil 1) von sum/prod/int/deriv wird beim Navigieren uebersprungen
  varSkipInfo(sepIdx) {
    const k = this.t[sepIdx];
    if (!isSep(k) || !VARSKIP[kindOf(k)]) return null;
    const o = structStartOf(this.t, sepIdx); const info = structInfo(this.t, o);
    if (info.seps.length < 2) return null;
    if (info.seps[1] - info.seps[0] !== 2 || !isVarTok(this.t[info.seps[0] + 1])) return null;
    return info;
  }
  left() {
    if (this.c === 0) return;
    this.c--;
    const info = this.varSkipInfo(this.c);
    if (info && this.c === info.seps[1]) this.c = info.seps[0];
  }
  right() {
    if (this.c >= this.t.length) return;
    this.c++;
    const info = this.varSkipInfo(this.c - 1);
    if (info && this.c - 1 === info.seps[0]) this.c = info.seps[1] + 1;
  }
  home() { this.c = 0; }
  end() { this.c = this.t.length; }
  enclosing() {
    const st = [];
    for (let i = 0; i < this.c; i++) {
      const k = this.t[i];
      if (isOpen(k)) st.push({ open: i, kind: kindOf(k), part: 0 });
      else if (isSep(k)) { if (st.length) st[st.length - 1].part++; }
      else if (isClose(k)) st.pop();
    }
    return st;
  }
  vert(dir) {
    const st = this.enclosing();
    for (let s = st.length - 1; s >= 0; s--) {
      const { kind, part, open } = st[s];
      const rule = VERT[kind]; if (!rule) continue;
      const tgt = rule[dir] && rule[dir][part]; if (tgt === undefined) continue;
      const info = structInfo(this.t, open);
      if (tgt === 'exit') { this.c = info.end + 1; return true; }
      const ps = tgt === 0 ? open + 1 : info.seps[tgt - 1] + 1;
      const pe = tgt < info.seps.length ? info.seps[tgt] : info.end;
      this.c = dir === 'up' ? pe : ps; return true;
    }
    return false;
  }
  bs() {
    if (this.c === 0) return;
    const k = this.t[this.c - 1];
    if (isOpen(k) || isSep(k)) {
      const o = isOpen(k) ? this.c - 1 : structStartOf(this.t, this.c - 1);
      const info = structInfo(this.t, o);
      if (info.end - o - 1 === info.seps.length) { this.t.splice(o, info.end - o + 1); this.c = o; }
      else this.c--;
    } else if (isClose(k)) this.c--;
    else { this.t.splice(this.c - 1, 1); this.c--; }
  }
  fdel() {
    if (this.c >= this.t.length) return;
    const k = this.t[this.c];
    if (isPlain(k)) this.t.splice(this.c, 1);
    else if (isOpen(k)) {
      const info = structInfo(this.t, this.c);
      if (info.end - this.c - 1 === info.seps.length) this.t.splice(this.c, info.end - this.c + 1);
      else this.c++;
    } else this.c++;
  }
}

/* ---------- Statistik ---------- */
function expandData(xs, fr) { // -> [{x, f}] sortiert
  const out = [];
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]; if (x === null || x === undefined || Number.isNaN(x)) continue;
    let f = 1;
    if (fr) { f = fr[i]; if (f === null || f === undefined) f = 0; if (f < 0 || !Number.isInteger(f)) err('DOMAIN'); }
    if (f > 0) out.push({ x, f });
  }
  return out;
}
function calc1Var(xs, fr) {
  const d = expandData(xs, fr); const n = d.reduce((a, p) => a + p.f, 0);
  if (n < 1) err('STAT');
  let sx = 0, sxx = 0; for (const p of d) { sx += p.f * p.x; sxx += p.f * p.x * p.x; }
  const mean = sx / n; let ss = 0; for (const p of d) ss += p.f * (p.x - mean) * (p.x - mean);
  const sorted = d.slice().sort((a, b) => a.x - b.x);
  const cum = []; let acc = 0; for (const p of sorted) { acc += p.f; cum.push(acc); }
  const at = i => { let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] > i) hi = m; else lo = m + 1; } return sorted[lo].x; };
  const medRange = (lo, hi) => (at(Math.floor((lo + hi) / 2)) + at(Math.ceil((lo + hi) / 2))) / 2;
  const med = medRange(0, n - 1);
  const h = Math.floor(n / 2);
  const q1 = n >= 2 ? medRange(0, h - 1) : at(0);
  const q3 = n >= 2 ? medRange(n - h, n - 1) : at(0);
  return {
    n, xbar: mean, Sx: n > 1 ? Math.sqrt(ss / (n - 1)) : NaN, sigx: Math.sqrt(ss / n), sumx: sx, sumx2: sxx,
    minX: sorted[0].x, Q1: q1, Med: med, Q3: q3, maxX: sorted[sorted.length - 1].x,
  };
}
function gatherXY(xs, ys, fr) {
  const pts = [];
  const len = Math.max(xs.length, ys.length);
  for (let i = 0; i < len; i++) {
    const x = xs[i], y = ys[i];
    if (x === null || x === undefined || y === null || y === undefined || Number.isNaN(x) || Number.isNaN(y)) continue;
    let f = 1; if (fr) { f = fr[i]; if (f === null || f === undefined) f = 0; if (f < 0 || !Number.isInteger(f)) err('DOMAIN'); }
    if (f > 0) pts.push({ x, y, f });
  }
  return pts;
}
function solveLinearF(A, b) { // Gauss mit Pivotsuche (Float)
  const n = b.length; const M = A.map((r, i) => r.concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) err('STAT');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x;
}
function polyFit(pts, deg) {
  const m = deg + 1; const A = Array.from({ length: m }, () => new Array(m).fill(0)); const b = new Array(m).fill(0);
  for (const p of pts) {
    for (let i = 0; i < m; i++) { b[i] += p.f * Math.pow(p.x, i) * p.y; for (let j = 0; j < m; j++) A[i][j] += p.f * Math.pow(p.x, i + j); }
  }
  return solveLinearF(A, b); // Koeffizienten c0..cdeg
}
function rSquared(pts, fn) {
  let n = 0, sy = 0; for (const p of pts) { n += p.f; sy += p.f * p.y; }
  const my = sy / n; let ssr = 0, sst = 0;
  for (const p of pts) { ssr += p.f * Math.pow(p.y - fn(p.x), 2); sst += p.f * Math.pow(p.y - my, 2); }
  return sst === 0 ? 1 : 1 - ssr / sst;
}
function corr(pts) {
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { n += p.f; sx += p.f * p.x; sy += p.f * p.y; sxx += p.f * p.x * p.x; syy += p.f * p.y * p.y; sxy += p.f * p.x * p.y; }
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return (n * sxy - sx * sy) / den;
}
const REG_TYPES = ['LinReg ax+b', 'LinReg a+bx', 'QuadReg', 'CubicReg', 'LnReg', 'ExpReg', 'PwrReg'];
function calcReg(pts, type) {
  const need = { 'LinReg ax+b': 2, 'LinReg a+bx': 2, QuadReg: 3, CubicReg: 4, LnReg: 2, ExpReg: 2, PwrReg: 2 }[type];
  if (pts.length < need) err('STAT');
  switch (type) {
    case 'LinReg ax+b': { const c = polyFit(pts, 1); return { a: c[1], b: c[0], r: corr(pts) }; }
    case 'LinReg a+bx': { const c = polyFit(pts, 1); return { a: c[0], b: c[1], r: corr(pts) }; }
    case 'QuadReg': { const c = polyFit(pts, 2); return { a: c[2], b: c[1], c: c[0], R2: rSquared(pts, x => c[0] + c[1] * x + c[2] * x * x) }; }
    case 'CubicReg': { const c = polyFit(pts, 3); return { a: c[3], b: c[2], c: c[1], d: c[0], R2: rSquared(pts, x => c[0] + c[1] * x + c[2] * x * x + c[3] * x * x * x) }; }
    case 'LnReg': {
      if (pts.some(p => p.x <= 0)) err('DOMAIN');
      const q = pts.map(p => ({ x: Math.log(p.x), y: p.y, f: p.f })); const c = polyFit(q, 1);
      return { a: c[0], b: c[1], r: corr(q) };
    }
    case 'ExpReg': {
      if (pts.some(p => p.y <= 0)) err('DOMAIN');
      const q = pts.map(p => ({ x: p.x, y: Math.log(p.y), f: p.f })); const c = polyFit(q, 1);
      return { a: Math.exp(c[0]), b: Math.exp(c[1]), r: corr(q) };
    }
    case 'PwrReg': {
      if (pts.some(p => p.x <= 0 || p.y <= 0)) err('DOMAIN');
      const q = pts.map(p => ({ x: Math.log(p.x), y: Math.log(p.y), f: p.f })); const c = polyFit(q, 1);
      return { a: Math.exp(c[0]), b: c[1], r: corr(q) };
    }
  }
}
function calc2Var(xs, ys, fr, regType) {
  const pts = gatherXY(xs, ys, fr);
  const n = pts.reduce((a, p) => a + p.f, 0);
  if (n < 1) err('STAT');
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { sx += p.f * p.x; sy += p.f * p.y; sxx += p.f * p.x * p.x; syy += p.f * p.y * p.y; sxy += p.f * p.x * p.y; }
  const mx = sx / n, my = sy / n;
  let ssx = 0, ssy = 0; for (const p of pts) { ssx += p.f * (p.x - mx) ** 2; ssy += p.f * (p.y - my) ** 2; }
  const res = {
    n, xbar: mx, Sx: n > 1 ? Math.sqrt(ssx / (n - 1)) : NaN, sigx: Math.sqrt(ssx / n),
    ybar: my, Sy: n > 1 ? Math.sqrt(ssy / (n - 1)) : NaN, sigy: Math.sqrt(ssy / n),
    sumx: sx, sumx2: sxx, sumy: sy, sumy2: syy, sumxy: sxy,
  };
  let reg = null; try { reg = calcReg(pts, regType); } catch (e) { reg = null; res.regErr = e.code || 'STAT'; }
  if (reg) Object.assign(res, reg);
  return res;
}

/* ---------- Gleichungen ---------- */
function cplx(re, im) { return { re, im }; }
function fmtCplx(z) {
  const clean = v => (Math.abs(v) < 1e-12 ? 0 : v);
  const re = clean(z.re), im = clean(z.im);
  if (im === 0) return fmtAutoNum(re);
  const a = fmtFloat(re), b = fmtFloat(Math.abs(im));
  const t = (re === 0 ? '' : a) + (im < 0 ? '-' : (re === 0 ? '' : '+')) + (Math.abs(im) === 1 ? '' : b) + 'i';
  return { html: floatHTML(t), text: t };
}
// a x^2 + b x + c = 0   (a,b,c: Val)
function solveQuadratic(a, b, c) {
  if (isZero(a)) err('DOMAIN');
  const disc = sub(mul(b, b), mul(int(4), mul(a, c)));
  const A = toNum(a), B = toNum(b), D = toNum(disc);
  const twoA = mul(int(2), a);
  if (isRat(disc) && disc.n >= 0n && a.t === 'x' && b.t === 'x') {
    const rn = iroot(disc.n, 2n), rd = iroot(disc.d, 2n);
    if (rn !== null && rd !== null) {
      const sq = X(rn, rd);
      const rr = [div(add(neg(b), sq), twoA), div(sub(neg(b), sq), twoA)].sort((u, v) => cmp(u, v));
      return { disc, roots: rr };
    }
  }
  if (D >= 0) {
    // numerisch stabil (keine Ausloeschung): q = -(B + sign(B)*sqrt(D))/2, x1 = q/A, x2 = C/q
    const s = Math.sqrt(D), Cn = toNum(c);
    const qq = -0.5 * (B + (B < 0 ? -1 : 1) * s);
    const r1 = qq === 0 ? 0 : qq / A, r2 = qq === 0 ? 0 : Cn / qq;
    return { disc, roots: [F(Math.min(r1, r2)), F(Math.max(r1, r2))] };
  }
  const s = Math.sqrt(-D) / (2 * Math.abs(A)); const re = -B / (2 * A);
  return { disc, roots: [cplx(re, s), cplx(re, -s)] };
}
function solveCubic(a, b, c, d) {
  if (isZero(a)) err('DOMAIN');
  const A = toNum(a), B = toNum(b), C = toNum(c), D = toNum(d);
  // p, q der gedrueckten Form: t^3 + p t + q = 0 (exakt, wenn moeglich)
  const three = int(3);
  const pV = div(sub(mul(three, mul(a, c)), mul(b, b)), mul(three, mul(a, a)));
  const qV = div(add(sub(mul(int(2), mul(b, mul(b, b))), mul(int(9), mul(a, mul(b, c)))), mul(int(27), mul(mul(a, a), d))), mul(int(27), mul(a, mul(a, a))));
  const p = toNum(pV), q = toNum(qV);
  const discV = add(div(mul(qV, qV), int(4)), div(mul(pV, mul(pV, pV)), int(27)));
  let sg; if (discV.t === 'x') sg = discV.n === 0n ? 0 : (discV.n > 0n ? 1 : -1); else sg = discV.v === 0 ? 0 : (discV.v > 0 ? 1 : -1);
  const shift = -B / (3 * A); const out = [];
  if (sg === 0) {
    if (p === 0 && q === 0) { out.push(cplx(shift, 0), cplx(shift, 0), cplx(shift, 0)); }
    else { const t1 = 3 * q / p, t2 = -3 * q / (2 * p); out.push(cplx(t1 + shift, 0), cplx(t2 + shift, 0), cplx(t2 + shift, 0)); }
  } else if (sg > 0) {
    const sd = Math.sqrt(toNum(discV));
    const u = Math.cbrt(-q / 2 + sd), v = Math.cbrt(-q / 2 - sd);
    out.push(cplx(u + v + shift, 0), cplx(-(u + v) / 2 + shift, (Math.sqrt(3) / 2) * (u - v)), cplx(-(u + v) / 2 + shift, -(Math.sqrt(3) / 2) * (u - v)));
  } else {
    const r = 2 * Math.sqrt(-p / 3); let cs = (3 * q / (2 * p)) * Math.sqrt(-3 / p); cs = Math.max(-1, Math.min(1, cs));
    const th = Math.acos(cs);
    for (let k = 0; k < 3; k++) out.push(cplx(r * Math.cos((th - 2 * Math.PI * k) / 3) + shift, 0));
    out.sort((x, y) => x.re - y.re);
  }
  void C; void D;
  return { roots: out };
}
// lineares System, exakt wenn moeglich. M: n x (n+1) Werte
function solveSystem(M) {
  const n = M.length; M = M.map(r => r.slice());
  for (let c = 0; c < n; c++) {
    let p = -1; for (let r = c; r < n; r++) { if (!isZero(M[r][c]) && Math.abs(toNum(M[r][c])) > 1e-300) { p = r; break; } }
    if (p < 0) err('NO UNIQUE SOLUTION');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = div(M[r][c], M[c][c]);
      for (let k = c; k <= n; k++) M[r][k] = sub(M[r][k], mul(f, M[c][k]));
    }
  }
  return M.map((r, i) => div(r[n], r[i]));
}
/* Numerische Nullstellensuche mit Unsicherheitsbewertung.
   Ein kleiner Funktionswert allein beweist keine Nullstelle. Jedes Ergebnis ist {x, confirmed, kind}:
   - confirmed=true, kind 'crossing': f wechselt das Vorzeichen (Bisektion) UND |f| schrumpft zum Treffer hin
     (Polstellen/Spruenge scheiden aus) UND beide Seiten liegen deutlich ueber dem Rundungsrauschen von f.
   - confirmed=false, kind 'touch': f beruehrt 0, ohne dass ein Vorzeichenwechsel nachweisbar ist (z. B. doppelte
     Nullstelle) oder der Wechsel nur im Rauschen liegt. Das kann auch ein Minimum knapp ueber 0 sein.
   Minima, deren Wert klar ueber der Unsicherheit liegt (Rauschen von f, Lagegenauigkeit mal Kruemmung),
   sind keine Nullstellen und werden nicht gemeldet. Bereich: rund ±3e8 (dicht um 0, dann gröber), bis zu 8 Treffer. */
const FR_EPS = 2.220446049250313e-16;
function frNoise(val, r) { // Streuung von f auf wenigen benachbarten Gleitkommazahlen = Rauschniveau
  const h = FR_EPS * Math.max(Math.abs(r), 1); let lo = Infinity, hi = -Infinity;
  for (let j = -6; j <= 6; j++) { const v = val(r + j * h); if (Number.isNaN(v)) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
  return hi >= lo ? hi - lo : 0;
}
function findRoots(f, rng) { // rng = { lo, hi }: nur dieses Intervall (dicht abgetastet), sonst grosser Standardbereich
  const out = [];
  const add1 = (x, confirmed, kind) => {
    const sc = Math.max(1, Math.abs(x));
    // Unbestaetigter Kandidat direkt neben einer bestaetigten Nullstelle: dieselbe Stelle, nicht doppelt melden
    if (!confirmed && out.some(o => o.confirmed && Math.abs(o.x - x) < 1e-6 * sc)) return;
    // gleiche Stelle (Rundungsabstand): zusammenfassen; eng benachbarte, getrennte Nullstellen bleiben getrennt
    const q = out.find(o => Math.abs(o.x - x) < (confirmed === o.confirmed ? 1e-10 : 1e-6) * sc);
    if (!q) out.push({ x, confirmed, kind });
    else if (confirmed && !q.confirmed) { q.x = x; q.confirmed = true; q.kind = kind; }
  };
  const pts = [];
  if (rng && Number.isFinite(rng.lo) && Number.isFinite(rng.hi) && rng.hi > rng.lo) { for (let k = 0; k <= 4000; k++) pts.push(rng.lo + (rng.hi - rng.lo) * k / 4000); }
  else {
    for (let k = 0; k <= 4000; k++) pts.push(-100 + k * 0.05);
    for (let e = 2; e <= 8; e++) { const lo = Math.pow(10, e); for (let k = 1; k <= 200; k++) { pts.push(lo * k / 100 + lo); pts.push(-(lo * k / 100 + lo)); } }
  }
  pts.sort((a, b) => a - b);
  const val = x => { try { const y = f(x); return Number.isFinite(y) ? y : NaN; } catch (e) { if (e && e.code === 'TIMEOUT') throw e; return NaN; } };
  const ys = pts.map(val);
  const sg = Math.sign;
  /* Vorzeichenwechsel zwischen a und b (fa, fb ungleich 0, verschiedene Vorzeichen): Bisektion + Pruefungen */
  const crossing = (a, fa, b, fb) => {
    let lo = a, hi = b, flo = fa, fhi = fb;
    for (let k = 0; k < 200; k++) {
      const m = (lo + hi) / 2, fm = val(m);
      if (Number.isNaN(fm)) return;                  // Definitionsluecke dazwischen: keine Nullstelle
      if (fm === 0) { lo = hi = m; flo = fhi = 0; break; }
      if (sg(fm) === sg(flo)) { lo = m; flo = fm; } else { hi = m; fhi = fm; }
    }
    // Polstelle/Sprung: |f| schrumpft zum Treffer hin nicht -> keine Nullstelle
    if (Math.max(Math.abs(flo), Math.abs(fhi)) > 0.01 * Math.min(Math.abs(fa), Math.abs(fb))) return;
    const r = (lo + hi) / 2;
    // Beide Seiten muessen ueber dem Rauschen von f liegen, sonst ist der Wechsel nur "unbestaetigt".
    // Abstand d von 1e-6 abwaerts probieren: dicht benachbarte Nullstellen sind erst bei kleinerem d trennbar,
    // ein Vorzeichenwechsel nur im Rundungsrauschen besteht bei keinem d.
    const sc = Math.max(1, Math.abs(r)), noise = frNoise(val, r);
    let ok = false;
    for (let e = 0; e <= 6 && !ok; e++) {
      const d = 1e-6 * sc * Math.pow(10, -e);
      const fl = val(r - d), fr = val(r + d), big = Math.max(Math.abs(fl), Math.abs(fr));
      ok = !Number.isNaN(fl) && !Number.isNaN(fr) && sg(fl) === sg(fa) && sg(fr) === sg(fb) &&
        Math.min(Math.abs(fl), Math.abs(fr)) > 8 * Math.max(noise, 4 * FR_EPS * big);
    }
    add1(r, ok, ok ? 'crossing' : 'touch');
  };
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i], y = ys[i];
    if (Number.isNaN(y)) continue;
    const py = i > 0 ? ys[i - 1] : NaN, ny = i + 1 < pts.length ? ys[i + 1] : NaN;
    if (y === 0) { // exakter Nullwert: nur mit nachweisbarem Vorzeichenwechsel bestaetigt
      const cross = !Number.isNaN(py) && !Number.isNaN(ny) && py !== 0 && ny !== 0 && sg(py) !== sg(ny);
      add1(x, cross, cross ? 'crossing' : 'touch');
      continue;
    }
    // 1) Vorzeichenwechsel zwischen zwei Stuetzstellen
    if (!Number.isNaN(py) && py !== 0 && sg(py) !== sg(y)) { crossing(pts[i - 1], py, x, y); continue; }
    // 2) lokales Minimum von |f| ohne Vorzeichenwechsel: Nullstelle gerader Vielfachheit, zwei dicht
    //    benachbarte Nullstellen oder ein Minimum, das 0 verfehlt. Wir suchen das Minimum von sg(y)*f.
    if (!Number.isNaN(py) && !Number.isNaN(ny) && sg(py) === sg(y) && sg(y) === sg(ny) &&
        Math.abs(y) <= Math.abs(py) && Math.abs(y) < Math.abs(ny)) {
      const s = sg(y), g = t => s * val(t);
      let lo = pts[i - 1], hi = pts[i + 1];
      for (let k = 0; k < 200; k++) { // Goldener Schnitt auf s*f
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        if (g(m1) < g(m2)) hi = m2; else lo = m1;
      }
      const r0 = (lo + hi) / 2, m0 = g(r0);
      if (Number.isNaN(m0)) continue;
      // Unsicherheit des Minimalwerts: Rauschen von f und Lagefehler (~sqrt(eps)*|r|) mal Kruemmung
      const d = 1e-4 * Math.max(1, Math.abs(r0)), ga = g(r0 + d), gb = g(r0 - d);
      const curv = Number.isNaN(ga) || Number.isNaN(gb) ? Infinity : Math.max(0, (ga + gb - 2 * m0) / (2 * d * d));
      const u = Math.max(frNoise(val, r0), curv * FR_EPS * Math.max(1, Math.abs(r0)) ** 2);
      if (m0 > 4 * u) continue;                                    // Minimum klar ueber 0: keine Nullstelle
      if (m0 >= -4 * u) { add1(r0, false, 'touch'); continue; }    // von 0 nicht zu unterscheiden: unbestaetigt
      crossing(pts[i - 1], py, r0, val(r0));                       // Minimum klar unter 0: f kreuzt 0 beidseits
      crossing(r0, val(r0), pts[i + 1], ny);
    }
  }
  const rank = o => (o.confirmed ? 0 : 1);
  return out.sort((a, b) => rank(a) - rank(b) || Math.abs(a.x) - Math.abs(b.x) || a.x - b.x).slice(0, 8).sort((a, b) => a.x - b.x);
}
