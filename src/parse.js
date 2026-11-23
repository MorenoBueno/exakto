/* ===== parse.js : Token-Baum, Parser, Auswertung, Funktionen ===== */
const isOpen = k => k.charCodeAt(0) === 123;   // '{'
const isSep = k => k.charCodeAt(0) === 124;    // '|'
const isClose = k => k.charCodeAt(0) === 125;  // '}'
const isPlain = k => !(isOpen(k) || isSep(k) || isClose(k));
const kindOf = k => k.slice(1);

function buildTree(t) {
  let i = 0;
  function seq() {
    const nodes = [];
    while (i < t.length) {
      const k = t[i];
      if (isSep(k) || isClose(k)) break;
      if (isOpen(k)) {
        const node = { st: kindOf(k), parts: [], i, end: t.length };
        i++;
        for (;;) {
          const s = i; const ns = seq();
          node.parts.push({ nodes: ns, s, e: i });
          if (i >= t.length) { node.end = t.length; break; }
          const kk = t[i];
          if (isSep(kk)) { i++; continue; }
          node.end = i; i++; break;
        }
        nodes.push(node);
      } else { nodes.push({ tok: k, i }); i++; }
    }
    return nodes;
  }
  const out = [];
  while (i < t.length) {
    out.push(...seq());
    if (i < t.length) { out.push({ tok: t[i], i }); i++; }
  }
  return out;
}

/* ---------- Konstanten / Umrechnungen ---------- */
const CONSTS = {
  c: { n: 'c', name: 'Lichtgeschwindigkeit', v: 299792458 },
  g: { n: 'g', name: 'Fallbeschleunigung', v: 9.80665 },
  G: { n: 'G', name: 'Gravitationskonstante', v: 6.6743e-11 },
  h: { n: 'h', name: 'Planck-Konstante', v: 6.62607015e-34 },
  hbar: { n: 'ħ', name: 'Reduziertes Planck-Quantum', v: 1.054571817e-34 },
  qe: { n: 'qₑ', name: 'Elementarladung', v: 1.602176634e-19 },
  kB: { n: 'k', name: 'Boltzmann-Konstante', v: 1.380649e-23 },
  NA: { n: 'Nₐ', name: 'Avogadro-Konstante', v: 6.02214076e23 },
  R: { n: 'R', name: 'Gaskonstante', v: 8.314462618 },
  eps0: { n: 'ε₀', name: 'Elektrische Feldkonstante', v: 8.8541878128e-12 },
  mu0: { n: 'μ₀', name: 'Magnetische Feldkonstante', v: 1.25663706212e-6 },
  me: { n: 'mₑ', name: 'Elektronenmasse', v: 9.1093837015e-31 },
  mp: { n: 'mₚ', name: 'Protonenmasse', v: 1.67262192369e-27 },
  mn: { n: 'mₙ', name: 'Neutronenmasse', v: 1.67492749804e-27 },
  mu: { n: 'u', name: 'Atomare Masseneinheit', v: 1.6605390666e-27 },
  sigma: { n: 'σ', name: 'Stefan-Boltzmann-Konstante', v: 5.670374419e-8 },
  a0: { n: 'a₀', name: 'Bohr-Radius', v: 5.29177210903e-11 },
  Rinf: { n: 'R∞', name: 'Rydberg-Konstante', v: 10973731.56816 },
  Fd: { n: 'F', name: 'Faraday-Konstante', v: 96485.33212 },
  Vm: { n: 'Vm', name: 'Molares Gasvolumen (0 °C, 1 atm)', v: 0.022413969545 },
  alpha: { n: 'α', name: 'Feinstrukturkonstante', v: 7.2973525693e-3 },
  muB: { n: 'μB', name: 'Bohrsches Magneton', v: 9.2740100783e-24 },
  atm: { n: 'atm', name: 'Normdruck (Pa)', v: 101325 },
};
const CONVS = { // Faktor oder Funktion
  'in>cm': 2.54, 'cm>in': 1 / 2.54, 'ft>m': 0.3048, 'm>ft': 1 / 0.3048, 'yd>m': 0.9144, 'm>yd': 1 / 0.9144,
  'mi>km': 1.609344, 'km>mi': 1 / 1.609344,
  'acre>m2': 4046.8564224, 'm2>acre': 1 / 4046.8564224, 'ft2>m2': 0.09290304, 'm2>ft2': 1 / 0.09290304,
  'gal>L': 3.785411784, 'L>gal': 1 / 3.785411784, 'floz>mL': 29.5735295625, 'mL>floz': 1 / 29.5735295625,
  'oz>g': 28.349523125, 'g>oz': 1 / 28.349523125, 'lb>kg': 0.45359237, 'kg>lb': 1 / 0.45359237,
  'F>C': x => (x - 32) * 5 / 9, 'C>F': x => x * 9 / 5 + 32, 'C>K': x => x + 273.15, 'K>C': x => x - 273.15,
  'mph>kmh': 1.609344, 'kmh>mph': 1 / 1.609344, 'ms>kmh': 3.6, 'kmh>ms': 1 / 3.6,
};

