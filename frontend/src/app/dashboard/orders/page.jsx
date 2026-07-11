'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { Spinner, PageLoader } from '@/components/common/Loader';
import { FiPackage, FiArrowLeft, FiClock, FiCheckCircle, FiXCircle, FiRefreshCw, FiExternalLink } from 'react-icons/fi';

const statusConfig = {
  pending:    { label: 'Pending',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', icon: FiClock },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',    icon: FiRefreshCw },
  completed:  { label: 'Completed',  color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',  icon: FiCheckCircle },
  partial:    { label: 'Partial',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400', icon: FiRefreshCw },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',      icon: FiXCircle },
  refunded:   { label: 'Refunded',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: FiCheckCircle },
  failed:     { label: 'Failed',     color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',      icon: FiXCircle },
};

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      // Query orders by userId, sort by createdAt desc
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const ordersList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bTime - aTime;
        });
      setOrders(ordersList);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  };

  const getStatus = (status) => statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: FiClock };

  if (authLoading) return <PageLoader />;

  if (!user) {
    return (
      <div className="container-custom py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Please Login</h2>
        <Link href="/auth/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-dark-600 dark:text-dark-400 hover:text-primary-600 mb-8 transition-colors text-sm">
        <FiArrowLeft /> Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-white">My Orders</h1>
        <span className="text-sm text-dark-500">{orders.length} orders</span>
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
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-100 dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Charge</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {orders.map((order) => {
                  const status = getStatus(order.status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={order.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-dark-900 dark:text-white">#{order.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-dark-900 dark:text-white line-clamp-1">{order.serviceName || '—'}</p>
                          <p className="text-xs text-dark-400 mt-0.5">{order.platformName} {order.categoryName ? `→ ${order.categoryName}` : ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-dark-900 dark:text-white">
                          {order.quantity?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                          ${(order.charge || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                          <StatusIcon className="text-xs" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-dark-500">{formatDate(order.createdAt)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          {selectedOrder?.id === order.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded order details */}
          {selectedOrder && (
            <div className="border-t border-dark-200 dark:border-dark-700 p-6 bg-dark-50 dark:bg-dark-800/50">
              <h3 className="font-bold text-dark-900 dark:text-white mb-4 text-sm">Order Details — #{selectedOrder.id.substring(0, 8)}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-dark-400 mb-1">Target Link</p>
                  {selectedOrder.link ? (
                    <a href={selectedOrder.link} target="_blank" rel="noopener noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1 text-xs break-all">
                      {selectedOrder.link.substring(0, 40)}{selectedOrder.link.length > 40 ? '...' : ''}
                      <FiExternalLink className="flex-shrink-0" />
                    </a>
                  ) : <span className="text-dark-400">—</span>}
                </div>
                <div>
                  <p className="text-xs text-dark-400 mb-1">Quantity</p>
                  <p className="font-semibold text-dark-900 dark:text-white">{selectedOrder.quantity?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 mb-1">Start Count</p>
                  <p className="font-semibold text-dark-900 dark:text-white">{selectedOrder.startCount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 mb-1">Remains</p>
                  <p className="font-semibold text-dark-900 dark:text-white">{selectedOrder.remains ?? selectedOrder.quantity ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 mb-1">Amount Charged</p>
                  <p className="font-bold text-primary-600">${(selectedOrder.charge || 0).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 mb-1">Full Order ID</p>
                  <p className="font-mono text-xs text-dark-500 break-all">{selectedOrder.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
