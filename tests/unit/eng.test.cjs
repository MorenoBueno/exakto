const { ENG } = require('../../dist/core.cjs');
let pass = 0, fail = 0;
const eq = (n, g, w) => { if (g === w) pass++; else { fail++; console.log('FAIL', n, 'got', JSON.stringify(g), 'want', JSON.stringify(w)); } };
const near = (n, g, w, rtol = 1e-12) => { if (Math.abs(g - w) <= rtol * Math.abs(w)) pass++; else { fail++; console.log('FAIL', n, g, w); } };
const code = f => { try { f(); return 'no error'; } catch (e) { return e.code; } };
// Praefixe (Gross-/Kleinschreibung relevant: m = milli, M = mega)
eq('4.7k', ENG.parseSI('4.7k', 'Ω'), 4700); eq('2.2M', ENG.parseSI('2.2M', 'Ω'), 2200000);
near('100n', ENG.parseSI('100n', 'F'), 1e-7); near('47µ', ENG.parseSI('47µ', 'F'), 47e-6); near('47u', ENG.parseSI('47u', 'F'), 47e-6);
near('47μ (Greek mu)', ENG.parseSI('47μF', 'F'), 47e-6); near('330m', ENG.parseSI('330m', 'V'), 0.33);
eq('4.7 kΩ', ENG.parseSI('4.7 kΩ', 'Ω'), 4700); eq('4,7kOhm', ENG.parseSI('4,7kOhm', 'Ω'), 4700);
eq('230 V', ENG.parseSI('230 V', 'V'), 230); eq('5 mA', ENG.parseSI('5 mA', 'A'), 0.005);
eq('K verboten', code(() => ENG.parseSI('4.7K', 'Ω')), 'PREFIX');
eq('Einheitenfehler V<-A', code(() => ENG.parseSI('5 A', 'V')), 'UNIT');
eq('Einheitenfehler V<-mA', code(() => ENG.parseSI('5 mA', 'V')), 'UNIT');
eq('leer', code(() => ENG.parseSI('', 'V')), 'EMPTY'); eq('Unsinn', code(() => ENG.parseSI('abc', 'V')), 'SYNTAX');
// Formatierung
eq('fmt mA', ENG.fmtSI(230 / 4700, 'A', 10), '48.93617021 mA');
eq('fmt kΩ', ENG.fmtSI(4700, 'Ω'), '4.7 kΩ'); eq('fmt µF', ENG.fmtSI(47e-6, 'F'), '47 µF'); eq('fmt 0', ENG.fmtSI(0, 'V'), '0 V');
eq('fmt Rundung 999.96', ENG.fmtSI(999.96, 'V', 4), '1 kV'); eq('fmt negativ', ENG.fmtSI(-0.0025, 'A'), '−2.5 mA');
// 230 V / 4.7 kΩ ≈ 48.93617021 mA
{ const r = ENG.ohm({ U: ENG.parseSI('230 V', 'V'), R: ENG.parseSI('4.7 kΩ', 'Ω') }); near('I', r.I, 0.04893617021, 1e-10); near('P', r.P, 230 * 230 / 4700); }
// alle Paare konsistent
for (const [a, b] of [['U', 'I'], ['U', 'R'], ['I', 'R'], ['U', 'P'], ['I', 'P'], ['R', 'P']]) {
  const ref = { U: 12, I: 0.5, R: 24, P: 6 }; const r = ENG.ohm({ [a]: ref[a], [b]: ref[b] });
  for (const k of 'UIRP') near('ohm ' + a + b + ' ' + k, r[k], ref[k], 1e-12);
}
eq('ohm 3 Werte', code(() => ENG.ohm({ U: 1, I: 1, R: 1 })), 'TWO_VALUES'); eq('ohm I=0', code(() => ENG.ohm({ U: 5, I: 0 })), 'ZERO');
// Spannungsteiler
{ const d = ENG.divider(12, 10000, 5000); near('divider', d.Uout, 4, 1e-12); }
// RLC: R=10 Ω, L=10 mH, C=100 µF, f=50 Hz
{ const r = ENG.rlc({ f: 50, R: 10, L: 0.01, C: 100e-6, U: 230 }); near('XL', r.XL, 2 * Math.PI * 50 * 0.01); near('XC', r.XC, 1 / (2 * Math.PI * 50 * 100e-6));
  near('Z', r.Z, Math.hypot(10, r.XL - r.XC)); near('f0', r.f0, 1 / (2 * Math.PI * Math.sqrt(0.01 * 100e-6)));
  near('S^2=P^2+Q^2', r.S * r.S, r.P * r.P + r.Q * r.Q, 1e-9); }
{ const r = ENG.rlc({ f: 1 / (2 * Math.PI * Math.sqrt(0.01 * 100e-6)), R: 10, L: 0.01, C: 100e-6 }); near('Resonanz X=0', Math.abs(r.X) < 1e-9 ? 0 : r.X, 0, 1); eq('Resonanz phi', Math.abs(r.phi) < 1e-6, true); }
console.log(`eng pass=${pass} fail=${fail}`); if (fail) process.exit(1);
