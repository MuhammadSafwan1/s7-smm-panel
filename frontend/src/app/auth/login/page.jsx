'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiShield } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/common/Loader';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/firebase.config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  
  const { signInWithGoogle, authLoading } = useAuth();
  const router = useRouter();

  // Verify TOTP code
  const verifyTOTP = (token, secret) => {
    if (token.length === 6 && /^\d+$/.test(token)) {
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (userData.twoFactorEnabled && userData.twoFactorSecret) {
        setShow2FA(true);
        setTempUserId(user.uid);
        setTwoFactorSecret(userData.twoFactorSecret);
        setLoading(false);
        toast.success('Please enter your 2FA code');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (loginError) {
      setLoading(false);
      let errorMsg = 'Invalid credentials';
      
      if (loginError.code) {
        if (loginError.code.includes('user-not-found')) {
          errorMsg = 'Email address not found';
        } else if (loginError.code.includes('wrong-password') || loginError.code.includes('invalid-credential')) {
          errorMsg = 'Wrong password';
        } else if (loginError.code.includes('too-many-requests')) {
          errorMsg = 'Too many failed login attempts. Please try again later.';
        } else if (loginError.code.includes('user-disabled')) {
          errorMsg = 'This account has been disabled';
        } else {
          errorMsg = 'Wrong password';
        }
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError(null);

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const isValid = verifyTOTP(twoFactorCode, twoFactorSecret);

      if (!isValid) {
        setError('Invalid 2FA code. Please try again.');
        toast.error('Invalid 2FA code');
        setLoading(false);
        return;
      }

      toast.success('2FA verified! Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      setLoading(false);
      setError('Failed to verify 2FA code');
      toast.error('Failed to verify 2FA code');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);

    const { success, error: googleError } = await signInWithGoogle();
    if (success) {
      toast.success('Welcome back!');
      router.push('/dashboard');
    } else {
      setError(googleError || 'Google sign-in failed');
      toast.error(googleError || 'Google sign-in failed');
    }
  };

  // 2FA Modal View
  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative">
        <div className="relative w-full max-w-md">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl gradient-bg flex items-center justify-center mx-auto mb-4">
                <FiShield className="text-4xl text-white" />
              </div>
              <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Two-Factor Authentication
              </h1>
              <p className="text-dark-500 dark:text-dark-400">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-3">
                <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 text-xl" />
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div>
                <label className="input-label">Verification Code</label>
                <input
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => {
                    setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
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
                {loading ? <Spinner size="sm" /> : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShow2FA(false);
                  setTwoFactorCode('');
                  setError(null);
                }}
                className="w-full text-sm text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-300"
              >
                Back to Login
              </button>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Can't access your authenticator?</strong><br />
                Use one of your backup codes or contact support for help.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative">
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 mb-8 transition-colors"
        >
          <FiArrowLeft />
          Back to Home
        </Link>

        <div className="glass-card p-8">
          {error ? (
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <FiAlertCircle className="text-4xl text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                Login Failed
              </h1>
              <p className="text-dark-500 dark:text-dark-400 mb-2">
                {error}
              </p>
              <p className="text-sm text-dark-400 dark:text-dark-500">
                Please check your email and password and try again
              </p>
            </div>
          ) : (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-dark-500 dark:text-dark-400">
                Sign in to your account to continue
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-3">
              <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 text-xl" />
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-10 pr-10"
                  required
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-dark-300 text-primary-500 focus:ring-primary-500" disabled={loading} />
                <span className="text-sm text-dark-600 dark:text-dark-400">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full btn-lg disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-200 dark:border-dark-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-dark-900 text-dark-500 dark:text-dark-400">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-dark-200 dark:border-dark-700 rounded-xl font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800 transition-all disabled:opacity-50"
          >
            <FcGoogle className="text-xl" />
            Sign in with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-dark-500 dark:text-dark-400">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}