/* ===== fmenu.js : Funktionsmenue (Gitter-Symbol): alle Funktionen nach Themen, ohne 2nd ===== */
const FM_KEY = 'exakto.recent.v1';
const fmApp = act => () => { doMenu(act); renderAll(); };
const fmOpen = name => () => openByName(name);
// [Tab, [[id, Beschriftung, Aktion]]]; Aktion: {st:'frac'} fuegt Struktur ein, {t:'ln('} ein Token, {run} fuehrt aus
const FM_GROUPS = [
  ['CALC', [
    ['frac', 'Bruch a/b', { st: 'frac' }], ['mix', 'Gemischte Zahl', { st: 'mix' }], ['pow', 'Potenz xⁿ', { st: 'pow' }], ['sqrt', 'Wurzel √', { st: 'sqrt' }],
    ['root', 'n-te Wurzel', { st: 'root' }], ['abs', 'Betrag |x|', { st: 'abs' }], ['sum', 'Summe Σ', { st: 'sum' }], ['prod', 'Produkt Π', { st: 'prod' }],
    ['int', 'Integral ∫', { st: 'int' }], ['deriv', 'Ableitung d/dx', { st: 'deriv' }],
  ]],
  ['SOLVE', [
    ['numsolve', 'Gleichung lösen (numerisch)', { run: fmOpen('numsolve') }], ['polysolve', 'Polynom (Grad 2/3)', { run: fmOpen('polysolve') }],
    ['syssolve', 'Gleichungssystem (2/3)', { run: fmOpen('syssolve') }], ['exprEval', 'Ausdruck auswerten', { run: fmOpen('exprEval') }], ['table', 'Wertetabelle', { run: fmOpen('table') }],
  ]],
  ['ALGEBRA', [
    ['complex', 'Komplexe Zahlen', { run: fmOpen('complex') }], ['matrix', 'Matrizen', { run: fmOpen('matrix') }], ['vector', 'Vektoren', { run: fmOpen('vector') }],
    ['opmenu', 'Pol, Rec, Primfaktoren …', { run: fmOpen('opmenu') }], ['setop', 'Mengen (L1–L3)', { run: fmOpen('setop') }],
  ]],
  ['STAT', [
    ['data', 'Daten (L1–L3)', { run: fmOpen('data') }], ['stat', 'Statistik 1-Var / 2-Var', { run: fmOpen('stat') }], ['statdistr', 'Verteilungen', { run: fmOpen('statdistr') }],
    ['prb', 'Wahrscheinlichkeit (nCr, nPr, !)', { run: fmOpen('prb') }], ['random', 'Zufallszahlen', { run: fmOpen('random') }],
  ]],
  ['NUM', [
    ['math', 'Mathe-Funktionen', { run: fmOpen('math') }], ['base', 'Zahlensysteme (Bin, Oct, Hex)', { run: fmOpen('base') }], ['conv', 'Umrechnung (Einheiten)', { run: fmOpen('conv') }],
    ['const', 'Konstanten', { run: fmOpen('const') }], ['angle', 'Winkel (°, rad, gon)', { run: fmOpen('angle') }], ['rp', 'Polar ⇄ Kartesisch', { run: fmOpen('rp') }],
    ['var', 'Variablen', { run: fmOpen('var') }], ['sto', 'Wert speichern →', { run: fmOpen('sto') }], ['rcl', 'Wert abrufen', { run: fmOpen('rcl') }],
  ]],
  ['TOOLS', [
    ['graph', 'Graph zeichnen (F2)', { run: fmApp('graph') }], ['tools', 'Engineering · Elektrotechnik (F3)', { run: fmApp('tools') }],
  ]],
  ['APP', [
    ['calc', 'Rechner (Startbildschirm)', { run: fmApp('calc') }], ['mode', 'Modus (Winkel, Format, Stellen)', { run: fmOpen('mode') }],
    ['help', 'Einstellungen & Hilfe (?)', { run: fmApp('help') }], ['reset', 'Zurücksetzen …', { run: fmOpen('reset') }],
  ]],
];
const FM_INDEX = {}; FM_GROUPS.forEach(([, items]) => items.forEach(([id, l, act]) => { FM_INDEX[id] = { id, l, act }; }));
function fmRecent() {
  try { const a = JSON.parse(localStorage.getItem(FM_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => typeof x === 'string' && FM_INDEX[x]).slice(0, 5) : []; } catch (e) { return []; }
}
function fmNote(id) {
  try { const a = [id].concat(fmRecent().filter(x => x !== id)).slice(0, 5); localStorage.setItem(FM_KEY, JSON.stringify(a)); } catch (e) { /* egal */ }
}
function fmItem(e) {
  const it = { l: tr(e.l), onChoose: () => fmNote(e.id) };
  if (e.act.run) it.run = e.act.run; else if (e.act.st) it.st = e.act.st; else it.t = [].concat(e.act.t);
  return it;
}
function functionMenuDef() {
  const tabs = []; const rec = fmRecent();
  if (rec.length) tabs.push({ name: 'RECENT', items: rec.map(id => fmItem(FM_INDEX[id])) });
  FM_GROUPS.forEach(([name, items]) => tabs.push({ name, items: items.map(([id, l, act]) => fmItem({ id, l, act })) }));
  return { title: 'FUNKTIONEN', tabs };
}
function openFunctionMenu() {
  if (typeof showPanel === 'function' && panelOpen()) showPanel(null);
  if (ST.off) { ST.off = false; }
  const c = cur(); if (c.type === 'menu' && c.def && c.def.title === 'FUNKTIONEN') { pop(); renderAll(); return; }
  openMenu(functionMenuDef()); renderAll();
}
