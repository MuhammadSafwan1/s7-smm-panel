'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/firebase/firebase.config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import toast from 'react-hot-toast';
import { FiLock, FiShield } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAdminAuth = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const ownerEmail = 'ms8347750@gmail.com';
        const editorEmail = 'ms4746845@gmail.com';
        if (userData?.role === 'admin' || userData?.email === ownerEmail || userData?.email === editorEmail) {
          router.push('/s7bHG74TY09161NJASKLPW');
        }
      }
    };
    checkAdminAuth();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const ownerEmail = 'ms8347750@gmail.com';
      const editorEmail = 'ms4746845@gmail.com';
      const isOwner = user.email === ownerEmail;
      const isEditor = user.email === editorEmail;
      
      if (!isOwner && !isEditor) {
        await auth.signOut();
        toast.error('Only project owner or editor can access admin panel');
        setLoading(false);
        return;
      }
      
      const adminSession = {
        userId: user.uid,
        email: user.email,
        role: isOwner ? 'owner' : 'editor',
        loginTime: new Date().toISOString(),
        method: 'google'
      };
      localStorage.setItem('adminSession', JSON.stringify(adminSession));
      
      toast.success(`Welcome back, ${isOwner ? 'Owner' : 'Editor'}!`);
      router.push('/s7bHG74TY09161NJASKLPW');
      
    } catch (error) {
      setLoading(false);
      console.error('Google sign-in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups for this site');
      } else {
        toast.error('Google sign-in failed. Please try again');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative bg-dark-50 dark:bg-dark-950">
      <div className="relative w-full max-w-md">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 mb-4">
              <FiLock className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Admin Access
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Google Authentication Only
            </p>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <FiShield className="mt-0.5 flex-shrink-0" />
              <span><strong>Security Notice:</strong> Only authorized project owner and editor accounts can access this panel.</span>
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 rounded-xl font-semibold text-dark-700 dark:text-white hover:bg-dark-50 dark:hover:bg-dark-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FcGoogle className="text-2xl" />
            )}
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>


        </div>
      </div>
    </div>
  );
}
