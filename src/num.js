/* ===== num.js : Fehler, Einstellungen, exakte/Float-Zahlen, Formatierung ===== */
class CalcError extends Error { constructor(code) { super(code); this.code = code; } }
const err = c => { throw new CalcError(c); };

const S = {
  angle: 'DEG',
  fmt: { mode: 'NORM', dec: 'F' },
  res: 'AUTO',
  frac: 'n/d',
  vars: {},
  ans: null,
  lists: { L1: [], L2: [], L3: [] },
  stat: null,
  statvars: null,
};

const babs = a => (a < 0n ? -a : a);
function bgcd(a, b) { a = babs(a); b = babs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
function isqrt(n) {
  if (n < 2n) return n;
  let x = 1n << BigInt((n.toString(2).length + 1) >> 1);
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}
// n = s^2 * m, m (moeglichst) quadratfrei
function sqrtExtract(n) {
  if (n <= 1n) return [1n, n];
  if (n < 9007199254740991n) {
    let M = Number(n), Sx = 1;
    for (let p = 2; p * p <= M && p < 3000000; p++) {
      const pp = p * p;
      while (M % pp === 0) { M /= pp; Sx *= p; }
    }
    if (M > 1) { const rt = Math.round(Math.sqrt(M)); if (rt * rt === M) { Sx *= rt; M = 1; } }
    return [BigInt(Sx), BigInt(M)];
  }
  let s = 1n, m = n;
  for (let p = 2n; p <= 100000n && p * p <= m; p += (p === 2n ? 1n : 2n)) {
    const pp = p * p;
    while (m % pp === 0n) { m /= pp; s *= p; }
  }
  const r = isqrt(m);
  if (r * r === m) { s *= r; m = 1n; }
  return [s, m];
}
function iroot(n, v) { // exakte v-te Wurzel einer BigInt >= 0 oder null
  if (n < 0n) return null;
  if (n < 2n) return n;
  const nv = Number(v);
  if (nv > 200 || n > 10n ** 60n) return null;
  let r = BigInt(Math.round(Math.pow(Number(n), 1 / nv)));
  for (let k = -2n; k <= 2n; k++) { const c = r + k; if (c >= 0n && c ** v === n) return c; }
  return null;
}

/* Wert: {t:'x', n,d, r, p}  = n/d * sqrt(r) * pi^p   (exakt)
         {t:'f', v}                                  (Dezimal) */
function X(n, d = 1n, r = 1n, p = 0) {
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return { t: 'x', n: 0n, d: 1n, r: 1n, p: 0 };
  const g = bgcd(n, d);
  if (g > 1n) { n /= g; d /= g; }
  return { t: 'x', n, d, r, p };
}
const F = v => ({ t: 'f', v });
const int = n => X(BigInt(n));
const isRat = a => a.t === 'x' && a.r === 1n && a.p === 0;
const isInt = a => isRat(a) && a.d === 1n;
const isZero = a => (a.t === 'x' ? a.n === 0n : a.v === 0);
function toNum(a) {
  if (a.t === 'f') return a.v;
  let v = Number(a.n) / Number(a.d);
  if (a.r !== 1n) v *= Math.sqrt(Number(a.r));
  if (a.p) v *= Math.pow(Math.PI, a.p);
  return v;
}
function chk(v) {
  if (!isFinite(v) || Math.abs(v) >= 1e100) err('OVERFLOW');
  return v;
}
const bigDigits = n => babs(n).toString().length;
function sizeCheck(a) { if (bigDigits(a.n) > 100 || bigDigits(a.d) > 100) err('OVERFLOW'); return a; }

const PI_X = X(1n, 1n, 1n, 1);
const ONE = int(1);
const TWO = int(2);

function neg(a) { return a.t === 'x' ? X(-a.n, a.d, a.r, a.p) : F(-a.v); }
function mulX(a, b) {
  let n = a.n * b.n; const d = a.d * b.d; const p = a.p + b.p; let r = a.r * b.r;
  if (r !== 1n) { const [s, m] = sqrtExtract(r); n *= s; r = m; }
  return sizeCheck(X(n, d, r, p));
}
function divX(a, b) {
  if (b.n === 0n) err('DIVIDE BY 0');
  let n = a.n * b.d, d = a.d * b.n; let r = a.r * b.r; const p = a.p - b.p;
  d *= b.r;
  if (r !== 1n) { const [s, m] = sqrtExtract(r); n *= s; r = m; }
  return sizeCheck(X(n, d, r, p));
}
function add(a, b) {
  if (a.t === 'x' && b.t === 'x') {
    if (a.n === 0n) return b;
    if (b.n === 0n) return a;
    if (a.r === b.r && a.p === b.p) return sizeCheck(X(a.n * b.d + b.n * a.d, a.d * b.d, a.r, a.p));
  }
  return F(chk(toNum(a) + toNum(b)));
}
const sub = (a, b) => add(a, neg(b));
function mul(a, b) {
  if (a.t === 'x' && b.t === 'x') {
    const r = mulX(a, b);
    if (r.p === 0 || r.p === 1) return r;
  }
  return F(chk(toNum(a) * toNum(b)));
}
function div(a, b) {
  if (isZero(b)) err('DIVIDE BY 0');
  if (a.t === 'x' && b.t === 'x') {
    const r = divX(a, b);
    if (r.p === 0 || r.p === 1) return r;
  }
  return F(chk(toNum(a) / toNum(b)));
}
function cmp(a, b) {
  if (isRat(a) && isRat(b)) { const l = a.n * b.d, r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; }
  const x = toNum(a), y = toNum(b); return x < y ? -1 : x > y ? 1 : 0;
}

function powInt(a, e) {
  let result = X(1n), base = a, n = e;
  while (n > 0n) {
    if (n & 1n) result = mulX(result, base);
    n >>= 1n;
    if (n > 0n) base = mulX(base, base);
  }
  return result;
}
function sqrtX(n, d) { if (n === 0n) return X(0n); const [s, m] = sqrtExtract(n * d); return X(s, d, m, 0); }
function powSigned(s, u) {
  if (babs(u) > 1000n) return null;
  let r = powInt(s, babs(u));
  if (u < 0n) r = divX(X(1n), r);
  return (r.p === 0 || r.p === 1) ? r : null;
}
function ratPow(a, b) {
  if (!isRat(a)) return null;
  const u = b.n, v = b.d;
  if (a.n < 0n) {
    if (v % 2n === 1n) { const r = ratPow(neg(a), b); if (!r) return null; return (u % 2n === 0n) ? r : neg(r); }
    err('NONREAL ANSWER');
  }
  if (v === 2n) return powSigned(sqrtX(a.n, a.d), u);
  const rn = iroot(a.n, v), rd = iroot(a.d, v);
  if (rn !== null && rd !== null) return powSigned(X(rn, rd), u);
  return null;
}
function ratApprox(v, maxDen, tol) {
  if (!isFinite(v)) return null;
  const sg = v < 0 ? -1 : 1; const x = Math.abs(v);
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
  for (let it = 0; it < 40; it++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0, k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(x - h1 / k1) <= tol * Math.max(1, x)) return { n: sg * h1, d: k1 };
    const fr = b - a; if (fr < 1e-15) break; b = 1 / fr;
  }
  return null;
}
function pow(a, b) {
  if (a.t === 'f' && a.v === Math.E) return F(chk(Math.exp(toNum(b))));
  if (a.t === 'x' && b.t === 'x') {
    if (isInt(b)) {
      const e = b.n;
      if (a.n === 0n) { if (e === 0n) err('DOMAIN'); if (e < 0n) err('DIVIDE BY 0'); return int(0); }
      if (babs(e) <= 1000n) {
        const r = powSigned(a, e);
        if (r) return r;
        if (bigDigits(a.n) * Number(babs(e)) > 400) err('OVERFLOW');
      }
    } else if (isRat(b)) {
      const ex = ratPow(a, b); if (ex) return ex;
    }
  }
  const x = toNum(a), y = toNum(b);
  if (x === 0) { if (y === 0) err('DOMAIN'); if (y < 0) err('DIVIDE BY 0'); return F(0); }
  if (x < 0 && !Number.isInteger(y)) {
    const fr = ratApprox(y, 99, 1e-12);
    if (fr && fr.d % 2 === 1) { const m = Math.pow(-x, y); return F(chk(Math.abs(fr.n) % 2 === 1 ? -m : m)); }
    err('NONREAL ANSWER');
  }
  return F(chk(Math.pow(x, y)));
}
function sqrtV(a) {
  if (a.t === 'x') {
    if (a.n < 0n) err('NONREAL ANSWER');
    if (isRat(a)) return sqrtX(a.n, a.d);
  }
  const v = toNum(a); if (v < 0) err('NONREAL ANSWER'); return F(Math.sqrt(v));
}
function absV(a) { return a.t === 'x' ? X(babs(a.n), a.d, a.r, a.p) : F(Math.abs(a.v)); }

