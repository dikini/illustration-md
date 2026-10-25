import assert from 'node:assert/strict';
import test from 'node:test';
import { figureWidth } from '../src/size.mjs';

const sizes = { aside: { squareMm: 6.5, circleMm: 5 }, body: { squareMm: 9, circleMm: 8 } };
test('image width follows the primitive size, not the number of nodes', () => {
  assert.equal(figureWidth(408, 64, 'aside', 'square', sizes), '41.438mm');
  assert.equal(figureWidth(200, 24, 'aside', 'circle', sizes), '41.667mm');
  assert.equal(figureWidth(400, 24, 'aside', 'circle', sizes), '83.333mm');
  assert.equal(figureWidth(400, 24, 'body', 'circle', sizes), '133.333mm');
});
test('unsupported placement and nonpositive geometry fail', () => {
  for (const args of [[0, 24, 'aside', 'circle'], [400, 0, 'aside', 'circle'],
    [400, 24, 'unknown', 'circle'], [400, 24, 'aside', 'unknown']]) {
    assert.throws(() => figureWidth(...args, sizes));
  }
});
