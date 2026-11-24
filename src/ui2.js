/* ===== ui2.js : Bildschirme, Eingabe, Rendern ===== */
const ERR_DE = {
  'SYNTAX': 'Syntaxfehler', 'DOMAIN': 'Wert außerhalb des Definitionsbereichs', 'DIVIDE BY 0': 'Division durch 0',
  'OVERFLOW': 'Zahl zu groß', 'NONREAL ANSWER': 'Ergebnis nicht reell', 'STAT': 'Keine/zu wenige Daten',
  'NO UNIQUE SOLUTION': 'Keine eindeutige Lösung', 'TOO COMPLEX': 'Ausdruck zu komplex', 'TIMEOUT': 'Berechnung dauert zu lange (abgebrochen)', 'DIMENSION': 'Falsche Größe von Matrix/Vektor', 'SINGULAR MAT': 'Matrix nicht invertierbar',
};
function openErr(code, onGoto) {
  const sc = {
    type: 'err', overlay: true, sel: 0, editor() { return null; },
    render() {
      return `<div class="errt">ERROR: ${esc(code)}</div><div class="errd">${esc(tr(ERR_DE[code] || ''))}</div>` +
        `<div class="mi ${sc.sel === 0 ? 'sel' : ''}" data-tap="1"><b>1</b> Quit</div><div class="mi ${sc.sel === 1 ? 'sel' : ''}" data-tap="2"><b>2</b> Goto</div>`;
    },
    cmd(c) {
      const quit = () => { pop(); if (cur().type === 'home') ST.ed.clear(); };
      const go = () => { pop(); if (onGoto) onGoto(); };
      if (c.k === 'tap') { c.key === '1' ? quit() : go(); return true; }
      if (c.k === 'nav') { if (c.d === 'up' || c.d === 'down') sc.sel = 1 - sc.sel; return true; }
      if (c.k === 'enter') { sc.sel === 0 ? quit() : go(); return true; }
      if (c.k === 'tok' && c.t[0] === '1') { quit(); return true; }
      if (c.k === 'tok' && c.t[0] === '2') { go(); return true; }
      if (c.k === 'clear') { quit(); return true; }
      if (c.k === 'quit') { goHome(); return true; }
      return true;
    },
  };
  push(sc);
}
function guard(fn, onGoto) { try { fn(); } catch (e) { if (e instanceof CalcError) openErr(e.code, onGoto); else { console.error(e); say('Interner Fehler: ' + e.message); } } }

/* ---------- Home ---------- */
HOME.editor = () => { ST.hsel = null; return ST.ed; };
HOME.cmd = function (c) {
  switch (c.k) {
    case 'tap': { const h = ST.hist[+c.key.slice(2)]; ST.hsel = null; if (h) ST.ed.insMany(h.t); return true; }
    case 'enter': return homeEnter();
    case 'clear':
      if (ST.hsel !== null) ST.hsel = null; else if (!ST.ed.isEmpty()) ST.ed.clear(); else { ST.hist = []; save(); }
      return true;
    case 'open': openByName(c.name); return true;
    case 'quit': goHome(); return true;
    case 'fd': {
      const i = ST.hsel !== null ? ST.hsel : ST.hist.length - 1;
      if (i >= 0 && ST.hist[i]) { ST.hist[i].alt = !ST.hist[i].alt; }
      return true;
    }
    case 'nav':
      if (ST.hsel !== null) {
        if (c.d === 'up') ST.hsel = Math.max(0, ST.hsel - 1);
        else if (c.d === 'down') { ST.hsel++; if (ST.hsel >= ST.hist.length) ST.hsel = null; }
        else { ST.hsel = null; edCmd(ST.ed, c, { ans: true }); }
        return true;
      }
      if (edCmd(ST.ed, c, { ans: true })) return true;
      if (c.d === 'up' && ST.hist.length) ST.hsel = ST.hist.length - 1;
      return true;
    default:
      ST.hsel = null; edCmd(ST.ed, c, { ans: true }); return true;
  }
};
function homeEnter() {
  if (ST.hsel !== null) { const h = ST.hist[ST.hsel]; ST.hsel = null; if (h) ST.ed.insMany(h.t); return true; }
  if (ST.ed.isEmpty()) return true;
  const toks = ST.ed.t.slice();
  guard(() => {
    const v = evalTokens(toks);
    S.ans = v; ST.hist.push({ t: toks, v, alt: false }); if (ST.hist.length > 80) ST.hist.shift();
    ST.ed.clear(); save();
  }, () => { ST.ed.c = ST.ed.t.length; });
  return true;
}
function resHTML(h) {
  const dec = (S.res === 'DEC') !== !!h.alt;
  return fmtVal(h.v, dec).html;
}
HOME.render = function () {
  let h = '<div class="hist">';
  ST.hist.forEach((e, i) => {
    h += `<div class="ent ${ST.hsel === i ? 'sel' : ''}" data-tap="h:${i}"><div class="ex">${rStatic(e.t)}</div><div class="rs">${resHTML(e)}</div></div>`;
  });
  h += `<div class="ent cur"><div class="ex">${rEd(ST.ed, ST.hsel === null)}</div></div></div>`;
  return h;
};

