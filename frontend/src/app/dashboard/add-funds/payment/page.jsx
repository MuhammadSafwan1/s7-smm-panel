'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiUpload, FiX } from 'react-icons/fi';
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
      const snap = await getDocs(query(collection(db, 'paymentMethods'), where('__name__', '==', methodId)));
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

  // Convert amount from PKR to selected currency
  const convertFromPKR = (pkrAmount) => {
    if (!pkrAmount || isNaN(pkrAmount)) return 0;
    
    if (currency === 'PKR') {
      return parseFloat(pkrAmount);
    }

    const usdAmount = pkrAmount / rates.PKR;
    const converted = usdAmount * rates[currency];
    return converted;
  };

  // Convert amount from selected currency to PKR
  const convertToPKR = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    
    if (currency === 'PKR') {
      return parseFloat(amount);
    }

    const usdAmount = amount / rates[currency];
    const pkrAmount = usdAmount * rates.PKR;
    return pkrAmount;
  };

  // Format a single amount in the current currency
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

    if (!form.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!form.accountNumber.trim()) {
      toast.error('Please enter your account number');
      return;
    }

    if (!form.transactionId.trim()) {
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
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4">
        <div className="text-center">
          <p className="text-dark-500">Please log in to add funds</p>
          <Link href="/auth/login" className="btn-primary mt-4">Login</Link>
        </div>
      </div>
    );
  }

  if (!paymentMethod) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/add-funds" className="p-2.5 hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-700/30">
            <FiArrowLeft className="text-xl text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Payment Details</h1>
            <p className="text-slate-400 text-sm mt-1">Complete your payment for {paymentMethod.name}</p>
          </div>
        </div>

        {/* Check if Coming Soon Mode is Enabled (for both Manual and Auto) */}
        {paymentMethod.autoPayEnabled ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/30 rounded-2xl p-12 text-center shadow-2xl">
              <div className="mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="text-5xl">🚀</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Coming Soon!</h2>
                <p className="text-lg text-slate-300 mb-6">
                  {paymentMethod.paymentType === 'auto' ? 'Automatic' : 'Manual'} payment processing for <span className="text-cyan-400 font-semibold">{paymentMethod.name}</span> is under development
                </p>
                <div className="inline-block bg-blue-500/10 border border-blue-500/30 rounded-lg px-6 py-3">
                  <p className="text-sm text-blue-300">
                    {paymentMethod.paymentType === 'auto' 
                      ? '⚡ This feature will enable instant payment processing'
                      : '📋 This payment method will be available soon'}
                  </p>
                </div>
              </div>
              
              <Link
                href="/dashboard/add-funds"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg"
              >
                <FiArrowLeft /> Back to Payment Methods
              </Link>
            </div>
          </div>
        ) : (
          // Original Payment Form
          <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Admin Payment Details */}
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* Payment Method Info */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start gap-4 mb-5">
                {paymentMethod.image && (
                  <div className="flex items-center justify-center bg-white rounded-xl p-3 w-20 h-20 shadow-lg">
                    <img src={paymentMethod.image} alt={paymentMethod.name} className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{paymentMethod.name}</h2>
                  <div className="inline-block bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-lg px-3 py-1.5">
                    <p className="text-sm font-semibold text-blue-300">
                      💰 {formatAmountRange(paymentMethod.minAmount, paymentMethod.maxAmount)}
                    </p>
                  </div>
                </div>
              </div>
              
              {paymentMethod.feePercent > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-300 font-medium">
                    ⚠️ Processing Fee: <span className="font-bold">{paymentMethod.feePercent}%</span>
                  </p>
                </div>
              )}
              
              {paymentMethod.description && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {paymentMethod.description}
                  </p>
                </div>
              )}
            </div>
            
            {/* Instructions - MOVED ABOVE Example Image */}
            {paymentMethod.instructions && paymentMethod.showInstructions && (
              <div 
                className="rounded-2xl p-5 border-2 shadow-lg" 
                style={{ 
                  borderColor: (paymentMethod.instructionsColor || '#3b82f6') + '60',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  boxShadow: `0 0 30px ${(paymentMethod.instructionsColor || '#3b82f6')}20`
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📝</span>
                  <p className="text-sm font-bold text-slate-300">Important Instructions</p>
                </div>
                <p 
                  className="whitespace-pre-wrap text-base font-medium leading-relaxed" 
                  style={{ color: paymentMethod.instructionsColor || '#3b82f6' }}
                >
                  {paymentMethod.instructions}
                </p>
              </div>
            )}
            
            {/* Example Image - Crystal Clear High Quality */}
            {paymentMethod.exampleImage && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📸</span>
                  <p className="text-base font-bold text-white">Payment Example</p>
                </div>
                <div className="bg-white rounded-lg overflow-hidden">
                  <img 
                    src={paymentMethod.exampleImage} 
                    alt="Payment Example" 
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
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                💰 Amount {currency !== 'PKR' && form.amount && parseFloat(form.amount) > 0 && (
                  <span className="text-xs font-normal text-cyan-400 ml-2">
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
                  className="w-full px-4 py-3.5 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500 font-semibold text-lg"
                />
                <p className="text-xs text-slate-400">
                  Range: ₨{paymentMethod.minAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - ₨{paymentMethod.maxAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PKR
                  {currency !== 'PKR' && (
                    <span className="ml-1">
                      ({formatAmountRange(paymentMethod.minAmount, paymentMethod.maxAmount)})
                    </span>
                  )}
                </p>
                {form.amount && parseFloat(form.amount) > 0 && paymentMethod && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">You'll receive:</p>
                    <p className="font-bold text-green-400 text-2xl mb-2">
                      {formatAmount(convertToPKR(parseFloat(form.amount)) * (1 - (paymentMethod.feePercent ?? 3) / 100))}
                    </p>
                    <p className="text-xs text-red-400">
                      Fee ({(paymentMethod.feePercent ?? 3)}%): {formatAmount(convertToPKR(parseFloat(form.amount)) * ((paymentMethod.feePercent ?? 3) / 100))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4 pt-4 border-t-2 border-slate-700/50">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span className="text-xl">👤</span> Your Information
              </h3>

              {/* Field 1 - Dynamic Label */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {paymentMethod.field1Label || 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={paymentMethod.field1Placeholder || 'Your full name'}
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                />
              </div>

              {/* Field 2 - Dynamic Label */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {paymentMethod.field2Label || 'Account Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={paymentMethod.field2Placeholder || 'Your account/wallet number'}
                  value={form.accountNumber}
                  onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                />
              </div>

              {/* Field 3 - Dynamic Label */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {paymentMethod.field3Label || 'Transaction ID'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={paymentMethod.field3Placeholder || 'Transaction reference number'}
                  value={form.transactionId}
                  onChange={e => setForm({ ...form, transactionId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-500"
                />
              </div>
            </div>

            {/* Payment Proof */}
            <div className="pt-4 border-t-2 border-slate-700/50">
              <label className="block text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <span className="text-xl">📷</span> Payment Proof Image
              </label>
              
              {previewImage ? (
                <div className="relative">
                  <img src={previewImage} alt="Proof" className="w-full h-64 object-contain rounded-xl border-2 border-slate-700 bg-slate-950" />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage('');
                      setForm({ ...form, proofImage: '' });
                    }}
                    className="absolute top-3 right-3 p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <FiX className="text-lg" />
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
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-slate-600 hover:border-cyan-500 bg-slate-950/50 transition-all cursor-pointer group"
                  >
                    <FiUpload className="text-4xl text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    <div>
                      <p className="font-semibold text-white text-base">Click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">Screenshot or receipt (Max 10MB)</p>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all disabled:opacity-60 text-lg shadow-lg hover:shadow-cyan-500/50"
            >
              {submitting ? 'Submitting...' : '✅ Submit Payment'}
            </button>
            <p className="text-xs text-slate-400 text-center">
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
