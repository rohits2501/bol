/**
 * Gate the Expo web export against perf/budgets.json.
 *
 * First-load JS is the level-9 gzip of every script index.html loads before the
 * dictation screen can run. Deferred JS is every other exported chunk. A missing
 * export fails, and so does a total over its ceiling.
 *
 * Run after `npm run export:web`. Print without enforcing: --print
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const KIB = 1024;
const SLACK_BYTES = 8 * KIB;

/** Initial ceiling: round the measurement up to the next KiB, then add 8 KiB. */
export function initialCeiling(bytes) {
  return Math.ceil(bytes / KIB) * KIB + SLACK_BYTES;
}

export function scriptSrcs(html) {
  return [...html.matchAll(/<script[^>]*\ssrc="([^"]+\.js)"/g)].map((match) => match[1]);
}

/**
 * @param {string} name
 * @param {number | null} bytes
 * @param {number} maxBytes
 */
export function evaluateLimit(name, bytes, maxBytes) {
  if (bytes == null) return { name, reason: 'missing', maxBytes };
  if (bytes > maxBytes) return { name, reason: 'over', bytes, maxBytes };
  return null;
}

function gzipFile(file) {
  return gzipSync(readFileSync(file), { level: 9 }).length;
}

function walkJs(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) walkJs(abs, out);
    else if (name.endsWith('.js')) out.push(abs);
  }
  return out;
}

export function measure(distDir) {
  const htmlPath = path.join(distDir, 'index.html');
  if (!existsSync(htmlPath)) {
    throw new Error(`No ${htmlPath}. Run \`npm run export:web\` first.`);
  }
  const srcs = scriptSrcs(readFileSync(htmlPath, 'utf8'));
  if (srcs.length === 0) {
    throw new Error(`${htmlPath} loads no scripts.`);
  }
  const firstFiles = srcs.map((src) => path.join(distDir, src.replace(/^\//, '')));
  const firstSet = new Set(firstFiles.map((file) => path.resolve(file)));
  let firstLoad = 0;
  for (const file of firstFiles) firstLoad += gzipFile(file);

  let deferred = 0;
  for (const file of walkJs(path.join(distDir, '_expo'))) {
    if (!firstSet.has(path.resolve(file))) deferred += gzipFile(file);
  }
  return { firstLoad, deferred };
}

function formatKb(bytes) {
  return `${(bytes / 1000).toFixed(1)} kB`;
}

function main() {
  const printOnly = process.argv.includes('--print');
  const distDir = 'dist';
  const measured = measure(distDir);
  const budgetPath = 'perf/budgets.json';
  const budgets = existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, 'utf8')) : null;

  const rows = [
    ['first-load JS', measured.firstLoad, budgets?.firstLoadJs?.maxBytes],
    ['deferred JS', measured.deferred, budgets?.deferredJs?.maxBytes],
  ];
  console.log('Web JS (gzip, level 9)');
  for (const [label, bytes, maxBytes] of rows) {
    const max = maxBytes == null ? '' : `   max ${formatKb(maxBytes)}`;
    console.log(`  ${label.padEnd(16)} ${formatKb(bytes).padStart(10)}${max}`);
  }

  if (printOnly || !budgets) {
    if (!budgets) console.log('No perf/budgets.json — measurement only.');
    return;
  }

  const failures = [
    evaluateLimit('first-load JS', measured.firstLoad, budgets.firstLoadJs.maxBytes),
    evaluateLimit('deferred JS', measured.deferred, budgets.deferredJs.maxBytes),
  ].filter(Boolean);

  if (failures.length === 0) {
    console.log('Bundle budget ok.');
    return;
  }

  console.error('\nBundle budget failed.');
  for (const failure of failures) {
    if (failure.reason === 'over') {
      console.error(
        `  ${failure.name} is ${formatKb(failure.bytes)}, over ${formatKb(failure.maxBytes)} by ${formatKb(failure.bytes - failure.maxBytes)}.`,
      );
    } else {
      console.error(`  ${failure.name} was not measured.`);
    }
  }
  process.exitCode = 1;
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entry) main();
