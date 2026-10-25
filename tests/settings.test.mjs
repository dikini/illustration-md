import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveAppearance } from '../src/settings.mjs';

const global = { font: 'regular', stroke: 'crisp', seed: 1729 };

test('defaults resolve per field, with request above document above global', () => {
  assert.deepEqual(resolveAppearance(global, {}, {}), {
    font: 'regular', stroke: 'crisp', seed: 1729, roughness: 0, bowing: 0 });
  const document = { font: 'excalifont', stroke: 'mild' };
  assert.deepEqual(resolveAppearance(global, document, { stroke: 'rough' }), {
    font: 'excalifont', stroke: 'rough', seed: 1729, roughness: 1.8, bowing: 1 });
  assert.equal(resolveAppearance(global, document, { roughness: 1.2 }).roughness, 1.2);
  assert.equal(resolveAppearance(global, document, { roughness: 1.2 }).stroke, 'custom');
  assert.equal(resolveAppearance(global, { roughness: 2 }, { stroke: 'crisp' }).roughness, 0);
});

test('invalid choices and unknown fields fail instead of silently falling back', () => {
  for (const override of [{ font: 'other' }, { stroke: 'other' }, { roughness: -1 },
    { roughness: Infinity }, { seed: 0 }, { seed: 1.5 }, { bowing: -1 }, { typo: 'mild' },
    { stroke: 'crisp', roughness: 1 }, { stroke: 'custom' }, []]) {
    assert.throws(() => resolveAppearance(global, {}, override));
  }
});
