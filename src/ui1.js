/* ===== ui1.js : Zustand, Tasten, Rendern des Editors, Menues ===== */
const $ = s => document.querySelector(s);
const lcd = $('#lcd'), indL = $('#indL'), indR = $('#indR'), toastEl = $('#toast');
const LSKEY = 'sci-calc-v1';

const HOME = { type: 'home' };
/* ---------- Oberflaeche: Einstellungen & Sprache ---------- */
const UI = { theme: 'auto', size: 1, lang: 'de', haptic: true };
const EN_TXT = {
  'Variablen gelöscht': 'Variables cleared', 'Listen gelöscht': 'Lists cleared', 'Verlauf gelöscht': 'History cleared',
  'Zurückgesetzt': 'Reset', 'Keine Daten vorhanden': 'No data available', 'Interner Fehler: ': 'Internal error: ',
  'Bruchanzeige: ': 'Fraction display: ', ' nicht enthalten': ' not included', ' geleert': ' cleared',
  'Syntaxfehler': 'Syntax error', 'Wert außerhalb des Definitionsbereichs': 'Value outside the domain', 'Division durch 0': 'Division by zero',
  'Zahl zu groß': 'Number too large', 'Ergebnis nicht reell': 'Result is not real', 'Keine/zu wenige Daten': 'No or too little data',
  'Keine eindeutige Lösung': 'No unique solution', 'Ausdruck zu komplex': 'Expression too complex', 'Keine Lösung gefunden': 'No solution found', 'Keine bestätigte Lösung': 'No confirmed solution', '? Berührung ohne Vorzeichenwechsel: mehrfache Nullstelle oder Minimum nahe 0': '? Touches zero without sign change: multiple root or minimum near 0', 'unbestätigt': 'unconfirmed', 'z₁ ∘ z₂  (+ − × ÷ ^)': 'z₁ ∘ z₂  (+ − × ÷ ^)', 'Funktion von z  (|z|, arg, √ …)': 'Function of z  (|z|, arg, √ …)', 'Rechnen (det, X⁻¹, ×, …)': 'Calculate (det, X⁻¹, ×, …)', 'Matrix bearbeiten:': 'Edit matrix:', 'Nullstellen': 'Zeros', 'Minimum': 'Minimum', 'Maximum': 'Maximum', 'Schnittpunkte': 'Intersections', 'y-Achsenabschnitt': 'y-intercept', 'Keine gefunden': 'None found', 'identisch': 'identical', 'Mindestens 2 Funktionen nötig': 'At least 2 functions needed', 'Berechnung dauert zu lange (abgebrochen)': 'Calculation takes too long (aborted)', 'gespeichert (Wurzeln als Dezimalwert)': 'stored (roots as decimals)', 'gespeichert': 'stored', 'Primfaktoren': 'Prime factors', 'Teiler': 'Divisors', 'Division mit Rest': 'Division with remainder', 'Primzahl': 'prime number', 'Anzahl': 'Count', 'leere Menge': 'empty set', 'Falsche Größe von Matrix/Vektor': 'Wrong size of matrix/vector', 'Matrix nicht invertierbar': 'Matrix is not invertible', 'Regression: ': 'Regression: ',
  'clear: Liste leeren': 'clear: empty list', 'Zeile ': 'Row ', 'delete: Wert entfernen': 'delete: remove value',
  'b  binär': 'b  binary', 'o  oktal': 'o  octal', 'h  hexadezimal': 'h  hexadecimal', 'd  dezimal': 'd  decimal',
  'Numerischer Löser (Gleichung)': 'Numeric solver (equation)', 'Polynom (Grad 2/3)': 'Polynomial (degree 2/3)', 'Gleichungssystem (2/3)': 'System of equations (2/3)',
  '[ Graph zeichnen ]': '[ Draw graph ]', 'Rechnung kopiert': 'Link copied', 'Nichts zu teilen': 'Nothing to share', 'Verlauf ist leer': 'History is empty', 'Exportiert': 'Exported',
};
function tr(m) {
  if (UI.lang !== 'en') return m;
  m = String(m);
  for (const k in EN_TXT) if (m.indexOf(k) >= 0) m = m.split(k).join(EN_TXT[k]);
  return m;
}
const ST = { ed: new Editor(), hist: [], hsel: null, second: false, stack: [], lastCyc: null };
const cur = () => (ST.stack.length ? ST.stack[ST.stack.length - 1] : HOME);
const baseOf = () => { const s = ST.stack; for (let i = s.length - 1; i >= 0; i--) if (!s[i].overlay) return s[i]; return HOME; };
const push = sc => { ST.stack.push(sc); };
const pop = () => { ST.stack.pop(); };
const goHome = () => { ST.stack.length = 0; ST.hsel = null; };
let toastTimer = null;
function say(msg) { toastEl.textContent = tr(msg); toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1600); }