/* ---------- Modus ---------- */
function openMode() {
  const rows = [
    { name: 'Winkel', opts: ['DEG', 'RAD', 'GRAD'], get: () => S.angle, set: v => { S.angle = v; } },
    { name: 'Format', opts: ['NORM', 'SCI', 'ENG'], get: () => S.fmt.mode, set: v => { S.fmt.mode = v; } },
    { name: 'Stellen', opts: ['FLOAT', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], get: () => (S.fmt.dec === 'F' ? 'FLOAT' : S.fmt.dec), set: v => { S.fmt.dec = v === 'FLOAT' ? 'F' : v; } },
    { name: 'Ergebnis', opts: ['AUTO', 'DEC'], get: () => S.res, set: v => { S.res = v; } },
    { name: 'Bruch', opts: ['n/d', 'Un/d'], get: () => S.frac, set: v => { S.frac = v; } },
  ];
  const sc = {
    type: 'mode', row: 0, col: 0, editor() { return null; },
    render() {
      return '<div class="mtabs"><span class="on">MODE</span></div>' + rows.map((r, i) =>
        `<div class="mrow ${i === sc.row ? 'cur' : ''}"><i>${r.name}</i>` +
        r.opts.map((o, j) => `<span class="${r.get() === o ? 'on' : ''} ${i === sc.row && j === sc.col ? 'cc' : ''}" data-tap="m:${i}:${j}">${o}</span>`).join('') + '</div>').join('');
    },
    cmd(c) {
      const r = rows[sc.row];
      if (c.k === 'tap') { const [, i, j] = c.key.split(':').map(Number); sc.row = i; sc.col = j; rows[i].set(rows[i].opts[j]); save(); return true; }
      if (c.k === 'nav') {
        if (c.d === 'up' || c.d === 'down') { sc.row = (sc.row + (c.d === 'down' ? 1 : rows.length - 1)) % rows.length; sc.col = Math.max(0, r2().opts.indexOf(r2().get())); }
        else sc.col = Math.max(0, Math.min(r.opts.length - 1, sc.col + (c.d === 'right' ? 1 : -1)));
        return true;
      }
      if (c.k === 'enter') { r.set(r.opts[sc.col]); save(); return true; }
      if (c.k === 'clear' || (c.k === 'open' && c.name === 'mode')) { pop(); return true; }
      if (c.k === 'quit') { goHome(); return true; }
      if (c.k === 'open') { pop(); openByName(c.name); return true; }
      return true;
    },
  };
  const r2 = () => rows[sc.row];
  sc.col = Math.max(0, rows[0].opts.indexOf(rows[0].get()));
  push(sc);
}

/* ---------- generische Listenanzeige ---------- */
function openList(title, lines, onClose) {
  const sc = {
    type: 'list', off: 0, editor() { return null; },
    render() {
      return `<div class="mtabs"><span class="on">${esc(title)}</span></div><div class="llist">` + lines.map((l, i) => `<div class="ln ${i === sc.off ? 'sel' : ''}" data-tap="l:${i}">${l}</div>`).join('') + '</div>';
    },
    cmd(c) {
      if (c.k === 'tap') { sc.off = +c.key.slice(2); return true; }
      if (c.k === 'nav') { if (c.d === 'up') sc.off = Math.max(0, sc.off - 1); else if (c.d === 'down') sc.off = Math.min(lines.length - 1, sc.off + 1); return true; }
      if (c.k === 'clear' || c.k === 'enter') { const i = sc.off; pop(); if (onClose) onClose(i); return true; }
      if (c.k === 'quit') { goHome(); return true; }
      if (c.k === 'open') { pop(); openByName(c.name); return true; }
      return true;
    },
  };
  push(sc);
}

