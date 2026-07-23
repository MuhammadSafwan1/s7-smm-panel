'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiCreditCard, FiDollarSign, FiClock, FiZap } from 'react-icons/fi';
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

  const handleBack = () => {
    router.push('/dashboard');
  };

  const convertFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return 0;
    if (currency === 'PKR') {
      return parseFloat(pkrAmount);
    }
    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];
    return converted;
  };

  const formatAmount = (pkrAmount) => {
    const converted = convertFromPKR(pkrAmount);
    const currencyObj = currencies.find(c => c.code === currency);
    const symbol = currencyObj?.symbol || currency;
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
    router.push(`/dashboard/add-funds/payment?methodId=${method.id}`);
  };

  if (authLoading || loading) return <PageLoader />;

  if (!user) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="text-center">
          <p className="text-dark-500 dark:text-dark-400">Please log in to add funds</p>
          <Link href="/auth/login" className="btn-primary mt-4">Login</Link>
        </div>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button onClick={handleBack} className="text-sm text-dark-500 dark:text-dark-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center gap-1 mb-6 transition-colors">
            <FiArrowLeft /> Back to Dashboard
          </button>
          <div className="bg-white dark:bg-[#1a2742] rounded-3xl p-12 text-center border border-gray-100 dark:border-[#253a5e]">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/30">
              <FiCreditCard className="text-white" size={32} />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold text-lg">No Payment Methods Available</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Admin hasn't set up any payment methods yet</p>
          </div>
        </div>
      </div>
    );
  }

  const manualMethods = paymentMethods.filter(m => m.paymentType === 'manual');
  const autoMethods = paymentMethods.filter(m => m.paymentType === 'auto');

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleBack} className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all" title="Back to Dashboard">
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Funds</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Select a payment method to deposit money</p>
          </div>
        </div>

        {/* Currency Info Banner */}
        <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] mb-8 flex items-center gap-4 hover:shadow-lg transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <FiDollarSign className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5">Current Currency</h4>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Viewing in <span className="font-bold text-blue-600 dark:text-blue-400">{currencies.find(c => c.code === currency)?.name} ({currency})</span>
            </p>
          </div>
        </div>

        {/* Manual Payments Section */}
        {manualMethods.length > 0 && (
          <div className="mb-10">
            <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <FiClock className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Manual Payment Methods</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Admin will verify your payment within 15-20 minutes</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {manualMethods.map((method, index) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodClick(method)}
                  className="group bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {method.image && (
                    <div className="mb-4 bg-gray-50 dark:bg-[#253a5e]/50 rounded-xl p-4 h-28 flex items-center justify-center overflow-hidden">
                      <img src={method.image} alt={method.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {method.name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Range:</span>
                        <span className="font-bold text-gray-900 dark:text-white text-xs">
                          {formatAmountRange(method.minAmount, method.maxAmount)}
                        </span>
                      </div>
                      
                      {method.feePercent !== undefined && method.feePercent > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 dark:text-gray-500">
                            {method.chargeType === 'bonus' ? 'Bonus:' : 'Fee:'}
                          </span>
                          <span className={`font-bold text-xs ${method.chargeType === 'bonus' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {method.chargeType === 'bonus' ? '+' : ''}{method.feePercent}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 dark:border-[#253a5e]">
                      <span className="flex items-center justify-center gap-1 w-full py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md shadow-amber-500/20">
                        Continue →
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
            <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/30">
                <FiZap className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Instant Payment Methods</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Funds added automatically after payment confirmation</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {autoMethods.map((method, index) => (
                <button
                  key={method.id}
                  onClick={() => handleMethodClick(method)}
                  className="group bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {method.image && (
                    <div className="mb-4 bg-gray-50 dark:bg-[#253a5e]/50 rounded-xl p-4 h-28 flex items-center justify-center overflow-hidden">
                      <img src={method.image} alt={method.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                      {method.name}
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500">Range:</span>
                        <span className="font-bold text-gray-900 dark:text-white text-xs">
                          {formatAmountRange(method.minAmount, method.maxAmount)}
                        </span>
                      </div>
                      
                      {method.feePercent !== undefined && method.feePercent > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 dark:text-gray-500">
                            {method.chargeType === 'bonus' ? 'Bonus:' : 'Fee:'}
                          </span>
                          <span className={`font-bold text-xs ${method.chargeType === 'bonus' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {method.chargeType === 'bonus' ? '+' : ''}{method.feePercent}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100 dark:border-[#253a5e]">
                      <span className="flex items-center justify-center gap-1 w-full py-2 rounded-lg text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition-all shadow-md shadow-green-600/20">
                        Continue →
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
          <Link href="/dashboard/transactions" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2f4a72] text-sm font-semibold transition-all">
            View Transaction History →
          </Link>
        </div>
      </div>
    </div>
  );
}
