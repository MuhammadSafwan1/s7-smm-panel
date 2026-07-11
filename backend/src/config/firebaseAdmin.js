const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';

try {
  const serviceAccount = require(path.resolve(__dirname, '../../', serviceAccountPath));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  console.log('Make sure serviceAccountKey.json exists in the backend root directory');
}

const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

module.exports = { admin, auth, db, storage };