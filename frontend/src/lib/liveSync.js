import { doc, collection, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { patchServiceInCache, invalidateCache } from '@/lib/cache';

// Real-time events: clients get 'msf:services-updated' carrying the CHANGED SERVICE only (0 extra reads)
export const SERVICES_UPDATED_EVENT = 'msf:services-updated';

// Write the changed service into the live mirror → clients patch ONLY that service in cache
export async function updateServiceLive(payload) {
  if (!payload || !payload.id) return false;
  try {
    await setDoc(doc(db, 'live', 'services', payload.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn('⚠️ updateServiceLive failed:', e.message);
    return false;
  }
}

// Mark a service as deleted so clients drop it from their cached lists
export async function removeServiceLive(id) {
  if (!id) return false;
  try {
    await setDoc(doc(db, 'live', 'services', id), {
      id,
      deleted: true,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn('⚠️ removeServiceLive failed:', e.message);
    return false;
  }
}

// Full refresh (manual button only) — just busts services cache, NOT the whole catalog
export async function bumpFullRefresh() {
  try {
    const metaSnap = await getDoc(doc(db, 'live', 'meta'));
    const next = ((metaSnap.exists() && metaSnap.data().version) || 0) + 1;
    await setDoc(doc(db, 'live', 'meta'), {
      version: next,
      fullRefresh: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('⚠️ bumpFullRefresh failed:', e.message);
    return false;
  }
}

// Client-side: patch the service in all cached arrays + notify open pages
export function pushLocalServicePatch(payload) {
  if (!payload || !payload.id) return;
  patchServiceInCache(payload);
  try {
    window.dispatchEvent(new CustomEvent(SERVICES_UPDATED_EVENT, { detail: payload }));
  } catch (e) { /* ignore */ }
}

// Used ONLY by the manual "Push Refresh" meta channel
export function notifyServicesUpdatedFull() {
  invalidateCache('services:');
  invalidateCache('collection:services');
  try { window.dispatchEvent(new Event(SERVICES_UPDATED_EVENT)); } catch (e) { /* ignore */ }
}