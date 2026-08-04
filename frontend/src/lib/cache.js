const store = new Map();
const inflight = new Map();

// Deploy version: changes automatically on EVERY build/deploy.
// After a new deploy, this key changes → old cache ignored → fresh download.
const BUILD_ID = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BUILD_TIME)
  ? process.env.NEXT_PUBLIC_BUILD_TIME
  : 'dev';
const CACHE_VERSION = 'v8';
const CACHE_STORAGE_KEY = `app_cache_${CACHE_VERSION}_${BUILD_ID}`;

// sessionStorage quota is ~5MB per tab - stay well under it
const MAX_CACHE_BYTES = 4 * 1024 * 1024;

// Prune old deploy versions + legacy keys, load current version
// sessionStorage = per-tab: reload (F5) keeps cache, NEW TAB = fresh download
function initCache() {
  if (typeof window === 'undefined') return false;

  try {
    // Remove cache from older deploys (only keep THIS deploy's cache)
    const allKeys = Object.keys(sessionStorage);
    let pruned = 0;
    allKeys.forEach(key => {
      if (key.startsWith(`app_cache_${CACHE_VERSION}_`) && key !== CACHE_STORAGE_KEY) {
        sessionStorage.removeItem(key);
        pruned++;
      }
    });

    // Legacy cache (v7) - remove once
    if (sessionStorage.getItem('app_cache_v7')) sessionStorage.removeItem('app_cache_v7');

    // Legacy localStorage cache from older deploys - remove once
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('app_cache_')) localStorage.removeItem(key);
      });
    } catch (e) { /* ignore */ }

    const cached = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      console.log('📦 Cache loaded from sessionStorage:', Object.keys(data).length, 'items', pruned ? `(${pruned} old deploy caches pruned)` : '');
      Object.entries(data).forEach(([key, value]) => {
        store.set(key, value);
      });
      return true;
    } else {
      console.log('📦 No cache in sessionStorage - starting fresh');
      return false;
    }
  } catch (e) {
    console.error('❌ Cache init error:', e);
    return false;
  }
}

// Save cache to sessionStorage (survives reload, cleared on new tab)
function saveCache() {
  if (typeof window === 'undefined') return;

  try {
    const data = {};
    store.forEach((value, key) => {
      data[key] = value;
    });
    const json = JSON.stringify(data);

    // Safety guard: never exceed sessionStorage quota
    if (json.length > MAX_CACHE_BYTES) {
      console.warn(`⚠️ Cache too large (${(json.length / 1024 / 1024).toFixed(1)}MB) - keeping in memory only`);
      return;
    }

    sessionStorage.setItem(CACHE_STORAGE_KEY, json);
    console.log('💾 Cache saved to sessionStorage:', Object.keys(data).length, 'items');
  } catch (e) {
    console.error('❌ Cache save error:', e);
  }
}

if (typeof window !== 'undefined') {
  initCache();
}

export async function cachedQuery(key, fetcher, ttl = Infinity) {
  // Check if we have cached data
  if (store.has(key)) {
    const entry = store.get(key);
    const age = Date.now() - entry.ts;

    // If ttl is Infinity or data is still fresh, return cached
    if (ttl === Infinity || age < ttl) {
      console.log('✅ Cache HIT:', key, `(age: ${Math.round(age/1000)}s, ttl: ${ttl === Infinity ? '∞' : Math.round(ttl/1000) + 's'})`);

      // Validate cached data format
      if (key.startsWith('services:') && !Array.isArray(entry.data)) {
        console.warn('⚠️ Invalid cached data format for', key, '- expected array, got:', typeof entry.data);
        store.delete(key);
        saveCache();
      } else if (key.startsWith('collection:') && !entry.data?.docs) {
        // Collection queries should return snapshot with .docs
        console.warn('⚠️ Invalid cached collection format for', key, '- missing .docs property');
        store.delete(key);
        saveCache();
      } else {
        return entry.data;
      }
    } else {
      console.log('⏰ Cache EXPIRED:', key, `(age: ${Math.round(age/1000)}s, ttl: ${Math.round(ttl/1000)}s)`);
      // Remove expired entry
      store.delete(key);
    }
  }

  // Check if fetch is already in progress
  if (inflight.has(key)) {
    console.log('⏳ Fetch ALREADY IN PROGRESS:', key, '- waiting for existing request');
    return inflight.get(key);
  }

  console.log('🔍 Cache MISS:', key, '- fetching from Firestore');

  const promise = fetcher().then(data => {
    // Validate data before caching
    if (key.startsWith('services:') && !Array.isArray(data)) {
      console.error('❌ Fetcher returned invalid data format for', key, '- expected array, got:', typeof data);
      throw new Error('Services data is not in correct format');
    }

    if (key.startsWith('collection:') && !data?.docs) {
      console.error('❌ Fetcher returned invalid collection format for', key, '- missing .docs property');
      throw new Error('Collection data is not in correct format');
    }

    store.set(key, { data, ts: Date.now() });
    saveCache(); // Persist to localStorage
    inflight.delete(key);
    console.log('✅ Fetched and cached:', key, '- data type:', Array.isArray(data) ? `array[${data.length}]` : data?.docs ? `snapshot[${data.docs.length}]` : typeof data);
    return data;
  }).catch(err => {
    inflight.delete(key);
    console.error('❌ Fetch error for', key, ':', err);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(pattern) {
  if (!pattern) {
    console.log('🗑️ Clearing entire cache');
    store.clear();
    try { sessionStorage.removeItem(CACHE_STORAGE_KEY); } catch (e) { /* ignore */ }
    return;
  }

  let deletedCount = 0;
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) {
      store.delete(key);
      deletedCount++;
    }
  }
  console.log('🗑️ Invalidated cache:', pattern, `(${deletedCount} items)`);
  saveCache();
}

export function getCacheSize() {
  return store.size;
}

// Real-time: patch ONE service across every cached list (no re-fetch, ~0 reads)
export function patchServiceInCache(payload) {
  if (!payload || !payload.id) return 0;
  let patched = 0;
  for (const [key, entry] of store.entries()) {
    if (!Array.isArray(entry.data)) continue;
    const idx = entry.data.findIndex(s => s && (s.id === payload.id || s.serviceId === payload.id));
    if (idx === -1) continue;
    if (payload.deleted) {
      entry.data.splice(idx, 1);
    } else {
      entry.data[idx] = { ...entry.data[idx], ...payload };
    }
    entry.ts = Date.now(); // keep "recent" so TTL logic won't instantly expire
    patched++;
  }
  if (patched > 0) saveCache();
  return patched;
}

export function getCacheStats() {
  const stats = {};
  store.forEach((value, key) => {
    stats[key] = {
      age: Math.round((Date.now() - value.ts) / 1000) + 's',
      size: JSON.stringify(value.data).length
    };
  });
  return stats;
}
