'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { cachedQuery, invalidateCache } from '@/lib/cache';
import { 
  FiSearch, 
  FiFilter, 
  FiUser,
  FiMail,
  FiCalendar,
  FiDollarSign,
  FiEdit3,
  FiShoppingBag,
  FiActivity,
  FiShield,
  FiKey,
  FiTrash2,
  FiSlash,
  FiUnlock,
  FiLock,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import { useCurrency } from '@/context/CurrencyContext';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const WORKER_URL = 'https://smm-proxy.ms8347750.workers.dev';
async function getAuthToken() {
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

async function apiCall(endpoint, options = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/admin${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

export default function UsersManagement() {
  const { format, currency, rates, currencies } = useCurrency();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [limitFilter, setLimitFilter] = useState(50); // 🚀 NEW: Default 50 users
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState('add');
  const [updating, setUpdating] = useState(false);

  // New admin action states
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [customBanHours, setCustomBanHours] = useState('24');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showPasswords, setShowPasswords] = useState({}); // Track which user's password is visible
  const [secretsMap, setSecretsMap] = useState({}); // Admin-only passwords from userSecrets

  // Get password from admin-only secrets collection (fallback to legacy user doc)
  const getPassword = (u) => (u?.id && secretsMap[u.id]) || (u?.uid && secretsMap[u.uid]) || u?.password || '';

  const statusOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'active', label: 'Active Users' },
    { value: 'inactive', label: 'Inactive Users' },
    { value: 'banned', label: 'Banned Users' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, statusFilter, limitFilter, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching admin users...');
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      
      // Use proper cache key for admin users
      const usersSnapshot = await cachedQuery('admin:users:list', () => getDocs(usersQuery), 60000); // 1 min cache
      
      // 🔒 Fetch admin-only passwords from userSecrets collection (users can't read these)
      try {
        const secretsSnapshot = await cachedQuery('admin:userSecrets', () => getDocs(collection(db, 'userSecrets')), 60000);
        const secretsMapData = {};
        secretsSnapshot.docs.forEach(d => { secretsMapData[d.id] = d.data().password || ''; });
        setSecretsMap(secretsMapData);
      } catch (secretErr) {
        console.warn('⚠️ Failed to load user secrets:', secretErr.message);
      }
      
      console.log(`✅ Fetched ${usersSnapshot.docs.length} users`);
      
      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = { id: userDoc.id, ...userDoc.data() };
          
          // Fetch user's order count and total spending
          try {
            const ordersSnapshot = await cachedQuery(`admin:userOrders:${userData.uid}`, () => getDocs(
              query(collection(db, 'orders'), where('userId', '==', userData.uid))
            ), 60000); // 1 min cache
            
            userData.orderCount = ordersSnapshot.size;
            userData.totalSpent = ordersSnapshot.docs.reduce((total, orderDoc) => {
              return total + (orderDoc.data().charge || 0);
            }, 0);
            
            // Check if user is online (active in last 5 minutes)
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            userData.isOnline = userData.lastActive && userData.lastActive.toDate() > tenMinutesAgo;
          } catch (err) {
            console.error(`❌ Error fetching orders for user ${userData.uid}:`, err);
            userData.orderCount = 0;
            userData.totalSpent = 0;
            userData.isOnline = false;
          }
          
          return userData;
        })
      );
      
      console.log('✅ Users data processed successfully');
      setUsers(usersData);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.isOnline);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.isOnline);
    } else if (statusFilter === 'banned') {
      filtered = filtered.filter(user => user.banned === true || user.disabled === true);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 🚀 Limit filter - show only specified number of users
    filtered = filtered.slice(0, limitFilter);

    setFilteredUsers(filtered);
  };

  const updateUserBalance = async (userId, amount, type) => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setUpdating(true);
    try {
      const userRef = doc(db, 'users', userId);
      const user = users.find(u => u.id === userId);
      const currentBalance = user.walletBalance || 0;
      
      const amountInPKR = parseFloat(amount);
      
      let newBalance;
      if (type === 'add') {
        newBalance = currentBalance + amountInPKR;
      } else if (type === 'subtract') {
        newBalance = Math.max(0, currentBalance - amountInPKR);
      } else if (type === 'set') {
        newBalance = amountInPKR;
      } else {
        toast.error('Invalid operation type');
        setUpdating(false);
        return;
      }
      
      await updateDoc(userRef, {
        walletBalance: newBalance,
        updatedAt: Timestamp.now(),
      });
      
      toast.success(
        `Balance ${type === 'add' ? 'added' : type === 'subtract' ? 'subtracted' : 'updated'} successfully!\nNew balance: ₨${newBalance.toFixed(2)}`
      );
      
      fetchUsers();
      invalidateCache(`collection:users:uid:${userId}`);
      invalidateCache(`collection:users:email:${user?.email}`);
      invalidateCache('admin:users:list');
      setShowBalanceModal(false);
      setBalanceAmount('');
    } catch (error) {
      console.error('Error updating user balance:', error);
      toast.error('Failed to update user balance: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Fetch user details from backend (Auth info + providers)
  const fetchUserDetails = async (userId) => {
    try {
      // Try server API first
      try {
        const res = await apiCall(`/users/${userId}/details`);
        if (res.success) {
          setSelectedUserDetails(res.data);
          setShowUserDetails(true);
          return;
        }
      } catch (err) {
        console.warn('Auth details API unavailable, falling back to Firestore');
      }

      // Fallback: read user doc from Firestore and synthesize minimal auth details
      const q = query(collection(db, 'users'), where('uid', '==', userId));
      const snap = await cachedQuery(`collection:users:uid:${userId}`, () => getDocs(q));
      if (!snap.empty) {
        const userDoc = snap.docs[0].data();
        const fallback = {
          loginMethod: userDoc.provider || 'email',
          providers: [{ providerId: userDoc.provider === 'google' ? 'google.com' : 'password', email: userDoc.email }],
          disabled: userDoc.disabled || false,
          emailVerified: userDoc.emailVerified || false,
          creationTime: userDoc.createdAt ? userDoc.createdAt.toDate().toISOString() : null,
          lastSignInTime: userDoc.lastActive ? userDoc.lastActive.toDate().toISOString() : null,
        };
        setSelectedUserDetails(fallback);
        setShowUserDetails(true);
      } else {
        toast.error('No user details available');
      }
    } catch (err) {
      console.error('fetchUserDetails error:', err);
      toast.error('Failed to fetch user details');
    }
  };

  // Ban / Unban user with custom hours
  const handleToggleBan = async (ban) => {
    if (!selectedUser) return;
    
    // Validate custom ban hours
    if (ban && banDuration === 'custom') {
      const hours = parseFloat(customBanHours);
      if (isNaN(hours) || hours <= 0) {
        toast.error('Please enter valid hours (greater than 0)');
        return;
      }
    }
    
    setUpdating(true);
    try {
      // Calculate ban expiry for temporary bans
      let banExpiresAt = null;
      let banDurationText = 'permanently';
      
      if (ban && banDuration === 'custom') {
        const hours = parseFloat(customBanHours);
        const now = new Date();
        now.setHours(now.getHours() + hours);
        banExpiresAt = now;
        banDurationText = `for ${hours} hour${hours > 1 ? 's' : ''}`;
      }

      // Update Firestore user doc
      const userRef = doc(db, 'users', selectedUser.id);
      const updateData = {
        banned: ban,
        disabled: ban,
        updatedAt: Timestamp.now(),
      };
      
      if (ban) {
        updateData.banReason = banReason || 'Banned by admin';
        updateData.banDuration = banDuration;
        updateData.banExpiresAt = banExpiresAt ? Timestamp.fromDate(banExpiresAt) : null;
        updateData.bannedAt = Timestamp.now();
      } else {
        updateData.banReason = null;
        updateData.banDuration = null;
        updateData.banExpiresAt = null;
        updateData.bannedAt = null;
      }
      
      await updateDoc(userRef, updateData);
      
      toast.success(
        ban 
          ? `User banned ${banDurationText} successfully` 
          : 'User unbanned successfully'
      );
      
      setShowBanModal(false);
      setBanReason('');
      setBanDuration('permanent');
      setCustomBanHours('24');
      fetchUsers();
      invalidateCache(`collection:users:uid:${selectedUser.id}`);
      invalidateCache(`collection:users:email:${selectedUser?.email}`);
      invalidateCache('admin:users:list');
    } catch (err) {
      console.error('handleToggleBan error:', err);
      toast.error(err.message || 'Failed to update ban status');
    } finally {
      setUpdating(false);
    }
  };

  // Delete user permanently (Firestore direct - no backend needed)
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      const userId = selectedUser.id;
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userId));
      console.log('✅ User deleted from Firestore');
      
      // Delete user's related data
      // Delete orders (unique cache key per user - avoid collection:orders collision)
      const ordersQuery = query(collection(db, 'orders'), where('userId', '==', userId));
      const ordersSnapshot = await cachedQuery(`collection:orders:user:${userId}`, () => getDocs(ordersQuery));
      const orderDeletePromises = ordersSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(orderDeletePromises);

      // Delete transactions (unique cache key)
      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
      const transactionsSnapshot = await cachedQuery(`collection:transactions:user:${userId}`, () => getDocs(transactionsQuery));
      const transactionDeletePromises = transactionsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(transactionDeletePromises);

      // Delete notifications (unique cache key)
      const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
      const notificationsSnapshot = await cachedQuery(`collection:notifications:user:${userId}`, () => getDocs(notificationsQuery));
      const notificationDeletePromises = notificationsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(notificationDeletePromises);
      
      console.log('✅ User related data deleted');
      
      toast.success('User deleted successfully from Firestore');
      setShowDeleteConfirm(false);
      setShowDetailsModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Delete user error:', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setUpdating(false);
    }
  };

  // Update user email - only for email/password users
  const handleUpdateEmail = async () => {
    if (!selectedUser || !newEmail) return;
    
    // Check if user is Google user
    if (!isEmailUser(selectedUser)) {
      toast.error('Cannot change email for Google login users');
      return;
    }
    
    setUpdating(true);
    try {
      // Update Firestore only (backend needed for Firebase Auth update)
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        email: newEmail,
        emailVerified: false,
        updatedAt: Timestamp.now(),
      });
      toast.success('Email updated in Firestore. Backend deployment needed to update Firebase Auth.');
      setShowEmailModal(false);
      setNewEmail('');
      fetchUsers();
    } catch (err) {
      console.error('handleUpdateEmail error:', err);
      toast.error(err.message || 'Failed to update email');
    } finally {
      setUpdating(false);
    }
  };

  // Update user password - only for email/password users
  const handleUpdatePassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    // Check if user is Google user
    if (!isEmailUser(selectedUser)) {
      toast.error('Cannot change password for Google login users');
      return;
    }
    
    setUpdating(true);
    try {
      // Use backend API
      await apiCall(`/users/${selectedUser.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });
      
      toast.success('Password updated successfully (no email sent)');
      setShowPasswordModal(false);
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      console.error('handleUpdatePassword error:', err);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  const formatAmountFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return format(0);
    if (currency === 'PKR') {
      const currencyObj = currencies.find(c => c.code === 'PKR');
      const symbol = currencyObj?.symbol || '₨';
      return `${symbol}${pkrAmount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
    }
    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];
    const currencyObj = currencies.find(c => c.code === currency);
    const symbol = currencyObj?.symbol || currency;
    const formattedStr = converted.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `${symbol}${formattedStr}`;
  };

  const getLoginMethodDisplay = (user) => {
    const isPasswordVisible = showPasswords[user.id] || false;
    
    const isGoogle = user.provider === 'google' || user.loginMethod === 'google';
    
    if (isGoogle) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-dark-900 dark:text-white truncate max-w-[250px]">
            {user.email}
          </span>
          <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Google
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-dark-900 dark:text-white truncate max-w-[250px]">
          {user.email}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-green-600 dark:text-green-400 select-all">
            🔐 {isPasswordVisible ? getPassword(user) : '••••••••'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPasswords(prev => ({
                ...prev,
                [user.id]: !prev[user.id]
              }));
            }}
            className="text-dark-400 hover:text-primary-500 transition-colors"
            title={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <FiEyeOff className="text-xs" /> : <FiEye className="text-xs" />}
          </button>
        </div>
      </div>
    );
  };

  const isEmailUser = (user) => {
    return user.provider !== 'google' && user.loginMethod !== 'google';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
          Users Management
        </h2>
        <p className="text-dark-500 dark:text-dark-400">
          Manage users — balance, ban, delete, email, password
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Search by email, name, or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <select
              value={limitFilter}
              onChange={(e) => setLimitFilter(parseInt(e.target.value))}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              <option value={50}>Last 50 Users</option>
              <option value={100}>Last 100 Users</option>
              <option value={1000}>Last 1,000 Users</option>
              <option value={10000}>Last 10,000 Users</option>
              <option value={100000}>Last 100,000 Users</option>
              <option value={999999999}>All Users</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{users.length}</p>
            <p className="text-xs text-dark-500">Total Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{users.filter(u => u.isOnline).length}</p>
            <p className="text-xs text-dark-500">Online Now</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{users.filter(u => u.banned || u.disabled).length}</p>
            <p className="text-xs text-dark-500">Banned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {formatAmountFromPKR(users.reduce((s, u) => s + (u.walletBalance || 0), 0))}
            </p>
            <p className="text-xs text-dark-500">Total Balance</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20"><Spinner /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-dark-500 dark:text-dark-400">No users found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-100 dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Login</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">2FA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors ${user.banned || user.disabled ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-500/20 flex-shrink-0">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&size=200&background=random`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                              {user.displayName?.[0] || user.email?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-dark-900 dark:text-white text-sm flex items-center gap-1.5">
                            {user.displayName || 'User'}
                            {(user.banned || user.disabled) && <FiSlash className="text-red-500 text-xs" />}
                          </p>
                          <p className="text-xs text-dark-500 font-mono">
                            #{user.uid?.substring(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getLoginMethodDisplay(user)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {formatAmountFromPKR(user.walletBalance || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-dark-900 dark:text-white">
                        {user.orderCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.banned || user.disabled
                          ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                          : user.isOnline 
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                      }`}>
                        <span className={`flex h-2 w-2 ${user.isOnline && !user.banned ? 'animate-pulse' : ''}`}>
                          <span className={`inline-flex h-2 w-2 rounded-full ${
                            user.banned || user.disabled ? 'bg-red-400' : user.isOnline ? 'bg-green-400' : 'bg-gray-400'
                          }`}></span>
                        </span>
                        {user.banned || user.disabled ? 'Banned' : user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.twoFactorEnabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                        }`}>
                          <FiShield className="text-xs" />
                          {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        {user.twoFactorEnabled && (
                          <button
                            onClick={async () => {
                              if (confirm(`Disable 2FA for ${user.displayName || user.email}?`)) {
                                try {
                                  const userRef = doc(db, 'users', user.id);
                                  await updateDoc(userRef, {
                                    twoFactorEnabled: false,
                                    twoFactorSecret: null,
                                    updatedAt: Timestamp.now(),
                                  });
                                  toast.success('2FA disabled successfully');
                                  fetchUsers();
                                } catch (err) {
                                  console.error('Disable 2FA error:', err);
                                  toast.error('Failed to disable 2FA');
                                }
                              }
                            }}
                            className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                            title="Disable 2FA"
                          >
                            <FiSlash className="text-xs" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBalanceModal(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
                        >
                          Balance
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBanModal(true);
                            setBanReason('');
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors"
                        >
                          {user.banned || user.disabled ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============== USER DETAILS MODAL ============== */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-primary-500/20 flex-shrink-0">
                    {selectedUser.photoURL ? (
                      <img
                        src={selectedUser.photoURL}
                        alt={selectedUser.displayName || 'User'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.displayName || selectedUser.email || 'User')}&size=200&background=random`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {selectedUser.displayName?.[0] || selectedUser.email?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">
                      {selectedUser.displayName || 'User'}
                    </h3>
                    <p className="text-sm text-dark-500">{selectedUser.email}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {getLoginMethodDisplay(selectedUser)}
                    </div>
                    {(selectedUser.banned || selectedUser.disabled) && selectedUser.banReason && (
                      <div className="mt-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">🚫 Ban Reason:</p>
                        <p className="text-sm text-red-600 dark:text-red-300">{selectedUser.banReason}</p>
                        {selectedUser.banExpiresAt && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                            Expires: {selectedUser.banExpiresAt.toDate().toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-2xl">×</button>
              </div>

              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiDollarSign className="text-primary-500 text-2xl mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-900 dark:text-white">{formatAmountFromPKR(selectedUser.walletBalance || 0)}</p>
                    <p className="text-xs text-dark-500">Wallet Balance</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiShoppingBag className="text-blue-500 text-2xl mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-900 dark:text-white">{selectedUser.orderCount || 0}</p>
                    <p className="text-xs text-dark-500">Orders</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiShield className="text-purple-500 text-2xl mx-auto mb-2" />
                    <p className="text-lg font-bold text-dark-900 dark:text-white">{selectedUser.twoFactorEnabled ? '2FA On' : '2FA Off'}</p>
                    <p className="text-xs text-dark-500">Security</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    {selectedUser.banned || selectedUser.disabled ? (
                      <FiLock className="text-red-500 text-2xl mx-auto mb-2" />
                    ) : (
                      <FiUnlock className="text-green-500 text-2xl mx-auto mb-2" />
                    )}
                    <p className="text-lg font-bold text-dark-900 dark:text-white">
                      {selectedUser.banned || selectedUser.disabled ? 'Banned' : 'Active'}
                    </p>
                    <p className="text-xs text-dark-500">Account Status</p>
                  </div>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-dark-500 mb-1">User ID</p>
                    <p className="text-sm font-mono text-dark-900 dark:text-white break-all">{selectedUser.uid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Login Method</p>
                    <div className="flex items-center gap-2">
                      {isEmailUser(selectedUser) ? (
                        <span className="text-sm text-dark-900 dark:text-white">🔐 Email/Password</span>
                      ) : (
                        <span className="text-sm text-dark-900 dark:text-white flex items-center gap-1">🔵 Google</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Email Verified</p>
                    <p className="text-sm text-dark-900 dark:text-white">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
                  </div>
                  {isEmailUser(selectedUser) && getPassword(selectedUser) && (
                    <div>
                      <p className="text-xs text-dark-500 mb-1">Password</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono text-dark-900 dark:text-white select-all">
                          {showPasswords[selectedUser.id + '_detail'] ? getPassword(selectedUser) : '••••••••'}
                        </p>
                        <button
                          onClick={() => setShowPasswords(prev => ({
                            ...prev,
                            [selectedUser.id + '_detail']: !prev[selectedUser.id + '_detail']
                          }))}
                          className="text-dark-400 hover:text-primary-500 transition-colors"
                        >
                          {showPasswords[selectedUser.id + '_detail'] ? <FiEyeOff className="text-xs" /> : <FiEye className="text-xs" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Account Created</p>
                    <p className="text-sm text-dark-900 dark:text-white">{selectedUser.createdAt?.toDate().toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Last Active</p>
                    <p className="text-sm text-dark-900 dark:text-white">
                      {selectedUser.lastActive ? selectedUser.lastActive.toDate().toLocaleString() : 'Never'}
                    </p>
                  </div>
                  {selectedUser.banned && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-red-500 mb-1">Ban Reason</p>
                      <p className="text-sm text-red-600 dark:text-red-400">{selectedUser.banReason || 'No reason provided'}</p>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
                  <p className="text-sm font-semibold text-dark-900 dark:text-white mb-4 text-lg">⚡ Admin Actions</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowBalanceModal(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/20 rounded-xl font-medium text-sm transition-all"
                    >
                      <FiDollarSign /> Balance
                    </button>
                    <button
                      onClick={() => fetchUserDetails(selectedUser.uid)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/20 rounded-xl font-medium text-sm transition-all"
                    >
                      <FiEye /> Auth Info
                    </button>
                    <button
                      onClick={() => {
                        setShowBanModal(true);
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                        selectedUser.banned || selectedUser.disabled
                          ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/20'
                          : 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-500/20'
                      }`}
                    >
                      {selectedUser.banned || selectedUser.disabled ? <FiUnlock /> : <FiSlash />}
                      {selectedUser.banned || selectedUser.disabled ? 'Unban' : 'Ban'}
                    </button>
                    {isEmailUser(selectedUser) && (
                      <>
                        <button
                          onClick={() => setShowEmailModal(true)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/20 rounded-xl font-medium text-sm transition-all"
                        >
                          <FiMail /> Change Email
                        </button>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 rounded-xl font-medium text-sm transition-all"
                        >
                          <FiKey /> Reset Password
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20 rounded-xl font-medium text-sm transition-all"
                    >
                      <FiTrash2 /> Delete User
                    </button>
                  </div>
                  {!isEmailUser(selectedUser) && (
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-3 text-center">
                      ℹ️ Email/Password changes are only available for email-registered users
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== BALANCE MODAL ============== */}
      {showBalanceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                  Update Balance — {selectedUser.displayName || selectedUser.email}
                </h3>
                <button onClick={() => { setShowBalanceModal(false); setBalanceAmount(''); }} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl">×</button>
              </div>

              <div className="space-y-4">
                <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                  <p className="text-sm text-dark-500 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-primary-600">{formatAmountFromPKR(selectedUser.walletBalance || 0)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">Action</label>
                  <select
                    value={balanceType}
                    onChange={(e) => setBalanceType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="add">Add Balance</option>
                    <option value="subtract">Subtract Balance</option>
                    <option value="set">Set Balance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">Amount in PKR (₨)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 font-semibold">₨</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      placeholder="Enter amount in PKR"
                      className="w-full pl-8 pr-4 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {balanceAmount && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg border border-blue-200 dark:border-blue-500/30">
                    <p className="text-xs text-dark-500 dark:text-dark-400 mb-2">Preview:</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {balanceType === 'add' && `New balance: ₨${((selectedUser.walletBalance || 0) + parseFloat(balanceAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {balanceType === 'subtract' && `New balance: ₨${Math.max(0, (selectedUser.walletBalance || 0) - parseFloat(balanceAmount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {balanceType === 'set' && `New balance: ₨${parseFloat(balanceAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button onClick={() => { setShowBalanceModal(false); setBalanceAmount(''); }} className="flex-1 btn-outline">Cancel</button>
                  <button onClick={() => updateUserBalance(selectedUser.id, balanceAmount, balanceType)} disabled={!balanceAmount || updating} className="flex-1 btn-primary">
                    {updating ? 'Updating...' : 'Update Balance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== BAN / UNBAN MODAL ============== */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                  {selectedUser.banned || selectedUser.disabled ? 'Unban User' : 'Ban User'}
                </h3>
                <button onClick={() => setShowBanModal(false)} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl">×</button>
              </div>

              <div className="space-y-4">
                <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg">
                  <p className="text-sm text-dark-700 dark:text-dark-300">
                    <strong>User:</strong> {selectedUser.displayName || selectedUser.email}
                  </p>
                  <p className="text-sm text-dark-500 mt-1">
                    Current status: <strong>{selectedUser.banned || selectedUser.disabled ? '🚫 Banned' : '✅ Active'}</strong>
                  </p>
                  {selectedUser.banned && selectedUser.banReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      <strong>Reason:</strong> {selectedUser.banReason}
                    </p>
                  )}
                  {selectedUser.banned && selectedUser.banExpiresAt && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      <strong>Expires:</strong> {selectedUser.banExpiresAt.toDate().toLocaleString()}
                    </p>
                  )}
                </div>

                {!(selectedUser.banned || selectedUser.disabled) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        Ban Duration
                      </label>
                      <select
                        value={banDuration}
                        onChange={(e) => setBanDuration(e.target.value)}
                        className="w-full px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="permanent">⏱️ Permanent Ban</option>
                        <option value="custom">⏰ Custom Hours</option>
                      </select>
                    </div>
                    
                    {banDuration === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                          Number of Hours
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={customBanHours}
                          onChange={(e) => setCustomBanHours(e.target.value)}
                          placeholder="Enter hours (e.g., 24, 48, 72)"
                          className="w-full px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <p className="text-xs text-dark-500 mt-1">
                          User will be automatically unbanned after {customBanHours || '0'} hour{customBanHours !== '1' ? 's' : ''}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                        Ban Reason (will be shown to user)
                      </label>
                      <textarea
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Enter reason for ban (e.g., Violating terms of service, Spamming, Fraud attempt)..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowBanModal(false)} className="flex-1 btn-outline">Cancel</button>
                  <button
                    onClick={() => handleToggleBan(!(selectedUser.banned || selectedUser.disabled))}
                    disabled={updating}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-white transition-all ${
                      selectedUser.banned || selectedUser.disabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {updating ? 'Processing...' : selectedUser.banned || selectedUser.disabled ? '✅ Unban User' : '🚫 Ban User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== CHANGE EMAIL MODAL ============== */}
      {showEmailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">Change Email</h3>
                <button onClick={() => setShowEmailModal(false)} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl">×</button>
              </div>

              <div className="space-y-4">
                <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg">
                  <p className="text-sm text-dark-500 mb-1">Current Email</p>
                  <p className="text-sm font-semibold text-dark-900 dark:text-white">{selectedUser.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="newemail@example.com"
                    className="w-full px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowEmailModal(false)} className="flex-1 btn-outline">Cancel</button>
                  <button onClick={handleUpdateEmail} disabled={!newEmail || updating} className="flex-1 btn-primary">
                    {updating ? 'Updating...' : 'Update Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== CHANGE PASSWORD MODAL ============== */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">Reset Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl">×</button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-lg border border-blue-200 dark:border-blue-500/30">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    ⚠️ A password reset email will be sent to the user. They can set a new password via the link.
                  </p>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-2">
                    (Backend deployment needed for direct password change by admin)
                  </p>
                </div>

                <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg">
                  <p className="text-sm text-dark-700 dark:text-dark-300">
                    <strong>User:</strong> {selectedUser.displayName || selectedUser.email}
                  </p>
                  <p className="text-sm text-dark-500 mt-1">
                    <strong>Email:</strong> {selectedUser.email}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowPasswordModal(false)} className="flex-1 btn-outline">Cancel</button>
                  <button onClick={handleUpdatePassword} disabled={updating} className="flex-1 btn-primary">
                    {updating ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== DELETE CONFIRMATION MODAL ============== */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full border-red-500/30">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="text-red-600 dark:text-red-400 text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">Delete User Permanently?</h3>
                <p className="text-sm text-dark-500">
                  This action <strong className="text-red-600">cannot be undone</strong>. The user will be permanently deleted from Firebase Auth and Firestore.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-lg mb-4">
                <p className="text-sm text-dark-700 dark:text-dark-300">
                  <strong>User:</strong> {selectedUser.displayName || selectedUser.email}
                </p>
                <p className="text-sm text-dark-500 mt-1">
                  All orders, transactions, and data will be lost.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-outline">Cancel</button>
                <button onClick={handleDeleteUser} disabled={updating} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all">
                  {updating ? 'Deleting...' : '🗑️ Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============== USER AUTH DETAILS MODAL ============== */}
      {showUserDetails && selectedUserDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">Auth Details</h3>
                <button onClick={() => { setShowUserDetails(false); setSelectedUserDetails(null); }} className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl">×</button>
              </div>

              <div className="space-y-4">
                {/* Login Method */}
                <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg">
                  <p className="text-xs text-dark-500 mb-1">Login Method</p>
                  <p className="text-lg font-bold">
                    {selectedUserDetails.loginMethod === 'google' ? (
                      <span className="text-blue-600 dark:text-blue-400">🔵 Google Login</span>
                    ) : selectedUserDetails.loginMethod === 'email' || selectedUserDetails.loginMethod === 'password' ? (
                      <span className="text-green-600 dark:text-green-400">📧 Email / Password</span>
                    ) : (
                      <span className="text-gray-600">{selectedUserDetails.loginMethod}</span>
                    )}
                  </p>
                </div>

                {/* Auth Providers */}
                <div>
                  <p className="text-xs text-dark-500 mb-2">Linked Providers</p>
                  {selectedUserDetails.providers?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUserDetails.providers.map((p, i) => (
                        <div key={i} className="bg-dark-50 dark:bg-dark-800 p-3 rounded-lg">
                          <p className="text-sm font-semibold text-dark-900 dark:text-white">
                            {p.providerId === 'google.com' ? '🟢 Google' : p.providerId === 'password' ? '🔐 Email/Password' : p.providerId}
                          </p>
                          {p.email && <p className="text-xs text-dark-500 mt-0.5">{p.email}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-dark-400">No provider data</p>
                  )}
                </div>

                {/* Auth Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-50 dark:bg-dark-800 p-3 rounded-lg">
                    <p className="text-xs text-dark-500">Account Disabled</p>
                    <p className="text-sm font-semibold">{selectedUserDetails.disabled ? 'Yes 🚫' : 'No ✅'}</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-3 rounded-lg">
                    <p className="text-xs text-dark-500">Email Verified</p>
                    <p className="text-sm font-semibold">{selectedUserDetails.emailVerified ? 'Yes ✅' : 'No ❌'}</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-3 rounded-lg">
                    <p className="text-xs text-dark-500">Created</p>
                    <p className="text-sm font-semibold">{selectedUserDetails.creationTime ? new Date(selectedUserDetails.creationTime).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-3 rounded-lg">
                    <p className="text-xs text-dark-500">Last Login</p>
                    <p className="text-sm font-semibold">{selectedUserDetails.lastSignInTime ? new Date(selectedUserDetails.lastSignInTime).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}