'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Spinner, PageLoader } from '@/components/common/Loader';
import { FiPackage, FiArrowLeft, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw, FiExternalLink, FiRefreshCcw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const PROXY = 'https://smm-proxy.ms8347750.workers.dev';
const SYNC_INTERVAL = 120000; // 2 minutes instead of 30 seconds

const STATUS_MAP = {
  'Pending':     'pending',
  'In progress': 'processing',
  'Processing':  'processing',
  'Active':      'processing',
  'Completed':   'completed',
  'Partial':     'partial',
  'Canceled':    'cancelled',
  'Cancelled':   'cancelled',
  'Failed':      'failed',
  'Refunded':    'refunded',
  'Refilling':   'refilling',
};

const statusConfig = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', icon: FiClock, spinning: false },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: FiRefreshCw, spinning: true },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400', icon: FiCheckCircle, spinning: false },
  partial:    { label: 'Partial',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400', icon: FiRefreshCw, spinning: false },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: FiXCircle, spinning: false },
  refunded:   { label: 'Refunded',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: FiCheckCircle, spinning: false },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: FiXCircle, spinning: false },
  refilling:  { label: 'Refilling',  color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400', icon: FiRefreshCw, spinning: true },
};

export default function OrdersPage() {
  const { user, userProfile, refreshProfile, loading: authLoading } = useAuth();
  const { format } = useCurrency(); // Use currency formatting
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const syncIntervalRef = useRef(null);
  const providerCacheRef = useRef({});

  useEffect(() => {
    if (user) {
      fetchOrders();
      // Auto-sync every 30 seconds
      syncIntervalRef.current = setInterval(() => {
        syncActiveOrders();
      }, SYNC_INTERVAL);
    }
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [user]);

  // Cache provider data to avoid repeated Firestore reads
  const getProvider = async (providerId) => {
    if (!providerId) return null;
    if (providerCacheRef.current[providerId]) return providerCacheRef.current[providerId];
    const snap = await getDoc(doc(db, 'providers', providerId));
    if (snap.exists()) {
      providerCacheRef.current[providerId] = snap.data();
      return snap.data();
    }
    return null;
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aT = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bT = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bT - aT;
        });
      setOrders(list);
      // Sync active orders after loading
      const synced = await syncOrdersList(list);
      setOrders(synced);
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const syncActiveOrders = async () => {
    setSyncing(true);
    try {
      setOrders(prev => prev.map(o => o)); // trigger re-render with syncing state
      const current = [...orders];
      const synced = await syncOrdersList(current);
      setOrders(synced);
    } finally {
      setSyncing(false);
    }
  };

  const syncOrdersList = async (ordersList) => {
    const active = ordersList.filter(o => o.providerOrderId && o.providerId && ['pending', 'processing', 'refilling'].includes(o.status));
    if (active.length === 0) return ordersList;
    const updated = await Promise.all(ordersList.map(async (order) => {
      if (order.providerOrderId && order.providerId && ['pending', 'processing', 'refilling'].includes(order.status)) {
        return syncSingleOrder(order);
      }
      return order;
    }));
    return updated;
  };

  const syncSingleOrder = async (order) => {
    try {
      const provider = await getProvider(order.providerId);
      if (!provider) return order;
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: provider.apiUrl, apiKey: provider.apiKey, action: 'status', order: order.providerOrderId }),
      });
      
      // Handle rate limiting gracefully
      if (res.status === 429) {
        console.warn('Rate limited by proxy — skipping sync for this order');
        return order;
      }
      
      const result = await res.json();
      if (!result.success || !result.data) return order;

      const d = result.data;
      const newStatus = STATUS_MAP[d.status] || order.status;
      const startCount = d.start_count != null ? parseInt(d.start_count) : order.startCount;
      const remains = d.remains != null ? parseInt(d.remains) : order.remains;

      const changed = newStatus !== order.status || startCount !== order.startCount || remains !== order.remains;

      if (changed) {
        const updateData = { status: newStatus, startCount, remains, updatedAt: new Date() };
        if (newStatus === 'completed' && !order.completedAt) {
          updateData.completedAt = new Date();
        }

        // Auto-refund if partial or completed with less than ordered
        if (newStatus === 'partial' && order.charge && !order.refundIssued) {
          const delivered = parseInt(order.quantity) - remains;
          const refundRatio = remains / parseInt(order.quantity);
          const refundAmount = parseFloat((order.charge * refundRatio).toFixed(4));
          if (refundAmount > 0) {
            // Credit refund to user
            const userSnap = await getDoc(doc(db, 'users', order.userId));
            if (userSnap.exists()) {
              const newBal = parseFloat(((userSnap.data().balance || 0) + refundAmount).toFixed(4));
              await updateDoc(doc(db, 'users', order.userId), { balance: newBal });
              // Log transaction
              await addDoc(collection(db, 'transactions'), {
                userId: order.userId, orderId: order.id, type: 'refund',
                amount: refundAmount, description: `Partial refund for order #${order.id.substring(0, 8)}`,
                createdAt: new Date(),
              });
            }
            updateData.refundIssued = true;
            updateData.refundAmount = refundAmount;
          }
        }

        await updateDoc(doc(db, 'orders', order.id), updateData);
        return { ...order, ...updateData };
      }
      return order;
    } catch (e) {
      console.error('Sync error:', e.message);
      return order;
    }
  };

  const handleCancel = async (order) => {
    if (!order.providerOrderId || !order.providerId) {
      toast.error('Cannot cancel — no provider linked');
      return;
    }
    if (!confirm('Cancel this order? Any eligible refund will be credited automatically.')) return;
    setActionLoading(order.id + '-cancel');
    try {
      const provider = await getProvider(order.providerId);
      if (!provider) throw new Error('Provider not found');

      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: provider.apiUrl, apiKey: provider.apiKey, action: 'cancel', orders: order.providerOrderId }),
      });
      const result = await res.json();
      if (res.status === 429) throw new Error('Too many requests — please wait a minute and try again');

      // Check if provider accepted the cancel
      const cancelData = Array.isArray(result.data) ? result.data[0] : result.data;
      const providerCancelled = result.success && (!cancelData?.error);

      if (providerCancelled) {
        // Issue full refund to user wallet
        const userSnap = await getDoc(doc(db, 'users', order.userId));
        if (userSnap.exists() && order.charge) {
          const newBal = parseFloat(((userSnap.data().balance || 0) + order.charge).toFixed(4));
          await updateDoc(doc(db, 'users', order.userId), { balance: newBal });
          // Log refund transaction
          await addDoc(collection(db, 'transactions'), {
            userId: order.userId, orderId: order.id, type: 'refund',
            amount: order.charge, description: `Refund for cancelled order #${order.id.substring(0, 8)}`,
            createdAt: new Date(),
          });
        }
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'cancelled', refundIssued: true, refundAmount: order.charge, updatedAt: new Date(),
        });
        toast.success(`Order cancelled! $${order.charge?.toFixed(2)} refunded to your wallet.`);
        if (refreshProfile) await refreshProfile();
        await fetchOrders();
        setSelectedOrder(null);
      } else {
        throw new Error(cancelData?.error || 'Provider did not accept the cancellation');
      }
    } catch (err) {
      toast.error(`Cancel failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefill = async (order) => {
    if (!order.providerOrderId || !order.providerId) {
      toast.error('Cannot refill — no provider linked');
      return;
    }
    setActionLoading(order.id + '-refill');
    try {
      const provider = await getProvider(order.providerId);
      if (!provider) throw new Error('Provider not found');
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: provider.apiUrl, apiKey: provider.apiKey, action: 'refill', order: order.providerOrderId }),
      });
      const result = await res.json();
      if (result.success && !result.data?.error) {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'refilling',
          refillUsed: true,
          refillUsedAt: new Date(),
          updatedAt: new Date(),
        });
        toast.success('Refill started!');
        fetchOrders();
      } else {
        throw new Error(result.data?.error || 'Refill failed');
      }
    } catch (err) {
      toast.error(`Refill failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    try { return (ts?.toDate ? ts.toDate() : new Date(ts)).toLocaleString(); } catch { return '—'; }
  };

  const getStatus = (status) => statusConfig[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400', icon: FiClock };

  if (authLoading) return <PageLoader />;
  if (!user) return (
    <div className="container-custom py-20 text-center">
      <h2 className="text-2xl font-bold mb-4">Please Login</h2>
      <Link href="/auth/login" className="btn-primary">Login</Link>
    </div>
  );

  // Back button handler
  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="container-custom py-12">
      <button onClick={handleBack} className="inline-flex items-center gap-2 text-dark-600 dark:text-dark-400 hover:text-primary-600 mb-8 transition-colors text-sm hover:underline" title="Back to Dashboard">
        <FiArrowLeft /> Back to Dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-900 dark:text-white">My Orders</h1>
          <p className="text-sm text-dark-500 mt-1">{orders.length} total orders</p>
        </div>
        <button onClick={syncActiveOrders} disabled={syncing}
          className="flex items-center gap-2 btn-outline btn-sm">
          <FiRefreshCcw className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {ordersLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <FiPackage className="text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">No orders yet</h3>
          <p className="text-dark-500 dark:text-dark-400 mb-6">Place your first order to see it here.</p>
          <Link href="/dashboard" className="btn-primary">Browse Services</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = getStatus(order.status);
            const StatusIcon = status.icon;
            const isExpanded = selectedOrder?.id === order.id;
            const canCancel = order.cancelSupported && order.providerOrderId && order.providerId && ['pending', 'processing'].includes(order.status);
            const canRefill = (() => {
              if (!order.refillSupported || !order.providerOrderId || !order.providerId) return false;
              if (order.status !== 'completed') return false;
              if (order.refillUsed) return false; // already used once
              const periodDays = parseInt((order.refillPeriodDays ?? order.refillDays) || 0);
              if (periodDays <= 0) return true;
              if (!order.completedAt) return false;
              const completedTime = order.completedAt?.toDate ? order.completedAt.toDate() : new Date(order.completedAt);
              if (!completedTime || isNaN(completedTime.getTime())) return false;
              const expiresAt = new Date(completedTime.getTime() + periodDays * 24 * 60 * 60 * 1000);
              return new Date() < expiresAt;
            })();

            return (
              <div key={order.id} className="glass-card overflow-hidden">
                <div className="p-4 flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs text-dark-500 dark:text-dark-400 font-bold w-[80px] flex-shrink-0">
                    #{order.id.substring(0, 8)}
                  </span>
                  <div className="flex-1 min-w-[140px]">
                    <p className="text-sm font-semibold text-dark-900 dark:text-white line-clamp-1">{order.serviceName || '—'}</p>
                    <p className="text-xs text-dark-400">{order.platformName}{order.categoryName ? ` → ${order.categoryName}` : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-dark-700 dark:text-dark-300 w-[70px] text-right">{order.quantity?.toLocaleString()}</span>
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400 w-[80px] text-right">{format(order.charge || 0)}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                    <StatusIcon className={`text-xs ${status.spinning ? 'animate-spin' : ''}`} />
                    {status.label}
                  </span>
                  <span className="text-xs text-dark-400 hidden md:block">{formatDate(order.createdAt)}</span>
                  <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                    {canCancel && (
                      <button onClick={() => handleCancel(order)} disabled={!!actionLoading}
                        className="btn-outline btn-sm">
                        {actionLoading === order.id + '-cancel' ? '...' : '✕ Cancel'}
                      </button>
                    )}
                    {canRefill && (
                      <button onClick={() => handleRefill(order)} disabled={!!actionLoading}
                        className="btn-primary btn-sm">
                        {actionLoading === order.id + '-refill' ? '...' : '↩ Refill'}
                      </button>
                    )}
                    <button onClick={() => setSelectedOrder(isExpanded ? null : order)}
                      className="btn-secondary btn-sm">
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-dark-200 dark:border-dark-700 p-4 bg-dark-50 dark:bg-dark-800/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-xs text-dark-400 mb-1">Target Link</p>
                        {order.link ? (
                          <a href={order.link} target="_blank" rel="noopener noreferrer"
                            className="text-primary-600 hover:underline flex items-center gap-1 text-xs break-all">
                            {order.link.substring(0, 35)}{order.link.length > 35 ? '...' : ''}
                            <FiExternalLink className="flex-shrink-0 text-xs" />
                          </a>
                        ) : <span className="text-dark-400 text-xs">—</span>}
                      </div>
                      <div>
                        <p className="text-xs text-dark-400 mb-1">Start Count</p>
                        <p className="font-semibold text-dark-900 dark:text-white text-sm">{order.startCount != null ? parseInt(order.startCount).toLocaleString() : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-400 mb-1">Remains</p>
                        <p className="font-semibold text-dark-900 dark:text-white text-sm">{order.remains != null ? parseInt(order.remains).toLocaleString() : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dark-400 mb-1">Amount Paid</p>
                        <p className="font-bold text-primary-600 text-sm">{format(order.charge || 0)}</p>
                      </div>
                      {order.refundAmount > 0 && (
                        <div>
                          <p className="text-xs text-dark-400 mb-1">Refund Issued</p>
                          <p className="font-bold text-green-600 text-sm">+{format(order.refundAmount)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-dark-400 mb-1">Last Updated</p>
                        <p className="text-xs text-dark-500">{formatDate(order.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap text-xs text-dark-400 pt-2 border-t border-dark-200 dark:border-dark-700">
                      <span>Placed: {formatDate(order.createdAt)}</span>
                      {order.cancelSupported && <span className="text-red-400">✕ Cancel supported</span>}
                      {order.refillSupported && <span className="text-green-400">↩ Refill supported</span>}
                      {order.refillSupported && (order.refillPeriodDays || order.refillDays) && order.completedAt && (() => {
                        const periodDays = parseInt((order.refillPeriodDays ?? order.refillDays) || 30);
                        const completedTime = order.completedAt?.toDate ? order.completedAt.toDate() : new Date(order.completedAt);
                        const expiresAt = new Date(completedTime.getTime() + periodDays * 24 * 60 * 60 * 1000);
                        const expired = new Date() > expiresAt;
                        return (
                          <span className={expired ? 'text-red-400' : 'text-green-400'}>
                            {expired ? `Refill expired (was ${order.refillPeriodDays || order.refillDays}d)` : `Refill expires: ${expiresAt.toLocaleDateString()}`}
                          </span>
                        );
                      })()}
                      {order.refillUsed && <span className="text-yellow-400">↩ Refill already used</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
