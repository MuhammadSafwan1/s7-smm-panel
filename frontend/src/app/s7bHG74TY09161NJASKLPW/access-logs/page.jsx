'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { cachedQuery } from '@/lib/cache';
import AdminLayout from '@/components/admin/AdminLayout';
import { FiClock, FiUser, FiMapPin, FiMonitor, FiCheckCircle, FiXCircle, FiFilter, FiDownload } from 'react-icons/fi';
import { PageLoader } from '@/components/common/Loader';
import toast from 'react-hot-toast';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, success, failed
  const [dateRange, setDateRange] = useState('today'); // today, week, month, all

  useEffect(() => {
    fetchLogs();
  }, [filter, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Build query
      let logsQuery = query(
        collection(db, 'adminLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      // Apply filters
      if (filter === 'success') {
        logsQuery = query(
          collection(db, 'adminLogs'),
          where('success', '==', true),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      } else if (filter === 'failed') {
        logsQuery = query(
          collection(db, 'adminLogs'),
          where('success', '==', false),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
      }

      const snapshot = await cachedQuery(`collection:access-logs:filter:${filter || 'all'}`, () => getDocs(logsQuery));
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      }));

      // Filter by date range
      const filteredLogs = filterByDateRange(logsData);
      setLogs(filteredLogs);

    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load access logs');
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = (logsData) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (dateRange) {
      case 'today':
        return logsData.filter(log => log.timestamp >= today);
      case 'week':
        return logsData.filter(log => log.timestamp >= weekAgo);
      case 'month':
        return logsData.filter(log => log.timestamp >= monthAgo);
      default:
        return logsData;
    }
  };

  const getActionLabel = (action) => {
    const actions = {
      login_attempt: 'Login Attempt',
      login_success: 'Login Success',
      unauthorized_access: 'Unauthorized Access',
      google_login_attempt: 'Google Login Attempt',
      google_login_success: 'Google Login Success',
      unauthorized_google_access: 'Unauthorized Google Access',
      '2fa_success': '2FA Verified',
      '2fa_failed': '2FA Failed',
      admin_panel_access: 'Admin Panel Access',
    };
    return actions[action] || action;
  };

  const getActionColor = (action, success) => {
    if (!success) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10';
    if (action.includes('success') || action.includes('2fa_success')) {
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10';
    }
    if (action.includes('unauthorized') || action.includes('failed')) {
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10';
    }
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10';
  };

  const exportLogs = () => {
    try {
      const csvContent = [
        ['Timestamp', 'Email', 'IP Address', 'Action', 'Method', 'Status', 'User Agent'].join(','),
        ...logs.map(log => [
          log.timestamp.toISOString(),
          log.email || 'unknown',
          log.ip || 'unknown',
          getActionLabel(log.action),
          log.method || 'password',
          log.success ? 'Success' : 'Failed',
          `"${(log.userAgent || 'unknown').replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-access-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Logs exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export logs');
    }
  };

  if (loading) return <AdminLayout><PageLoader /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
              Access Logs
            </h1>
            <p className="text-dark-500 dark:text-dark-400">
              Monitor all admin panel access and authentication attempts
            </p>
          </div>
          <button
            onClick={exportLogs}
            className="btn-outline flex items-center gap-2"
          >
            <FiDownload />
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <FiClock className="text-xl text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Total Logs</p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">{logs.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <FiCheckCircle className="text-xl text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Successful</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {logs.filter(log => log.success).length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <FiXCircle className="text-xl text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {logs.filter(log => !log.success).length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <FiMapPin className="text-xl text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Unique IPs</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Set(logs.map(log => log.ip)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-dark-500 dark:text-dark-400" />
              <span className="text-sm font-medium text-dark-600 dark:text-dark-300">Filters:</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                All Logs
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                Successful
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                Failed
              </button>
            </div>

            <div className="h-6 w-px bg-dark-200 dark:bg-dark-700"></div>

            <div className="flex gap-2">
              <button
                onClick={() => setDateRange('today')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === 'today'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === 'week'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === 'month'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-50 dark:bg-dark-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 dark:text-dark-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <p className="text-dark-500 dark:text-dark-400">No access logs found</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-600 dark:text-dark-300">
                        <div className="flex items-center gap-2">
                          <FiClock className="text-dark-400" />
                          {log.timestamp.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <FiUser className="text-dark-400" />
                          <span className="text-dark-900 dark:text-white font-medium">
                            {log.email || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-dark-400" />
                          <span className="text-dark-600 dark:text-dark-300 font-mono">
                            {log.ip || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(log.action, log.success)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <FiMonitor className="text-dark-400" />
                          <span className="text-dark-600 dark:text-dark-300 capitalize">
                            {log.method || 'password'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.success ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <FiCheckCircle />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <FiXCircle />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}