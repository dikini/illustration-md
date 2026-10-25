import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertBrowserVersion } from '../src/browser-version.mjs';

const minimum = 'Chrome/152.0.7977.75';
test('Chrome minimum accepts equal and newer numeric versions', () => {
  for (const version of [minimum, 'Chrome/152.0.7977.76', 'Chrome/152.0.7978.0',
    'Chrome/152.1.0.0', 'Chrome/155.0.8059.79', 'Chrome/1000.0.0.0']) {
    assert.doesNotThrow(() => assertBrowserVersion(version, minimum));
  }
});
test('Chrome minimum rejects older versions, other products and malformed input', () => {
  for (const version of ['Chrome/151.9.9999.999', 'Chrome/152.0.7977.74',
    'Chrome/152.0.7976.999', 'Firefox/155.0.8059.79', 'Chrome/155',
    'Chrome/155.0.8059.79-beta', '', null]) {
    assert.throws(() => assertBrowserVersion(version, minimum), /Chrome|browser/);
  }
  assert.throws(() => assertBrowserVersion(minimum, 'Chrome/152'), /minimum/);
});