/* ---------- Formulare ---------- */
function openForm(def) {
  const vis = () => def.fields.filter(f => !f.show || f.show());
  const sc = {
    type: 'form', sel: def.startSel || 0, def,
    editor() { const f = vis()[sc.sel]; return f && f.type === 'expr' ? f.ed : null; },
    render() {
      const fs = vis(); let h = `<div class="mtabs"><span class="on">${esc(def.title)}</span></div><div class="form">`;
      let line = '', lastGrp = null;
      fs.forEach((f, i) => {
        const on = i === sc.sel; let cell;
        if (f.type === 'expr') cell = `<span class="fcell ${on ? 'sel' : ''}" data-tap="f:${i}">${rEd(f.ed, on)}</span>`;
        else if (f.type === 'choice') cell = f.opts.length > 4 ? `<span class="fopt on ${on ? 'sel' : ''}" data-tap="c:${i}">◀ ${esc(f.opts[f.idx])} ▶</span>` : f.opts.map((o, j) => `<span class="fopt ${j === f.idx ? 'on' : ''} ${on && j === f.idx ? 'sel' : ''}" data-tap="o:${i}:${j}">${esc(o)}</span>`).join('');
        else cell = `<span class="fbtn ${on ? 'sel' : ''}" data-tap="f:${i}">${esc(f.label)}</span>`;
        const lab = f.type === 'btn' ? '' : (f.label ? `<span class="flab">${esc(f.label)}</span>` : '');
        const sfx = f.sfx ? `<span class="fsfx">${typeof f.sfx === 'function' ? esc(f.sfx()) : esc(f.sfx)}</span>` : '';
        const piece = lab + cell + sfx;
        if (f.grp !== undefined && f.grp === lastGrp) line += piece;
        else { if (line) h += `<div class="frow">${line}</div>`; line = piece; }
        lastGrp = f.grp;
      });
      if (line) h += `<div class="frow">${line}</div>`;
      return h + '</div>';
    },
    cmd(c) {
      const fs = vis(); if (sc.sel >= fs.length) sc.sel = fs.length - 1;
      const f = fs[sc.sel]; const E = f && f.type === 'expr' ? f.ed : null;
      const move = d => { sc.sel = Math.max(0, Math.min(fs.length - 1, sc.sel + d)); };
      switch (c.k) {
        case 'tap': {
          const [kind, a, b] = c.key.split(':'); const i = +a, g = fs[i]; if (!g) return true;
          sc.sel = i;
          if (kind === 'o') { g.idx = +b; if (g.onChange) g.onChange(); }
          else if (kind === 'c') { g.idx = (g.idx + 1) % g.opts.length; if (g.onChange) g.onChange(); }
          else if (g.type === 'btn') g.action(sc);
          return true;
        }
        case 'nav':
          if (E && edCmd(E, c, {})) {
            if ((c.d === 'left' || c.d === 'right') && f.grp !== undefined) {
              // an den Zellenraendern in die Nachbarzelle springen
            }
            return true;
          }
          if (c.d === 'left' || c.d === 'right') {
            if (f.type === 'choice') { f.idx = (f.idx + (c.d === 'right' ? 1 : f.opts.length - 1)) % f.opts.length; if (f.onChange) f.onChange(); }
            else if (f.grp !== undefined) move(c.d === 'right' ? 1 : -1);
            return true;
          }
          move(c.d === 'down' ? 1 : -1); return true;
        case 'enter':
          if (f.type === 'btn') { f.action(sc); return true; }
          if (sc.sel < fs.length - 1) move(1); else if (def.onSubmit) def.onSubmit(sc);
          return true;
        case 'clear':
          if (E && !E.isEmpty()) E.clear(); else pop();
          return true;
        case 'quit': goHome(); return true;
        case 'open': openByName(c.name); return true;
        case 'fd': return true;
        default:
          if (E) edCmd(E, c, {});
          else if (f.type === 'choice' && c.k === 'tok' && c.t.length === 1 && isDigit(c.t[0])) { const n = f.opts.findIndex(o => String(o) === c.t[0] || String(o).endsWith(c.t[0])); if (n >= 0) { f.idx = n; if (f.onChange) f.onChange(); } }
          return true;
      }
    },
  };
  // Zellen-Sprung bei Cursor am Rand
  const baseCmd = sc.cmd;
  sc.cmd = function (c) {
    const fs = vis(); const f = fs[sc.sel];
    if (c.k === 'nav' && f && f.type === 'expr' && f.grp !== undefined && (c.d === 'left' || c.d === 'right')) {
      const E = f.ed;
      if (c.d === 'left' && E.c === 0 && sc.sel > 0 && fs[sc.sel - 1].type === 'expr' && fs[sc.sel - 1].grp !== undefined) { sc.sel--; fs[sc.sel].ed.end(); return true; }
      if (c.d === 'right' && E.c === E.t.length && sc.sel < fs.length - 1 && fs[sc.sel + 1].type === 'expr' && fs[sc.sel + 1].grp !== undefined) { sc.sel++; fs[sc.sel].ed.home(); return true; }
    }
    return baseCmd(c);
  };
  push(sc);
  return sc;
}
const exprField = (label, init, o) => { const ed = new Editor(); if (init) ed.set(init); return Object.assign({ type: 'expr', label, ed }, o || {}); };
const choiceField = (label, opts, idx, o) => Object.assign({ type: 'choice', label, opts, idx: idx || 0 }, o || {});
const evalField = f => { if (f.ed.isEmpty()) return int(0); return evalTokens(f.ed.t); };

/* ---------- Tabelle ---------- */
function openTableForm() {
  const f1 = exprField('f(x)=', null), f2 = exprField('g(x)=', null), st = exprField('Start=', ['0']), sp = exprField('Step=', ['1']);
  if (ST.tableSave) { f1.ed.set(ST.tableSave.f); f2.ed.set(ST.tableSave.g); st.ed.set(ST.tableSave.s); sp.ed.set(ST.tableSave.p); }
  const submit = () => {
    ST.tableSave = { f: f1.ed.t.slice(), g: f2.ed.t.slice(), s: st.ed.t.slice(), p: sp.ed.t.slice() };
    guard(() => {
      const asts = [];
      if (!f1.ed.isEmpty()) asts.push({ n: 'f(x)', a: compileTokens(f1.ed.t) });
      if (!f2.ed.isEmpty()) asts.push({ n: 'g(x)', a: compileTokens(f2.ed.t) });
      if (!asts.length) err('SYNTAX');
      const start = evalField(st), step = evalField(sp);
      openTable(asts, start, step);
    });
  };
  openForm({ title: 'TABLE', fields: [f1, f2, st, sp, { type: 'btn', label: '[ Tabelle anzeigen ]', action: submit }], onSubmit: submit });
}
function openTable(asts, start, step) {
  const sc = {
    type: 'table', off: 0, editor() { return null; },
    xAt(k) { return add(start, mul(step, int(k))); },
    render() {
      let h = '<div class="mtabs"><span class="on">TABLE</span></div><table class="tbl"><tr><th>x</th>' + asts.map(a => `<th>${a.n}</th>`).join('') + '</tr>';
      for (let r = 0; r < 12; r++) {
        const k = sc.off + r; const x = sc.xAt(k);
        h += `<tr><td>${esc(fmtText(x))}</td>` + asts.map(a => {
          try { return `<td>${esc(fmtText(evalAst(a.a, { x })))}</td>`; } catch (e) { return '<td class="er">ERROR</td>'; }
        }).join('') + '</tr>';
      }
      return h + '</table>';
    },
    cmd(c) {
      if (c.k === 'nav') { if (c.d === 'up') sc.off--; else if (c.d === 'down') sc.off++; else if (c.d === 'left') sc.off -= 6; else sc.off += 6; return true; }
      if (c.k === 'clear' || c.k === 'enter' || (c.k === 'open' && c.name === 'table')) { pop(); return true; }
      if (c.k === 'quit') { goHome(); return true; }
      if (c.k === 'open') { pop(); openByName(c.name); return true; }
      return true;
    },
  };
  push(sc);
}

