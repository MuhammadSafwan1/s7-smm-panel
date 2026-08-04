'use client';

import { useState } from 'react';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logout as firebaseLogout,
  resetPassword,
  verifyEmail,
} from '@/firebase/auth';
import { useAuth as useAuthContext } from '@/context/AuthContext';
import { doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export function useAuth() {
  const { user, userProfile, loading, isAdmin, refreshProfile } = useAuthContext();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const register = async (email, password, displayName) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { user: newUser, error } = await registerWithEmail(email, password, displayName);
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }

      // 🚀 Send email verification
      try {
        await verifyEmail();
        console.log('✅ Verification email sent to:', email);
      } catch (emailError) {
        console.warn('⚠️ Failed to send verification email:', emailError);
        // Don't fail registration if email sending fails
      }

      const userDocData = {
        uid: newUser.uid,
        email: newUser.email,
        displayName,
        provider: 'password',
        status: 'active',
        banned: false,
        emailVerified: false, // Track verification status
        createdAt: new Date(),
        lastActive: new Date(),
      };

      await setDoc(doc(db, 'users', newUser.uid), userDocData);

      // 🔒 Password stored in ADMIN-ONLY collection (users can't read their own)
      try {
        await setDoc(doc(db, 'userSecrets', newUser.uid), {
          password,
          provider: 'password',
          createdAt: new Date(),
        });
      } catch (secretErr) {
        console.warn('⚠️ Failed to store user secret:', secretErr.message);
      }

      // 🔴 REALTIME COUNTER: increment total users (homepage stats update instantly)
      try {
        await setDoc(doc(db, 'stats', 'counters'), { totalUsers: increment(1) }, { merge: true });
      } catch (counterErr) {
        console.warn('⚠️ Failed to update users counter:', counterErr.message);
      }

      // ⚠️ FORCE LOGOUT - User must verify email before logging in
      await firebaseLogout();
      console.log('✅ User logged out after registration - must verify email first');

      return { success: true, error: null, emailSent: true };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { user: loggedInUser, error } = await loginWithEmail(email, password);
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }
      
      await setDoc(doc(db, 'users', loggedInUser.uid), { lastActive: new Date() }, { merge: true });
      
      return { success: true, error: null };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { user: googleUser, error } = await loginWithGoogle();
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }
      
      try {
        const userDocRef = doc(db, 'users', googleUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            uid: googleUser.uid,
            email: googleUser.email,
            displayName: googleUser.displayName || googleUser.email.split('@')[0],
            photoURL: googleUser.photoURL || null,
            provider: 'google',
            status: 'active',
            banned: false,
            createdAt: new Date(),
            lastActive: new Date(),
          });
        } else {
          await updateDoc(userDocRef, { lastActive: new Date() });
        }
      } catch (firestoreError) {
        console.warn('Firestore profile sync failed (non-critical):', firestoreError.message);
      }
      
      return { success: true, error: null };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      const { error } = await firebaseLogout();
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }
      return { success: true, error: null };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        setAuthError(error);
        return { success: false, error };
      }
      return { success: true, error: null };
    } catch (error) {
      setAuthError(error.message);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      const { error } = await verifyEmail();
      if (error) return { success: false, error };
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return {
    user,
    userProfile,
    loading,
    isAdmin,
    authLoading,
    authError,
    register,
    login,
    signInWithGoogle,
    logout,
    forgotPassword,
    sendVerificationEmail,
    refreshProfile,
  };
}
