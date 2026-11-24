/* ===== ui3.js : Oberflaeche fuer complex, matrix, vector, op, set op ===== */
const ANG_SYM = () => (S.angle === 'DEG' ? '°' : S.angle === 'GRAD' ? 'ᵍ' : ' rad');
const SL = (n, h) => `<span class="sl">${n}</span> <span class="sv">${h}</span>`;
const valLine = (n, v) => SL(n, fmtVal(v, false).html);
const approxLine = (n, v) => { const e = fmtVal(v, false), d = fmtVal(v, true); return e.text === d.text ? null : SL(n + ' ≈', d.html); };
const ST3 = { mats: { A: null, B: null, C: null } };
const MATKEY = 'exakto.mats.v1';
(function loadMats() { try { const j = JSON.parse(localStorage.getItem(MATKEY) || 'null'); if (j && typeof j === 'object') for (const k of ['A', 'B', 'C']) { const m = j[k]; if (m && Array.isArray(m) && m.length >= 1 && m.length <= MAT_MAX && m.every(r => Array.isArray(r) && r.length === m[0].length && r.length >= 1 && r.length <= MAT_MAX && r.every(c => Array.isArray(c) && c.every(t => typeof t === 'string')))) ST3.mats[k] = m; } } catch (e) { /* egal */ } })();
function saveMats() { try { localStorage.setItem(MATKEY, JSON.stringify(ST3.mats)); } catch (e) { /* egal */ } }

/* Zahl -> Token-Liste (Brueche exakt, sonst Dezimal) */
function numTokens(v) {
  const digits = s => String(s).split('');
  if (v.t === 'x' && isRat(v)) {
    const sg = v.n < 0n ? ['-'] : [], n = babs(v.n).toString();
    return v.d === 1n ? sg.concat(digits(n)) : sg.concat(['{frac'], digits(n), ['|frac'], digits(v.d.toString()), ['}frac']);
  }
  const x = toNum(v); let s = String(x), out = [];
  if (s[0] === '-') { out.push('-'); s = s.slice(1); }
  const [m, e] = s.split('e'); out = out.concat(digits(m));
  if (e !== undefined) { out.push('E'); if (e[0] === '-') { out.push('-'); out = out.concat(digits(e.slice(1))); } else out = out.concat(digits(e.replace('+', ''))); }
  return out;
}
const matToTok = M => M.map(r => r.map(numTokens));
const tokToMat = T => T.map(r => r.map(t => (t.length ? evalTokens(t) : int(0))));

