import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  classifyCategory, isPolitical, isRelevant, mentionedPoliticians, mentionsTamilNadu, reportsHearsay, sourceTier,
} from '../src/collect/rules.js';

// How the server's Python rules read real headlines (scripts/build_collect_config.py).
const read = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const parity = read('collect_parity.json');
const { texts } = read('collect_parity_texts.json');

test('the phone reads real headlines exactly as the server does', () => {
  const differences = [];
  parity.texts.forEach((expected, index) => {
    const text = texts[index];
    const actual = {
      political: isPolitical(text),
      tamilNadu: mentionsTamilNadu(text),
      category: classifyCategory(text),
      hearsay: reportsHearsay(text),
      politicians: mentionedPoliticians(text),
      relevantRegional: isRelevant(text, { requireTamilNadu: true }),
    };
    for (const key of Object.keys(expected)) {
      if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) differences.push({ key, text: text.slice(0, 90), python: expected[key], javascript: actual[key] });
    }
  });
  assert.ok(parity.texts.length >= 1000);
  assert.deepEqual(differences.slice(0, 10), []);
});

test('the phone grades every outlet as the server does', () => {
  const differences = parity.sources.filter(({ source, tier }) => sourceTier(source) !== tier);
  assert.ok(parity.sources.length > 100);
  assert.deepEqual(differences, []);
});

test('the phone parses saved Google News and publisher feeds into the records the server makes', async () => {
  const { rssRecords } = await import('../src/collect/fetch.js');
  const { feeds, expected } = read('collect_feeds.json');
  for (const feed of feeds) {
    const records = rssRecords(feed.xml, { query: feed.query, feedUrl: feed.feedUrl, sourceName: feed.sourceName });
    const fields = expected[feed.name].map((record) => Object.keys(record));
    const actual = records.map((record, index) => Object.fromEntries(fields[index]?.map((key) => [key, record[key] ?? null]) || []));
    assert.equal(records.length, expected[feed.name].length, feed.name);
    assert.deepEqual(actual, expected[feed.name], feed.name);
  }
});
