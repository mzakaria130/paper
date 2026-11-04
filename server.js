/**
 * Minimal zero-dependency local static server
 * Runs with pure Node.js: "node server.js"
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BASE_DIR = __dirname;
const DATA_FILE = path.join(BASE_DIR, 'paper-data.json');

// --- Agent bridge API: canonical state file (local-first, single file) ---
// GET  /api/state -> current paper-data.json (or {initialized:false})
// POST /api/state -> validate + atomically write paper-data.json
// Used by tools/paper-bridge.mjs (CLI + MCP) so agents fill the dashboard
// without browser automation. The browser store syncs to this file.
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(body);
}
function handleApi(req, res, urlPath) {
  if (urlPath !== '/api/state') return false;
  if (req.method === 'GET') {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
      if (err) return sendJSON(res, 200, { initialized: false });
      try { sendJSON(res, 200, JSON.parse(data)); }
      catch { sendJSON(res, 500, { error: 'corrupt data file' }); }
    });
    return true;
  }
  if (req.method === 'POST') {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 2 * 1024 * 1024) { req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return sendJSON(res, 400, { error: 'invalid JSON' }); }
      const ok = data && Array.isArray(data.research?.columns) && Array.isArray(data.research?.rows)
        && Array.isArray(data.projects) && Array.isArray(data.journal) && typeof data.notes === 'string';
      if (!ok) return sendJSON(res, 400, { error: 'shape check failed: need research{columns,rows}, projects[], journal[], notes string' });
      data.version = 3; data.timestamp = new Date().toISOString();
      const tmp = DATA_FILE + '.tmp';
      fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8', (err) => {
        if (err) return sendJSON(res, 500, { error: 'write failed' });
        fs.rename(tmp, DATA_FILE, (err2) => {
          if (err2) return sendJSON(res, 500, { error: 'rename failed' });
          sendJSON(res, 200, { ok: true, timestamp: data.timestamp, counts: { research: data.research.rows.length, projects: data.projects.length, journal: data.journal.length } });
        });
      });
    });
    return true;
  }
  sendJSON(res, 405, { error: 'method not allowed' });
  return true;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let safePath = req.url.split('?')[0];
  if (handleApi(req, res, safePath)) return;
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.normalize(path.join(BASE_DIR, safePath));

  // Security: prevent path traversal outside BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`
=====================================================
  PAPER // LOCAL WORKSPACE DASHBOARD
=====================================================
  Status:  READY (Local Operation)
  URL:     http://localhost:${PORT}
  Mode:    Pure Local Storage / No Cloud
=====================================================
  Press Ctrl + C to stop server.
  `);
});
