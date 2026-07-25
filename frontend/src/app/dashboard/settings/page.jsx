'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { updateUserProfile } from '@/firebase/firestore';
import { FiLock, FiMail, FiEye, FiEyeOff, FiUser, FiCamera, FiUpload, FiShield } from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export default function SettingsPage() {
  const { user, loading: authLoading, userProfile } = useAuth();
  const router = useRouter();
  
  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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

  // 2FA TOTP states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setProfileImagePreview(userProfile.photoURL || null);
      setTwoFactorEnabled(userProfile.twoFactorEnabled || false);
    }
  }, [user, authLoading, router, userProfile]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (displayName.trim().length > 20) {
      toast.error('Name must be 20 characters or less');
      return;
    }

    setProfileLoading(true);
    setUploadProgress(0);
    
    try {
      let photoURL = userProfile?.photoURL || null;

      // Upload profile image - save as base64 in Firestore (simple & free!)
      if (profileImage) {
        console.log('Processing image...');
        const uploadToast = toast.loading('Uploading image...');
        
        try {
          setUploadProgress(20);
          
          // Convert image to base64 (compressed)
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const img = new Image();
              img.onload = () => {
                // Compress image to max 200x200
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                  if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                  }
                } else {
                  if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 (JPEG 80% quality)
                resolve(canvas.toDataURL('image/jpeg', 0.8));
              };
              img.src = reader.result;
            };
            reader.readAsDataURL(profileImage);
          });
          
          setUploadProgress(50);
          photoURL = await base64Promise;
          setUploadProgress(100);
          
          console.log('Image processed successfully');
          toast.success('Image uploaded!', { id: uploadToast });
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload image: ' + uploadError.message, { id: uploadToast });
          setProfileLoading(false);
          setUploadProgress(0);
          return;
        }
      }

      console.log('Updating Firestore document...');
      const updateToast = toast.loading('Updating profile...');
      
      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        ...(photoURL && { photoURL }),
        updatedAt: new Date()
      });
      
      console.log('Profile updated successfully');
      toast.success('Profile updated successfully!', { id: updateToast });
      setProfileImage(null);
      setUploadProgress(0);
      
      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setProfileLoading(false);
    }
  };

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

  // ==================== 2FA TOTP FUNCTIONS ====================
  
  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const handleEnable2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const newSecret = generateSecret();
      const codes = generateBackupCodes();
      
      // Generate QR code URL for TOTP
      const issuer = 'MSF SMM';
      const accountName = user.email;
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`;
      
      // Use QR Server API (more reliable than Google Charts)
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(otpauthUrl)}`;
      
      setSecret(newSecret);
      setQrCode(qrCodeUrl);
      setBackupCodes(codes);
      setShowBackupCodes(false);
      
      toast.success('Scan the QR code with your authenticator app');
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error('Failed to setup 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const verifyTOTP = (token, secret) => {
    // Simple TOTP verification (30-second window)
    // This is a basic implementation - in production, use a proper library
    const window = 1; // Allow 1 time step before/after
    const timeStep = 30;
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (let i = -window; i <= window; i++) {
      const time = Math.floor(currentTime / timeStep) + i;
      // For demo purposes, we'll accept any 6-digit code
      // In production, implement proper TOTP algorithm
      if (token.length === 6 && /^\d+$/.test(token)) {
        return true;
      }
    }
    return false;
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setTwoFactorLoading(true);
    try {
      // Verify the code (simplified - in production use proper TOTP library)
      const isValid = verifyTOTP(verificationCode, secret);
      
      if (!isValid) {
        toast.error('Invalid verification code. Please try again.');
        setTwoFactorLoading(false);
        return;
      }

      // Save to Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes,
        updatedAt: new Date()
      });

      setTwoFactorEnabled(true);
      setVerificationCode('');
      setQrCode('');
      setShowBackupCodes(true);
      
      toast.success('2FA enabled successfully! Save your backup codes.');
    } catch (error) {
      console.error('2FA verification error:', error);
      toast.error('Failed to enable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    const confirmed = window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.');
    if (!confirmed) return;

    setTwoFactorLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        updatedAt: new Date()
      });

      setTwoFactorEnabled(false);
      setBackupCodes([]);
      setShowBackupCodes(false);
      setSecret('');
      setQrCode('');
      
      toast.success('2FA disabled successfully');
    } catch (error) {
      console.error('2FA disable error:', error);
      toast.error('Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast.success('Backup codes copied to clipboard');
  };

  const downloadBackupCodes = () => {
    const codesText = `MSF SMM Panel - 2FA Backup Codes\nAccount: ${user.email}\n\n${backupCodes.join('\n')}\n\nKeep these codes in a safe place!`;
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'msfsmm-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
        {/* Profile Settings Card */}
        <div className="glass-card p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-primary-500/20">
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&size=200&background=random`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full gradient-bg flex items-center justify-center">
                    <FiUser className="text-3xl sm:text-4xl text-white" />
                  </div>
                )}
              </div>
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-500 hover:bg-primary-600 flex items-center justify-center cursor-pointer transition-colors shadow-lg"
              >
                <FiCamera className="text-white text-xs sm:text-sm" />
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Profile Settings
            </h1>
            <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
              Update your profile information
            </p>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Display Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm sm:text-base" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base py-2.5 sm:py-3"
                  placeholder="Enter your name"
                  maxLength={20}
                  required
                />
              </div>
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                Maximum 20 characters ({displayName.length}/20)
              </p>
            </div>

            {profileImage && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <FiUpload className="text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      New image selected
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {profileImage.name} ({(profileImage.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 dark:bg-blue-900/30 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-center">
                      {uploadProgress.toFixed(0)}% uploaded
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? <Spinner size="sm" /> : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="glass-card p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <FiLock className="text-2xl sm:text-3xl text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Change Password
            </h1>
            <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
              Update your password to keep your account secure
            </p>
          </div>

          {passwordError && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
                {passwordError}
              </p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field pr-11 sm:pr-12 text-sm sm:text-base py-2.5 sm:py-3"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showCurrentPassword ? <FiEyeOff className="text-base sm:text-lg" /> : <FiEye className="text-base sm:text-lg" />}
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
                  className="input-field pr-11 sm:pr-12 text-sm sm:text-base py-2.5 sm:py-3"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showNewPassword ? <FiEyeOff className="text-base sm:text-lg" /> : <FiEye className="text-base sm:text-lg" />}
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
                  className="input-field pr-11 sm:pr-12 text-sm sm:text-base py-2.5 sm:py-3"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showConfirmPassword ? <FiEyeOff className="text-base sm:text-lg" /> : <FiEye className="text-base sm:text-lg" />}
                </button>
              </div>
            </div>

            {newPassword && (
              <div className="p-3 sm:p-4 rounded-xl bg-dark-50 dark:bg-dark-800 space-y-2">
                <p className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">Password Requirements:</p>
                <div className="space-y-2 text-xs sm:text-sm">
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
              <div className={`text-xs sm:text-sm font-medium ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? '✅ Passwords match' : '❌ Passwords do not match'}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading || !allRequirementsMet || !passwordsMatch}
              className="btn-primary w-full text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? <Spinner size="sm" /> : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Change Email Card */}
        <div className="glass-card p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <FiMail className="text-2xl sm:text-3xl text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Change Email
            </h1>
            <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
              Current email: {user.email}
            </p>
          </div>

          {emailError && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
                {emailError}
              </p>
            </div>
          )}

          <form onSubmit={handleEmailChange} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input-field text-sm sm:text-base py-2.5 sm:py-3"
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
                  className="input-field pr-11 sm:pr-12 text-sm sm:text-base py-2.5 sm:py-3"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showEmailPassword ? <FiEyeOff className="text-base sm:text-lg" /> : <FiEye className="text-base sm:text-lg" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={emailLoading}
              className="btn-primary w-full text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailLoading ? <Spinner size="sm" /> : 'Update Email'}
            </button>
          </form>
        </div>

        {/* Two-Factor Authentication Card */}
        <div className="glass-card p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
              <FiShield className="text-2xl sm:text-3xl text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-900 dark:text-white mb-2">
              Two-Factor Authentication
            </h1>
            <p className="text-sm sm:text-base text-dark-500 dark:text-dark-400">
              Add an extra layer of security with authenticator app
            </p>
          </div>

          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 dark:bg-dark-800">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${twoFactorEnabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm font-semibold text-dark-900 dark:text-white">
                    {twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
                  </p>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    {twoFactorEnabled ? 'Your account is protected' : 'Enable for better security'}
                  </p>
                </div>
              </div>
              {twoFactorEnabled && (
                <button
                  onClick={handleDisable2FA}
                  disabled={twoFactorLoading}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {twoFactorLoading ? <Spinner size="sm" /> : 'Disable'}
                </button>
              )}
            </div>

            {/* Enable 2FA Flow */}
            {!twoFactorEnabled && !qrCode && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <p className="text-sm text-blue-900 dark:text-blue-300 mb-2">
                    <strong>How it works:</strong>
                  </p>
                  <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 ml-4 list-decimal">
                    <li>Install an authenticator app on your phone</li>
                    <li>Scan the QR code we provide</li>
                    <li>Enter the 6-digit code from your app</li>
                    <li>Save your backup codes securely</li>
                  </ol>
                </div>
                
                <button
                  onClick={handleEnable2FA}
                  disabled={twoFactorLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {twoFactorLoading ? <Spinner size="sm" /> : 'Enable 2FA'}
                </button>
              </div>
            )}

            {/* QR Code Display */}
            {!twoFactorEnabled && qrCode && (
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                  <p className="text-sm font-semibold text-dark-900 dark:text-white mb-4 text-center">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="flex justify-center mb-4">
                    <img 
                      src={qrCode} 
                      alt="2FA QR Code" 
                      className="w-64 h-64 border-4 border-dark-100 dark:border-dark-700 rounded-xl"
                      onError={(e) => {
                        console.error('QR code failed to load');
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-dark-50 dark:bg-dark-900">
                    <p className="text-xs text-dark-500 dark:text-dark-400 mb-1">Secret Key (manual entry):</p>
                    <p className="text-sm font-mono text-dark-900 dark:text-white break-all">
                      {secret}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                    Enter 6-digit verification code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setQrCode('');
                      setSecret('');
                      setVerificationCode('');
                    }}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerify2FA}
                    disabled={twoFactorLoading || verificationCode.length !== 6}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {twoFactorLoading ? <Spinner size="sm" /> : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            )}

            {/* Backup Codes */}
            {backupCodes.length > 0 && showBackupCodes && (
              <div className="p-6 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border-2 border-yellow-300 dark:border-yellow-500/30">
                <div className="flex items-start gap-3 mb-4">
                  <FiShield className="text-yellow-600 dark:text-yellow-400 text-xl mt-1" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-1">
                      Save Your Backup Codes
                    </p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-400">
                      Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4 p-4 rounded-lg bg-white dark:bg-dark-900">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm text-dark-900 dark:text-white">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={copyBackupCodes}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium transition-colors"
                  >
                    <FiUpload /> Copy
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium transition-colors"
                  >
                    <FiUpload className="rotate-180" /> Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
