'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiDownload, FiCheck, FiClock, FiX, FiCreditCard, FiDollarSign } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('payments');
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    if (user && !authLoading) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchAllData = async () => {
    try {
      const [paySnap, withSnap] = await Promise.all([
        getDocs(query(collection(db, 'paymentTransactions'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'withdrawals'), where('userId', '==', user.uid)))
      ]);
      setTransactions(
        paySnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toDate?.() || b.createdAt) - (a.createdAt?.toDate?.() || a.createdAt))
      );
      setWithdrawals(
        withSnap.docs
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  if (authLoading || loading) return <PageLoader />;

  if (!user) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Please log in to view your transactions</p>
          <Link href="/auth/login" className="btn-primary mt-4">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">View all your deposit transactions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1e3050] p-1 rounded-xl mb-6 w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setTab('payments')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-initial ${
              tab === 'payments'
                ? 'bg-white dark:bg-[#253a5e] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#253a5e]/50'
            }`}
          >
            <FiCreditCard size={14} /> Deposits ({transactions.length})
          </button>
          <button
            onClick={() => setTab('withdrawals')}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-initial ${
              tab === 'withdrawals'
                ? 'bg-white dark:bg-[#253a5e] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#253a5e]/50'
            }`}
          >
            <FiDollarSign size={14} /> Withdrawals ({withdrawals.length})
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <FiCreditCard className="text-white" size={18} />
              </div>
              <p className="text-xs text-gray-400 font-medium">Total</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{transactions.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/30">
                <FiCheck className="text-white" size={18} />
              </div>
              <p className="text-xs text-gray-400 font-medium">Verified</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{transactions.filter(t => t.status === 'verified').length}</p>
          </div>
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <FiClock className="text-white" size={18} />
              </div>
              <p className="text-xs text-gray-400 font-medium">Pending</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{transactions.filter(t => t.status === 'pending').length}</p>
          </div>
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <FiDollarSign className="text-white" size={18} />
              </div>
              <p className="text-xs text-gray-400 font-medium">Deposited</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {format(transactions.filter(t => t.status === 'verified').reduce((sum, t) => sum + (t.depositAmount || t.amount), 0))}
            </p>
          </div>
        </div>

        {/* Filters */}
        {tab === 'payments' && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'pending', 'verified', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                  filter === status
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72]'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Deposits Tab */}
        {tab === 'payments' && (
          <>
            {filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#253a5e]">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
                  <FiCreditCard className="text-gray-400 dark:text-gray-500" size={28} />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">No {filter !== 'all' ? filter : ''} transactions</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Your deposit transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(tx => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="bg-white dark:bg-[#1a2742] rounded-2xl p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                          style={{
                            backgroundColor: tx.status === 'verified' ? '#16a34a' : tx.status === 'pending' ? '#eab308' : '#ef4444',
                            boxShadow: `0 8px 20px -4px ${tx.status === 'verified' ? '#16a34a50' : tx.status === 'pending' ? '#eab30850' : '#ef444450'}`
                          }}>
                          {tx.status === 'verified' ? <FiCheck className="text-white" size={18} /> : tx.status === 'pending' ? <FiClock className="text-white" size={18} /> : <FiX className="text-white" size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{tx.paymentMethodName}</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            {new Date(tx.createdAt?.toDate?.() || tx.createdAt).toLocaleDateString()} at {new Date(tx.createdAt?.toDate?.() || tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{format(tx.amount)}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusColor(tx.status)}`}>
                          {tx.status === 'pending' ? 'Pending Verification' : tx.status === 'verified' ? 'Verified' : 'Rejected'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Withdrawals Tab */}
        {tab === 'withdrawals' && (
          <>
            {withdrawals.length === 0 ? (
              <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-12 text-center border border-gray-100 dark:border-[#253a5e]">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
                  <FiDollarSign className="text-gray-400 dark:text-gray-500" size={28} />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">No withdrawal requests</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Your withdrawal history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map(w => (
                  <div key={w.id} className="bg-white dark:bg-[#1a2742] rounded-2xl p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                          style={{
                            backgroundColor: w.status === 'approved' ? '#16a34a' : w.status === 'pending' ? '#eab308' : '#ef4444',
                            boxShadow: `0 8px 20px -4px ${w.status === 'approved' ? '#16a34a50' : w.status === 'pending' ? '#eab30850' : '#ef444450'}`
                          }}>
                          {w.status === 'approved' ? <FiCheck className="text-white" size={18} /> : w.status === 'pending' ? <FiClock className="text-white" size={18} /> : <FiX className="text-white" size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white">{w.methodName}</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            {new Date(w.createdAt?.toDate?.() || w.createdAt).toLocaleDateString()} at {new Date(w.createdAt?.toDate?.() || w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Account: {w.accountName} — {w.accountNumber}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{format(w.amount)}</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusColor(w.status)}`}>
                          {w.status === 'pending' ? 'Pending' : w.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-[#253a5e]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#253a5e] sticky top-0 bg-white dark:bg-[#1a2742]">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <FiX size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Status */}
              <div className="bg-gray-50 dark:bg-[#253a5e]/30 rounded-xl p-4 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center shadow-lg"
                  style={{
                    backgroundColor: selectedTx.status === 'verified' ? '#16a34a' : selectedTx.status === 'pending' ? '#eab308' : '#ef4444',
                    boxShadow: `0 8px 20px -4px ${selectedTx.status === 'verified' ? '#16a34a50' : selectedTx.status === 'pending' ? '#eab30850' : '#ef444450'}`
                  }}>
                  {selectedTx.status === 'verified' ? <FiCheck className="text-white" size={20} /> : selectedTx.status === 'pending' ? <FiClock className="text-white" size={20} /> : <FiX className="text-white" size={20} />}
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedTx.status)}`}>
                  {selectedTx.status === 'pending' ? 'Pending Verification' : selectedTx.status === 'verified' ? 'Verified ✓' : 'Rejected'}
                </span>
              </div>

              {/* Amount */}
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Submitted Amount</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{format(selectedTx.amount)}</p>
              </div>

              {/* Fee Breakdown if Verified */}
              {selectedTx.status === 'verified' && (() => {
                const feePercent = selectedTx.feePercent ?? 0;
                const chargeType = selectedTx.chargeType || 'fee';
                const feeAmount = selectedTx.feeAmount ?? parseFloat((selectedTx.amount * feePercent / 100).toFixed(5));
                const depositAmount = selectedTx.depositAmount ?? (
                  chargeType === 'bonus'
                    ? parseFloat((selectedTx.amount + selectedTx.amount * feePercent / 100).toFixed(5))
                    : parseFloat((selectedTx.amount - selectedTx.amount * feePercent / 100).toFixed(5))
                );
                const isBonus = chargeType === 'bonus';
                return (
                  <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">✓ Verified - Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{format(selectedTx.amount)}</span>
                      </div>
                      {feePercent > 0 && (
                        <div className={`flex justify-between ${isBonus ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          <span>{isBonus ? `Bonus (${feePercent}%)` : `Processing Fee (${feePercent}%)`}:</span>
                          <span className="font-semibold">{isBonus ? '+' : '-'} {format(feeAmount)}</span>
                        </div>
                      )}
                      <div className="border-t border-green-200 dark:border-green-500/30 pt-2 flex justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">Added to Wallet:</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          {format(depositAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Method */}
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Payment Method</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedTx.paymentMethodName}</p>
              </div>

              {/* Date */}
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Submitted</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(selectedTx.createdAt?.toDate?.() || selectedTx.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Verified Date */}
              {selectedTx.verifiedAt && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Verified</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {new Date(selectedTx.verifiedAt?.toDate?.() || selectedTx.verifiedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Your Details */}
              <div className="border-t border-gray-100 dark:border-[#253a5e] pt-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Your Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedTx.fullName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Account Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white font-mono">{selectedTx.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Transaction ID</p>
                    <p className="font-semibold text-gray-900 dark:text-white font-mono">{selectedTx.transactionId}</p>
                  </div>
                </div>
              </div>

              {/* Proof Image */}
              {selectedTx.proofImage && (
                <div className="border-t border-gray-100 dark:border-[#253a5e] pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Payment Proof</h4>
                  <img src={selectedTx.proofImage} alt="Proof" className="w-full rounded-xl border border-gray-200 dark:border-[#253a5e] bg-gray-50 dark:bg-[#253a5e]/30 p-2" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
