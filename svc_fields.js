const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert('C:/Users/Muhammad Safwan/Documents/S7 SMM PANEL/backend/serviceAccountKey.json') });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('services').get();
  const fields = {};
  let grand = 0, big5 = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    const total = JSON.stringify(data).length;
    grand += total;
    for (const k of Object.keys(data)) {
      const len = JSON.stringify(data[k]).length;
      fields[k] = fields[k] || { present: 0, bytes: 0, type: typeof data[k] };
      fields[k].present++;
      fields[k].totalBytes += len;
    }
  });
  console.log(`TOTAL services: ${snap.docs.length} | total bytes: ${(grand/1024).toFixed(1)}KB | per-doc avg: ${(grand/snap.docs.length/1024).toFixed(2)}KB`);
  console.log('\nFIELD REPORT (sorted by total bytes):');
  console.log('============');
  Object.entries(fields).sort((a, b) => b[1].totalBytes - a[1].totalBytes).forEach(([k, v]) => {
    const missing = snap.docs.length - v.present;
    const flag = v.totalBytes > 0.1 * 1024 * 1024 ? '  ⚠️ BIG' : '';
    console.log(`  ${k.padEnd(26)} | present: ${String(v.present).padStart(4)}${missing ? ` (missing ${missing})` : ''} | total: ${(v.totalBytes/1024).toFixed(1)}KB | avg: ${(v.totalBytes/v.present).toFixed(0)}B | max: ${v.max || 0}B${flag}`);
  });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });