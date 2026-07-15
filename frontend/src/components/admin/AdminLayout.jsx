'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/common/Loader';
import { SeasonalBackground } from '@/components/common/SeasonalBackground';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiGrid, FiServer, FiPackage, FiUsers, FiLayers, FiShoppingBag, FiArrowLeft, FiHome, FiLogOut, FiSun, FiMoon, FiMessageSquare, FiDollarSign, FiSettings, FiVideo, FiHelpCircle, FiActivity, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CurrencySwitcher from '@/components/common/CurrencySwitcher';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { auth } from '@/firebase/firebase.config';

const adminNavItems = {
  main: [
    { href: '/s7bHG74TY09161NJASKLPW',            label: 'Dashboard',  icon: FiGrid },
    { href: '/s7bHG74TY09161NJASKLPW/access-logs', label: 'Access Logs', icon: FiActivity },
    { href: '/s7bHG74TY09161NJASKLPW/settings',   label: 'Settings',   icon: FiSettings },
    { href: '/s7bHG74TY09161NJASKLPW/service-monitor', label: 'Monitor', icon: FiActivity },
    { href: '/s7bHG74TY09161NJASKLPW/announcements', label: 'Announcements', icon: FiVideo },
    { href: '/s7bHG74TY09161NJASKLPW/help-videos', label: 'Help Videos', icon: FiHelpCircle },
  ],
  management: [
    { href: '/s7bHG74TY09161NJASKLPW/providers',  label: 'Providers',  icon: FiServer },
    { href: '/s7bHG74TY09161NJASKLPW/platforms',  label: 'Platforms',  icon: FiPackage },
    { href: '/s7bHG74TY09161NJASKLPW/categories', label: 'Categories', icon: FiLayers },
    { href: '/s7bHG74TY09161NJASKLPW/services',   label: 'Services',   icon: FiShoppingBag },
    { href: '/s7bHG74TY09161NJASKLPW/orders',     label: 'Orders',     icon: FiShoppingBag },
    { href: '/s7bHG74TY09161NJASKLPW/users',      label: 'Users',      icon: FiUsers },
    { href: '/s7bHG74TY09161NJASKLPW/policies',   label: 'Policies',   icon: FiMessageSquare },
    { href: '/s7bHG74TY09161NJASKLPW/support',    label: 'Support',    icon: FiMessageSquare },
    { href: '/s7bHG74TY09161NJASKLPW/payment-methods', label: 'Payment Methods', icon: FiDollarSign },
    { href: '/s7bHG74TY09161NJASKLPW/payment-verification', label: 'Verify Payments', icon: FiDollarSign },
  ],
};

