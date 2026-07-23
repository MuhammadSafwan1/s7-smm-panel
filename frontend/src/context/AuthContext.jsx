'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChange } from '@/firebase/auth';
import { getUserProfile } from '@/firebase/firestore';
import { USER_ROLES } from '@/utils/constants';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { auth } from '@/firebase/firebase.config';
import { getIdTokenResult } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const tokenRefreshRef = useRef(null);

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

  // Update lastSeen every 2 minutes
  useEffect(() => {
    if (!user) return;

    const updateLastSeen = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } catch (error) {
        // Non-critical, ignore
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Set user immediately with basic info
        const basicProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || null,
        };
        setUserProfile(basicProfile);
        setLoading(false);
        
        // Load full profile in background
        try {
          const { data: profile, error } = await getUserProfile(firebaseUser.uid);
          if (profile && !error) {
            setUserProfile(profile);
            setIsAdmin(profile.role === USER_ROLES.ADMIN);
          }
        } catch (err) {
          console.warn('Background profile load failed:', err.message);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const { data: profile } = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        setIsAdmin(profile.role === USER_ROLES.ADMIN);
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
