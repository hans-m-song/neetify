import http from 'node:http';
import { readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VIEWER_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(VIEWER_DIR, '..');
const PORT = Number(process.env.PORT) || 8787;

const CONTENT_EXTS = new Set(['.md', '.txt', '.pdf', '.yaml', '.yml']);
const IGNORE = new Set(['.git', 'node_modules', 'viewer', '.DS_Store']);

const CONTENT_TYPES = {
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const isHidden = (name) => name.startsWith('.');

function buildTree(absDir, relDir = '') {
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const dirs = [];
  const files = [];
  for (const entry of entries) {
    if (isHidden(entry.name) || IGNORE.has(entry.name)) continue;
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const children = buildTree(path.join(absDir, entry.name), rel);
      if (children.length) dirs.push({ name: entry.name, path: rel, type: 'dir', children });
    } else if (CONTENT_EXTS.has(path.extname(entry.name).toLowerCase())) {
      files.push({ name: entry.name, path: rel, type: 'file', ext: path.extname(entry.name).toLowerCase() });
    }
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  return [...dirs.sort(byName), ...files.sort(byName)];
}

function safeResolve(base, relPath) {
  const abs = path.resolve(base, '.' + path.sep + relPath);
  if (abs !== base && !abs.startsWith(base + path.sep)) return null;
  return abs;
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

// --- SSE: broadcast filesystem changes to connected clients ---
const sseClients = new Set();
let pending = new Set();
let debounce = null;

function broadcast() {
  const paths = [...pending];
  pending = new Set();
  const payload = `data: ${JSON.stringify({ paths })}\n\n`;
  for (const res of sseClients) res.write(payload);
}

try {
  fs.watch(ROOT, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const rel = filename.split(path.sep).join('/');
    const top = rel.split('/')[0];
    if (isHidden(top) || IGNORE.has(top)) return;
    pending.add(rel);
    clearTimeout(debounce);
    debounce = setTimeout(broadcast, 150);
  });
} catch (err) {
  console.warn('file watching unavailable:', err.message);
}

async function serveFile(res, absPath, ext) {
  try {
    const data = await readFile(absPath);
    send(res, 200, CONTENT_TYPES[ext] || 'application/octet-stream', data);
  } catch {
    send(res, 404, 'text/plain', 'not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  if (route === '/' || route === '/index.html') {
    return serveFile(res, path.join(VIEWER_DIR, 'index.html'), '.html');
  }
  if (route === '/app.js' || route === '/styles.css' || route.startsWith('/vendor/')) {
    const abs = safeResolve(VIEWER_DIR, route);
    if (!abs) return send(res, 403, 'text/plain', 'forbidden');
    return serveFile(res, abs, path.extname(abs).toLowerCase());
  }
  if (route === '/api/tree') {
    return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(buildTree(ROOT)));
  }
  if (route === '/api/raw') {
    const rel = url.searchParams.get('path') || '';
    const abs = safeResolve(ROOT, rel);
    const ext = path.extname(rel).toLowerCase();
    if (!abs || !CONTENT_EXTS.has(ext)) return send(res, 403, 'text/plain', 'forbidden');
    return serveFile(res, abs, ext);
  }
  if (route === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    sseClients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
    return;
  }
  send(res, 404, 'text/plain', 'not found');
});

server.listen(PORT, () => {
  console.log(`markdown viewer  ->  http://localhost:${PORT}`);
  console.log(`serving:         ${ROOT}`);
});