/* ---------- Daten-Editor ---------- */
const LNAMES = ['L1', 'L2', 'L3'];
function openData() {
  const sc = { type: 'data', row: 0, col: 0, hdr: false, edit: null, top: 0 };
  sc.editor = () => { if (!sc.edit) sc.edit = new Editor(); return sc.edit; };
  const cell = () => (S.lists[LNAMES[sc.col]] || [])[sc.row];
  const commit = () => {
    if (!sc.edit) return true;
    if (sc.edit.isEmpty()) { sc.edit = null; return true; }
    let ok = true;
    guard(() => {
      const v = toNum(evalTokens(sc.edit.t));
      const L = S.lists[LNAMES[sc.col]]; while (L.length < sc.row) L.push(null); L[sc.row] = v; sc.edit = null; save();
    }, () => { }); ok = !sc.edit; return ok;
  };
  sc.render = () => {
    if (sc.row < sc.top) sc.top = sc.row;
    if (sc.row >= sc.top + 6) sc.top = sc.row - 5;
    let h = '<div class="mtabs"><span class="on">DATA</span></div><table class="tbl dat"><tr>' +
      LNAMES.map((n, i) => `<th class="${sc.hdr && sc.col === i ? 'sel' : ''}" data-tap="h:${i}">${n}</th>`).join('') + '</tr>';
    for (let r = sc.top; r < sc.top + 6; r++) {
      h += '<tr>' + LNAMES.map((n, i) => {
        const v = S.lists[n][r]; const on = !sc.hdr && sc.row === r && sc.col === i;
        const txt = on && sc.edit ? rEd(sc.edit, true) : (v === null || v === undefined ? '' : floatHTML(fmtFloat(v)));
        return `<td class="${on ? 'sel' : ''}" data-tap="d:${r}:${i}">${txt}</td>`;
      }).join('') + '</tr>';
    }
    return h + '</table>' + `<div class="hint">${tr(sc.hdr ? 'clear: Liste leeren' : 'Zeile ' + (sc.row + 1) + ' · delete: Wert entfernen')}</div>`;
  };
  sc.cmd = c => {
    switch (c.k) {
      case 'tap': { if (sc.edit && !commit()) return true; const p = c.key.split(':'); if (p[0] === 'd') { sc.hdr = false; sc.row = +p[1]; sc.col = +p[2]; } else { sc.hdr = true; sc.col = +p[1]; } return true; }
      case 'nav': {
        if (sc.edit && edCmd(sc.edit, c, {})) return true;
        if (sc.edit && (c.d === 'up' || c.d === 'down')) { if (!commit()) return true; }
        if (c.d === 'left') sc.col = Math.max(0, sc.col - 1);
        else if (c.d === 'right') sc.col = Math.min(2, sc.col + 1);
        else if (c.d === 'up') { if (sc.hdr) { } else if (sc.row === 0) sc.hdr = true; else sc.row--; }
        else { if (sc.hdr) sc.hdr = false; else if (sc.row < 98) sc.row++; }
        return true;
      }
      case 'enter': if (sc.edit) { if (commit()) { if (sc.row < 98) sc.row++; } } else if (sc.hdr) sc.hdr = false; else if (sc.row < 98) sc.row++; return true;
      case 'bs':
        if (sc.edit) { sc.edit.bs(); if (sc.edit.isEmpty()) sc.edit = null; }
        else if (!sc.hdr) { const L = S.lists[LNAMES[sc.col]]; if (sc.row < L.length) { L.splice(sc.row, 1); save(); } }
        return true;
      case 'clear':
        if (sc.edit) sc.edit = null;
        else if (sc.hdr) { S.lists[LNAMES[sc.col]] = []; say(LNAMES[sc.col] + ' geleert'); save(); }
        else pop();
        return true;
      case 'quit': goHome(); return true;
      case 'open': if (c.name === 'data') { pop(); return true; } openByName(c.name); return true;
      case 'fd': return true;
      default:
        if (sc.hdr) return true;
        edCmd(sc.editor(), c, {}); return true;
    }
  };
  push(sc);
}

/* ---------- Statistik ---------- */
function listOf(sel) { return S.lists[LNAMES[sel]]; }
function openStatForm(two) {
  const fx = choiceField('X Data:', LNAMES, 0);
  const fy = choiceField('Y Data:', LNAMES, 1, { show: () => two });
  const fq = choiceField('FRQ:', ['ONE', ...LNAMES], 0);
  const fr = choiceField('Reg:', REG_TYPES, 0, { show: () => two });
  const calc = () => guard(() => {
    const frq = fq.idx === 0 ? null : listOf(fq.idx - 1);
    let res, lines = [];
    if (!two) {
      res = calc1Var(listOf(fx.idx), frq);
      const items = [['n', 'n'], ['xbar', 'x̄'], ['Sx', 'Sx'], ['sigx', 'σx'], ['sumx', 'Σx'], ['sumx2', 'Σx²'], ['minX', 'minX'], ['Q1', 'Q1'], ['Med', 'Med'], ['Q3', 'Q3'], ['maxX', 'maxX']];
      lines = items.map(([k, n]) => statLine(n, res[k]));
    } else {
      res = calc2Var(listOf(fx.idx), listOf(fy.idx), frq, REG_TYPES[fr.idx]);
      const items = [['n', 'n'], ['xbar', 'x̄'], ['Sx', 'Sx'], ['sigx', 'σx'], ['ybar', 'ȳ'], ['Sy', 'Sy'], ['sigy', 'σy'], ['sumx', 'Σx'], ['sumx2', 'Σx²'], ['sumy', 'Σy'], ['sumy2', 'Σy²'], ['sumxy', 'Σxy'], ['a', 'a'], ['b', 'b'], ['c', 'c'], ['d', 'd'], ['r', 'r'], ['R2', 'R²']];
      lines = [`<b>${esc(REG_TYPES[fr.idx])}</b>`];
      for (const [k, n] of items) if (res[k] !== undefined) lines.push(statLine(n, res[k]));
      if (res.regErr) lines.push('Regression: ' + esc(tr(ERR_DE[res.regErr] || res.regErr)));
    }
    S.statvars = res; S.stat = true; save();
    openList(two ? '2-VAR STATS' : '1-VAR STATS', lines);
  });
  openForm({ title: two ? '2-VAR STATS' : '1-VAR STATS', fields: [fx, fy, fq, fr, { type: 'btn', label: '[ CALC ]', action: calc }], onSubmit: calc });
}
function statLine(name, v) {
  if (v === undefined || Number.isNaN(v)) return `<span class="sl">${esc(name)}</span> <span class="sv">—</span>`;
  return `<span class="sl">${esc(name)}</span> <span class="sv">${fmtAutoNumFloat(v)}</span>`;
}
const fmtAutoNumFloat = v => floatHTML(fmtFloat(v));
function openStatMenu() {
  openMenu({
    title: 'STAT', tabs: [{ name: 'STAT', items: [
      { l: '1-Var Stats', run: () => openStatForm(false) },
      { l: '2-Var Stats', run: () => openStatForm(true) },
      { l: 'StatVars', run: () => openMenu(statVarsMenu()) },
    ] }],
  });
}

