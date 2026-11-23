/* ===== eng.js : Elektrotechnik, SI-Praefixe, Einheitenpruefung (reine Logik) ===== */
const ENG = (function () {
  const PRE = { f: -15, p: -12, n: -9, 'µ': -6, m: -3, k: 3, M: 6, G: 9, T: 12 };
  const SYM = { '-15': 'f', '-12': 'p', '-9': 'n', '-6': 'µ', '-3': 'm', '0': '', '3': 'k', '6': 'M', '9': 'G', '12': 'T' };
  const KNOWN = ['V', 'A', 'Ω', 'W', 'F', 'H', 'Hz', 's', 'VA', 'var', '°'];
  const ALIAS = { Ω: ['Ω', 'Ohm', 'ohm', 'OHM'], V: ['V'], A: ['A'], W: ['W'], F: ['F'], H: ['H'], Hz: ['Hz'], s: ['s'], VA: ['VA'], var: ['var'] };
  class EngError extends Error { constructor(code, detail) { super(code + (detail ? ': ' + detail : '')); this.code = code; this.detail = detail || ''; } }
  const fail = (c, d) => { throw new EngError(c, d); };

  /* "4.7k", "4,7 kΩ", "100n", "47µ", "47u", "330m" -> Zahl; unit = erwartete Einheit (oder '') */
  function parseSI(text, unit) {
    let t = String(text == null ? '' : text).replace(/μ/g, 'µ').replace(/µ/g, 'µ').replace(/\s+/g, ' ').trim();
    if (t === '') fail('EMPTY');
    const m = /^([+-]?(?:\d+[.,]?\d*|[.,]\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/.exec(t);
    if (!m) fail('SYNTAX', t);
    const num = parseFloat(m[1].replace(',', '.')); let rest = m[2].trim();
    let found = false;
    if (unit) for (const a of (ALIAS[unit] || [unit])) if (rest.endsWith(a) && (rest.length === a.length || !/[A-Za-zΩµ]/.test(rest[rest.length - a.length - 1] || '') || true)) {
      const before = rest.slice(0, rest.length - a.length).trim();
      if (before === '' || (before.length === 1 && (PRE[before] !== undefined || before === 'u'))) { rest = before; found = true; break; }
    }
    if (!found && rest !== '' && !(rest.length === 1 && (PRE[rest] !== undefined || rest === 'u'))) {
      if (rest === 'K') fail('PREFIX', 'K (Kilo = k)');
      // eine andere bekannte Einheit?
      for (const k of KNOWN) { for (const a of (ALIAS[k] || [k])) { if (rest === a || (rest.endsWith(a) && (PRE[rest.slice(0, rest.length - a.length)] !== undefined))) fail('UNIT', rest + ' ≠ ' + (unit || '')); } }
      fail('SYNTAX', rest);
    }
    const pk = rest === 'u' ? 'µ' : rest;
    const exp = pk === '' ? 0 : PRE[pk];
    const v = num * Math.pow(10, exp);
    if (!Number.isFinite(v)) fail('OVERFLOW');
    return v;
  }

  /* Zahl -> "48.94 mA" (sig = signifikante Stellen) */
  function fmtSI(v, unit, sig) {
    sig = sig || 4; unit = unit || '';
    if (!Number.isFinite(v)) return '∞ ' + unit;
    if (v === 0) return '0 ' + unit;
    let e = Math.floor(Math.log10(Math.abs(v)) / 3) * 3; e = Math.max(-15, Math.min(12, e));
    let mant = Number((v / Math.pow(10, e)).toPrecision(sig));
    if (Math.abs(mant) >= 1000 && e < 12) { e += 3; mant = Number((v / Math.pow(10, e)).toPrecision(sig)); }
    let s = String(mant); if (/e/i.test(s)) s = mant.toPrecision(sig);
    return s.replace('-', '−') + ' ' + (SYM[String(e)] || '') + unit;
  }

  const pos = (x, n) => { if (!(x > 0)) fail('POSITIVE', n); };
  /* Ohmsches Gesetz: zwei von U, I, R, P gegeben -> alle vier */
  function ohm(g) {
    const have = ['U', 'I', 'R', 'P'].filter(k => g[k] !== undefined && g[k] !== null);
    if (have.length !== 2) fail('TWO_VALUES');
    let { U, I, R, P } = g; const k = have.join('');
    const nz = (x, n) => { if (x === 0) fail('ZERO', n); };
    if (k === 'UI') { nz(I, 'I'); R = U / I; P = U * I; }
    else if (k === 'UR') { nz(R, 'R'); I = U / R; P = U * U / R; }
    else if (k === 'IR') { U = I * R; P = I * I * R; }
    else if (k === 'UP') { nz(U, 'U'); I = P / U; nz(I, 'I'); R = U * U / P; }
    else if (k === 'IP') { nz(I, 'I'); U = P / I; R = P / (I * I); }
    else if (k === 'RP') { if (R * P < 0) fail('NEGATIVE'); nz(R, 'R'); U = Math.sqrt(P * R); I = Math.sqrt(P / R); }
    return { U, I, R, P };
  }
  /* unbelasteter Spannungsteiler */
  function divider(Uin, R1, R2) {
    if (R1 + R2 === 0) fail('ZERO', 'R1+R2');
    return { Uout: Uin * R2 / (R1 + R2), I: Uin / (R1 + R2), ratio: R2 / (R1 + R2) };
  }
  /* Reihen-RLC bei Frequenz f (sinusfoermig, eingeschwungen, Effektivwerte) */
  function rlc(o) {
    const { f, R, L, C, U } = o; pos(f, 'f');
    const w = 2 * Math.PI * f;
    const XL = L > 0 ? w * L : 0, XC = C > 0 ? 1 / (w * C) : 0;
    const X = XL - XC, Z = Math.hypot(R || 0, X), phi = Math.atan2(X, R || 0) * 180 / Math.PI;
    const out = { w, XL, XC, X, Z, phi };
    if (L > 0 && C > 0) out.f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
    if (U !== undefined && U !== null && Z > 0) {
      const I = U / Z, S = U * I, P = S * Math.cos(phi * Math.PI / 180), Q = S * Math.sin(phi * Math.PI / 180);
      Object.assign(out, { I, S, P, Q });
    }
    return out;
  }
  return { parseSI, fmtSI, ohm, divider, rlc, EngError };
})();