/* ---------- Winkel / Trigonometrie ---------- */
const toRad = a => { const v = toNum(a); return S.angle === 'DEG' ? v * Math.PI / 180 : S.angle === 'GRAD' ? v * Math.PI / 200 : v; };
const fromRad = r => S.angle === 'DEG' ? r * 180 / Math.PI : S.angle === 'GRAD' ? r * 200 / Math.PI : r;
const R2h = X(1n, 2n, 2n), R3h = X(1n, 2n, 3n), HALF = X(1n, 2n);
const SIN_TAB = {
  0: int(0), 30: HALF, 45: R2h, 60: R3h, 90: int(1), 120: R3h, 135: R2h, 150: HALF, 180: int(0),
  210: neg(HALF), 225: neg(R2h), 240: neg(R3h), 270: int(-1), 300: neg(R3h), 315: neg(R2h), 330: neg(HALF),
};
function exactDeg(a) {
  if (a.t !== 'x') return null;
  let n, d;
  if (S.angle === 'DEG') { if (!isRat(a)) return null; n = a.n; d = a.d; }
  else if (S.angle === 'GRAD') { if (!isRat(a)) return null; n = a.n * 9n; d = a.d * 10n; }
  else { if (a.n === 0n) return 0; if (a.r !== 1n || a.p !== 1) return null; n = a.n * 180n; d = a.d; }
  if (n % d !== 0n) return null;
  return Number((((n / d) % 360n) + 360n) % 360n);
}
function sinX(a) { const k = exactDeg(a); if (k !== null && SIN_TAB[k] !== undefined) return SIN_TAB[k]; return F(Math.sin(toRad(a))); }
function cosX(a) { const k = exactDeg(a); if (k !== null) { const kk = (k + 90) % 360; if (SIN_TAB[kk] !== undefined) return SIN_TAB[kk]; } return F(Math.cos(toRad(a))); }
function tanX(a) {
  const k = exactDeg(a);
  if (k !== null && SIN_TAB[k] !== undefined) {
    const c = SIN_TAB[(k + 90) % 360]; if (isZero(c)) err('DOMAIN');
    return div(SIN_TAB[k], c);
  }
  const r = toRad(a); if (Math.abs(Math.cos(r)) < 1e-14) err('DOMAIN');
  return F(Math.tan(r));
}
function angleConv(a, unit) {
  if (unit === S.angle) return a;
  const to = S.angle;
  if (unit === 'DEG' && to === 'RAD') return mul(a, X(1n, 180n, 1n, 1));
  if (unit === 'DEG' && to === 'GRAD') return mul(a, X(10n, 9n));
  if (unit === 'GRAD' && to === 'DEG') return mul(a, X(9n, 10n));
  if (unit === 'GRAD' && to === 'RAD') return mul(a, X(1n, 200n, 1n, 1));
  const v = toNum(a); // RAD -> DEG/GRAD
  return F(to === 'DEG' ? v * 180 / Math.PI : v * 200 / Math.PI);
}

