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

test('an index that names a shared direction ranks by what differs', async () => {
  // Both stories lean along the first axis, which says little; the query differs
  // from story b only in the third axis. Removing the first axis ranks b first.
  const stored = { dimensions: 3, ids: ['a', 'b'], scales: [127, 254], vectors: encode([[127, 25, 0], [127, 0, 102]]) };
  const query = truncate([1, 0, 0.1], 3);
  assert.deepEqual(searchVectorIndex(decodeVectorIndex(stored), query).map((hit) => hit.id), ['a', 'b']);
  const index = decodeVectorIndex({ ...stored, centre: [0, 0, 0], directions: [[1, 0, 0]] });
  const hits = searchVectorIndex(index, query);
  assert.deepEqual(hits.map((hit) => hit.id), ['b', 'a']);
  assert.ok(Math.abs(hits[0].score - 1) < 1e-6 && Math.abs(hits[1].score) < 1e-6);
  // "Similar" passes a story's stored vector, which is prepared the same way.
  const { storyVector } = await import('../src/semanticSearch.js');
  assert.equal(searchVectorIndex(index, storyVector(index, 'b'))[0].id, 'b');
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
