/**
 * Session Manager - Handles sessionStorage lifecycle
 * 
 * Features:
 * 1. Clears cache on page refresh (not navigation)
 * 2. Preserves cache during navigation
 * 3. Auto-clears on tab close
 */

// Check if this is a page refresh vs navigation
export const isPageRefresh = () => {
  if (typeof window === 'undefined') return false;
  
  // performance.navigation.type is deprecated but still works
  // 1 = reload, 0 = navigate, 2 = back/forward
  if (window.performance?.navigation?.type === 1) {
    return true;
  }
  
  // Modern way using PerformanceNavigationTiming
  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length > 0) {
    const navEntry = navEntries[0];
    return navEntry.type === 'reload';
  }
  
  return false;
};

// Clear session cache on refresh
export const handleSessionRefresh = () => {
  if (typeof window === 'undefined') return;
  
  if (isPageRefresh()) {
    console.log('🔄 Page refresh detected - Clearing session cache');
    
    // Clear all cache entries (keep only auth-related data)
    const keysToKeep = [
      'firebase:authUser',
      'firebase:host',
      'app_2fa_verified',
      'app_2fa_verified_at',
      'pending_referral',
      'session_start'
    ];
    
    // Also keep userProfile_cache on refresh (will refresh in background)
    // Keep app_cache_* keys too - cache.js persists them and only resets on deploy
    const allKeys = Object.keys(sessionStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key) && !key.startsWith('userProfile_cache') && !key.startsWith('app_cache')) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Cleared cache: ${key}`);
      }
    });
    
    console.log('✅ Session cache cleared on refresh');
  } else {
    console.log('🔀 Navigation detected - Keeping session cache');
  }
};

// Initialize session manager
export const initSessionManager = () => {
  if (typeof window === 'undefined') return;
  
  // Clear cache on refresh
  handleSessionRefresh();
  
  // Optional: Track session start time
  if (!sessionStorage.getItem('session_start')) {
    sessionStorage.setItem('session_start', Date.now().toString());
  }
  
  console.log('✅ Session Manager initialized');
};

// Get cache safely
export const getSessionCache = (key) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn(`Failed to parse session cache for ${key}:`, e);
    return null;
  }
};

// Set cache safely
export const setSessionCache = (key, value) => {
  if (typeof window === 'undefined') return false;
  
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`Failed to set session cache for ${key}:`, e);
    return false;
  }
};

// Clear specific cache
export const clearSessionCache = (key) => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key);
};

// Clear all cache (except auth)
export const clearAllSessionCache = () => {
  if (typeof window === 'undefined') return;
  
  const keysToKeep = [
    'firebase:authUser',
    'firebase:host',
    'app_2fa_verified',
    'app_2fa_verified_at',
    'pending_referral',
    'session_start'
  ];
  
  const allKeys = Object.keys(sessionStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      sessionStorage.removeItem(key);
    }
  });
};
