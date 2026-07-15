'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/CurrencyContext';
import { useRouter } from 'next/navigation';

export default function AddFundsPage() {
  const { user, loading: authLoading } = useAuth();
  const { currency, rates, currencies } = useCurrency();
  const router = useRouter();

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      fetchPaymentMethods();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchPaymentMethods = async () => {
    try {
      const snap = await getDocs(collection(db, 'paymentMethods'));
      const methods = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.isActive);
      setPaymentMethods(methods);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  // Back button handler
  const handleBack = () => {
    router.push('/dashboard');
  };

  // Convert amount from PKR to selected currency
  const convertFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return 0;
    
    if (currency === 'PKR') {
      return parseFloat(pkrAmount);
    }

    // Convert PKR to USD first, then to target currency
    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];
    return converted;
  };

  // Format a single amount in the current currency
  const formatAmount = (pkrAmount) => {
    const converted = convertFromPKR(pkrAmount);
    
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

  const formatAmountRange = (minAmount, maxAmount) => {
    return `${formatAmount(minAmount)} - ${formatAmount(maxAmount)}`;
  };

  const handleMethodClick = (method) => {
    // Navigate to payment details page with method ID
    router.push(`/dashboard/add-funds/payment?methodId=${method.id}`);
  };

  if (authLoading || loading) return <PageLoader />;

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4">
        <div className="text-center">
          <p className="text-dark-500">Please log in to add funds</p>
          <Link href="/auth/login" className="btn-primary mt-4">Login</Link>
        </div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={handleBack} className="text-sm text-dark-500 hover:text-primary-500 flex items-center gap-1 mb-6 transition-colors">
            <FiArrowLeft /> Back to Dashboard
          </button>
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">💳</div>
            <p className="text-dark-500 font-semibold text-lg">No Payment Methods Available</p>
            <p className="text-dark-400 text-sm mt-1">Admin hasn't set up any payment methods yet</p>
          </div>
        </div>
      </div>
    );
  }

  const manualMethods = paymentMethods.filter(m => m.paymentType === 'manual');
  const autoMethods = paymentMethods.filter(m => m.paymentType === 'auto');

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleBack} className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors" title="Back to Dashboard">
            <FiArrowLeft className="text-lg text-dark-600 dark:text-dark-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white">Add Funds</h1>
            <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">Select a payment method to deposit money</p>
          </div>
        </div>

        {/* Currency Info Banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">
              💱
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-dark-900 dark:text-white text-base mb-1">
                Current Currency
              </h4>
              <p className="text-sm text-dark-600 dark:text-dark-300">
                Viewing in <span className="font-bold text-blue-600 dark:text-blue-400">{currencies.find(c => c.code === currency)?.name} ({currency})</span>
              </p>
            </div>
          </div>
        </div>

        {/* Manual Payments Section */}
        {manualMethods.length > 0 && (
          <div className="mb-10">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-l-4 border-yellow-500 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-xl">
                  📋
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-900 dark:text-white">Manual Payment Methods</h2>
                  <p className="text-sm text-dark-600 dark:text-dark-300">Admin will verify your payment within 24 hours</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {manualMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => handleMethodClick(method)}
                  className="group relative bg-white dark:bg-dark-800 rounded-2xl p-6 border-2 border-dark-200 dark:border-dark-700 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                >
                  {/* Image Container */}
                  {method.image && (
                    <div className="relative mb-5 bg-gradient-to-br from-dark-50 to-dark-100 dark:from-dark-700 dark:to-dark-800 rounded-xl p-6 h-36 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 group-hover:from-yellow-500/10 group-hover:to-orange-500/10 transition-colors"></div>
                      <img src={method.image} alt={method.name} className="relative z-10 max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-dark-900 dark:text-white text-xl group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                      {method.name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-500 dark:text-dark-400">Range:</span>
                        <span className="font-bold text-dark-900 dark:text-white">
                          {formatAmountRange(method.minAmount, method.maxAmount)}
                        </span>
                      </div>
                      
                      {method.feePercent !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-500 dark:text-dark-400">Fee:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {method.feePercent}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 border-t border-dark-200 dark:border-dark-700">
                      <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
                        Click to Continue →
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auto Payments Section */}
        {autoMethods.length > 0 && (
          <div>
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-l-4 border-green-500 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-xl">
                  🔄
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark-900 dark:text-white">Instant Payment Methods</h2>
                  <p className="text-sm text-dark-600 dark:text-dark-300">Funds added automatically after payment confirmation</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {autoMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => handleMethodClick(method)}
                  className="group relative bg-white dark:bg-dark-800 rounded-2xl p-6 border-2 border-dark-200 dark:border-dark-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                >
                  {/* Image Container */}
                  {method.image && (
                    <div className="relative mb-5 bg-gradient-to-br from-dark-50 to-dark-100 dark:from-dark-700 dark:to-dark-800 rounded-xl p-6 h-36 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 group-hover:from-green-500/10 group-hover:to-emerald-500/10 transition-colors"></div>
                      <img src={method.image} alt={method.name} className="relative z-10 max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-dark-900 dark:text-white text-xl group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {method.name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-500 dark:text-dark-400">Range:</span>
                        <span className="font-bold text-dark-900 dark:text-white">
                          {formatAmountRange(method.minAmount, method.maxAmount)}
                        </span>
                      </div>
                      
                      {method.feePercent !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-dark-500 dark:text-dark-400">Fee:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {method.feePercent}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 border-t border-dark-200 dark:border-dark-700">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                        Click to Continue →
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History Link */}
        <div className="mt-8 text-center">
          <Link href="/dashboard/transactions" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
            View Transaction History →
          </Link>
        </div>
      </div>
    </div>
  );
}
