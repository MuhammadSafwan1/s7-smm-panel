'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { updateUserProfile } from '@/firebase/firestore';
import { FiLock, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    symbol: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (newPassword) {
      setPasswordRequirements({
        length: newPassword.length >= 8 && newPassword.length <= 21,
        uppercase: /[A-Z]/.test(newPassword),
        number: /[0-9]/.test(newPassword),
        symbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
      });
    }
  }, [newPassword]);

  useEffect(() => {
    if (passwordError) {
      const timer = setTimeout(() => setPasswordError(''), 100);
      return () => clearTimeout(timer);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  useEffect(() => {
    if (emailError) {
      const timer = setTimeout(() => setEmailError(''), 100);
      return () => clearTimeout(timer);
    }
  }, [newEmail, emailPassword]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (!Object.values(passwordRequirements).every(Boolean)) {
      setPasswordError('Password does not meet requirements');
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      await updateUserProfile(user.uid, {
        password: newPassword,
        passwordUpdatedAt: new Date().toISOString(),
      });
      
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect');
      } else {
        setPasswordError('Failed to update password');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailError('');
    
    if (!newEmail || !emailPassword) {
      setEmailError('Please fill all fields');
      return;
    }
    
    if (!newEmail.endsWith('@gmail.com')) {
      setEmailError('Please enter a valid Gmail address (example@gmail.com)');
      return;
    }
    
    setEmailLoading(true);
    
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);
      
      toast.success('Email updated successfully. Please verify your new email.');
      setNewEmail('');
      setEmailPassword('');
    } catch (error) {
      console.error('Email update error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setEmailError('Password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        setEmailError('Email is already in use');
      } else {
        setEmailError('Failed to update email');
      }
    } finally {
      setEmailLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Change Password Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <FiLock className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Change Password
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Update your password to keep your account secure
            </p>
          </div>

          {passwordError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
                {passwordError}
              </p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showCurrentPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showNewPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            {newPassword && (
              <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800 space-y-2">
                <p className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">Password Requirements:</p>
                <div className="space-y-2 text-sm">
                  <div className={`flex items-center gap-2 ${passwordRequirements.length ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{passwordRequirements.length ? '✅' : '❌'}</span>
                    <span>8-21 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{passwordRequirements.uppercase ? '✅' : '❌'}</span>
                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.number ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{passwordRequirements.number ? '✅' : '❌'}</span>
                    <span>At least 1 number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.symbol ? 'text-green-600' : 'text-red-600'}`}>
                    <span>{passwordRequirements.symbol ? '✅' : '❌'}</span>
                    <span>At least 1 symbol (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}

            {confirmPassword && (
              <div className={`text-sm font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? '✅ Passwords match' : '❌ Passwords do not match'}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading || !allRequirementsMet || !passwordsMatch}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? <Spinner size="sm" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Change Email Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <FiMail className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Change Email
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Current email: {user.email}
            </p>
          </div>

          {emailError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
                {emailError}
              </p>
            </div>
          )}

          <form onSubmit={handleEmailChange} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input-field"
                placeholder="newemail@gmail.com"
              />
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-2">
                Must be a valid Gmail address (@gmail.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Confirm with Password
              </label>
              <div className="relative">
                <input
                  type={showEmailPassword ? 'text' : 'password'}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="input-field pr-12"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showEmailPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailLoading ? <Spinner size="sm" /> : 'Update Email'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
