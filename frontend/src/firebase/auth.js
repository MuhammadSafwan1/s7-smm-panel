import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import app from './firebase.config';

const auth = getAuth(app);

// Set persistence to LOCAL so user stays logged in across browser sessions
// This prevents automatic logout after closing browser
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase Auth Persistence: LOCAL (user will stay logged in)');
  })
  .catch((error) => {
    console.error('⚠️ Firebase Auth Persistence failed:', error);
  });

// Simple Google Provider Setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Register with email & password
export const registerWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    await sendEmailVerification(userCredential.user);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Login with email & password
export const loginWithEmail = async (email, password) => {
  try {
    // Ensure persistence is set before login
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Simple Google Login with Popup
export const loginWithGoogle = async () => {
  try {
    // Ensure persistence is set before login
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    console.log('✅ Google login successful:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    
    return { user, error: null };
  } catch (error) {
    console.error('❌ Google login error:', error);
    
    let errorMessage = 'Failed to sign in with Google';
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign-in cancelled';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Please allow popups for this site';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Sign-in cancelled';
        break;
      default:
        errorMessage = error.message || 'Failed to sign in with Google';
    }
    
    return { user: null, error: errorMessage };
  }
};

// Logout
export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Send email verification
export const verifyEmail = async () => {
  try {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
      return { error: null };
    }
    return { error: 'No user logged in' };
  } catch (error) {
    return { error: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Auth state listener
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export { auth };