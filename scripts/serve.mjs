// Kleiner lokaler Server fuer dist/ (http://localhost:8080) – noetig fuer PWA/Service Worker.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname; const f = p === '/' ? '/index.html' : p;
  try { const b = await readFile(join(dist, f.replace(/\.\./g, ''))); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(8080, () => console.log('Exakto läuft auf http://localhost:8080'));