/* ---------- Anzeige-Namen ---------- */
const TOKDISP = {
  '-': '−', '*': '×', 'asin(': 'sin⁻¹(', 'acos(': 'cos⁻¹(', 'atan(': 'tan⁻¹(',
  'asinh(': 'sinh⁻¹(', 'acosh(': 'cosh⁻¹(', 'atanh(': 'tanh⁻¹(', '→': '▸', 'ʳ': 'ʳ', 'ᵍ': 'ᵍ',
  'ᵇ': 'b', 'ᵒ': 'o', 'ʰ': 'h', 'ᵈ': 'd',
};
const SVNAMES = { n: 'n', xbar: 'x̄', Sx: 'Sx', sigx: 'σx', sumx: 'Σx', sumx2: 'Σx²', minX: 'minX', Q1: 'Q1', Med: 'Med', Q3: 'Q3', maxX: 'maxX', ybar: 'ȳ', Sy: 'Sy', sigy: 'σy', sumy: 'Σy', sumy2: 'Σy²', sumxy: 'Σxy', a: 'a', b: 'b', c: 'c', d: 'd', r: 'r', R2: 'R²' };
const UNIT_LBL = { m2: 'm²', ft2: 'ft²', floz: 'fl oz', kmh: 'km/h', ms: 'm/s', mph: 'mph', F: '°F', C: '°C', K: 'K', L: 'L', mL: 'mL' };
const unitLabel = u => UNIT_LBL[u] || u;
function convLabel(key) { const [a, b] = key.split('>'); return unitLabel(a) + '▶' + unitLabel(b); }
function tokHTML(k) {
  if (k === 'E') return '<span class="ee">E</span>';
  if (k.startsWith('K:')) return '<span class="cn">' + esc(CONSTS[k.slice(2)].n) + '</span>';
  if (k.startsWith('SV:')) return '<span class="cn">' + esc(SVNAMES[k.slice(3)] || k.slice(3)) + '</span>';
  if (isHexTok(k)) return k[1];
  if (BASE_SFX[k]) return '<span class="un">' + TOKDISP[k] + '</span>';
  if (k.startsWith('U:')) return '<span class="un">' + esc(convLabel(k.slice(2))) + '</span>';
  const d = TOKDISP[k] !== undefined ? TOKDISP[k] : k;
  if (k === '+' || k === '-' || k === '×' || k === '÷' || k === '→' || k === '=') return '<span class="op">' + esc(d) + '</span>';
  if (k === ',') return '<span class="cm">,</span>';
  return esc(d);
}

