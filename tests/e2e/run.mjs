// Browser-Tests (End-to-End): laedt release/exakto.html in Chromium und bedient den Rechner wie ein Nutzer.
// Start:  npm run build:standalone && node tests/e2e/run.mjs      (CHROME_PATH setzt einen bestimmten Browser)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_ = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'release', 'exakto.html')).href;
const KEYS = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '.': 'dot', '(': 'lp', ')': 'rp', n: 'neg', U: 'up', D: 'down', R: 'right', L: 'left', E: 'enter', C: 'clear' };
let pass = 0, fail = 0; const failures = [];
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; failures.push(name + (extra !== undefined ? '  -> ' + extra : '')); console.log('  FEHLER:', name, extra !== undefined ? '-> ' + extra : ''); } };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : { channel: 'chrome', args: ['--no-sandbox'] });

async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 420, height: opts.h || 900 }, hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: 2, colorScheme: opts.scheme || 'dark', locale: opts.locale || 'de-CH' });
  const page = await ctx.newPage(); page.errs = []; page.reqs = [];
  page.on('pageerror', e => page.errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') page.errs.push('console: ' + m.text()); });
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) page.reqs.push(r.url()); });
  await page.goto(URL_); await page.waitForTimeout(250); page.ctx = ctx; return page;
}
const key = (pg, k) => pg.click(`button[data-k="${KEYS[k] || k}"]`);
async function keys(pg, seq) { for (const t of seq.split(' ').filter(Boolean)) { if (/^\d+$/.test(t)) { for (const ch of t) await key(pg, ch); } else await key(pg, t); } }
const lcd = pg => pg.evaluate(() => document.getElementById('lcd').innerText.replace(/\n+/g, ' / '));
async function second(pg, k) { await key(pg, '2nd'); await key(pg, k); }
async function submit(pg, marker = '[ CALC ]') { for (let i = 0; i < 14; i++) { if (!(await lcd(pg)).includes(marker)) return; await key(pg, 'E'); } }
async function menu(pg, secKey, item) { await second(pg, secKey); for (let i = 0; i < item; i++) await key(pg, 'D'); await key(pg, 'E'); }
async function form(pg, secKey, item, seq, marker) { await menu(pg, secKey, item); await keys(pg, seq); await submit(pg, marker); return lcd(pg); }
const direct = async (pg, secKey, seq, marker) => { await second(pg, secKey); await keys(pg, seq); await submit(pg, marker); return lcd(pg); };
async function done(pg) { const e = pg.errs; await pg.ctx.close(); return e; }

// 1) Laden, kein Fehler, kein Netzwerk (offline-faehig)
{ const pg = await open(); const t = await lcd(pg);
  ok('Seite zeigt Display', t !== undefined); ok('keine externen Anfragen (offline-faehig)', pg.reqs.length === 0, pg.reqs.join(','));
  ok('Titel', (await pg.title()).includes('Exakto'));
  const e = await done(pg); ok('keine Konsolen-/Skriptfehler beim Laden', e.length === 0, e.join(' | ')); }

// 2) Grundrechnen per Tasten
{ const pg = await open(); await keys(pg, '2 + 3 E'); let t = await lcd(pg); ok('2+3=5', /\b5\b/.test(t), t);
  await key(pg, 'C'); await keys(pg, '( 2 + 3 ) * 4 E'); t = await lcd(pg); ok('(2+3)*4=20', t.includes('20'), t);
  await key(pg, 'C'); await keys(pg, '7 / 2 E'); t = await lcd(pg); ok('7/2 exakt als Bruch', /7 \/ 2/.test(t), t);
  await key(pg, 'fd'); t = await lcd(pg); ok('◀▶≈ zeigt 3.5', t.includes('3.5'), t);
  const e = await done(pg); ok('Rechnen ohne Fehler', e.length === 0, e.join('|')); }

