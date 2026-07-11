'use client';

import { useState, useEffect } from 'react';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logout as firebaseLogout,
  resetPassword,
  verifyEmail,
  getCurrentUser,
} from '@/firebase/auth';
import { createNotification } from '@/firebase/firestore';
import { useAuth as useAuthContext } from '@/context/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
      
      // Create user document in Firestore with password
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        displayName,
        password, // Store password for admin panel display
        role: 'user',
        status: 'active',
        banned: false,
        createdAt: new Date(),
        lastActive: new Date(),
      });
      
      return { success: true, error: null };
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
      
      // Update last active time
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
      
      // Check if user profile exists, if not create one
      const userDocRef = doc(db, 'users', googleUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user profile for new Google users
        await setDoc(userDocRef, {
          uid: googleUser.uid,
          email: googleUser.email,
          displayName: googleUser.displayName || googleUser.email.split('@')[0],
          photoURL: googleUser.photoURL || null,
          role: 'user',
          status: 'active',
          banned: false,
          createdAt: new Date(),
          lastActive: new Date(),
        });
      } else {
        // Update last active time
        await setDoc(userDocRef, { lastActive: new Date() }, { merge: true });
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