/* ---------- Formatierung ---------- */
function sciStr(v, decs) {
  const str = v.toExponential(decs === 'F' ? 9 : decs);
  let [m, e] = str.split('e');
  if (decs === 'F' && m.indexOf('.') >= 0) m = m.replace(/\.?0+$/, '');
  return m + 'E' + parseInt(e, 10);
}
function engStr(v, decs) {
  let e = Math.floor(Math.log10(v)); let e3 = Math.floor(e / 3) * 3;
  let m = v / Math.pow(10, e3);
  let ms;
  if (decs === 'F') ms = parseFloat(m.toPrecision(10)).toString();
  else ms = m.toFixed(decs);
  if (parseFloat(ms) >= 1000) { ms = (parseFloat(ms) / 1000).toString(); e3 += 3; }
  return ms + 'E' + e3;
}
function fmtFloat(v) {
  if (v === 0) return '0';
  if (!isFinite(v)) return v > 0 ? '∞' : '-∞';
  const neg = v < 0; v = Math.abs(v);
  const { mode, dec } = S.fmt; let s;
  if (mode === 'SCI') s = sciStr(v, dec);
  else if (mode === 'ENG') s = engStr(v, dec);
  else if (dec === 'F') {
    if (v >= 1e10 || v < 1e-3) s = sciStr(v, 'F');
    else s = parseFloat(v.toPrecision(10)).toString();
  } else {
    if (v >= 1e10) s = sciStr(v, dec); else s = v.toFixed(dec);
  }
  return (neg ? '-' : '') + s;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MINUS = '−';
function floatHTML(txt) {
  let h = esc(txt).replace('E', '<span class="ee">E</span>');
  if (h[0] === '-') h = MINUS + h.slice(1);
  return h;
}
const fracHTML = (n, d) => `<span class="frac"><span class="n">${n}</span><span class="d">${d}</span></span>`;
const RAD_SVG = '<svg class="rd" viewBox="0 0 12 20" preserveAspectRatio="none"><path d="M0.6 11.5 L3 10 L6 18.6 L11.4 0.8" fill="none" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>';
const radHTML = r => `<span class="sqrt">${RAD_SVG}<span class="rb">${r}</span></span>`;

function fmtExact(v) {
  const ng = v.n < 0n, n = babs(v.n), d = v.d;
  const sT = ng ? MINUS : '';
  if (v.r === 1n && v.p === 0) {
    if (d === 1n) {
      const s = n.toString(); if (s.length > 10) return null;
      return { html: sT + s, text: sT + s };
    }
    if (n > 9999999n || d > 9999999n) return null;
    if (S.frac === 'Un/d' && n > d) {
      const w = n / d, rem = n % d;
      return { html: sT + w + fracHTML(rem, d), text: sT + w + ' ' + rem + '/' + d };
    }
    return { html: sT + fracHTML(n, d), text: sT + n + '/' + d };
  }
  if (v.r > 1000000n || n > 9999999n) return null;
  let nT = n === 1n ? '' : n.toString(), nH = nT;
  if (v.r !== 1n) { nT += '√' + v.r; nH += radHTML(v.r); }
  if (v.p === 1) { nT += 'π'; nH += 'π'; }
  if (d === 1n) return { html: sT + nH, text: sT + nT };
  if (d > 9999999n) return null;
  return { html: sT + fracHTML(nH, d), text: sT + '(' + nT + ')/' + d };
}
function fmtDMS(v) {
  let x = v.t === 'f' ? v.v : toNum(v);
  const sg = x < 0 ? '-' : ''; x = Math.abs(x);
  let d = Math.floor(x + 1e-12), rest = (x - d) * 60;
  let m = Math.floor(rest + 1e-9), s = (rest - m) * 60;
  s = Math.round(s * 100) / 100;
  if (s >= 60) { s -= 60; m += 1; } if (m >= 60) { m -= 60; d += 1; }
  const t = `${sg}${d}°${m}′${s}″`;
  return { html: esc(t), text: t };
}
// dec: true => Dezimaldarstellung erzwingen
function fmtVal(v, dec) {
  if (v.dms) return fmtDMS(v);
  if (v.baseOut) { const n = BigInt(Math.round(v.v)); const t = (n < 0n ? MINUS : '') + babs(n).toString(v.baseOut).toUpperCase() + ({ 2: '₂', 8: '₈', 16: '₁₆' })[v.baseOut]; return { html: esc(t), text: t }; }
  const plainFmt = S.fmt.mode === 'NORM' && S.fmt.dec === 'F';
  if (v.t === 'x' && !dec && !(isInt(v) && !plainFmt)) { const e = fmtExact(v); if (e) return e; }
  const t = fmtFloat(toNum(v));
  return { html: floatHTML(t), text: t.replace(/^-/, MINUS) };
}
// Text-Variante fuer Tabellen (Bruch mit Schraegstrich)
function fmtText(v, dec) { return fmtVal(v, dec).text; }
// Naeherungswert (immer dezimal, nie als Bruch) fuer numerische Loeser
function fmtApprox(x) { const t = fmtFloat(x); return { html: floatHTML(t), text: t.replace(/^-/, MINUS) }; }
// Dezimalzahl mit evtl. Bruch-Erkennung (fuer Loeser)
function fmtAutoNum(x) {
  const fr = ratApprox(x, 1000, 1e-11);
  if (fr && fr.d !== 1 && S.res === 'AUTO') return fmtVal(X(BigInt(fr.n), BigInt(fr.d)), false);
  const t = fmtFloat(x); return { html: floatHTML(t), text: t.replace(/^-/, MINUS) };
}