export default function AdminLayout({ children }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  // Session timeout (30 minutes inactivity)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        // Check if on login page
        if (pathname === '/s7bHG74TY09161NJASKLPW/s7-secure-access-2024') {
          setChecking(false);
          return;
        }

        // Wait for auth to finish loading
        if (authLoading) {
          return;
        }

        // Check if user is authenticated
        if (!user) {
          console.log('No user authenticated, redirecting to login');
          router.push('/s7bHG74TY09161NJASKLPW/s7-secure-access-2024');
          setChecking(false);
          return;
        }

        // Get user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log('User document not found');
          await auth.signOut();
          router.push('/s7bHG74TY09161NJASKLPW/s7-secure-access-2024');
          return;
        }

        const userData = userDoc.data();

        // CHECK 1: Verify admin role, owner email, or Firebase project roles
        const ownerEmail = 'ms8347750@gmail.com'; // Owner email from Firebase
        const editorEmail = 'ms4746845@gmail.com'; // Editor email from Firebase
        const isOwner = userData.email === ownerEmail;
        const isEditor = userData.email === editorEmail;
        
        if (userData.role !== 'admin' && !isOwner && !isEditor) {
          console.log('User is not admin/owner/editor, access denied');
          toast.error('Unauthorized: Admin access required');
          await auth.signOut();
          router.push('/dashboard');
          return;
        }

        // CHECK 2: For owner and editor, 2FA is optional; for regular admins, it's mandatory  
        if (!isOwner && !isEditor && (!userData.twoFactorEnabled || !userData.twoFactorSecret)) {
          console.log('Regular admin 2FA not enabled');
          toast.error('Admin accounts must have 2FA enabled');
          await auth.signOut();
          router.push('/dashboard/settings');
          return;
        }

        // CHECK 3: Verify admin session exists
        const adminSession = localStorage.getItem('adminSession');
        if (!adminSession) {
          console.log('No admin session found');
          await auth.signOut();
          router.push('/s7bHG74TY09161NJASKLPW/s7-secure-access-2024');
          return;
        }

        const session = JSON.parse(adminSession);
        if (session.userId !== user.uid) {
          console.log('Session user ID mismatch');
          localStorage.removeItem('adminSession');
          await auth.signOut();
          router.push('/s7bHG74TY09161NJASKLPW/s7-secure-access-2024');
          return;
        }

        // All checks passed - grant access
        console.log('Admin access verified');
        const userRole = isOwner ? 'owner' : isEditor ? 'editor' : 'admin';
        setAdminData({...userData, isOwner, isEditor, userRole});
        setIsAdminVerified(true);
        
        // Update last activity
        await updateDoc(userDocRef, {
          lastAdminActivity: new Date(),
          lastSeen: new Date()
        });

        // Setup session timeout
        resetSessionTimeout();

      } catch (error) {
        console.error('Admin verification error:', error);
        toast.error('Authentication error');
        await auth.signOut();
        router.push('/s7bHG74TY09161NJASKLPW/s7-secure-access-2024');
      } finally {
        setChecking(false);
      }
    };

    verifyAdminAccess();

    // Theme setup
    const stored = localStorage.getItem('theme');
    const dark = stored !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);

    // Load Cloudinary widget script
    if (!document.getElementById('cloudinary-upload-widget')) {
      const script = document.createElement('script');
      script.id = 'cloudinary-upload-widget';
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [user, pathname, router, authLoading]);

  // Reset session timeout on user activity
  const resetSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    const timeout = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      handleAdminLogout();
    }, SESSION_TIMEOUT);

    setSessionTimeout(timeout);
  };

  // Reset timeout on any user interaction
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const resetTimer = () => {
      if (isAdminVerified) {
        resetSessionTimeout();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, [isAdminVerified]);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const handleAdminLogout = async () => {
    try {
      // Clear admin session
      localStorage.removeItem('adminSession');
      
      // Sign out from Firebase
      await auth.signOut();
      
      toast.success('Admin logged out successfully');
      router.push('/s7bHG74TY09161NJASKLPW/s7-secure-access-2024');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  if (authLoading || checking) return <PageLoader />;

  // Don't show layout on login page
  if (pathname === '/s7bHG74TY09161NJASKLPW/s7-secure-access-2024') {
    return children;
  }

  // Show loader if admin not verified
  if (!isAdminVerified) {
    return <PageLoader />;
  }

  return (
    <>
      <SeasonalBackground />
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 w-full py-4 md:py-6 lg:py-8 px-4 sm:px-6 relative z-10">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-dark-500 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 mb-3 transition-colors">
            <FiArrowLeft className="text-xs" /> Back to Site
          </Link>
          <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2 flex items-center gap-2">
            Admin Panel
            {adminData?.isOwner ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium">
                <FiShield className="text-sm" />
                Owner
              </span>
            ) : adminData?.isEditor ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 text-white text-xs font-medium">
                <FiShield className="text-sm" />
                Editor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">
                <FiShield className="text-sm" />
                Admin
              </span>
            )}
          </h1>
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Logged in as: <span className="font-semibold">{adminData?.displayName || adminData?.email || 'Administrator'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CurrencySwitcher />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <FiSun className="text-lg text-yellow-400" /> : <FiMoon className="text-lg text-blue-500" />}
          </button>
          <Link href="/" className="btn-outline btn-sm flex items-center gap-2">
            <FiHome /> View Site
          </Link>
          <button 
            onClick={handleAdminLogout}
            className="btn-secondary btn-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Navigation tabs - 2 rows modern layout */}
      <div className="space-y-3 mb-8">
        {/* Main actions row */}
        <div className="flex items-center gap-2 pb-2 border-b border-dark-200/50 dark:border-dark-700/50">
          <span className="text-xs font-bold text-dark-400 dark:text-dark-500 uppercase tracking-wider px-2">
            Quick Actions
          </span>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
          {adminNavItems.main.map((item) => {
            const isActive = item.href === '/s7bHG74TY09161NJASKLPW' 
              ? pathname === '/s7bHG74TY09161NJASKLPW'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                <item.icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Management row */}
        <div className="flex items-center gap-2 pb-2 border-b border-dark-200/50 dark:border-dark-700/50 mt-6">
          <span className="text-xs font-bold text-dark-400 dark:text-dark-500 uppercase tracking-wider px-2">
            Management
          </span>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
          {adminNavItems.management.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                <item.icon className="text-base" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
    </>
  );
}
