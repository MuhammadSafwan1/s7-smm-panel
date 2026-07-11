import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  serverTimestamp,
  Timestamp,
  arrayUnion,
  arrayRemove,
  setDoc,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import app from './firebase.config';

const db = getFirestore(app);
const storage = getStorage(app);

// ==================== GENERIC CRUD HELPERS ====================

// Add a document to a collection
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

// Get a document by ID
export const getDocument = async (collectionName, docId) => {
  try {
    const docSnap = await getDoc(doc(db, collectionName, docId));
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    }
    return { data: null, error: 'Document not found' };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

// Update a document
export const updateDocument = async (collectionName, docId, data) => {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Delete a document
export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Get all documents from a collection (with optional constraints)
export const getDocuments = async (
  collectionName,
  constraints = []
) => {
  try {
    const q = constraints.length > 0
      ? query(collection(db, collectionName), ...constraints)
      : query(collection(db, collectionName));

    const querySnapshot = await getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return { data: documents, error: null };
  } catch (error) {
    return { data: [], error: error.message };
  }
};

// ==================== USER MANAGEMENT ====================

// Initialize or get user profile
export const initializeUserProfile = async (uid, userData) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user profile
      await setDoc(userRef, {
        uid,
        email: userData.email,
        displayName: userData.displayName || '',
        role: 'user',
        balance: 0,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ User profile created:', uid);
    }

    const updatedSnap = await getDoc(userRef);
    return { data: { id: updatedSnap.id, ...updatedSnap.data() }, error: null };
  } catch (error) {
    console.error('❌ Initialize user profile error:', error);
    return { data: null, error: error.message };
  }
};

// ==================== ACCOUNTS ====================

export const createAccount = async (accountData) => {
  return addDocument('accounts', accountData);
};

export const getAccount = async (accountId) => {
  return getDocument('accounts', accountId);
};

export const updateAccount = async (accountId, data) => {
  return updateDocument('accounts', accountId, data);
};

export const deleteAccount = async (accountId) => {
  return deleteDocument('accounts', accountId);
};

export const getAccounts = async (filters = {}) => {
  try {
    console.log('🔥 Firestore getAccounts called with filters:', filters);
    const accountsRef = collection(db, 'accounts');
    let q;

    // When filtering by category, don't sort (to avoid index requirement)
    // We'll sort client-side instead
    if (filters.categoryId) {
      console.log('📂 Querying with categoryId:', filters.categoryId);
      q = query(accountsRef, where('categoryId', '==', filters.categoryId));
    } else {
      console.log('📂 Querying ALL accounts (no category filter)');
      // Only sort by price when showing all accounts
      q = query(accountsRef, orderBy('price', 'asc'));
    }

    const querySnapshot = await getDocs(q);
    const accounts = [];
    
    querySnapshot.forEach((doc) => {
      const accountData = { id: doc.id, ...doc.data() };
      console.log('📄 Account found:', doc.id, '| Category:', accountData.categoryId, '| Status:', accountData.status, '| Price:', accountData.price);
      accounts.push(accountData);
    });

    // Sort by price client-side if we filtered by category
    if (filters.categoryId && accounts.length > 0) {
      accounts.sort((a, b) => (a.price || 0) - (b.price || 0));
      console.log('🔄 Sorted accounts by price client-side');
    }

    console.log('✅ Firestore returned', accounts.length, 'accounts');
    return { data: accounts, error: null };
  } catch (error) {
    console.error('❌ Firestore error:', error);
    return { data: [], error: error.message };
  }
};

export const getFeaturedAccounts = async (limitCount = 6) => {
  return getAccounts({ featured: true, status: 'available', limitCount, sortBy: 'createdAt', sortDirection: 'desc' });
};

export const getLatestAccounts = async (limitCount = 8) => {
  return getAccounts({ status: 'available', limitCount, sortBy: 'createdAt', sortDirection: 'desc' });
};

// ==================== ORDERS ====================

export const createOrder = async (orderData) => {
  return addDocument('orders', orderData);
};

export const getOrder = async (orderId) => {
  return getDocument('orders', orderId);
};

export const updateOrder = async (orderId, data) => {
  return updateDocument('orders', orderId, data);
};

export const getUserOrders = async (userId) => {
  const constraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  ];
  return getDocuments('orders', constraints);
};

export const getAllOrders = async () => {
  return getDocuments('orders', [orderBy('createdAt', 'desc')]);
};

// ==================== CATEGORIES ====================

export const createCategory = async (categoryData) => {
  return addDocument('categories', categoryData);
};

export const getCategory = async (categoryId) => {
  return getDocument('categories', categoryId);
};

export const updateCategory = async (categoryId, data) => {
  return updateDocument('categories', categoryId, data);
};

export const deleteCategory = async (categoryId) => {
  return deleteDocument('categories', categoryId);
};

export const getCategories = async () => {
  return getDocuments('categories', [orderBy('createdAt', 'asc')]);
};

// ==================== NOTIFICATIONS ====================

export const createNotification = async (notificationData) => {
  return addDocument('notifications', notificationData);
};

export const getUserNotifications = async (userId) => {
  const constraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50),
  ];
  return getDocuments('notifications', constraints);
};

export const markNotificationRead = async (notificationId) => {
  return updateDocument('notifications', notificationId, { read: true });
};

export const markAllNotificationsRead = async (userId) => {
  try {
    const { data: notifications, error } = await getUserNotifications(userId);
    if (error) return { error };

    const updatePromises = notifications
      .filter((n) => !n.read)
      .map((n) => updateDocument('notifications', n.id, { read: true }));

    await Promise.all(updatePromises);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// ==================== USERS (Admin) ====================

export const getUserProfile = async (uid) => {
  return getDocument('users', uid);
};

export const updateUserProfile = async (uid, data) => {
  return updateDocument('users', uid, data);
};

export const getAllUsers = async () => {
  return getDocuments('users', [orderBy('createdAt', 'desc')]);
};

export { db, storage, Timestamp, serverTimestamp, increment, query, where, orderBy, limit };