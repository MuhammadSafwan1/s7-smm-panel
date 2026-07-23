'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/common/Loader';
import MathCaptcha from '@/components/common/MathCaptcha';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const { register, authLoading } = useAuth();
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

    if (!captchaVerified) {
      setError('Please solve the math problem first');
      toast.error('Please solve the math problem first');
      return;
    }

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
      toast.success('Account created successfully! Please login to continue.');
      router.push('/auth/login');
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
          {error ? (
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FiAlertCircle className="text-3xl sm:text-4xl text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-900 dark:text-white mb-2">
                Registration Error
              </h1>
              <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
                {error}
              </p>
            </div>
          ) : (
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Create Account
              </h1>
              <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
                Join MSF SMM and start boosting your social media
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-2 sm:gap-3">
              <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5 text-lg sm:text-xl" />
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="input-label text-sm sm:text-base">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm sm:text-base" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base py-2.5 sm:py-3"
                  required
                  disabled={authLoading}
                />
              </div>
            </div>

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
                  disabled={authLoading}
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
                  className="input-field pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base py-2.5 sm:py-3"
                  required
                  disabled={authLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 text-sm sm:text-base"
                  disabled={authLoading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {password.length > 0 && (
                <div className="mt-2 sm:mt-3 p-3 sm:p-4 rounded-lg bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                  <p className="text-[10px] sm:text-xs font-semibold text-dark-600 dark:text-dark-400 mb-2 sm:mb-3">
                    Password Requirements:
                  </p>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      {passwordRules.minLength ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.minLength ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        Minimum 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      {passwordRules.maxLength ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.maxLength ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        Maximum 21 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      {passwordRules.hasUpperCase ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.hasUpperCase ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        At least 1 uppercase letter (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      {passwordRules.hasNumber ? (
                        <FiCheckCircle className="text-green-500 flex-shrink-0" />
                      ) : (
                        <FiX className="text-red-500 flex-shrink-0" />
                      )}
                      <span className={passwordRules.hasNumber ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}>
                        At least 1 number (0-9)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
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
              <label className="input-label text-sm sm:text-base">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm sm:text-base" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  className="input-field pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base py-2.5 sm:py-3"
                  required
                  disabled={authLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 text-sm sm:text-base"
                  disabled={authLoading}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="mt-1.5 sm:mt-2">
                  {passwordsMatch ? (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      <FiCheckCircle className="text-green-500" />
                      <span className="text-green-700 dark:text-green-300">Passwords match</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                      <FiX className="text-red-500" />
                      <span className="text-red-600 dark:text-red-400">Passwords do not match</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <MathCaptcha onVerify={() => setCaptchaVerified(true)} />

            <button
              type="submit"
              disabled={authLoading || !isPasswordValid || !passwordsMatch || !captchaVerified}
              className="btn-primary w-full btn-lg text-sm sm:text-base disabled:opacity-50"
            >
              {authLoading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
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

export default function RegisterPage() {
  return <RegisterForm />;
}
