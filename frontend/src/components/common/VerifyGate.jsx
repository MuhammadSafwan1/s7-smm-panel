'use client';

import { useState, useEffect, useCallback } from 'react';
import CloudflareTurnstile from './CloudflareTurnstile';

export default function VerifyGate({ children, required = true }) {
  const [verified, setVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already verified in this session (check both storages)
    const isVerified = localStorage.getItem('cf_verified') || sessionStorage.getItem('cf_verified');
    const verifiedAt = localStorage.getItem('cf_verified_at') || sessionStorage.getItem('cf_verified_at');
    
    // Re-verify every 30 minutes
    if (isVerified === 'true' && verifiedAt) {
      const elapsed = Date.now() - parseInt(verifiedAt);
      if (elapsed < 30 * 60 * 1000) {
        setVerified(true);
        setLoading(false);
        return;
      }
    }
    setLoading(false);
  }, []);

  const handleVerify = useCallback((token) => {
    if (token) {
      const timestamp = Date.now().toString();
      // Set in BOTH storages for persistence across tabs
      sessionStorage.setItem('cf_verified', 'true');
      sessionStorage.setItem('cf_verified_at', timestamp);
      localStorage.setItem('cf_verified', 'true');
      localStorage.setItem('cf_verified_at', timestamp);
      setCaptchaToken(token);
      // Small delay to show success message, then redirect
      setTimeout(() => {
        setVerified(true);
      }, 500);
    }
  }, []);

  const handleError = useCallback(() => {
    setCaptchaToken('');
  }, []);

  // If not required or already verified, show children
  if (!required || verified) {
    return <>{children}</>;
  }

  // Show loading while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-dark-500 dark:text-dark-400">Checking verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950/60 to-slate-900">
          <div className="absolute top-12 right-20 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-yellow-200/90 blur-sm" />
            <div className="absolute inset-0 rounded-full bg-yellow-100/60 blur-lg scale-150" />
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="glass-card p-8 md:p-10 text-center">
          {/* Shield Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-dark-900 dark:text-white mb-3">
            Human Verification
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mb-8">
            {!captchaToken 
              ? 'Please complete the security check to access our services. This helps us keep our platform safe from bots.'
              : '✓ Verified! You will be redirected shortly...'}
          </p>

          {/* Only ONE Cloudflare Turnstile - always visible until verified */}
          {!captchaToken && (
            <div className="flex justify-center mb-6">
              <CloudflareTurnstile
                onVerify={handleVerify}
                onError={handleError}
                theme="auto"
              />
            </div>
          )}

          {/* Success animation after verification */}
          {captchaToken && (
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <p className="text-xs text-dark-400 dark:text-dark-500 mt-4">
            Your privacy is important. No personal data is collected during verification.
          </p>
        </div>
      </div>
    </div>
  );
}