/* ---------- ganzzahlige Hilfen ---------- */
function toBig(a) {
  if (isInt(a)) return a.n;
  if (a.t === 'f' && Number.isInteger(a.v) && Math.abs(a.v) < 1e15) return BigInt(a.v);
  err('DOMAIN');
}
function factorial(a) {
  const n = toBig(a); if (n < 0n || n > 69n) err(n < 0n ? 'DOMAIN' : 'OVERFLOW');
  let r = 1n; for (let i = 2n; i <= n; i++) r *= i; return X(r);
}
function nCr(a, b) {
  const n = toBig(a), r = toBig(b); if (n < 0n || r < 0n || r > n) err('DOMAIN');
  let res = 1n; const k = r < n - r ? r : n - r;
  for (let i = 1n; i <= k; i++) { res = res * (n - k + i) / i; if (bigDigits(res) > 100) err('OVERFLOW'); }
  return X(res);
}
function nPr(a, b) {
  const n = toBig(a), r = toBig(b); if (n < 0n || r < 0n || r > n) err('DOMAIN');
  let res = 1n; for (let i = 0n; i < r; i++) { res *= (n - i); if (bigDigits(res) > 100) err('OVERFLOW'); }
  return X(res);
}
const bgcdV = (a, b) => X(bgcd(toBig(a), toBig(b)));
function lcmV(a, b) { const x = toBig(a), y = toBig(b); if (x === 0n || y === 0n) return int(0); return X(babs(x * y) / bgcd(x, y)); }
function iPartV(a) {
  if (isRat(a)) return X(a.n / a.d);
  return F(Math.trunc(toNum(a)));
}
function floorV(a) {
  if (isRat(a)) { let q = a.n / a.d; if (a.n < 0n && a.n % a.d !== 0n) q -= 1n; return X(q); }
  return F(Math.floor(toNum(a)));
}
function roundTo(v, n) {
  const m = Math.pow(10, n); const s = v < 0 ? -1 : 1;
  return s * Math.round(Math.abs(v * m) * (1 + 1e-14)) / m;
}
const lnV = a => { const v = toNum(a); if (v <= 0) err('DOMAIN'); if (isRat(a) && a.n === a.d) return int(0); return F(Math.log(v)); };
function logV(a) {
  const v = toNum(a); if (v <= 0) err('DOMAIN');
  if (isRat(a)) {
    const p10 = (x) => { let k = 0; while (x > 1n && x % 10n === 0n) { x /= 10n; k++; } return x === 1n ? k : -1; };
    if (a.d === 1n) { const k = p10(a.n); if (k >= 0) return int(k); }
    else if (a.n === 1n) { const k = p10(a.d); if (k >= 0) return int(-k); }
  }
  return F(Math.log10(v));
}
function gaussRand() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* ---------- Verteilungen ---------- */
function cdfNorm(x) {
  const xa = Math.abs(x); let c;
  if (xa > 37) c = 0;
  else {
    const e = Math.exp(-xa * xa / 2);
    if (xa < 7.07106781186547) {
      let b = 3.52624965998911e-2 * xa + 0.700383064443688;
      b = b * xa + 6.37396220353165; b = b * xa + 33.912866078383; b = b * xa + 112.079291497871;
      b = b * xa + 221.213596169931; b = b * xa + 220.206867912376;
      c = e * b;
      let d = 8.83883476483184e-2 * xa + 1.75566716318264;
      d = d * xa + 16.064177579207; d = d * xa + 86.7807322029461; d = d * xa + 296.564248779674;
      d = d * xa + 637.333633378831; d = d * xa + 793.826512519948; d = d * xa + 440.413735824752;
      c = c / d;
    } else {
      let b = xa + 0.65; b = xa + 4 / b; b = xa + 3 / b; b = xa + 2 / b; b = xa + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}
function invNormStd(p) {
  if (p <= 0 || p >= 1) err('DOMAIN');
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  let x; const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= 1 - pl) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  for (let i = 0; i < 3; i++) { // Halley-Verfeinerung
    const e = cdfNorm(x) - p; const u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    x = x - u / (1 + x * u / 2);
  }
  return x;
}
const LG = [57.1562356658629235, -59.5979603554754912, 14.1360979747417471, -0.491913816097620199, 0.339946499848118887e-4, 0.465236289270485756e-4, -0.983744753048795646e-4, 0.158088703224912494e-3, -0.210264441724104883e-3, 0.217439618115212643e-3, -0.164318106536763890e-3, 0.844182239838527433e-4, -0.261908384015814087e-4, 0.368991826595316234e-5];
function lgamma(x) {
  let y = x, tmp = x + 5.24218750000000000; tmp = (x + 0.5) * Math.log(tmp) - tmp;
  let ser = 0.999999999999997092;
  for (let j = 0; j < 14; j++) ser += LG[j] / ++y;
  return tmp + Math.log(2.5066282746310005 * ser / x);
}
function binomPmf(n, p, k) {
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
function poissPmf(mu, k) { if (k < 0) return 0; if (mu === 0) return k === 0 ? 1 : 0; return Math.exp(-mu + k * Math.log(mu) - lgamma(k + 1)); }

/* ---------- Integral / Ableitung ---------- */
const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926, 0.741531185599394439863864773280788, 0.586087235467691130294144838258730, 0.405845151377397166906606412076961, 0.207784955007898467600689403773245, 0];
const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518, 0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014, 0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975, 0.417959183673469387755102040816327];
function gk15(f, a, b) {
  const c = (a + b) / 2, h = (b - a) / 2; const fc = f(c);
  let rk = fc * WGK[7], rg = fc * WG[3];
  for (let j = 0; j < 7; j++) {
    const dx = h * XGK[j]; const f1 = f(c - dx), f2 = f(c + dx);
    rk += WGK[j] * (f1 + f2);
    if (j % 2 === 1) rg += WG[(j - 1) / 2] * (f1 + f2);
  }
  return [rk * h, Math.abs((rk - rg) * h)];
}
function integrate(f, a, b) {
  if (a === b) return 0;
  let sg = 1; if (a > b) { [a, b] = [b, a]; sg = -1; }
  const stack = [[a, b, 0]]; let total = 0; const tol = 1e-11;
  let n = 0;
  while (stack.length) {
    const [lo, hi, dep] = stack.pop();
    const [v, e] = gk15(f, lo, hi);
    if (e <= Math.max(tol * Math.abs(v), 1e-14) || dep > 40 || ++n > 20000) total += v;
    else { const m = (lo + hi) / 2; stack.push([lo, m, dep + 1], [m, hi, dep + 1]); }
  }
  return sg * total;
}
function dfridr(f, x, h) {
  const CON = 1.4, CON2 = CON * CON, NTAB = 10, SAFE = 2;
  const a = Array.from({ length: NTAB }, () => new Array(NTAB).fill(0));
  let hh = h, errv = 1e300, ans = 0;
  a[0][0] = (f(x + hh) - f(x - hh)) / (2 * hh);
  for (let i = 1; i < NTAB; i++) {
    hh /= CON; a[0][i] = (f(x + hh) - f(x - hh)) / (2 * hh);
    let fac = CON2;
    for (let j = 1; j <= i; j++) {
      a[j][i] = (a[j - 1][i] * fac - a[j - 1][i - 1]) / (fac - 1); fac = CON2 * fac;
      const et = Math.max(Math.abs(a[j][i] - a[j - 1][i]), Math.abs(a[j][i] - a[j - 1][i - 1]));
      if (et <= errv) { errv = et; ans = a[j][i]; }
    }
    if (Math.abs(a[i][i] - a[i - 1][i - 1]) >= SAFE * errv) break;
  }
  return ans;
}

