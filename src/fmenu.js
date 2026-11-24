/* ===== fmenu.js : Funktionsmenue (Gitter-Symbol): alle Funktionen nach Themen, ohne 2nd ===== */
const FM_KEY = 'exakto.recent.v1';
const fmApp = act => () => { doMenu(act); renderAll(); };
const fmOpen = name => () => openByName(name);
// Baum: Ordner {id,l,icon,kids} und Funktionen {id,l,sym,act}; act: {st:'frac'} fuegt Struktur ein, {run} fuehrt aus
const fmL = (id, l, sym, act) => ({ id, l, sym, act });
const FM_SVG = (p) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const FM_ICON = {
  calc: FM_SVG('<rect x="6" y="3" width="20" height="26" rx="3"/><path d="M10 9h12M11 15h2M19 15h2M11 20h2M19 20h2M11 25h2M19 25h2"/>'),
  analysis: FM_SVG('<path d="M12 4c-3 0-3 3-3 6v12c0 3 0 6-3 6M20 12l6 8M26 12l-6 8"/>'),
  solve: FM_SVG('<path d="M4 22l6-12 5 8 4-5 9 9"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/>'),
  alg: FM_SVG('<path d="M8 5H5v22h3M24 5h3v22h-3M11 11h4M17 11h4M11 16h4M17 16h4M11 21h4M17 21h4"/>'),
  stat: FM_SVG('<path d="M5 27V5M5 27h22"/><rect x="9" y="16" width="4" height="8"/><rect x="15" y="10" width="4" height="14"/><rect x="21" y="14" width="4" height="10"/>'),
  num: FM_SVG('<path d="M12 5L9 27M22 5l-3 22M5 12h22M4 20h22"/>'),
  conv: FM_SVG('<path d="M5 12h20l-5-5M27 20H7l5 5"/>'),
  mem: FM_SVG('<rect x="5" y="8" width="22" height="16" rx="2"/><path d="M10 8V4M16 8V4M22 8V4M10 24v4M16 24v4M22 24v4"/>'),
  tools: FM_SVG('<path d="M5 26V6M5 26h22"/><path d="M7 22c5-14 8 8 12-6s5-6 7-8"/>'),
  app: FM_SVG('<circle cx="16" cy="16" r="4"/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M24.5 7.5L21 11M11 21l-3.5 3.5"/>'),
  recent: FM_SVG('<circle cx="16" cy="16" r="11"/><path d="M16 9v7l5 3"/>'),
};
const FM_TREE = [
  { id: 'f-calc', l: 'Rechnen', icon: 'calc', kids: [
    fmL('frac', 'Bruch', 'a⁄b', { st: 'frac' }), fmL('mix', 'Gemischte Zahl', '1½', { st: 'mix' }), fmL('pow', 'Potenz', 'xⁿ', { st: 'pow' }),
    fmL('sqrt', 'Wurzel', '√', { st: 'sqrt' }), fmL('root', 'n-te Wurzel', 'ⁿ√', { st: 'root' }), fmL('abs', 'Betrag', '|x|', { st: 'abs' }),
    { id: 'f-analysis', l: 'Analysis', icon: 'analysis', kids: [
      fmL('sum', 'Summe', 'Σ', { st: 'sum' }), fmL('prod', 'Produkt', 'Π', { st: 'prod' }), fmL('int', 'Integral', '∫', { st: 'int' }), fmL('deriv', 'Ableitung', 'd/dx', { st: 'deriv' }),
    ] },
  ] },
  { id: 'f-solve', l: 'Lösen', icon: 'solve', kids: [
    fmL('numsolve', 'Num-Solv', 'f(x)=0', { run: () => openByName('numsolve') }), fmL('polysolve', 'Poly-Solv', 'ax²+', { run: () => openByName('polysolve') }),
    fmL('syssolve', 'Sys-Solv', 'A·x=b', { run: () => openByName('syssolve') }), fmL('exprEval', 'Ausdruck auswerten', 'expr', { run: () => openByName('exprEval') }),
    fmL('table', 'Wertetabelle', 'table', { run: () => openByName('table') }),
  ] },
  { id: 'f-alg', l: 'Algebra', icon: 'alg', kids: [
    fmL('complex', 'Komplexe Zahlen', 'z=a+bi', { run: () => openByName('complex') }), fmL('matrix', 'Matrizen', '[A]', { run: () => openByName('matrix') }),
    fmL('vector', 'Vektoren', 'u×v', { run: () => openByName('vector') }), fmL('opmenu', 'Pol, Rec, Primfaktoren', 'op', { run: () => openByName('opmenu') }),
    fmL('setop', 'Mengen', 'A∪B', { run: () => openByName('setop') }),
  ] },
  { id: 'f-stat', l: 'Statistik', icon: 'stat', kids: [
    fmL('data', 'Daten L1–L3', 'data', { run: () => openByName('data') }), fmL('stat', 'Statistik 1-/2-Var', 'x̄ σ', { run: () => openByName('stat') }),
    fmL('statdistr', 'Verteilungen', 'N(μ,σ)', { run: () => openByName('statdistr') }), fmL('prb', 'nCr, nPr, !', 'nCr', { run: () => openByName('prb') }),
    fmL('random', 'Zufallszahlen', 'rnd', { run: () => openByName('random') }),
  ] },
  { id: 'f-num', l: 'Zahlen', icon: 'num', kids: [
    fmL('math', 'Mathe-Funktionen', 'f(x)', { run: () => openByName('math') }), fmL('base', 'Zahlensysteme', 'hex', { run: () => openByName('base') }),
    { id: 'f-conv', l: 'Umrechnen', icon: 'conv', kids: [
      fmL('conv', 'Einheiten', 'cm→in', { run: () => openByName('conv') }), fmL('const', 'Konstanten', 'π e c', { run: () => openByName('const') }),
      fmL('angle', 'Winkel', '° rad', { run: () => openByName('angle') }), fmL('rp', 'Polar ⇄ Kartesisch', 'r∠θ', { run: () => openByName('rp') }),
    ] },
    { id: 'f-mem', l: 'Speicher', icon: 'mem', kids: [
      fmL('var', 'Variablen', 'x y z', { run: () => openByName('var') }), fmL('sto', 'Speichern', 'sto→', { run: () => openByName('sto') }), fmL('rcl', 'Abrufen', 'rcl', { run: () => openByName('rcl') }),
    ] },
  ] },
  { id: 'f-tools', l: 'Werkzeuge', icon: 'tools', kids: [
    fmL('graph', 'Graph (F2)', 'y=f(x)', { run: () => { doMenu('graph'); renderAll(); } }), fmL('tools', 'Engineering (F3)', 'U=R·I', { run: () => { doMenu('tools'); renderAll(); } }),
  ] },
  { id: 'f-app', l: 'Einstellungen', icon: 'app', kids: [
    fmL('calc', 'Rechner (Start)', '⌂', { run: () => { doMenu('calc'); renderAll(); } }), fmL('mode', 'Modus', 'mode', { run: () => openByName('mode') }),
    fmL('help', 'Hilfe & Einstellungen', '?', { run: () => { doMenu('help'); renderAll(); } }), fmL('reset', 'Zurücksetzen', '↺', { run: () => openByName('reset') }),
  ] },
];
const FM_EN = {"Funktionen": "Functions", "Zuletzt benutzt": "Recently used", "Rechnen": "Calculate", "Analysis": "Calculus", "Lösen": "Solve", "Algebra": "Algebra", "Statistik": "Statistics", "Zahlen": "Numbers", "Umrechnen": "Convert", "Speicher": "Memory", "Werkzeuge": "Tools", "Einstellungen": "Settings", "Ordner": "Folder", "Zurück": "Back", "Oberste Ebene": "Top level", "Bruch": "Fraction", "Gemischte Zahl": "Mixed number", "Potenz": "Power", "Wurzel": "Root", "n-te Wurzel": "nth root", "Betrag": "Absolute value", "Summe": "Sum", "Produkt": "Product", "Integral": "Integral", "Ableitung": "Derivative", "Ausdruck auswerten": "Evaluate expression", "Wertetabelle": "Value table", "Komplexe Zahlen": "Complex numbers", "Matrizen": "Matrices", "Vektoren": "Vectors", "Pol, Rec, Primfaktoren": "Pol, Rec, prime factors", "Mengen": "Sets", "Daten L1–L3": "Data L1–L3", "Statistik 1-/2-Var": "1-/2-Var statistics", "Verteilungen": "Distributions", "Zufallszahlen": "Random numbers", "Mathe-Funktionen": "Math functions", "Zahlensysteme": "Number bases", "Einheiten": "Units", "Konstanten": "Constants", "Winkel": "Angles", "Polar ⇄ Kartesisch": "Polar ⇄ Cartesian", "Variablen": "Variables", "Speichern": "Store", "Abrufen": "Recall", "Rechner (Start)": "Calculator (home)", "Modus": "Mode", "Hilfe & Einstellungen": "Help & settings", "Zurücksetzen": "Reset"};
const fmT = x => (UI.lang === 'en' && FM_EN[x]) || x;
const FM_INDEX = {};
(function idx(list) { list.forEach(n => { if (n.kids) idx(n.kids); else FM_INDEX[n.id] = n; }); })(FM_TREE);
function fmRecent() {
  try { const a = JSON.parse(localStorage.getItem(FM_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string' && FM_INDEX[x]).slice(0, 5) : []; } catch (e) { return []; }
}
function fmNote(id) {
  try { const a = [id].concat(fmRecent().filter(x => x !== id)).slice(0, 5); localStorage.setItem(FM_KEY, JSON.stringify(a)); } catch (e) { /* egal */ }
}
function fmRoot() {
  const rec = fmRecent().map(id => FM_INDEX[id]);
  return { kids: (rec.length ? [{ id: 'f-recent', l: 'Zuletzt benutzt', icon: 'recent', kids: rec }] : []).concat(FM_TREE) };
}
function openFunctionMenu() {
  if (typeof showPanel === 'function' && panelOpen()) showPanel(null);
  if (ST.off) { ST.off = false; }
  const c = cur(); if (c.fm) { pop(); renderAll(); return; }
  openFolderMenu(); renderAll();
}
function openFolderMenu() {
  const COLS = 3; const root = fmRoot();
  const sc = {
    type: 'menu', overlay: true, fm: true, path: [], sel: 0,
    editor() { return null; },
    node() { let n = root; for (const i of sc.path) n = n.kids[i]; return n; },
    render() {
      const nodes = [root]; sc.path.forEach(i => nodes.push(nodes[nodes.length - 1].kids[i]));
      const crumbs = nodes.map((n, d) => `<a data-tap="c:${d}">${d === 0 ? esc(fmT('Funktionen')) : esc(fmT(n.l))}</a>`).join(' › ');
      const kids = sc.node().kids;
      const dis = sc.path.length ? '' : 'disabled';
      const tiles = kids.map((k, i) => {
        const g = k.icon ? FM_ICON[k.icon] : `<span class="sym">${esc(k.sym || '▸')}</span>`;
        return `<div class="tile ${k.kids ? 'folder' : ''} ${i === sc.sel ? 'sel' : ''}" data-tap="i:${i}">${k.kids ? `<span class="cnt">${k.kids.length}</span>` : ''}${g}<span class="t">${esc(fmT(k.l))}</span></div>`;
      }).join('');
      const k = kids[sc.sel]; const foot = k ? (k.kids ? fmT('Ordner') + ': ' : '') + fmT(k.l) : '';
      return `<div class="fbar"><span class="fb ${dis}" data-tap="b" title="${esc(fmT('Zurück'))}">←</span><span class="fb ${dis}" data-tap="h" title="${esc(fmT('Oberste Ebene'))}">⌂</span><span class="crumbs">${crumbs}</span></div><div class="tgrid">${tiles}</div><div class="ffoot">${foot}</div>`;
    },
    cmd(c) {
      const kids = sc.node().kids; const n = kids.length;
      switch (c.k) {
        case 'tap': {
          const [kind, v] = c.key.split(':');
          if (kind === 'i') { sc.sel = +v; choose(+v); } else if (kind === 'b') up(sc.path.length - 1); else if (kind === 'h') up(0); else if (kind === 'c') up(+v);
          return true;
        }
        case 'nav':
          if (c.d === 'left') sc.sel = (sc.sel + n - 1) % n;
          else if (c.d === 'right') sc.sel = (sc.sel + 1) % n;
          else if (c.d === 'down') sc.sel = sc.sel + COLS < n ? sc.sel + COLS : sc.sel % COLS;
          else sc.sel = sc.sel - COLS >= 0 ? sc.sel - COLS : Math.min(n - 1, sc.sel + Math.floor((n - 1 - sc.sel) / COLS) * COLS);
          return true;
        case 'enter': choose(sc.sel); return true;
        case 'tok': { const d = c.t[0]; if (c.t.length === 1 && d >= '0' && d <= '9') choose(d === '0' ? 9 : Number(d) - 1); return true; }
        case 'clear': if (sc.path.length) up(sc.path.length - 1); else pop(); return true;
        case 'quit': goHome(); return true;
        case 'open': pop(); openByName(c.name); return true;
      }
      return true;
    },
  };
  function up(d) { if (d < 0) return; sc.path = sc.path.slice(0, d); sc.sel = 0; }
  function choose(i) {
    const it = sc.node().kids[i]; if (!it) return;
    if (it.kids) { sc.path.push(i); sc.sel = 0; return; }
    pop();
    fmNote(it.id);
    if (it.act.run) { it.act.run(); return; }
    const b = cur(); const E = b.editor && b.editor();
    if (!E) return;
    const o = { ans: b.type === 'home' };
    if (b.type === 'home') ST.hsel = null;
    edCmd(E, { k: 'st', kind: it.act.st }, o);
    if (b.afterInsert) b.afterInsert();
  }
  push(sc);
}
