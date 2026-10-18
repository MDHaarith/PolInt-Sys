import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeVectorIndex, searchVectorIndex, truncate } from '../src/semanticSearch.js';

const encode = (rows) => Buffer.from(Int8Array.from(rows.flat()).buffer).toString('base64');

test('the on-device index ranks stories by cosine similarity', () => {
  // Three 4-d stories stored as int8 with per-row scales, as the pipeline writes them.
  const index = decodeVectorIndex({
    dimensions: 4,
    ids: ['metro', 'cauvery', 'meth'],
    scales: [127, 127, 127],
    vectors: encode([[127, 0, 0, 0], [0, 127, 0, 0], [90, 90, 0, 0]]),
  });
  const query = truncate([1, 0.2, 0, 0, 9, 9], 4);
  const hits = searchVectorIndex(index, query, { limit: 2 });
  assert.deepEqual(hits.map((hit) => hit.id), ['metro', 'meth']);
  assert.ok(Math.abs(hits[0].score - query[0]) < 1e-6);
});

test('an empty or missing index turns search by meaning off', () => {
  assert.equal(decodeVectorIndex(null), null);
  assert.equal(decodeVectorIndex({ ids: [], vectors: '' }), null);
});

test('a story finds its neighbours from its own stored vector', async () => {
  const { storyVector } = await import('../src/semanticSearch.js');
  const index = decodeVectorIndex({
    dimensions: 2, ids: ['en', 'ta', 'other'], scales: [127, 127, 127],
    vectors: encode([[127, 10], [120, 30], [0, 127]]),
  });
  const hits = searchVectorIndex(index, storyVector(index, 'en'), { limit: 2 });
  assert.deepEqual(hits.map((hit) => hit.id), ['en', 'ta']);
  assert.equal(storyVector(index, 'missing'), null);
});
