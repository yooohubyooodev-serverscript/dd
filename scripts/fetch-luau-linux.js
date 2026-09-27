#!/usr/bin/env node
'use strict';
/**
 * Download official Luau Linux binaries into bin/ when missing.
 * Used on Render / Linux hosts (Windows keeps .exe from the repo).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BIN = path.join(ROOT, 'bin');
const TAG = process.env.LUAU_TAG || '0.740';
const URL = `https://github.com/luau-lang/luau/releases/download/${TAG}/luau-ubuntu.zip`;

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = (u, redirects = 0) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirects > 5) return reject(new Error('too many redirects'));
          return get(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode + ' for ' + u));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      }).on('error', reject);
    };
    get(url);
  });
}

async function main() {
  if (process.platform === 'win32') {
    console.log('[fetch-luau] Windows host — skip (use bin/*.exe)');
    return;
  }
  const luau = path.join(BIN, 'luau');
  const ast = path.join(BIN, 'luau-ast');
  if (exists(luau) && exists(ast)) {
    try { fs.chmodSync(luau, 0o755); fs.chmodSync(ast, 0o755); } catch {}
    console.log('[fetch-luau] already present:', luau);
    return;
  }
  fs.mkdirSync(BIN, { recursive: true });
  const zipPath = path.join(BIN, 'luau-ubuntu.zip');
  console.log('[fetch-luau] downloading', URL);
  await download(URL, zipPath);
  try {
    execFileSync('unzip', ['-o', zipPath, 'luau', 'luau-ast', '-d', BIN], { stdio: 'inherit' });
  } catch {
    // fallback: try python zipfile
    execFileSync('python3', ['-c', `
import zipfile
z=zipfile.ZipFile(${JSON.stringify(zipPath)})
for n in ('luau','luau-ast'):
    z.extract(n, ${JSON.stringify(BIN)})
`], { stdio: 'inherit' });
  }
  fs.chmodSync(luau, 0o755);
  fs.chmodSync(ast, 0o755);
  try { fs.unlinkSync(zipPath); } catch {}
  console.log('[fetch-luau] installed luau + luau-ast into bin/');
}

main().catch((e) => {
  console.error('[fetch-luau] FAILED:', e.message || e);
  process.exit(0); // do not fail npm install; runtime will error clearly
});
