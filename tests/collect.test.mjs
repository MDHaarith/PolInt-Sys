import assert from 'node:assert/strict';
import test from 'node:test';
import { collect, newStories, toStory } from '../src/collect/collect.js';
import { embedPending, passagesFor, proofGate, savePassages, withLocalEvidence } from '../src/collect/evidence.js';
import { getAll, loadStories, saveRun } from '../src/collect/store.js';
import { decodeEvidencePack } from '../src/evidenceChat.js';

const today = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const record = (fields) => ({
  id: `phone_${fields.url.slice(-6)}`, title: 'EPS alleges mega corruption in power purchase', source: 'The Hindu',
  publishedAt: today, snippet: '', category: 'investigation', politicianId: 'edappadi_palaniswami',
  isRumor: false, verificationStatus: 'source_reported', language: 'en', ...fields,
});

test('a refresh runs every job, keeps going past failures, and records each source', async () => {
  const progress = [];
  const run = await collect({
    concurrency: 2,
    onProgress: (step) => progress.push(step.done),
    jobs: [
      { collector: 'rss', label: 'a', run: async () => [record({ url: 'https://x.in/aaaaaa' }), record({ url: 'https://x.in/bbbbbb', source: 'Some Blog' })] },
      { collector: 'rss', label: 'b', run: async () => [record({ url: 'https://x.in/aaaaaa' })] },
      { collector: 'rss', label: 'c', run: async () => [] },
      { collector: 'reddit', label: 'Tamil Nadu', run: async () => { throw new Error('HTTP 403'); } },
    ],
  });
  assert.deepEqual(progress.sort(), [1, 2, 3, 4]);
  assert.equal(run.stories.length, 2);
  assert.deepEqual(run.health.rss, { total: 3, failed: 0, empty: 1, items: 3, failures: [], status: 'ready' });
  assert.deepEqual(run.health.reddit.failures, ['Tamil Nadu: HTTP 403']);
  assert.equal(run.health.reddit.status, 'unavailable');
  const [hindu, blog] = run.stories;
  assert.equal(hindu.sourceTier, 'record');
  assert.equal(blog.sourceTier, 'aggregator');
  assert.ok(hindu.importance > blog.importance);
  assert.equal(hindu.rawId, hindu.id);
});

test('only stories the published feed lacks are added, by link or by headline and outlet', () => {
  const published = [{ url: 'https://x.in/aaaaaa', title: 'One', source: 'The Hindu' }, { url: 'https://news.google.com/x', title: 'EPS alleges mega corruption in power purchase', source: 'DT Next' }];
  const collected = [
    toStory(record({ url: 'https://x.in/aaaaaa' })),
    toStory(record({ url: 'https://x.in/cccccc', source: 'DT Next' })),
    toStory(record({ url: 'https://x.in/dddddd', title: 'Fresh story', publishedAt: '2099-01-01T00:00:00Z' })),
    toStory(record({ url: 'https://x.in/eeeeee', title: 'Older fresh story' })),
  ];
  assert.deepEqual(newStories(published, collected).map((story) => story.url), ['https://x.in/dddddd', 'https://x.in/eeeeee']);
});

test('the phone keeps a month of stories and their evidence, embedded on the phone', async () => {
  const fresh = toStory(record({ url: 'https://x.in/ffffff', snippet: 'Palaniswami said the deal cost the state crores of rupees every year.' }));
  const old = toStory(record({ url: 'https://x.in/gggggg', publishedAt: '2020-01-01T00:00:00Z' }));
  const social = toStory({ ...record({ url: 'https://bsky.app/p/hhhhhh' }), platform: 'bluesky', source: 'Bluesky @someone' });
  await saveRun({ stories: [fresh, old, social], health: {}, startedAt: today, finishedAt: today });
  assert.equal(await savePassages([fresh, old, social]), 3);
  assert.equal(await savePassages([fresh]), 0);
  assert.deepEqual(proofGate(social), [null, 'social']);
  assert.deepEqual((await loadStories()).map((story) => story.url).sort(), ['https://bsky.app/p/hhhhhh', 'https://x.in/ffffff']);
  assert.deepEqual((await getAll('passages')).map((passage) => passage.text), [fresh.title, 'Palaniswami said the deal cost the state crores of rupees every year.']);

  const embedded = await embedPending(async (text) => (text.startsWith('EPS') ? [1, 0, 0] : [0, 1, 0]), 3);
  assert.equal(embedded, 2);
  assert.equal(await embedPending(async () => [0, 0, 1], 3), 0);
  const local = await getAll('passages');

  const encode = (rows) => Buffer.from(Int8Array.from(rows.flat()).buffer).toString('base64');
  const published = decodeEvidencePack({
    kind: 'evidence', dimensions: 3, ids: ['p'], scales: [127], vectors: encode([[0, 0, 127]]),
    passages: [{ storyId: 's', text: 'Cauvery water released', language: 'en', source: 'DT Next', tier: 'record', kind: 'report', url: 'https://d', publishedAt: today, corroboratedBy: [] }],
  });
  const index = withLocalEvidence(published, local, 3);
  assert.equal(index.ids.length, 3);
  assert.ok(index.passages.every((passage) => !('vector' in passage)));
  const onlyLocal = withLocalEvidence(null, local, 3);
  assert.equal(onlyLocal.ids.length, 2);
  // A phone passage repeating a published one is not added twice.
  assert.equal(withLocalEvidence(published, [{ ...local[0], text: 'Cauvery water released!' }], 3).ids.length, 1);
  assert.equal(passagesFor([old]).length, 1);
});