/* ---------- Funktionstabelle ---------- */
const F1 = f => ({ n: [1, 1], f });
const FN = {
  sin: F1(a => sinX(a[0])), cos: F1(a => cosX(a[0])), tan: F1(a => tanX(a[0])),
  asin: F1(a => { const v = toNum(a[0]); if (Math.abs(v) > 1) err('DOMAIN'); return F(fromRad(Math.asin(v))); }),
  acos: F1(a => { const v = toNum(a[0]); if (Math.abs(v) > 1) err('DOMAIN'); return F(fromRad(Math.acos(v))); }),
  atan: F1(a => F(fromRad(Math.atan(toNum(a[0]))))),
  sinh: F1(a => F(chk(Math.sinh(toNum(a[0]))))), cosh: F1(a => F(chk(Math.cosh(toNum(a[0]))))), tanh: F1(a => F(Math.tanh(toNum(a[0])))),
  asinh: F1(a => F(Math.asinh(toNum(a[0])))),
  acosh: F1(a => { const v = toNum(a[0]); if (v < 1) err('DOMAIN'); return F(Math.acosh(v)); }),
  atanh: F1(a => { const v = toNum(a[0]); if (Math.abs(v) >= 1) err('DOMAIN'); return F(Math.atanh(v)); }),
  ln: F1(a => lnV(a[0])), log: F1(a => logV(a[0])),
  abs: F1(a => absV(a[0])),
  round: { n: [1, 2], f: a => { const n = a.length > 1 ? toNum(a[1]) : 9; if (!Number.isInteger(n) || n < 0 || n > 9) err('DOMAIN'); return F(roundTo(toNum(a[0]), n)); } },
  iPart: F1(a => iPartV(a[0])),
  fPart: F1(a => sub(a[0], iPartV(a[0]))),
  int: F1(a => floorV(a[0])),
  min: { n: [2, 2], f: a => (cmp(a[0], a[1]) <= 0 ? a[0] : a[1]) },
  max: { n: [2, 2], f: a => (cmp(a[0], a[1]) >= 0 ? a[0] : a[1]) },
  lcm: { n: [2, 2], f: a => lcmV(a[0], a[1]) },
  gcd: { n: [2, 2], f: a => bgcdV(a[0], a[1]) },
  remainder: { n: [2, 2], f: a => { if (isZero(a[1])) err('DIVIDE BY 0'); if (isInt(a[0]) && isInt(a[1])) return X(a[0].n % a[1].n); const x = toNum(a[0]), y = toNum(a[1]); return F(x - y * Math.trunc(x / y)); } },
  'P▶Rx': { n: [2, 2], f: a => F(toNum(a[0]) * Math.cos(toRad(a[1]))) },
  'P▶Ry': { n: [2, 2], f: a => F(toNum(a[0]) * Math.sin(toRad(a[1]))) },
  'R▶Pr': { n: [2, 2], f: a => F(Math.hypot(toNum(a[0]), toNum(a[1]))) },
  'R▶Pθ': { n: [2, 2], f: a => F(fromRad(Math.atan2(toNum(a[1]), toNum(a[0])))) },
  randInt: { n: [2, 2], f: a => { const lo = Number(toBig(a[0])), hi = Number(toBig(a[1])); if (hi < lo) err('DOMAIN'); return int(lo + Math.floor(Math.random() * (hi - lo + 1))); } },
  randNorm: { n: [2, 2], f: a => F(toNum(a[0]) + toNum(a[1]) * gaussRand()) },
  randBin: { n: [2, 2], f: a => { const n = Number(toBig(a[0])), p = toNum(a[1]); if (p < 0 || p > 1 || n < 0) err('DOMAIN'); let k = 0; for (let i = 0; i < n; i++) if (Math.random() < p) k++; return int(k); } },
  normalPdf: { n: [1, 3], f: a => { const x = toNum(a[0]), m = a.length > 1 ? toNum(a[1]) : 0, s = a.length > 2 ? toNum(a[2]) : 1; if (s <= 0) err('DOMAIN'); const z = (x - m) / s; return F(Math.exp(-z * z / 2) / (s * Math.sqrt(2 * Math.PI))); } },
  normalCdf: { n: [2, 4], f: a => { const lo = toNum(a[0]), hi = toNum(a[1]), m = a.length > 2 ? toNum(a[2]) : 0, s = a.length > 3 ? toNum(a[3]) : 1; if (s <= 0) err('DOMAIN'); return F(cdfNorm((hi - m) / s) - cdfNorm((lo - m) / s)); } },
  invNorm: { n: [1, 3], f: a => { const p = toNum(a[0]), m = a.length > 1 ? toNum(a[1]) : 0, s = a.length > 2 ? toNum(a[2]) : 1; if (s <= 0) err('DOMAIN'); return F(m + s * invNormStd(p)); } },
  binomPdf: { n: [3, 3], f: a => { const n = Number(toBig(a[0])), p = toNum(a[1]), k = Number(toBig(a[2])); if (p < 0 || p > 1 || n < 0) err('DOMAIN'); return F(binomPmf(n, p, k)); } },
  binomCdf: { n: [3, 3], f: a => { const n = Number(toBig(a[0])), p = toNum(a[1]), k = Number(toBig(a[2])); if (p < 0 || p > 1 || n < 0) err('DOMAIN'); let s = 0; for (let i = 0; i <= Math.min(k, n); i++) s += binomPmf(n, p, i); return F(Math.min(1, s)); } },
  poissonPdf: { n: [2, 2], f: a => { const m = toNum(a[0]); if (m < 0) err('DOMAIN'); return F(poissPmf(m, Number(toBig(a[1])))); } },
  poissonCdf: { n: [2, 2], f: a => { const m = toNum(a[0]); if (m < 0) err('DOMAIN'); const k = Number(toBig(a[1])); let s = 0; for (let i = 0; i <= k; i++) s += poissPmf(m, i); return F(Math.min(1, s)); } },
  geometPdf: { n: [2, 2], f: a => { const p = toNum(a[0]), k = Number(toBig(a[1])); if (p <= 0 || p > 1) err('DOMAIN'); return F(k < 1 ? 0 : p * Math.pow(1 - p, k - 1)); } },
  geometCdf: { n: [2, 2], f: a => { const p = toNum(a[0]), k = Number(toBig(a[1])); if (p <= 0 || p > 1) err('DOMAIN'); return F(k < 1 ? 0 : 1 - Math.pow(1 - p, k)); } },
};
const VARS = ['x', 'y', 'z', 't', 'a', 'b', 'c', 'd'];
const isVarTok = k => VARS.indexOf(k) >= 0;
const fnName = k => (k.length > 1 && k[k.length - 1] === '(' ? k.slice(0, -1) : null);
const isDigit = k => k.length === 1 && k >= '0' && k <= '9';
const isHexTok = k => /^h[A-F]$/.test(k);
const BASE_SFX = { 'ᵇ': 2, 'ᵒ': 8, 'ʰ': 16, 'ᵈ': 10 };