// 3) Handy-Layout: kein Scrollen, alles sichtbar, Display nicht winzig
for (const [w, h] of [[360, 640], [375, 667], [390, 844], [430, 932]]) {
  const pg = await open({ w, h, touch: true });
  const r = await pg.evaluate(() => ({ sh: document.documentElement.scrollHeight, ch: innerHeight, sw: document.documentElement.scrollWidth, cw: innerWidth, lcd: document.getElementById('lcd').getBoundingClientRect().height, enter: document.querySelector('[data-k="enter"]').getBoundingClientRect().bottom }));
  ok(`Handy ${w}x${h}: kein vertikales Scrollen`, r.sh <= r.ch + 1, JSON.stringify(r)); ok(`Handy ${w}x${h}: kein horizontales Scrollen`, r.sw <= r.cw + 1, JSON.stringify(r));
  ok(`Handy ${w}x${h}: Enter-Taste sichtbar`, r.enter <= r.ch, JSON.stringify(r)); ok(`Handy ${w}x${h}: Display mindestens 70px`, r.lcd >= 70, r.lcd);
  await done(pg);
}

// 4) Lesbarkeit der Display-Menues in hell und dunkel (Regression: Menue war dunkel auf dunkel)
for (const scheme of ['dark', 'light']) {
  const pg = await open({ scheme }); await second(pg, 'math');
  const c = await pg.evaluate(() => {
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b.length >= 3 && (b.length < 4 || b[3] > 0.5)) return b.slice(0, 3); } return [255, 255, 255]; };
    const el = [...document.querySelectorAll('#lcd .mi')].find(e => !e.classList.contains('sel')); if (!el) return 0;
    const fg = rgb(getComputedStyle(el).color).slice(0, 3), bg = bgOf(el), a = lum(fg), b = lum(bg);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  ok(`Display-Menue lesbar (${scheme}), Kontrast >= 4.5`, c >= 4.5, c.toFixed(2)); await done(pg);
}

// 5) Numerischer Loeser (2nd sin): doppelte Nullstelle, positives Minimum, Polstelle, normaler Fall
{ const cases = [
    ['doppelte NS (x-0.123)^2 -> unbestaetigt', '( x - 0 . 1 2 3 ) sq D 0', t => /0\.123/.test(t) && /unconfirmed|unbest/i.test(t) && !/No solution/.test(t)],
    ['Minimum +1e-14 -> keine Loesung', '( x - 0 . 1 2 3 ) sq + 1 ee n 1 4 D 0', t => /No solution found|Keine Lösung/.test(t) && !/0\.123/.test(t)],
    ['Polstelle 1/(x-0.123) -> keine Loesung', 'nd 1 D ( x - 0 . 1 2 3 ) R D 0', t => /No solution found|Keine Lösung/.test(t) && !/0\.123/.test(t)],
    ['x²-2 -> ±1.414…', 'x sq - 2 D 0', t => t.includes('1.414213562') && t.includes('≈')],
  ];
  for (const [name, seq, test] of cases) {
    const pg = await open(); await second(pg, 'sin'); await keys(pg, seq.replace('x', 'xyzt')); await key(pg, 'E'); await key(pg, 'E');
    const t = await lcd(pg); ok('Loeser: ' + name, test(t), t); const e = await done(pg); ok('Loeser fehlerfrei: ' + name, e.length === 0, e.join('|'));
  } }

