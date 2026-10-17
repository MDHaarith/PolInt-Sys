import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const source = await fs.readFile(new URL('../src/dataSource.js', import.meta.url), 'utf8');
const loadModule = (env) => import(`data:text/javascript;base64,${Buffer.from(
  source.replaceAll('import.meta.env', JSON.stringify(env)),
).toString('base64')}`);

test('mobile refreshes use the public branch and keep the cache buster', async (t) => {
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ current: true }) };
  });
  const { loadData, recentIntelFile, fullIntelFile } = await loadModule({ MODE: 'mobile' });
  assert.equal(recentIntelFile, '/scrapedIntel.mobile.json');
  assert.equal(fullIntelFile, null);
  await loadData(recentIntelFile);
  await loadData('/timeFabric.json');
  assert.match(urls[0], /^https:\/\/raw\.githubusercontent\.com\/MDHaarith\/PolInt-Sys\/live-data\/scrapedIntel\.mobile\.json\?t=\d+$/);
  assert.match(urls[1], /\/live-data\/timeFabric\.json\?t=\d+$/);
});

test('mobile keeps the LAN override and falls back when remote JSON fails', async (t) => {
  const urls = [];
  t.mock.method(console, 'warn', () => {});
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    urls.push(url);
    if (url.startsWith('http://192.168.1.2')) {
      assert.ok(options.signal instanceof AbortSignal);
      return { ok: false, status: 503 };
    }
    return { ok: true, json: async () => ({ bundled: true }) };
  });
  const { loadData } = await loadModule({ MODE: 'mobile', VITE_DATA_BASE_URL: 'http://192.168.1.2:5173///' });
  assert.deepEqual(await loadData('/timeFabric.json'), { bundled: true });
  assert.match(urls[0], /^http:\/\/192\.168\.1\.2:5173\/timeFabric\.json\?t=/);
  assert.match(urls[1], /^\/timeFabric\.json\?t=/);
});

test('web builds load the recent snapshot then the full archive locally', async (t) => {
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ news: [] }) };
  });
  const { loadData, recentIntelFile, fullIntelFile } = await loadModule({ MODE: 'production' });
  assert.equal(recentIntelFile, '/scrapedIntel.mobile.json');
  assert.equal(fullIntelFile, '/scrapedIntel.json');
  await loadData(fullIntelFile);
  assert.match(urls[0], /^\/scrapedIntel\.json\?t=/);
});

test('legacy warehouse-shaped stories are lifted into the flat shape', async () => {
  const { normalizeStory } = await loadModule({ MODE: 'production' });
  const story = normalizeStory({
    canonicalUrl: 'https://example.test/a', title: 'T', publishedAtRaw: '2026-10-16T09:00:00Z',
    rawMetadata: { id: 'scraped_1', url: 'https://example.test/a', snippet: 'News coverage regarding X from X.', isRumor: false },
  });
  assert.equal(story.id, 'scraped_1');
  assert.equal(story.url, 'https://example.test/a');
  assert.equal(story.publishedAt, '2026-10-16T09:00:00Z');
  assert.equal(story.snippet, '');
  assert.equal(story.rawMetadata, undefined);
  const flat = { id: 'x', title: 'Flat' };
  assert.equal(normalizeStory(flat), flat);
});
