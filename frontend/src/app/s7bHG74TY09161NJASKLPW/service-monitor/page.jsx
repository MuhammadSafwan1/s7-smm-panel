'use client';

import { useState, useEffect } from 'react';
import { FiRefreshCw, FiAlertCircle, FiCheck, FiTrendingUp, FiTrendingDown, FiClock, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ServiceMonitorPage() {
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState('alerts'); // alerts, logs

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPriceAlerts(),
        fetchSyncLogs(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceAlerts = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/smm/admin/price-alerts?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPriceAlerts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching price alerts:', error);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/smm/admin/sync-logs?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSyncLogs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    
    if (!confirm('Start provider services sync? This may take a few minutes.')) return;

    setSyncing(true);
    toast.loading('Syncing services from providers...', { id: 'sync' });

    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/smm/admin/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Sync completed! 
New: ${data.data.newServices}, 
Updated: ${data.data.updatedServices}, 
Deleted: ${data.data.deletedServices}, 
Price Changes: ${data.data.priceChanges.length}`, { 
          id: 'sync',
          duration: 5000 
        });
        
        // Refresh data
        fetchData();
      } else {
        toast.error(data.message || 'Sync failed', { id: 'sync' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed: ' + error.message, { id: 'sync' });
    } finally {
      setSyncing(false);
    }
  };

  const handleAcknowledge = async (serviceId) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/smm/admin/price-alerts/${serviceId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Price change acknowledged');
        fetchPriceAlerts(); // Refresh alerts
      } else {
        toast.error(data.message || 'Failed to acknowledge');
      }
    } catch (error) {
      console.error('Acknowledge error:', error);
      toast.error('Failed to acknowledge');
    }
  };

  const getAuthToken = async () => {
    // Get Firebase auth token
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('Not authenticated');
    return auth.currentUser.getIdToken();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white">Service Monitor</h2>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
            Track provider service changes, price updates, and deletions
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
        >
          <FiRefreshCw className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Price Alerts</p>
              <p className="text-3xl font-bold text-dark-900 dark:text-white mt-1">
                {priceAlerts.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
              <FiAlertCircle className="text-2xl text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Last Sync</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white mt-1">
                {syncLogs[0] ? formatDate(syncLogs[0].syncedAt).split(',')[1] : 'Never'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <FiClock className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-500 dark:text-dark-400">Sync Status</p>
              <p className="text-lg font-semibold text-dark-900 dark:text-white mt-1">
                {syncLogs[0]?.status === 'success' ? 'Success' : syncLogs[0]?.status === 'partial' ? 'Partial' : 'Unknown'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              syncLogs[0]?.status === 'success' 
                ? 'bg-green-100 dark:bg-green-500/20' 
                : 'bg-red-100 dark:bg-red-500/20'
            }`}>
              <FiCheck className={`text-2xl ${
                syncLogs[0]?.status === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-200 dark:border-dark-700">
        <button
          onClick={() => setTab('alerts')}
          className={`px-6 py-3 font-medium transition-all ${
            tab === 'alerts'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-200'
          }`}
        >
          Price Alerts ({priceAlerts.length})
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-6 py-3 font-medium transition-all ${
            tab === 'logs'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-500 dark:text-dark-400 hover:text-dark-700 dark:hover:text-dark-200'
          }`}
        >
          Sync Logs
        </button>
      </div>

      {/* Content */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          {priceAlerts.length > 0 ? (
            priceAlerts.map((alert) => {
              const isIncrease = alert.change > 0;
              return (
                <div key={alert.serviceId} className="glass-card p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isIncrease 
                            ? 'bg-red-100 dark:bg-red-500/20' 
                            : 'bg-green-100 dark:bg-green-500/20'
                        }`}>
                          {isIncrease ? (
                            <FiTrendingUp className="text-xl text-red-600 dark:text-red-400" />
                          ) : (
                            <FiTrendingDown className="text-xl text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-dark-900 dark:text-white">
                            {alert.serviceName}
                          </h3>
                          <p className="text-sm text-dark-500 dark:text-dark-400">
                            Provider: {alert.provider}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-dark-400">Service ID</p>
                          <p className="text-sm font-mono font-semibold text-primary-600 dark:text-primary-400">
                            #{alert.serviceId?.substring(0, 8)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-400">Old Price</p>
                          <p className="text-lg font-semibold text-dark-900 dark:text-white">
                            ${alert.oldPrice?.toFixed(4)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-400">New Price</p>
                          <p className="text-lg font-semibold text-dark-900 dark:text-white">
                            ${alert.newPrice?.toFixed(4)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-400">Change</p>
                          <p className={`text-lg font-semibold ${
                            isIncrease ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                          }`}>
                            {isIncrease ? '+' : ''}{alert.change?.toFixed(4)} ({alert.changePercent}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-400">Changed At</p>
                          <p className="text-sm font-medium text-dark-700 dark:text-dark-300">
                            {formatDate(alert.changedAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcknowledge(alert.serviceId)}
                      className="btn-secondary btn-sm flex items-center gap-2"
                    >
                      <FiCheck /> Acknowledge
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 glass-card">
              <FiCheck className="text-6xl text-green-500 mx-auto mb-4" />
              <p className="text-dark-500 dark:text-dark-400">No price changes detected</p>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          {syncLogs.length > 0 ? (
            syncLogs.map((log, index) => (
              <div key={log.id || index} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-dark-900 dark:text-white">
                      {formatDate(log.syncedAt)}
                    </h3>
                    <p className={`text-sm font-medium mt-1 ${
                      log.status === 'success' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {log.status === 'success' ? 'Successful Sync' : 'Partial Sync'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-dark-400">Providers</p>
                    <p className="text-lg font-semibold text-dark-900 dark:text-white">
                      {log.syncedProviders}/{log.totalProviders}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">New</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {log.newServices}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Updated</p>
                    <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                      {log.updatedServices}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Deleted</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {log.deletedServices}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-400">Price Changes</p>
                    <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                      {log.priceChanges?.length || 0}
                    </p>
                  </div>
                </div>

                {log.failedProviders && log.failedProviders.length > 0 && (
                  <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-500/10">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                      Failed Providers:
                    </p>
                    {log.failedProviders.map((fp, idx) => (
                      <p key={idx} className="text-sm text-dark-600 dark:text-dark-300">
                        • {fp.name}: {fp.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 glass-card">
              <FiClock className="text-6xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500 dark:text-dark-400">No sync logs yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