/* ---------- COMPLEX ---------- */
const czRow = (label, grp) => {
  const re = exprField(label, null, { grp, sfx: '+' }), im = exprField('', null, { grp, sfx: 'i' });
  return { re, im, get: () => czMk(evalField(re), evalField(im)) };
};
function czLines(z, extra) {
  const lines = [SL('z =', czFmt(z, false).html)];
  const ap = czFmt(z, true); if (ap.text !== czFmt(z, false).text) lines.push(SL('z ≈', ap.html));
  if (!(isZero(z.re) && isZero(z.im))) {
    lines.push(valLine('|z| =', czAbs(z)));
    const am = approxLine('|z|', czAbs(z)); if (am) lines.push(am);
    lines.push(SL('arg =', fmtVal(F(czArgUnit(z)), false).html + ANG_SYM()));
  }
  return extra ? extra.concat(lines) : lines;
}
function openComplexBinary() {
  const op = choiceField('', ['+', '−', '×', '÷', '^'], 0);
  const a = czRow('z₁=', 1), b = czRow('z₂=', 2);
  const submit = () => guard(() => {
    const x = a.get(), y = b.get(); let z;
    switch (op.idx) { case 0: z = czAdd(x, y); break; case 1: z = czSub(x, y); break; case 2: z = czMul(x, y); break; case 3: z = czDiv(x, y); break; default: z = czPow(x, y); }
    openList('COMPLEX', czLines(z));
  });
  openForm({ title: 'COMPLEX  z₁ ∘ z₂', startSel: 1, fields: [op, a.re, a.im, b.re, b.im, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
const CZ_FUNCS = ['|z|', 'arg', 'conj', '√z', 'z²', '1/z', 'eᶻ', 'ln z', 'sin z', 'cos z', 'zⁿ'];
function openComplexFunc() {
  const fn = choiceField('', CZ_FUNCS, 0);
  const a = czRow('z=', 1);
  const n = exprField('n=', ['2'], { show: () => fn.idx === 10 });
  const submit = () => guard(() => {
    const z = a.get(); const f = CZ_FUNCS[fn.idx];
    if (f === '|z|') { openList('COMPLEX', [valLine('|z| =', czAbs(z)), approxLine('|z|', czAbs(z))].filter(Boolean)); return; }
    if (f === 'arg') { openList('COMPLEX', [SL('arg =', fmtVal(F(czArgUnit(z)), false).html + ANG_SYM())]); return; }
    let r;
    switch (f) {
      case 'conj': r = czConj(z); break; case '√z': r = czSqrt(z); break; case 'z²': r = czMul(z, z); break;
      case '1/z': r = czDiv(CZ1(), z); break; case 'eᶻ': r = czExp(z); break; case 'ln z': r = czLn(z); break;
      case 'sin z': r = czSin(z); break; case 'cos z': r = czCos(z); break;
      default: { const k = evalField(n); if (!isInt(k)) err('DOMAIN'); if (isZero(z.re) && isZero(z.im) && k.n <= 0n) err('DIVIDE BY 0'); r = czPowInt(z, k.n); }
    }
    openList('COMPLEX', czLines(r));
  });
  openForm({ title: 'COMPLEX  f(z)', startSel: 1, fields: [fn, a.re, a.im, n, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function openComplexPolar() {
  const r = exprField('r=', null), th = exprField('θ=', null, { sfx: () => ANG_SYM().trim() });
  const submit = () => guard(() => {
    const rv = evalField(r), tv = evalField(th);
    openList('COMPLEX', czLines(czFromPolar(rv, tv)));
  });
  openForm({ title: 'POLAR → a+bi', fields: [r, th, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function complexMenu() {
  return { title: 'COMPLEX', tabs: [{ name: 'COMPLEX', items: [
    { l: tr('z₁ ∘ z₂  (+ − × ÷ ^)'), run: openComplexBinary },
    { l: tr('Funktion von z  (|z|, arg, √ …)'), run: openComplexFunc },
    { l: tr('Polar → a+bi'), run: openComplexPolar },
  ] }] };
}

/* ---------- MATRIX ---------- */
const MNAMES = ['A', 'B', 'C'];
function matOf(name) {
  const m = ST3.mats[name]; if (!m) err('DIMENSION');
  return tokToMat(m);
}
function matLines(M) {
  return M.map(r => '<span class="sv">[ ' + r.map(v => fmtVal(v, false).html).join('&nbsp;&nbsp; ') + ' ]</span>');
}
function openMatEdit(name) {
  const cur0 = ST3.mats[name];
  const rows = choiceField('Zeilen:', ['1', '2', '3', '4'], cur0 ? cur0.length - 1 : 1);
  const cols = choiceField('Spalten:', ['1', '2', '3', '4'], cur0 ? cur0[0].length - 1 : 1);
  const cells = [];
  for (let r = 0; r < MAT_MAX; r++) {
    const row = [];
    for (let c = 0; c < MAT_MAX; c++) {
      const f = exprField('', cur0 && cur0[r] && cur0[r][c] ? cur0[r][c] : null, { grp: 10 + r, show: () => r <= rows.idx && c <= cols.idx });
      row.push(f);
    }
    cells.push(row);
  }
  const submit = () => guard(() => {
    const R = rows.idx + 1, C = cols.idx + 1, M = [];
    for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) { row.push(cells[r][c].ed.t.slice()); evalField(cells[r][c]); } M.push(row); }
    ST3.mats[name] = M; saveMats(); pop(); say('Matrix ' + name + ' gespeichert');
  });
  openForm({ title: 'MATRIX ' + name, fields: [rows, cols, ...cells.flat(), { type: 'btn', label: '[ OK ]', action: submit }], onSubmit: submit });
}
const MAT_OPS = ['+', '−', '×', 'k·X', 'Xⁿ', 'det', 'X⁻¹', 'Xᵀ', 'rank', 'tr', 'rref'];
function openMatCalc() {
  const x = choiceField('', MNAMES, 0), op = choiceField('', MAT_OPS, 2), y = choiceField('', MNAMES, 1, { show: () => op.idx <= 2 });
  const k = exprField('k=', ['2'], { show: () => op.idx === 3 || op.idx === 4 });
  const st = choiceField('Store→', ['—', 'A', 'B', 'C'], 0, { show: () => ![5, 8, 9].includes(op.idx) });
  const submit = () => guard(() => {
    const A = matOf(MNAMES[x.idx]); let res, scalar = null;
    switch (op.idx) {
      case 0: res = matAdd(A, matOf(MNAMES[y.idx])); break;
      case 1: res = matSub(A, matOf(MNAMES[y.idx])); break;
      case 2: res = matMul(A, matOf(MNAMES[y.idx])); break;
      case 3: res = matScale(A, evalField(k)); break;
      case 4: { const e = evalField(k); if (!isInt(e)) err('DOMAIN'); res = matPow(A, e.n); break; }
      case 5: scalar = ['det', matDet(A)]; break;
      case 6: res = matInv(A); break;
      case 7: res = matT(A); break;
      case 8: scalar = ['rank', int(matRank(A))]; break;
      case 9: scalar = ['tr', matTrace(A)]; break;
      default: res = matRref(A);
    }
    if (scalar) { openList('MATRIX', [valLine(scalar[0] + ' =', scalar[1]), approxLine(scalar[0], scalar[1])].filter(Boolean)); return; }
    const lines = matLines(res);
    if (st.idx > 0) { ST3.mats[MNAMES[st.idx - 1]] = matToTok(res); saveMats(); lines.push(`<span class="un">→ ${MNAMES[st.idx - 1]} ${tr(res.every(r => r.every(v => v.t === 'x' && isRat(v))) ? 'gespeichert' : 'gespeichert (Wurzeln als Dezimalwert)')}</span>`); }
    openList('MATRIX', lines);
  });
  openForm({ title: 'MATRIX  X ∘ Y', startSel: 1, fields: [x, op, y, k, st, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function matrixMenu() {
  const dim = n => (ST3.mats[n] ? ` (${ST3.mats[n].length}×${ST3.mats[n][0].length})` : ' (–)');
  return { title: 'MATRIX', tabs: [{ name: 'MATRIX', items: [
    ...MNAMES.map(n => ({ l: tr('Matrix bearbeiten:') + ' ' + n + dim(n), run: () => openMatEdit(n) })),
    { l: tr('Rechnen (det, X⁻¹, ×, …)'), run: openMatCalc },
  ] }] };
}

/* ---------- VECTOR ---------- */
const VEC_OPS = ['u+v', 'u−v', 'u·v', 'u×v', '|u|', '∠(u,v)', 'û', 'proj', 'k·u'];
function openVector() {
  const dim = choiceField('Dim:', ['2', '3'], 1);
  const op = choiceField('', VEC_OPS, 2);
  const mkRow = (label, grp, showAll) => {
    const f = [0, 1, 2].map(i => exprField(i === 0 ? label : '', null, { grp, sfx: i < 2 ? ',' : '', show: () => (showAll ? showAll() : true) && (i < 2 || dim.idx === 1) }));
    return f;
  };
  const u = mkRow('u=', 1), v = mkRow('v=', 2, () => [0, 1, 2, 3, 5, 7].includes(op.idx));
  const k = exprField('k=', ['2'], { show: () => op.idx === 8 });
  const get = row => row.slice(0, dim.idx + 2).map(evalField);
  const submit = () => guard(() => {
    const a = get(u), b = [0, 1, 2, 3, 5, 7].includes(op.idx) ? get(v) : null; let lines;
    const vecLine = (n, w) => SL(n, '( ' + w.map(q => fmtVal(q, false).html).join(' , ') + ' )');
    switch (op.idx) {
      case 0: lines = [vecLine('u+v =', vecAdd(a, b))]; break;
      case 1: lines = [vecLine('u−v =', vecSub(a, b))]; break;
      case 2: { const d = vecDot(a, b); lines = [valLine('u·v =', d), approxLine('u·v', d)]; break; }
      case 3: lines = [vecLine('u×v =', vecCross(a, b))]; break;
      case 4: { const n = vecNorm(a); lines = [valLine('|u| =', n), approxLine('|u|', n)]; break; }
      case 5: lines = [SL('∠ =', fmtVal(vecAngle(a, b), false).html + ANG_SYM())]; break;
      case 6: lines = [vecLine('û =', vecUnit(a))]; break;
      case 7: lines = [vecLine('proj =', vecProj(a, b))]; break;
      default: { const q = evalField(k); lines = [vecLine('k·u =', a.map(t => mul(t, q)))]; }
    }
    openList('VECTOR', lines.filter(Boolean));
  });
  openForm({ title: 'VECTOR', startSel: 2, fields: [dim, op, ...u, ...v, k, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}

/* ---------- OP (Zahlen-Operationen) ---------- */
function openPolForm() {
  const x = exprField('x=', null, { grp: 1, sfx: ',' }), y = exprField('y=', null, { grp: 1 });
  const submit = () => guard(() => {
    const p = polar(evalField(x), evalField(y));
    openList('Pol(', [valLine('r =', p.r), approxLine('r', p.r), SL('θ =', fmtVal(p.th, false).html + ANG_SYM())].filter(Boolean));
  });
  openForm({ title: 'Pol( x , y )', fields: [x, y, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function openRecForm() {
  const r = exprField('r=', null, { grp: 1, sfx: ',' }), th = exprField('θ=', null, { grp: 1, sfx: () => ANG_SYM().trim() });
  const submit = () => guard(() => {
    const p = rect(evalField(r), evalField(th));
    openList('Rec(', [valLine('x =', p.x), approxLine('x', p.x), valLine('y =', p.y), approxLine('y', p.y)].filter(Boolean));
  });
  openForm({ title: 'Rec( r , θ )', fields: [r, th, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
const sup = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
function openPrimeForm() {
  const n = exprField('n=', null);
  const submit = () => guard(() => {
    const a = evalField(n); const f = primeFactors(a);
    openList('PRIME', [SL(fmtVal(a, false).text + ' =', f.map(([p, e]) => p + (e > 1 ? sup(e) : '')).join(' · ')), f.length === 1 && f[0][1] === 1 ? `<span class="un">${tr('Primzahl')}</span>` : null].filter(Boolean));
  });
  openForm({ title: tr('Primfaktoren'), fields: [n, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function openDivisorForm() {
  const n = exprField('n=', null);
  const submit = () => guard(() => {
    const a = evalField(n); const d = divisors(a); const lines = [SL(tr('Anzahl') + ' =', String(d.length))];
    for (let i = 0; i < d.length; i += 4) lines.push('<span class="sv">' + d.slice(i, i + 4).join(' , ') + '</span>');
    openList('DIVISORS', lines);
  });
  openForm({ title: tr('Teiler'), fields: [n, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function openDivRemForm() {
  const a = exprField('a=', null, { grp: 1, sfx: '÷' }), b = exprField('b=', null, { grp: 1 });
  const submit = () => guard(() => {
    const A = evalField(a), B = evalField(b), d = divRem(A, B);
    openList('DIV', [valLine('q =', d.q), valLine('r =', d.r), `<span class="un">a = q·b + r,  0 ≤ r &lt; |b|</span>`]);
  });
  openForm({ title: tr('Division mit Rest'), fields: [a, b, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
function opMenu() {
  return { title: 'OP', tabs: [{ name: 'OP', items: [
    { l: 'Pol( x , y )', run: openPolForm },
    { l: 'Rec( r , θ )', run: openRecForm },
    { l: tr('Primfaktoren'), run: openPrimeForm },
    { l: tr('Teiler'), run: openDivisorForm },
    { l: tr('Division mit Rest'), run: openDivRemForm },
  ] }] };
}

/* ---------- SET OP (Mengen aus L1–L3) ---------- */
const SET_OPS = ['A∪B', 'A∩B', 'A∖B', 'B∖A', 'A△B'], SET_KEYS = ['union', 'inter', 'minus', 'rminus', 'sym'];
function openSetOp() {
  const a = choiceField('A:', LNAMES, 0), op = choiceField('', SET_OPS, 0), b = choiceField('B:', LNAMES, 1), st = choiceField('Store→', ['—', ...LNAMES], 0);
  const submit = () => guard(() => {
    const A = S.lists[LNAMES[a.idx]], B = S.lists[LNAMES[b.idx]];
    if (!setOf(A).length && !setOf(B).length) err('STAT');
    const res = setOp(A, B, SET_KEYS[op.idx]);
    const txt = res.map(v => fmtFloat(v).replace(/^-/, MINUS));
    const lines = [SL(tr('Anzahl') + ' =', String(res.length))];
    if (!res.length) lines.push(`<span class="un">${tr('leere Menge')} ∅</span>`);
    for (let i = 0; i < txt.length; i += 4) lines.push('<span class="sv">' + (i === 0 ? '{ ' : '&nbsp;&nbsp; ') + txt.slice(i, i + 4).join(' , ') + (i + 4 >= txt.length ? ' }' : ' ,') + '</span>');
    if (st.idx > 0) { S.lists[LNAMES[st.idx - 1]] = res.slice(0, 99); save(); lines.push(`<span class="un">→ ${LNAMES[st.idx - 1]} ${tr('gespeichert')}</span>`); }
    openList('SET OP', lines);
  });
  openForm({ title: 'SET OP', startSel: 1, fields: [a, op, b, st, { type: 'btn', label: '[ CALC ]', action: submit }], onSubmit: submit });
}
