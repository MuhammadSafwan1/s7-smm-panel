const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

try {
  if (!admin.apps.length) {
    // Try environment variable first (for production/Wispbyte)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      console.log('Firebase Admin initialized via environment variables');
    } else {
      // Try serviceAccountKey.json as fallback
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
      try {
        const serviceAccount = require(path.resolve(__dirname, '../../', serviceAccountPath));
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('Firebase Admin initialized via serviceAccountKey.json');
      } catch (fileErr) {
        // No credentials available — initialize with just project ID (limited functionality)
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'msfsmm',
        });
        console.warn('Firebase Admin initialized without credentials (limited mode). Proxy routes will still work.');
      }
    }
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
}

let auth, db, storage;
try {
  auth = admin.auth();
  db = admin.firestore();
  storage = admin.storage();
} catch (e) {
  console.warn('Firebase services not fully available:', e.message);
}

module.exports = { admin, auth, db, storage };