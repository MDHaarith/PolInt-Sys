import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeEvidencePack, evidenceFor, findEvidence, questionLanguage, readReply, summaryProblem } from '../src/evidenceChat.js';

const encode = (rows) => Buffer.from(Int8Array.from(rows.flat()).buffer).toString('base64');
const passage = (text, source = 'The Hindu') => ({
  storyId: text.slice(0, 8), text, language: /[஀-௿]/.test(text) ? 'ta' : 'en', source, tier: 'record',
  kind: 'report', url: 'https://example.com/a', publishedAt: '2026-10-16T10:00:00Z', corroboratedBy: [],
});

const pack = {
  kind: 'evidence', dimensions: 3, ids: ['a', 'b', 'c'], scales: [127, 127, 127],
  vectors: encode([[127, 0, 0], [127, 0, 0], [0, 127, 0]]),
  passages: [
    passage('Palaniswami alleged corruption in power bought at Rs 35 a unit.'),
    passage('Palaniswami alleged corruption in power bought at Rs 35 a unit.', 'Dinamani'),
    passage('Cauvery water was released from Mettur dam.'),
  ],
};

test('evidence is found by meaning and syndicated copies collapse into one', () => {
  const decoded = decodeEvidencePack(pack);
  const found = findEvidence(decoded, [1, 0, 0], { limit: 3, minScore: 0.5 });
  assert.deepEqual(found.map((item) => item.id), ['a']);
  assert.equal(decodeEvidencePack({ ...pack, kind: undefined }), null);
  // Nothing close enough: no passage reaches the model at all.
  assert.deepEqual(evidenceFor(decoded, [0.45, 0, 0.89], { minScore: 0 }), []);
  assert.deepEqual(evidenceFor(decoded, [1, 0, 0]).map((item) => item.id), ['a']);
});

test('the reply only picks passages; quotes are the outlets own words', () => {
  const passages = pack.passages;
  const question = 'What did Palaniswami allege about power purchase?';
  const shown = readReply('<think>hmm</think>{"sources": [1, 9, 1], "summary": "He alleged corruption at Rs 35 a unit."}', question, passages);
  assert.equal(shown.status, 'answered');
  assert.deepEqual(shown.quotes, [passages[0]]);
  assert.equal(shown.summary, 'He alleged corruption at Rs 35 a unit.');
  assert.equal(readReply('{"sources": [], "summary": ""}', question, passages).status, 'no_evidence');
  assert.equal(readReply('I think it is about power', question, passages).status, 'unreadable');
});

test('a summary is hidden when it adds numbers or words, switches language or mixes scripts', () => {
  const quotes = [pack.passages[0]];
  const tamilQuotes = [passage('மின் கொள்முதலில் ஊழல் நடந்துள்ளது என்று இபிஎஸ் குற்றம் சாட்டினார்')];
  assert.equal(summaryProblem('He alleged corruption at Rs 45 a unit.', 'What did EPS say?', quotes), 'number not in sources');
  assert.equal(summaryProblem('ஊழல் என்று குற்றம் சாட்டினார்', 'What did EPS say?', quotes), 'wrong language');
  assert.equal(summaryProblem('He alleged corruption.', 'இபிஎஸ் என்ன சொன்னார்?', quotes), 'wrong language');
  assert.equal(summaryProblem('மின் கொள்முதலில் ஊழல் नहीं என்றார்', 'இபிஎஸ் என்ன சொன்னார்?', quotes), 'foreign script');
  assert.equal(summaryProblem('மின் கொள்முதலில் ஊழல் என்று இபிஎஸ் குற்றம் சாட்டினார்', 'இபிஎஸ் என்ன சொன்னார்?', quotes), 'cannot check across languages');
  assert.equal(summaryProblem('மின் கொள்முதலில் ஊழல் என்று இபிஎஸ் குற்றம் சாட்டினார்', 'இபிஎஸ் என்ன சொன்னார்?', tamilQuotes), null);
  assert.equal(summaryProblem('The film Tendili won the national award for Deva.', 'Which film won?', quotes), 'words not in sources');
  assert.equal(summaryProblem('Palaniswami alleged corruption in the power purchase.', 'What did EPS say?', quotes), null);
  assert.equal(questionLanguage('TVK கூட்டணியில் PMK சேருமா?'), 'ta');
});
