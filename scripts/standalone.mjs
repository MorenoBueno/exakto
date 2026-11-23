// Erzeugt release/exakto.html: eine einzige Datei, die unter file:// ohne Server und ohne Netz laeuft.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
const icon = readFileSync(join(root, 'public', 'icon.svg'), 'utf8').trim();
html = html
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}">`)
  .replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '')
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<meta property="og:image"[^>]*>\n?/, '');
// Pruefungen: keine externen Abhaengigkeiten, keine Laufzeit-Importe, keine fetch()-Aufrufe
const bad = [[/(?:src|href)="https?:/i, 'externe URL'], [/\bfetch\s*\(/, 'fetch()'], [/\bimport\s*\(|^\s*import\s.+from/m, 'import'], [/<link[^>]+href="(?!data:)/i, 'externe Link-Datei']];
for (const [re, what] of bad) if (re.test(html)) throw new Error('Standalone enthaelt ' + what);
mkdirSync(join(root, 'release'), { recursive: true });
writeFileSync(join(root, 'release', 'exakto.html'), html);
console.log(`release/exakto.html  ${(html.length / 1024).toFixed(0)} KB`);