/* ---------- Gleichungsloeser ---------- */
function topLevelEq(t) { let d = 0; for (let i = 0; i < t.length; i++) { if (isOpen(t[i])) d++; else if (isClose(t[i])) d--; else if (d === 0 && t[i] === '=') return i; } return -1; }
function openNumSolver() {
  const lhs = exprField('', null, { grp: 1, sfx: '=' }), rhs = exprField('', null, { grp: 1 });
  const submit = () => guard(() => {
    if (lhs.ed.isEmpty()) err('SYNTAX');
    const L = compileTokens(lhs.ed.t); const R = rhs.ed.isEmpty() ? null : compileTokens(rhs.ed.t);
    const used = lhs.ed.t.concat(rhs.ed.t).filter(isVarTok); const v = used.indexOf('x') >= 0 ? 'x' : used[0];
    if (!v) err('SYNTAX');
    const f = x => { const loc = { [v]: F(x) }; return toNum(evalAst(L, loc)) - (R ? toNum(evalAst(R, loc)) : 0); };
    const roots = findRoots(f);
    /* Numerische Ergebnisse sind Naeherungen: immer als Dezimalwert mit ≈ (nie als scheinbar exakter Bruch).
       Unbestaetigte Kandidaten (kein Vorzeichenwechsel nachweisbar) tragen ein ? und einen Hinweis. */
    const line = r => { const a = fmtApprox(r.x).html; return r.confirmed
      ? `<span class="sl">${v} ≈</span> <span class="sv">${a}</span>`
      : `<span class="sl">${v} ≈</span> <span class="sv">${a}</span> <span class="un">? ${tr('unbestätigt')}</span>`; };
    const lines = roots.map(line);
    const anyUn = roots.some(r => !r.confirmed), anyOk = roots.some(r => r.confirmed);
    if (!roots.length) lines.push(tr('Keine Lösung gefunden'));
    else if (!anyOk) lines.unshift(`<span class="un">${tr('Keine bestätigte Lösung')}</span>`);
    if (anyUn) lines.push(`<span class="un">${tr('? Berührung ohne Vorzeichenwechsel: mehrfache Nullstelle oder Minimum nahe 0')}</span>`);
    openList('NUM-SOLV', lines);
  });
  openForm({ title: 'NUM-SOLV   Gleichung', fields: [lhs, rhs, { type: 'btn', label: '[ SOLVE ]', action: submit }], onSubmit: submit });
}
function openExprEval() {
  const ex = exprField('', null); const names = ['x', 'y', 'z', 't'];
  const vs = names.map(v => exprField(v + '=', null, { grp: 1 }));
  const submit = () => guard(() => {
    if (ex.ed.isEmpty()) err('SYNTAX');
    const ast = compileTokens(ex.ed.t); const local = {};
    vs.forEach((f, i) => { if (!f.ed.isEmpty()) local[names[i]] = evalTokens(f.ed.t); });
    const v = evalAst(ast, local);
    openList('EXPR-EVAL', [`<div>${rStatic(ex.ed.t)}</div><div style="text-align:right;font-weight:700">${fmtVal(v, S.res === 'DEC').html}</div>`]);
  });
  openForm({ title: 'EXPR-EVAL   (leer = gespeicherter Wert)', fields: [ex, ...vs, { type: 'btn', label: '[ EVAL ]', action: submit }], onSubmit: submit });
}
function openPolySolver() {
  const deg = choiceField('Grad:', ['2', '3'], 0, { onChange: () => { } });
  const fa = exprField('', null, { grp: 1, sfx: () => (deg.idx === 0 ? 'x²+' : 'x³+') });
  const fb = exprField('', null, { grp: 1, sfx: () => (deg.idx === 0 ? 'x+' : 'x²+') });
  const fc = exprField('', null, { grp: 1, sfx: () => (deg.idx === 0 ? '=0' : 'x+') });
  const fd = exprField('', null, { grp: 1, show: () => deg.idx === 1, sfx: '=0' });
  const fmtRoot = r => (r.t ? fmtVal(r, false) : fmtCplx(r));
  const submit = () => guard(() => {
    const a = evalField(fa), b = evalField(fb), c = evalField(fc);
    let roots;
    if (deg.idx === 0) roots = solveQuadratic(a, b, c).roots; else roots = solveCubic(a, b, c, evalField(fd)).roots;
    openList('POLY SOLVE', roots.map((r, i) => `<span class="sl">x${i + 1} =</span> <span class="sv">${fmtRoot(r).html}</span>`));
  });
  openForm({ title: 'POLYNOMIAL', startSel: 1, fields: [deg, fa, fb, fc, fd, { type: 'btn', label: '[ SOLVE ]', action: submit }], onSubmit: submit });
}
function openSimult() {
  const n = choiceField('Gleichungen:', ['2', '3'], 0);
  const fields = [n]; const cells = [];
  for (let r = 0; r < 3; r++) {
    const row = [];
    const mk = (j, sfx, show) => { const f = exprField('', null, { grp: 10 + r, sfx, show }); row.push(f); fields.push(f); };
    mk(0, 'x+', r === 2 ? () => n.idx === 1 : null);
    mk(1, () => (n.idx === 0 ? 'y=' : 'y+'), r === 2 ? () => n.idx === 1 : null);
    mk(2, 'z=', () => n.idx === 1 && (r < 3));
    mk(3, '', r === 2 ? () => n.idx === 1 : null);
    // fuer n=2: Spalte 2 (z) ausgeblendet; "y=" Konstante steht in Spalte 3
    cells.push(row);
  }
  // Sichtbarkeit je nach Gleichungszahl
  const showRow = r => () => n.idx === 1 || r < 2;
  cells.forEach((row, r) => {
    row[0].show = showRow(r); row[1].show = showRow(r);
    row[2].show = () => n.idx === 1; row[3].show = showRow(r);
    row[1].sfx = () => (n.idx === 0 ? 'y=' : 'y+');
    // Konstante: bei n=2 steht sie in Spalte 3 (Index 3) - Index 2 (z) ist verborgen
  });
  const submit = () => guard(() => {
    const m = n.idx === 0 ? 2 : 3; const M = [];
    for (let r = 0; r < m; r++) {
      const row = [evalField(cells[r][0]), evalField(cells[r][1])];
      if (m === 3) row.push(evalField(cells[r][2]));
      row.push(evalField(cells[r][3])); M.push(row);
    }
    const sol = solveSystem(M); const names = ['x', 'y', 'z'];
    openList('SIMULT', sol.map((v, i) => `<span class="sl">${names[i]} =</span> <span class="sv">${fmtVal(v, false).html}</span>`));
  });
  openForm({ title: 'SIMULT EQN', startSel: 1, fields: [...fields, { type: 'btn', label: '[ SOLVE ]', action: submit }], onSubmit: submit });
}
function openSolveMenu() {
  openMenu({ title: 'SOLVE', tabs: [{ name: 'SOLVE', items: [{ l: tr('Numerischer Löser (Gleichung)'), run: openNumSolver }, { l: tr('Polynom (Grad 2/3)'), run: openPolySolver }, { l: tr('Gleichungssystem (2/3)'), run: openSimult }] }] });
}

