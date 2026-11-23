/* ===== tools.js : Menue, Engineering-Panel (Elektrotechnik) ===== */
const Lg = (de, en) => (UI.lang === 'en' ? en : de);
const ENG_ERR = {
  EMPTY: ['Wert fehlt', 'Value missing'], SYNTAX: ['Eingabe nicht lesbar', 'Cannot read input'],
  UNIT: ['Einheit passt nicht zum Feld', 'Unit does not match the field'], PREFIX: ['Präfix K ist nicht erlaubt (Kilo = k)', 'Prefix K is not allowed (kilo = k)'],
  TWO_VALUES: ['Genau zwei Werte eingeben', 'Enter exactly two values'], ZERO: ['Division durch 0', 'Division by zero'],
  NEGATIVE: ['Werte mit gleichem Vorzeichen nötig', 'Values need the same sign'], POSITIVE: ['Muss grösser als 0 sein', 'Must be greater than 0'],
  OVERFLOW: ['Zahl zu gross', 'Number too large'],
};
const engMsg = e => { const m = ENG_ERR[e.code]; return m ? m[UI.lang === 'en' ? 1 : 0] + (e.detail && e.code !== 'ZERO' && e.code !== 'POSITIVE' ? ' (' + e.detail + ')' : e.detail ? ' (' + e.detail + ')' : '') : String(e.message || e); };
const TOOLS = {
  tab: 'ohm', vals: {}, order: [],
  defs: {
    ohm: { name: () => Lg('Ohmsches Gesetz', "Ohm's law"), fields: [['U', 'V', Lg('Spannung', 'Voltage')], ['I', 'A', Lg('Strom', 'Current')], ['R', 'Ω', Lg('Widerstand', 'Resistance')], ['P', 'W', Lg('Leistung', 'Power')]],
      note: () => Lg('Zwei Werte eingeben (die zuletzt bearbeiteten zwei zählen). Formeln: U = R·I, P = U·I.', 'Enter two values (the two most recently edited count). Formulas: U = R·I, P = U·I.') },
    div: { name: () => Lg('Spannungsteiler', 'Voltage divider'), fields: [['Uin', 'V', Lg('Eingangsspannung', 'Input voltage')], ['R1', 'Ω', 'R1'], ['R2', 'Ω', 'R2']],
      note: () => Lg('Unbelastet: Uout = Uin · R2 / (R1 + R2).', 'Unloaded: Uout = Uin · R2 / (R1 + R2).') },
    rlc: { name: () => Lg('Reihen-RLC', 'Series RLC'), fields: [['f', 'Hz', Lg('Frequenz', 'Frequency')], ['R', 'Ω', 'R'], ['L', 'H', 'L'], ['C', 'F', 'C'], ['U', 'V', Lg('Spannung (Effektivwert, optional)', 'Voltage (rms, optional)')]],
      note: () => Lg('Eingeschwungener sinusförmiger Zustand, Reihenschaltung. ZR = R, ZL = jωL, ZC = 1/(jωC), ω = 2πf. Felder dürfen leer bleiben (= 0 / nicht vorhanden).', 'Sinusoidal steady state, series circuit. ZR = R, ZL = jωL, ZC = 1/(jωC), ω = 2πf. Fields may stay empty (= 0 / absent).') },
    pre: { name: () => Lg('SI-Präfixe', 'SI prefixes'), fields: [['x', '', Lg('Wert, z. B. 4.7k, 100n, 47µ, 330m', 'Value, e.g. 4.7k, 100n, 47µ, 330m')]],
      note: () => Lg('Gross-/Kleinschreibung zählt: m = milli, M = mega. µ, μ und u sind Mikro.', 'Case matters: m = milli, M = mega. µ, μ and u mean micro.') },
  },
  compute() {
    const d = TOOLS.defs[TOOLS.tab], V = TOOLS.vals, out = [];
    const num = (k, unit, optional) => { const t = (V[k] || '').trim(); if (t === '') { if (optional) return undefined; throw new ENG.EngError('EMPTY', k); } try { return ENG.parseSI(t, unit); } catch (e) { if (e.detail !== undefined) e.detail = k + (e.detail ? ': ' + e.detail : ''); throw e; } };
    const line = (n, v, u) => out.push([n, ENG.fmtSI(v, u, 6)]);
    if (TOOLS.tab === 'ohm') {
      const given = {}; const keys = TOOLS.order.filter(k => (V[k] || '').trim() !== '').slice(-2);
      if (keys.length < 2) throw new ENG.EngError('TWO_VALUES');
      keys.forEach(k => { given[k] = num(k, d.fields.find(f => f[0] === k)[1]); });
      const r = ENG.ohm(given); line('U', r.U, 'V'); line('I', r.I, 'A'); line('R', r.R, 'Ω'); line('P', r.P, 'W');
    } else if (TOOLS.tab === 'div') {
      const r = ENG.divider(num('Uin', 'V'), num('R1', 'Ω'), num('R2', 'Ω')); line('Uout', r.Uout, 'V'); line('I', r.I, 'A'); out.push([Lg('Verhältnis', 'Ratio'), String(Number(r.ratio.toPrecision(6)))]);
    } else if (TOOLS.tab === 'rlc') {
      const r = ENG.rlc({ f: num('f', 'Hz'), R: num('R', 'Ω', true) || 0, L: num('L', 'H', true) || 0, C: num('C', 'F', true) || 0, U: num('U', 'V', true) });
      line('ω', r.w, 'rad/s'); line('XL', r.XL, 'Ω'); line('XC', r.XC, 'Ω'); line('|Z|', r.Z, 'Ω'); out.push(['φ', String(Number(r.phi.toPrecision(6))).replace('-', '−') + ' °']);
      if (r.f0 !== undefined) line('f₀', r.f0, 'Hz');
      if (r.I !== undefined) { line('I', r.I, 'A'); line('S', r.S, 'VA'); line('P', r.P, 'W'); line('Q', r.Q, 'var'); }
    } else {
      const t = (V.x || '').trim(); if (t === '') throw new ENG.EngError('EMPTY'); const v = ENG.parseSI(t, '');
      out.push([Lg('Zahl', 'Number'), String(v)]); out.push([Lg('Technisch', 'Engineering'), ENG.fmtSI(v, '', 6).trim()]);
    }
    return out;
  },
  render() {
    const aside = document.getElementById('toolsAside'); if (!aside) return;
    const d = TOOLS.defs[TOOLS.tab];
    let h = `<button type="button" class="hclose" id="toolsClose" aria-label="${Lg('Schliessen', 'Close')}">×</button><h2>${Lg('Engineering · Elektrotechnik', 'Engineering · Electrical')}</h2>`;
    h += '<div class="seg tabs" role="tablist">' + Object.keys(TOOLS.defs).map(k => `<button type="button" role="tab" aria-selected="${k === TOOLS.tab}" data-tab="${k}" class="${k === TOOLS.tab ? 'on' : ''}">${esc(TOOLS.defs[k].name())}</button>`).join('') + '</div>';
    h += '<div class="tfields">' + d.fields.map(f => `<label class="tf"><span>${esc(f[0])} <i>${esc(f[1])}</i><small>${esc(f[2] === f[0] ? '' : f[2])}</small></span><input type="text" inputmode="text" autocomplete="off" spellcheck="false" data-f="${f[0]}" value="${esc(TOOLS.vals[f[0]] || '')}" placeholder="${f[1] ? '4.7k' + f[1] : '4.7k'}"></label>`).join('') + '</div>';
    h += `<div id="toolsOut" class="tout" aria-live="polite"></div><p class="mut tnote">${esc(d.note())}</p>`;
    aside.innerHTML = h; TOOLS.update();
    aside.querySelector('#toolsClose').addEventListener('click', () => showPanel(null));
    aside.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { TOOLS.tab = b.dataset.tab; TOOLS.render(); }));
    aside.querySelectorAll('input[data-f]').forEach(i => i.addEventListener('input', () => {
      TOOLS.vals[i.dataset.f] = i.value; TOOLS.order = TOOLS.order.filter(k => k !== i.dataset.f); TOOLS.order.push(i.dataset.f); TOOLS.update();
    }));
  },
  update() {
    const box = document.getElementById('toolsOut'); if (!box) return;
    try {
      const rows = TOOLS.compute();
      box.className = 'tout'; box.innerHTML = '<table>' + rows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('') + '</table>' +
        `<p class="mut">≈ ${Lg('Näherung (Gleitkomma), 6 signifikante Stellen', 'approximation (floating point), 6 significant digits')}</p>`;
    } catch (e) {
      if (!(e instanceof ENG.EngError)) throw e;
      box.className = 'tout err'; box.innerHTML = `<p>${esc(engMsg(e))}</p>`;
    }
  },
};
function openTools() { showPanel('tools'); }
/* Panels: genau eines offen (help | tools | null) */
function showPanel(name) {
  const h = document.getElementById('helpPanel'), t = document.getElementById('toolsPanel');
  if (name === 'tools') TOOLS.render();
  h.classList.toggle('open', name === 'help'); t.classList.toggle('open', name === 'tools');
  document.getElementById('helpBtn').setAttribute('aria-expanded', name === 'help' ? 'true' : 'false');
  closeMenu();
  if (name === 'tools') { const i = t.querySelector('input'); if (i) setTimeout(() => i.focus(), 60); }
  if (!name) { try { document.body.focus(); } catch (e) { /* egal */ } }
}
const panelOpen = () => document.getElementById('helpPanel').classList.contains('open') ? 'help' : document.getElementById('toolsPanel').classList.contains('open') ? 'tools' : null;
function closeMenu() { const m = document.getElementById('menuList'); if (m) { m.hidden = true; document.getElementById('menuBtn').setAttribute('aria-expanded', 'false'); } }
function doMenu(act) {
  closeMenu();
  if (act === 'calc') { showPanel(null); goHome(); renderAll(); }
  else if (act === 'graph') { showPanel(null); goHome(); openGraphForm(); renderAll(); }
  else if (act === 'tools') showPanel('tools');
  else if (act === 'help') showPanel('help');
}
function initMenu() {
  const b = document.getElementById('menuBtn'), m = document.getElementById('menuList');
  b.addEventListener('click', e => { e.stopPropagation(); const open = m.hidden; m.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) { const f = m.querySelector('button'); if (f) f.focus(); } });
  m.querySelectorAll('[data-act]').forEach(x => x.addEventListener('click', () => doMenu(x.dataset.act)));
  m.addEventListener('keydown', e => {
    const items = [...m.querySelectorAll('button')], i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); b.focus(); }
  });
  document.addEventListener('click', e => { if (!m.hidden && !e.target.closest('.mwrap')) closeMenu(); });
  document.getElementById('toolsPanel').addEventListener('click', e => { if (e.target.id === 'toolsPanel') showPanel(null); });
}
