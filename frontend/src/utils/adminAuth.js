import { db } from '@/firebase/firestore';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const DEFAULT_ADMIN = {
  username: 'safwan',
  password: '123', // In production, this should be hashed
  role: 'admin',
  createdAt: Timestamp.now(),
};

/**
 * Initialize default admin account if it doesn't exist
 */
export const initializeDefaultAdmin = async () => {
  try {
    const adminDocRef = doc(db, 'admins', 'safwan');
    const adminDoc = await getDoc(adminDocRef);
    
    if (!adminDoc.exists()) {
      await setDoc(adminDocRef, DEFAULT_ADMIN);
      console.log('✅ Default admin account created');
    }
  } catch (error) {
    console.error('Error initializing default admin:', error);
  }
};

/**
 * Admin login
 */
export const adminLogin = async (username, password) => {
  try {
    const adminDocRef = doc(db, 'admins', username);
    const adminDoc = await getDoc(adminDocRef);
    
    if (!adminDoc.exists()) {
      throw new Error('Invalid credentials');
    }
    
    const adminData = adminDoc.data();
    
    if (adminData.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    // Store in localStorage
    localStorage.setItem('adminAuth', 'true');
    localStorage.setItem('adminUser', username);
    localStorage.setItem('adminLoginTime', Date.now().toString());
    
    return { success: true, admin: adminData };
  } catch (error) {
    throw error;
  }
};

/**
 * Check if admin is logged in
 */
export const isAdminLoggedIn = () => {
  const adminAuth = localStorage.getItem('adminAuth');
  const adminUser = localStorage.getItem('adminUser');
  return adminAuth === 'true' && adminUser === 'safwan';
};

/**
 * Admin logout
 */
export const adminLogout = () => {
  localStorage.removeItem('adminAuth');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('adminLoginTime');
};

/**
 * Get current admin
 */
export const getCurrentAdmin = () => {
  if (!isAdminLoggedIn()) return null;
  return {
    username: localStorage.getItem('adminUser'),
    loginTime: localStorage.getItem('adminLoginTime'),
  };
};