/* ---------- Dispatcher ---------- */
function openByName(name) {
  switch (name) {
    case 'mode': openMode(); break;
    case 'data': openData(); break;
    case 'table': openTableForm(); break;
    case 'graph': openGraphForm(); break;
    case 'tools': openTools(); break;
    case 'math': openMenu(mathMenu()); break;
    case 'prb': openMenu(prbMenu()); break;
    case 'distr': openMenu(distrMenu()); break;
    case 'conv': openMenu(convMenu()); break;
    case 'const': openMenu(constMenu()); break;
    case 'var': openMenu(varList('var')); break;
    case 'sto': openMenu(varList('sto')); break;
    case 'rcl': openMenu(varList('rcl')); break;
    case 'clrvar': openMenu(confirmMenu('CLEAR ALL VARS?', () => { S.vars = {}; save(); say('Variablen gelöscht'); })); break;
    case 'mem': openMenu(memMenu()); break;
    case 'stat': openStatMenu(); break;
    case 'solve': openSolveMenu(); break;
    case 'statdistr': openMenu(statDistrMenu()); break;
    case 'random': openMenu(randomMenu()); break;
    case 'angle': openMenu(angleMenu()); break;
    case 'rp': openMenu(rpMenu()); break;
    case 'complex': openMenu(complexMenu()); break;
    case 'matrix': openMenu(matrixMenu()); break;
    case 'vector': openVector(); break;
    case 'opmenu': openMenu(opMenu()); break;
    case 'setop': openSetOp(); break;
    case 'base': openMenu(baseMenu()); break;
    case 'numsolve': openNumSolver(); break;
    case 'polysolve': openPolySolver(); break;
    case 'syssolve': openSimult(); break;
    case 'exprEval': openExprEval(); break;
    case 'reset': openMenu(confirmMenu('RESET ALL?', resetAll)); break;
    default: if (name.indexOf('unsup:') === 0) say(name.slice(6) + ' nicht enthalten');
  }
}
function run(cmd) {
  if (cmd.k !== 'cyc') ST.lastCyc = null;
  if (cmd.k === 'off') { ST.off = true; goHome(); renderAll(); return; }
  if (cmd.k === 'on') { goHome(); renderAll(); return; }
  if (cmd.k === 'fracmode') { S.frac = S.frac === 'n/d' ? 'Un/d' : 'n/d'; say('Bruchanzeige: ' + S.frac); save(); renderAll(); return; }
  const wasHome = cur().type === 'home', before = wasHome ? { t: ST.ed.t.slice(), c: ST.ed.c } : null;
  try { cur().cmd(cmd); }
  catch (e) { if (e instanceof CalcError) openErr(e.code); else { console.error(e); say('Interner Fehler: ' + e.message); } }
  if (wasHome && before.t.join('\u0001') !== ST.ed.t.join('\u0001')) { UNDO.push(before); if (UNDO.length > 100) UNDO.shift(); REDO.length = 0; }
  renderAll();
}
const UNDO = [], REDO = [];
function undoRedo(redo) {
  if (cur().type !== 'home') return;
  const from = redo ? REDO : UNDO, to = redo ? UNDO : REDO; if (!from.length) return;
  to.push({ t: ST.ed.t.slice(), c: ST.ed.c }); const s = from.pop();
  ST.ed.t = s.t.slice(); ST.ed.c = Math.min(s.c, ST.ed.t.length); ST.hsel = null; renderAll();
}
function press(id, sec) {
  const def = KEYS[id]; if (!def) return;
  if (ST.off) { ST.off = false; ST.second = false; renderAll(); return; }
  if (id === '2nd') { ST.second = !ST.second; ST.lastCyc = null; renderAll(); return; }
  const useSec = sec !== undefined ? sec : ST.second; ST.second = false;
  const cmd = useSec ? def.sc : def.p;
  if (!cmd) { renderAll(); return; }
  run(cmd);
}

