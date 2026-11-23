// Abnahmetests aus der Projektvision (Kapitel "Tests, die Vertrauen schaffen")
const C = require('../../dist/core.cjs');
let pass = 0, fail = 0;
const eq = (n, got, want) => { if (got === want) pass++; else { fail++; console.log('FAIL', n, 'got', JSON.stringify(got), 'want', JSON.stringify(want)); } };
const near = (n, got, want, atol, rtol = 0) => { if (Math.abs(got - want) <= atol + rtol * Math.abs(want)) pass++; else { fail++; console.log('FAIL', n, 'got', got, 'want', want); } };
const T = s => { const o = []; let i = 0; while (i < s.length) { const m = s.slice(i).match(/^(asin\(|acos\(|atan\(|sinh\(|cosh\(|tanh\(|sin\(|cos\(|tan\(|ln\(|log\(|abs\(|Ans)/); if (m) { o.push(m[1]); i += m[1].length; } else { o.push(s[i]); i++; } } return o; };
const ev = (t, d) => { try { return C.fmtVal(C.evalTokens(t), d).text; } catch (e) { return 'ERR:' + (e.code || e.message); } };
const sq = x => ['{sqrt', ...T(x), '}sqrt'];

eq('0.1+0.2', ev(T('0.1+0.2')), '0.3');
eq('1/3+1/6', ev(T('1÷3+1÷6')), '1/2');
eq('sqrt(72)', ev(sq('72')), '6√2');
eq('sin(60°) exakt', ev(T('sin(60°)')), '(√3)/2');
eq('sin(180°)', ev(T('sin(180°)')), '0');
eq('tan(90°)', ev(T('tan(90°)')), 'ERR:DOMAIN');
eq('1/0', ev(T('1÷0')), 'ERR:DIVIDE BY 0');
eq('sqrt(-1) reell', ev(sq('-1')), 'ERR:NONREAL ANSWER');
eq('-2^2', ev(['-', '2', '{pow', '2', '}pow']), '−4');
eq('(-2)^2', ev(['(', '-', '2', ')', '{pow', '2', '}pow']), '4');
eq('2^3^2 rechtsassoziativ', ev(['2', '{pow', '3', '{pow', '2', '}pow', '}pow']), '512');
near('Integral x^2 0..1', C.toNum(C.evalTokens(['{int', 'x', '{pow', '2', '}pow', '|int', 'x', '|int', '0', '|int', '1', '}int'])), 1 / 3, 1e-10);
// Numerischer Loeser: bestaetigt nur bei nachweisbarem Vorzeichenwechsel; Beruehrpunkte nur "unbestaetigt"
{ const r = C.findRoots(x => (x - 0.123) ** 2);
  eq('Doppelwurzel: genau ein Kandidat', r.length, 1); near('Doppelwurzel Lage', r[0].x, 0.123, 1e-8);
  eq('Doppelwurzel NICHT bestaetigt', r[0].confirmed, false); eq('Doppelwurzel Art', r[0].kind, 'touch'); }
eq('positives Minimum (x-0.123)^2+1e-14: keine Nullstelle', C.findRoots(x => (x - 0.123) ** 2 + 1e-14).length, 0);
eq('positives Minimum +1e-10: keine Nullstelle', C.findRoots(x => (x - 0.123) ** 2 + 1e-10).length, 0);
eq('positives Minimum +1e-6: keine Nullstelle', C.findRoots(x => (x - 0.123) ** 2 + 1e-6).length, 0);
eq('negatives Minimum: zwei bestaetigte Nullstellen', C.findRoots(x => (x - 0.123) ** 2 - 1e-14).filter(r => r.confirmed).length, 2);
eq('Polstelle keine Nullstelle', C.findRoots(x => 1 / (x - 0.123)).length, 0);
eq('Polstelle 1/(x-0.123)^2 keine Nullstelle', C.findRoots(x => 1 / (x - 0.123) ** 2).length, 0);
eq('tan: nur Nullstellen, keine Polstellen bestaetigt', C.findRoots(x => Math.tan(x)).filter(r => Math.abs(r.x) < 3.5).map(r => Math.round(r.x / Math.PI * 1e6) / 1e6).join(','), '-1,0,1');
eq('Sprung sign(x-0.5) ohne Wert 0: keine Nullstelle', C.findRoots(x => (x < 0.5 ? -1 : 1)).length, 0);
{ const r = C.findRoots(x => x * x * x - 3 * x * x + 3 * x - 1); eq('Dreifachwurzel (x-1)^3 expandiert gefunden', r.length >= 1 && Math.abs(r[0].x - 1) < 1e-4, true); }
{ const r = C.findRoots(x => x * x - 2 * x + 1); eq('x^2-2x+1 (Rauschen): nicht bestaetigt', r.length === 1 && !r[0].confirmed && Math.abs(r[0].x - 1) < 1e-6, true); }
{ const r = C.findRoots(x => Math.sin(x) * Math.sin(x)); eq('sin^2 Beruehrpunkte unbestaetigt', r.every(q => !q.confirmed) && r.length > 0, true); }
{ const r = C.findRoots(x => x * x - 4); eq('x^2-4 bestaetigt', r.length === 2 && r.every(q => q.confirmed), true); }
{ const r = C.findRoots(x => Math.cos(x) - x); eq('cos(x)=x bestaetigt', r.length === 1 && r[0].confirmed, true); }
{ const r = C.findRoots(x => x * (x - 1) * (x + 1)); eq('x^3-x: drei bestaetigte', r.length === 3 && r.every(q => q.confirmed), true); }
{ const r = C.findRoots(x => Math.exp(x) + 1); eq('e^x+1: keine', r.length, 0); }
{ const r = C.findRoots(x => 1e-9 * (x - 3)); eq('flache Gerade: bestaetigt', r.length === 1 && r[0].confirmed && Math.abs(r[0].x - 3) < 1e-8, true); }
eq('fmtApprox Dezimal statt Bruch', C.fmtApprox(1 / 3).text, '0.3333333333'); eq('fmtApprox 0.5', C.fmtApprox(0.5).text, '0.5');
{ const q = C.solveQuadratic(C.int(1), C.F(1e8), C.int(1)); const [a, b] = q.roots.map(C.toNum);
  near('quad grosse Wurzel', a, -1e8, 0, 1e-12); near('quad kleine Wurzel', b, -1e-8, 0, 1e-12); }
near('1e-20+1e-20', C.toNum(C.evalTokens(T('1E-20+1E-20'))), 2e-20, 0, 1e-12);
eq('Ueberlauf 1e308*10', ev(T('1E308×10')), 'ERR:OVERFLOW');
eq('9^9^9 Ueberlauf statt Haenger', ev(['9', '{pow', '9', '{pow', '9', '}pow', '}pow']), 'ERR:OVERFLOW');
{ const deep = []; for (let i = 0; i < 3000; i++) deep.push('('); deep.push('1'); for (let i = 0; i < 3000; i++) deep.push(')'); eq('Ausdruck zu komplex', ev(deep), 'ERR:TOO COMPLEX'); }

// Zufallsfaelle: a/b + c/d gegen unabhaengige rationale BigInt-Referenz
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
for (let k = 0; k < 300; k++) {
  const a = BigInt(rnd(199) - 99), b = BigInt(rnd(98) + 1), c = BigInt(rnd(199) - 99), d = BigInt(rnd(98) + 1);
  let n = a * d + c * b, m = b * d; const g = gcd(n, m) || 1n; n /= g; m /= g;
  const want = m === 1n ? String(n).replace('-', '−') : (String(n) + '/' + String(m)).replace('-', '−');
  const tok = ['{frac', ...String(a).split(''), '|frac', ...String(b).split(''), '}frac', '+', '{frac', ...String(c).split(''), '|frac', ...String(d).split(''), '}frac'];
  const got = ev(tok.map(t => t)); const gotN = got.replace('(', '').replace(')', '');
  if (gotN === want) pass++; else { fail++; if (fail < 8) console.log('FAIL rational', a, b, c, d, 'got', got, 'want', want); }
}
console.log(`pdf-cases pass=${pass} fail=${fail}`);
if (fail) process.exit(1);
