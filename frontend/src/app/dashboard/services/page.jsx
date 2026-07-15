'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
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
      const sList = sS.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.isActive !== false);

      setPlatforms(pList);
      setCategories(cList);
      setServices(sList);

      // expand all by default
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

  // Group by platform → category
  const grouped = {};
  platforms.forEach(p => {
    if (filterPlatform !== 'all' && p.id !== filterPlatform) return;
    const platSvcs = filteredServices.filter(s => s.platformId === p.id);
    if (platSvcs.length === 0 && search) return; // hide empty platforms during search
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
    <div className="min-h-screen py-8">
      <div className="container-custom">
        {/* Back Button */}
        <button onClick={handleBack} className="mb-6 inline-flex items-center gap-2 text-dark-600 dark:text-dark-400 hover:text-primary-600 transition-colors text-sm hover:underline" title="Back to Dashboard">
          <FiArrowLeft /> Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-1">
              {filterNew ? '🆕 New Services' : 'Services List'}
            </h1>
            <p className="text-dark-500 dark:text-dark-400 text-sm">
              {filteredServices.length} services available{filterNew ? ' (added in last 7 days)' : ''}
            </p>
          </div>
          {/* Tab navigation */}
          <div className="flex items-center gap-2 bg-dark-100 dark:bg-dark-800 p-1 rounded-xl">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-dark-700/50 transition-all"
            >
              <FiShoppingBag className="text-primary-500" /> Order
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-dark-700 text-dark-900 dark:text-white shadow-sm transition-all cursor-default"
            >
              <FiPackage className="text-purple-500" /> Services
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Search by service name, ID or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                bg-dark-50 dark:bg-dark-800
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
          {/* Platform filter */}
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="all">All Platforms</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {/* New filter toggle */}
          <Link
            href={filterNew ? '/dashboard/services' : '/dashboard/services?filter=new'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              filterNew
                ? 'bg-yellow-500 text-white'
                : 'bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-400 hover:border-yellow-400 hover:text-yellow-500'
            }`}
          >
            🆕 New Only
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Spinner size="lg" /></div>
        ) : filteredServices.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <FiPackage className="text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
            <p className="text-dark-500 font-semibold text-lg mb-1">No services found</p>
            <p className="text-dark-400 text-sm">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(grouped).map(({ platform, cats }) => {
              const isExp = expanded[platform.id];
              const count = filteredServices.filter(s => s.platformId === platform.id).length;
              if (count === 0) return null;

              return (
                <div key={platform.id} className="glass-card overflow-hidden">
                  {/* Platform header */}
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}
                    className="w-full flex items-center justify-between p-4 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExp
                        ? <FiChevronDown className="text-dark-400 flex-shrink-0" />
                        : <FiChevronRight className="text-dark-400 flex-shrink-0" />}
                      {platform.icon
                        ? <img src={platform.icon} alt={platform.name} className="w-8 h-8 rounded-lg object-contain" style={{ backgroundColor: platform.color }} />
                        : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: platform.color || '#6366f1' }}>{platform.name[0]}</div>
                      }
                      <span className="font-bold text-dark-900 dark:text-white text-lg">{platform.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-500 font-medium">{count} services</span>
                    </div>
                    {/* Order now shortcut */}
                    <Link
                      href={`/dashboard?platform=${platform.id}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-all hover:shadow-md hover:shadow-primary-500/30"
                    >
                      <FiArrowRight /> Order Now
                    </Link>
                  </button>

                  {/* Categories + services */}
                  {isExp && (
                    <div className="border-t border-dark-200 dark:border-dark-700">
                      {Object.values(cats).length === 0 ? (
                        <div className="p-6 text-center text-dark-400 text-sm">No categories for {platform.name} yet.</div>
                      ) : (
                        Object.values(cats).map(({ category, svcs }) => {
                          if (svcs.length === 0) return null;
                          return (
                            <div key={category.id}>
                              {/* Category row */}
                              <div className="flex items-center gap-2 px-6 py-3 bg-dark-50 dark:bg-dark-800/40 border-b border-dark-100 dark:border-dark-700/50">
                                {category.icon && (
                                  <img src={category.icon} alt={category.name} className="w-5 h-5 rounded object-contain" />
                                )}
                                <span className="font-semibold text-sm text-dark-900 dark:text-white">{category.name}</span>
                                <span className="text-xs text-dark-400 ml-1">({svcs.length})</span>
                              </div>

                              {/* Services */}
                              <div className="divide-y divide-dark-100 dark:divide-dark-800/60">
                                {svcs.map((svc, idx) => (
                                  <div
                                    key={svc.id}
                                    className="flex items-center gap-3 px-6 py-3.5 hover:bg-primary-50 dark:hover:bg-primary-500/5 transition-colors group"
                                  >
                                    {/* Service ID - circular badge, light navy blue */}
                                    <span className="text-sm font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                                      {svc.serviceId}
                                    </span>

                                    {/* Name + meta */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-dark-900 dark:text-white">{svc.name}</span>
                                        {isNew(svc) && (
                                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-bold">NEW</span>
                                        )}
                                        {svc.isPopular && (
                                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 font-bold">🔥 Popular</span>
                                        )}
                                        {svc.isFeatured && (
                                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">★ Featured</span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-dark-400">
                                        <span>Min: <span className="font-medium text-dark-600 dark:text-dark-300">{parseInt(svc.minQuantity || 0).toLocaleString()}</span></span>
                                        <span>Max: <span className="font-medium text-dark-600 dark:text-dark-300">{parseInt(svc.maxQuantity || 0).toLocaleString()}</span></span>
                                        {(svc.avgTime || svc.averageTime) && (
                                          <span>⏱ {svc.avgTime || svc.averageTime}</span>
                                        )}
                                        {svc.refillSupported && <span className="text-green-500 font-medium">↩ Refill</span>}
                                        {svc.cancelSupported && <span className="text-blue-500 font-medium">✕ Cancel</span>}
                                      </div>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right flex-shrink-0">
                                      <p className="text-base font-bold text-primary-600 dark:text-primary-400">
                                        {format(parseFloat(svc.price || 0))}
                                      </p>
                                      <p className="text-xs text-dark-400">per 1000</p>
                                    </div>

                                    {/* Order button — appears on hover */}
                                    <Link
                                      href={`/dashboard?platform=${svc.platformId}`}
                                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0
                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                        bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold
                                        hover:shadow-md hover:shadow-primary-500/30"
                                    >
                                      Order <FiArrowRight />
                                    </Link>
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
