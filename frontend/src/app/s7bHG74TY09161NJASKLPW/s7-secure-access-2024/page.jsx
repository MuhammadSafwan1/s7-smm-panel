'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/firebase/firebase.config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import toast from 'react-hot-toast';
import { FiLock, FiMail, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { Spinner } from '@/components/common/Loader';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');

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

  const verifyTOTP = (token, secret) => {
    if (token.length === 6 && /^\d+$/.test(token)) {
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      const ownerEmail = 'ms8347750@gmail.com';
      const editorEmail = 'ms4746845@gmail.com';
      const isOwner = userData?.email === ownerEmail;
      const isEditor = userData?.email === editorEmail;

      if (userData.role !== 'admin' && !isOwner && !isEditor) {
        await auth.signOut();
        toast.error('Unauthorized: Admin access required');
        setLoading(false);
        return;
      }

      // Owner/Editor without 2FA can access directly
      if ((isOwner || isEditor) && (!userData.twoFactorEnabled || !userData.twoFactorSecret)) {
        const adminSession = {
          userId: user.uid,
          email: userData.email,
          role: isOwner ? 'owner' : 'editor',
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem('adminSession', JSON.stringify(adminSession));
        toast.success(`Welcome back, ${isOwner ? 'Owner' : 'Editor'}!`);
        router.push('/s7bHG74TY09161NJASKLPW');
        return;
      }

      // Show 2FA for others
      if (userData.twoFactorEnabled && userData.twoFactorSecret) {
        setShow2FA(true);
        setTempUserId(user.uid);
        setTwoFactorSecret(userData.twoFactorSecret);
        setLoading(false);
        toast.success('Please enter your 2FA code');
      } else {
        const adminSession = {
          userId: user.uid,
          email: userData.email,
          role: 'admin',
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem('adminSession', JSON.stringify(adminSession));
        toast.success('Welcome back!');
        router.push('/s7bHG74TY09161NJASKLPW');
      }
    } catch (error) {
      setLoading(false);
      let errorMsg = 'Invalid credentials';
      if (error.code?.includes('user-not-found')) errorMsg = 'Account not found';
      else if (error.code?.includes('wrong-password') || error.code?.includes('invalid-credential')) errorMsg = 'Invalid email or password';
      else if (error.code?.includes('too-many-requests')) errorMsg = 'Too many attempts. Try again later.';
      toast.error(errorMsg);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const isValid = verifyTOTP(twoFactorCode, twoFactorSecret);
      if (!isValid) {
        toast.error('Invalid 2FA code');
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', tempUserId));
      const userData = userDoc.data();
      
      const adminSession = {
        userId: tempUserId,
        email: userData.email,
        role: 'admin',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem('adminSession', JSON.stringify(adminSession));

      toast.success('Admin authentication successful!');
      router.push('/s7bHG74TY09161NJASKLPW');
    } catch (error) {
      setLoading(false);
      toast.error('Failed to verify 2FA code');
    }
  };

  const handleGoogleOwnerAccess = async () => {
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
        toast.error('Only project owner or editor can access admin panel via Google');
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

  // 2FA Modal View
  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative bg-dark-50 dark:bg-dark-950">
        <div className="relative w-full max-w-md">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl gradient-bg flex items-center justify-center mx-auto mb-4">
                <FiShield className="text-4xl text-white" />
              </div>
              <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Admin 2FA Verification
              </h1>
              <p className="text-dark-500 dark:text-dark-400">
                Enter your authenticator code
              </p>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div>
                <label className="input-label">6-Digit Code</label>
                <input
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-2xl font-mono tracking-widest"
                  maxLength={6}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="btn-primary w-full btn-lg disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : 'Verify & Access Admin Panel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode('');
                  auth.signOut();
                }}
                className="w-full text-sm text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-300"
              >
                Back to Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
              Secure Authentication Required
            </p>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <FiShield className="mt-0.5 flex-shrink-0" />
              <span><strong>Security Notice:</strong> Admin accounts require 2FA authentication. All access is logged for security purposes.</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="input-label">Admin Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                  disabled={loading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Authenticating...
                </>
              ) : (
                <>
                  <FiLock />
                  Secure Sign In
                </>
              )}
            </button>
          </form>

          {/* Owner Google Sign In */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-200 dark:border-dark-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-dark-900 text-dark-500 dark:text-dark-400">
                Project Team Access
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleOwnerAccess}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-500/10 dark:to-orange-500/10 rounded-xl font-medium text-yellow-700 dark:text-yellow-300 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-500/20 dark:hover:to-orange-500/20 transition-all disabled:opacity-50"
          >
            <FcGoogle className="text-xl" />
            Sign in as Project Team (Google)
          </button>
        </div>
      </div>
    </div>
  );
}