/* ---------- Editor -> HTML ---------- */
function rEd(ed, caret) {
  const tree = buildTree(ed.t); const c = ed.c;
  const CARET = `<span class="caret${ed.ow ? ' ow' : ''}"></span>`;
  function seq(nodes, s, e, inner, car) {
    if (!nodes.length) {
      const cc = car && c === s ? CARET : '';
      return inner ? `<span class="box">${cc}</span>` : cc;
    }
    let h = '';
    for (const nd of nodes) { if (car && c === nd.i) h += CARET; h += node(nd, car); }
    if (car && c === e) h += CARET;
    return h;
  }
  function node(nd, car) {
    if (nd.tok !== undefined) return tokHTML(nd.tok);
    const P = nd.parts;
    const r = (i, cr) => seq(P[i].nodes, P[i].s, P[i].e, true, cr === undefined ? car : cr);
    const fr = (n, d) => `<span class="frac"><span class="n">${n}</span><span class="d">${d}</span></span>`;
    const sq = body => `<span class="sqrt">${RAD_SVG}<span class="rb">${body}</span></span>`;
    switch (nd.st) {
      case 'frac': return fr(r(0), r(1));
      case 'mix': return `<span class="mix"><span class="w">${r(0)}</span>${fr(r(1), r(2))}</span>`;
      case 'pow': return `<span class="pw">${r(0)}</span>`;
      case 'sqrt': return sq(r(0));
      case 'root': return `<span class="root"><span class="ri">${r(0)}</span>${sq(r(1))}</span>`;
      case 'abs': return `<span class="abs">${r(0)}</span>`;
      case 'sum': case 'prod':
        return `<span class="big"><span class="bu">${r(3)}</span><span class="bs">${nd.st === 'sum' ? 'Σ' : 'Π'}</span><span class="bl">${r(1)}=${r(2)}</span></span><span class="bb">(${r(0)})</span>`;
      case 'int':
        return `<span class="big"><span class="bu">${r(3)}</span><span class="bs int">∫</span><span class="bl">${r(2)}</span></span><span class="bb">${r(0)}</span>d${r(1)}`;
      case 'deriv':
        return `${fr('d', 'd' + r(1))}<span class="bb">(${r(0)})</span><span class="dsub">|${r(1, false)}=${r(2)}</span>`;
    }
    return '';
  }
  return seq(tree, 0, ed.t.length, false, caret);
}
const rStatic = tokens => rEd({ t: tokens, c: -1, ow: false }, false);

/* ---------- Befehle an den Editor ---------- */
function mkStruct(E, kind, o) {
  switch (kind) {
    case 'frac': { const g = E.takeOperand(); E.insStruct('frac', [g, []], g.length ? 1 : 0); break; }
    case 'mix': { const g = E.takeOperand(); E.insStruct('mix', [g, [], []], g.length ? 1 : 0); break; }
    case 'pow': if (o.ans && E.isEmpty()) E.ins('Ans'); E.insStruct('pow', [[]], 0); break;
    case 'sqrt': E.insStruct('sqrt', [[]], 0); break;
    case 'root': E.insStruct('root', [[], []], 0); break;
    case 'abs': E.insStruct('abs', [[]], 0); break;
    case 'sum': case 'prod': case 'int': E.insStruct(kind, [[], ['x'], [], []], 0); break;
    case 'deriv': E.insStruct('deriv', [[], ['x'], []], 0); break;
  }
}
function edCmd(E, c, o) {
  o = o || {};
  switch (c.k) {
    case 'tok': E.insMany(c.t); return true;
    case 'bin': if (o.ans && E.isEmpty()) E.ins('Ans'); E.ins(c.t); return true;
    case 'st': mkStruct(E, c.kind, o); return true;
    case 'x2': if (o.ans && E.isEmpty()) E.ins('Ans'); E.insStruct('pow', [['2']], -1); return true;
    case 'xinv': if (o.ans && E.isEmpty()) E.ins('Ans'); E.insStruct('pow', [['-', '1']], -1); return true;
    case 'tenpow': E.ins('1'); E.ins('0'); E.insStruct('pow', [[]], 0); return true;
    case 'epow': E.ins('e'); E.insStruct('pow', [[]], 0); return true;
    case 'cyc': {
      const L = ST.lastCyc; let idx = 0;
      if (L && L.ed === E && L.key === c.key && E.c === L.c && L.snap.every((t, i) => E.t[L.start + i] === t)) {
        E.t.splice(L.start, L.snap.length); E.c = L.start; idx = (L.idx + 1) % c.items.length;
      }
      const start = E.c, before = E.t.length;
      edCmd(E, c.items[idx], o);
      ST.lastCyc = { ed: E, key: c.key, idx, start, snap: E.t.slice(start, start + (E.t.length - before)), c: E.c };
      return true;
    }
    case 'bs': E.bs(); return true;
    case 'fdel': E.fdel(); return true;
    case 'ins': E.ow = !E.ow; return true;
    case 'nav':
      if (c.d === 'left') { E.left(); return true; }
      if (c.d === 'right') { E.right(); return true; }
      if (c.d === 'home') { E.home(); return true; }
      if (c.d === 'end') { E.end(); return true; }
      return E.vert(c.d);
  }
  return false;
}

