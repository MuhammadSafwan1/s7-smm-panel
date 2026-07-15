'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/common/Loader';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const { register, signInWithGoogle, authLoading } = useAuth();
  const router = useRouter();

  // Password validation rules
  const passwordRules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      maxLength: password.length <= 21,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
  }, [password]);

  const isPasswordValid = Object.values(passwordRules).every(rule => rule);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }

    // Validate email format
    if (!email.includes('@gmail.com')) {
      setError('Please enter a valid Gmail address (example@gmail.com)');
      toast.error('Please enter a valid Gmail address');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      toast.error('Password does not meet all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    const { success, error: regError } = await register(email, password, name);
    if (success) {
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } else {
      const errorMsg = regError?.includes('email-already-in-use')
        ? 'Email already registered. Please login or use another email.'
        : regError?.includes('weak-password')
        ? 'Password is too weak. Please meet all requirements.'
        : regError || 'Registration failed';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);

    const { success, error: googleError } = await signInWithGoogle();
    if (success) {
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } else {
      setError(googleError || 'Google sign-in failed');
      toast.error(googleError || 'Google sign-in failed');
    }
  };

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
                Registration Error
              </h1>
              <p className="text-dark-500 dark:text-dark-400 text-sm">
                {error}
              </p>
            </div>
          ) : (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Create Account
              </h1>
              <p className="text-dark-500 dark:text-dark-400">
                Join MSF SMM and start boosting your social media
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
              <label className="input-label">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-10"
                  required
                  disabled={authLoading}
                />
              </div>
            </div>

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
                  disabled={authLoading}
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
                  disabled={authLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                  disabled={authLoading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-3 p-4 rounded-lg bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                  <p className="text-xs font-semibold text-dark-600 dark:text-dark-400 mb-3">
                    Password Requirements:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules.minLength ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.minLength ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        Minimum 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules.maxLength ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.maxLength ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        Maximum 21 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules.hasUpperCase ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.hasUpperCase ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        At least 1 uppercase letter (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules.hasNumber ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.hasNumber ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        At least 1 number (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules.hasSymbol ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.hasSymbol ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        At least 1 symbol (!@#$%^&* etc)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="input-label">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-10 pr-10"
                  required
                  disabled={authLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
                  disabled={authLoading}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="mt-2">
                  {passwordsMatch ? (
                    <div className="flex items-center gap-2 text-xs">
                      <FiCheckCircle className="text-green-500" />
                      <span className="text-green-700 dark:text-green-300">Passwords match</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs">
                      <FiX className="text-red-500" />
                      <span className="text-red-600 dark:text-red-400">Passwords do not match</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading || !isPasswordValid || !passwordsMatch}
              className="btn-primary w-full btn-lg disabled:opacity-50"
            >
              {authLoading ? <Spinner size="sm" /> : 'Create Account'}
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
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-dark-200 dark:border-dark-700 rounded-xl font-medium text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-800 transition-all disabled:opacity-50"
          >
            <FcGoogle className="text-xl" />
            Sign up with Google
          </button>

          <div className="mt-6 text-center">
            <p className="text-dark-500 dark:text-dark-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}