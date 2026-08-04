'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageLoader, Spinner } from '@/components/common/Loader';
import { FiPackage, FiShoppingBag, FiDollarSign, FiSearch, FiArrowRight, FiArrowLeft, FiChevronRight, FiList, FiUsers, FiTool, FiImage } from 'react-icons/fi';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, doc, updateDoc, getDoc, query, where, getCountFromServer, setDoc, increment, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useCurrency } from '@/context/CurrencyContext';
import { cachedQuery, invalidateCache } from '@/lib/cache';

function PlatformGrid({ platforms, onSelect, expandedId }) {
  if (platforms.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-2xl px-3">
        <FiPackage className="text-4xl sm:text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-3 sm:mb-4" />
        <p className="text-dark-500 font-semibold text-base sm:text-lg mb-1">No platforms yet</p>
        <p className="text-dark-400 text-xs sm:text-sm">The admin hasn't added any platforms yet.</p>
      </div>
    );
  }

  const selectedPlatform = platforms.find(p => p.id === expandedId);
  const otherPlatforms = platforms.filter(p => p.id !== expandedId);

  // If a platform is selected, show only it centered (categories and other platforms are shown separately in parent)
  if (selectedPlatform) {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => onSelect(selectedPlatform)}
          className="group relative flex flex-col items-center gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl transition-all duration-700 cursor-pointer overflow-hidden border-2 shadow-2xl animate-selected-scale"
          style={{ 
            backgroundColor: `${selectedPlatform.color || '#1A6BBD'}15`,
            borderColor: `${selectedPlatform.color || '#1A6BBD'}50`,
            boxShadow: `0 20px 60px -10px ${selectedPlatform.color || '#1A6BBD'}50`
          }}
        >
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-3xl p-[2px]"
            style={{ 
              background: `linear-gradient(135deg, ${selectedPlatform.color || '#1A6BBD'}, ${selectedPlatform.color || '#1A6BBD'}88, ${selectedPlatform.color || '#1A6BBD'}44)`,
              animation: 'border-glow 3s ease-in-out infinite'
            }}>
            <div className="w-full h-full rounded-3xl" style={{ backgroundColor: 'transparent' }}></div>
          </div>

          {/* Glowing Background Effect */}
          <div className="absolute inset-0 rounded-3xl opacity-30 blur-2xl"
            style={{ background: `radial-gradient(circle at center, ${selectedPlatform.color || '#1A6BBD'}40 0%, transparent 70%)` }}
          ></div>

          {/* Icon - Larger with Glow */}
          <div className="relative z-10 w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] rounded-3xl flex items-center justify-center transition-all duration-700 shadow-2xl"
            style={{ 
              backgroundColor: selectedPlatform.color || '#274C75',
              boxShadow: `0 15px 40px -8px ${selectedPlatform.color || '#274C75'}80`
            }}>
            {selectedPlatform.icon ? (
              <img src={selectedPlatform.icon} alt={selectedPlatform.name} className="w-[50px] h-[50px] sm:w-[68px] sm:h-[68px] object-contain" />
            ) : (
              <span className="text-4xl sm:text-5xl font-bold text-white">{selectedPlatform.name[0]}</span>
            )}
          </div>

          {/* Name - Larger with Gradient */}
          <span className="relative z-10 text-base sm:text-xl font-bold text-center bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
            {selectedPlatform.name}
          </span>

          {/* Active indicator - Animated Ping */}
          <span className="absolute top-2 right-2 sm:top-4 sm:right-4 flex h-4 w-4 sm:h-5 sm:w-5 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
              style={{ backgroundColor: selectedPlatform.color || '#1A6BBD' }}></span>
            <span className="relative inline-flex rounded-full h-4 w-4 sm:h-5 sm:w-5" 
              style={{ backgroundColor: selectedPlatform.color || '#1A6BBD' }}></span>
          </span>

          {/* Shimmer Effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>

          {/* Maintenance badge */}
          {selectedPlatform.maintenance && (
            <span className="relative z-10 text-[10px] sm:text-[12px] font-bold px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 uppercase tracking-wide animate-pulse">
              🔧 Maintenance
            </span>
          )}
        </button>
      </div>
    );
  }

  // If nothing is selected, show all platforms in grid with stagger animation
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
      {platforms.map((platform, index) => (
        <button
          key={platform.id}
          onClick={() => onSelect(platform)}
          className={`group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden border border-gray-100 dark:border-[#2a4270] hover:border-transparent hover:-translate-y-1 hover:shadow-xl hover:scale-105 animate-item-pop opacity-0 delay-${Math.min(index * 50, 500)}`}
        >
          {/* Hover gradient border */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-[1px]"
            style={{ background: `linear-gradient(135deg, ${platform.color || '#1A6BBD'}, ${platform.color || '#1A6BBD'}66, transparent)` }}>
            <div className="w-full h-full rounded-2xl bg-white dark:bg-[#1e3050]"></div>
          </div>

          {/* Icon */}
          <div className="relative z-10 w-[55px] h-[55px] sm:w-[70px] sm:h-[70px] rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg group-hover:shadow-2xl"
            style={{ backgroundColor: platform.color || '#274C75', boxShadow: `0 8px 20px -4px ${platform.color || '#274C75'}50` }}>
            {platform.icon ? (
              <img src={platform.icon} alt={platform.name} className="w-[35px] h-[35px] sm:w-[44px] sm:h-[44px] object-contain transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-white">{platform.name[0]}</span>
            )}
          </div>

          {/* Name */}
          <span className="relative z-10 text-[10px] sm:text-xs font-semibold text-gray-700 dark:text-gray-200 text-center transition-colors group-hover:text-gray-900 dark:group-hover:text-white">
            {platform.name}
          </span>

          {/* Maintenance badge */}
          {platform.maintenance && (
            <span className="relative z-10 text-[9px] sm:text-[11px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 uppercase tracking-wide">
              🔧 Maintenance
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function CategoryGrid({ platform, categories, onSelect, expandedId }) {
  // Filter categories for this specific platform and sort by sortOrder
  const platformCategories = categories
    .filter(c => c.platformId === platform.id && c.isActive !== false)
    .sort((a, b) => {
      const orderA = a.sortOrder !== undefined ? a.sortOrder : 999;
      const orderB = b.sortOrder !== undefined ? b.sortOrder : 999;
      return orderA - orderB;
    });
  
  if (platformCategories.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 border-2 border-dashed border-dark-200 dark:border-dark-700 rounded-2xl px-3">
        <FiPackage className="text-3xl sm:text-4xl text-dark-300 dark:text-dark-600 mx-auto mb-2 sm:mb-3" />
        <p className="text-dark-500 font-semibold text-sm sm:text-base mb-1">No categories yet</p>
        <p className="text-dark-400 text-xs sm:text-sm">No categories added for {platform.name}.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
      {platformCategories.map((cat, index) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat)}
          className={`group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden border border-white/20 dark:border-white/10 hover:border-transparent hover:-translate-y-1 hover:shadow-2xl hover:scale-105 animate-item-pop opacity-0 delay-${Math.min(index * 50, 500)}`}
          style={{
            background: `linear-gradient(135deg, ${platform.color || '#1A6BBD'}15, transparent)`
          }}
        >
          {/* Animated Hover Gradient Border */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 p-[1.5px]"
            style={{ 
              background: `linear-gradient(135deg, ${platform.color || '#1A6BBD'}, ${platform.color || '#1A6BBD'}88, ${platform.color || '#1A6BBD'}44)`,
            }}>
            <div className="w-full h-full rounded-2xl bg-white dark:bg-[#1e3050]"></div>
          </div>

          {/* Glow Effect on Hover */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"
            style={{ background: `radial-gradient(circle at center, ${platform.color || '#1A6BBD'} 0%, transparent 70%)` }}
          ></div>

          {/* Icon with Platform Color */}
          <div className="relative z-10 w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg group-hover:shadow-2xl group-hover:scale-110"
            style={{ 
              backgroundColor: platform.color || '#274C75',
              boxShadow: `0 8px 20px -4px ${platform.color || '#274C75'}50`
            }}>
            {cat.icon ? (
              <img src={cat.icon} alt={cat.name} className="w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] object-contain transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
            ) : (
              <span className="text-xl sm:text-2xl font-bold text-white transition-transform duration-500 group-hover:scale-110">{cat.name[0]}</span>
            )}
            
            {/* Icon Shine Effect */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
          </div>

          {/* Name with Gradient on Hover */}
          <span className="relative z-10 text-[10px] sm:text-sm font-semibold text-center transition-all duration-300"
            style={{ 
              color: '#1f2937'
            }}>
            <span className="dark:text-gray-200 group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-700 dark:group-hover:from-white dark:group-hover:to-gray-200 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
              {cat.name}
            </span>
          </span>

          {/* Floating Particles Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full animate-ping" 
              style={{ backgroundColor: platform.color || '#1A6BBD', animationDuration: '1.5s' }}></div>
            <div className="absolute top-3/4 right-1/4 w-1 h-1 rounded-full animate-ping" 
              style={{ backgroundColor: platform.color || '#1A6BBD', animationDuration: '2s', animationDelay: '0.3s' }}></div>
          </div>

          {/* Maintenance badge */}
          {cat.maintenance && (
            <span className="relative z-10 text-[9px] sm:text-[11px] font-bold px-2 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 uppercase tracking-wide animate-pulse whitespace-nowrap">
              🔧 Maintenance
            </span>
          )}

          {/* Bottom Gradient Line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl"
            style={{ 
              background: `linear-gradient(90deg, transparent, ${platform.color || '#1A6BBD'}, transparent)`
            }}
          ></div>
        </button>
      ))}
    </div>
  );
}

function ServicesList({ platform, category, services, onBack, selectedService, onServiceSelect, format }) {
  const isNew = (svc) => {
    const created = svc.createdAt?.toDate ? svc.createdAt.toDate() : new Date(svc.createdAt || 0);
    return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  };
  const [search, setSearch] = useState('');
  const [displayedServices, setDisplayedServices] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const SERVICES_PER_PAGE = 10;
  const loadMoreRef = useRef(null);
  const observerRef = useRef(null);
  
  const allCategoryServices = services.filter(s => s.categoryId === category.id && s.platformId === platform.id);
  const categoryServices = search
    ? allCategoryServices.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        (s.serviceId && String(s.serviceId).includes(search))
      ).sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0))
    : allCategoryServices.sort((a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0));

  // 🚀 Pagination
  useEffect(() => {
    const endIndex = page * SERVICES_PER_PAGE;
    const newDisplayed = categoryServices.slice(0, endIndex);
    setDisplayedServices(newDisplayed);
    setHasMore(endIndex < categoryServices.length);
  }, [categoryServices, page]);

  // 🚀 Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    
    observerRef.current.observe(loadMoreRef.current);
    
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore]);
  
  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div>
      {/* Breadcrumb removed - shown in parent component above */}

      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm" />
        <input type="text" placeholder="Search by service name or ID..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-dark-100 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 dark:placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all" />
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
        <>
          <div className="space-y-2 sm:space-y-3 max-h-[500px] sm:max-h-[600px] lg:max-h-[700px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-primary-500 scrollbar-track-transparent">
            {displayedServices.map((service) => (
            <div
              key={service.id}
              onClick={() => onServiceSelect(service)}
              className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedService?.id === service.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md shadow-primary-500/20'
                  : 'border-dark-200 dark:border-dark-700 hover:border-primary-400 dark:hover:border-primary-600 bg-dark-50 dark:bg-dark-800/50 hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                  {service.serviceId && (
                    <span className="text-xs sm:text-sm font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      {service.serviceId}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark-900 dark:text-white text-xs sm:text-sm leading-tight mb-1 flex items-center gap-2 flex-wrap">
                      <span className="break-words">{service.name}</span>
                      {service.maintenance && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/30 uppercase whitespace-nowrap">🔧 Maintenance</span>
                      )}
                      {isNew(service) && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">NEW</span>
                      )}
                      {service.isPopular && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">Popular</span>
                      )}
                      {service.isFeatured && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">Featured</span>
                      )}
                      {service.isBestSeller && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400">🏆 Best Seller</span>
                      )}
                      {service.isTrending && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">📈 Trending</span>
                      )}
                      {service.isTopRated && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">⭐ Top Rated</span>
                      )}
                      {service.isSale && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">🏷️ Sale</span>
                      )}
                      {service.isPremium && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">💎 Premium</span>
                      )}
                      {service.isVIP && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">👑 VIP</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[10px] sm:text-xs">
                      <span className="text-dark-500">Min: <span className="font-semibold text-dark-700 dark:text-dark-300">{parseInt(service.minQuantity || 0).toLocaleString()}</span></span>
                      <span className="text-dark-400">|</span>
                      <span className="text-dark-500">Max: <span className="font-semibold text-dark-700 dark:text-dark-300">{parseInt(service.maxQuantity || 0).toLocaleString()}</span></span>
                      {(service.avgTime || service.averageTime) && (
                        <><span className="text-dark-400">|</span><span className="text-dark-500">⏱ {service.avgTime || service.averageTime}</span></>
                      )}
                      {service.refillSupported && <span className="text-[9px] sm:text-[10px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded whitespace-nowrap">↩ Refill</span>}
                      {service.cancelSupported && <span className="text-[9px] sm:text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded whitespace-nowrap">✕ Cancel</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right sm:text-right flex-shrink-0 self-start">
                  <p className="text-sm sm:text-base font-bold text-primary-600 dark:text-primary-400">
                    {format(parseFloat(service.price || 0))}
                  </p>
                  <p className="text-[10px] sm:text-xs text-dark-400">{service.priceUnit || 'per 1000'}</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* 🚀 Infinite Scroll Trigger */}
          {hasMore && displayedServices.length > 0 && (
            <div ref={loadMoreRef} className="py-4 text-center">
              <div className="inline-block w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-dark-400 mt-2">Loading more services...</p>
            </div>
          )}
          
          {!hasMore && displayedServices.length > 0 && (
            <div className="py-3 text-center text-xs text-dark-400">
              All services loaded ({displayedServices.length})
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}

function DashboardContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { format, currency, rates, currencies } = useCurrency();
  const searchParams = useSearchParams();
  const preselectedPlatformId = searchParams.get('platform');

  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [blockedItem, setBlockedItem] = useState(null); // { type: 'platform'|'category'|'service', name: string }

  const displayBalance = (pkrBalance) => {
    if (!pkrBalance) return currency === 'PKR' ? '₨0.00' : `${currencies.find(c => c.code === currency)?.symbol || ''}0.00`;
    if (currency === 'PKR') return `₨${pkrBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const usdAmount = pkrBalance / rates.PKR;
    const convertedAmount = usdAmount * rates[currency];
    const symbol = currencies.find(c => c.code === currency)?.symbol || currency;
    let decimals = 2;
    if (['BDT', 'INR', 'SAR', 'AED'].includes(currency)) decimals = convertedAmount < 10 ? 4 : 0;
    return `${symbol}${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loadedCategoryIds, setLoadedCategoryIds] = useState(new Set());
  const [loadedPlatformIds, setLoadedPlatformIds] = useState(new Set());
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [totalWebsiteOrders, setTotalWebsiteOrders] = useState(0);
  const [totalServicesCount, setTotalServicesCount] = useState(0); // 🚀 From stats counter
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState('platforms'); // Start with platforms
  const [expandedPlatform, setExpandedPlatform] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [orderData, setOrderData] = useState({ link: '', quantity: '', comments: '' });
  const [orderLoading, setOrderLoading] = useState(false);
  const [showServicesPanel, setShowServicesPanel] = useState(false);
  const [instagramGifUrl, setInstagramGifUrl] = useState(''); // Empty by default
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('services');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile, go back to services view when selection is cleared
  useEffect(() => {
    if (isMobile && !selectedService) setMobileView('services');
  }, [isMobile, selectedService]);

  useEffect(() => {
    const fetchWhitelist = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'siteSettings', 'general')); // DIRECT read — never cached, so admin Guide GIF + whitelist show instantly
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const whitelist = data.whitelistedEmails || [];
          const currentEmail = (user?.email || '').trim().toLowerCase();
          const whitelistList = Array.isArray(whitelist) ? whitelist.map(e => (e || '').trim().toLowerCase()).filter(Boolean) : [];
          const isUserWhitelisted = !!(currentEmail && whitelistList.includes(currentEmail));
          setIsWhitelisted(isUserWhitelisted);
          
          // Fetch Instagram GIF URL (if set by admin in settings)
          if (data.instagramGuideGif && data.instagramGuideGif.trim()) {
            setInstagramGifUrl(data.instagramGuideGif);
            console.log('🎨 Using Cloudinary GIF URL:', data.instagramGuideGif);
          } else {
            console.log('⚠️ No Instagram Guide GIF uploaded by admin');
          }
          
          console.log('🔐 Whitelist Check:', { 
            currentEmail, 
            whitelist: whitelistList, 
            isWhitelisted: isUserWhitelisted,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('⚠️ No siteSettings/general document found');
        }
      } catch (e) { 
        console.error('❌ Failed to fetch whitelist:', e); 
      }
    };
    if (user) fetchWhitelist();
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) { fetchData(); }
    else { setLoading(false); }
  }, [user, authLoading]);

  // 🔴 REALTIME: Listen for admin "Push Update" button
  useEffect(() => {
    if (!user) return;
    
    let lastSeenVersion = null;
    
    // Listen to live/meta document for full refresh trigger
    const unsubscribe = onSnapshot(doc(db, 'live', 'meta'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const currentVersion = data.version || 0;
        
        // Only trigger on VERSION CHANGE (not on initial load or refresh)
        if (lastSeenVersion !== null && currentVersion > lastSeenVersion && data.fullRefresh) {
          console.log('🔄 Admin pushed service update! Version:', lastSeenVersion, '→', currentVersion);
          toast('🔄 Services updated by admin', { icon: '✨' });
          
          // Refetch services only (not everything)
          fetchData();
        }
        
        // Update last seen version
        lastSeenVersion = currentVersion;
      }
    }, (error) => {
      console.warn('⚠️ Realtime listener error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (preselectedPlatformId && platforms.length > 0) {
      const p = platforms.find(p => p.id === preselectedPlatformId);
      console.log('🔗 Preselected Platform Check:', {
        preselectedId: preselectedPlatformId,
        foundPlatform: p?.name || 'NOT FOUND',
        maintenance: p?.maintenance || false,
        isWhitelisted,
        willBlock: p?.maintenance && !isWhitelisted
      });
      
      if (p) {
        if (p.maintenance && !isWhitelisted) {
          console.log('🚫 BLOCKING - Preselected platform in maintenance and user not whitelisted');
          setBlockedItem({ type: 'platform', name: p.name });
          return;
        }
        console.log('✅ ALLOWING - Preselected platform access granted');
        setExpandedPlatform(p);
        setSelectedPlatform(p);
        setStep('categories');
        loadPlatformCategories(p.id);
      }
    }
  }, [preselectedPlatformId, platforms, isWhitelisted]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔴 Check admin push version FIRST
      const metaDoc = await getDoc(doc(db, 'live', 'meta'));
      const currentVersion = metaDoc.exists() ? metaDoc.data().version || 0 : 0;
      const cachedVersion = sessionStorage.getItem('services_version');
      
      if (cachedVersion && parseInt(cachedVersion) < currentVersion) {
        console.log('🔄 Admin pushed update! Clearing cache...');
        invalidateCache('services:');
        invalidateCache('platforms:');
        invalidateCache('categories:');
      }
      sessionStorage.setItem('services_version', currentVersion.toString());
      
      // Helper function with retry logic for count queries
      const getCountWithRetry = async (queryRef, retries = 2) => {
        for (let i = 0; i < retries; i++) {
          try {
            const snapshot = await getCountFromServer(queryRef);
            return snapshot.data().count;
          } catch (err) {
            console.warn(`⚠️ Count query failed (attempt ${i + 1}/${retries}):`, err.message);
            if (i === retries - 1) return 0; // Last attempt failed, return 0
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
          }
        }
        return 0;
      };
      
      // Fetch platforms and categories with shared cache keys
      const platformsData = await cachedQuery('platforms:all', async () => {
        const platSnap = await getDocs(query(collection(db, 'platforms'), where('isActive', '==', true)));
        return platSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      }, Infinity); // ♾️ Infinite cache - only clears when admin pushes update or tab closes
      setPlatforms(platformsData);

      // Load categories LAZILY - only when a platform is selected (saves ~350KB of icons)
      setCategories([]);
      console.log(`✅ Loaded ${platformsData.length} platforms (categories load lazily on platform select)`);

      // Fetch stats (fresh for accuracy) with retry logic
      console.log('📊 Fetching LIVE counts from Firestore...');
      const [totalUsers, totalOrders, totalServices, onlineUsers] = await Promise.all([
        getCountWithRetry(collection(db, 'users')),
        getCountWithRetry(collection(db, 'orders')),
        getCountWithRetry(collection(db, 'services')),
        getCountWithRetry(query(collection(db, 'users'), where('lastSeen', '>=', new Date(Date.now() - 5 * 60 * 1000)))),
      ]);

      setTotalUsers(totalUsers);
      setTotalWebsiteOrders(totalOrders);
      setTotalServicesCount(totalServices);
      setOnlineUsers(onlineUsers);

      // User orders — cache per user
      if (user?.uid) {
        const ordersResult = await cachedQuery(`userOrders:${user.uid}`, async () => {
          const userOrdersSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid)));
          return userOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }, Infinity); // ♾️ Infinite cache - only clears when admin pushes update or tab closes
        setUserOrders(ordersResult);
      }
    } catch (e) { console.error('Dashboard data fetch error:', e); }
    finally { setLoading(false); }
  };

  const handlePlatformSelect = async (platform) => {
    console.log('🎯 Platform Selected:', { 
      platform: platform.name, 
      maintenance: platform.maintenance, 
      isWhitelisted,
      userEmail: user?.email,
      willBlock: platform.maintenance && !isWhitelisted,
      timestamp: new Date().toISOString()
    });
    
    if (platform.maintenance && !isWhitelisted) {
      console.log('🚫 BLOCKING - Platform in maintenance and user not whitelisted');
      setBlockedItem({ type: 'platform', name: platform.name });
      return;
    }
    
    console.log('✅ ALLOWING - Platform access granted');
    
    // Expand platform and show categories
    if (expandedPlatform?.id === platform.id) {
      // Collapsing - reset everything
      setExpandedPlatform(null);
      setExpandedCategory(null);
      setSelectedPlatform(null);
      setSelectedCategory(null);
      setServices([]); // Clear services
      setLoadedCategoryIds(new Set()); // Clear loaded tracking
      setStep('platforms');
    } else {
      // Switching platforms - clear old platform's services
      if (expandedPlatform?.id !== platform.id) {
        console.log('🔄 Switching platforms - clearing old services');
        setServices([]);
        setLoadedCategoryIds(new Set());
      }
      
setExpandedPlatform(platform);
      setSelectedPlatform(platform);
      setExpandedCategory(null);
      setSelectedCategory(null);
      setStep('categories');
      
      // 🚀 LAZY LOAD: Fetch categories for this platform only (prevent 350KB icon download)
      loadPlatformCategories(platform.id);
    }
  };

  const loadPlatformCategories = async (platformId) => {
    if (loadedPlatformIds.has(platformId)) return;
    setLoadedPlatformIds(prev => new Set(prev).add(platformId)); // Mark BEFORE fetching
    setCategoriesLoading(true);
    try {
      const platformCategories = await cachedQuery(
        `/platforms/${platformId}/categories:all`,
        async () => {
          const catSnap = await getDocs(query(collection(db, 'categories'), where('platformId', '==', platformId), where('isActive', '==', true)));
          return catSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        },
        Infinity // ♾️ Infinite cache - only clears when admin pushes update or tab closes
      );
      setCategories(prev => {
        const existing = new Set(prev.map(c => c.id));
        return [...prev, ...platformCategories.filter(c => !existing.has(c.id))];
      });
      setCategoriesLoading(false);
      console.log(`✅ Loaded ${platformCategories.length} categories for platform ${platformId}`);
    } catch (e) {
      setCategoriesLoading(false);
      console.error('❌ Error loading categories:', e);
      toast.error('Failed to load categories');
      setLoadedPlatformIds(prev => {
        const n = new Set(prev);
        n.delete(platformId);
        return n;
      });
    }
  };

  const handleCategorySelect = async (category) => {
    console.log('📂 Category Selected:', {
      category: category.name,
      maintenance: category.maintenance,
      isWhitelisted,
      userEmail: user?.email,
      willBlock: category.maintenance && !isWhitelisted,
      timestamp: new Date().toISOString()
    });
    
    if (category.maintenance && !isWhitelisted) {
      console.log('🚫 BLOCKING - Category in maintenance and user not whitelisted');
      setBlockedItem({ type: 'category', name: category.name });
      return;
    }
    
    console.log('✅ ALLOWING - Category access granted, showing services in same area');
    
    // Show services in the same area (not panel)
    setSelectedCategory(category);
    setStep('services');
    
    // 🚀 LAZY LOAD: Fetch services for this category only (prevent duplicate reads)
    if (!loadedCategoryIds.has(category.id)) {
      console.log('🔧 Lazy loading services for:', category.name, 'platformId:', selectedPlatform.id);
      setLoadedCategoryIds(prev => new Set(prev).add(category.id)); // Mark as loaded BEFORE fetching
      try {
        const categoryServices = await cachedQuery(
          `services:${selectedPlatform.id}:${category.id}`, 
          async () => {
            console.log('🔍 Fetching services from Firestore for category:', category.name);
            const snapshot = await getDocs(
              query(
                collection(db, 'services'), 
                where('categoryId', '==', category.id),
                where('platformId', '==', selectedPlatform.id),
                where('isActive', '==', true)
              )
            );
            // Process and return data array (not snapshot)
            const processedData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`✅ Fetched ${processedData.length} services from Firestore`);
            return processedData;
          },
          Infinity // ♾️ Infinite cache - only clears when admin pushes update or tab closes
        );
        
        setServices(prevSvcs => [...prevSvcs, ...categoryServices]);
        console.log(`✅ Loaded ${categoryServices.length} services for ${category.name}`);
      } catch (e) {
        console.error('❌ Error loading services:', e);
        toast.error(`Failed to load services: ${e.message}`);
        setLoadedCategoryIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(category.id); // Remove from loaded if error
          return newSet;
        });
      }
    } else {
      console.log(`⚡ Services for ${category.name} already loaded, skipping fetch (preventing duplicate read)`);
    }
  };

  const handleServiceSelect = (service) => {
    console.log('🔧 Service Selected:', {
      service: service.name,
      maintenance: service.maintenance,
      isWhitelisted,
      userEmail: user?.email,
      willBlock: service.maintenance && !isWhitelisted,
      timestamp: new Date().toISOString()
    });
    
    if (service.maintenance && !isWhitelisted) {
      console.log('🚫 BLOCKING - Service in maintenance and user not whitelisted');
      setBlockedItem({ type: 'service', name: service.name });
      return;
    }
    
    console.log('✅ ALLOWING - Either not in maintenance or user is whitelisted');
    
    setSelectedService(service);
    setOrderData({ link: '', quantity: service.minQuantity || '', comments: '' });
    if (isMobile) setMobileView('order');
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
    // 🟢 REAL-TIME PRICE GUARD: re-check the service from Firestore (fresh, no cache)
    try {
      const freshSnap = await getDoc(doc(db, 'services', selectedService.id));
      const fresh = freshSnap.exists() ? freshSnap.data() : null;
      if (!fresh || !fresh.isActive) {
        toast.error('This service is no longer available. Please pick another.');
        setSelectedService(null);
        return;
      }
      const freshPrice = parseFloat(fresh.price || 0);
      if (freshPrice !== parseFloat(selectedService.price || 0)) {
        invalidateCache('services:');
        setSelectedService(null);
        toast.error(`${format(freshPrice)} — Price updated! Please confirm again before ordering.`);
        return;
      }
      // Also confirm min/max still valid
      if (qty < parseInt(fresh.minQuantity || 0) || qty > parseInt(fresh.maxQuantity || 999999999)) {
        toast.error('Service quantity has changed. Please refresh and try again.');
        return;
      }
    } catch (err) {
      console.warn('⚠️ Price guard fetch failed, continuing:', err);
    }
    const totalCharge = parseFloat(calculatePrice());
    const currentBalance = parseFloat(userProfile?.walletBalance || 0);
    if (currentBalance < totalCharge) {
      toast.error(`Insufficient balance. You need ${format(totalCharge)} but have ${format(currentBalance)}`);
      return;
    }
    setOrderLoading(true);
    try {
      let providerOrderId = null;
      let providerName = null;
      if (selectedService.providerServiceId && selectedService.providerId) {
        try {
          // 🔐 Provider apiKey is admin-only in Firestore — place the order via the
          // Cloudflare worker, which verifies our ID token and calls the provider server-side.
          const idToken = await user.getIdToken();

          // Prepare order payload
          const orderPayload = {
            idToken,
            providerId: selectedService.providerId,
            action: 'add',
            service: selectedService.providerServiceId,
            link: orderData.link,
            quantity: qty
          };

          // Add comments if present (for services with custom comments)
          if (orderData.comments && orderData.comments.trim()) {
            orderPayload.comments = orderData.comments.trim();
          }

          console.log('📤 Sending order to provider:', {
            service: selectedService.name,
            quantity: qty,
            hasComments: !!orderPayload.comments,
            commentsLength: orderPayload.comments?.length || 0
          });

          // Try up to 2 times on transient failures (network / rate limit)
          for (let attempt = 1; attempt <= 2; attempt++) {
            let proxyResult = null;
            try {
              const proxyRes = await fetch('https://smm-proxy.ms8347750.workers.dev', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload),
              });
              proxyResult = await proxyRes.json();
            } catch (fetchErr) {
              console.warn(`⚠️ Network error (attempt ${attempt}): ${fetchErr.message}`);
              if (attempt === 1) { await new Promise(r => setTimeout(r, 3000)); continue; }
              throw new Error('Network error connecting to provider');
            }

            console.log('📥 Provider response:', {
              attempt,
              success: proxyResult.success,
              orderId: proxyResult.data?.order || null,
              error: proxyResult.data?.error || null
            });

            if (proxyResult.success && proxyResult.data?.order) {
              providerOrderId = proxyResult.data.order;
              if (proxyResult.providerName) providerName = proxyResult.providerName;
              break;
            }
            if (proxyResult.data?.error) {
              // Transient errors (rate limit / timeout) → retry once, others surface immediately
              const msg = String(proxyResult.data.error || '').toLowerCase();
              if (attempt === 1 && (msg.includes('rate') || msg.includes('timeout') || msg.includes('try again'))) {
                console.warn(`⚠️ Transient provider error, retrying (attempt ${attempt}): ${proxyResult.data.error}`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
              throw new Error(`Service error: ${proxyResult.data.error}`);
            }
            if (attempt === 1) {
              console.warn('⚠️ Unknown provider response, retrying...', proxyResult);
              await new Promise(r => setTimeout(r, 3000));
              continue;
            }
            throw new Error('Service error: Provider returned an invalid response');
          }
        } catch (providerErr) {
          console.error('Provider order error:', providerErr.message);
          toast.error(`Order saved as pending. Provider message: ${providerErr.message.replace('Service error: ', '')}`);
        }
      }
      await addDoc(collection(db, 'orders'), {
        userId: user.uid, userEmail: user.email, serviceId: selectedService.serviceId, serviceName: selectedService.name,
        platformId: selectedPlatform?.id, platformName: selectedPlatform?.name, categoryId: selectedCategory?.id, categoryName: selectedCategory?.name,
        providerId: selectedService.providerId || null, providerName, providerServiceId: selectedService.providerServiceId || null, providerOrderId,
        providerCost: selectedService.providerPrice ? parseFloat((selectedService.providerPrice * qty / 1000).toFixed(4)) : null, // Provider cost
        link: orderData.link, quantity: qty, charge: totalCharge, comments: orderData.comments || '',
        cancelSupported: selectedService.cancelSupported || false, refillSupported: selectedService.refillSupported || false,
        hasRefill: selectedService.refillSupported || false,
        refillDays: parseInt(selectedService.refillDays || selectedService.refillPeriodDays || 0),
        refillPeriodDays: parseInt(selectedService.refillPeriodDays || selectedService.refillDays || 0), 
        status: providerOrderId ? 'processing' : 'pending',
        createdAt: new Date(), updatedAt: new Date(),
      });
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const newBalance = parseFloat((userSnap.data().walletBalance || 0) - totalCharge).toFixed(4);
        await updateDoc(userRef, { walletBalance: parseFloat(newBalance), totalOrders: (userSnap.data().totalOrders || 0) + 1, totalSpent: parseFloat(((userSnap.data().totalSpent || 0) + totalCharge).toFixed(4)) });
      }
      toast.success(providerOrderId ? `Order placed! ID: ${providerOrderId}. ${format(totalCharge)} deducted.` : `Order saved! ${format(totalCharge)} deducted. Processing manually.`);
      
      // 🔴 REALTIME COUNTER: increment total orders (homepage stats update instantly)
      try {
        await setDoc(doc(db, 'stats', 'counters'), { totalOrders: increment(1) }, { merge: true });
      } catch (counterErr) {
        console.warn('⚠️ Failed to update orders counter:', counterErr.message);
      }

      // Clear user orders + transactions cache (balance will auto-update via listener)
      invalidateCache(`userOrders:${user.uid}`);
      invalidateCache(`tx:all:${user.uid}`);
      console.log('🗑️ Cleared user orders/transactions cache after order placement');
      
      setSelectedService(null);
      setOrderData({ link: '', quantity: '', comments: '' });
      window.location.reload();
    } catch (err) { console.error(err); toast.error(err.message || 'Failed to place order'); }
    finally { setOrderLoading(false); }
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

  // Show maintenance block screen - same design as global maintenance mode
  if (blockedItem) {
    let blockedName = blockedItem.name;
    if (blockedItem.type === 'platform') blockedName = `Platform "${blockedItem.name}"`;
    else if (blockedItem.type === 'category') blockedName = `Category "${blockedItem.name}"`;
    else if (blockedItem.type === 'service') blockedName = `Service "${blockedItem.name}"`;
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <FiTool className="text-white text-6xl" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-dark-900 dark:text-white mb-4">
              Under Maintenance
            </h1>
            <p className="text-xl text-dark-600 dark:text-dark-300 mb-4">
              <span className="font-bold text-yellow-500">{blockedName}</span> is currently under maintenance.
            </p>
            <p className="text-lg text-dark-500 dark:text-dark-400 mb-8">
              We're performing maintenance to improve your experience. Please check back soon!
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-500/30 mb-8">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              <span className="text-yellow-700 dark:text-yellow-400 font-semibold">
                We'll be back shortly
              </span>
            </div>
          </div>
          <div className="glass-card p-6 max-w-md mx-auto">
            <h3 className="font-bold text-dark-900 dark:text-white mb-3">Want to try something else?</h3>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-4">
              Select a different platform or browse other available services.
            </p>
            <button
              onClick={() => setBlockedItem(null)}
              className="w-full px-8 py-5 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold text-xl shadow-xl hover:shadow-2xl hover:shadow-primary-500/30 transition-all hover:scale-105"
            >
              Back to Platforms
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">Manage your orders and explore services</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1e3050] p-1 rounded-xl w-full sm:w-auto">
            <Link href="/dashboard" className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-white dark:bg-[#253a5e] text-gray-900 dark:text-white shadow-sm transition-all">
              <FiShoppingBag className="text-primary-500" size={14} /> Order
            </Link>
            <Link href="/dashboard/services" className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#253a5e]/50 transition-all">
              <FiList className="text-gray-400" size={14} /> Services
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {/* Balance */}
          <div className="group bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 stat-card stat-card-blue">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <FiDollarSign className="text-white" size={14} />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Balance</p>
            </div>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate mb-2 sm:mb-3">{displayBalance(userProfile?.walletBalance || 0)}</p>
            <Link href="/dashboard/add-funds" className="flex items-center justify-center gap-1 w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20">+ Add Funds</Link>
          </div>
          {/* Orders */}
          <div className="group bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 stat-card stat-card-emerald">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <FiShoppingBag className="text-white" size={14} />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">My Orders</p>
            </div>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{userOrders.length}</p>
            <Link href="/dashboard/orders" className="flex items-center justify-center gap-1 w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md shadow-emerald-600/20">View</Link>
          </div>
          {/* Services */}
          <div className="group bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 stat-card stat-card-violet">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <FiPackage className="text-white" size={14} />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Services</p>
            </div>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{totalServicesCount.toLocaleString()}</p>
            <Link href="/dashboard/services" className="flex items-center justify-center gap-1 w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-600/20">Browse</Link>
          </div>
          {/* Users */}
          <div className="group bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 stat-card stat-card-sky">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
                <FiUsers className="text-white" size={14} />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Total Users</p>
            </div>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{totalUsers.toLocaleString()}</p>
            <div className="flex items-center justify-center w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-sky-600/15 text-sky-400">Registered</div>
          </div>
          {/* Online */}
          <div className="group bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 stat-card stat-card-green">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/30 relative">
                <FiUsers className="text-white" size={14} />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-400"></span>
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Online Users</p>
            </div>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{onlineUsers.toLocaleString()}</p>
            <div className="flex items-center justify-center gap-1.5 w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-green-600/15 text-green-400">
              <span className="flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"></span></span>
              Active Now
            </div>
          </div>
          {/* Total Orders */}
          <div className="group bg-white dark:bg-[#1a2742] rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 stat-card stat-card-orange">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="text-sm sm:text-base">📊</span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Total Orders</p>
            </div>
            <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">{totalWebsiteOrders.toLocaleString()}</p>
            <div className="flex items-center justify-center w-full py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-orange-500/15 text-orange-400">Website</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6" style={{ display: isMobile && mobileView === 'order' ? 'none' : '' }}>
            {/* Show Platform + Categories only when NOT showing services */}
            {step !== 'services' && (
              <>
                {/* Platforms Section */}
                <div className="bg-white dark:bg-[#1a2742] rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-[#253a5e]">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                    {expandedPlatform && (
                      <button onClick={() => { setExpandedPlatform(null); setExpandedCategory(null); setSelectedPlatform(null); setSelectedCategory(null); setStep('platforms'); }} className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all">
                        <FiArrowLeft size={14} />
                      </button>
                    )}
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {!expandedPlatform ? 'Choose a Platform' : `${expandedPlatform.name}`}
                      </h2>
                      {expandedPlatform && (
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Select a category below</p>
                      )}
                    </div>
                  </div>

                  {/* ⚠️ Warning Banner */}
                  {!expandedPlatform && (
                    <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-2xl px-4 py-3 mb-6 shadow-lg">
                      <div className="flex items-center justify-center gap-2 text-center">
                        <span className="text-yellow-600 dark:text-yellow-400 text-lg sm:text-xl">⚠️</span>
                        <p className="text-xs sm:text-sm font-bold text-yellow-800 dark:text-yellow-300 uppercase tracking-wide">
                          Try Low Target Before Bulk • If Satisfied In Speed Then Re-Order
                        </p>
                        <span className="text-yellow-600 dark:text-yellow-400 text-lg sm:text-xl">⚠️</span>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex justify-center py-16"><Spinner size="lg" /></div>
                  ) : (
                    <PlatformGrid platforms={platforms} onSelect={handlePlatformSelect} expandedId={expandedPlatform?.id} />
                  )}
                </div>

                {/* Categories Section - FIRST (Below Selected Platform) */}
                {expandedPlatform && (
                  <div className="relative rounded-3xl p-6 border-2 shadow-2xl overflow-hidden animate-slide-up-fade"
                    style={{
                      background: `linear-gradient(135deg, ${expandedPlatform.color || '#1A6BBD'}08, ${expandedPlatform.color || '#1A6BBD'}03)`,
                      borderColor: `${expandedPlatform.color || '#1A6BBD'}30`
                    }}>
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0" 
                        style={{
                          backgroundImage: `radial-gradient(circle at 2px 2px, ${expandedPlatform.color || '#1A6BBD'} 1px, transparent 0)`,
                          backgroundSize: '40px 40px'
                        }}></div>
                    </div>

                    {/* Glowing Orbs */}
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
                      style={{ background: `radial-gradient(circle, ${expandedPlatform.color || '#1A6BBD'} 0%, transparent 70%)` }}
                    ></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-15"
                      style={{ background: `radial-gradient(circle, ${expandedPlatform.color || '#1A6BBD'} 0%, transparent 70%)` }}
                    ></div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xl transition-transform duration-300 hover:scale-110 hover:rotate-12" 
                        style={{ 
                          backgroundColor: expandedPlatform.color || '#274C75',
                          boxShadow: `0 8px 24px -4px ${expandedPlatform.color || '#274C75'}60`
                        }}>
                        <FiPackage className="text-white" size={22} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                          Choose Category
                        </h2>
                        <p className="text-sm font-medium mt-0.5"
                          style={{ color: expandedPlatform.color || '#6b7280' }}>
                          Select service type for {expandedPlatform.name}
                        </p>
                      </div>
                    </div>

                    {/* Categories Grid */}
                    <div className="relative z-10">
                      {loading || categoriesLoading ? (
                        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
                      ) : (
                        <CategoryGrid 
                          platform={expandedPlatform} 
                          categories={categories} 
                          onSelect={handleCategorySelect} 
                          expandedId={expandedCategory?.id} 
                        />
                      )}
                    </div>

                    {/* Bottom Shine Effect */}
                    <div className="absolute bottom-0 left-0 right-0 h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${expandedPlatform.color || '#1A6BBD'}80, transparent)`
                      }}
                    ></div>
                  </div>
                )}
              </>
            )}

            {/* Show Services when step is 'services' */}
            {step === 'services' && selectedCategory && expandedPlatform && (
              <div className="bg-white dark:bg-[#1a2742] rounded-3xl p-6 border border-gray-100 dark:border-[#253a5e]">
                {/* Back Button & Breadcrumb */}
                <div className="flex items-center gap-3 mb-6">
                  <button 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedService(null);
                      setStep('categories');
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#253a5e] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all shadow-md"
                  >
                    <FiArrowLeft size={20} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {expandedPlatform.icon && <img src={expandedPlatform.icon} alt={expandedPlatform.name} className="w-4 h-4 rounded object-contain" />}
                      <span>{expandedPlatform.name}</span>
                      <FiChevronRight size={12} />
                      {selectedCategory.icon && <img src={selectedCategory.icon} alt={selectedCategory.name} className="w-4 h-4 rounded object-contain" />}
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedCategory.name}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Choose a Service
                    </h2>
                  </div>
                </div>

                {/* Services List */}
                <ServicesList 
                  platform={expandedPlatform} 
                  category={selectedCategory} 
                  services={services} 
                  onBack={() => {
                    setSelectedCategory(null);
                    setSelectedService(null);
                    setStep('categories');
                  }} 
                  selectedService={selectedService} 
                  onServiceSelect={handleServiceSelect} 
                  format={format} 
                />
              </div>
            )}
          </div>

          {/* Remove Services Slide-in Panel - services now show in main area */}

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1a2742] rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-[#253a5e] lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto scrollbar-thin scrollbar-thumb-primary-500 scrollbar-track-transparent">

              {/* Mobile: Back to Services + Selected Service Header */}
              {isMobile && selectedService && (
                <div className="mb-4">
                  <button
                    onClick={() => { setMobileView('services'); setSelectedService(null); }}
                    className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline mb-3"
                  >
                    <FiArrowLeft size={16} /> Back to Services
                  </button>
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30">
                    <p className="text-xs text-primary-500 font-semibold mb-0.5">{selectedPlatform?.name} → {selectedCategory?.name}</p>
                    <p className="font-semibold text-sm text-dark-900 dark:text-white leading-tight">{selectedService.name}</p>
                    {selectedService.serviceId && <span className="inline-block mt-1 text-xs font-mono font-bold bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-400 px-2 py-0.5 rounded-lg">#{selectedService.serviceId}</span>}
                  </div>
                </div>
              )}

              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">{isMobile && selectedService ? 'Place Order' : 'Place Order'}</h2>

              {selectedService ? (
                <form onSubmit={handleOrderSubmit} className="space-y-4">
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30" style={{ display: isMobile ? 'none' : '' }}>
                    <p className="text-xs text-primary-500 font-semibold mb-0.5">{selectedPlatform?.name} → {selectedCategory?.name}</p>
                    <p className="font-semibold text-sm text-dark-900 dark:text-white leading-tight">{selectedService.name}</p>
                    {selectedService.serviceId && <span className="inline-block mt-1 text-xs font-mono font-bold bg-dark-200 dark:bg-dark-700 text-dark-600 dark:text-dark-400 px-2 py-0.5 rounded-lg">#{selectedService.serviceId}</span>}
                  </div>

                  {selectedService.description && (
                    <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                      <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 mb-2">Service Description:</p>
                      <div className="text-xs text-dark-700 dark:text-dark-300 whitespace-pre-line leading-relaxed">
                        {selectedService.description}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">Target Link *</label>
                    <input type="url" required placeholder="https://instagram.com/username" value={orderData.link} onChange={(e) => setOrderData({ ...orderData, link: e.target.value })} className="input" />
                  </div>

                  <div>
                    <label className="label">Quantity * (Min: {selectedService.minQuantity} — Max: {selectedService.maxQuantity})</label>
                    <input type="number" required min={selectedService.minQuantity} max={selectedService.maxQuantity} value={orderData.quantity} onChange={(e) => setOrderData({ ...orderData, quantity: e.target.value })} className="input" disabled={selectedService.customCommentsRequired} />
                    {selectedService.customCommentsRequired && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 font-medium">⚠️ Quantity is auto-calculated from number of lines in custom comments below</p>}
                  </div>

                  {selectedService.customCommentsRequired && (
                    <div>
                      <label className="label">Custom Comments * (Each line = 1 quantity)</label>
                      <textarea required rows="5" placeholder="Enter one item per line." value={orderData.comments} onChange={(e) => { const text = e.target.value; const lines = text.split('\n').filter(line => line.trim() !== ''); const lineCount = lines.length || (text.trim() ? 1 : 0); setOrderData({ ...orderData, comments: text, quantity: lineCount.toString() }); }} className="input resize-none font-mono text-sm" />
                      <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">Each line = 1 quantity. Current: <span className="font-bold text-primary-600 dark:text-primary-400">{orderData.quantity || 0} item{orderData.quantity !== '1' ? 's' : ''}</span></p>
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

                  <button type="submit" disabled={orderLoading} className="btn-primary w-full">{orderLoading ? 'Placing Order...' : 'Place Order'}</button>
                  <button type="button" onClick={() => setSelectedService(null)} className="btn-outline w-full text-sm">Clear Selection</button>
                  <Link href="/dashboard/orders" className="btn-outline w-full flex items-center justify-center gap-2 text-sm">View My Orders <FiArrowRight /></Link>
                </form>
              ) : (
                <div className="space-y-4">
                  {instagramGifUrl ? (
                    <div className="rounded-xl overflow-hidden border border-dark-200 dark:border-dark-700">
                      <img src={instagramGifUrl} alt="How to disable Instagram Flag for Review" className="w-full h-auto object-contain" loading="lazy" />
                    </div>
                  ) : (
                    <div className="rounded-xl p-6 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-800/50 text-center">
                      <FiImage className="text-4xl text-yellow-600 dark:text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">Instagram Guide Not Available</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">Admin hasn't uploaded the guide yet</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 p-4 space-y-3 text-xs leading-relaxed text-dark-700 dark:text-dark-300">
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">🚫 Important: Instagram Flag Must Be Off!</p>
                    <p>Starting from 2024-08-18, with Instagram's new update, the <strong>FLAG</strong> function must be turned off to receive followers.</p>
                    <p className="italic">If this option remains enabled, followers will be sent as requests, and you will need to manually approve each one.</p>
                    <div className="border-t border-red-200 dark:border-red-800/40 pt-3">
                      <p className="font-bold text-red-600 dark:text-red-400 mb-1">❗ Important Note:</p>
                      <p>If the Flag function is left <strong>ON</strong>, your account may be treated as Private, and SmmCloud will not be responsible or provide any warranty for the service.</p>
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
                    {!expandedPlatform ? '← Select a platform to get started' :
                     !selectedCategory ? '← Select a category to continue' :
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