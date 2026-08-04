const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert('C:/Users/Muhammad Safwan/Documents/S7 SMM PANEL/backend/serviceAccountKey.json') });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('services').get();
  const fields = {};
  let grand = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    const total = JSON.stringify(data).length;
    grand += total;
    for (const k of Object.keys(data)) {
      const len = JSON.stringify(data[k]).length;
      fields[k] = fields[k] || { present: 0, totalBytes: 0, max: 0, nonEmptyStrings: 0 };
      fields[k].present++;
      fields[k].totalBytes += len;
      if (len > fields[k].max) fields[k].max = len;
      if (typeof data[k] === 'string' && data[k].trim() !== '') fields[k].nonEmptyStrings++;
    }
  });
  console.log(`TOTAL services: ${snap.docs.length} | total: ${(grand/1024).toFixed(1)}KB | avg/doc ${(grand/snap.docs.length/1024).toFixed(2)}KB`);
  console.log('\nFIELD REPORT (by total bytes):');
  console.log('='.repeat(70));
  Object.entries(fields).sort((a, b) => b[1].totalBytes - a[1].totalBytes).forEach(([k, v]) => {
    const missing = snap.docs.length - v.present;
    const emptyStr = typeof v.present && v.nonEmptyStrings !== undefined && v.nonEmptyStrings;
    console.log(`${k.padEnd(24)} | present ${String(v.present).padStart(4)}${missing ? ` (${missing} missing)` : ''} | total ${(v.totalBytes/1024).toFixed(1)}KB | avg ${(v.totalBytes/v.present).toFixed(0)}B | max ${v.max}B`);
  });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });