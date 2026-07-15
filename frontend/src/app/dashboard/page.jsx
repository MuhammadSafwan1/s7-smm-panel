'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageLoader, Spinner } from '@/components/common/Loader';
import { FiPackage, FiShoppingBag, FiDollarSign, FiSearch, FiArrowRight, FiArrowLeft, FiChevronRight, FiList, FiUsers, FiCode } from 'react-icons/fi';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/CurrencyContext';

// Step 1: Platform grid
function PlatformGrid({ platforms, onSelect }) {
  if (platforms.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-2xl">
        <FiPackage className="text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
        <p className="text-dark-500 font-semibold text-lg mb-1">No platforms yet</p>
        <p className="text-dark-400 text-sm">The admin hasn't added any platforms yet.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {platforms.map((platform, index) => (
        <button
          key={platform.id}
          onClick={() => onSelect(platform)}
          className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl bg-dark-100 dark:bg-dark-800 hover:scale-105 transition-all duration-300 hover:shadow-2xl cursor-pointer overflow-hidden"
          style={{ 
            '--hover-color': platform.color || '#6366f1',
            animationDelay: `${index * 0.1}s`
          }}
        >
          {/* Animated gradient background on hover */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br"
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${platform.color || '#6366f1'}, ${platform.color || '#6366f1'}40)`
            }}
          ></div>
          
          {/* Glowing border effect */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ 
              boxShadow: `0 0 20px ${platform.color || '#6366f1'}40, inset 0 0 20px ${platform.color || '#6366f1'}10`
            }}
          ></div>

          {/* Icon with pulse effect */}
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
            style={{ backgroundColor: platform.color || '#6366f1' }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            
            {platform.icon ? (
              <img src={platform.icon} alt={platform.name} className="w-12 h-12 object-contain relative z-10" />
            ) : (
              <span className="text-white font-bold text-2xl relative z-10">{platform.name[0]}</span>
            )}
          </div>
          
          <span className="text-sm font-bold text-dark-900 dark:text-white text-center relative z-10 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {platform.name}
          </span>
          {platform.description && (
            <span className="text-xs text-dark-400 text-center line-clamp-1 relative z-10">{platform.description}</span>
          )}
          
          {/* Sparkle effect on hover */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-yellow-400 animate-pulse">
            ✨
          </div>
        </button>
      ))}
    </div>
  );
}

// Step 2: Category grid for selected platform
function CategoryGrid({ platform, categories, onSelect, onBack }) {
  const platformCategories = categories.filter(c => c.platformId === platform.id && c.isActive !== false);

  return (
    <div>
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-dark-500 hover:text-primary-500 transition-colors">
          <FiArrowLeft /> Back
        </button>
        <span className="text-dark-300 dark:text-dark-600">/</span>
        <div className="flex items-center gap-2">
          {platform.icon && <img src={platform.icon} alt={platform.name} className="w-5 h-5 rounded object-contain" />}
          <span className="text-sm font-semibold text-dark-900 dark:text-white">{platform.name}</span>
        </div>
      </div>

      {platformCategories.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-2xl">
          <FiPackage className="text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-dark-500 font-semibold text-lg mb-1">No categories yet</p>
          <p className="text-dark-400 text-sm">No categories have been added for {platform.name} yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {platformCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-dark-100 dark:bg-dark-800 hover:scale-105 transition-all duration-200 hover:shadow-xl cursor-pointer"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-200"
                style={{ backgroundColor: platform.color || '#6366f1' }}
              >
                {cat.icon ? (
                  <img src={cat.icon} alt={cat.name} className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-white font-bold text-xl">{cat.name[0]}</span>
                )}
              </div>
              <span className="text-sm font-bold text-dark-900 dark:text-white text-center">{cat.name}</span>
              {cat.description && (
                <span className="text-xs text-dark-400 text-center line-clamp-1">{cat.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Step 3: Services list for selected category
function ServicesList({ platform, category, services, onBack, selectedService, onServiceSelect, format }) {
  const [search, setSearch] = useState('');
  const allCategoryServices = services.filter(s => s.categoryId === category.id && s.platformId === platform.id);
  const categoryServices = search
    ? allCategoryServices.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        (s.serviceId && String(s.serviceId).includes(search))
      )
    : allCategoryServices;

  return (
    <div>
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-dark-500 hover:text-primary-500 transition-colors">
          <FiArrowLeft /> Back
        </button>
        <span className="text-dark-300 dark:text-dark-600">/</span>
        <div className="flex items-center gap-1.5">
          {platform.icon && <img src={platform.icon} alt={platform.name} className="w-4 h-4 rounded object-contain" />}
          <span className="text-sm text-dark-500">{platform.name}</span>
        </div>
        <FiChevronRight className="text-dark-400 text-xs" />
        <span className="text-sm font-semibold text-dark-900 dark:text-white">{category.name}</span>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm" />
        <input
          type="text"
          placeholder="Search by service name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
            bg-dark-100 dark:bg-dark-800
            border border-dark-200 dark:border-dark-700
            text-dark-900 dark:text-white
            placeholder-dark-400 dark:placeholder-dark-500
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
            transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600">×</button>
        )}
      </div>

      {categoryServices.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-2xl">
          <FiPackage className="text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-dark-500 font-semibold text-lg mb-1">No services yet</p>
          <p className="text-dark-400 text-sm">No services have been added for {platform.name} → {category.name} yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {categoryServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onServiceSelect(service)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedService?.id === service.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md shadow-primary-500/20'
                  : 'border-dark-200 dark:border-dark-700 hover:border-primary-400 dark:hover:border-primary-600 bg-dark-50 dark:bg-dark-800/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Circular Service ID badge - light navy blue */}
                  {service.serviceId && (
                    <span className="text-sm font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      {service.serviceId}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Service name */}
                    <h3 className="font-semibold text-dark-900 dark:text-white text-sm leading-tight mb-1">
                      {service.name}
                    </h3>
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-dark-500">Min: <span className="font-semibold text-dark-700 dark:text-dark-300">{parseInt(service.minQuantity || 0).toLocaleString()}</span></span>
                      <span className="text-dark-400">|</span>
                      <span className="text-dark-500">Max: <span className="font-semibold text-dark-700 dark:text-dark-300">{parseInt(service.maxQuantity || 0).toLocaleString()}</span></span>
                      {(service.avgTime || service.averageTime) && (
                        <>
                          <span className="text-dark-400">|</span>
                          <span className="text-dark-500">⏱ {service.avgTime || service.averageTime}</span>
                        </>
                      )}
                      {service.refillSupported && <span className="text-green-500 font-medium bg-green-500/10 px-1.5 py-0.5 rounded">↩ Refill</span>}
                      {service.cancelSupported && <span className="text-blue-500 font-medium bg-blue-500/10 px-1.5 py-0.5 rounded">✕ Cancel</span>}
                    </div>
                  </div>
                </div>
                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-primary-600 dark:text-primary-400">
                    {format(parseFloat(service.price || 0))}
                  </p>
                  <p className="text-xs text-dark-400">per 1000</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { format, currency, rates, currencies } = useCurrency();
  const searchParams = useSearchParams();
  const preselectedPlatformId = searchParams.get('platform');

  // Helper to display wallet balance (stored in PKR) in selected currency
  const displayBalance = (pkrBalance) => {
    if (!pkrBalance) return currency === 'PKR' ? '₨0.00' : `${currencies.find(c => c.code === currency)?.symbol || ''}0.00`;
    
    if (currency === 'PKR') {
      return `₨${pkrBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Convert PKR to USD first, then to selected currency
    const usdAmount = pkrBalance / rates.PKR;
    const convertedAmount = usdAmount * rates[currency];
    const symbol = currencies.find(c => c.code === currency)?.symbol || currency;
    
    let decimals = 2;
    if (['BDT', 'INR', 'SAR', 'AED'].includes(currency)) {
      decimals = convertedAmount < 10 ? 4 : 0;
    }
    
    return `${symbol}${convertedAmount.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })}`;
  };

  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [totalWebsiteOrders, setTotalWebsiteOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [step, setStep] = useState('platforms'); // 'platforms' | 'categories' | 'services'
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Order state
  const [selectedService, setSelectedService] = useState(null);
  const [orderData, setOrderData] = useState({ link: '', quantity: '', comments: '' });
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Pre-select platform from URL
  useEffect(() => {
    if (preselectedPlatformId && platforms.length > 0) {
      const p = platforms.find(p => p.id === preselectedPlatformId);
      if (p) { setSelectedPlatform(p); setStep('categories'); }
    }
  }, [preselectedPlatformId, platforms]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [platSnap, catSnap, svcSnap, usersSnap, ordersSnap] = await Promise.all([
        getDocs(collection(db, 'platforms')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
      ]);

      const platList = platSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.isActive !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const catList = catSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.isActive !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const svcList = svcSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.isActive !== false);

      setPlatforms(platList);
      setCategories(catList);
      setServices(svcList);

      // Calculate total users count
      setTotalUsers(usersSnap.docs.length);

      // Calculate online users (users with recent lastSeen timestamp - within last 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const onlineCount = usersSnap.docs.filter(doc => {
        const lastSeen = doc.data().lastSeen?.toMillis?.() || doc.data().lastSeen || 0;
        return lastSeen > fiveMinutesAgo;
      }).length;
      setOnlineUsers(onlineCount);

      // Calculate total website orders
      setTotalWebsiteOrders(ordersSnap.docs.length);

      // Fetch user's own orders
      if (user?.uid) {
        try {
          const userOrdersSnap = await getDocs(
            query(collection(db, 'orders'), where('userId', '==', user.uid))
          );
          setUserOrders(userOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error('orders fetch error:', e);
        }
      }
    } catch (e) {
      console.error('Dashboard data fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setSelectedCategory(null);
    setSelectedService(null);
    setStep('categories');
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedService(null);
    setStep('services');
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setOrderData({ link: '', quantity: service.minQuantity || '', comments: '' });
  };

  const calculatePrice = () => {
    if (!selectedService || !orderData.quantity) return '0.00';
    return ((parseFloat(selectedService.price || 0) * parseInt(orderData.quantity)) / 1000).toFixed(2);
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) return;
    const qty = parseInt(orderData.quantity);
    if (qty < parseInt(selectedService.minQuantity) || qty > parseInt(selectedService.maxQuantity)) {
      toast.error(`Quantity must be between ${selectedService.minQuantity} and ${selectedService.maxQuantity}`);
      return;
    }

    const totalCharge = parseFloat(calculatePrice());

    // Check balance
    const currentBalance = parseFloat(userProfile?.walletBalance || 0);
    if (currentBalance < totalCharge) {
      toast.error(`Insufficient balance. You need ${format(totalCharge)} but have ${format(currentBalance)}`);
      return;
    }

    setOrderLoading(true);
    try {
      // 1. Send order to provider if service has providerServiceId
      let providerOrderId = null;
      let providerName = null;

      if (selectedService.providerServiceId && selectedService.providerId) {
        try {
          // Get provider details from Firestore
          const providerSnap = await getDoc(doc(db, 'providers', selectedService.providerId));
          if (providerSnap.exists()) {
            const provider = providerSnap.data();
            providerName = provider.name;

            // Send order to provider via Cloudflare Worker proxy
            const proxyRes = await fetch('https://smm-proxy.ms8347750.workers.dev', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiUrl: provider.apiUrl,
                apiKey: provider.apiKey,
                action: 'add',
                service: selectedService.providerServiceId,
                link: orderData.link,
                quantity: qty,
              }),
            });
            const proxyResult = await proxyRes.json();

            if (proxyResult.success && proxyResult.data?.order) {
              providerOrderId = proxyResult.data.order;
            } else if (proxyResult.data?.error) {
              throw new Error(`Provider error: ${proxyResult.data.error}`);
            }
          }
        } catch (providerErr) {
          // If provider fails, still save order as pending for manual processing
          console.error('Provider order error:', providerErr.message);
          toast.error(`Provider error: ${providerErr.message}. Order saved as pending.`);
        }
      }

      // 2. Save order in Firestore
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userEmail: user.email,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        platformId: selectedPlatform?.id,
        platformName: selectedPlatform?.name,
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        providerId: selectedService.providerId || null,
        providerName: providerName,
        providerServiceId: selectedService.providerServiceId || null,
        providerOrderId: providerOrderId,
        link: orderData.link,
        quantity: qty,
        charge: totalCharge,
        comments: orderData.comments || '',
        cancelSupported: selectedService.cancelSupported || false,
        refillSupported: selectedService.refillSupported || false,
        refillPeriodDays: parseInt(selectedService.refillPeriodDays || 30),
        status: providerOrderId ? 'processing' : 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Deduct balance from user document
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const newBalance = parseFloat((userSnap.data().walletBalance || 0) - totalCharge).toFixed(4);
        await updateDoc(userRef, {
          walletBalance: parseFloat(newBalance),
          totalOrders: (userSnap.data().totalOrders || 0) + 1,
          totalSpent: parseFloat(((userSnap.data().totalSpent || 0) + totalCharge).toFixed(4)),
        });
      }

      toast.success(providerOrderId
        ? `Order placed on ${providerName}! ID: ${providerOrderId}. ${format(totalCharge)} deducted.`
        : `Order saved! ${format(totalCharge)} deducted. Processing manually.`
      );
      setSelectedService(null);
      setOrderData({ link: '', quantity: '', comments: '' });
      // Refresh user profile to show updated balance
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to place order');
    } finally {
      setOrderLoading(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (!user) {
    return (
      <div className="container-custom py-20 text-center">
        <div className="glass-card p-12 max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-dark-500 dark:text-dark-400 mb-6">Login to access SMM services</p>
          <Link href="/auth/login" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">

        {/* Header with tabs */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-1">Dashboard</h1>
            <p className="text-dark-500 dark:text-dark-400 text-sm">Manage your orders and explore services</p>
          </div>
          {/* Tab navigation */}
          <div className="flex items-center gap-2 bg-dark-100 dark:bg-dark-800 p-1 rounded-xl">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-dark-700 text-dark-900 dark:text-white shadow-sm transition-all"
            >
              <FiShoppingBag className="text-primary-500" /> Order
            </Link>
            <Link
              href="/dashboard/services"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-dark-700/50 transition-all"
            >
              <FiList className="text-purple-500" /> Services
            </Link>
          </div>
        </div>

        {/* Stats — 6 cards with separate action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {/* User Balance */}
          <div className="glass-card p-5 group hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 border border-primary-200/50 dark:border-primary-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                <FiDollarSign className="text-lg text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-500 dark:text-dark-400 font-medium">Balance</p>
                <p className="text-lg font-bold text-dark-900 dark:text-white truncate">{displayBalance(userProfile?.walletBalance || 0)}</p>
              </div>
            </div>
            <Link
              href="/dashboard/add-funds"
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold
                bg-primary-500 hover:bg-primary-600 text-white
                transition-all duration-200 hover:shadow-md text-center"
            >
              Add Funds
            </Link>
          </div>

          {/* User Orders */}
          <div className="glass-card p-5 group hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 border border-green-200/50 dark:border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                <FiShoppingBag className="text-lg text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-500 dark:text-dark-400 font-medium">My Orders</p>
                <p className="text-lg font-bold text-dark-900 dark:text-white">{userOrders.length}</p>
              </div>
            </div>
            <Link
              href="/dashboard/orders"
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold
                bg-green-500 hover:bg-green-600 text-white
                transition-all duration-200 hover:shadow-md text-center"
            >
              View
            </Link>
          </div>

          {/* Services */}
          <div className="glass-card p-5 group hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 border border-purple-200/50 dark:border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                <FiPackage className="text-lg text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-500 dark:text-dark-400 font-medium">Services</p>
                <p className="text-lg font-bold text-dark-900 dark:text-white">{services.length}</p>
              </div>
            </div>
            <Link
              href="/dashboard/services"
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold
                bg-purple-500 hover:bg-purple-600 text-white
                transition-all duration-200 hover:shadow-md text-center"
            >
              Browse
            </Link>
          </div>

          {/* Total Users */}
          <div className="glass-card p-5 group hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 border border-blue-200/50 dark:border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-500 dark:text-dark-400 font-medium">Total Users</p>
                <p className="text-lg font-bold text-dark-900 dark:text-white">{totalUsers.toLocaleString()}</p>
              </div>
            </div>
            <div className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-center">
              Registered
            </div>
          </div>

          {/* Online Users */}
          <div className="glass-card p-5 group hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 border border-green-200/50 dark:border-green-500/20 relative overflow-hidden">
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 relative">
                {/* Multiple pulsing rings */}
                <span className="absolute inline-flex h-full w-full rounded-xl bg-green-400 opacity-75 animate-ping"></span>
                <span className="absolute inline-flex h-10 w-10 rounded-xl bg-green-500 opacity-50 animate-pulse"></span>
                
                {/* Users icon instead of dot */}
                <FiUsers className="text-white text-lg relative z-10" />
                
                {/* Small blinking indicator */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-lg"></span>
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-500 dark:text-dark-400 font-medium">Online Users</p>
                <p className="text-lg font-bold text-dark-900 dark:text-white">{onlineUsers.toLocaleString()}</p>
              </div>
            </div>
            <div className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-center relative z-10 flex items-center justify-center gap-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Active Now
            </div>
          </div>

          {/* Total Website Orders */}
          <div className="glass-card p-5 group hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 border border-orange-200/50 dark:border-orange-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📊</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-500 dark:text-dark-400 font-medium">Total Orders</p>
                <p className="text-lg font-bold text-dark-900 dark:text-white">{totalWebsiteOrders.toLocaleString()}</p>
              </div>
            </div>
            <div className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-center">
              Website
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Browse */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              {/* Title with animated gradient */}
              <h2 className="text-xl font-bold mb-6 relative">
                {step === 'platforms' && (
                  <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
                    ✨ Choose a Platform
                  </span>
                )}
                {step === 'categories' && <span className="text-dark-900 dark:text-white">{selectedPlatform?.name} — Choose a Category</span>}
                {step === 'services' && <span className="text-dark-900 dark:text-white">{selectedCategory?.name} Services</span>}
              </h2>

              {loading ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
              ) : step === 'platforms' ? (
                <PlatformGrid platforms={platforms} onSelect={handlePlatformSelect} />
              ) : step === 'categories' ? (
                <CategoryGrid
                  platform={selectedPlatform}
                  categories={categories}
                  onSelect={handleCategorySelect}
                  onBack={() => { setStep('platforms'); setSelectedPlatform(null); }}
                />
              ) : (
                <ServicesList
                  platform={selectedPlatform}
                  category={selectedCategory}
                  services={services}
                  onBack={() => { setStep('categories'); setSelectedCategory(null); setSelectedService(null); }}
                  selectedService={selectedService}
                  onServiceSelect={handleServiceSelect}
                  format={format}
                />
              )}
            </div>
          </div>

          {/* Right: Order form */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-24">
              <h2 className="text-xl font-bold text-dark-900 dark:text-white mb-4">Place Order</h2>

              {selectedService ? (
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  {/* Selected service name badge */}
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30">
                    <p className="text-xs text-primary-500 font-semibold mb-0.5">{selectedPlatform?.name} → {selectedCategory?.name}</p>
                    <p className="font-semibold text-sm text-dark-900 dark:text-white leading-tight">{selectedService.name}</p>
                    {selectedService.serviceId && (
                      <span className="inline-block mt-1 text-xs font-mono font-bold bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-400 px-2 py-0.5 rounded-lg">
                        #{selectedService.serviceId}
                      </span>
                    )}
                  </div>

                  {/* Service Description */}
                  {selectedService.description && (
                    <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                      <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 mb-2">Service Description:</p>
                      <div className="text-xs text-dark-700 dark:text-dark-300 space-y-1">
                        {selectedService.description.split('\n').map((line, idx) => (
                          <p key={idx} className="leading-relaxed">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Target Link *</label>
                    <input type="url" required placeholder="https://instagram.com/username"
                      value={orderData.link} onChange={(e) => setOrderData({ ...orderData, link: e.target.value })}
                      className="input" />
                  </div>

                  <div>
                    <label className="label">Quantity * (Min: {selectedService.minQuantity} — Max: {selectedService.maxQuantity})</label>
                    <input type="number" required
                      min={selectedService.minQuantity} max={selectedService.maxQuantity}
                      value={orderData.quantity} 
                      onChange={(e) => setOrderData({ ...orderData, quantity: e.target.value })}
                      className="input"
                      disabled={selectedService.customCommentsRequired} />
                    {selectedService.customCommentsRequired && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">
                        ⚠️ Quantity is auto-calculated from number of lines in custom comments below
                      </p>
                    )}
                  </div>

                  {selectedService.customCommentsRequired && (
                    <div>
                      <label className="label">Custom Comments * (Each line = 1 quantity)</label>
                      <textarea
                        required
                        rows="5"
                        placeholder="Enter one item per line. Example:&#10;username1&#10;username2&#10;username3&#10;&#10;Total quantity will be 3"
                        value={orderData.comments}
                        onChange={(e) => {
                          const text = e.target.value;
                          // Count non-empty lines
                          const lines = text.split('\n').filter(line => line.trim() !== '');
                          const lineCount = lines.length || (text.trim() ? 1 : 0);
                          setOrderData({ ...orderData, comments: text, quantity: lineCount.toString() });
                        }}
                        className="input resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                        Each line = 1 quantity. Current: <span className="font-bold text-primary-600 dark:text-primary-400">{orderData.quantity || 0} item{orderData.quantity !== '1' ? 's' : ''}</span>
                      </p>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800">
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-dark-500">Price per 1000</span>
                      <span className="font-semibold text-dark-900 dark:text-white">{format(parseFloat(selectedService.price || 0))}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-dark-200 dark:border-dark-700">
                      <span className="font-bold text-dark-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">{format(parseFloat(calculatePrice()))}</span>
                    </div>
                  </div>

                  <button type="submit" disabled={orderLoading} className="btn-primary w-full">
                    {orderLoading ? 'Placing Order...' : 'Place Order'}
                  </button>
                  <button type="button" onClick={() => setSelectedService(null)} className="btn-outline w-full text-sm">
                    Clear Selection
                  </button>
                  <Link href="/dashboard/orders" className="btn-outline w-full flex items-center justify-center gap-2 text-sm">
                    View My Orders <FiArrowRight />
                  </Link>
                </form>
              ) : (
                /* Default state: Instagram Flag warning */
                <div className="space-y-4">
                  {/* Instruction GIF */}
                  <div className="rounded-xl overflow-hidden border border-dark-200 dark:border-dark-700">
                    <img
                      src="/images/instagram fix.gif"
                      alt="How to disable Instagram Flag for Review"
                      className="w-full h-auto object-contain"
                    />
                  </div>

                  {/* Warning description */}
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-4 space-y-3 text-xs leading-relaxed text-dark-700 dark:text-dark-300">
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">
                      🚫 Important: Instagram Flag Must Be Off!
                    </p>
                    <p>
                      Starting from 2024-08-18, with Instagram's new update, the <strong>FLAG</strong> function must be turned off to receive followers.
                    </p>
                    <p className="italic">
                      If this option remains enabled, followers will be sent as requests, and you will need to manually approve each one.
                    </p>

                    <div className="border-t border-red-200 dark:border-red-800/40 pt-3">
                      <p className="font-bold text-red-600 dark:text-red-400 mb-1">❗ Important Note:</p>
                      <p>
                        If the Flag function is left <strong>ON</strong>, your account may be treated as Private, and SmmCloud will not be responsible or provide any warranty for the service.
                      </p>
                    </div>

                    <div className="border-t border-red-200 dark:border-red-800/40 pt-3">
                      <p className="font-bold mb-2">To disable the flag function, follow these steps on Instagram:</p>
                      <ol className="list-decimal list-inside space-y-1 pl-1">
                        <li>Go to your <strong>Account Settings</strong>.</li>
                        <li>Select <strong>Follow and Invite Friends</strong>.</li>
                        <li>Find the <strong>Flag for Review</strong> option and uncheck it.</li>
                      </ol>
                    </div>

                    <div className="border-t border-red-200 dark:border-red-800/40 pt-3 space-y-1">
                      <p className="font-bold text-orange-600 dark:text-orange-400">⚠️ Mandatory:</p>
                      <p>Disabling this feature is required to receive followers correctly.</p>
                      <p className="font-bold text-orange-600 dark:text-orange-400">⚠️ No Warranty:</p>
                      <p>If you fail to disable it, SmmCloud cannot guarantee delivery or offer support.</p>
                    </div>
                  </div>

                  <p className="text-center text-xs text-dark-400 dark:text-dark-500 pt-1">
                    {step === 'platforms' ? '← Select a platform to get started' :
                     step === 'categories' ? '← Select a category to continue' :
                     '← Select a service to place an order'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardContent />
    </Suspense>
  );
}
