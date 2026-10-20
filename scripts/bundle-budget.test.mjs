import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLimit, initialCeiling, scriptSrcs } from './check-bundle-budget.mjs';

test('scriptSrcs reads the scripts the exported page loads', () => {
  const html =
    '<link href="/favicon.ico"><script src="/_expo/static/js/web/entry-abc.js" defer></script>';
  assert.deepEqual(scriptSrcs(html), ['/_expo/static/js/web/entry-abc.js']);
});

test('initial ceiling is the measurement rounded up to 1 KiB plus 8 KiB', () => {
  assert.equal(initialCeiling(1000), 1024 + 8192);
  assert.equal(initialCeiling(1024), 1024 + 8192);
  assert.equal(initialCeiling(1025), 2048 + 8192);
});

test('evaluateLimit fails only when the measured total is over the ceiling', () => {
  assert.equal(evaluateLimit('first-load JS', 100, 100), null);
  assert.deepEqual(evaluateLimit('first-load JS', 101, 100), {
    name: 'first-load JS',
    reason: 'over',
    bytes: 101,
    maxBytes: 100,
  });
  assert.equal(evaluateLimit('deferred JS', null, 10).reason, 'missing');
});
