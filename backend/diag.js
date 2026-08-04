const admin = require('firebase-admin');
const axios = require('axios');
const FormData = require('form-data');
const sa = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const CLOUD_NAME = 'dv2r4poj6', PRESET = 'jnorvcsl', FOLDER = 'smm-panel/icons';

(async () => {
  const doc = (await db.collection('platforms').doc('5bWiegSIleKnDSEYVBMk').get()).data();
  // grab old base64 if still in history? data has only url now. Reconstruct from cloudinary? 
  // Instead just scan a category base64 - none left. So re-upload a sample from an existing category url? can't.
  // Test: upload a tiny sample PNG data-uri fresh
  const sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const form = new FormData();
  form.append('file', sample);
  form.append('upload_preset', PRESET);
  form.append('folder', FOLDER);
  const res = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, form, { headers: form.getHeaders() });
  console.log('PUBLIC:', res.data.public_id);
  console.log('FORMAT:', res.data.format);
  console.log('SECURE:', res.data.secure_url);
  process.exit(0);
})().catch(e => { console.error('ERR:', e.response?.data || e.message); process.exit(1); });
