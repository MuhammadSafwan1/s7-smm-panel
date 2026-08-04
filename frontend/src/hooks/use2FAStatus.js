/**
 * Hook to check if user has completed 2FA verification
 * Returns true if:
 * 1. User doesn't have 2FA enabled, OR
 * 2. User has 2FA enabled AND has verified it
 */

import { useState, useEffect } from 'react';

export const use2FAStatus = (user) => {
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check2FAStatus = () => {
      if (!user) {
        setIs2FAVerified(false);
        setChecking(false);
        return;
      }

      // Check if 2FA is verified in session or local storage
      const sessionVerified = sessionStorage.getItem('app_2fa_verified') === 'true';
      const localVerified = localStorage.getItem('app_2fa_verified') === 'true';
      
      const verified = sessionVerified || localVerified;
      
      setIs2FAVerified(verified);
      setChecking(false);
      
      console.log('🔐 2FA Status Check:', {
        user: user?.email,
        sessionVerified,
        localVerified,
        finalStatus: verified
      });
    };

    check2FAStatus();
    
    // Re-check when storage changes (e.g., after 2FA verification)
    const handleStorageChange = () => {
      check2FAStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event when 2FA is verified
    window.addEventListener('2fa-verified', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('2fa-verified', handleStorageChange);
    };
  }, [user]);

  return { is2FAVerified, checking };
};