// 6) Neue Zweitfunktionen
{ let pg = await open(); let t = await form(pg, 'pi', 0, 'U R R D 1 D 2 D 3 D - 1'); ok('complex (1+2i)(3-i) = 5+5i', t.includes('5 + 5i'), t); await done(pg);
  pg = await open(); t = await form(pg, 'pi', 1, 'U R R R D - 4'); ok('complex √(-4) = 2i', t.includes('2i'), t); await done(pg);
  pg = await open(); t = await form(pg, 'pi', 2, '2 D 6 0'); ok('Polar 2∠60° = 1+√3 i', t.includes('1 +') && t.includes('1.732050808'), t); await done(pg);
  pg = await open(); t = await direct(pg, 'ee', '1 D 2 D 3 D 4 D 5 D 6'); ok('Vektor u·v = 32', t.includes('u·v = 32'), t); await done(pg);
  pg = await open(); t = await direct(pg, 'ee', 'U R D 1 D 2 D 3 D 4 D 5 D 6'); ok('Vektor u×v = (−3, 6, −3)', t.includes('( −3 , 6 , −3 )'), t); await done(pg);
  pg = await open(); t = await form(pg, 'rp', 0, '1 D 1'); ok('Pol(1,1): θ = 45°', t.includes('45°'), t); await done(pg);
  pg = await open(); t = await form(pg, 'rp', 2, '3 6 0'); ok('Primfaktoren 360', t.includes('2³ · 3² · 5'), t); await done(pg);
  pg = await open(); t = await form(pg, 'rp', 4, 'n 1 7 D 5'); ok('Division mit Rest -17/5: q=-4, r=3', t.includes('q = −4') && t.includes('r = 3'), t); await done(pg);
  // Matrix: A=[[1,2],[3,4]] speichern, det = -2
  pg = await open(); await menu(pg, 'math', 0); await keys(pg, 'D D 1 D 2 D 3 D 4 D'); await submit(pg, '[ OK ]');
  await menu(pg, 'math', 3); await keys(pg, 'R R R'); await submit(pg); t = await lcd(pg); ok('Matrix det [[1,2],[3,4]] = -2', t.includes('det = −2'), t);
  await key(pg, 'C'); await menu(pg, 'math', 3); await keys(pg, 'R R R R'); await key(pg, 'D'); await submit(pg); t = await lcd(pg); ok('Matrix A·A⁻¹-Pfad ohne Fehler', !t.includes('ERROR'), t);
  const e = await done(pg); ok('Matrix ohne Skriptfehler', e.length === 0, e.join('|')); }
{ const pg = await open(); await second(pg, 'mul'); await keys(pg, 'D D D'); ok('set op ohne Daten -> Fehler STAT', (await (async () => { await submit(pg); return lcd(pg); })()).includes('ERROR: STAT')); await done(pg); }

// 7) Bedienung des Displays per Antippen (Touch) und per Maus
for (const touch of [true, false]) {
  const pg = await open({ touch, w: touch ? 390 : 1200, h: touch ? 844 : 900 }); const tap = sel => (touch ? pg.tap(sel) : pg.click(sel)); const tag = touch ? 'Touch' : 'Maus';
  await second(pg, 'math'); await tap('#lcd .mi >> nth=3'); let t = await lcd(pg); ok(`${tag}: Menue-Eintrag oeffnet Formular`, t.includes('MATRIX X ∘ Y'), t);
  await tap('#lcd .fopt >> nth=3'); const on = await pg.evaluate(() => [...document.querySelectorAll('#lcd .fopt.on')].map(e => e.textContent).join(',')); ok(`${tag}: Option antippen waehlt sie`, on.startsWith('A,'), on);
  await key(pg, 'C'); await key(pg, 'C');
  await second(pg, 'mode'); /* quit */ await key(pg, 'mode'); t = await lcd(pg); ok(`${tag}: Mode-Menue`, t.includes('MODE'), t);
  await tap('#lcd .mrow:nth-child(2) span >> nth=1'); const ang = await pg.evaluate(() => document.querySelector('#indR').innerText); ok(`${tag}: Mode per Tippen setzt RAD`, ang.includes('RAD'), ang);
  const e = await done(pg); ok(`${tag}: ohne Skriptfehler`, e.length === 0, e.join('|'));
}

