'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
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
  FiKey
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import { useCurrency } from '@/context/CurrencyContext';
import toast from 'react-hot-toast';

export default function UsersManagement() {
  const { format, currency, rates, currencies } = useCurrency();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState('add');
  const [updating, setUpdating] = useState(false);

  // Convert PKR amount to selected currency for display
  const formatAmountFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return format(0);
    
    // PKR amounts are base amounts in database
    if (currency === 'PKR') {
      const currencyObj = currencies.find(c => c.code === 'PKR');
      const symbol = currencyObj?.symbol || '₨';
      return `${symbol}${pkrAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }

    // Convert PKR to USD first, then to target currency
    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];

    // Get currency symbol
    const currencyObj = currencies.find(c => c.code === currency);
    const symbol = currencyObj?.symbol || currency;

    // Format with proper decimals
    let decimals = 2;
    if (['PKR', 'BDT', 'INR', 'SAR', 'AED'].includes(currency)) {
      decimals = converted < 10 ? 4 : 0;
    }

    const formattedStr = converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${symbol}${formattedStr}`;
  };

  // Convert from selected currency to PKR for storage
  const convertToPKR = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    
    if (currency === 'PKR') {
      return parseFloat(amount);
    }

    // Convert from current currency to USD, then to PKR
    const usdAmount = amount / rates[currency];
    const pkrAmount = usdAmount * rates.PKR;
    return pkrAmount;
  };

  const statusOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'active', label: 'Active Users' },
    { value: 'inactive', label: 'Inactive Users' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, statusFilter, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersData = await Promise.all(
        usersSnapshot.docs.map(async (userDoc) => {
          const userData = { id: userDoc.id, ...userDoc.data() };
          
          // Fetch user's order count and total spending
          try {
            const ordersSnapshot = await getDocs(
              query(collection(db, 'orders'), where('userId', '==', userData.uid))
            );
            
            userData.orderCount = ordersSnapshot.size;
            userData.totalSpent = ordersSnapshot.docs.reduce((total, orderDoc) => {
              return total + (orderDoc.data().charge || 0);
            }, 0);
            
            // Check if user is online (active in last 5 minutes)
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            userData.isOnline = userData.lastActive && userData.lastActive.toDate() > fiveMinutesAgo;
          } catch (err) {
            console.error('Error fetching user orders:', err);
            userData.orderCount = 0;
            userData.totalSpent = 0;
            userData.isOnline = false;
          }
          
          return userData;
        })
      );
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
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
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.uid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const updateUserBalance = async (userId, amount, type) => {
    setUpdating(true);
    try {
      const userRef = doc(db, 'users', userId);
      const user = users.find(u => u.id === userId);
      const currentBalance = user.walletBalance || 0;
      
      // CRITICAL: Admin always enters amounts in PKR - NO CONVERSION NEEDED
      // All wallet balances are stored in PKR
      const amountInPKR = parseFloat(amount);
      
      // Validate amount
      if (isNaN(amountInPKR) || amountInPKR < 0) {
        toast.error('Invalid amount');
        setUpdating(false);
        return;
      }
      
      console.log('Admin Balance Update:', {
        userId,
        currentBalance,
        amountEntered: amount,
        amountInPKR: amountInPKR,
        type: type,
        adminCurrency: currency,
        note: 'Admin entered amount is ALWAYS in PKR'
      });
      
      let newBalance;
      if (type === 'add') {
        newBalance = currentBalance + amountInPKR;
      } else if (type === 'subtract') {
        newBalance = Math.max(0, currentBalance - amountInPKR);
      } else {
        newBalance = amountInPKR;
      }
      
      await updateDoc(userRef, {
        walletBalance: newBalance, // Use walletBalance
        updatedAt: new Date(),
      });
      
      toast.success(
        `Balance ${type === 'add' ? 'added' : type === 'subtract' ? 'subtracted' : 'updated'} successfully!\n` +
        `New balance: ₨${newBalance.toFixed(2)} PKR`
      );
      
      fetchUsers();
      setShowBalanceModal(false);
      setBalanceAmount('');
    } catch (error) {
      console.error('Error updating user balance:', error);
      toast.error('Failed to update user balance');
    } finally {
      setUpdating(false);
    }
  };
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
          Users Management
        </h2>
        <p className="text-dark-500 dark:text-dark-400">
          View and manage all registered users
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
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

          {/* Status Filter */}
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
            <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.twoFactorEnabled).length}</p>
            <p className="text-xs text-dark-500">2FA Enabled</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-cyan-600">{users.filter(u => u.apiKey).length}</p>
            <p className="text-xs text-dark-500">API Users</p>
          </div>
        </div>
      </div>
      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Spinner />
        </div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">2FA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">API</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-500/20">
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
                          <p className="font-semibold text-dark-900 dark:text-white text-sm">
                            {user.displayName || 'User'}
                          </p>
                          <p className="text-xs text-dark-500 font-mono">
                            #{user.uid?.substring(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-dark-700 dark:text-dark-300">
                        {user.email}
                      </span>
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
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                          <FiShield className="text-sm" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.apiKey ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400">
                          <FiKey className="text-sm" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.isOnline 
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                      }`}>
                        <span className={`flex h-2 w-2 ${user.isOnline ? 'animate-pulse' : ''}`}>
                          <span className={`inline-flex h-2 w-2 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                        </span>
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBalanceModal(true);
                          }}
                          className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-sm font-medium"
                        >
                          Balance
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
      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-primary-500/20">
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
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* User Stats */}
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
                    <p className="text-lg font-bold text-dark-900 dark:text-white">{selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                    <p className="text-xs text-dark-500">2FA Status</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiKey className="text-cyan-500 text-2xl mx-auto mb-2" />
                    <p className="text-lg font-bold text-dark-900 dark:text-white">{selectedUser.apiKey ? 'Active' : 'None'}</p>
                    <p className="text-xs text-dark-500">API Key</p>
                  </div>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-dark-500 mb-1">User ID</p>
                    <p className="text-sm font-mono text-dark-900 dark:text-white">{selectedUser.uid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Email Verified</p>
                    <p className="text-sm text-dark-900 dark:text-white">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
                  </div>
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
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Two-Factor Auth</p>
                    <p className="text-sm font-semibold text-dark-900 dark:text-white">
                      {selectedUser.twoFactorEnabled ? (
                        <span className="text-purple-600 dark:text-purple-400">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">✗ Disabled</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">API Access</p>
                    <p className="text-sm font-semibold text-dark-900 dark:text-white">
                      {selectedUser.apiKey ? (
                        <span className="text-cyan-600 dark:text-cyan-400">✓ Active</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">✗ No Key</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
                  <p className="text-sm font-semibold text-dark-900 dark:text-white mb-3">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowBalanceModal(true);
                      }}
                      className="btn-primary btn-sm flex items-center gap-2"
                    >
                      <FiEdit3 />
                      Edit Balance
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Balance Update Modal */}
      {showBalanceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                  Update Balance
                </h3>
                <button
                  onClick={() => {
                    setShowBalanceModal(false);
                    setBalanceAmount('');
                  }}
                  className="text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Current Balance */}
                <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                  <p className="text-sm text-dark-500 mb-1">Current Balance</p>
                  <p className="text-2xl font-bold text-primary-600">{formatAmountFromPKR(selectedUser.walletBalance || 0)}</p>
                </div>

                {/* Balance Type */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                    Action
                  </label>
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

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                    Amount in PKR (₨)
                  </label>
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
                  <p className="text-xs text-dark-400 mt-1">
                    ⚠️ Always enter amount in PKR. Do not convert!
                  </p>
                </div>

                {/* Preview */}
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

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      setBalanceAmount('');
                    }}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateUserBalance(selectedUser.id, balanceAmount, balanceType)}
                    disabled={!balanceAmount || updating}
                    className="flex-1 btn-primary"
                  >
                    {updating ? 'Updating...' : 'Update Balance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}