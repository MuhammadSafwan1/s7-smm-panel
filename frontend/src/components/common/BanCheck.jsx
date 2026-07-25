'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { FiAlertTriangle, FiClock, FiShield } from 'react-icons/fi';

export default function BanCheck({ children }) {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [checking, setChecking] = useState(true);

  // Admin emails - Bypass ban check ONLY for admin panel routes
  const ADMIN_EMAILS = ['ms8347750@gmail.com', 'ms4746845@gmail.com'];
  
  // Check if current user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim());
  
  // Check if current route is admin panel
  const isAdminPanel = pathname?.startsWith('/s7bHG74TY09161NJASKLPW');

  // Pages that are accessible even when banned
  const allowedPaths = [
    '/',
    '/policies',
    '/help',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
  ];

  const isPathAllowed = (path) => {
    // Exact match or starts with allowed path
    return allowedPaths.some(allowed => {
      if (allowed === '/') {
        return path === '/'; // Only exact match for homepage
      }
      return path === allowed || path.startsWith(allowed + '/');
    });
  };

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    // Skip ban check ONLY if admin accessing admin panel
    if (isAdmin && isAdminPanel) {
      console.log('✅ Admin accessing admin panel - Skipping ban check:', user.email);
      setIsBanned(false);
      setBanInfo(null);
      setChecking(false);
      return;
    }

    checkBanStatus();
    
    // Also check every time pathname changes
  }, [user, userProfile, pathname, isAdmin, isAdminPanel]);

  useEffect(() => {
    if (!isBanned || !banInfo?.banExpiresAt) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const now = new Date();
      const expiresAt = banInfo.banExpiresAt.toDate();
      const diff = expiresAt - now;

      if (diff <= 0) {
        // Ban expired - auto unban
        handleAutoUnban();
      } else {
        setTimeRemaining(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isBanned, banInfo]);

  const checkBanStatus = async () => {
    try {
      if (!user?.uid || !userProfile) {
        setChecking(false);
        return;
      }

      const userData = userProfile;
      
      console.log('🔍 Ban Check:', {
        uid: user.uid,
        email: user.email,
        banned: userData.banned,
        disabled: userData.disabled,
        banReason: userData.banReason,
        banExpiresAt: userData.banExpiresAt?.toDate(),
      });

      // Check if user is banned
      if (userData.banned || userData.disabled) {
        // Check if temporary ban has expired
        if (userData.banExpiresAt) {
          const now = new Date();
          const expiresAt = userData.banExpiresAt.toDate();

          if (now >= expiresAt) {
            // Auto unban
            console.log('⏰ Ban expired - Auto unbanning user');
            await handleAutoUnban();
            return;
          }
        }

        setBanInfo({
          reason: userData.banReason || 'Your account has been banned',
          banExpiresAt: userData.banExpiresAt || null,
          bannedAt: userData.bannedAt || null,
          duration: userData.banDuration || 'permanent',
        });
        setIsBanned(true);
        
        console.log('🚫 User is BANNED - Checking redirect');

        // If on protected page, don't render anything - just show ban screen
        // BanCheck component itself will show the full screen ban page
      } else {
        console.log('✅ User is NOT banned');
        setIsBanned(false);
        setBanInfo(null);
      }
    } catch (error) {
      console.error('❌ Error checking ban status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleAutoUnban = async () => {
    try {
      if (!user?.uid) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        banned: false,
        disabled: false,
        banReason: null,
        banExpiresAt: null,
        bannedAt: null,
        banDuration: null,
        updatedAt: Timestamp.now(),
      });

      setIsBanned(false);
      setBanInfo(null);
      setTimeRemaining(null);
      
      // Refresh page to update access
      window.location.reload();
    } catch (error) {
      console.error('Error auto-unbanning user:', error);
    }
  };

  const formatTimeRemaining = (ms) => {
    if (!ms) return '';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If user is banned and trying to access protected page - FULL SCREEN BLOCK
  if (isBanned && !isPathAllowed(pathname)) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-red-600 via-red-700 to-red-900 flex items-center justify-center overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)',
          }}></div>
        </div>

        <div className="relative z-10 max-w-3xl w-full mx-4 text-center">
          {/* Large Warning Icon */}
          <div className="mb-8 animate-bounce">
            <div className="w-32 h-32 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FiShield className="text-8xl text-white drop-shadow-2xl" />
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl animate-pulse">
            🚫 ACCOUNT BANNED
          </h1>
          
          <div className="bg-black/30 backdrop-blur-md rounded-3xl p-8 mb-8 border-4 border-white/20">
            {/* Ban Reason */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <FiAlertTriangle className="text-4xl text-yellow-300" />
                <h2 className="text-2xl font-bold text-white">Ban Reason</h2>
              </div>
              <p className="text-xl text-white/90 font-semibold bg-white/10 rounded-xl py-4 px-6">
                {banInfo?.reason || 'Your account has been suspended by administrator'}
              </p>
            </div>

            {/* Temporary Ban Countdown */}
            {banInfo?.banExpiresAt && timeRemaining ? (
              <div className="bg-orange-500/20 border-4 border-orange-400/50 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <FiClock className="text-3xl text-orange-300" />
                  <h3 className="text-xl font-bold text-white">Temporary Ban</h3>
                </div>
                <p className="text-white/80 mb-4 text-lg">Account will be restored in:</p>
                <div className="bg-black/40 rounded-xl py-6 px-4">
                  <p className="text-5xl md:text-6xl font-black font-mono text-orange-300 tracking-wider drop-shadow-glow">
                    {formatTimeRemaining(timeRemaining)}
                  </p>
                  <p className="text-white/60 mt-3 text-sm uppercase tracking-widest">Time Remaining</p>
                </div>
              </div>
            ) : (
              /* Permanent Ban */
              <div className="bg-red-900/40 border-4 border-red-500/50 rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-white mb-3">⛔ Permanent Suspension</h3>
                <p className="text-white/80 text-lg">
                  This is a permanent ban. Contact support if you believe this is an error.
                </p>
              </div>
            )}
          </div>

          {/* Limited Access Info */}
          <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border-2 border-blue-300/30">
            <h3 className="text-xl font-bold text-white mb-3">📋 Limited Access Available</h3>
            <p className="text-white/90 text-lg">
              You can still access: <strong className="text-yellow-300">Homepage</strong>, <strong className="text-yellow-300">Policies</strong>, and <strong className="text-yellow-300">Help</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="px-8 py-4 bg-white text-red-700 rounded-xl font-bold text-lg hover:bg-yellow-300 hover:text-red-800 transition-all transform hover:scale-105 shadow-2xl"
            >
              🏠 Go to Homepage
            </button>
            <button
              onClick={() => router.push('/help')}
              className="px-8 py-4 bg-yellow-400 text-red-900 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-2xl"
            >
              ❓ Get Help
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is banned but on allowed page, DON'T show anything - allow access
  if (isBanned && isPathAllowed(pathname)) {
    return <>{children}</>;
  }

  return children;
}
