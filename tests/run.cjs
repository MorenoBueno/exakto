// fuehrt alle *.test.cjs unter tests/ aus
const { readdirSync, statSync } = require('node:fs'); const { join } = require('node:path'); const { spawnSync } = require('node:child_process');
const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.test.cjs')) files.push(p); } })(__dirname);
let bad = 0;
for (const f of files.sort()) { console.log('▶', f.slice(__dirname.length + 1)); const r = spawnSync(process.execPath, [f], { stdio: 'inherit' }); if (r.status) bad++; }
if (bad) { console.error(`${bad} Testdatei(en) fehlgeschlagen`); process.exit(1); }
