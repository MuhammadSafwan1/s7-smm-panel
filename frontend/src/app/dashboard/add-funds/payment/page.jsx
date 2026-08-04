'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, Timestamp, query, where, doc } from 'firebase/firestore';
import { cachedQuery } from '@/lib/cache';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiUpload, FiXCircle, FiCreditCard, FiInfo, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/CurrencyContext';
import { useRouter, useSearchParams } from 'next/navigation';

function PaymentForm() {
  const { user, loading: authLoading } = useAuth();
  const { currency, rates, currencies } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef();

  const methodId = searchParams.get('methodId');

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    accountNumber: '',
    transactionId: '',
    amount: '',
    proofImage: '',
  });

  useEffect(() => {
    if (user && !authLoading && methodId) {
      fetchPaymentMethod();
    } else if (!methodId) {
      router.push('/dashboard/add-funds');
    } else {
      setLoading(false);
    }
  }, [user, authLoading, methodId]);

  const fetchPaymentMethod = async () => {
    try {
      const snap = await cachedQuery('doc:paymentMethods/' + methodId, () => getDocs(query(collection(db, 'paymentMethods'), where('__name__', '==', methodId))));
      if (!snap.empty) {
        const method = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (method.isActive) {
          setPaymentMethod(method);
        } else {
          toast.error('This payment method is not available');
          router.push('/dashboard/add-funds');
        }
      } else {
        toast.error('Payment method not found');
        router.push('/dashboard/add-funds');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load payment method');
      router.push('/dashboard/add-funds');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setForm({ ...form, proofImage: base64 });
        setPreviewImage(base64);
        toast.success('Image uploaded');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Failed to upload image');
    }
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

  const convertToPKR = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    if (currency === 'PKR') {
      return parseFloat(amount);
    }
    const usdAmount = amount / rates[currency];
    const pkrAmount = usdAmount * rates.PKR;
    return pkrAmount;
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

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, amount: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!paymentMethod) {
      toast.error('Payment method not found');
      return;
    }

    if (!form.fullName.trim() && paymentMethod.field1Active !== false) {
      toast.error('Please enter your full name');
      return;
    }

    if (!form.accountNumber.trim() && paymentMethod.field2Active !== false) {
      toast.error('Please enter your account number');
      return;
    }

    if (!form.transactionId.trim() && paymentMethod.field3Active !== false) {
      toast.error('Please enter the transaction ID');
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amountInPKR = convertToPKR(parseFloat(form.amount));
    
    if (amountInPKR < paymentMethod.minAmount || amountInPKR > paymentMethod.maxAmount) {
      toast.error(
        `Amount must be between ${formatAmountRange(paymentMethod.minAmount, paymentMethod.maxAmount)}`
      );
      return;
    }

    if (!form.proofImage) {
      toast.error('Please upload payment proof image');
      return;
    }

    setSubmitting(true);
    try {
      let amountInPKR = convertToPKR(parseFloat(form.amount));
      
      if (amountInPKR < 1 || amountInPKR > 1000000) {
        toast.error(`Invalid amount detected: ${amountInPKR} PKR. Please refresh and try again.`);
        setSubmitting(false);
        return;
      }
      
      amountInPKR = parseFloat(amountInPKR.toFixed(2));
      
      // 🚀 DUPLICATE CHECK: Same Transaction ID + Same Payment Method (own user's verified transactions)
      // NOTE: Cross-user duplicates are caught by the admin at verification time.
      if (form.transactionId && form.transactionId.trim()) {
        const duplicateQuery = query(
          collection(db, 'paymentTransactions'),
          where('userId', '==', user.uid),
          where('transactionId', '==', form.transactionId.trim()),
          where('paymentMethodName', '==', paymentMethod.name),
          where('status', '==', 'verified')
        );
        
        const duplicateSnap = await cachedQuery('collection:paymentTransactions', () => getDocs(duplicateQuery));
        
        if (!duplicateSnap.empty) {
          toast.error(
            `⚠️ Transaction Already Submitted!\n\n` +
            `This transaction ID has already been verified with ${paymentMethod.name}.\n` +
            `Please use a different transaction ID.`,
            { duration: 6000 }
          );
          setSubmitting(false);
          return;
        }
      }
      
      await addDoc(collection(db, 'paymentTransactions'), {
        userId: user.uid,
        userName: user.displayName || 'Unknown',
        userEmail: user.email,
        paymentMethodId: paymentMethod.id,
        paymentMethodName: paymentMethod.name,
        fullName: form.fullName,
        accountNumber: form.accountNumber,
        transactionId: form.transactionId,
        amount: amountInPKR,
        amountEntered: parseFloat(form.amount),
        currencyUsed: currency,
        feePercent: parseFloat(paymentMethod.feePercent) || 0,
        chargeType: paymentMethod.chargeType || 'fee',
        proofImage: form.proofImage,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Payment submitted for verification');
      router.push('/dashboard/transactions');
    } catch (err) {
      toast.error(err.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
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

  if (!paymentMethod) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/add-funds" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Details</h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Complete your payment for {paymentMethod.name}</p>
          </div>
        </div>

        {/* Coming Soon Mode */}
        {paymentMethod.autoPayEnabled ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-[#1a2742] border border-gray-100 dark:border-[#253a5e] rounded-3xl p-12 text-center hover:shadow-xl transition-all duration-300">
              <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30 animate-pulse">
                <span className="text-5xl">🚀</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Coming Soon!</h2>
              <p className="text-base text-gray-500 dark:text-gray-400 mb-6">
                {paymentMethod.paymentType === 'auto' ? 'Automatic' : 'Manual'} payment processing for <span className="text-blue-600 dark:text-blue-400 font-semibold">{paymentMethod.name}</span> is under development
              </p>
              <div className="inline-block bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg px-6 py-3 mb-6">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {paymentMethod.paymentType === 'auto' 
                    ? '⚡ This feature will enable instant payment processing'
                    : '📋 This payment method will be available soon'}
                </p>
              </div>
              <br />
              <Link
                href="/dashboard/add-funds"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                <FiArrowLeft /> Back to Payment Methods
              </Link>
            </div>
          </div>
        ) : (
          // Payment Form
          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT: Admin Payment Details */}
            <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              {/* Payment Method Info */}
              <div className="bg-white dark:bg-[#1a2742] border border-gray-100 dark:border-[#253a5e] rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-3 sm:gap-4 mb-5">
                  {paymentMethod.image && (
                    <div className="flex items-center justify-center bg-gray-50 dark:bg-[#253a5e]/50 rounded-xl p-2 sm:p-3 w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0">
                      <img src={paymentMethod.image} alt={paymentMethod.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">{paymentMethod.name}</h2>
                    <div className="inline-block bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
                      <p className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
                        💰 {formatAmountRange(paymentMethod.minAmount, paymentMethod.maxAmount)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {(paymentMethod.feePercent ?? 0) > 0 && (
                  <div className={`${paymentMethod.chargeType === 'bonus' ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'} border rounded-lg p-3 mb-4`}>
                    <p className={`text-sm ${paymentMethod.chargeType === 'bonus' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'} font-medium`}>
                      {paymentMethod.chargeType === 'bonus' ? '🎁' : '⚠️'} {paymentMethod.chargeType === 'bonus' ? 'Bonus' : 'Processing Fee'}: <span className="font-bold">{paymentMethod.feePercent}%</span>
                    </p>
                  </div>
                )}
                
                {paymentMethod.description && (
                  <div className="bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-100 dark:border-[#253a5e] rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {paymentMethod.description}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Instructions */}
              {paymentMethod.instructions && paymentMethod.showInstructions && (
                <div className="bg-white dark:bg-[#1a2742] border border-gray-100 dark:border-[#253a5e] rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                      <FiInfo className="text-white" size={14} />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Important Instructions</p>
                  </div>
                  <p 
                    className="whitespace-pre-wrap text-sm font-medium leading-relaxed" 
                    style={{ color: paymentMethod.instructionsColor || '#3b82f6' }}
                  >
                    {paymentMethod.instructions}
                  </p>
                </div>
              )}
              
              {/* Example Image */}
              {paymentMethod.exampleImage && (
                <div className="bg-white dark:bg-[#1a2742] border border-gray-100 dark:border-[#253a5e] rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                      <span className="text-white text-sm">📸</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Payment Proof Example</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#253a5e]/30 rounded-xl overflow-hidden border border-gray-100 dark:border-[#253a5e]">
                    <img 
                      src={paymentMethod.exampleImage} 
                      alt="Payment Proof Example" 
                      className="w-full h-auto"
                      style={{ 
                        imageRendering: '-webkit-optimize-contrast',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: User Form */}
            <div className="bg-white dark:bg-[#1a2742] border border-gray-100 dark:border-[#253a5e] rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* QR Code Display */}
                {paymentMethod.qrCode && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-sm">📱</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Scan QR Code to Pay</h3>
                    </div>
                    
                    {/* Min/Max Amount Display */}
                    <div className="mb-4 bg-white dark:bg-[#253a5e]/50 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-center flex-1">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Minimum</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatAmount(paymentMethod.minAmount)}
                          </p>
                        </div>
                        <div className="w-px h-10 bg-gray-200 dark:bg-[#253a5e]"></div>
                        <div className="text-center flex-1">
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Maximum</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatAmount(paymentMethod.maxAmount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                      <img 
                        src={paymentMethod.qrCode} 
                        alt="Payment QR Code" 
                        className="max-w-full h-auto rounded-lg"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                      Scan this QR code with your payment app, then enter the details below
                    </p>
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                    💰 Amount {currency !== 'PKR' && form.amount && parseFloat(form.amount) > 0 && (
                      <span className="text-xs font-normal text-blue-600 dark:text-blue-400 ml-2">
                        = ₨{convertToPKR(parseFloat(form.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR
                      </span>
                    )}
                  </label>
                  
                  <div className="space-y-3">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={`Enter amount in ${currency}`}
                      value={form.amount}
                      onChange={handleAmountChange}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-semibold text-lg transition-all"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Range: ₨{paymentMethod.minAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ₨{paymentMethod.maxAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PKR
                      {currency !== 'PKR' && (
                        <span className="ml-1">
                          ({formatAmountRange(paymentMethod.minAmount, paymentMethod.maxAmount)})
                        </span>
                      )}
                    </p>
                    {form.amount && parseFloat(form.amount) > 0 && paymentMethod && (
                      <div className={`${paymentMethod.chargeType === 'bonus' ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'} border rounded-xl p-4`}>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">You'll receive:</p>
                        <p className={`font-bold text-2xl mb-2 ${paymentMethod.chargeType === 'bonus' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {(() => {
                            const amountInPKR = convertToPKR(parseFloat(form.amount));
                            const feePercent = paymentMethod.feePercent ?? 0;
                            const finalAmount = paymentMethod.chargeType === 'bonus'
                              ? amountInPKR * (1 + feePercent / 100)
                              : amountInPKR * (1 - feePercent / 100);
                            return formatAmount(finalAmount);
                          })()}
                        </p>
                        {(paymentMethod.feePercent ?? 0) > 0 && (
                          <p className={`text-xs ${paymentMethod.chargeType === 'bonus' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {paymentMethod.chargeType === 'bonus' ? `🎁 Bonus (${paymentMethod.feePercent}%)` : `💸 Fee (${paymentMethod.feePercent}%)`}: {formatAmount(convertToPKR(parseFloat(form.amount)) * (paymentMethod.feePercent / 100))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-[#253a5e]">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                      <span className="text-white text-xs">👤</span>
                    </div>
                    Your Information
                  </h3>

                  {/* Field 1 */}
                  {paymentMethod.field1Active !== false && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                      {paymentMethod.field1Label || 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={paymentMethod.field1Placeholder || 'Your full name'}
                      value={form.fullName}
                      onChange={e => setForm({ ...form, fullName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    />
                  </div>
                  )}

                  {/* Field 2 */}
                  {paymentMethod.field2Active !== false && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                      {paymentMethod.field2Label || 'Account Number'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={paymentMethod.field2Placeholder || 'Your account/wallet number'}
                      value={form.accountNumber}
                      onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    />
                  </div>
                  )}

                  {/* Field 3 */}
                  {paymentMethod.field3Active !== false && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                      {paymentMethod.field3Label || 'Transaction ID'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={paymentMethod.field3Placeholder || 'Transaction reference number'}
                      value={form.transactionId}
                      onChange={e => setForm({ ...form, transactionId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    />
                  </div>
                  )}
                </div>

                {/* Payment Proof */}
                <div className="pt-4 border-t border-gray-100 dark:border-[#253a5e]">
                  <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center">
                      <FiUpload className="text-white" size={12} />
                    </div>
                    Payment Proof Image
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">(Upload screenshot/receipt)</span>
                  </label>
                  
                  {previewImage ? (
                    <div className="relative">
                      <img src={previewImage} alt="Proof" className="w-full h-64 object-contain rounded-xl border border-gray-200 dark:border-[#253a5e] bg-gray-50 dark:bg-[#253a5e]/30" />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage('');
                          setForm({ ...form, proofImage: '' });
                        }}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <FiXCircle className="text-lg" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-gray-300 dark:border-[#253a5e] hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-[#253a5e]/20 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-[#253a5e] flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                          <FiUpload className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Click to upload</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Screenshot or receipt (Max 10MB)</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle size={18} />
                      Submit Payment
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  🔒 Your payment will be verified by admin
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PaymentForm />
    </Suspense>
  );
}