/* ---------- Rendern ---------- */
function renderAll() {
  if (ST.off) { lcd.innerHTML = ''; lcd.classList.add('off'); indL.innerHTML = ''; indR.innerHTML = ''; return; }
  lcd.classList.remove('off');
  const sc = cur();
  lcd.classList.toggle('gr', sc.type === 'graph');
  lcd.innerHTML = sc.render();
  { const ts = lcd.querySelector('.tile.sel'); if (ts && ts.scrollIntoView) ts.scrollIntoView({ block: 'nearest' }); }
  announce(sc);
  const fmtTxt = (S.fmt.mode !== 'NORM' ? S.fmt.mode + ' ' : '') + (S.fmt.dec !== 'F' ? 'FIX' + S.fmt.dec : '');
  indL.innerHTML = (ST.second ? '<span class="tag s2on">2nd</span>' : '') + (cur().type === 'home' && ST.ed.ow ? '<span class="tag">INS</span>' : '');
  indR.innerHTML = (fmtTxt ? `<span class="tag">${fmtTxt.trim()}</span>` : '') + (S.res === 'DEC' ? '<span class="tag">DEC</span>' : '') + `<span class="tag">${S.angle}</span>`;
  document.querySelector('[data-k="2nd"]').classList.toggle('active2', ST.second);
  if (sc.type === 'home' && ST.hsel === null) { lcd.scrollTop = lcd.scrollHeight; return; }
  const target = lcd.querySelector('.sel, .cc');
  const car = lcd.querySelector('.caret');
  if (car && sc.type !== 'home') reveal(car);
  else if (target) reveal(target);
}
let liveLen = -1, liveErr = null;
function announce(sc) {
  const live = document.getElementById('live'); if (!live) return;
  if (sc.type === 'err') { const t = lcd.querySelector('.errt'); if (t && liveErr !== t.textContent) { liveErr = t.textContent; live.textContent = t.textContent + '. ' + lcd.querySelector('.errd').textContent; } return; }
  liveErr = null;
  if (sc.type === 'home' && ST.hist.length !== liveLen) {
    liveLen = ST.hist.length; const h = ST.hist[ST.hist.length - 1];
    if (h) { try { live.textContent = tokText(h.t) + ' = ' + fmtVal(h.v).text; } catch (e) { /* egal */ } }
  }
}
function reveal(el) {
  const lr = lcd.getBoundingClientRect(), er = el.getBoundingClientRect();
  if (er.top < lr.top) lcd.scrollTop -= (lr.top - er.top) + 6;
  else if (er.bottom > lr.bottom) lcd.scrollTop += (er.bottom - lr.bottom) + 6;
}

/* ---------- Speichern ---------- */
const serVal = v => (v === null || v === undefined ? null : v.t === 'x' ? { t: 'x', n: v.n.toString(), d: v.d.toString(), r: v.r.toString(), p: v.p } : { t: 'f', v: v.v });
const desVal = o => (!o ? null : o.t === 'x' ? { t: 'x', n: BigInt(o.n), d: BigInt(o.d), r: BigInt(o.r), p: o.p } : { t: 'f', v: o.v });
function save() {
  try {
    const vars = {}; for (const k of Object.keys(S.vars)) vars[k] = serVal(S.vars[k]);
    localStorage.setItem(LSKEY, JSON.stringify({
      v: 1, angle: S.angle, fmt: S.fmt, res: S.res, frac: S.frac, vars, ans: serVal(S.ans), lists: S.lists,
      hist: ST.hist.slice(-40).map(h => ({ t: h.t, v: serVal(h.v), alt: h.alt })), table: ST.tableSave || null, statvars: S.statvars,
    }));
  } catch (e) { /* kein Speicher verfuegbar */ }
}
function load() {
  try {
    const raw = localStorage.getItem(LSKEY); if (!raw) return;
    const o = JSON.parse(raw); if (!o || o.v !== 1) return;
    S.angle = o.angle || 'DEG'; S.fmt = o.fmt || S.fmt; S.res = o.res || 'AUTO'; S.frac = o.frac || 'n/d';
    S.vars = {}; for (const k of Object.keys(o.vars || {})) S.vars[k] = desVal(o.vars[k]);
    S.ans = desVal(o.ans); S.lists = o.lists || S.lists; S.statvars = o.statvars || null; S.stat = !!o.statvars;
    ST.hist = (o.hist || []).map(h => ({ t: h.t, v: desVal(h.v), alt: !!h.alt })).filter(h => h.v);
    ST.tableSave = o.table || null;
  } catch (e) { /* ignorieren */ }
}

