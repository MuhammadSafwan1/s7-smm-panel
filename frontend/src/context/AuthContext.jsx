'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChange } from '@/firebase/auth';
import { getUserProfile } from '@/firebase/firestore';
import { USER_ROLES } from '@/utils/constants';
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { auth } from '@/firebase/firebase.config';
import { getIdTokenResult } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false); // 🔒 NEW: Track if 2FA is verified in this session
  const tokenRefreshRef = useRef(null);
  const balanceListenerRef = useRef(null);

  // Set up real-time balance listener
  const setupBalanceListener = (uid) => {
    if (balanceListenerRef.current) {
      // Clean up existing listener
      balanceListenerRef.current();
    }

    const userDocRef = doc(db, 'users', uid);
    balanceListenerRef.current = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            walletBalance: data.walletBalance || 0,
            totalOrders: data.totalOrders || 0,
            totalSpent: data.totalSpent || 0,
          };
          // Update cache with new balance
          sessionStorage.setItem('userProfile_cache', JSON.stringify(updated));
          return updated;
        });
        console.log('💰 Balance updated in real-time:', data.walletBalance);
      }
    }, (error) => {
      console.error('Balance listener error:', error);
    });
  };

  // Refresh token every 30 minutes to prevent expiration
  // Also refresh when page becomes visible again (user returns to tab)
  useEffect(() => {
    if (!user) return;

    const refreshToken = async () => {
      try {
        if (auth.currentUser) {
          await getIdTokenResult(auth.currentUser, true); // Force refresh
          console.log('🔄 Token refreshed successfully');
        }
      } catch (e) {
        console.warn('⚠️ Token refresh failed:', e.message);
      }
    };

    // Refresh immediately on mount
    refreshToken();
    
    // Refresh every 30 minutes
    tokenRefreshRef.current = setInterval(refreshToken, 30 * 60 * 1000);
    
    // Refresh when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        console.log('👀 Page visible, refreshing token...');
        refreshToken();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Update lastSeen every 2 minutes & Check 3-day session timeout
  useEffect(() => {
    if (!user) return;

    // Check if user session expired (3 days = 72 hours)
    const checkSessionExpiry = async () => {
      const now = Date.now();
      const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;

      // Determine authoritative login time:
      // 1. localStorage session if present
      // 2. Firebase lastSignInTime (server-recorded, survives storage eviction on mobile)
      let loginTime = null;
      const userSession = localStorage.getItem('userSession');
      if (userSession) {
        try {
          const session = JSON.parse(userSession);
          const t = new Date(session.loginTime).getTime();
          if (!isNaN(t)) loginTime = t;
        } catch (e) {
          console.warn('Session check error:', e);
        }
      }
      if (loginTime === null && user?.metadata?.lastSignInTime) {
        const t = new Date(user.metadata.lastSignInTime).getTime();
        if (!isNaN(t)) loginTime = t;
      }

      if (loginTime === null) {
        // No record anywhere - treat first visit as login time (prefer lastSignInTime)
        loginTime = user?.metadata?.lastSignInTime
          ? new Date(user.metadata.lastSignInTime).getTime()
          : now;
      }

      if (now - loginTime >= SEVENTY_TWO_HOURS) { // 3 days = 72 hours
        console.log('🔒 User session expired (3 days). Logging out...');
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('userProfile_cache');
        await auth.signOut();
        window.location.href = '/auth/login?expired=true';
        return true; // Session expired
      }

      // Persist/refresh the session record so future checks have a baseline
      localStorage.setItem('userSession', JSON.stringify({
        userId: user.uid,
        email: user.email,
        loginTime: new Date(loginTime).toISOString(),
        expiryTime: new Date(loginTime + SEVENTY_TWO_HOURS).toISOString(), // 3 days
      }));
      return false;
    };

    const updateLastSeen = async () => {
      // Check session expiry first
      const expired = await checkSessionExpiry();
      if (expired) return;

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } catch (error) {
        // Non-critical, ignore
      }
    };

    // Check immediately on mount
    checkSessionExpiry();
    updateLastSeen();
    
    // Check every 10 minutes
    const interval = setInterval(updateLastSeen, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Check session cache first
        const cachedProfile = sessionStorage.getItem('userProfile_cache');
        if (cachedProfile) {
          try {
            const profile = JSON.parse(cachedProfile);
            console.log('📦 Using cached user profile from sessionStorage');
            setUserProfile(profile);
            setIsAdmin(profile.role === USER_ROLES.ADMIN);
            
            // 🔒 Check if 2FA verified in this session
            if (!profile.twoFactorEnabled) {
              // User doesn't have 2FA enabled - auto-verify
              setIs2FAVerified(true);
            } else {
              // User has 2FA - check session (sessionStorage only)
              const verified = sessionStorage.getItem('app_2fa_verified') === 'true';
              setIs2FAVerified(verified);
            }
            
            setLoading(false);
            
            // Set up real-time listener for balance updates (don't wait)
            setupBalanceListener(firebaseUser.uid);
            
            // Load full profile in background and update cache
            getUserProfile(firebaseUser.uid).then(({ data: freshProfile, error }) => {
              if (freshProfile && !error) {
                setUserProfile(freshProfile);
                setIsAdmin(freshProfile.role === USER_ROLES.ADMIN);
                sessionStorage.setItem('userProfile_cache', JSON.stringify(freshProfile));
                console.log('🔄 User profile updated in background');
                
                // 🔒 Re-check 2FA status with fresh profile
                if (!freshProfile.twoFactorEnabled) {
                  setIs2FAVerified(true);
                } else {
                  const verified = sessionStorage.getItem('app_2fa_verified') === 'true';
                  setIs2FAVerified(verified);
                }
              }
            });
            return;
          } catch (e) {
            console.warn('Failed to parse cached profile:', e);
          }
        }
        
        // No cache - Set user immediately with basic info
        const basicProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || null,
        };
        setUserProfile(basicProfile);
        setIs2FAVerified(true); // Assume no 2FA until profile loads
        setLoading(false);
        
        // Set up real-time listener for balance updates
        setupBalanceListener(firebaseUser.uid);
        
        // Load full profile and cache it
        try {
          const { data: profile, error } = await getUserProfile(firebaseUser.uid);
          if (profile && !error) {
            setUserProfile(profile);
            setIsAdmin(profile.role === USER_ROLES.ADMIN);
            // Cache user profile
            sessionStorage.setItem('userProfile_cache', JSON.stringify(profile));
            console.log('✅ User profile fetched and cached');
            
            // 🔒 Check 2FA status
            if (!profile.twoFactorEnabled) {
              setIs2FAVerified(true);
            } else {
              const verified = sessionStorage.getItem('app_2fa_verified') === 'true';
              setIs2FAVerified(verified);
            }
          }
        } catch (err) {
          console.warn('Background profile load failed:', err.message);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setIs2FAVerified(false); // 🔒 Clear 2FA verification on logout
        setLoading(false);
        // Clear cache on logout
        sessionStorage.removeItem('userProfile_cache');
        sessionStorage.removeItem('app_2fa_verified'); // 🔒 Clear 2FA session
        sessionStorage.removeItem('app_2fa_verified_at'); // 🔒 Clear 2FA session
        // Clean up balance listener
        if (balanceListenerRef.current) {
          balanceListenerRef.current();
          balanceListenerRef.current = null;
        }
      }
    });

    return () => {
      unsubscribe();
      // Clean up balance listener
      if (balanceListenerRef.current) {
        balanceListenerRef.current();
        balanceListenerRef.current = null;
      }
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const { data: profile } = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        setIsAdmin(profile.role === USER_ROLES.ADMIN);
        // Update cache
        sessionStorage.setItem('userProfile_cache', JSON.stringify(profile));
        console.log('✅ User profile refreshed and cache updated');
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAdmin,
        is2FAVerified,
        setIs2FAVerified,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
