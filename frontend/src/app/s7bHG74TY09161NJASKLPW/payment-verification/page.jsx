'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, updateDoc, doc, Timestamp, getDoc, increment, query, where } from 'firebase/firestore';
import { cachedQuery, invalidateCache } from '@/lib/cache';
import toast from 'react-hot-toast';
import { FiCheck, FiXCircle, FiEye, FiDownload } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';

export default function PaymentVerificationPage() {
  const { format, currency, rates, currencies } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, verified, rejected
  const [selectedTx, setSelectedTx] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [fullImage, setFullImage] = useState('');

  // Convert PKR amount to selected currency for display
  const formatAmountFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return format(0);
    
    // PKR amounts are base amounts in database
    if (currency === 'PKR') {
      const currencyObj = currencies.find(c => c.code === 'PKR');
      const symbol = currencyObj?.symbol || '₨';
      return `${symbol}${pkrAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }

    // Convert PKR to USD first, then to target currency
    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];

    // Get currency symbol
    const currencyObj = currencies.find(c => c.code === currency);
    const symbol = currencyObj?.symbol || currency;

    // Format with proper decimals
    let decimals = 2;
    if (['PKR', 'BDT', 'INR', 'SAR', 'AED'].includes(currency)) {
      decimals = converted < 10 ? 4 : 0;
    }

    const formattedStr = converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${symbol}${formattedStr}`;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('📅 [ADMIN] Fetching all payment transactions...');
      
      const txData = await cachedQuery('admin:paymentVerification', async () => {
        const snap = await getDocs(collection(db, 'paymentTransactions'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }, 30000);
      
      setTransactions(txData);
      
      console.log(`✅ [ADMIN] Fetched ${txData.length} total transactions`);
      console.log(`  - Pending: ${txData.filter(t => t.status === 'pending').length}`);
      console.log(`  - Verified: ${txData.filter(t => t.status === 'verified').length}`);
      console.log(`  - Rejected: ${txData.filter(t => t.status === 'rejected').length}`);
    } catch (e) { 
      console.error('❌ [ADMIN] Transaction fetch error:', e); 
    }
    finally { setLoading(false); }
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const filtered = transactions
    .filter(tx => {
      if (tx.status !== filter) return false;
      const txDate = tx.createdAt?.toDate?.() || new Date(tx.createdAt || 0);
      return txDate >= sevenDaysAgo;
    })
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || new Date(a.createdAt || 0).getTime();
      const bTime = b.createdAt?.toDate?.()?.getTime() || new Date(b.createdAt || 0).getTime();
      return bTime - aTime; // descending (newest first)
    });

  const handleVerify = async (id) => {
    try {
      const tx = transactions.find(t => t.id === id);
      if (!tx) {
        toast.error('Transaction not found');
        return;
      }

      // DUPLICATE CHECK: Same Transaction ID + Same Payment Method
      if (tx.transactionId && tx.transactionId.trim()) {
        const txIdLower = tx.transactionId.trim().toLowerCase();
        const duplicateTx = transactions.find(t => 
          t.id !== id && 
          t.status === 'verified' && 
          t.transactionId && 
          t.transactionId.trim().toLowerCase() === txIdLower &&
          t.paymentMethodName === tx.paymentMethodName
        );
        
        if (duplicateTx) {
          // Auto-reject duplicate
          await updateDoc(doc(db, 'paymentTransactions', id), {
            status: 'rejected',
            rejectedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            rejectReason: `Duplicate Transaction ID: This transaction ID has already been verified for ${duplicateTx.userName} (${duplicateTx.userEmail}) on ${new Date(duplicateTx.verifiedAt?.toDate?.() || duplicateTx.verifiedAt).toLocaleDateString()}`
          });
          toast.error(
            `🚫 DUPLICATE DETECTED!\n\n` +
            `Transaction ID "${tx.transactionId}" was already verified for:\n` +
            `User: ${duplicateTx.userName}\n` +
            `Date: ${new Date(duplicateTx.verifiedAt?.toDate?.() || duplicateTx.verifiedAt).toLocaleDateString()}\n\n` +
            `This transaction has been auto-rejected.`,
            { duration: 6000 }
          );
          setShowModal(false);
          fetchData();
          return;
        }
      }

      // DUPLICATE CHECK: Verify account number + amount combo hasn't been used
      if (tx.accountNumber && tx.accountNumber.trim()) {
        const accNumLower = tx.accountNumber.trim().toLowerCase();
        const duplicateByAccount = transactions.find(t => 
          t.id !== id && 
          t.status === 'verified' && 
          t.accountNumber && 
          t.accountNumber.trim().toLowerCase() === accNumLower &&
          t.amount === tx.amount
        );
        
        if (duplicateByAccount) {
          await updateDoc(doc(db, 'paymentTransactions', id), {
            status: 'rejected',
            rejectedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            rejectReason: `Duplicate Payment: Same account number and amount (${formatAmountFromPKR(tx.amount)}) was already verified for ${duplicateByAccount.userName} (${duplicateByAccount.userEmail})`
          });
          toast.error(
            `🚫 DUPLICATE DETECTED!\n\n` +
            `Same account number (${tx.accountNumber}) with same amount (${formatAmountFromPKR(tx.amount)}) was already verified for:\n` +
            `User: ${duplicateByAccount.userName}\n` +
            `Date: ${new Date(duplicateByAccount.verifiedAt?.toDate?.() || duplicateByAccount.verifiedAt).toLocaleDateString()}\n\n` +
            `This transaction has been auto-rejected.`,
            { duration: 6000 }
          );
          setShowModal(false);
          fetchData();
          return;
        }
      }

      // Calculate fee/bonus and remaining amount using dynamic feePercent and chargeType from transaction
      const feePercent = tx.feePercent ?? 0;
      const chargeType = tx.chargeType || 'fee'; // 'fee' or 'bonus'
      
      let finalAmount;
      let feeOrBonusAmount;
      
      if (chargeType === 'bonus') {
        // Bonus: Add extra to user
        feeOrBonusAmount = parseFloat((tx.amount * feePercent / 100).toFixed(2));
        finalAmount = parseFloat((tx.amount + feeOrBonusAmount).toFixed(2));
      } else {
        // Fee: Deduct from amount
        feeOrBonusAmount = parseFloat((tx.amount * feePercent / 100).toFixed(2));
        finalAmount = parseFloat((tx.amount - feeOrBonusAmount).toFixed(2));
      }

      // CRITICAL VALIDATION: Ensure amounts are reasonable
      if (tx.amount < 1 || tx.amount > 1000000) {
        toast.error(`Invalid transaction amount: ${tx.amount} PKR. Please check the transaction.`);
        return;
      }
      
      console.log('Payment Verification:', {
        transactionId: id,
        originalAmount: tx.amount,
        currencyUsed: tx.currencyUsed || 'PKR',
        amountEntered: tx.amountEntered,
        chargeType: chargeType,
        feePercent: feePercent,
        feeOrBonusAmount: feeOrBonusAmount,
        finalAmount: finalAmount
      });

      // Confirm before proceeding
      const confirmed = confirm(
        `Verify this payment?\n\n` +
        `User: ${tx.userName}\n` +
        `Amount in DB: ₨${tx.amount.toFixed(2)} PKR\n` +
        `${tx.currencyUsed && tx.currencyUsed !== 'PKR' ? `(User paid: ${tx.currencyUsed} ${tx.amountEntered})\n` : ''}` +
        `${chargeType === 'bonus' ? `Bonus (${feePercent}%): +₨${feeOrBonusAmount.toFixed(2)} PKR\n` : `Fee (${feePercent}%): -₨${feeOrBonusAmount.toFixed(2)} PKR\n`}` +
        `Will add to wallet: ₨${finalAmount.toFixed(2)} PKR\n\n` +
        `Click OK to verify and add funds to user's account.`
      );
      
      if (!confirmed) return;

      // Update transaction status
      await updateDoc(doc(db, 'paymentTransactions', id), {
        status: 'verified',
        feeOrBonusAmount: feeOrBonusAmount,
        depositAmount: finalAmount,
        verifiedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Get user document and update wallet balance
      const userRef = doc(db, 'users', tx.userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentBalance = userSnap.data().walletBalance || 0;
        const newBalance = parseFloat((currentBalance + finalAmount).toFixed(2));
        
        console.log('Wallet Update:', {
          userId: tx.userId,
          currentBalance: currentBalance,
          addingAmount: finalAmount,
          newBalance: newBalance
        });
        
        await updateDoc(userRef, {
          walletBalance: newBalance,
          updatedAt: Timestamp.now(),
        });

        // Commission logic: credit referrer if user was referred by someone
        try {
          const userData = userSnap.data();
          if (userData?.referredBy) {
            const settingsSnap = await getDoc(doc(db, 'siteSettings', 'referral'));
            const commissionRate = settingsSnap.exists() ? (settingsSnap.data().commissionRate || 5) : 5;
            const commission = parseFloat((finalAmount * commissionRate / 100).toFixed(2));

            if (commission > 0) {
              const referrerRef = doc(db, 'users', userData.referredBy);
              await updateDoc(referrerRef, {
                referralEarnings: increment(commission),
                totalCommission: increment(commission),
                updatedAt: Timestamp.now(),
              });

              const referralsQuery = query(
                collection(db, 'referrals'),
                where('referrerId', '==', userData.referredBy),
                where('referredUserId', '==', tx.userId)
              );
              const referralsSnap = await getDocs(referralsQuery);
              if (!referralsSnap.empty) {
                const referralDoc = referralsSnap.docs[0];
                await updateDoc(doc(db, 'referrals', referralDoc.id), {
                  commissionEarned: increment(commission),
                  updatedAt: Timestamp.now(),
                });
              }
            }
          }
        } catch (commissionError) {
          console.error('Commission error:', commissionError);
        }

        toast.success(
          `✅ Payment Verified!\n` +
          `💰 ₨${finalAmount.toFixed(2)} added to ${tx.userName}'s wallet\n` +
          `New Balance: ₨${newBalance.toFixed(2)}`,
          { duration: 5000 }
        );
      } else {
        toast.error('User not found');
        return;
      }

      setShowModal(false);
      fetchData();
      invalidateCache('admin:paymentVerification');
      invalidateCache(`tx:all:${tx.userId}`);
      invalidateCache(`collection:transactions:user:${tx.userId}`);
      invalidateCache('collection:paymentTransactions');
    } catch (e) { 
      toast.error(e.message || 'Failed to verify payment'); 
    }
  };

  const handleReject = async (id) => {
    try {
      await updateDoc(doc(db, 'paymentTransactions', id), {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success('Payment rejected');
      setShowModal(false);
      fetchData();
      invalidateCache('admin:paymentVerification');
      invalidateCache('collection:paymentTransactions');
    } catch (e) { toast.error(e.message); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'verified': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-300';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">Payment Verification</h2>
        <p className="text-dark-500 dark:text-dark-400 text-sm">Review and verify user deposit payments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['pending', 'verified', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${
              filter === tab
                ? 'bg-primary-500 text-white shadow-lg'
                : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {transactions.filter(t => t.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-500">Loading transactions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-dark-500 font-semibold">No {filter} transactions</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-200 dark:border-dark-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-400">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-400">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-400">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-400">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-400">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-dark-600 dark:text-dark-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-800">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-dark-900 dark:text-white">
                      <div>
                        <p className="font-semibold">{tx.userName}</p>
                        <p className="text-xs text-dark-400">{tx.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-600 dark:text-dark-400">{tx.paymentMethodName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary-600 dark:text-primary-400">{formatAmountFromPKR(tx.amount)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tx.status)}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-500 dark:text-dark-400">
                      {new Date(tx.createdAt?.toDate?.() || tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setShowModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/30 text-xs font-medium transition-colors"
                      >
                        <FiEye /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700 sticky top-0 bg-white dark:bg-dark-900">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">Payment Details</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-2xl text-dark-400 hover:text-dark-600">×</button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* User Info */}
              <div>
                <h4 className="font-semibold text-dark-900 dark:text-white mb-3">User Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-500">Name</p>
                    <p className="font-semibold text-dark-900 dark:text-white">{selectedTx.userName}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Email</p>
                    <p className="font-semibold text-dark-900 dark:text-white break-all">{selectedTx.userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="font-semibold text-dark-900 dark:text-white mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-500">Method</p>
                    <p className="font-semibold text-dark-900 dark:text-white">{selectedTx.paymentMethodName}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Submitted Amount</p>
                    <p className="font-bold text-lg text-primary-600 dark:text-primary-400">{formatAmountFromPKR(selectedTx.amount)}</p>
                    {selectedTx.currencyUsed && selectedTx.currencyUsed !== 'PKR' && (
                      <p className="text-xs text-dark-400 mt-1">
                        User paid: {selectedTx.currencyUsed} {selectedTx.amountEntered?.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee/Bonus Breakdown */}
              <div className={`bg-gradient-to-r ${(selectedTx.chargeType === 'bonus') ? 'from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/10 border-green-200 dark:border-green-500/30' : 'from-blue-50 to-amber-50 dark:from-blue-500/10 dark:to-amber-500/10 border-blue-200 dark:border-blue-500/30'} rounded-xl p-4 border-2`}>
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-xl">{(selectedTx.chargeType === 'bonus') ? '🎁' : '💰'}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-dark-900 dark:text-white">
                      Auto-Add to Wallet ({selectedTx.feePercent ?? 0}% {(selectedTx.chargeType === 'bonus') ? 'Bonus' : 'Fee'})
                    </h4>
                    <p className="text-xs text-dark-600 dark:text-dark-400 mt-0.5">
                      When you verify, funds will be automatically added to user's wallet
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dark-600 dark:text-dark-400">Payment Amount:</span>
                    <span className="font-semibold text-dark-900 dark:text-white">{formatAmountFromPKR(selectedTx.amount)}</span>
                  </div>
                  <div className={`flex justify-between ${(selectedTx.chargeType === 'bonus') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <span>{(selectedTx.chargeType === 'bonus') ? 'Bonus' : 'Processing Fee'} ({selectedTx.feePercent ?? 0}%):</span>
                    <span className="font-semibold">
                      {(selectedTx.chargeType === 'bonus') ? '+' : '-'} {formatAmountFromPKR(parseFloat((selectedTx.amount * (selectedTx.feePercent ?? 0) / 100).toFixed(5)))}
                    </span>
                  </div>
                  <div className={`border-t-2 ${(selectedTx.chargeType === 'bonus') ? 'border-green-300 dark:border-green-500/50' : 'border-amber-300 dark:border-amber-500/50'} pt-2 flex justify-between items-center`}>
                    <span className="font-semibold text-dark-900 dark:text-white">Will Add to Wallet:</span>
                    <span className={`font-bold text-xl ${(selectedTx.chargeType === 'bonus') ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      + {formatAmountFromPKR(parseFloat(((selectedTx.chargeType === 'bonus') ? (selectedTx.amount + selectedTx.amount * (selectedTx.feePercent ?? 0) / 100) : (selectedTx.amount - selectedTx.amount * (selectedTx.feePercent ?? 0) / 100)).toFixed(5)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Credentials */}
              <div>
                <h4 className="font-semibold text-dark-900 dark:text-white mb-3">User Credentials</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-dark-500">Full Name</p>
                    <p className="font-semibold text-dark-900 dark:text-white">{selectedTx.fullName}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Account Number</p>
                    <p className="font-semibold text-dark-900 dark:text-white">{selectedTx.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-dark-500">Transaction ID</p>
                    <p className="font-semibold text-dark-900 dark:text-white font-mono">{selectedTx.transactionId}</p>
                  </div>
                </div>
              </div>

              {/* Proof Image */}
              {selectedTx.proofImage && (
                <div>
                  <h4 className="font-semibold text-dark-900 dark:text-white mb-3">Payment Proof</h4>
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => {
                      setFullImage(selectedTx.proofImage);
                      setShowImageModal(true);
                    }}
                  >
                    <img 
                      src={selectedTx.proofImage} 
                      alt="Proof" 
                      className="w-full max-h-96 object-contain rounded-lg border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-2 transition-transform group-hover:scale-[1.02]" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary-500 text-white px-4 py-2 rounded-lg font-semibold">
                        🔍 Click to view full size
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Actions */}
              <div className="bg-dark-50 dark:bg-dark-800/50 rounded-xl p-4">
                <p className="text-sm text-dark-500 mb-3">Current Status:</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTx.status)}`}>
                    {selectedTx.status.toUpperCase()}
                  </span>
                  {selectedTx.verifiedAt && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Verified at {new Date(selectedTx.verifiedAt?.toDate?.() || selectedTx.verifiedAt).toLocaleString()}
                    </span>
                  )}
                </div>

                {selectedTx.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify(selectedTx.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                    >
                      <FiCheck className="text-lg" /> Verify & Add to Wallet
                    </button>
                    <button
                      onClick={() => handleReject(selectedTx.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
                    >
                      <FiXCircle className="text-lg" /> Reject Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold transition-colors z-10"
          >
            ×
          </button>
          <img 
            src={fullImage} 
            alt="Full Size Proof"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm">
            🔍 Click outside to close
          </div>
        </div>
      )}
    </div>
  );
}
