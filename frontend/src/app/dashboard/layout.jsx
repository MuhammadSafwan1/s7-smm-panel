'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import MaintenanceMode from '@/components/common/MaintenanceMode';
import { PageLoader } from '@/components/common/Loader';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  useEffect(() => {
    checkSettings();
  }, [user]); // Re-check when user changes

  const checkSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'siteSettings', 'general'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const maintenance = data.maintenanceMode || false;
        const whitelistedEmails = data.whitelistedEmails || [];
        
        setMaintenanceMode(maintenance);
        setLoginEnabled(data.websiteLoginEnabled !== false);
        
        // Check if current user is whitelisted
        if (user && maintenance && whitelistedEmails.includes(user.email)) {
          setIsWhitelisted(true);
          console.log('✅ User is whitelisted - granting maintenance access');
        } else {
          setIsWhitelisted(false);
        }
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

  // If maintenance mode is ON and user is NOT whitelisted, show maintenance screen
  if (maintenanceMode && !isWhitelisted) {
    return <MaintenanceMode />;
  }

  // If login is disabled, show message
  if (!loginEnabled) {
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
          <a href="/" className="btn-primary inline-flex items-center gap-2">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
