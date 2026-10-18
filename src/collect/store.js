// What the phone collected, kept on the phone (IndexedDB): stories, their
// evidence passages and the passages' vectors, plus the last run's health.
// Older than KEEP_DAYS is dropped. Without IndexedDB (tests, private windows)
// the store lives in memory for the session.

export const KEEP_DAYS = 30;
const DB_NAME = "polint-collected";
const STORES = ["stories", "passages", "meta"];

let opening = null;
const memory = Object.fromEntries(STORES.map((name) => [name, new Map()]));

const open = () => {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  opening ??= new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => STORES.forEach((name) => request.result.objectStoreNames.contains(name) || request.result.createObjectStore(name, { keyPath: "id" }));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return opening;
};

const run = async (name, mode, action) => {
  const db = await open();
  if (!db) return action(null, memory[name]);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(name, mode);
    const result = action(transaction.objectStore(name), null);
    transaction.oncomplete = () => resolve(result?.result ?? result);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const putAll = (name, rows) => run(name, "readwrite", (store, map) => {
  for (const row of rows) store ? store.put(row) : map.set(row.id, row);
});

export const getAll = async (name) => run(name, "readonly", (store, map) => (store ? store.getAll() : [...map.values()]));

export const removeIds = (name, ids) => run(name, "readwrite", (store, map) => {
  for (const id of ids) store ? store.delete(id) : map.delete(id);
});

const cutoff = (days) => new Date(Date.now() - days * 86400000).toISOString();

// Recent stories, newest first; anything older than KEEP_DAYS is removed.
export const loadStories = async () => {
  const stories = await getAll("stories");
  const since = cutoff(KEEP_DAYS);
  const old = stories.filter((story) => (story.publishedAt || story.retrievedAt || "") < since);
  if (old.length) {
    await removeIds("stories", old.map((story) => story.id));
    const oldIds = new Set(old.map((story) => story.id));
    await removeIds("passages", (await getAll("passages")).filter((passage) => oldIds.has(passage.storyId)).map((passage) => passage.id));
  }
  return stories.filter((story) => !old.includes(story)).sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
};

export const saveRun = async ({ stories, health, startedAt, finishedAt }) => {
  await putAll("stories", stories);
  await putAll("meta", [{ id: "lastRun", health, startedAt, finishedAt, stories: stories.length }]);
};

export const lastRun = async () => (await getAll("meta")).find((row) => row.id === "lastRun") || null;
