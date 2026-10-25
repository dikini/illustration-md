import assert from 'node:assert/strict';
import { selectProfile } from './profiles.mjs';

export function resolveAppearance(global, document = {}, request = {}) {
  let selected = {};
  const keys = ['font', 'stroke', 'roughness', 'bowing', 'seed'];
  for (const layer of [global, document, request]) {
    assert.ok(layer && typeof layer === 'object' && !Array.isArray(layer), 'Appearance must be a map.');
    for (const key of Object.keys(layer)) assert.ok(keys.includes(key), `Unknown appearance key: ${key}`);
    if (Object.hasOwn(layer, 'stroke')) {
      if (layer.stroke === 'custom') assert.ok(Object.hasOwn(layer, 'roughness'), 'Custom needs roughness.');
      const profile = selectProfile(layer.stroke, layer.roughness);
      selected = { ...selected, stroke: profile.name, roughness: profile.roughness, bowing: profile.bowing };
    } else if (Object.hasOwn(layer, 'roughness')) selected.stroke = 'custom';
    selected = { ...selected, ...layer };
    if (Object.hasOwn(layer, 'font')) assert.ok(['regular', 'excalifont'].includes(layer.font), 'Unknown font.');
    if (Object.hasOwn(layer, 'roughness')) {
      assert.ok(Number.isFinite(layer.roughness) && layer.roughness >= 0 && layer.roughness <= 5,
        'Roughness must be between 0 and 5.');
      assert.ok(layer.stroke !== 'crisp' || layer.roughness === 0, 'Crisp requires zero roughness.');
    }
    if (Object.hasOwn(layer, 'bowing')) assert.ok(Number.isFinite(layer.bowing) && layer.bowing >= 0, 'Invalid bowing.');
    if (Object.hasOwn(layer, 'seed')) assert.ok(Number.isInteger(layer.seed) && layer.seed > 0 && layer.seed < 2 ** 31,
      'A nonzero integer seed below 2^31 is required.');
  }
  assert.ok(selected.font && selected.stroke && selected.seed, 'Global defaults must supply font, stroke, and seed.');
  return selected;
}
