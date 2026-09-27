#!/usr/bin/env node
'use strict';

/**
 * Yoohub Deobf by Fox — local web server
 * Serves web/ UI and exposes /api/deobf using the same engine as deob.js
 *
 * Usage:
 *   npm install
 *   node server.js
 *   open http://localhost:3847
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const PORT = Number(process.env.SERVER_PORT || process.env.PORT || process.env.PANEL_PORT) || 3847;
const ROOT = __dirname;
const WEB = path.join(ROOT, 'web');
const DEOB = path.join(ROOT, 'deob.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.lua': 'text/plain; charset=utf-8',
  '.luau': 'text/plain; charset=utf-8',
};

function send(res, status, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Content-Length': buf.length,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(buf);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // security: no path escape
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(WEB, safe);
  if (!filePath.startsWith(WEB)) {
    return send(res, 403, 'Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA-ish fallback
      if (urlPath !== '/index.html') {
        return fs.readFile(path.join(WEB, 'index.html'), (e2, html) => {
          if (e2) return send(res, 404, 'Not found');
          send(res, 200, html, MIME['.html']);
        });
      }
      return send(res, 404, 'Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
}

function runDeobf(source, options = {}) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yoohub-deobf-'));
    const inFile = path.join(tmpDir, 'input.lua');
    const outFile = path.join(tmpDir, 'output.lua');
    fs.writeFileSync(inFile, source, 'utf8');

    const args = [DEOB, inFile, '-o', outFile];
    if (options.detect) args.push('--detect');
    if (options.noDevirt) args.push('--no-devirt');
    if (options.debug) args.push('--debug');

    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeoutMs = (options.timeoutSec || 180) * 1000;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Deobfuscation timed out'));
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      cleanup();
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        if (options.detect) {
          cleanup();
          return resolve({ output: (stdout + '\n' + stderr).trim(), code });
        }
        if (fs.existsSync(outFile)) {
          const output = fs.readFileSync(outFile, 'utf8');
          cleanup();
          return resolve({ output, code, log: (stdout + stderr).trim() });
        }
        cleanup();
        if (code !== 0) {
          return reject(new Error(stderr || stdout || ('exit ' + code)));
        }
        resolve({ output: stdout || '(no output file)', code, log: stderr });
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    function cleanup() {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (_) {}
    }
  });
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = (req.url || '/').split('?')[0];

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (method === 'GET' && url === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      name: 'yoohubdeobfbyfox',
      engine: 'deob.js',
      port: PORT,
    });
  }

  if (method === 'POST' && url === '/api/deobf') {
    try {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
      }
      const source = body.source || body.code || '';
      if (!source || typeof source !== 'string') {
        return sendJson(res, 400, { error: 'Missing source' });
      }
      if (source.length > 6 * 1024 * 1024) {
        return sendJson(res, 413, { error: 'Source too large' });
      }
      const options = body.options || {};
      const result = await runDeobf(source, options);
      return sendJson(res, 200, {
        ok: true,
        output: result.output,
        log: result.log || '',
      });
    } catch (e) {
      return sendJson(res, 500, { error: String(e.message || e) });
    }
  }

  if (method === 'GET') {
    return serveStatic(req, res);
  }

  send(res, 405, 'Method not allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  process.stderr.write(
    `[yoohub] Web UI + API listening on http://localhost:${PORT}\n` +
    `         Health: GET  /api/health\n` +
    `         Deobf:  POST /api/deobf  { "source": "..." }\n`
  );
});