/* ---------- Parser ---------- */
class Parser {
  constructor(nodes) { this.ns = nodes; this.i = 0; }
  peek() { return this.ns[this.i]; }
  isTok(n, s) { return n && n.tok === s; }
  startsPrimary(n) {
    if (!n) return false;
    if (n.st) return n.st !== 'pow';
    const k = n.tok;
    return isDigit(k) || isHexTok(k) || k === '.' || k === '(' || k === 'π' || k === 'e' || k === 'Ans' || isVarTok(k) ||
      k === 'rand' || k.startsWith('K:') || k.startsWith('SV:') || (fnName(k) !== null && FN[fnName(k)] !== undefined);
  }
  parseAll() { const e = this.parseExpr(); if (this.i < this.ns.length) err('SYNTAX'); return e; }
  parseExpr() { return this.parseAdd(); }
  parseAdd() {
    let l = this.parseMul();
    for (;;) {
      const n = this.peek();
      if (n && (this.isTok(n, '+') || this.isTok(n, '-'))) { this.i++; const r = this.parseMul(); l = { k: 'bin', op: n.tok, a: l, b: r }; }
      else return l;
    }
  }
  parseMul() {
    let l = this.parsePerm();
    for (;;) {
      const n = this.peek();
      if (!n) return l;
      if (this.isTok(n, '×') || this.isTok(n, '÷')) { this.i++; const r = this.parsePerm(); l = { k: 'bin', op: n.tok, a: l, b: r }; }
      else if (this.startsPrimary(n)) { const r = this.parsePerm(); l = { k: 'bin', op: '×', a: l, b: r }; }
      else return l;
    }
  }
  parsePerm() {
    let l = this.parseUnary();
    for (;;) {
      const n = this.peek();
      if (n && (this.isTok(n, 'nPr') || this.isTok(n, 'nCr'))) { this.i++; const r = this.parseUnary(); l = { k: 'bin', op: n.tok, a: l, b: r }; }
      else return l;
    }
  }
  parseUnary() {
    const n = this.peek();
    if (this.isTok(n, '-')) { this.i++; return { k: 'neg', a: this.parseUnary() }; }
    if (this.isTok(n, '+')) { this.i++; return this.parseUnary(); }
    return this.parsePostfix();
  }
  parsePostfix() {
    let p = this.parsePrimary();
    for (;;) {
      const n = this.peek();
      if (!n) return p;
      if (n.st === 'pow') { this.i++; p = { k: 'pow', a: p, e: this.sub(n.parts[0]) }; }
      else if (n.tok === '!' || n.tok === '%' || n.tok === '°' || n.tok === 'ʳ' || n.tok === 'ᵍ' || n.tok === '▶DMS' || n.tok === '▶Bin' || n.tok === '▶Oct' || n.tok === '▶Dec' || n.tok === '▶Hex' || (n.tok && n.tok.startsWith('U:'))) { this.i++; p = { k: 'post', op: n.tok, a: p }; }
      else return p;
    }
  }
  sub(part) { if (!part.nodes.length) err('SYNTAX'); return new Parser(part.nodes).parseAll(); }
  parseArgs() {
    const args = [];
    if (this.isTok(this.peek(), ')')) { this.i++; return args; }
    for (;;) {
      args.push(this.parseExpr());
      const n = this.peek();
      if (!n) return args;
      if (this.isTok(n, ',')) { this.i++; continue; }
      if (this.isTok(n, ')')) { this.i++; return args; }
      err('SYNTAX');
    }
  }
  parsePrimary() {
    const n0 = this.ns[this.i];
    if (n0 && n0.tok !== undefined && (isDigit(n0.tok) || isHexTok(n0.tok))) {
      let j = this.i, run = '';
      while (j < this.ns.length && this.ns[j].tok !== undefined && (isDigit(this.ns[j].tok) || isHexTok(this.ns[j].tok))) { const t = this.ns[j].tok; run += isHexTok(t) ? t[1] : t; j++; }
      const sf = this.ns[j];
      if (sf && sf.tok !== undefined && BASE_SFX[sf.tok]) {
        const base = BASE_SFX[sf.tok]; let val = 0n;
        for (const ch of run) { const d = parseInt(ch, 16); if (d >= base) err('SYNTAX'); val = val * BigInt(base) + BigInt(d); }
        this.i = j + 1; return { k: 'num', v: X(val) };
      }
      if (/[A-F]/.test(run)) err('SYNTAX');
    }
    const n = this.ns[this.i++];
    if (!n) err('SYNTAX');
    if (n.st) {
      const P = n.parts;
      switch (n.st) {
        case 'frac': return { k: 'frac', n: this.sub(P[0]), d: this.sub(P[1]) };
        case 'mix': return { k: 'mix', w: this.sub(P[0]), n: this.sub(P[1]), d: this.sub(P[2]) };
        case 'sqrt': return { k: 'sqrt', a: this.sub(P[0]) };
        case 'root': return { k: 'root', i: this.sub(P[0]), a: this.sub(P[1]) };
        case 'abs': return { k: 'fn', name: 'abs', args: [this.sub(P[0])] };
        case 'sum': case 'prod': return { k: n.st, body: this.sub(P[0]), v: this.varName(P[1]), from: this.sub(P[2]), to: this.sub(P[3]) };
        case 'int': return { k: 'int', body: this.sub(P[0]), v: this.varName(P[1]), lo: this.sub(P[2]), hi: this.sub(P[3]) };
        case 'deriv': return { k: 'deriv', body: this.sub(P[0]), v: this.varName(P[1]), at: this.sub(P[2]) };
        default: err('SYNTAX');
      }
    }
    const k = n.tok;
    if (isDigit(k) || k === '.') {
      let s = k;
      for (;;) { const m = this.peek(); if (m && m.tok !== undefined && (isDigit(m.tok) || m.tok === '.')) { s += m.tok; this.i++; } else break; }
      if ((s.match(/\./g) || []).length > 1 || s === '.') err('SYNTAX');
      const m = this.peek();
      if (m && m.tok === 'E') {
        this.i++; let es = '';
        const sg = this.peek(); if (sg && (sg.tok === '-' || sg.tok === '+')) { if (sg.tok === '-') es = '-'; this.i++; }
        let ds = '';
        for (;;) { const q = this.peek(); if (q && q.tok !== undefined && isDigit(q.tok)) { ds += q.tok; this.i++; } else break; }
        if (!ds) err('SYNTAX');
        return { k: 'num', v: F(chk(Number(s + 'e' + es + ds))) };
      }
      if (s.indexOf('.') >= 0) return { k: 'num', v: F(Number(s)) };
      return { k: 'num', v: X(BigInt(s)) };
    }
    if (k === '(') { const e = this.parseExpr(); const m = this.peek(); if (this.isTok(m, ')')) this.i++; else if (m) err('SYNTAX'); return e; }
    if (k === 'π') return { k: 'const', v: PI_X };
    if (k === 'e') return { k: 'const', v: F(Math.E) };
    if (k === 'Ans') return { k: 'ans' };
    if (k === 'rand') return { k: 'rand' };
    if (isVarTok(k)) return { k: 'var', name: k };
    if (k.startsWith('K:')) { const c = CONSTS[k.slice(2)]; if (!c) err('SYNTAX'); return { k: 'const', v: F(c.v) }; }
    if (k.startsWith('SV:')) return { k: 'sv', name: k.slice(3) };
    const fnn = fnName(k);
    if (fnn && FN[fnn]) {
      const args = this.parseArgs(); const spec = FN[fnn];
      if (args.length < spec.n[0] || args.length > spec.n[1]) err('SYNTAX');
      return { k: 'fn', name: fnn, args };
    }
    err('SYNTAX');
  }
  varName(part) {
    const ns = part.nodes;
    if (ns.length !== 1 || ns[0].tok === undefined || !isVarTok(ns[0].tok)) err('SYNTAX');
    return ns[0].tok;
  }
}

