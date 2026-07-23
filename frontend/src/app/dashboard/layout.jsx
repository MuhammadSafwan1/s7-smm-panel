'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import MaintenanceMode from '@/components/common/MaintenanceMode';
import MaintenanceMessage from '@/components/common/MaintenanceMessage';
import { PageLoader } from '@/components/common/Loader';
import BanCheck from '@/components/common/BanCheck';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [sectionMaintenance, setSectionMaintenance] = useState({
    Dashboard: false,
    Orders: false,
    Services: false,
    AddFunds: false,
    Settings: false,
    Transactions: false,
  });

  useEffect(() => {
    checkSettings();
  }, [user]);

  const getSectionFromPath = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/orders')) return 'Orders';
    if (pathname.startsWith('/dashboard/services')) return 'Services';
    if (pathname.startsWith('/dashboard/add-funds')) return 'AddFunds';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    if (pathname.startsWith('/dashboard/transactions')) return 'Transactions';
    return null;
  };

  const checkSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'siteSettings', 'general'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const maintenance = data.maintenanceMode || false;
        const whitelistedEmails = data.whitelistedEmails || [];
        
        setMaintenanceMode(maintenance);
        setLoginEnabled(data.websiteLoginEnabled !== false);
        setSectionMaintenance({
          Dashboard: !!(data.pageMaintenance?.dashboard || data.maintenanceDashboard),
          Orders: !!(data.pageMaintenance?.orders || data.maintenanceOrders),
          Services: !!(data.pageMaintenance?.services || data.maintenanceServices),
          AddFunds: !!(data.pageMaintenance?.addFunds || data.maintenanceAddFunds),
          Settings: !!(data.pageMaintenance?.settings),
          Transactions: !!(data.pageMaintenance?.transactions),
        });
        
        console.log('🔧 Per-Page Maintenance Check:', {
          pageMaintenance: data.pageMaintenance,
          sectionMaintenance: {
            Dashboard: !!(data.pageMaintenance?.dashboard || data.maintenanceDashboard),
            Orders: !!(data.pageMaintenance?.orders || data.maintenanceOrders),
            Services: !!(data.pageMaintenance?.services || data.maintenanceServices),
            AddFunds: !!(data.pageMaintenance?.addFunds || data.maintenanceAddFunds),
            Settings: !!(data.pageMaintenance?.settings),
            Transactions: !!(data.pageMaintenance?.transactions),
          },
          maintenanceMode: maintenance,
          isWhitelisted: isWhitelistedUser,
          currentSection: getSectionFromPath(),
        });
        
        // Maintenance bypass only for whitelisted emails from Firestore settings
        const currentEmail = (user?.email || '').trim().toLowerCase();
        const whitelistList = Array.isArray(whitelistedEmails)
          ? whitelistedEmails.map((e) => (e || '').trim().toLowerCase()).filter(Boolean)
          : [];
        const isWhitelistedUser = !!(
          currentEmail &&
          whitelistList.includes(currentEmail)
        );

        if (isWhitelistedUser) {
          setIsWhitelisted(true);
          console.log('✅ Whitelist match:', currentEmail);
        } else {
          setIsWhitelisted(false);
          if (maintenance && user) {
            console.log('❌ No whitelist match for:', currentEmail, 'list:', whitelistList);
          }
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

  // Global dashboard maintenance
  if (maintenanceMode && !isWhitelisted) {
    return <MaintenanceMode />;
  }

  // Section-specific maintenance
  const currentSection = getSectionFromPath();
  if (currentSection && !isWhitelisted && sectionMaintenance[currentSection]) {
    return <MaintenanceMessage section={currentSection === 'AddFunds' ? 'AddFunds' : currentSection} showBackButton={false} />;
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

  // Wrap with BanCheck to block banned users from accessing dashboard
  return (
    <BanCheck>
      {children}
    </BanCheck>
  );
}