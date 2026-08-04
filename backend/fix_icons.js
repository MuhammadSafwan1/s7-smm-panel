const admin = require('firebase-admin');
const axios = require('axios');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const EXTS = ['png', 'gif', 'jpg', 'jpeg', 'webp', 'svg'];

async function validUrl(url) {
  try {
    const res = await axios.head(url, { timeout: 15000, validateStatus: (s) => s >= 200 && s < 400 });
    return res.status >= 200 && res.status < 300;
  } catch (e) {
    return false;
  }
}

async function bestUrl(icon) {
  // 1) If current URL works, keep it
  if (await validUrl(icon)) return icon;

  const base = icon.replace(/\.[a-z0-9]{2,5}$/i, '');
  // 2) Probe known format extensions
  for (const e of EXTS) {
    const candidate = `${base}.${e}`;
    if (candidate !== icon && (await validUrl(candidate))) return candidate;
  }
  return null; // nothing works
}

async function fixCollection(collectionName, field) {
  const snap = await db.collection(collectionName).get();
  let fixed = 0, ok = 0, broken = 0;

  for (const doc of snap.docs) {
    const val = doc.data()[field];
    if (!val || !String(val).includes('cloudinary')) continue;

    const url = await bestUrl(String(val));
    if (!url) { broken++; console.error(`❌ ${collectionName}/${doc.id} unresolved`); continue; }

    if (url !== val) {
      await db.collection(collectionName).doc(doc.id).update({ [field]: url });
      fixed++;
      console.log(`✅ ${collectionName}/${doc.id}: ${url.slice(-45)}`);
    } else {
      ok++;
    }
  }

  console.log(`>>> ${collectionName}.${field}: fixed=${fixed} ok=${ok} broken=${broken}`);
}

(async () => {
  await fixCollection('platforms', 'icon');
  await fixCollection('categories', 'icon');
  process.exit(0);
})().catch(err => { console.error('Fatal:', err.message); process.exit(1); });