/* ---------- Tastatur ---------- */
function flash(id) {
  const el = document.querySelector(`[data-k="${id}"]`); if (!el) return;
  el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 110);
}
const VARKEYS = { x: 1, y: 1, z: 1, t: 1, a: 1, b: 1, c: 1, d: 1 };
const LETTER_MAP_OLD = { S: ['sin'], C: ['cos'], T: ['tan'], L: ['ln'], G: ['log'], R: ['sq', true], Q: ['sq'], I: ['inv'], F: ['nd'], A: ['neg', true], M: ['mode'], D: ['data'], H: ['table'], P: ['prb'], V: ['var'], N: ['data', true], O: ['math'], U: ['conv'] };
const LETTER_MAP = { S: ['sin'], C: ['cos'], T: ['tan'], L: ['lnlog'], G: ['epow'], Q: ['sq'], R: ['sq', true], X: ['pw'], F: ['nd'], A: ['neg', true], M: ['mode'], D: ['data'], H: ['table'], N: ['data', true], O: ['math'], U: ['8', true], B: ['9', true], K: ['fact'] };
function toggleHelp(on) { showPanel(on === undefined ? (panelOpen() === 'help' ? null : 'help') : (on ? 'help' : null)); }
function handleKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !panelOpen() && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) {
      const k = e.key.toLowerCase();
      if (k === 'z' || k === 'y') { e.preventDefault(); if (typeof undoRedo === 'function') undoRedo(k === 'y' || e.shiftKey); }
    }
    return;
  }
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { if (e.key === 'Escape' && panelOpen()) { e.preventDefault(); showPanel(null); } return; }
  if (e.key === 'F2') { e.preventDefault(); doMenu('graph'); return; }
  if (e.key === 'F3') { e.preventDefault(); doMenu('tools'); return; }
  if (e.key === 'F1' || e.key === '?') { e.preventDefault(); toggleHelp(); return; }
  if (panelOpen()) { if (e.key === 'Escape') { e.preventDefault(); showPanel(null); } return; }
  if (graphKey(e)) return;
  if (ST.off && e.key.length === 1 || ST.off && e.key === 'Enter') { e.preventDefault(); ST.off = false; renderAll(); return; }
  const k = e.key; let id = null, sec, direct = null, fl = null;
  if (k >= '0' && k <= '9' && k.length === 1) id = k;
  else if (k === '.' || e.code === 'NumpadDecimal') id = 'dot';
  else if (k === ',') direct = T_(',');
  else if (k === '+') id = 'add';
  else if (k === '-') { id = 'sub'; const b = baseOf(); const E = cur().editor && cur().editor(); if (cur().type === 'home' ? ST.ed.isEmpty() : (E && E.isEmpty())) id = 'neg'; void b; }
  else if (k === '*' || k === '×') id = 'mul';
  else if (k === '/' || k === '÷' || k === ':') id = 'div';
  else if (k === '^' || (k === 'Dead' && !e.shiftKey)) id = 'pw';
  else if (k === '(') id = 'lp';
  else if (k === ')') id = 'rp';
  else if (k === '=') { direct = T_('='); }
  else if (k === '!') { direct = T_('!'); fl = 'fact'; }
  else if (k === '%') { direct = T_('%'); fl = 'div'; }
  else if (k === 'Enter') id = 'enter';
  else if (k === 'Backspace') id = 'delete';
  else if (k === 'Delete') { direct = { k: 'fdel' }; }
  else if (k === 'Escape') id = 'clear';
  else if (k === 'ArrowUp') id = 'up'; else if (k === 'ArrowDown') id = 'down'; else if (k === 'ArrowLeft') id = 'left'; else if (k === 'ArrowRight') id = 'right';
  else if (k === 'Home') direct = NAV('home'); else if (k === 'End') direct = NAV('end');
  else if (k === 'Tab') id = '2nd';
  else if (k === ' ') { direct = null; id = null; }
  else if (VARKEYS[k]) { direct = T_(k); }
  else if (k === 'p') id = 'pi';
  else if (k === 'e') { direct = T_('e'); fl = 'pi'; }
  else if (k === 'E') id = 'ee';
  else if (k === 'I' ) { direct = null; id = null; }
  else if (LETTER_MAP[k]) { id = LETTER_MAP[k][0]; sec = LETTER_MAP[k][1]; }
  else if (k === 'q') id = 'sq';
  else if (k === 'o') id = 'on';
  else if (k === 'm') id = 'mode';
  if (id === null && direct === null) return;
  e.preventDefault();
  if (id !== null) { flash(id); if (sec) { ST.second = true; } press(id, sec); }
  else { if (fl) flash(fl); run(direct); }
}

/* ---------- Start ---------- */
function init() {
  buildKeypad();
  load();
  $('#keys').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  $('#keys').addEventListener('click', e => { const t = e.target.closest('[data-k2]'); if (t) { press(t.dataset.k2, true); return; } const b = e.target.closest('button[data-k]'); if (b) press(b.dataset.k); });
  document.addEventListener('keydown', handleKey);
  $('#helpBtn').addEventListener('click', () => toggleHelp());
  $('#helpClose').addEventListener('click', () => toggleHelp(false));
  $('#helpPanel').addEventListener('click', e => { if (e.target.id === 'helpPanel') toggleHelp(false); });
  window.addEventListener('beforeunload', save);
  try { window.focus(); document.body.focus(); } catch (e) { /* egal */ }
  renderAll();
}
function fit() {
  const c = document.getElementById('calc'); if (!c) return;
  c.style.zoom = 1;
  const k = Math.min(UI.size, (window.innerHeight - 24) / c.offsetHeight, (window.innerWidth - 16) / c.offsetWidth);
  c.style.zoom = Math.abs(k - 1) > 0.002 ? k.toFixed(3) : 1;
}
window.addEventListener('resize', fit);
init();
fit();

/* Tippen/Klicken auf Bildschirm-Elemente (Touch und Maus): Menues, Formulare, Buttons, Listen, Mode, Verlauf */
lcd.addEventListener('click', e => {
  if (ST.off || cur().type === 'graph') return;
  const t = e.target.closest ? e.target.closest('[data-tap]') : null;
  if (!t || !lcd.contains(t)) return;
  run({ k: 'tap', key: t.getAttribute('data-tap') });
});
