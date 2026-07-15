'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FiMail, FiArrowLeft, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/common/Loader';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const { forgotPassword, authLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }

    // Validate Gmail format
    if (!email.includes('@gmail.com')) {
      setError('Please enter a valid Gmail address (example@gmail.com)');
      toast.error('Please enter a valid Gmail address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid Gmail address (example@gmail.com)');
      toast.error('Please enter a valid Gmail address');
      return;
    }

    const { success, error: resetError } = await forgotPassword(email);
    if (success) {
      setSubmitted(true);
      toast.success('Password reset link sent to your email!');
    } else {
      setError(resetError || 'Failed to send reset link. Please try again.');
      toast.error(resetError || 'Failed to send reset link');
    }
  };

  // Success state
  if (submitted) {
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="text-4xl text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                Check Your Email
              </h1>
              <p className="text-dark-500 dark:text-dark-400 mb-6">
                We've sent a password reset link to <span className="font-semibold text-dark-700 dark:text-dark-300">{email}</span>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Next steps:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-200 mt-2 space-y-1 ml-4 list-disc">
                <li>Check your email (including spam folder)</li>
                <li>Click the reset link in the email</li>
                <li>Create a new password</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="w-full btn-secondary btn-lg mb-4"
            >
              Try Another Email
            </button>

            <div className="text-center">
              <p className="text-dark-500 dark:text-dark-400">
                Remember your password?{' '}
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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Reset Password
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Enter your email address and we'll send you a link to reset your password
            </p>
          </div>

          {/* Error message */}
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
                  disabled={authLoading}
                />
              </div>
              <p className="text-xs text-dark-400 dark:text-dark-500 mt-2">
                We'll send a secure link to this email
              </p>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="btn-primary w-full btn-lg"
            >
              {authLoading ? <Spinner size="sm" /> : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-dark-500 dark:text-dark-400 text-sm">
              Remember your password?{' '}
              <Link href="/auth/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Sign in
              </Link>
            </p>
            <p className="text-dark-500 dark:text-dark-400 text-sm">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>

          {/* Help section */}
          <div className="mt-8 pt-6 border-t border-dark-200 dark:border-dark-700">
            <p className="text-xs text-dark-500 dark:text-dark-400 mb-3 font-semibold">
              Didn't receive an email?
            </p>
            <ul className="text-xs text-dark-400 dark:text-dark-500 space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure you're using the right email</li>
              <li>• Try resending the link</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
