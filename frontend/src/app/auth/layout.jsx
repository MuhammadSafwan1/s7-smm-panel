'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/common/Loader';

export default function AuthLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'siteSettings', 'general'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setLoginEnabled(data.websiteLoginEnabled !== false);
      }
    } catch (error) {
      console.error('Error checking settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  // If login is disabled, redirect to home
  if (!loginEnabled) {
    router.push('/');
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">🔒</span>
          </div>
          <h1 className="text-4xl font-bold text-dark-900 dark:text-white mb-4">
            Login Disabled
          </h1>
          <p className="text-lg text-dark-600 dark:text-dark-300 mb-6">
            User login is temporarily disabled by the administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
