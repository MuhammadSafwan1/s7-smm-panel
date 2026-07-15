'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
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

  const statusOptions = [
    { value: 'all',        label: 'All Orders'  },
    { value: 'pending',    label: 'Pending'     },
    { value: 'processing', label: 'Processing'  },
    { value: 'completed',  label: 'Completed'   },
    { value: 'partial',    label: 'Partial'     },
    { value: 'cancelled',  label: 'Cancelled'   },
    { value: 'refunded',   label: 'Refunded'    },
    { value: 'failed',     label: 'Failed'      },
  ];

  useEffect(() => { fetchOrders(); }, []);
  useEffect(() => { filterOrders(); }, [searchTerm, statusFilter, orders]);

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
    } catch (e) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
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
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: new Date() });
      toast.success(`Status updated to ${newStatus}`);
      fetchOrders();
      setShowDetailsModal(false);
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(false); }
  };

  const refundOrder = async (orderId, userId, charge) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'refunded', updatedAt: new Date() });
      const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
      if (!usersSnap.empty) {
        const ud = usersSnap.docs[0];
        await updateDoc(doc(db, 'users', ud.id), { balance: (ud.data().balance || 0) + charge });
      }
      toast.success(`Refunded! ${format(charge)} added to user balance`);
      fetchOrders();
      setShowDetailsModal(false);
    } catch { toast.error('Failed to refund'); }
    finally { setUpdating(false); }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':  return <FiCheckCircle className="text-green-500" />;
      case 'pending':    return <FiClock className="text-yellow-500" />;
      case 'processing': return <FiRefreshCw className="text-blue-500 animate-spin" />;
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
      case 'cancelled':
      case 'failed':     return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'refunded':   return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      default:           return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">Orders Management</h2>
        <p className="text-dark-500 dark:text-dark-400">View and manage all customer orders</p>
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
                  {['Order ID','User','Service','Platform','Quantity','Charge','Status','Date','Actions'].map(h => (
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
                    <td className="px-4 py-3"><span className="text-sm text-dark-700 dark:text-dark-300">{order.platformName || 'N/A'}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-semibold">{order.quantity?.toLocaleString()}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-primary-600 dark:text-primary-400">{format(order.charge || 0)}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}{order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="text-sm text-dark-600 dark:text-dark-400">{order.createdAt?.toDate().toLocaleDateString()}</span></td>
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
                    ['Quantity', selectedOrder.quantity?.toLocaleString()],
                    ['Start Count', selectedOrder.startCount || 0],
                    ['Remains', selectedOrder.remains || 0],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-dark-500 mb-1">{label}</p>
                      <p className="text-sm font-medium text-dark-900 dark:text-white">{val}</p>
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
                    {getStatusIcon(selectedOrder.status)}{selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-dark-500 mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {['pending','processing','completed','partial','cancelled','failed'].map(status => (
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
                {selectedOrder.status !== 'refunded' && (
                  <div className="pt-4 border-t border-dark-200 dark:border-dark-700">
                    <button onClick={() => refundOrder(selectedOrder.id, selectedOrder.userId, selectedOrder.charge)}
                      disabled={updating}
                      className="w-full btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-2">
                      <FiDollarSign />
                      {updating ? 'Processing...' : 'Refund Order'}
                    </button>
                  </div>
                )}
                <div className="pt-4 border-t border-dark-200 dark:border-dark-700 text-xs text-dark-500 space-y-1">
                  <p>Created: {selectedOrder.createdAt?.toDate().toLocaleString()}</p>
                  <p>Updated: {selectedOrder.updatedAt?.toDate().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
