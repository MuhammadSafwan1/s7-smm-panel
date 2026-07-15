'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange } from '@/firebase/auth';
import { getUserProfile, initializeUserProfile } from '@/firebase/firestore';
import { USER_ROLES } from '@/utils/constants';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
        console.error('Failed to update lastSeen:', error);
      }
    };

    // Initial update
    updateLastSeen();

    // Update every 2 minutes
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Set user immediately with basic info (don't wait for Firestore)
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: USER_ROLES.USER,
          balance: 0,
        });
        setLoading(false);
        
        // Try to load full profile in background (non-blocking)
        initializeUserProfile(firebaseUser.uid, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        }).then(({ data: profile, error }) => {
          if (profile && !error) {
            setUserProfile(profile);
            setIsAdmin(profile.role === USER_ROLES.ADMIN);
          }
        }).catch(err => {
          console.error('Background profile load error:', err);
        });
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