import assert from 'node:assert/strict';
import test from 'node:test';
import { answerFor, decodeEvidencePack, findEvidence } from '../src/evidenceChat.js';

const encode = (rows) => Buffer.from(Int8Array.from(rows.flat()).buffer).toString('base64');
const passage = (text, source = 'The Hindu') => ({
  storyId: text.slice(0, 8), text, language: 'en', source, tier: 'record', kind: 'report',
  url: 'https://example.com/a', publishedAt: '2026-10-16T10:00:00Z', corroboratedBy: [],
});

// Four 3-d passages: two copies of one report, a close second report and an unrelated one.
const pack = {
  kind: 'evidence', dimensions: 3, ids: ['a', 'b', 'c', 'd'], scales: [127, 127, 127, 127],
  vectors: encode([[127, 0, 0], [127, 0, 0], [120, 42, 0], [0, 127, 0]]),
  passages: [
    passage('Palaniswami alleged corruption in power bought at Rs 35 a unit.'),
    passage('Palaniswami alleged corruption in power bought at Rs 35 a unit.', 'Dinamani'),
    passage('EPS said the power purchase was a mega scam.', 'DT Next'),
    passage('Cauvery water was released from Mettur dam.'),
  ],
};

test('evidence is found by meaning and syndicated copies collapse into one', () => {
  const decoded = decodeEvidencePack(pack);
  assert.deepEqual(findEvidence(decoded, [1, 0, 0], { minScore: 0.5 }).map((item) => item.id), ['a', 'c']);
  assert.equal(decodeEvidencePack({ ...pack, kind: undefined }), null);
});

test('Ask shows passages near the best match, and nothing when none is close enough', () => {
  const decoded = decodeEvidencePack(pack);
  assert.deepEqual(answerFor(decoded, [1, 0, 0]).map((item) => item.id), ['a', 'c']);
  assert.deepEqual(answerFor(decoded, [1, 0, 0], { margin: 0.01 }).map((item) => item.id), ['a']);
  // Best match 0.45 is under the answer bar: no trusted source answers.
  assert.deepEqual(answerFor(decoded, [0.45, 0, 0.893]), []);
  const [shown] = answerFor(decoded, [1, 0, 0]);
  assert.equal(shown.url, 'https://example.com/a');
  assert.equal(shown.text, 'Palaniswami alleged corruption in power bought at Rs 35 a unit.');
});