const MAX_TOKENS = 2000;
function parseTokens(tokens) {
  if (tokens.length > MAX_TOKENS) err('TOO COMPLEX');
  let tree;
  try {
    tree = buildTree(tokens);
    if (!tree.length) err('SYNTAX');
    return new Parser(tree).parseAll();
  } catch (e) { if (e instanceof RangeError) err('TOO COMPLEX'); throw e; }
}

/* ---------- Auswertung ---------- */
const lookupVar = (name, cx) => {
  if (cx && cx.local && cx.local[name] !== undefined) return cx.local[name];
  return S.vars[name] || int(0);
};
function withLocal(cx, name, val) { const l = Object.assign({}, cx && cx.local); l[name] = val; return { local: l }; }
function ev(n, cx) {
  switch (n.k) {
    case 'num': case 'const': return n.v;
    case 'var': return lookupVar(n.name, cx);
    case 'ans': return S.ans || int(0);
    case 'rand': return F(Math.random());
    case 'sv': { if (!S.statvars || S.statvars[n.name] === undefined) err('STAT'); return F(S.statvars[n.name]); }
    case 'neg': return neg(ev(n.a, cx));
    case 'bin': {
      const a = ev(n.a, cx), b = ev(n.b, cx);
      switch (n.op) {
        case '+': return add(a, b); case '-': return sub(a, b); case '×': return mul(a, b); case '÷': return div(a, b);
        case 'nPr': return nPr(a, b); case 'nCr': return nCr(a, b);
      }
      err('SYNTAX'); break;
    }
    case 'pow': return pow(ev(n.a, cx), ev(n.e, cx));
    case 'post': {
      const a = ev(n.a, cx);
      switch (n.op) {
        case '!': return factorial(a);
        case '%': return div(a, int(100));
        case '°': return angleConv(a, 'DEG');
        case 'ʳ': return angleConv(a, 'RAD');
        case 'ᵍ': return angleConv(a, 'GRAD');
        case '▶DMS': { const r = F(toNum(a)); r.dms = true; return r; }
        case '▶Bin': case '▶Oct': case '▶Hex': { const r = F(Number(toBig(a))); r.baseOut = n.op === '▶Bin' ? 2 : n.op === '▶Oct' ? 8 : 16; return r; }
        case '▶Dec': return X(toBig(a));
        default: { const f = CONVS[n.op.slice(2)]; if (f === undefined) err('SYNTAX'); const v = toNum(a); return F(chk(typeof f === 'function' ? f(v) : v * f)); }
      }
    }
    case 'frac': return div(ev(n.n, cx), ev(n.d, cx));
    case 'mix': return add(ev(n.w, cx), div(ev(n.n, cx), ev(n.d, cx)));
    case 'sqrt': return sqrtV(ev(n.a, cx));
    case 'root': { const i = ev(n.i, cx); if (isZero(i)) err('DOMAIN'); return pow(ev(n.a, cx), div(ONE, i)); }
    case 'fn': {
      const args = n.args.map(a => ev(a, cx));
      return FN[n.name].f(args);
    }
    case 'sum': case 'prod': {
      const lo = toBig(ev(n.from, cx)), hi = toBig(ev(n.to, cx));
      if (hi - lo > 1000000n) err('OVERFLOW');
      let acc = n.k === 'sum' ? int(0) : int(1);
      for (let k = lo; k <= hi; k++) { const v = ev(n.body, withLocal(cx, n.v, X(k))); acc = n.k === 'sum' ? add(acc, v) : mul(acc, v); }
      return acc;
    }
    case 'int': {
      const lo = toNum(ev(n.lo, cx)), hi = toNum(ev(n.hi, cx));
      const f = x => toNum(ev(n.body, withLocal(cx, n.v, F(x))));
      return F(chk(integrate(f, lo, hi)));
    }
    case 'deriv': {
      const x0 = toNum(ev(n.at, cx));
      const f = x => toNum(ev(n.body, withLocal(cx, n.v, F(x))));
      return F(chk(dfridr(f, x0, x0 === 0 ? 0.1 : 0.1 * Math.abs(x0))));
    }
  }
  err('SYNTAX');
}

// Wertet eine Token-Liste aus. Speichern: "...→x"
function evalTokens(tokens, opts) {
  let t = tokens, store = null;
  const k = t.lastIndexOf('→');
  if (k >= 0) { if (k === t.length - 2 && isVarTok(t[k + 1])) { store = t[k + 1]; t = t.slice(0, k); } else err('SYNTAX'); }
  const ast = parseTokens(t);
  let v;
  try { v = ev(ast, (opts && opts.cx) || null); } catch (e) { if (e instanceof RangeError) err('TOO COMPLEX'); throw e; }
  if (store) S.vars[store] = v;
  return v;
}
function compileTokens(tokens) { return parseTokens(tokens); }
function evalAst(ast, local) { return ev(ast, local ? { local } : null); }
