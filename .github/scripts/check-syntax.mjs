#!/usr/bin/env node
// Standalone-HTML syntax gate. WaxTree ships as plain HTML files with
// inline <script> blocks and no build step, so nothing (tsc, webpack,
// eslint) ever parses this JS before it reaches production — a stray
// unbalanced brace or bad edit only surfaces when a real browser loads the
// live page. This mirrors the manual `node --check` verification already
// done before every commit and runs it automatically in CI instead.
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const htmlFiles = readdirSync(ROOT)
  .filter(f => extname(f) === '.html')
  .sort();

const apiFiles = (() => {
  try {
    return readdirSync(join(ROOT, 'api'))
      .filter(f => extname(f) === '.js')
      .map(f => join('api', f));
  } catch {
    return [];
  }
})();

const scriptTagRe = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

let failures = 0;
const tmp = mkdtempSync(join(tmpdir(), 'wt-ci-'));

function checkSource(label, code, isModule) {
  if (!code.trim()) return;
  const ext = isModule ? '.mjs' : '.js';
  const tmpFile = join(tmp, `check${ext}`);
  writeFileSync(tmpFile, code);
  try {
    execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'pipe' });
    console.log(`  ok   ${label}`);
  } catch (e) {
    failures++;
    console.error(`  FAIL ${label}`);
    console.error(e.stderr?.toString().trim().split('\n').map(l => '       ' + l).join('\n'));
  }
}

for (const file of htmlFiles) {
  const content = readFileSync(join(ROOT, file), 'utf-8');
  let match, i = 0;
  scriptTagRe.lastIndex = 0;
  while ((match = scriptTagRe.exec(content))) {
    i++;
    const attrs = match[1] || '';
    const isModule = /type\s*=\s*["']module["']/i.test(attrs);
    checkSource(`${file} <script${isModule ? ' type="module"' : ''}> #${i}`, match[2], isModule);
  }
}

for (const file of apiFiles) {
  checkSource(file, readFileSync(join(ROOT, file), 'utf-8'), false);
}

rmSync(tmp, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} syntax error(s) found.`);
  process.exit(1);
}
console.log('\nAll inline scripts parse cleanly.');
