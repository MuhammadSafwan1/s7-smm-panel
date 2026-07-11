'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageLoader, Spinner } from '@/components/common/Loader';
import { FiPackage, FiShoppingBag, FiDollarSign, FiSearch, FiTrendingUp, FiArrowRight, FiArrowLeft, FiChevronRight } from 'react-icons/fi';import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

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
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onSelect(platform)}
          className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-dark-100 dark:bg-dark-800 hover:scale-105 transition-all duration-200 hover:shadow-xl cursor-pointer"
          style={{ '--hover-color': platform.color || '#6366f1' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-200"
            style={{ backgroundColor: platform.color || '#6366f1' }}
          >
            {platform.icon ? (
              <img src={platform.icon} alt={platform.name} className="w-12 h-12 object-contain" />
            ) : (
              <span className="text-white font-bold text-2xl">{platform.name[0]}</span>
            )}
          </div>
          <span className="text-sm font-bold text-dark-900 dark:text-white text-center">{platform.name}</span>
          {platform.description && (
            <span className="text-xs text-dark-400 text-center line-clamp-1">{platform.description}</span>
          )}
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
function ServicesList({ platform, category, services, onBack, selectedService, onServiceSelect }) {
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
                <div className="flex-1 min-w-0">
                  {/* Service ID + name row */}
                  <div className="flex items-start gap-2 mb-1">
                    {service.serviceId && (
                      <span className="text-xs font-mono font-bold bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-400 px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5">
                        #{service.serviceId}
                      </span>
                    )}
                    <h3 className="font-semibold text-dark-900 dark:text-white text-sm leading-tight">
                      {service.name}
                    </h3>
                  </div>
                  {/* Description — always show if present */}
                  {(service.description) && (
                    <p className="text-xs text-dark-400 dark:text-dark-500 mb-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}
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
                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-primary-600 dark:text-primary-400">
                    ${parseFloat(service.price || 0).toFixed(2)}
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
  const searchParams = useSearchParams();
  const preselectedPlatformId = searchParams.get('platform');

  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [step, setStep] = useState('platforms'); // 'platforms' | 'categories' | 'services'
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Order state
  const [selectedService, setSelectedService] = useState(null);
  const [orderData, setOrderData] = useState({ link: '', quantity: '' });
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
      const [platSnap, catSnap, svcSnap] = await Promise.all([
        getDocs(collection(db, 'platforms')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'services')),
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
    } catch (e) {
      console.error(e);
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
    setOrderData({ link: '', quantity: service.minQuantity || '' });
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
    const currentBalance = parseFloat(userProfile?.balance || 0);
    if (currentBalance < totalCharge) {
      toast.error(`Insufficient balance. You need $${totalCharge} but have $${currentBalance.toFixed(2)}`);
      return;
    }

    setOrderLoading(true);
    try {
      // 1. Place order in Firestore
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        userEmail: user.email,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        platformId: selectedPlatform?.id,
        platformName: selectedPlatform?.name,
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        link: orderData.link,
        quantity: qty,
        charge: totalCharge,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Deduct balance from user document
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const newBalance = parseFloat((userSnap.data().balance || 0) - totalCharge).toFixed(4);
        await updateDoc(userRef, {
          balance: parseFloat(newBalance),
          totalOrders: (userSnap.data().totalOrders || 0) + 1,
          totalSpent: parseFloat(((userSnap.data().totalSpent || 0) + totalCharge).toFixed(4)),
        });
      }

      toast.success(`Order placed! $${totalCharge} deducted from your balance.`);
      setSelectedService(null);
      setOrderData({ link: '', quantity: '' });
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-dark-500 dark:text-dark-400">Choose a service to boost your social media presence</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                <FiDollarSign className="text-2xl text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Balance</p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">${userProfile?.balance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <Link href="/dashboard/settings" className="btn-outline btn-sm mt-4 w-full">Add Funds</Link>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <FiShoppingBag className="text-2xl text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Total Orders</p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">0</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <FiPackage className="text-2xl text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">Available Services</p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">{services.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Browse */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              {/* Title */}
              <h2 className="text-xl font-bold text-dark-900 dark:text-white mb-6">
                {step === 'platforms' && 'Choose a Platform'}
                {step === 'categories' && `${selectedPlatform?.name} — Choose a Category`}
                {step === 'services' && `${selectedCategory?.name} Services`}
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
                  {/* Selected service info */}
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-800">
                    <p className="font-semibold text-sm text-dark-900 dark:text-white">{selectedService.name}</p>
                    <p className="text-xs text-dark-500 mt-0.5">{selectedPlatform?.name} → {selectedCategory?.name}</p>
                  </div>

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
                      value={orderData.quantity} onChange={(e) => setOrderData({ ...orderData, quantity: e.target.value })}
                      className="input" />
                  </div>

                  <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-800">
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-dark-500">Price per 1000</span>
                      <span className="font-semibold text-dark-900 dark:text-white">${selectedService.price}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-dark-200 dark:border-dark-700">
                      <span className="font-bold text-dark-900 dark:text-white">Total</span>
                      <span className="text-xl font-bold text-primary-600 dark:text-primary-400">${calculatePrice()}</span>
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
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center mx-auto mb-4">
                    <FiPackage className="text-3xl text-dark-300 dark:text-dark-600" />
                  </div>
                  <p className="text-dark-500 dark:text-dark-400 text-sm font-medium">
                    {step === 'platforms' ? 'Select a platform to get started' :
                     step === 'categories' ? 'Select a category to continue' :
                     'Select a service to place an order'}
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