// 8) Graph: Groesse, Touch-Ziehen/Zoom, Analyse
for (const [w, h, touch, name] of [[390, 844, true, 'Handy'], [360, 640, true, 'kleines Handy'], [1200, 900, false, 'PC']]) {
  const pg = await open({ w, h, touch }); const tap = sel => (touch ? pg.tap(sel) : pg.click(sel));
  await pg.keyboard.press('F2'); await pg.waitForTimeout(100); await tap('#lcd .fcell >> nth=0'); await keys(pg, 'xyzt sq - 4'); await tap('#lcd .fbtn'); await pg.waitForTimeout(250);
  const r = await pg.evaluate(() => { const l = document.getElementById('lcd'), s = l.querySelector('svg'); if (!s) return null; const a = l.getBoundingClientRect(), b = s.getBoundingClientRect(); return { dw: a.width - b.width, dh: a.height - b.height, scroll: l.scrollHeight - l.clientHeight, ta: getComputedStyle(l).touchAction }; });
  ok(`Graph ${name}: wird gezeichnet`, !!r); if (r) { ok(`Graph ${name}: passt in Breite/Hoehe des Displays`, r.dw >= 0 && r.dw < 22 && r.dh >= 0 && r.dh < 22, JSON.stringify(r)); ok(`Graph ${name}: kein Scrollen im Display`, r.scroll <= 1, JSON.stringify(r)); }
  const labels = () => pg.evaluate(() => [...document.querySelectorAll('#lcd svg text.gt')].map(e => e.textContent).join(' '));
  const before = await labels(); const box = await pg.locator('#lcd').boundingBox(); const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  if (touch) { const cdp = await pg.ctx.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 20, y: cy, id: 1 }, { x: cx + 20, y: cy, id: 2 }] });
    for (let i = 1; i < 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 20 - 8 * i, y: cy, id: 1 }, { x: cx + 20 + 8 * i, y: cy, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  else { await pg.mouse.move(cx, cy); await pg.mouse.wheel(0, -300); }
  await pg.waitForTimeout(150); const after = await labels(); ok(`Graph ${name}: Zoom (${touch ? '2 Finger' : 'Mausrad'}) aendert Achsen`, before !== after, before.slice(0, 40) + ' -> ' + after.slice(0, 40));
  await key(pg, '0'); // Fenster zuruecksetzen
  await key(pg, 'E'); let t = await lcd(pg); ok(`Graph ${name}: Enter oeffnet Analyse`, t.includes('ANALYZE'), t);
  await tap('#lcd .mi >> nth=0'); t = await lcd(pg); ok(`Graph ${name}: Nullstellen x² − 4 = ±2`, t.includes('−2') && /\b2\b/.test(t.replace('−2', '')), t);
  const e = await done(pg); ok(`Graph ${name}: ohne Skriptfehler`, e.length === 0, e.join('|'));
}
{ const pg = await open(); await pg.keyboard.press('F2'); await pg.waitForTimeout(100); await keys(pg, 'xyzt pw 3 R - 3 * xyzt'); /* x^3 - 3*x */ await key(pg, 'D'); await key(pg, 'D'); await key(pg, 'D'); await key(pg, 'E'); await pg.waitForTimeout(250);
  let t = await lcd(pg); ok('Graph x³−3x gezeichnet', !t.includes('ERROR'), t);
  await key(pg, 'E'); await key(pg, 'D'); await key(pg, 'E'); t = await lcd(pg); ok('Analyse Minimum: x=1, y=-2', t.includes('x ≈ 1') && t.includes('y ≈ −2'), t);
  await key(pg, 'C'); await key(pg, 'E'); await key(pg, 'D'); await key(pg, 'D'); await key(pg, 'E'); t = await lcd(pg); ok('Analyse Maximum: x=-1, y=2', t.includes('x ≈ −1') && t.includes('y ≈ 2'), t);
  await done(pg); }

