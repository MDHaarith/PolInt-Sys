import assert from 'node:assert/strict';
import test from 'node:test';
import { connectionLines, gatherConnections } from '../src/connections.js';

const quote = (storyId, source, publishedAt, corroboratedBy = []) => ({ storyId, source, publishedAt, corroboratedBy, text: 'x', language: 'en' });
const step = (actor, actorName, actorParty, action, actionLabel, objective, date, counterparts = []) =>
  ({ storyId: `s_${actor}_${date}`, actor, actorName, actorParty, action, actionLabel, objective, date, counterparts });

const storylines = {
  windowDays: 45,
  storyMoves: {
    a: { actor: 'mk_stalin', actorName: 'M. K. Stalin', action: 'attack', actionLabel: 'Attacks', intent: "Erode the ruling party's standing", confidence: 'high', threadId: 't1' },
    b: { actor: 'l_murugan', actorName: 'L. Murugan', action: 'deliver', actionLabel: 'Delivers', intent: 'Deliver and claim credit', confidence: 'low', threadId: null },
  },
  threads: [{
    id: 't1', title: 'Breaking Bad row', startedAt: '2026-10-16T05:00:00Z', stepCount: 40, momentum: 'active', watchFor: 'a rebuttal from the target',
    steps: [
      step('mk_stalin', 'M. K. Stalin', 'dmk', 'attack', 'Attacks', 'offence', '2026-10-16T06:00:00Z', [{ id: '@vijay' }]),
      step('party:dmk', 'DMK', 'dmk', 'attack', 'Attacks', 'offence', '2026-10-17T06:00:00Z', [{ id: '@vijay' }]),
      step('vijay', 'Vijay', 'tvk', 'rebut', 'Rebuts', 'defence', '2026-10-18T06:00:00Z'),
    ],
  }],
  people: { mk_stalin: { name: 'M. K. Stalin', posture: 'offence', postureLabel: 'On the offensive', shift: { from: 'mobilisation', to: 'offence' }, moveCount: 117 } },
  relations: [{ from: 'mk_stalin', fromName: 'M. K. Stalin', to: 'tvk', toName: 'TVK', action: 'attack', label: 'Attacks', count: 25 }],
};

test('connections count every outlet, name the first, and follow the move into its storyline', () => {
  const facts = gatherConnections([quote('a', 'The Hindu', '2026-10-17T08:00:00Z', ['Dinamani']), quote('z', 'ANI News', '2026-10-17T05:00:00Z')], storylines);
  assert.equal(facts.outlets, 3);
  assert.equal(facts.first.source, 'ANI News');
  assert.equal(facts.thread.id, 't1');
  const lines = connectionLines(facts, 'en');
  assert.match(lines[0], /^3 trusted outlets reported this; ANI News was first/);
  assert.ok(lines.some((line) => line.startsWith('The move: M. K. Stalin attacks, likely to erode')));
  // The file keeps only the latest steps of a 40-move storyline.
  assert.ok(lines.includes('M. K. Stalin drives it (1 of the latest 3 moves).'));
  // DMK following Stalin is one side; Vijay rebutting the DMK is the exchange.
  assert.ok(lines.includes('A back-and-forth: DMK attacks and Vijay answered.'));
  assert.ok(lines.includes('Its aim has shifted from on the offensive to damage control.'));
  assert.ok(lines.includes('Most frequent: M. K. Stalin attacks TVK (25 times in 45 days).'));
});

test('two attacks on the same third party are not an exchange', () => {
  const thread = { ...storylines.threads[0], steps: [
    step('edappadi', 'Edappadi K. Palaniswami', 'aiadmk', 'attack', 'Attacks', 'offence', '2026-10-14T06:00:00Z', [{ id: 'tvk' }]),
    step('anbumani', 'Anbumani Ramadoss', 'pmk', 'attack', 'Attacks', 'offence', '2026-10-16T06:00:00Z', [{ id: 'tvk' }]),
  ] };
  const lines = connectionLines(gatherConnections([quote('a', 'The Hindu', '2026-10-14T08:00:00Z')], { ...storylines, threads: [thread] }), 'en');
  assert.ok(!lines.some((line) => line.startsWith('A back-and-forth')));
});

test('a move read with low confidence is not stated, and nothing is invented without data', () => {
  const facts = gatherConnections([quote('b', 'DT Next', '2026-10-14T08:00:00Z')], storylines);
  assert.equal(facts.move, null);
  assert.deepEqual(connectionLines(facts, 'en'), ['1 trusted outlet reported this; DT Next was first (14 Oct).']);
  assert.deepEqual(connectionLines(null, 'en'), []);
  assert.equal(gatherConnections([], storylines), null);
});

test('connections read in Tamil', () => {
  const lines = connectionLines(gatherConnections([quote('a', 'The Hindu', '2026-10-17T08:00:00Z')], storylines), 'ta');
  assert.match(lines[0], /நம்பகமான ஊடகங்கள்/);
  assert.ok(lines.some((line) => line.includes('ஆளுங்கட்சியின் செல்வாக்கைக் குறைத்தல்')));
  assert.ok(lines.some((line) => line.startsWith('அடுத்து கவனிக்க: மறுதரப்பின் புதிய குற்றச்சாட்டு')));
});
