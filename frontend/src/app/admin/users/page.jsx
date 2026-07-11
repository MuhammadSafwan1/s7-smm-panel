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
  FiActivity
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';

export default function UsersManagement() {
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
      const currentBalance = user.balance || 0;
      
      let newBalance;
      if (type === 'add') {
        newBalance = currentBalance + parseFloat(amount);
      } else if (type === 'subtract') {
        newBalance = Math.max(0, currentBalance - parseFloat(amount));
      } else {
        newBalance = parseFloat(amount);
      }
      
      await updateDoc(userRef, {
        balance: newBalance,
      });
      
      toast.success(`User balance updated successfully`);
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
            <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.orderCount > 0).length}</p>
            <p className="text-xs text-dark-500">Active Customers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              ${users.reduce((sum, u) => sum + (u.balance || 0), 0).toFixed(2)}
            </p>
            <p className="text-xs text-dark-500">Total Wallet Balance</p>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Total Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {user.displayName?.[0] || user.email?.[0] || 'U'}
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
                        ${(user.balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-dark-900 dark:text-white">
                        {user.orderCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-dark-900 dark:text-white">
                        ${(user.totalSpent || 0).toFixed(2)}
                      </span>
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
                      <span className="text-sm text-dark-600 dark:text-dark-400">
                        {user.createdAt?.toDate().toLocaleDateString()}
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                    {selectedUser.displayName?.[0] || selectedUser.email?.[0] || 'U'}
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
                    <p className="text-2xl font-bold text-dark-900 dark:text-white">${(selectedUser.balance || 0).toFixed(2)}</p>
                    <p className="text-xs text-dark-500">Balance</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiShoppingBag className="text-blue-500 text-2xl mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-900 dark:text-white">{selectedUser.orderCount || 0}</p>
                    <p className="text-xs text-dark-500">Orders</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiDollarSign className="text-green-500 text-2xl mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-900 dark:text-white">${(selectedUser.totalSpent || 0).toFixed(2)}</p>
                    <p className="text-xs text-dark-500">Total Spent</p>
                  </div>
                  <div className="bg-dark-50 dark:bg-dark-800 p-4 rounded-lg text-center">
                    <FiActivity className="text-purple-500 text-2xl mx-auto mb-2" />
                    <p className="text-2xl font-bold text-dark-900 dark:text-white">{selectedUser.isOnline ? 'Online' : 'Offline'}</p>
                    <p className="text-xs text-dark-500">Status</p>
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
                  <p className="text-2xl font-bold text-primary-600">${(selectedUser.balance || 0).toFixed(2)}</p>
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
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Preview */}
                {balanceAmount && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      {balanceType === 'add' && `New balance will be: $${((selectedUser.balance || 0) + parseFloat(balanceAmount)).toFixed(2)}`}
                      {balanceType === 'subtract' && `New balance will be: $${Math.max(0, (selectedUser.balance || 0) - parseFloat(balanceAmount)).toFixed(2)}`}
                      {balanceType === 'set' && `New balance will be: $${parseFloat(balanceAmount).toFixed(2)}`}
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