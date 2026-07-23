'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { PageLoader, Spinner } from '@/components/common/Loader';
import { useCurrency } from '@/context/CurrencyContext';
import {
  FiPackage, FiSearch, FiChevronDown, FiChevronRight,
  FiShoppingBag, FiArrowRight, FiArrowLeft,
} from 'react-icons/fi';

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterNew = searchParams.get('filter') === 'new';
  const { format, currency } = useCurrency();

  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [hideUpdatesTimestamp, setHideUpdatesTimestamp] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const settingsDoc = await getDocs(collection(db, 'siteSettings'));
      const hideUpdatesSettings = settingsDoc.docs.find(d => d.id === 'general')?.data();
      const hideUpdates = hideUpdatesSettings?.hideUpdates || false;
      const lastUpdateTimestamp = hideUpdatesSettings?.lastUpdateTimestamp || 0;
      
      setHideUpdatesTimestamp(hideUpdates ? lastUpdateTimestamp : null);

      const [pS, cS, sS] = await Promise.all([
        getDocs(collection(db, 'platforms')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'services')),
      ]);
      const pList = pS.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.isActive !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      const cList = cS.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.isActive !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      let sList = sS.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.isActive !== false);

      if (hideUpdates && lastUpdateTimestamp) {
        sList = sList.filter(s => {
          const createdAt = s.createdAt?.toMillis?.() || s.createdAt?.seconds * 1000 || 0;
          return createdAt <= lastUpdateTimestamp;
        });
      }

      sList = sList.sort((a, b) => {
        const idA = parseInt(a.serviceId) || 0;
        const idB = parseInt(b.serviceId) || 0;
        return idA - idB;
      });

      const NEW_COLOR = '#1A6BBD';
      for (const p of pList) {
        if (p.color !== NEW_COLOR) {
          try { await updateDoc(doc(db, 'platforms', p.id), { color: NEW_COLOR }); } catch(e) {}
        }
      }
      const coloredList = pList.map(p => ({ ...p, color: NEW_COLOR }));
      setPlatforms(coloredList);
      setCategories(cList);
      setServices(sList);

      const exp = {};
      pList.forEach(p => { exp[p.id] = true; });
      setExpanded(exp);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  const isNew = (svc) => {
    const created = svc.createdAt?.toDate ? svc.createdAt.toDate() : new Date(svc.createdAt || 0);
    return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7;
  };

  const filteredServices = services.filter(s => {
    if (filterNew && !isNew(s)) return false;
    if (filterPlatform !== 'all' && s.platformId !== filterPlatform) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        String(s.serviceId || '').includes(q) ||
        categories.find(c => c.id === s.categoryId)?.name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = {};
  platforms.forEach(p => {
    if (filterPlatform !== 'all' && p.id !== filterPlatform) return;
    const platSvcs = filteredServices.filter(s => s.platformId === p.id);
    if (platSvcs.length === 0 && search) return;
    grouped[p.id] = {
      platform: p,
      cats: {},
    };
    categories.filter(c => c.platformId === p.id).forEach(c => {
      const catSvcs = filteredServices.filter(s => s.platformId === p.id && s.categoryId === c.id);
      if (catSvcs.length === 0 && search) return;
      grouped[p.id].cats[c.id] = { category: c, svcs: catSvcs };
    });
  });

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
                {filteredServices.length} services available{filterNew ? ' (added in last 7 days)' : ''}
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
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by service name, ID or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white">×</button>
            )}
          </div>
          {/* Platform filter */}
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="all">All Platforms</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
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

        {loading ? (
          <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-white dark:bg-[#1a2742] rounded-2xl py-20 text-center border border-gray-100 dark:border-[#253a5e]">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
              <FiPackage className="text-gray-400 dark:text-gray-500" size={28} />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold text-lg mb-1">No services found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(grouped).map(({ platform, cats }) => {
              const isExp = expanded[platform.id];
              const count = filteredServices.filter(s => s.platformId === platform.id).length;
              if (count === 0) return null;

              return (
                  <div key={platform.id} className="bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e] overflow-hidden">
                  {/* Platform header */}
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-[#253a5e]/10 transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="text-gray-400 flex-shrink-0">
                        {isExp ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
                        style={{ backgroundColor: '#274C75', boxShadow: '0 8px 20px -4px #274C7550' }}>
                        {platform.icon
                          ? <img src={platform.icon} alt={platform.name} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                          : <span className="text-white font-bold text-xs sm:text-sm">{platform.name[0]}</span>
                        }
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-lg truncate">{platform.name}</span>
                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">{count} services</span>
                    </div>
                    {/* Order now shortcut */}
                    <Link
                      href={`/dashboard?platform=${platform.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-semibold transition-all shadow-md shadow-blue-600/20 flex-shrink-0"
                    >
                      <FiArrowRight size={10} className="sm:size-12" /> <span className="hidden xs:inline sm:inline">Order Now</span>
                    </Link>
                  </button>

                  {/* Categories + services */}
                  {isExp && (
                    <div className="border-t border-gray-100 dark:border-[#253a5e]">
                      {Object.values(cats).length === 0 ? (
                        <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">No categories for {platform.name} yet.</div>
                      ) : (
                        Object.values(cats).map(({ category, svcs }) => {
                          if (svcs.length === 0) return null;
                          return (
                            <div key={category.id}>
                              {/* Category row */}
                              <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-[#253a5e]/20 border-b border-gray-100 dark:border-[#253a5e]/50">
                                {category.icon && (
                                  <img src={category.icon} alt={category.name} className="w-5 h-5 rounded object-contain" />
                                )}
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{category.name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({svcs.length})</span>
                              </div>

                              {/* Services */}
                              <div className="divide-y divide-gray-100 dark:divide-[#253a5e]/30">
                                {svcs.map((svc) => (
                                  <div
                                    key={svc.id}
                                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3.5 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-colors group"
                                  >
                                    {/* Service ID */}
                                    <span className="text-xs sm:text-sm font-mono font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0">
                                      {svc.serviceId}
                                    </span>

                                    {/* Name + meta */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{svc.name}</span>
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
                                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 mt-1 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
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
                                    <div className="text-right flex-shrink-0 mr-1 sm:mr-3">
                                      <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                                        {format(parseFloat(svc.price || 0))}
                                      </p>
                                      <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">{svc.priceUnit || 'per 1000'}</p>
                                    </div>

                                    {/* Select & Order buttons */}
                                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                      <Link
                                        href={`/dashboard?platform=${svc.platformId}`}
                                        className="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 transition-all hover:scale-105"
                                      >
                                        Select
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
