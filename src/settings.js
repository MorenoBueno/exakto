/* ===== settings.js : Einstellungen, Teilen, Export, PWA ===== */
const UIKEY = 'exakto-ui-v1';

function plainTok(k) {
  if (k === 'E') return 'E';
  if (k.startsWith('K:')) return CONSTS[k.slice(2)] ? CONSTS[k.slice(2)].n : k.slice(2);
  if (k.startsWith('SV:')) return SVNAMES[k.slice(3)] || k.slice(3);
  if (isHexTok(k)) return k[1];
  if (k.startsWith('U:')) return convLabel(k.slice(2));
  return TOKDISP[k] !== undefined ? TOKDISP[k] : k;
}
/* Token-Liste -> lesbarer Text, z.B. (2)/(3) oder sqrt-Zeichen */
function tokText(tokens) {
  const tree = buildTree(tokens);
  const seq = nodes => nodes.map(nd => (nd.tok !== undefined ? plainTok(nd.tok) : st(nd))).join('');
  function st(nd) {
    const p = nd.parts.map(x => seq(x.nodes));
    switch (nd.st) {
      case 'frac': return '(' + p[0] + ')/(' + p[1] + ')';
      case 'mix': return p[0] + ' (' + p[1] + ')/(' + p[2] + ')';
      case 'pow': return /^[\w.]+$/.test(p[0]) ? '^' + p[0] : '^(' + p[0] + ')';
      case 'sqrt': return '√(' + p[0] + ')';
      case 'root': return '(' + p[0] + ')√(' + p[1] + ')';
      case 'abs': return 'abs(' + p[0] + ')';
      case 'sum': return 'Σ(' + p[0] + ', ' + p[1] + '=' + p[2] + '..' + p[3] + ')';
      case 'prod': return 'Π(' + p[0] + ', ' + p[1] + '=' + p[2] + '..' + p[3] + ')';
      case 'int': return '∫(' + p[0] + ' d' + p[1] + ', ' + p[2] + '..' + p[3] + ')';
      case 'deriv': return 'd/d' + p[1] + '(' + p[0] + ')|' + p[1] + '=' + p[2];
    }
    return '';
  }
  return seq(tree);
}

/* ---------- Einstellungen ---------- */
function saveUI() { try { localStorage.setItem(UIKEY, JSON.stringify(UI)); } catch (e) { /* egal */ } }
function loadUI() {
  try { const o = JSON.parse(localStorage.getItem(UIKEY) || 'null'); if (o) Object.assign(UI, o); } catch (e) { /* egal */ }
  if (!localStorage.getItem(UIKEY)) {
    try { UI.lang = /^de/i.test(navigator.language || 'de') ? 'de' : 'en'; } catch (e) { /* egal */ }
  }
}
function applyUI() {
  const root = document.documentElement;
  const dark = UI.theme === 'dark' || (UI.theme === 'auto' && !(window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches));
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.lang = UI.lang; root.lang = UI.lang;
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = dark ? '#0d1015' : '#e8ecf3';
  document.querySelectorAll('[data-set]').forEach(b => {
    const [key, val] = b.dataset.set.split(':');
    const cur = key === 'size' ? String(UI.size) : String(UI[key]);
    b.classList.toggle('on', cur === val);
  });
  const hp = document.getElementById('hapticBox'); if (hp) hp.checked = !!UI.haptic;
  fit();
}

/* ---------- Teilen: Rechnung als Link ---------- */
function b64enc(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64dec(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; return decodeURIComponent(escape(atob(str))); }
function shareTokens() {
  if (!ST.ed.isEmpty()) return ST.ed.t;
  return ST.hist.length ? ST.hist[ST.hist.length - 1].t : null;
}
function shareURL(tokens) {
  const base = location.href.split('#')[0];
  return base + '#e=' + b64enc(JSON.stringify(tokens));
}
function loadFromHash() {
  const m = /[#&]e=([^&]+)/.exec(location.hash || '');
  if (!m) return;
  try {
    const t = JSON.parse(b64dec(m[1]));
    if (Array.isArray(t) && t.length < 400 && t.every(x => typeof x === 'string' && x.length < 40)) { ST.ed.set(t); renderAll(); }
  } catch (e) { /* ungueltiger Link */ }
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* egal */ }
}
function copyText(txt) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
  return new Promise((res, rej) => {
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); }
    document.body.removeChild(ta);
  });
}
function doShare() {
  const t = shareTokens();
  if (!t) { say('Nichts zu teilen'); return; }
  copyText(shareURL(t)).then(() => say('Rechnung kopiert'), () => { try { prompt('Link', shareURL(t)); } catch (e) { /* egal */ } });
}

/* ---------- Export: Verlauf als CSV ---------- */
function doExport() {
  if (!ST.hist.length) { say('Verlauf ist leer'); return; }
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const rows = ['Nr;Rechnung;Ergebnis'];
  ST.hist.forEach((h, i) => { let res = ''; try { res = fmtVal(h.v, undefined).text; } catch (e) { res = '?'; } rows.push([i + 1, q(tokText(h.t)), q(res)].join(';')); });
  const blob = new Blob(['﻿' + rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'exakto-verlauf.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  say('Exportiert');
}

/* ---------- Start ---------- */
function initSettings() {
  loadUI(); applyUI(); initMenu();
  document.querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
    const [key, val] = b.dataset.set.split(':');
    UI[key] = key === 'size' ? parseFloat(val) : val;
    saveUI(); applyUI(); renderAll();
  }));
  const hp = document.getElementById('hapticBox');
  if (hp) hp.addEventListener('change', () => { UI.haptic = hp.checked; saveUI(); });
  document.getElementById('shareBtn').addEventListener('click', doShare);
  document.getElementById('exportBtn').addEventListener('click', doExport);
  document.getElementById('keys').addEventListener('click', e => {
    if (UI.haptic && e.target.closest('button') && navigator.vibrate) { try { navigator.vibrate(8); } catch (x) { /* egal */ } }
  });
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (UI.theme === 'auto') applyUI(); }); } catch (e) { /* aeltere Browser */ } }
  loadFromHash();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* optional */ }); });
  }
}
initSettings();
