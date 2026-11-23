/* ===== graph.js : Graphenmodus (y = f(x), bis zu 3 Funktionen) ===== */
const GW = 394, GH = 258, GPAD_L = 4, GPAD_B = 32;
const GDASH = ['', '6 3', '1.5 3.5'];
function openGraphForm() {
  const fs = [exprField('y1=', null), exprField('y2=', null), exprField('y3=', null)];
  if (ST.graphSave) ST.graphSave.f.forEach((t, i) => fs[i].ed.set(t));
  const submit = () => {
    ST.graphSave = { f: fs.map(f => f.ed.t.slice()) };
    guard(() => {
      const items = [];
      fs.forEach((f, i) => { if (!f.ed.isEmpty()) items.push({ n: 'y' + (i + 1), fn: curveFn(f.ed.t), txt: tokText(f.ed.t), dash: GDASH[i] }); });
      if (!items.length) err('SYNTAX');
      openGraph(items);
    });
  };
  openForm({ title: 'GRAPH', fields: [...fs, { type: 'btn', label: tr('[ Graph zeichnen ]'), action: submit }], onSubmit: submit });
}
function openGraph(items) {
  const asp = GH / GW;
  const win = ST.graphWin || { xmin: -10, xmax: 10, ymin: -10 * asp, ymax: 10 * asp };
  const sc = {
    type: 'graph', items, win, ti: 0, tx: 0, editor() { return null; },
    X(x) { return GPAD_L + (x - win.xmin) / (win.xmax - win.xmin) * (GW - GPAD_L - 2); },
    Y(y) { return 4 + (win.ymax - y) / (win.ymax - win.ymin) * (GH - GPAD_B - 6); },
    render() {
      const f2 = n => (Math.abs(n) < 1e-12 ? '0' : String(Number(n.toPrecision(6)))).replace('-', '−');
      let g = '';
      const sx = niceStep(win.xmax - win.xmin, 8), sy = niceStep(win.ymax - win.ymin, 6);
      for (let x = Math.ceil(win.xmin / sx) * sx; x <= win.xmax + 1e-9; x += sx) {
        const px = sc.X(x).toFixed(1);
        g += `<line x1="${px}" y1="4" x2="${px}" y2="${GH - GPAD_B}" class="gg"/>`;
        if (Math.abs(x) > sx / 2) g += `<text x="${px}" y="${GH - GPAD_B + 11}" class="gt" text-anchor="middle">${f2(x)}</text>`;
      }
      for (let y = Math.ceil(win.ymin / sy) * sy; y <= win.ymax + 1e-9; y += sy) {
        const py = sc.Y(y).toFixed(1);
        g += `<line x1="${GPAD_L}" y1="${py}" x2="${GW - 2}" y2="${py}" class="gg"/>`;
        if (Math.abs(y) > sy / 2 && +py > 14) g += `<text x="${GPAD_L + 2}" y="${(+py - 2).toFixed(1)}" class="gt">${f2(y)}</text>`;
      }
      if (win.xmin <= 0 && win.xmax >= 0) g += `<line x1="${sc.X(0).toFixed(1)}" y1="4" x2="${sc.X(0).toFixed(1)}" y2="${GH - GPAD_B}" class="ga"/>`;
      if (win.ymin <= 0 && win.ymax >= 0) g += `<line x1="${GPAD_L}" y1="${sc.Y(0).toFixed(1)}" x2="${GW - 2}" y2="${sc.Y(0).toFixed(1)}" class="ga"/>`;
      let budget = 3 * 400;
      items.forEach(it => {
        const n = Math.min(400, Math.floor(budget / items.length)); budget -= n;
        const segs = sampleCurve(it.fn, win.xmin, win.xmax, win.ymin, win.ymax, n);
        const clip = v => Math.max(-1e5, Math.min(1e5, v));
        for (const s of segs) g += `<polyline class="gc" ${it.dash ? `stroke-dasharray="${it.dash}"` : ''} points="${s.map(p => sc.X(p[0]).toFixed(1) + ',' + sc.Y(clip(p[1])).toFixed(1)).join(' ')}"/>`;
      });
      // Trace
      const it = items[sc.ti % items.length]; let info;
      const ty = it.fn(sc.tx);
      if (Number.isFinite(ty)) {
        const px = sc.X(sc.tx), py = sc.Y(ty);
        g += `<line x1="${px.toFixed(1)}" y1="4" x2="${px.toFixed(1)}" y2="${GH - GPAD_B}" class="gtr"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" class="gtc"/>`;
        info = `${it.n}: x = ${f2(sc.tx)}   y ≈ ${f2(ty)}`;
      } else info = `${it.n}: x = ${f2(sc.tx)}   y nicht definiert`;
      g += `<rect x="0" y="${GH - 16}" width="${GW}" height="16" class="gb"/><text x="6" y="${GH - 5}" class="gl">${esc(info)}</text><text x="${GW - 4}" y="${GH - 5}" class="gl" text-anchor="end">${S.angle}</text>`;
      g += `<text x="${GW - 4}" y="12" class="gt" text-anchor="end">${items.map(i => esc(i.n + '=' + i.txt)).join('   ').slice(0, 60)}</text>`;
      return `<svg class="graph" viewBox="0 0 ${GW} ${GH}" width="100%" role="img" aria-label="Graph: ${esc(items.map(i => i.n + '=' + i.txt).join(', '))}. ${esc(info)}">${g}</svg>`;
    },
    zoom(k) { const cx = (win.xmin + win.xmax) / 2, cy = (win.ymin + win.ymax) / 2, hx = (win.xmax - win.xmin) / 2 * k, hy = (win.ymax - win.ymin) / 2 * k; win.xmin = cx - hx; win.xmax = cx + hx; win.ymin = cy - hy; win.ymax = cy + hy; },
    pan(dx, dy) { const w = win.xmax - win.xmin, h = win.ymax - win.ymin; win.xmin += dx * w; win.xmax += dx * w; win.ymin += dy * h; win.ymax += dy * h; },
    stepTrace(d) { const stp = (win.xmax - win.xmin) / 80; sc.tx += d * stp; if (sc.tx > win.xmax || sc.tx < win.xmin) sc.pan(d * 0.5, 0); },
    reset() { win.xmin = -10; win.xmax = 10; win.ymin = -10 * asp; win.ymax = 10 * asp; sc.tx = 0; },
    fit() { const r = fitY(items.map(i => i.fn), win.xmin, win.xmax); if (r) { win.ymin = r[0]; win.ymax = r[1]; } },
    cmd(c) {
      ST.graphWin = win;
      if (c.k === 'nav') {
        if (c.d === 'left') sc.stepTrace(-1); else if (c.d === 'right') sc.stepTrace(1);
        else if (c.d === 'up') sc.ti = (sc.ti + items.length - 1) % items.length; else if (c.d === 'down') sc.ti = (sc.ti + 1) % items.length;
        return true;
      }
      if (c.k === 'bin' && c.t === '+') { sc.zoom(0.7); return true; }
      if (c.k === 'bin' && c.t === '-') { sc.zoom(1 / 0.7); return true; }
      if (c.k === 'tok' && c.t[0] === '0') { sc.reset(); return true; }
      if (c.k === 'tok' && c.t[0] === '9') { sc.fit(); return true; }
      if (c.k === 'clear' || c.k === 'enter') { pop(); return true; }
      if (c.k === 'quit') { goHome(); return true; }
      if (c.k === 'open') { pop(); openByName(c.name); return true; }
      return true;
    },
  };
  sc.tx = 0;
  push(sc);
  initGraphMouse();
}
let graphMouseOn = false;
function initGraphMouse() {
  if (graphMouseOn) return; graphMouseOn = true;
  let drag = null;
  const g = () => { const s = cur(); return s.type === 'graph' ? s : null; };
  lcd.addEventListener('wheel', e => { const s = g(); if (!s) return; e.preventDefault(); s.zoom(e.deltaY < 0 ? 0.8 : 1.25); renderAll(); }, { passive: false });
  lcd.addEventListener('pointerdown', e => { const s = g(); if (!s) return; drag = { x: e.clientX, y: e.clientY, moved: false }; try { lcd.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } });
  lcd.addEventListener('pointermove', e => {
    const s = g(); if (!s || !drag) return;
    const r = lcd.getBoundingClientRect(), dx = (e.clientX - drag.x) / r.width, dy = (e.clientY - drag.y) / r.height;
    if (Math.abs(dx) + Math.abs(dy) > 0.004) { drag.moved = true; s.pan(-dx, dy); drag.x = e.clientX; drag.y = e.clientY; renderAll(); }
  });
  lcd.addEventListener('pointerup', e => {
    const s = g(); const d = drag; drag = null; if (!s || !d || d.moved) return;
    const r = lcd.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * GW; // Tippen = Trace dorthin
    s.tx = s.win.xmin + (px - GPAD_L) / (GW - GPAD_L - 2) * (s.win.xmax - s.win.xmin); renderAll();
  });
}
/* Shift+Pfeil verschiebt, +/- zoomt (Tastatur) */
function graphKey(e) {
  const s = cur(); if (s.type !== 'graph') return false;
  const m = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key];
  if (e.shiftKey && m) { e.preventDefault(); s.pan(m[0], m[1]); renderAll(); return true; }
  return false;
}