/* ---------- Tasten-Definitionen (Layout wie beim echten Geraet) ---------- */
const T_ = (...t) => ({ k: 'tok', t });
const BIN = t => ({ k: 'bin', t });
const STR = (kind) => ({ k: 'st', kind });
const OPEN = name => ({ k: 'open', name });
const NAV = d => ({ k: 'nav', d });
const CYC = (key, ...items) => ({ k: 'cyc', key, items });
const UNS = what => OPEN('unsup:' + what);
const MF = '<span class="mf"><i></i><u></u><i></i></span>';
const MFX = '<span class="mx"><i class="sq"></i><span class="mf"><i></i><u></u><i></i></span></span>';
const KEYS = {
  '2nd': { h: '2nd', cls: 'k2nd' },
  mode: { h: 'mode', s: 'quit', p: OPEN('mode'), sc: { k: 'quit' }, cls: 'kfn' },
  delete: { h: 'delete', s: 'insert', p: { k: 'bs' }, sc: { k: 'ins' }, cls: 'kfn' },
  lnlog: { h: 'ln log', s: 'd/dx □', p: CYC('lnlog', T_('ln('), T_('log(')), sc: STR('deriv'), cls: 'kfn' },
  math: { h: 'math', s: 'matrix', p: OPEN('math'), sc: OPEN('matrix'), cls: 'kfn' },
  data: { h: 'data', s: 'stat-reg/distr', p: OPEN('data'), sc: OPEN('statdistr'), cls: 'kfn' },
  epow: { h: 'e<sup>□</sup>10<sup>□</sup>', s: '∫□ dx', p: CYC('epow', { k: 'epow' }, { k: 'tenpow' }), sc: STR('int'), cls: 'kfn' },
  ee: { h: 'EE', s: 'vector', p: T_('E'), sc: OPEN('vector'), cls: 'kfn' },
  fact: { h: '<span class="l2">! nCr<br>nPr</span>', s: 'random', p: CYC('fact', T_('!'), T_('nCr'), T_('nPr')), sc: OPEN('random'), cls: 'kfn' },
  table: { h: 'table', s: 'expr-eval', p: OPEN('table'), sc: OPEN('exprEval'), cls: 'kfn' },
  clear: { h: 'clear', p: { k: 'clear' }, cls: 'kfn' },
  pi: { h: 'π<sup>e</sup>', s: 'complex', p: CYC('pi', T_('π'), T_('e')), sc: OPEN('complex'), cls: 'kfn' },
  sin: { h: '<span class="l2">sin<br>sin⁻¹</span>', s: 'num-solv', p: CYC('sin', T_('sin('), T_('asin(')), sc: OPEN('numsolve'), cls: 'kfn' },
  cos: { h: '<span class="l2">cos<br>cos⁻¹</span>', s: 'poly-solv', p: CYC('cos', T_('cos('), T_('acos(')), sc: OPEN('polysolve'), cls: 'kfn' },
  tan: { h: '<span class="l2">tan<br>tan⁻¹</span>', s: 'sys-solv', p: CYC('tan', T_('tan('), T_('atan(')), sc: OPEN('syssolve'), cls: 'kfn' },
  div: { h: '÷', s: '%', p: BIN('÷'), sc: T_('%'), cls: 'kop' },
  pw: { h: 'x<sup>□</sup>', s: '□√□', p: STR('pow'), sc: STR('root'), cls: 'kfn' },
  nd: { h: MF, s: 'n/d↔Un/d', p: STR('frac'), sc: { k: 'fracmode' }, cls: 'kfn' },
  lp: { h: '(', s: 'constants', p: T_('('), sc: OPEN('const'), cls: 'kfn' },
  rp: { h: ')', s: 'op', p: T_(')'), sc: OPEN('opmenu'), cls: 'kfn' },
  mul: { h: '×', s: 'set op', p: BIN('×'), sc: OPEN('setop'), cls: 'kop' },
  sq: { h: 'x²', s: '√', p: { k: 'x2' }, sc: STR('sqrt'), cls: 'kfn' },
  7: { h: '7', s: MFX, p: T_('7'), sc: STR('mix'), cls: 'knum' },
  8: { h: '8', s: 'convert', p: T_('8'), sc: OPEN('conv'), cls: 'knum' },
  9: { h: '9', s: 'base n', p: T_('9'), sc: OPEN('base'), cls: 'knum' },
  sub: { h: '−', s: '◀◐', p: BIN('-'), sc: OPEN('angle'), cls: 'kop' },
  xyzt: { h: 'x<sup>yzt</sup><sub>abcd</sub>', s: 'clear var', p: CYC('xyzt', ...VARS.map(v => T_(v))), sc: OPEN('clrvar'), cls: 'kfn' },
  4: { h: '4', s: 'D', p: T_('4'), sc: T_('hD'), cls: 'knum' },
  5: { h: '5', s: 'E', p: T_('5'), sc: T_('hE'), cls: 'knum' },
  6: { h: '6', s: 'F', p: T_('6'), sc: T_('hF'), cls: 'knum' },
  add: { h: '+', s: '◐▶', p: BIN('+'), sc: OPEN('rp'), cls: 'kop' },
  sto: { h: 'sto→', s: 'recall', p: OPEN('sto'), sc: OPEN('rcl'), cls: 'kfn' },
  1: { h: '1', s: 'A', p: T_('1'), sc: T_('hA'), cls: 'knum' },
  2: { h: '2', s: 'B', p: T_('2'), sc: T_('hB'), cls: 'knum' },
  3: { h: '3', s: 'C', p: T_('3'), sc: T_('hC'), cls: 'knum' },
  fd: { h: '◀▶≈', s: 'f◀▶d', p: { k: 'fd' }, sc: { k: 'fd' }, cls: 'kop' },
  on: { h: 'on', s: 'off', p: { k: 'on' }, sc: { k: 'off' }, cls: 'kfn' },
  0: { h: '0', s: 'reset', p: T_('0'), sc: OPEN('reset'), cls: 'knum' },
  dot: { h: '.', s: ',', p: T_('.'), sc: T_(','), cls: 'knum' },
  neg: { h: '(−)', s: 'answer', p: T_('-'), sc: T_('Ans'), cls: 'knum' },
  enter: { h: 'enter', p: { k: 'enter' }, cls: 'kop' },
  up: { h: '▲', p: NAV('up') }, down: { h: '▼', p: NAV('down') }, left: { h: '◀', p: NAV('left') }, right: { h: '▶', p: NAV('right') },
};
const LAYOUT = [
  ['2nd', 'mode', 'delete'],
  ['lnlog', 'math', 'data'],
  ['epow', 'ee', 'fact', 'table', 'clear'],
  ['pi', 'sin', 'cos', 'tan', 'div'],
  ['pw', 'nd', 'lp', 'rp', 'mul'],
  ['sq', '7', '8', '9', 'sub'],
  ['xyzt', '4', '5', '6', 'add'],
  ['sto', '1', '2', '3', 'fd'],
  ['on', '0', 'dot', 'neg', 'enter'],
];
const KEY_AL = { nd: 'fraction', fd: 'exact or decimal', xyzt: 'variables x y z t a b c d', pw: 'power', sq: 'square', epow: 'e to the power, ten to the power', pi: 'pi, e', fact: 'factorial, nCr, nPr', lnlog: 'ln, log', sto: 'store', neg: 'negative sign', add: 'plus', sub: 'minus', mul: 'times', div: 'divided by', dot: 'decimal point', up: 'up', down: 'down', left: 'left', right: 'right', lp: 'open parenthesis', rp: 'close parenthesis', ee: 'EE exponent', delete: 'delete', clear: 'clear', enter: 'enter', 2: '2', on: 'on' };
const plainHTML = h => String(h).replace(/<br\s*\/?>/g, ', ').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<sub>(.*?)<\/sub>/g, '_$1').replace(/<span class="mx">.*?<\/span><\/span>/g, 'mixed number').replace(/<span class="mf[^"]*">.*?<\/span>/g, 'fraction').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
function keyCell(id) {
  const k = KEYS[id];
  const al = KEY_AL[id] || plainHTML(k.h); const al2 = k.s ? plainHTML(k.s) : '';
  const label = (al + (al2 ? '. 2nd: ' + al2 : '')).replace(/"/g, '');
  return `<div class="kc ${k.cls || ''}"><span class="s2" aria-hidden="true">${k.s ? k.s : '&nbsp;'}</span><button type="button" data-k="${id}" aria-label="${label}">${k.h}</button></div>`;
}
function buildKeypad() {
  let h = '<div class="main">';
  for (const row of LAYOUT) for (const id of row) h += keyCell(id);
  h += '<div class="dpad"><button type="button" class="u" data-k="up" aria-label="up">▲</button><button type="button" class="l" data-k="left" aria-label="left">◀</button>' +
    '<button type="button" class="r" data-k="right" aria-label="right">▶</button><button type="button" class="d" data-k="down" aria-label="down">▼</button></div></div>';
  $('#keys').innerHTML = h;
}

/* ---------- Menues ---------- */
const mi = (l, t) => ({ l, t: Array.isArray(t) ? t : [t] });
const ms = (l, kind) => ({ l, st: kind });
function mathMenu() {
  return {
    title: 'MATH', tabs: [
      { name: 'NUM', items: [mi('abs(', 'abs('), mi('round(', 'round('), mi('iPart(', 'iPart('), mi('fPart(', 'fPart('), mi('int(', 'int('), mi('min(', 'min('), mi('max(', 'max('), mi('lcm(', 'lcm('), mi('gcd(', 'gcd('), mi('remainder(', 'remainder(')] },
      { name: 'ANGLE', items: [mi('°', '°'), mi('ʳ', 'ʳ'), mi('ᵍ', 'ᵍ'), mi('▶DMS', '▶DMS')] },
      { name: 'R◀▶P', items: [mi('P▶Rx(', 'P▶Rx('), mi('P▶Ry(', 'P▶Ry('), mi('R▶Pr(', 'R▶Pr('), mi('R▶Pθ(', 'R▶Pθ(')] },
      { name: 'HYP', items: [mi('sinh(', 'sinh('), mi('cosh(', 'cosh('), mi('tanh(', 'tanh('), mi('sinh⁻¹(', 'asinh('), mi('cosh⁻¹(', 'acosh('), mi('tanh⁻¹(', 'atanh(')] },
      { name: 'CALC', items: [ms('nDeriv( d/dx', 'deriv'), ms('fnInt( ∫dx', 'int'), ms('Σ( Summe', 'sum'), ms('Π( Produkt', 'prod')] },
    ],
  };
}
const angleMenu = () => ({ title: 'ANGLE', tabs: [{ name: 'ANGLE', items: [mi('°  Grad', '°'), mi('ʳ  Radiant', 'ʳ'), mi('ᵍ  Gon', 'ᵍ'), mi('▶DMS', '▶DMS')] }] });
const rpMenu = () => ({ title: 'R◀▶P', tabs: [{ name: 'R◀▶P', items: [mi('P▶Rx(', 'P▶Rx('), mi('P▶Ry(', 'P▶Ry('), mi('R▶Pr(', 'R▶Pr('), mi('R▶Pθ(', 'R▶Pθ(')] }] });
const randomMenu = () => ({ title: 'RANDOM', tabs: [{ name: 'RANDOM', items: [mi('rand', 'rand'), mi('randInt(', 'randInt('), mi('randNorm(', 'randNorm('), mi('randBin(', 'randBin(')] }] });
const baseMenu = () => ({ title: 'BASE', tabs: [
  { name: 'CONV', items: [mi('▶Bin', '▶Bin'), mi('▶Oct', '▶Oct'), mi('▶Dec', '▶Dec'), mi('▶Hex', '▶Hex')] },
  { name: 'TYPE', items: [mi(tr('b  binär'), 'ᵇ'), mi(tr('o  oktal'), 'ᵒ'), mi(tr('h  hexadezimal'), 'ʰ'), mi(tr('d  dezimal'), 'ᵈ')] },
] });
function statDistrMenu() {
  const d = distrMenu();
  return { title: 'STAT', tabs: [{ name: 'STAT', items: [
    { l: '1-Var Stats', run: () => openStatForm(false) }, { l: '2-Var Stats', run: () => openStatForm(true) }, { l: 'StatVars', run: () => openMenu(statVarsMenu()) },
  ] }, ...d.tabs] };
}
const prbMenu = () => ({ title: 'PRB', tabs: [{ name: 'PRB', items: [mi('rand', 'rand'), mi('nPr', 'nPr'), mi('nCr', 'nCr'), mi('!', '!'), mi('randInt(', 'randInt('), mi('randNorm(', 'randNorm('), mi('randBin(', 'randBin(')] }] });
const distrMenu = () => ({
  title: 'DISTR', tabs: [
    { name: 'NORMAL', items: [mi('normalPdf(', 'normalPdf('), mi('normalCdf(', 'normalCdf('), mi('invNorm(', 'invNorm(')] },
    { name: 'BINOM', items: [mi('binomPdf(', 'binomPdf('), mi('binomCdf(', 'binomCdf(')] },
    { name: 'POISSON', items: [mi('poissonPdf(', 'poissonPdf('), mi('poissonCdf(', 'poissonCdf(')] },
    { name: 'GEOMET', items: [mi('geometPdf(', 'geometPdf('), mi('geometCdf(', 'geometCdf(')] },
  ],
});
function convMenu() {
  const g = (name, keys) => ({ name, items: keys.map(k => mi(convLabel(k), 'U:' + k)) });
  return {
    title: 'CONV', tabs: [
      g('LENGTH', ['in>cm', 'cm>in', 'ft>m', 'm>ft', 'yd>m', 'm>yd', 'mi>km', 'km>mi']),
      g('AREA', ['acre>m2', 'm2>acre', 'ft2>m2', 'm2>ft2']),
      g('VOLUME', ['gal>L', 'L>gal', 'floz>mL', 'mL>floz']),
      g('MASS', ['oz>g', 'g>oz', 'lb>kg', 'kg>lb']),
      g('TEMP', ['F>C', 'C>F', 'C>K', 'K>C']),
      g('SPEED', ['mph>kmh', 'kmh>mph', 'ms>kmh', 'kmh>ms']),
    ],
  };
}
function constMenu() {
  const g = (name, keys) => ({ name, items: keys.map(k => ({ l: CONSTS[k].n + '  ' + CONSTS[k].name, t: ['K:' + k] })) });
  return { title: 'CONST', tabs: [g('FUND', ['c', 'g', 'G', 'h', 'hbar', 'qe', 'kB', 'NA', 'R', 'eps0', 'mu0']), g('ATOM', ['me', 'mp', 'mn', 'mu', 'sigma', 'a0', 'Rinf', 'Fd', 'Vm', 'alpha', 'muB', 'atm'])] };
}
function varList(kind) {
  return {
    title: kind === 'sto' ? 'STO▸' : kind === 'rcl' ? 'RCL' : 'VAR', tabs: [{
      name: 'VARS', items: VARS.map(v => ({ l: v + ' = ' + fmtText(S.vars[v] || int(0)), t: kind === 'sto' ? ['→', v] : [v] })),
    }],
  };
}
function statVarsMenu() {
  if (!S.statvars) return null;
  const keys = Object.keys(S.statvars).filter(k => S.statvars[k] !== undefined && !Number.isNaN(S.statvars[k]));
  return { title: 'STATVARS', tabs: [{ name: 'VARS', items: keys.map(k => ({ l: (SVNAMES[k] || k) + ' = ' + fmtFloat(S.statvars[k]), t: ['SV:' + k] })) }] };
}
function confirmMenu(title, yes) {
  return { title, tabs: [{ name: 'OK?', items: [{ l: 'Yes', run: yes }, { l: 'No', run: () => { } }] }] };
}
function memMenu() {
  return {
    title: 'MEM', tabs: [{
      name: 'CLEAR', items: [
        { l: 'Clear variables', run: () => { S.vars = {}; say('Variablen gelöscht'); save(); } },
        { l: 'Clear data lists', run: () => { S.lists = { L1: [], L2: [], L3: [] }; S.stat = null; S.statvars = null; say('Listen gelöscht'); save(); } },
        { l: 'Clear history', run: () => { ST.hist = []; say('Verlauf gelöscht'); save(); } },
        { l: 'Reset all', run: () => openMenu(confirmMenu('RESET ALL?', resetAll)) },
      ],
    }],
  };
}
function resetAll() {
  S.angle = 'DEG'; S.fmt = { mode: 'NORM', dec: 'F' }; S.res = 'AUTO'; S.frac = 'n/d'; S.vars = {}; S.ans = null;
  S.lists = { L1: [], L2: [], L3: [] }; S.stat = null; S.statvars = null; ST.hist = []; ST.ed.clear(); goHome(); save(); say('Zurückgesetzt');
}
function openMenu(def) {
  if (!def) { say('Keine Daten vorhanden'); return; }
  const sc = {
    type: 'menu', overlay: true, def, tab: 0, sel: 0,
    editor() { return null; },
    render() {
      const tabs = def.tabs.length > 1 ? `<div class="mtabs">${def.tabs.map((t, i) => `<span class="${i === sc.tab ? 'on' : ''}" data-tap="t:${i}">${esc(t.name)}</span>`).join('')}</div>` : `<div class="mtabs"><span class="on">${esc(def.title)}</span></div>`;
      const items = def.tabs[sc.tab].items;
      return tabs + '<div class="mlst">' + items.map((it, i) => `<div class="mi ${i === sc.sel ? 'sel' : ''}" data-tap="i:${i}"><b>${i < 9 ? i + 1 : i === 9 ? 0 : '·'}</b> ${esc(it.l)}</div>`).join('') + '</div>';
    },
    cmd(c) {
      const items = def.tabs[sc.tab].items;
      switch (c.k) {
        case 'tap': { const [kind, n] = c.key.split(':'); if (kind === 't') { sc.tab = +n; sc.sel = 0; } else { sc.sel = +n; choose(+n); } return true; }
        case 'nav':
          if (c.d === 'left' || c.d === 'right') { const n = def.tabs.length; sc.tab = (sc.tab + (c.d === 'right' ? 1 : n - 1)) % n; sc.sel = 0; }
          else sc.sel = (sc.sel + (c.d === 'down' ? 1 : items.length - 1)) % items.length;
          return true;
        case 'enter': choose(sc.sel); return true;
        case 'tok': { const d = c.t[0]; if (c.t.length === 1 && d >= '0' && d <= '9') { choose(d === '0' ? 9 : Number(d) - 1); } return true; }
        case 'clear': pop(); return true;
        case 'quit': goHome(); return true;
        case 'open': pop(); openByName(c.name); return true;
      }
      return true;
    },
  };
  function choose(i) {
    const it = def.tabs[sc.tab].items[i]; if (!it) return;
    pop();
    if (it.run) { it.run(); return; }
    const b = cur(); const E = b.editor && b.editor();
    if (!E) return;
    const o = { ans: b.type === 'home' };
    if (b.type === 'home') ST.hsel = null;
    if (it.st) edCmd(E, { k: 'st', kind: it.st }, o); else edCmd(E, { k: 'tok', t: it.t }, o);
    if (b.afterInsert) b.afterInsert();
  }
  push(sc);
}
