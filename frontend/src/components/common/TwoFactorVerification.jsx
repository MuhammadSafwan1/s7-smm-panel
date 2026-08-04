'use client';

import { useState, useRef, useEffect } from 'react';
import { FiShield, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import { auth } from '@/firebase/firebase.config';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/common/Loader';

export default function TwoFactorVerification({ userId, onSuccess, onBack }) {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value && newCode.every(digit => digit)) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length === 6) {
          inputRefs.current[5]?.focus();
          handleVerify(newCode.join(''));
        } else if (digits.length > 0) {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    const newCode = [...code];
    digits.forEach((digit, i) => {
      if (i < 6) newCode[i] = digit;
    });
    setCode(newCode);
    if (digits.length === 6) {
      inputRefs.current[5]?.focus();
      handleVerify(newCode.join(''));
    } else if (digits.length > 0) {
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  const handleVerify = async (verificationCode) => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/user/2fa/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      sessionStorage.setItem('app_2fa_verified', 'true');
      sessionStorage.setItem('app_2fa_verified_at', Date.now().toString());

      toast.success('2FA verified! Welcome back!');

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code');
      toast.error(err.message || 'Invalid 2FA code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await auth.signOut();
      sessionStorage.removeItem('app_2fa_verified');
      sessionStorage.removeItem('app_2fa_verified_at');
      if (onBack) {
        onBack();
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950/60 to-slate-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 md:p-10 rounded-3xl shadow-2xl border border-primary-500/20">
          {/* Shield Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-xl shadow-primary-500/30">
                <FiShield className="text-4xl text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20"></div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-center text-dark-900 dark:text-white mb-2">
            Two-Factor
            <br />
            Authentication
          </h1>
          <p className="text-center text-sm text-dark-500 dark:text-dark-400 mb-8">
            Enter the 6-digit code from your authenticator app
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-start gap-2">
              <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Verification Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3 text-center">
              Verification Code
            </label>
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    fontSize: '24px',
                    letterSpacing: '0.1em'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify(code.join(''))}
            disabled={loading || code.some(digit => !digit)}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <FiShield className="text-lg" />
                <span>Verify & Sign In</span>
              </>
            )}
          </button>

          {/* Back to Login */}
          <button
            onClick={handleBackToLogin}
            disabled={loading}
            className="w-full mt-4 py-2.5 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <FiArrowLeft className="text-sm" />
            <span className="text-sm">Back to Login</span>
          </button>

          {/* Help Text */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-dark-600 dark:text-dark-300 text-center">
              <strong>Can&apos;t access your authenticator?</strong>
              <br />
              Use one of your backup codes or contact support for help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
