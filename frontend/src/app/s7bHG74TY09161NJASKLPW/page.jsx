'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, getCountFromServer } from 'firebase/firestore';
import { useCurrency } from '@/context/CurrencyContext';
import {
  FiUsers, FiShoppingBag, FiPackage, FiGrid,
  FiServer, FiLayers, FiDollarSign, FiActivity,
  FiTrendingUp, FiClock, FiRefreshCw,
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import { cachedQuery } from '@/lib/cache';

export default function AdminDashboard() {
  const { format, currency, rates, currencies } = useCurrency();

  // Convert PKR amount to selected currency for display
  const formatAmountFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return format(0);
    
    // PKR amounts are base amounts in database
    if (currency === 'PKR') {
      const currencyObj = currencies.find(c => c.code === 'PKR');
      const symbol = currencyObj?.symbol || '₨';
      return `${symbol}${pkrAmount.toLocaleString('en-US', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })}`;
    }

    // Convert PKR to USD first, then to target currency
    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];

    // Get currency symbol
    const currencyObj = currencies.find(c => c.code === currency);
    const symbol = currencyObj?.symbol || currency;

    // Always use 3 decimals for consistency
    const formattedStr = converted.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });

    return `${symbol}${formattedStr}`;
  };

  const [stats, setStats] = useState({
    totalUsers: 0, onlineUsers: 0, totalOrders: 0, totalServices: 0,
    totalCategories: 0, totalPlatforms: 0, totalProviders: 0,
    totalBalance: 0, totalSpent: 0, todayOrders: 0, todayUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers,  setRecentUsers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resettingInvestment, setResettingInvestment] = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);

  const handleResetInvestment = async () => {
    const confirmed = confirm(
      '⚠️ WARNING: This will reset "Total Spent" to 0 for ALL users!\n\nAre you sure you want to continue?'
    );
    
    if (!confirmed) return;

    setResettingInvestment(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      // Use batch update for efficiency
      const { writeBatch, doc: firestoreDoc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      usersSnapshot.docs.forEach(userDoc => {
        const userRef = firestoreDoc(db, 'users', userDoc.id);
        batch.update(userRef, { totalSpent: 0 });
      });
      
      await batch.commit();
      
      // Refresh dashboard data
      await fetchDashboardData();
      
      alert('✅ Total Investment reset to 0 successfully!');
    } catch (error) {
      console.error('Error resetting investment:', error);
      alert('❌ Failed to reset investment: ' + error.message);
    } finally {
      setResettingInvestment(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📊 Fetching admin dashboard data...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      // Helper function with retry logic for count queries
      const getCountWithRetry = async (queryRef, retries = 2) => {
        for (let i = 0; i < retries; i++) {
          try {
            const snapshot = await getCountFromServer(queryRef);
            return snapshot.data().count;
          } catch (err) {
            console.warn(`⚠️ Count query failed (attempt ${i + 1}/${retries}):`, err.message);
            if (i === retries - 1) return 0; // Last attempt failed, return 0
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
          }
        }
        return 0;
      };

      // Use individual cache keys for better granularity
      const [
        totalUsers, totalOrders, totalServices,
        totalCategories, totalPlatforms, totalProviders,
        onlineCount,
        todayOrders, todayUsers,
        recentOrdersData, recentUsersData,
        balanceData,
      ] = await Promise.all([
        getCountWithRetry(collection(db, 'users')),
        getCountWithRetry(collection(db, 'orders')),
        getCountWithRetry(collection(db, 'services')),
        getCountWithRetry(collection(db, 'categories')),
        getCountWithRetry(collection(db, 'platforms')),
        getCountWithRetry(collection(db, 'providers')),
        getCountWithRetry(query(collection(db, 'users'), where('lastSeen', '>=', new Date(Date.now() - 10 * 60 * 1000)))),
        getCountWithRetry(query(collection(db, 'orders'), where('createdAt', '>=', todayTimestamp))),
        getCountWithRetry(query(collection(db, 'users'), where('createdAt', '>=', todayTimestamp))),
        cachedQuery('admin:recentOrders', () => 
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5)))
            .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })))
            .catch(err => { console.error('Failed to fetch recent orders:', err); return []; })
        , 60000), // Cache for 1 minute
        cachedQuery('admin:recentUsers', () =>
          getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10)))
            .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => !u.banned && !u.disabled).slice(0, 5))
            .catch(err => { console.error('Failed to fetch recent users:', err); return []; })
        , 60000), // Cache for 1 minute
        cachedQuery('admin:balances', () => 
          getDocs(collection(db, 'users')).then(snap => {
            let totalBalance = 0, totalSpent = 0;
            snap.forEach(doc => {
              const d = doc.data();
              totalBalance += d.walletBalance || 0;
              totalSpent += d.totalSpent || 0;
            });
            return { totalBalance, totalSpent };
          }).catch(err => { console.error('Failed to fetch balances:', err); return { totalBalance: 0, totalSpent: 0 }; })
        , 60000), // Cache for 1 minute
      ]);

      const statsData = { 
        totalUsers, totalOrders, totalServices, totalCategories, totalPlatforms, totalProviders, 
        onlineUsers: onlineCount, todayOrders, todayUsers, 
        totalBalance: balanceData.totalBalance, 
        totalSpent: balanceData.totalSpent 
      };

      setStats(statsData);
      setRecentOrders(recentOrdersData);
      setRecentUsers(recentUsersData);
      console.log('✅ Admin dashboard loaded');
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users',    value: stats.totalUsers,       icon: FiUsers,       gradient: 'from-blue-500 to-blue-600',     change: `+${stats.todayUsers} today` },
    { title: 'Online Users',   value: stats.onlineUsers,      icon: FiActivity,    gradient: 'from-green-500 to-green-600',   change: 'Live', pulse: true },
    { title: 'Total Orders',   value: stats.totalOrders,      icon: FiShoppingBag, gradient: 'from-purple-500 to-purple-600', change: `+${stats.todayOrders} today` },
    { title: 'Total Services', value: stats.totalServices,    icon: FiPackage,     gradient: 'from-yellow-500 to-yellow-600' },
    { title: 'Categories',     value: stats.totalCategories,  icon: FiLayers,      gradient: 'from-pink-500 to-pink-600' },
    { title: 'Platforms',      value: stats.totalPlatforms,   icon: FiGrid,        gradient: 'from-indigo-500 to-indigo-600' },
    { title: 'Providers',      value: stats.totalProviders,   icon: FiServer,      gradient: 'from-red-500 to-red-600' },
    { title: 'Wallet Balance', value: stats.totalBalance, isPKR: true, icon: FiDollarSign, gradient: 'from-emerald-500 to-emerald-600', change: 'Total in wallets' },
    { title: 'Total Invested', value: stats.totalSpent,   isPKR: true, icon: FiTrendingUp, gradient: 'from-cyan-500 to-cyan-600',     change: 'Total spent by users' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">Dashboard Overview</h2>
        <p className="text-dark-500 dark:text-dark-400">Welcome to MSF SMM Panel Administration</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass-card p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">Data Not Loading</h3>
          <p className="text-dark-500 mb-4">Stats:</p>
          <pre className="text-xs text-left bg-dark-100 dark:bg-dark-900 p-4 rounded-lg mb-4 overflow-auto">
            {JSON.stringify(stats, null, 2)}
          </pre>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="btn-primary">
            Retry Loading Data
          </button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <div key={index} className="glass-card p-6 hover:shadow-xl transition-all duration-300 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                      {stat.isPKR ? formatAmountFromPKR(stat.value) : stat.value}
                    </h3>
                    {stat.change && (
                      <p className={`text-xs ${stat.pulse ? 'text-green-600 dark:text-green-400' : 'text-dark-500'} flex items-center gap-1`}>
                        {stat.pulse && (
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                          </span>
                        )}
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <stat.icon className="text-white text-2xl" />
                    </div>
                    {/* Reset button for Total Invested */}
                    {stat.title === 'Total Invested' && (
                      <button
                        onClick={handleResetInvestment}
                        disabled={resettingInvestment}
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group/reset"
                        title="Reset Total Investment to 0"
                      >
                        {resettingInvestment ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FiRefreshCw className="text-xs group-hover/reset:rotate-180 transition-transform duration-300" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-dark-900 dark:text-white">Latest Orders</h3>
                <FiTrendingUp className="text-dark-400" />
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-center text-dark-500 py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold text-dark-900 dark:text-white text-sm">Order #{order.id.substring(0, 8)}</p>
                        <p className="text-xs text-dark-500">{order.createdAt?.toDate().toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-dark-900 dark:text-white">{formatAmountFromPKR(order.charge || 0)}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-500/20' :
                          order.status === 'pending'   ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20' :
                          'bg-blue-100 text-blue-600 dark:bg-blue-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Users */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-dark-900 dark:text-white">New Users</h3>
                <FiUsers className="text-dark-400" />
              </div>
              {recentUsers.length === 0 ? (
                <p className="text-center text-dark-500 py-8">No users yet</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors">
                      {/* Profile Picture with real photo support */}
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-500/50 flex-shrink-0">
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || 'User'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&size=80&background=random`;
                            }}
                          />
                        ) : (
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&size=80&background=random`}
                            alt={user.displayName || 'User'}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-dark-900 dark:text-white text-sm">{user.displayName || 'User'}</p>
                        <p className="text-xs text-dark-500">{user.email}</p>
                      </div>
                      <div className="text-xs text-dark-400">
                        <FiClock className="inline mr-1" />
                        {user.createdAt?.toDate().toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
