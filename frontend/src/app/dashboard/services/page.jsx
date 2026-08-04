'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { PageLoader, Spinner } from '@/components/common/Loader';
import { useCurrency } from '@/context/CurrencyContext';
import {
  FiPackage, FiSearch, FiChevronDown,
  FiShoppingBag, FiArrowLeft,
} from 'react-icons/fi';
import { cachedQuery } from '@/lib/cache';
import { SERVICES_UPDATED_EVENT } from '@/lib/liveSync';

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterNew = searchParams.get('filter') === 'new';
  const { format, currency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [fullRefreshTick, setFullRefreshTick] = useState(0); // bumped on manual "Push Refresh"
  const [visibleCount, setVisibleCount] = useState(50); // first 50 shown, Load More = +50
  const LOAD_MORE_STEP = 50;

  // Load platforms once (small - ~27KB)
  useEffect(() => { fetchPlatforms(); }, []);

  // 🟢 REAL-TIME: patch the single changed service in place (no server re-fetch)
  useEffect(() => {
    const handler = (e) => {
      const p = e.detail;
      if (!p || !p.id) { setFullRefreshTick(t => t + 1); return; } // manual full refresh → re-fetch current
      setServices(prev => {
        if (!prev || prev.length === 0) return prev;
        if (p.deleted) return prev.filter(s => s.id !== p.id);
        const idx = prev.findIndex(s => s.id === p.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], ...p };
        return next;
      });
    };
    window.addEventListener(SERVICES_UPDATED_EVENT, handler);
    return () => window.removeEventListener(SERVICES_UPDATED_EVENT, handler);
  }, []);

  const fetchPlatforms = async () => {
    setLoading(true);
    try {
      console.log('📊 Fetching platforms...');
      const pList = await cachedQuery('platforms:all', () =>
        getDocs(query(collection(db, 'platforms'), where('isActive', '==', true))).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
      , 120000);
      setPlatforms(pList);
      console.log(`✅ Loaded ${pList.length} platforms (services load per category)`);
      if (pList.length > 0 && !selectedPlatformId) {
        setSelectedPlatformId(pList[0].id);
      }
    } catch (e) {
      console.error('❌ Error fetching platforms:', e);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 LAZY: load categories only for the selected platform (~50KB max)
  useEffect(() => {
    if (!selectedPlatformId) {
      setCategories([]);
      setServices([]);
      return;
    }
    let active = true;
    setCategoriesLoading(true);
    setServices([]);
    cachedQuery(`categories:platform:${selectedPlatformId}`, async () => {
      const s = await getDocs(query(collection(db, 'categories'), where('platformId', '==', selectedPlatformId), where('isActive', '==', true)));
      return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, 120000).then(cats => {
      if (!active) return;
      setCategories(cats);
      setCategoriesLoading(false);
    }).catch(e => {
      if (active) { setCategoriesLoading(false); console.error('❌ Error loading categories:', e); }
    });
    return () => { active = false; };
  }, [selectedPlatformId]);

  // 🚀 LAZY: load ALL services of the selected platform DIRECTLY (no category step), order ID (1,2,3,...)
  useEffect(() => {
    if (!selectedPlatformId) {
      setServices([]);
      return;
    }
    let active = true;
    setServicesLoading(true);
    setVisibleCount(LOAD_MORE_STEP);
    cachedQuery(`services:platform:${selectedPlatformId}`, async () => {
      const s = await getDocs(query(collection(db, 'services'), where('platformId', '==', selectedPlatformId), where('isActive', '==', true)));
      return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (parseInt(a.serviceId) || 0) - (parseInt(b.serviceId) || 0));
    }).then(sv => {
      if (!active) return;
      setServices(sv);
      setServicesLoading(false);
    }).catch(e => {
      if (active) { setServicesLoading(false); console.error('❌ Error loading services:', e); }
    });
    return () => { active = false; };
  }, [selectedPlatformId, fullRefreshTick]);

  const handleBack = () => { router.push('/dashboard'); };

  const isNew = (svc) => {
    const created = svc.createdAt?.toDate ? svc.createdAt.toDate() : new Date(svc.createdAt || 0);
    return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  };

  const selectedPlatform = platforms.find(p => p.id === selectedPlatformId);

  // All services of the category, filtered by new/search — sorted by order ID (1,2,3,...)
  const shownServices = useMemo(() => services.filter(s => {
    if (filterNew && !isNew(s)) return false;
    if (search) {
      const q = search.toLowerCase();
      const sid = String(s.serviceId || '');
      return (
        s.name?.toLowerCase().includes(q) ||
        sid === q
      );
    }
    return true;
  }), [services, filterNew, search]);

  // First 50 visible; Load More reveals the next 50
  const visibleServices = useMemo(() => shownServices.slice(0, visibleCount), [shownServices, visibleCount]);
  const hasMore = visibleCount < shownServices.length;

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all" title="Back to Dashboard">
              <FiArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {filterNew ? 'New Services' : 'Services List'}
              </h1>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
                {selectedPlatform
                  ? `${selectedPlatform.name} — ${shownServices.length} services`
                  : 'Loading services...'}
              </p>
            </div>
          </div>
          {/* Tab navigation */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1e3050] p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#253a5e]/50 transition-all"
            >
              <FiShoppingBag className="text-blue-500" /> Order
            </button>
            <button
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-[#253a5e] text-gray-900 dark:text-white shadow-sm transition-all cursor-default"
            >
              <FiPackage className="text-violet-500" /> Services
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 mb-6 border border-gray-100 dark:border-[#253a5e] flex flex-col sm:flex-row gap-3">
          {/* Platform filter */}
          <select
            value={selectedPlatformId}
            onChange={e => setSelectedPlatformId(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {/* Search (within selected category) */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by service name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={false}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white">×</button>
            )}
          </div>
          {/* New filter toggle */}
          <Link
            href={filterNew ? '/dashboard/services' : '/dashboard/services?filter=new'}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full sm:w-auto ${
              filterNew
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] text-gray-500 dark:text-gray-400 hover:border-amber-400 hover:text-amber-500'
            }`}
          >
            🆕 New Only
          </Link>
        </div>

        {(loading || categoriesLoading || servicesLoading) ? (
          <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        ) : shownServices.length === 0 ? (
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl py-20 text-center border border-gray-100 dark:border-[#253a5e]">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
              <FiPackage className="text-gray-400 dark:text-gray-500" size={28} />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold text-lg mb-1">No services found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Try a different search or platform.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-gray-400">{selectedPlatform?.name} — {shownServices.length} services (order by ID)</span>
            </div>

            <div className="bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e] divide-y divide-gray-100 dark:divide-[#253a5e]/30 overflow-hidden">
                {visibleServices.map((svc) => {
                  const platform = platforms.find(p => p.id === svc.platformId);
                  const category = categories.find(c => c.id === svc.categoryId);
                  
                  return (
                    <div
                      key={svc.id}
                      className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-6 py-3 sm:py-4 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-colors group"
                    >
                      {/* Service ID */}
                      <span className="text-[10px] sm:text-sm font-mono font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 w-9 h-9 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0">
                        {svc.serviceId}
                      </span>

                      {/* Platform Icon (hidden on mobile) */}
                      {platform && (
                        <div className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shadow-lg flex-shrink-0"
                          style={{ backgroundColor: platform.color || '#274C75' }}>
                          {platform.icon
                            ? <img src={platform.icon} alt={platform.name} className="w-6 h-6 object-contain" />
                            : <span className="text-white font-bold text-xs">{platform.name[0]}</span>
                          }
                        </div>
                      )}

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap mb-1">
                          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{svc.name}</span>
                          {isNew(svc) && (
                            <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">NEW</span>
                          )}
                          {svc.isPopular && (
                            <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold">Popular</span>
                          )}
                          {svc.isFeatured && (
                            <span className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">Featured</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                          {platform && <span className="font-medium text-gray-600 dark:text-gray-300">{platform.name}</span>}
                          {category && <><span>→</span><span>{category.name}</span></>}
                          <span>•</span>
                          <span>Min: <span className="font-medium text-gray-600 dark:text-gray-300">{parseInt(svc.minQuantity || 0).toLocaleString()}</span></span>
                          <span>Max: <span className="font-medium text-gray-600 dark:text-gray-300">{parseInt(svc.maxQuantity || 0).toLocaleString()}</span></span>
                          {(svc.avgTime || svc.averageTime) && (
                            <span>⏱ {svc.avgTime || svc.averageTime}</span>
                          )}
                          {svc.refillSupported && <span className="text-green-500 font-medium">↩ Refill</span>}
                          {svc.cancelSupported && <span className="text-blue-500 font-medium">✕ Cancel</span>}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {format(parseFloat(svc.price || 0))}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">{svc.priceUnit || 'Per 1000'}</p>
                      </div>

                      {/* Select button */}
                      <Link
                        href={`/dashboard?platform=${svc.platformId}`}
                        className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-105 flex-shrink-0"
                      >
                        <FiShoppingBag size={14} className="hidden sm:block" />
                        Order
                      </Link>
                    </div>
                  );
                })}
              </div>

            {/* ⬇️ Load More — reveals the next 50 (already loaded, 0 extra reads) */}
            {hasMore && (
              <div className="flex flex-col items-center gap-2 mt-6">
                <button
                  onClick={() => setVisibleCount(c => c + LOAD_MORE_STEP)}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-105"
                >
                  <FiChevronDown size={16} /> Load More ({Math.min(LOAD_MORE_STEP, shownServices.length - visibleCount)} more)
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Showing {Math.min(visibleCount, shownServices.length)} of {shownServices.length} services
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function UserServicesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ServicesContent />
    </Suspense>
  );
}