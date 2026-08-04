'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiShield, FiMinusCircle } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/common/Loader';
import MathCaptcha from '@/components/common/MathCaptcha';
import TwoFactorVerification from '@/components/common/TwoFactorVerification';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/firebase.config';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRegistrationNotice, setShowRegistrationNotice] = useState(false);
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  
  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  
  const [captchaVerified, setCaptchaVerified] = useState(false);
  
  const { signInWithGoogle, authLoading } = useAuth();
  const router = useRouter();

  // Check if user just registered
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === 'true') {
      setShowRegistrationNotice(true);
      toast.success(
        '🎉 Registration successful! Please check your inbox and spam folder for the verification email.',
        { duration: 8000 }
      );
    }
    if (params.get('expired') === 'true') {
      setShowExpiredNotice(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!captchaVerified) {
      setError('Please solve the math problem first');
      toast.error('Please solve the math problem first');
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Check if email is verified
      if (!user.emailVerified) {
        setError('Please verify your email first. Check your inbox for verification link.');
        toast.error('Email not verified! Check your inbox.', { duration: 5000 });
        setLoading(false);
        return;
      }

      // Clear app 2FA verification on new login (sessionStorage only)
      sessionStorage.removeItem('app_2fa_verified');
      sessionStorage.removeItem('app_2fa_verified_at');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (userData.twoFactorEnabled && userData.twoFactorSecret) {
        setShow2FA(true);
        setTempUserId(user.uid);
        setLoading(false);
        toast.success('Please enter your 2FA code');
      } else {
        // No 2FA required, mark as complete in sessionStorage ONLY
        const timestamp = Date.now().toString();
        sessionStorage.setItem('app_2fa_verified', 'true');
        sessionStorage.setItem('app_2fa_verified_at', timestamp);
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

  const handleGoogleSignIn = async () => {
    setError(null);

    if (!captchaVerified) {
      setError('Please solve the math problem first');
      toast.error('Please solve the math problem first');
      return;
    }

    // Clear app 2FA verification on new login (sessionStorage only)
    sessionStorage.removeItem('app_2fa_verified');
    sessionStorage.removeItem('app_2fa_verified_at');

    const { success, error: googleError } = await signInWithGoogle();
    if (success) {
      try {
        // Get current user after Google sign-in
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('User not found after Google sign-in');
        }

        // Check if user has 2FA enabled
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        if (userData?.twoFactorEnabled && userData?.twoFactorSecret) {
          // User has 2FA enabled, show 2FA prompt
          setShow2FA(true);
          setTempUserId(currentUser.uid);
          toast.success('Please enter your 2FA code');
        } else {
          // No 2FA required for this user - sessionStorage ONLY
          const timestamp = Date.now().toString();
          sessionStorage.setItem('app_2fa_verified', 'true');
          sessionStorage.setItem('app_2fa_verified_at', timestamp);
          toast.success('Welcome back!');
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error checking 2FA status:', err);
        // If error checking 2FA, allow login (fallback) - sessionStorage ONLY
        const timestamp = Date.now().toString();
        sessionStorage.setItem('app_2fa_verified', 'true');
        sessionStorage.setItem('app_2fa_verified_at', timestamp);
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } else {
      setError(googleError || 'Google sign-in failed');
      toast.error(googleError || 'Google sign-in failed');
    }
  };

  // 2FA View
  if (show2FA) {
    return (
      <TwoFactorVerification
        userId={tempUserId}
        onSuccess={() => {
          setShow2FA(false);
          router.push('/dashboard');
        }}
        onBack={() => {
          setShow2FA(false);
          setTempUserId(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4 relative">
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm sm:text-base text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 sm:mb-8 transition-colors"
        >
          <FiArrowLeft />
          Back to Home
        </Link>

        <div className="glass-card p-4 sm:p-8">
          {/* Session Expired Notice */}
          {showExpiredNotice && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-500 dark:border-amber-500/50">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 text-2xl" />
                <div className="flex-1">
                  <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-1">
                    ⏰ Session Expired
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your session expired for security reasons (3-day auto logout). Please sign in again.
                  </p>
                </div>
                <button
                  onClick={() => setShowExpiredNotice(false)}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                >
                  <FiMinusCircle className="text-xl" />
                </button>
              </div>
            </div>
          )}

          {/* Registration Success Notice */}
          {showRegistrationNotice && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border-2 border-green-500 dark:border-green-500/50 animate-pulse">
              <div className="flex items-start gap-3">
                <FiCheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5 text-2xl" />
                <div className="flex-1">
                  <h3 className="font-bold text-green-800 dark:text-green-200 mb-1">
                    ✅ Registration Successful!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                    Please verify your email before logging in. Check your <strong>inbox and spam folder</strong>.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    📧 Can't find the email? Check your spam/junk folder or request a new verification email after login attempt.
                  </p>
                </div>
                <button
                  onClick={() => setShowRegistrationNotice(false)}
                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  <FiMinusCircle className="text-xl" />
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiAlertCircle className="text-3xl sm:text-4xl text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white mb-2">
                Login Failed
              </h1>
              <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400 mb-2">
                {error}
              </p>
              <p className="text-xs sm:text-sm text-dark-400 dark:text-dark-500">
                Please check your email and password and try again
              </p>
            </div>
          ) : (
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
                Sign in to your account to continue
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-2 sm:gap-3">
              <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 text-lg sm:text-xl" />
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="input-label text-sm sm:text-base">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm sm:text-base" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base py-2.5 sm:py-3"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="input-label text-sm sm:text-base">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm sm:text-base" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-9 sm:pl-10 pr-12 text-sm sm:text-base py-2.5 sm:py-3"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 text-sm sm:text-base z-10"
                  disabled={loading}
                  tabIndex="-1"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-dark-300 text-primary-500 focus:ring-primary-500" disabled={loading} />
                <span className="text-xs sm:text-sm text-dark-600 dark:text-dark-400">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <MathCaptcha onVerify={() => setCaptchaVerified(true)} />

            <button
              type="submit"
              disabled={loading || !captchaVerified}
              className="btn-primary w-full btn-lg text-sm sm:text-base disabled:opacity-50"
            >
              {loading ? <Spinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative my-4 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-200 dark:border-dark-700"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-4 bg-white dark:bg-dark-900 text-dark-500 dark:text-dark-400">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || !captchaVerified}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-dark-200 dark:border-dark-700 rounded-xl font-medium text-sm sm:text-base text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800 transition-all disabled:opacity-50"
          >
            <FcGoogle className="text-lg sm:text-xl" />
            Sign in with Google
          </button>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
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