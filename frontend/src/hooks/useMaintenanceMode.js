'use client';

import { useState, useEffect } from 'react';

export const useMaintenanceMode = (section) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      setIsMaintenanceMode(false);
      return;
    }

    checkMaintenanceMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const checkMaintenanceMode = async () => {
    try {
      if (typeof window === 'undefined') {
        setLoading(false);
        setIsMaintenanceMode(false);
        return;
      }

      // Fully dynamic Firebase imports to avoid circular dependency
      // and to be safe with Next.js static export.
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const { getAuth } = await import('firebase/auth');

      // Use the same fallback config as firebase.config.js so this works
      // even if env vars are not available at runtime in static export.
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCxvV0yCJIaY2T7lEIiHG4PXljvXdHqZMg",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "msfsmm.firebaseapp.com",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "msfsmm",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "msfsmm.firebasestorage.app",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "738046994932",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:738046994932:web:ccc4fec64179dc6d39b1a1",
      };

      const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const auth = getAuth(app);

      const settingsRef = doc(db, 'siteSettings', 'general');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();

        const sectionKey = `maintenance${section}`;
        const maintenanceEnabled = data[sectionKey] || false;

        let isWhitelisted = false;
        try {
          const currentUser = auth.currentUser;
          const whitelistedEmails = data.whitelistedEmails || [];
          isWhitelisted = currentUser && whitelistedEmails.includes(currentUser.email);
        } catch (e) {
          console.warn('Auth not available during maintenance check:', e);
        }

        setIsMaintenanceMode(maintenanceEnabled && !isWhitelisted);
      } else {
        setIsMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      setIsMaintenanceMode(false);
    } finally {
      setLoading(false);
    }
  };

  return { isMaintenanceMode, loading };
};