import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase configuration is missing. Check your .env.local file.');
}

// Initialize Firebase (simple approach - let Firebase handle connection automatically)
let app;
let db;
let analytics = null;
let performance = null;

if (!getApps().length) {
  console.log('🔥 Initializing Firebase...');
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Initialize Analytics (only in browser)
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log('📊 Google Analytics initialized');
      }
    }).catch((err) => {
      console.warn('Analytics not supported:', err);
    });
    
    // Initialize Performance Monitoring
    try {
      performance = getPerformance(app);
      console.log('⚡ Performance Monitoring initialized');
    } catch (err) {
      console.warn('Performance Monitoring not supported:', err);
    }
  }
  
  console.log('✅ Firebase & Firestore initialized successfully');
} else {
  console.log('♻️ Reusing existing Firebase instance');
  app = getApps()[0];
  db = getFirestore(app);
  
  // Get existing analytics if available
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
      performance = getPerformance(app);
    } catch (err) {
      console.warn('Analytics/Performance already initialized or not available');
    }
  }
}

const auth = getAuth(app);
export { auth, db, analytics, performance };
export default app;