'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { Spinner, PageLoader } from '@/components/common/Loader';
import { FiPackage, FiArrowLeft, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw, FiExternalLink, FiRefreshCcw, FiSearch, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const PROXY = 'https://smm-proxy.ms8347750.workers.dev';
const SYNC_INTERVAL = 120000;

const STATUS_MAP = {
  'Pending':     'pending',
  'In progress': 'processing',
  'Processing':  'processing',
  'Active':      'processing',
  'Completed':   'completed',
  'Partial':     'partial',
  'Canceled':    'cancelled',
  'Cancelled':   'cancelled',
  'Cancel requested': 'cancel_requested',
  'Failed':      'failed',
  'Refunded':    'refunded',
  'Refilling':   'refilling',
};

const statusConfig = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', icon: FiClock, spinning: true },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: FiRefreshCw, spinning: true },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400', icon: FiCheckCircle, spinning: false },
  partial:    { label: 'Partial',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400', icon: FiRefreshCw, spinning: false },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: FiXCircle, spinning: false },
  cancel_requested: { label: 'Cancel Requested', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400', icon: FiClock, spinning: true },
  refunded:   { label: 'Refunded',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: FiCheckCircle, spinning: false },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: FiXCircle, spinning: false },
  refilling:  { label: 'Refilling',  color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400', icon: FiRefreshCw, spinning: true },
};

export default function OrdersPage() {
  const { user, userProfile, refreshProfile, loading: authLoading } = useAuth();
  const { format } = useCurrency();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ORDERS_PER_PAGE = 10;
  const syncIntervalRef = useRef(null);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const ordersRef = useRef([]);
  const syncedOnceRef = useRef(false);
  const unsubOrdersRef = useRef(null);

  useEffect(() => {
    if (user) {
      // 🔴 REALTIME orders listener - initial load + live status updates
      const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
      unsubOrdersRef.current = onSnapshot(ordersQuery, (snap) => {
        try {
          const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const filtered = applySmartFilter(allOrders);
          setOrders(filtered);
          setFilteredOrders(filtered);
          ordersRef.current = filtered;
          // Auto-sync with provider once after initial load
          if (!syncedOnceRef.current) {
            syncedOnceRef.current = true;
            syncOrdersList(allOrders).then(synced => {
              const sf = applySmartFilter(synced);
              setOrders(sf);
              setFilteredOrders(sf);
              ordersRef.current = sf;
            });
          }
        } catch (e) {
          console.error('❌ Realtime orders error:', e);
        } finally {
          setOrdersLoading(false);
        }
      }, (err) => {
        console.error('❌ Realtime orders listener error:', err);
        setOrdersLoading(false);
      });

      syncIntervalRef.current = setInterval(() => {
        syncActiveOrders();
      }, SYNC_INTERVAL);
    }
    return () => {
      if (unsubOrdersRef.current) unsubOrdersRef.current();
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [user]);

  useEffect(() => { filterOrders(); }, [searchTerm, statusFilter, orders]);

  // 🚀 Pagination: Load more orders as user scrolls
  useEffect(() => {
    const startIndex = 0;
    const endIndex = page * ORDERS_PER_PAGE;
    const newDisplayed = filteredOrders.slice(startIndex, endIndex);
    setDisplayedOrders(newDisplayed);
    setHasMore(endIndex < filteredOrders.length);
  }, [filteredOrders, page]);

  // 🚀 Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !ordersLoading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(loadMoreRef.current);
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, ordersLoading]);

  // 🔐 Provider apiKeys are admin-only in Firestore — call the provider via the
  // Cloudflare worker, which verifies the user's ID token server-side.
  const callProvider = async (order, action, extra = {}) => {
    if (!order.providerId) return null;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, providerId: order.providerId, action, ...extra }),
      });
      if (res.status === 429) return { rateLimited: true };
      return await res.json();
    } catch (e) {
      console.warn('Provider call error:', e.message);
      return null;
    }
  };

  // 🚀 Smart Date Filtering Based on Refill Period:
  // - 365-day refill orders: Keep for 365 days
  // - 30-day refill orders: Keep for 30 days
  // - No refill orders: Keep for 7 days only
  const applySmartFilter = (allOrders) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    
    return allOrders.filter(order => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || 0);
      
      // Get refill days from order (set when order was placed)
      const refillDays = order.refillDays || order.refillPeriodDays || 0;
      
      // If no refill support, keep only 7 days
      if (!order.refillSupported && !order.hasRefill) {
        return orderDate >= sevenDaysAgo;
      }
      
      // If refill supported:
      // - 365 days or more: Keep for 365 days
      // - 30-364 days: Keep for that period
      // - Less than 30 days: Keep for 7 days (safety)
      if (refillDays >= 365) {
        return orderDate >= oneYearAgo;  // 365+ days refill
      } else if (refillDays >= 30) {
        const customCutoff = new Date();
        customCutoff.setDate(customCutoff.getDate() - refillDays);
        return orderDate >= customCutoff;  // Custom period (e.g., 30, 60, 90 days)
      } else {
        return orderDate >= sevenDaysAgo;  // Short refill or no period = 7 days
      }
    }).sort((a, b) => {
      const aT = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bT = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bT - aT;
    });
  };

  const syncActiveOrders = async () => {
    setSyncing(true);
    try {
      const current = [...ordersRef.current];
      const synced = await syncOrdersList(current);
      const sf = applySmartFilter(synced);
      setOrders(sf);
      setFilteredOrders(sf);
      ordersRef.current = sf;
    } finally {
      setSyncing(false);
    }
  };

  const filterOrders = () => {
    let f = [...orders];
    if (statusFilter !== 'all') f = f.filter(o => o.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      // 🔍 Search ONLY by Order ID
      f = f.filter(o => o.id.toLowerCase().includes(q));
    }
    setFilteredOrders(f);
  };

  const syncOrdersList = async (ordersList) => {
    const active = ordersList.filter(o => o.providerOrderId && o.providerId && ['pending', 'processing', 'refilling'].includes(o.status));
    if (active.length === 0) return ordersList;
    const updated = await Promise.all(ordersList.map(async (order) => {
      if (order.providerOrderId && order.providerId && ['pending', 'processing', 'refilling', 'cancel_requested'].includes(order.status)) {
        return syncSingleOrder(order);
      }
      return order;
    }));
    return updated;
  };

  const syncSingleOrder = async (order) => {
    try {
      const result = await callProvider(order, 'status', { order: order.providerOrderId });
      if (!result || result.rateLimited) {
        if (result?.rateLimited) console.warn('Rate limited by proxy — skipping sync for this order');
        return order;
      }
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

        // ✅ AUTO-REFUND: ONLY when provider refunded admin (11% fee deduction)
        if (newStatus === 'refunded' && order.charge && !order.refundIssued) {
          const refundAmount = parseFloat((order.charge * 0.89).toFixed(4)); // 89% (11% fee)
          if (refundAmount > 0) {
            const userSnap = await getDoc(doc(db, 'users', order.userId));
            if (userSnap.exists()) {
              const newBal = parseFloat(((userSnap.data().walletBalance || 0) + refundAmount).toFixed(4));
              await updateDoc(doc(db, 'users', order.userId), { walletBalance: newBal });
              await addDoc(collection(db, 'transactions'), {
                userId: order.userId, orderId: order.id, type: 'refund',
                amount: refundAmount, description: `Refund for order #${order.id.substring(0, 8)} (11% fee deducted)`,
                createdAt: new Date(),
              });
            }
            updateData.refundIssued = true;
            updateData.refundAmount = refundAmount;
          }
        }

        // ❌ NO AUTO-REFUND for "cancelled" — provider didn't refund admin, so user gets nothing
        if (newStatus === 'cancelled' && !order.refundIssued) {
          // Cancelled = Order cancelled but provider did NOT refund
        }

        // ✅ AUTO-REFUND: Partial orders - refund unfulfilled portion (11% fee)
        if (newStatus === 'partial' && order.charge && !order.refundIssued) {
          const refundAmount = parseFloat((order.charge * 0.89 * (remains / parseInt(order.quantity))).toFixed(4)); // 89% (11% fee)
          if (refundAmount > 0) {
            const userSnap = await getDoc(doc(db, 'users', order.userId));
            if (userSnap.exists()) {
              const newBal = parseFloat(((userSnap.data().walletBalance || 0) + refundAmount).toFixed(4));
              await updateDoc(doc(db, 'users', order.userId), { walletBalance: newBal });
              await addDoc(collection(db, 'transactions'), {
                userId: order.userId, orderId: order.id, type: 'refund',
                amount: refundAmount, description: `Partial refund for order #${order.id.substring(0, 8)} (11% fee deducted)`,
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
      toast.error('Cancel Failed: Service unavailable');
      return;
    }
    
    if (!confirm('Cancel this order?')) return;
    
    setActionLoading(order.id + '-cancel');
    
    try {
      const result = await callProvider(order, 'cancel', { orders: order.providerOrderId });
      
      if (!result || result.rateLimited) {
        toast.error(result?.rateLimited ? 'Too many requests. Please wait a minute and try again.' : 'Cancel Failed: Service temporarily unavailable');
        throw new Error('Rate limited');
      }

      const cancelData = Array.isArray(result.data) ? result.data[0] : result.data;
      const cancelled = result.success && (!cancelData?.error);

      if (cancelled) {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'cancel_requested',
          cancelRequested: true,
          updatedAt: new Date(),
        });
        
        toast.success('Cancel request sent! Waiting for confirmation.');
        
        // Realtime listener updates the list automatically
        setSelectedOrder(null);
      } else {
        const errorMsg = cancelData?.error || 'Cancellation request was not accepted';
        toast.error(`Cancel Failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      
      if (!err.message.includes('Failed')) {
        toast.error(`Cancel Failed: ${err.message}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefill = async (order) => {
    if (!order.providerOrderId || !order.providerId) {
      toast.error('Refill Failed: Service unavailable for this order');
      return;
    }
    
    setActionLoading(order.id + '-refill');
    
    try {
      const result = await callProvider(order, 'refill', { order: order.providerOrderId });
      
      if (!result || result.rateLimited) {
        toast.error(result?.rateLimited ? 'Too many requests. Please wait and try again.' : 'Refill Failed: Service not available');
        throw new Error('Rate limited');
      }
      
      if (result.success && !result.data?.error) {
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'refilling',
          refillUsed: true,
          refillUsedAt: new Date(),
          updatedAt: new Date(),
        });
        
        toast.success('Refill Started! Your order is being processed.');
        // Realtime listener updates the list automatically
      } else {
        const errorMsg = result.data?.error || result.error || 'Refill request declined';
        toast.error(`Refill Failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('Refill error:', err);
      
      if (!err.message.includes('Failed')) {
        toast.error(`Refill Failed: ${err.message}`);
      }
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

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 px-3 sm:px-4 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button onClick={handleBack} className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all" title="Back to Dashboard">
            <FiArrowLeft size={16} className="sm:hidden" />
            <FiArrowLeft size={18} className="hidden sm:block" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Orders</h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">{filteredOrders.length} of {orders.length} orders</p>
          </div>
          <button onClick={syncActiveOrders} disabled={syncing}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2f4a72] text-xs sm:text-sm font-semibold transition-all">
            <FiRefreshCcw className={syncing ? 'animate-spin' : ''} size={14} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-white dark:bg-[#1a2742] rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-100 dark:border-[#253a5e]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by Order ID, Service, Platform..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              />
            </div>
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="cancel_requested">Cancel Requested</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
                <option value="refilling">Refilling</option>
              </select>
            </div>
          </div>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl py-20 text-center border border-gray-100 dark:border-[#253a5e]">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
              <FiPackage className="text-gray-400 dark:text-gray-500" size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {orders.length === 0 ? 'No orders yet' : 'No matching orders'}
            </h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              {orders.length === 0 ? 'Place your first order to see it here.' : 'Try adjusting your filters.'}
            </p>
            {orders.length === 0 && (
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20">
                Browse Services
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#253a5e]/30 border-b border-gray-100 dark:border-[#253a5e]">
                    <tr>
                      {['Order ID','Service','Service ID','Platform','Quantity','Charge','Status','Date','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#253a5e]/50">
                    {displayedOrders.map(order => {
                      const status = getStatus(order.status);
                      const StatusIcon = status.icon;
                      const canCancel = order.cancelSupported && order.providerOrderId && order.providerId && !order.cancelRequested && !['cancel_requested', 'cancelled', 'refunded', 'completed', 'failed'].includes(order.status);
                      const canRefill = (() => {
                        if (!order.refillSupported || !order.providerOrderId || !order.providerId) return false;
                        if (order.status !== 'completed') return false;
                        if (order.refillUsed) return false;
                        const periodDays = parseInt((order.refillPeriodDays ?? order.refillDays) || 0);
                        if (periodDays <= 0) return true;
                        if (!order.completedAt) return false;
                        const completedTime = order.completedAt?.toDate ? order.completedAt.toDate() : new Date(order.completedAt);
                        if (!completedTime || isNaN(completedTime.getTime())) return false;
                        const expiresAt = new Date(completedTime.getTime() + periodDays * 24 * 60 * 60 * 1000);
                        return new Date() < expiresAt;
                      })();
                      
                      return (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-[#253a5e]/10 transition-colors">
                          <td className="px-4 py-3"><span className="font-mono text-sm text-blue-600 dark:text-blue-400">#{order.id.substring(0, 8)}</span></td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-700 dark:text-gray-300">{order.serviceName || 'N/A'}</span></td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 inline-block border border-blue-200 dark:border-blue-500/30">
                              {order.serviceId || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-700 dark:text-gray-300">{order.platformName || 'N/A'}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-semibold text-gray-900 dark:text-white">{order.quantity?.toLocaleString()}</span></td>
                          <td className="px-4 py-3"><span className="text-sm font-bold text-blue-600 dark:text-blue-400">{format(order.charge || 0)}</span></td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className={`text-xs ${status.spinning ? 'animate-spin' : ''} ${order.status === 'completed' ? 'animate-pulse' : ''}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3"><span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(order.createdAt)}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {canCancel && (
                                <button onClick={() => handleCancel(order)} disabled={!!actionLoading}
                                  className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-200 dark:border-red-500/30">
                                  {actionLoading === order.id + '-cancel' ? '...' : 'Cancel'}
                                </button>
                              )}
                              {canRefill && (
                                <button onClick={() => handleRefill(order)} disabled={!!actionLoading}
                                  className="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-500/20 transition-all border border-green-200 dark:border-green-500/30">
                                  {actionLoading === order.id + '-refill' ? '...' : 'Refill'}
                                </button>
                              )}
                              <button onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all border border-blue-200 dark:border-blue-500/30">
                                {selectedOrder?.id === order.id ? 'Hide' : 'Details'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2 sm:space-y-3">
              {displayedOrders.map(order => {
                const status = getStatus(order.status);
                const StatusIcon = status.icon;
                const canCancel = order.cancelSupported && order.providerOrderId && order.providerId && !order.cancelRequested && !['cancel_requested', 'cancelled', 'refunded', 'completed', 'failed'].includes(order.status);
                const canRefill = (() => {
                  if (!order.refillSupported || !order.providerOrderId || !order.providerId) return false;
                  if (order.status !== 'completed') return false;
                  if (order.refillUsed) return false;
                  const periodDays = parseInt((order.refillPeriodDays ?? order.refillDays) || 0);
                  if (periodDays <= 0) return true;
                  if (!order.completedAt) return false;
                  const completedTime = order.completedAt?.toDate ? order.completedAt.toDate() : new Date(order.completedAt);
                  if (!completedTime || isNaN(completedTime.getTime())) return false;
                  const expiresAt = new Date(completedTime.getTime() + periodDays * 24 * 60 * 60 * 1000);
                  return new Date() < expiresAt;
                })();
                
                return (
                  <div key={order.id} className="bg-white dark:bg-[#1a2742] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e]">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">#{order.id.substring(0, 8)}</span>
                          <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${status.color}`}>
                            <StatusIcon className={`text-[9px] sm:text-[10px] ${status.spinning ? 'animate-spin' : ''}`} />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white sm:truncate">{order.serviceName || 'N/A'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">{format(order.charge || 0)}</p>
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">Qty: {order.quantity?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                      <span>ID: <span className="font-mono text-blue-600 dark:text-blue-400">{order.serviceId || 'N/A'}</span></span>
                      <span className="sm:truncate">Platform: {order.platformName || 'N/A'}</span>
                      <span className="whitespace-nowrap">Date: {formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-100 dark:border-[#253a5e]">
                      {canCancel && (
                        <button onClick={() => handleCancel(order)} disabled={!!actionLoading}
                          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] sm:text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-200 dark:border-red-500/30 text-center whitespace-nowrap">
                          {actionLoading === order.id + '-cancel' ? '...' : 'Cancel'}
                        </button>
                      )}
                      {canRefill && (
                        <button onClick={() => handleRefill(order)} disabled={!!actionLoading}
                          className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] sm:text-xs font-semibold hover:bg-green-100 dark:hover:bg-green-500/20 transition-all border border-green-200 dark:border-green-500/30 text-center whitespace-nowrap">
                          {actionLoading === order.id + '-refill' ? '...' : 'Refill'}
                        </button>
                      )}
                      <button onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all border border-blue-200 dark:border-blue-500/30 text-center whitespace-nowrap">
                        {selectedOrder?.id === order.id ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a2742] max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 dark:border-[#253a5e] shadow-2xl">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Order Details</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Order #{selectedOrder.id.substring(0, 8)}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <FiXCircle size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['Service', selectedOrder.serviceName || 'N/A'],
                      ['Service ID', selectedOrder.serviceId || 'N/A'],
                      ['Platform', selectedOrder.platformName || 'N/A'],
                      ['Category', selectedOrder.categoryName || 'N/A'],
                      ['Quantity', selectedOrder.quantity?.toLocaleString()],
                      ['Start Count', selectedOrder.startCount || 0],
                      ['Remains', selectedOrder.remains || 0],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                        <p className={`text-sm font-medium ${label === 'Service ID' ? 'font-mono text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{val}</p>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Charge</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{format(selectedOrder.charge || 0)}</p>
                    </div>
                    {selectedOrder.refundAmount > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Refund Issued</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">+{format(selectedOrder.refundAmount)}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target Link</p>
                    <a href={selectedOrder.link} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 break-all">
                      {selectedOrder.link} <FiExternalLink className="text-xs flex-shrink-0" />
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Current Status</p>
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${getStatus(selectedOrder.status).color}`}>
                      {React.createElement(getStatus(selectedOrder.status).icon, { className: `text-xs ${getStatus(selectedOrder.status).spinning ? 'animate-spin' : ''}` })}
                      {getStatus(selectedOrder.status).label}
                    </span>
                  </div>
                  <div className="pt-4 border-t border-gray-100 dark:border-[#253a5e] text-xs text-gray-400 dark:text-gray-500 space-y-1">
                    <p>Created: {formatDate(selectedOrder.createdAt)}</p>
                    <p>Updated: {formatDate(selectedOrder.updatedAt)}</p>
                    {selectedOrder.cancelSupported && <p className="text-red-400">✕ Cancel supported</p>}
                    {selectedOrder.refillSupported && <p className="text-green-400">↩ Refill supported</p>}
                    {selectedOrder.refillUsed && <p className="text-yellow-400">↩ Refill already used</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 🚀 Infinite Scroll Trigger */}
        {hasMore && !ordersLoading && displayedOrders.length > 0 && (
          <div ref={loadMoreRef} className="py-8 text-center">
            <Spinner size="md" />
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Loading more orders...</p>
          </div>
        )}
        
        {!hasMore && displayedOrders.length > 0 && (
          <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            All orders loaded ({displayedOrders.length} total)
          </div>
        )}
      </div>
    </div>
  );
}
