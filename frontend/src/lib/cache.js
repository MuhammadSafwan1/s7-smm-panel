const store = new Map();
const inflight = new Map();

export async function cachedQuery(key, fetcher, ttl = 300000) {
  if (store.has(key)) {
    const entry = store.get(key);
    if (Date.now() - entry.ts < ttl) {
      return entry.data;
    }
  }

  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = fetcher().then(data => {
    store.set(key, { data, ts: Date.now() });
    inflight.delete(key);
    return data;
  }).catch(err => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(pattern) {
  if (!pattern) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) store.delete(key);
  }
}