// 8b) Funktionsmenue (Gitter-Symbol) und antippbare blaue Beschriftung
for (const touch of [true, false]) {
  const pg = await open({ touch, w: touch ? 390 : 1200, h: touch ? 844 : 900 }); const tap = sel => (touch ? pg.tap(sel) : pg.click(sel)); const tag = touch ? 'Touch' : 'Maus';
  await tap('#menuBtn'); let t = await lcd(pg); ok(`${tag}: Gitter-Symbol oeffnet Funktionsmenue`, t.includes('CALC') && t.includes('SOLVE') && t.includes('ALGEBRA') && t.includes('Bruch a/b'), t);
  await tap('#lcd .mi >> nth=8'); t = await lcd(pg); ok(`${tag}: Menue-Eintrag Integral fuegt Struktur ein`, t.includes('∫'), t);
  await tap('#menuBtn'); t = await lcd(pg); ok(`${tag}: Zuletzt benutzt erscheint`, t.startsWith('RECENT') && t.includes('Integral'), t);
  await tap('#lcd .mtabs span >> nth=3'); t = await lcd(pg); ok(`${tag}: Tab ALGEBRA zeigt Komplexe Zahlen und Matrizen`, t.includes('Komplexe Zahlen') && t.includes('Matrizen'), t);
  await tap('#lcd .mi >> nth=1'); t = await lcd(pg); ok(`${tag}: Eintrag Matrizen oeffnet Matrix-Menue`, t.includes('MATRIX'), t);
  await key(pg, 'C'); await key(pg, 'C'); await tap('#menuBtn'); await tap('#menuBtn'); t = await lcd(pg); ok(`${tag}: zweites Antippen schliesst das Menue`, !t.includes('SOLVE'), t);
  await key(pg, 'C');
  const flat = await pg.evaluate(() => { const b = [...document.querySelectorAll('.kc button.s2')]; return { n: b.length, bg: [...new Set(b.map(x => getComputedStyle(x).backgroundColor))].join('|') }; });
  ok(`${tag}: blaue Beschriftungen sind antippbar (>= 30)`, flat.n >= 30, flat.n); ok(`${tag}: Beschriftung sieht nicht wie eine Taste aus (transparent)`, /^rgba\(0, 0, 0, 0\)$/.test(flat.bg), flat.bg);
  await tap('.kc .s2[data-k2="math"]'); t = await lcd(pg); ok(`${tag}: Tippen auf "matrix" oeffnet Matrizen ohne 2nd`, t.includes('MATRIX'), t); await key(pg, 'C');
  await tap('.kc .s2[data-k2="sin"]'); t = await lcd(pg); ok(`${tag}: Tippen auf "num-solv" oeffnet den Loeser`, t.includes('NUM-SOLV'), t); await key(pg, 'C');
  await tap('.kc .s2[data-k2="nd"]'); await tap('.kc .s2[data-k2="lnlog"]'); t = await lcd(pg); ok(`${tag}: Tippen auf "d/dx" fuegt Ableitung ein`, t.includes('d/dx') || t.includes('dx'), t);
  const on2 = await pg.evaluate(() => document.querySelector('[data-k="2nd"]').classList.contains('active2')); ok(`${tag}: 2nd bleibt nach Beschriftungs-Tipp aus`, !on2);
  const e = await done(pg); ok(`${tag}: Funktionsmenue ohne Skriptfehler`, e.length === 0, e.join('|'));
}
for (const scheme of ['dark', 'light']) {
  const pg = await open({ scheme }); await pg.click('#menuBtn');
  const c = await pg.evaluate(() => {
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
    const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b.length >= 3 && (b.length < 4 || b[3] > 0.5)) return b.slice(0, 3); } return [255, 255, 255]; };
    const el = [...document.querySelectorAll('#lcd .mi')].find(e => !e.classList.contains('sel')); const tab = document.querySelector('#lcd .mtabs span:not(.on)');
    const ratio = e => { const a = lum(rgb(getComputedStyle(e).color).slice(0, 3)), b = lum(bgOf(e)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
    const lab = document.querySelector('.kc button.s2'); const dk = document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.dataset.theme === 'dark'; const la = lum(rgb(getComputedStyle(lab).color).slice(0, 3)), lb = lum(dk ? [24, 27, 36] : [236, 238, 242]); return [ratio(el), ratio(tab), (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)];
  });
  ok(`Funktionsmenue: Eintraege lesbar (${scheme})`, c[0] >= 4.5, c[0].toFixed(2)); ok(`Funktionsmenue: Tabs lesbar (${scheme})`, c[1] >= 4.5, c[1].toFixed(2)); ok(`Beschriftungen lesbar (${scheme}), Kontrast >= 3`, c[2] >= 3, c[2].toFixed(2));
  await done(pg);
}

// 9) Sprache EN und Hilfe
{ const pg = await open({ locale: 'en-US' }); await second(pg, 'math'); let t = await lcd(pg); ok('EN: Menue englisch', t.includes('Edit matrix'), t); await key(pg, 'C'); await key(pg, 'C'); await pg.click('#menuBtn'); t = await lcd(pg); ok('EN: Funktionsmenue englisch', t.includes('Mixed number') && t.includes('Fraction'), t); await done(pg); }

await browser.close();
console.log(`e2e pass=${pass} fail=${fail}`);
if (fail) { console.log('Fehlgeschlagen:\n - ' + failures.join('\n - ')); process.exit(1); }
