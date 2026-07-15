'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiDownload, FiCheck, FiClock, FiX } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    if (user && !authLoading) {
      fetchTransactions();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchTransactions = async () => {
    try {
      const q = query(
        collection(db, 'paymentTransactions'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      setTransactions(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toDate?.() || b.createdAt) - (a.createdAt?.toDate?.() || a.createdAt))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.status === filter);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="text-yellow-500 text-lg" />;
      case 'verified': return <FiCheck className="text-green-500 text-lg" />;
      case 'rejected': return <FiX className="text-red-500 text-lg" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-dark-100 text-dark-600';
    }
  };

  if (authLoading || loading) return <PageLoader />;

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4">
        <div className="text-center">
          <p className="text-dark-500">Please log in to view your transactions</p>
          <Link href="/auth/login" className="btn-primary mt-4">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors">
            <FiArrowLeft className="text-lg text-dark-600 dark:text-dark-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white">Transaction History</h1>
            <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">View all your deposit transactions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-dark-500 text-sm mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-dark-900 dark:text-white">{transactions.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-dark-500 text-sm mb-1">Verified</p>
            <p className="text-2xl font-bold text-green-600">{transactions.filter(t => t.status === 'verified').length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-dark-500 text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{transactions.filter(t => t.status === 'pending').length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-dark-500 text-sm mb-1">Total Deposited</p>
            <p className="text-2xl font-bold text-primary-600">
              {format(transactions.filter(t => t.status === 'verified').reduce((sum, t) => sum + (t.depositAmount || t.amount), 0))}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'verified', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-dark-500 font-semibold text-lg">No {filter !== 'all' ? filter : ''} transactions</p>
            <p className="text-dark-400 text-sm mt-1">Your deposit transactions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(tx => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="glass-card p-4 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(tx.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-900 dark:text-white">{tx.paymentMethodName}</p>
                      <p className="text-sm text-dark-400">
                        {new Date(tx.createdAt?.toDate?.() || tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt?.toDate?.() || tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{format(tx.amount)}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusColor(tx.status)}`}>
                      {tx.status === 'pending' ? 'Pending Verification' : tx.status === 'verified' ? 'Verified' : 'Rejected'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700 sticky top-0 bg-white dark:bg-dark-900">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="text-2xl text-dark-400 hover:text-dark-600">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Status */}
              <div className="bg-dark-50 dark:bg-dark-800/50 rounded-xl p-4 text-center">
                <div className="mb-2">{getStatusIcon(selectedTx.status)}</div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedTx.status)}`}>
                  {selectedTx.status === 'pending' ? 'Pending Verification' : selectedTx.status === 'verified' ? 'Verified ✓' : 'Rejected'}
                </span>
              </div>

              {/* Amount */}
              <div>
                <p className="text-sm text-dark-500 mb-1">Submitted Amount</p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{format(selectedTx.amount)}</p>
              </div>

              {/* Fee Breakdown if Verified */}
              {selectedTx.status === 'verified' && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-4">
                  <h4 className="font-semibold text-dark-900 dark:text-white mb-3">✓ Verified - Fee Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-600 dark:text-dark-400">Submitted:</span>
                      <span className="font-semibold text-dark-900 dark:text-white">{format(selectedTx.amount)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Processing Fee (3%):</span>
                      <span className="font-semibold">{format(selectedTx.feeAmount || parseFloat((selectedTx.amount * 0.03).toFixed(5)))}</span>
                    </div>
                    <div className="border-t border-green-300 dark:border-green-500/50 pt-2 flex justify-between">
                      <span className="font-semibold text-dark-900 dark:text-white">Added to Wallet:</span>
                      <span className="font-bold text-lg text-green-600 dark:text-green-400">
                        {format(selectedTx.depositAmount || parseFloat((selectedTx.amount * 0.97).toFixed(5)))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <p className="text-sm text-dark-500 mb-1">Payment Method</p>
                <p className="font-semibold text-dark-900 dark:text-white">{selectedTx.paymentMethodName}</p>
              </div>

              {/* Date */}
              <div>
                <p className="text-sm text-dark-500 mb-1">Submitted</p>
                <p className="font-semibold text-dark-900 dark:text-white">
                  {new Date(selectedTx.createdAt?.toDate?.() || selectedTx.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Verified Date */}
              {selectedTx.verifiedAt && (
                <div>
                  <p className="text-sm text-dark-500 mb-1">Verified</p>
                  <p className="font-semibold text-green-600">
                    {new Date(selectedTx.verifiedAt?.toDate?.() || selectedTx.verifiedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Your Details */}
              <div className="border-t border-dark-200 dark:border-dark-700 pt-4">
                <h4 className="font-semibold text-dark-900 dark:text-white mb-3">Your Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-dark-500">Name</p>
                    <p className="font-semibold text-dark-900 dark:text-white">{selectedTx.fullName}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Account Number</p>
                    <p className="font-semibold text-dark-900 dark:text-white font-mono">{selectedTx.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Transaction ID</p>
                    <p className="font-semibold text-dark-900 dark:text-white font-mono">{selectedTx.transactionId}</p>
                  </div>
                </div>
              </div>

              {/* Proof Image */}
              {selectedTx.proofImage && (
                <div className="border-t border-dark-200 dark:border-dark-700 pt-4">
                  <h4 className="font-semibold text-dark-900 dark:text-white mb-2">Payment Proof</h4>
                  <img src={selectedTx.proofImage} alt="Proof" className="w-full rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
