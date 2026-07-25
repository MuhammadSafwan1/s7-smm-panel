'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, addDoc } from 'firebase/firestore';
import { useCurrency } from '@/context/CurrencyContext';
import {
  FiSearch, FiFilter, FiCheckCircle, FiClock,
  FiXCircle, FiRefreshCw, FiDollarSign, FiExternalLink
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';

export default function OrdersManagement() {
  const { format } = useCurrency();

  const [orders, setOrders]               = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updating, setUpdating]           = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [providers, setProviders] = useState({});

  const PROXY = 'https://smm-proxy.ms8347750.workers.dev';
  const SYNC_INTERVAL = 120000; // 2 minutes

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

  const statusOptions = [
    { value: 'all',        label: 'All Orders'  },
    { value: 'pending',    label: 'Pending'     },
    { value: 'processing', label: 'Processing'  },
    { value: 'completed',  label: 'Completed'   },
    { value: 'partial',    label: 'Partial'     },
    { value: 'cancel_requested', label: 'Cancel Requested' },
    { value: 'cancelled',  label: 'Cancelled'   },
    { value: 'refunded',   label: 'Refunded'    },
    { value: 'failed',     label: 'Failed'      },
  ];

  useEffect(() => { 
    fetchOrders();
    fetchProviders();
    
    // Auto-sync every 2 minutes
    const interval = setInterval(() => {
      syncActiveOrders();
    }, SYNC_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => { filterOrders(); }, [searchTerm, statusFilter, orders]);

  const fetchProviders = async () => {
    try {
      const snap = await getDocs(collection(db, 'providers'));
      const providerMap = {};
      snap.docs.forEach(d => {
        providerMap[d.id] = d.data();
      });
      setProviders(providerMap);
    } catch (e) {
      console.error('Failed to load providers', e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const data = await Promise.all(snap.docs.map(async (d) => {
        const o = { id: d.id, ...d.data() };
        try {
          if (o.userId) {
            const u = await getDocs(query(collection(db, 'users'), where('uid', '==', o.userId)));
            if (!u.empty) o.userEmail = u.docs[0].data().email;
          }
        } catch (_) {}
        return o;
      }));
      setOrders(data);
      
      // Auto-sync active orders after loading
      const synced = await syncOrdersList(data);
      setOrders(synced);
    } catch (e) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const syncActiveOrders = async () => {
    setSyncing(true);
    try {
      console.log('🔄 Auto-syncing active orders with provider...');
      const current = [...orders];
      const synced = await syncOrdersList(current);
      setOrders(synced);
      console.log('✅ Sync complete');
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  const syncOrdersList = async (ordersList) => {
    const active = ordersList.filter(o => 
      o.providerOrderId && 
      o.providerId && 
      ['pending', 'processing', 'refilling'].includes(o.status)
    );
    
    if (active.length === 0) return ordersList;
    
    console.log(`🔄 Syncing ${active.length} active orders...`);
    
    const updated = await Promise.all(ordersList.map(async (order) => {
      if (order.providerOrderId && order.providerId && ['pending', 'processing', 'refilling', 'cancel_requested'].includes(order.status)) {
        return await syncSingleOrder(order);
      }
      return order;
    }));
    
    return updated;
  };

  const syncSingleOrder = async (order) => {
    try {
      // Get provider
      const providerDoc = await getDocs(query(collection(db, 'providers'), where('__name__', '==', order.providerId)));
      if (providerDoc.empty) return order;
      
      const provider = providerDoc.docs[0].data();
      
      // Fetch status from provider
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: provider.apiUrl,
          apiKey: provider.apiKey,
          action: 'status',
          order: order.providerOrderId
        }),
      });
      
      if (res.status === 429) {
        console.warn('Rate limited - skipping');
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
        console.log(`📝 Updating order #${order.id.substring(0,8)}: ${order.status} → ${newStatus}`);
        
        const updateData = { 
          status: newStatus, 
          startCount, 
          remains, 
          updatedAt: new Date() 
        };
        
        if (newStatus === 'completed' && !order.completedAt) {
          updateData.completedAt = new Date();
        }

        // Auto-refund for partial (98%)
        if (newStatus === 'partial' && order.charge && !order.refundIssued) {
          const refundAmount = parseFloat((order.charge * 0.98 * (remains / parseInt(order.quantity))).toFixed(4));
          if (refundAmount > 0) {
            const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', order.userId)));
            if (!userSnap.empty) {
              const userDoc = userSnap.docs[0];
              const newBal = parseFloat(((userDoc.data().walletBalance || 0) + refundAmount).toFixed(4));
              await updateDoc(doc(db, 'users', userDoc.id), { walletBalance: newBal });
              await addDoc(collection(db, 'transactions'), {
                userId: order.userId,
                orderId: order.id,
                type: 'refund',
                amount: refundAmount,
                description: `Partial refund (2% fee) for order #${order.id.substring(0, 8)}`,
                createdAt: new Date(),
              });
            }
            updateData.refundIssued = true;
            updateData.refundAmount = refundAmount;
          }
        }

        // Auto-refund for cancelled/refunded by provider (98%)
        if ((newStatus === 'cancelled' || newStatus === 'refunded') && order.charge && !order.refundIssued) {
          const refundAmount = parseFloat((order.charge * 0.98).toFixed(4));
          if (refundAmount > 0) {
            const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', order.userId)));
            if (!userSnap.empty) {
              const userDoc = userSnap.docs[0];
              const newBal = parseFloat(((userDoc.data().walletBalance || 0) + refundAmount).toFixed(4));
              await updateDoc(doc(db, 'users', userDoc.id), { walletBalance: newBal });
              await addDoc(collection(db, 'transactions'), {
                userId: order.userId,
                orderId: order.id,
                type: 'refund',
                amount: refundAmount,
                description: `Provider ${newStatus} refund (2% fee) for order #${order.id.substring(0, 8)}`,
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
      console.error('Sync error for order:', order.id, e.message);
      return order;
    }
  };

  const filterOrders = () => {
    let f = [...orders];
    if (statusFilter !== 'all') f = f.filter(o => o.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.userEmail?.toLowerCase().includes(q) ||
        o.serviceName?.toLowerCase().includes(q) ||
        o.link?.toLowerCase().includes(q)
      );
    }
    setFilteredOrders(f);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast.error('Order not found');
        return;
      }
      
      // Update Firestore first
      await updateDoc(doc(db, 'orders', orderId), { 
        status: newStatus, 
        updatedAt: new Date() 
      });
      
      // If changing to cancelled/refunded, try to sync with provider and issue refund
      if ((newStatus === 'cancelled' || newStatus === 'refunded') && order.providerOrderId && order.providerId && order.charge && !order.refundIssued) {
        try {
          // Get provider details
          const providerSnap = await getDocs(query(collection(db, 'providers'), where('__name__', '==', order.providerId)));
          
          if (!providerSnap.empty) {
            const provider = providerSnap.docs[0].data();
            
            // Try to cancel with provider
            const res = await fetch(PROXY, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiUrl: provider.apiUrl,
                apiKey: provider.apiKey,
                action: 'cancel',
                orders: order.providerOrderId
              }),
            });
            
            if (res.ok) {
              const result = await res.json();
              console.log('Provider cancel result:', result);
            }
          }
          
          // Issue refund (98%) regardless of provider response
          const refundAmount = parseFloat((order.charge * 0.98).toFixed(4));
          const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', order.userId)));
          
          if (!usersSnap.empty) {
            const userDoc = usersSnap.docs[0];
            const newBalance = parseFloat(((userDoc.data().walletBalance || 0) + refundAmount).toFixed(4));
            await updateDoc(doc(db, 'users', userDoc.id), { walletBalance: newBalance });
            
            // Create transaction record
            await addDoc(collection(db, 'transactions'), {
              userId: order.userId,
              orderId: order.id,
              type: 'refund',
              amount: refundAmount,
              description: `Admin ${newStatus} refund (2% fee) for order #${order.id.substring(0, 8)}`,
              createdAt: new Date(),
            });
            
            // Mark refund as issued
            await updateDoc(doc(db, 'orders', orderId), {
              refundIssued: true,
              refundAmount: refundAmount
            });
          }
        } catch (refundError) {
          console.error('Refund error:', refundError);
          // Don't fail the status update if refund fails
        }
      }
      
      toast.success(`Status updated to ${newStatus}`);
      await fetchOrders();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const refundOrder = async () => {
    if (!selectedOrder) return;
    
    const amount = parseFloat(refundAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    
    if (amount > selectedOrder.charge) {
      toast.error('Refund amount cannot exceed order charge');
      return;
    }
    
    setUpdating(true);
    try {
      // Get user document
      const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', selectedOrder.userId)));
      
      if (usersSnap.empty) {
        toast.error('User not found');
        return;
      }
      
      const userDoc = usersSnap.docs[0];
      const currentBalance = userDoc.data().walletBalance || 0;
      const newBalance = parseFloat((currentBalance + amount).toFixed(4));
      
      await updateDoc(doc(db, 'users', userDoc.id), { 
        walletBalance: newBalance,
        updatedAt: new Date()
      });
      
      // Create transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: selectedOrder.userId,
        orderId: selectedOrder.id,
        type: 'refund',
        amount: amount,
        description: `Refund for order #${selectedOrder.id.substring(0, 8)}`,
        createdAt: new Date(),
      });
      
      // Update order status
      await updateDoc(doc(db, 'orders', selectedOrder.id), { 
        status: 'refunded',
        refundIssued: true,
        refundAmount: amount,
        updatedAt: new Date() 
      });
      
      toast.success(`✅ Refunded! ${format(amount)} added to user balance`);
      setShowRefundModal(false);
      setShowDetailsModal(false);
      setRefundAmount('');
      await fetchOrders();
    } catch (error) {
      console.error('Refund error:', error);
      toast.error('Failed to refund: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':  return <FiCheckCircle className="text-green-500 animate-pulse" />;
      case 'pending':    return <FiClock className="text-yellow-500 animate-spin" />;
      case 'processing': return <FiRefreshCw className="text-blue-500 animate-spin" />;
      case 'cancel_requested': return <FiClock className="text-orange-500 animate-spin" />;
      case 'cancelled':
      case 'failed':     return <FiXCircle className="text-red-500" />;
      default:           return <FiClock className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':  return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'pending':    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'partial':    return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
      case 'cancel_requested': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
      case 'cancelled':
      case 'failed':     return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'refunded':   return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      default:           return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const statusLabel = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    partial: 'Partial',
    cancelled: 'Cancelled',
    cancel_requested: 'Cancel Requested',
    refunded: 'Refunded',
    failed: 'Failed',
    refilling: 'Refilling',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">Orders Management</h2>
          <p className="text-dark-500 dark:text-dark-400">View and manage all customer orders</p>
        </div>
        <button
          onClick={syncActiveOrders}
          disabled={syncing}
          className="btn-outline flex items-center gap-2"
        >
          <FiRefreshCw className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Orders'}
        </button>
      </div>

      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input type="text" placeholder="Search by Order ID, User, Service..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer">
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{orders.length}</p>
            <p className="text-xs text-dark-500">Total Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
            <p className="text-xs text-dark-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'completed').length}</p>
            <p className="text-xs text-dark-500">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {format(orders.reduce((s, o) => s + (o.charge || 0), 0))}
            </p>
            <p className="text-xs text-dark-500">Total Revenue</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20"><Spinner /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center"><p className="text-dark-500 dark:text-dark-400">No orders found</p></div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-100 dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700">
                <tr>
                  {['Order ID','User','Service','Service ID','Provider Order ID','Platform','Quantity','Charge','Status','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-sm">#{order.id.substring(0, 8)}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-dark-700 dark:text-dark-300">{order.userEmail || 'Unknown'}</span></td>
                    <td className="px-4 py-3"><span className="text-sm text-dark-700 dark:text-dark-300">{order.serviceName || 'N/A'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {/* Website Service ID */}
                        <span className="font-mono text-xs bg-primary-100 dark:bg-primary-900/30 px-2 py-0.5 rounded text-primary-700 dark:text-primary-400 inline-block w-fit">
                          Web: {order.serviceId || 'N/A'}
                        </span>
                        {/* Provider Service ID */}
                        {order.providerId && providers[order.providerId] && order.providerServiceId ? (
                          <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400 inline-block w-fit">
                            {providers[order.providerId].name}: {order.providerServiceId}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-dark-400">Provider: N/A</span>
                        )}
                      </div>
                    </td>
                    {/* NEW: Provider Order ID Column */}
                    <td className="px-4 py-3">
                      {order.providerOrderId ? (
                        <span className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 inline-block">
                          {order.providerOrderId}
                        </span>
                      ) : (
                        <span className="text-xs text-dark-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-dark-700 dark:text-dark-300">{order.platformName || 'N/A'}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold">{order.quantity?.toLocaleString()}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-primary-600 dark:text-primary-400">{format(order.charge || 0)}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}{statusLabel[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-dark-600 dark:text-dark-400">{order.createdAt?.toDate?.()?.toLocaleDateString()}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">Order Details</h3>
                  <p className="text-sm text-dark-500">#{selectedOrder.id}</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-dark-400 hover:text-dark-600 text-2xl">×</button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['User Email', selectedOrder.userEmail || 'N/A'],
                    ['Service', selectedOrder.serviceName || 'N/A'],
                    ['Platform', selectedOrder.platformName || 'N/A'],
                    ['Category', selectedOrder.categoryName || 'N/A'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-dark-500 mb-1">{label}</p>
                      <p className={`text-sm font-medium ${label === 'Service ID' ? 'font-mono text-primary-600 dark:text-primary-400' : 'text-dark-900 dark:text-white'}`}>{val}</p>
                    </div>
                  ))}
                  {/* Service IDs - separate section */}
                  <div className="col-span-2">
                    <p className="text-xs text-dark-500 mb-1">Service IDs</p>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded text-primary-700 dark:text-primary-400 inline-block w-fit">
                        Website: {selectedOrder.serviceId || 'N/A'}
                      </span>
                      {selectedOrder.providerId && providers[selectedOrder.providerId] && selectedOrder.providerServiceId ? (
                        <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-blue-700 dark:text-blue-400 inline-block w-fit">
                          {providers[selectedOrder.providerId].name}: {selectedOrder.providerServiceId}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-dark-400">Provider: N/A</span>
                      )}
                    </div>
                  </div>
                  {[
                    ['Quantity', selectedOrder.quantity?.toLocaleString()],
                    ['Start Count', selectedOrder.startCount || 0],
                    ['Remains', selectedOrder.remains || 0],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-dark-500 mb-1">{label}</p>
                      <p className={`text-sm font-medium ${label === 'Service ID' ? 'font-mono text-primary-600 dark:text-primary-400' : 'text-dark-900 dark:text-white'}`}>{val}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-dark-500 mb-1">Charge</p>
                    <p className="text-sm font-bold text-primary-600">{format(selectedOrder.charge || 0)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-1">Target Link</p>
                  <a href={selectedOrder.link} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    {selectedOrder.link} <FiExternalLink className="text-xs" />
                  </a>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-2">Current Status</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusIcon(selectedOrder.status)}{statusLabel[selectedOrder.status] || selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['pending','processing','completed','partial','cancel_requested','cancelled','failed'].map(status => (
                      <button key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        disabled={updating || selectedOrder.status === status}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedOrder.status === status
                            ? 'bg-dark-200 dark:bg-dark-700 text-dark-400 cursor-not-allowed'
                            : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-primary-500 hover:text-white'
                        }`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedOrder.status !== 'refunded' && !selectedOrder.refundIssued && (
                  <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
                    <button 
                      onClick={() => {
                        setRefundAmount(String(selectedOrder.charge || 0));
                        setShowRefundModal(true);
                      }}
                      disabled={updating}
                      className="w-full btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-2">
                      <FiDollarSign />
                      {updating ? 'Processing...' : 'Refund Order'}
                    </button>
                  </div>
                )}
                <div className="pt-4 border-t border-dark-200 dark:border-dark-700 text-xs text-dark-500 space-y-1">
                  <p>Created: {selectedOrder.createdAt?.toDate?.()?.toLocaleString()}</p>
                  <p>Updated: {selectedOrder.updatedAt?.toDate?.()?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="glass-card max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-4">Refund Order</h3>
              <p className="text-sm text-dark-600 dark:text-dark-400 mb-4">
                Order: #{selectedOrder.id.substring(0, 8)}<br/>
                Total Charge: {format(selectedOrder.charge || 0)}
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Refund Amount
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Enter refund amount"
                  step="0.01"
                  min="0"
                  max={selectedOrder.charge}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-semibold"
                />
                <p className="text-xs text-dark-500 mt-2">
                  Maximum: {format(selectedOrder.charge || 0)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundAmount('');
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-3 bg-dark-200 dark:bg-dark-700 text-dark-900 dark:text-white rounded-lg font-medium hover:bg-dark-300 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={refundOrder}
                  disabled={updating}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiDollarSign />
                  {updating ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
