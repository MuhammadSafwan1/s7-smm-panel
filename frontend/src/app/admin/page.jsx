'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { 
  FiUsers, 
  FiShoppingBag, 
  FiPackage, 
  FiGrid,
  FiServer,
  FiLayers,
  FiDollarSign,
  FiActivity,
  FiTrendingUp,
  FiClock
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalOrders: 0,
    totalServices: 0,
    totalCategories: 0,
    totalPlatforms: 0,
    totalProviders: 0,
    totalBalance: 0,
    todayOrders: 0,
    todayUsers: 0,
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      // Fetch all data in parallel
      const [
        usersSnapshot,
        ordersSnapshot,
        servicesSnapshot,
        categoriesSnapshot,
        platformsSnapshot,
        providersSnapshot,
        todayOrdersSnapshot,
        todayUsersSnapshot,
        recentOrdersSnapshot,
        recentUsersSnapshot,
      ] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'platforms')),
        getDocs(collection(db, 'providers')),
        getDocs(query(collection(db, 'orders'), where('createdAt', '>=', todayTimestamp))),
        getDocs(query(collection(db, 'users'), where('createdAt', '>=', todayTimestamp))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5))),
        getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5))),
      ]);

      // Calculate total balance
      let totalBalance = 0;
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        totalBalance += userData.balance || 0;
      });

      // Calculate online users (active in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      let onlineUsers = 0;
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.lastActive && userData.lastActive.toDate() > fiveMinutesAgo) {
          onlineUsers++;
        }
      });

      setStats({
        totalUsers: usersSnapshot.size,
        onlineUsers,
        totalOrders: ordersSnapshot.size,
        totalServices: servicesSnapshot.size,
        totalCategories: categoriesSnapshot.size,
        totalPlatforms: platformsSnapshot.size,
        totalProviders: providersSnapshot.size,
        totalBalance,
        todayOrders: todayOrdersSnapshot.size,
        todayUsers: todayUsersSnapshot.size,
      });

      setRecentOrders(recentOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })));

      setRecentUsers(recentUsersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: FiUsers,
      gradient: 'from-blue-500 to-blue-600',
      change: `+${stats.todayUsers} today`,
    },
    {
      title: 'Online Users',
      value: stats.onlineUsers,
      icon: FiActivity,
      gradient: 'from-green-500 to-green-600',
      change: 'Live',
      pulse: true,
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: FiShoppingBag,
      gradient: 'from-purple-500 to-purple-600',
      change: `+${stats.todayOrders} today`,
    },
    {
      title: 'Total Services',
      value: stats.totalServices,
      icon: FiPackage,
      gradient: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: FiLayers,
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      title: 'Platforms',
      value: stats.totalPlatforms,
      icon: FiGrid,
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Providers',
      value: stats.totalProviders,
      icon: FiServer,
      gradient: 'from-red-500 to-red-600',
    },
    {
      title: 'Wallet Balance',
      value: `$${stats.totalBalance.toFixed(2)}`,
      icon: FiDollarSign,
      gradient: 'from-emerald-500 to-emerald-600',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
          Dashboard Overview
        </h2>
        <p className="text-dark-500 dark:text-dark-400">
          Welcome to MSF SMM Panel Administration
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="glass-card p-6 hover:shadow-xl transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
                  {stat.value}
                </h3>
                {stat.change && (
                  <p className={`text-xs ${stat.pulse ? 'text-green-600 dark:text-green-400' : 'text-dark-500'} flex items-center gap-1`}>
                    {stat.pulse && <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>}
                    {stat.change}
                  </p>
                )}
              </div>
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <stat.icon className="text-white text-2xl" />
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
            <h3 className="text-lg font-bold text-dark-900 dark:text-white">
              Latest Orders
            </h3>
            <FiTrendingUp className="text-dark-400" />
          </div>
          
          {recentOrders.length === 0 ? (
            <p className="text-center text-dark-500 py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-dark-900 dark:text-white text-sm">
                      Order #{order.id.substring(0, 8)}
                    </p>
                    <p className="text-xs text-dark-500">
                      {order.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-dark-900 dark:text-white">
                      ${order.charge?.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-500/20' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20' :
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
            <h3 className="text-lg font-bold text-dark-900 dark:text-white">
              New Users
            </h3>
            <FiUsers className="text-dark-400" />
          </div>
          
          {recentUsers.length === 0 ? (
            <p className="text-center text-dark-500 py-8">No users yet</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-dark-50 dark:hover:bg-dark-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-dark-900 dark:text-white text-sm">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-xs text-dark-500">
                      {user.email}
                    </p>
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
    </div>
  );
}
