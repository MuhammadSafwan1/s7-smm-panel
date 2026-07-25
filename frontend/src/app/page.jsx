'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { 
  FiShield, 
  FiZap, 
  FiHeadphones, 
  FiDollarSign,
  FiShoppingBag,
  FiAward,
  FiArrowRight,
  FiUsers,
  FiPackage
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import AdminPhotoModal from '@/components/common/AdminPhotoModal';
import SEOHead from '@/components/common/SEOHead';
import StructuredData from '@/components/common/StructuredData';

function HomePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [topUsers, setTopUsers] = useState([]);
  const [adminSettings, setAdminSettings] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    onlineUsers: 0,
    totalServices: 0
  });
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showAdminPhotoModal, setShowAdminPhotoModal] = useState(false);

  useEffect(() => {
    // Force redirect from .web.app to .com domain
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('web.app') || hostname.includes('firebaseapp.com')) {
        const newUrl = window.location.href
          .replace('msfsmm.web.app', 'msfsmm.com')
          .replace('msfsmm.firebaseapp.com', 'msfsmm.com');
        window.location.replace(newUrl);
        return;
      }
    }

    const referralCode = searchParams.get('ref');
    if (referralCode) {
      localStorage.setItem('pending_referral', referralCode);
    }

    // Title is now handled by SEOHead component dynamically
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = 'MSF SMM Panel - World\'s #1 Most Trusted Premium SMM Panel founded by Muhammad Safwan. Global leader in social media marketing for Instagram followers, Facebook likes, YouTube views, TikTok followers. 50,000+ satisfied customers worldwide. Cheapest rates, instant delivery, 24/7 support, 100% safe & secure.';
    
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = 'MSF SMM, MSF SMM Panel, Muhammad Safwan, m.safwan2006, world best SMM panel, globally trusted SMM, international SMM services, buy Instagram followers, buy Facebook likes, buy YouTube views, buy TikTok followers, cheapest SMM panel worldwide, best SMM panel global, social media marketing, Instagram growth, YouTube promotion, TikTok viral, global SMM services, trusted SMM panel founder Muhammad Safwan';
    
    const ogTags = [
      { property: 'og:title', content: 'MSF SMM Panel - World\'s Best SMM Services by Muhammad Safwan' },
      { property: 'og:description', content: 'World\'s #1 Premium SMM Panel. Buy Instagram, Facebook, YouTube, TikTok services at cheapest rates globally. Founded by Muhammad Safwan.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://msfsmm.com' }
    ];
    
    ogTags.forEach(tag => {
      let metaTag = document.querySelector(`meta[property="${tag.property}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', tag.property);
        document.head.appendChild(metaTag);
      }
      metaTag.content = tag.content;
    });
  }, []);

  useEffect(() => {
    // 🚀 ALWAYS fetch fresh data on page load (no persistent cache)
    console.log('🚀 Page loaded - Fetching fresh data...');
    fetchAllData();
  }, [retryCount]);

  const fetchAllData = async () => {
    console.log('📡 fetchAllData started...');
    setLoading(true);
    try {
      // 🚀 OPTIMIZED: Fetch only necessary data
      
      // 1. Admin settings (1 read)
      console.log('1️⃣ Fetching admin settings...');
      const settingsDocRef = doc(db, 'siteSettings', 'general');
      const settingsSnap = await getDoc(settingsDocRef);
      let adminSettingsData = null;
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        adminSettingsData = {
          adminName: data.adminName || 'MSF SMM PANEL',
          adminDescription: data.adminDescription || '',
          adminPhoto: data.adminPhoto || null
        };
        console.log('✅ Admin settings loaded:', adminSettingsData);
      } else {
        adminSettingsData = {
          adminName: 'MSF SMM PANEL',
          adminDescription: 'Professional SMM Panel Services',
          adminPhoto: null
        };
        console.log('⚠️ No admin settings found, using defaults');
      }

      // 2. Platforms (5-10 reads) - needed for homepage display
      console.log('2️⃣ Fetching platforms...');
      const platformsSnap = await getDocs(
        query(collection(db, 'platforms'), where('isActive', '==', true))
      );
      const platformsData = platformsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      console.log(`✅ Loaded ${platformsData.length} platforms`);
      setPlatforms(platformsData);

      // 3. Stats counter (1 read instead of 100+)
      console.log('3️⃣ Fetching stats counter...');
      const statsDocRef = doc(db, 'stats', 'counters');
      const statsSnap = await getDoc(statsDocRef);
      
      let statsData;
      if (statsSnap.exists()) {
        // Use pre-calculated stats
        const data = statsSnap.data();
        statsData = {
          totalUsers: data.totalUsers || 0,
          totalOrders: data.totalOrders || 0,
          onlineUsers: data.onlineUsers || 0,
          totalServices: data.totalServices || 0
        };
        console.log('✅ Stats loaded from Firestore:', statsData);
      } else {
        // Fallback: If stats doc doesn't exist, use default values
        console.warn('⚠️ Stats counter not found. Run createStatsCounter.js script.');
        statsData = {
          totalUsers: 14,
          totalOrders: 20,
          onlineUsers: 0,
          totalServices: 47
        };
        console.log('⚠️ Using fallback stats:', statsData);
      }
      
      // Set stats state with the loaded data
      setStats(statsData);

      // 4. Top users - Lazy load (optional, can be removed)
      // For now, leaving empty to save reads
      setTopUsers([]);
      
      setAdminSettings(adminSettingsData);
      setDataLoaded(true);
      
      console.log('🎉 All data loaded successfully!');

    } catch (error) {
      console.error('❌ Error loading homepage data:', error);
      setDataLoaded(false);
    } finally {
      setLoading(false);
      setLoadingPlatforms(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
  };

  const features = [
    { icon: FiZap, title: 'Instant Delivery', description: 'Orders start processing immediately after placement. Get results fast.' },
    { icon: FiDollarSign, title: 'Affordable Prices', description: 'Competitive rates for all services. Best value in the market.' },
    { icon: FiShield, title: 'Secure & Safe', description: 'All transactions are encrypted. Your data is protected.' },
    { icon: FiHeadphones, title: '24/7 Support', description: 'Our support team is always available to help you.' },
  ];

  return (
    <div className="min-h-screen">
      {/* SEO Components */}
      <SEOHead />
      <StructuredData />
      
      {!dataLoaded && !loading && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-2xl max-w-sm">
          <h3 className="font-bold mb-2">Data Not Loading</h3>
          <p className="text-sm mb-3">Stats: {JSON.stringify(stats)}</p>
          <button onClick={handleRetry} className="bg-white text-red-500 px-4 py-2 rounded font-bold hover:bg-gray-100">
            Retry Loading Data
          </button>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="relative max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 z-10 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Admin Profile */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              {adminSettings ? (
                <div className="relative bg-white dark:bg-[#1a2742] rounded-3xl p-8 border border-gray-100 dark:border-[#253a5e] shadow-2xl hover:shadow-3xl transition-all duration-300 glow-border glow-border-blue">
                  <div className="relative flex flex-col items-center text-center">
                    {/* Admin Photo */}
                    <div 
                      className="relative mb-6 group cursor-pointer" 
                      onClick={() => setShowAdminPhotoModal(true)}
                    >
                      {adminSettings.adminPhoto ? (
                        <>
                          <img
                            src={adminSettings.adminPhoto}
                            alt={adminSettings.adminName}
                            className="w-40 h-40 rounded-3xl object-cover border-4 border-blue-500 shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 rounded-3xl bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <span className="text-white text-sm font-bold bg-black/60 px-3 py-1 rounded-full">
                              Click to View
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="w-40 h-40 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
                          {adminSettings.adminName?.[0] || 'A'}
                        </div>
                      )}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg">
                        Admin
                      </div>
                    </div>

                    {/* Admin Name */}
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                      {adminSettings.adminName}
                    </h3>

                    {/* Admin Description */}
                    {adminSettings.adminDescription && (
                      <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-md font-medium whitespace-pre-wrap break-words">
                        {adminSettings.adminDescription}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative bg-white dark:bg-[#1a2742] rounded-3xl p-8 border border-gray-100 dark:border-[#253a5e]">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-40 h-40 rounded-3xl bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white text-5xl font-bold animate-pulse mb-6">
                      👤
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Admin Profile</h3>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">Loading admin information...</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right Side: Title + CTA */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2 text-center lg:text-left"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="text-gray-900 dark:text-white">Boost Your </span>
                <span className="text-blue-600 dark:text-blue-400">Social Media</span>
                <br />
                <span className="text-green-500 dark:text-green-400">Growth Today</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 font-medium leading-relaxed">
                <span className="text-blue-600 dark:text-blue-400 font-bold">Premium SMM Panel</span> with instant delivery. Get 
                <span className="text-blue-600 dark:text-blue-400 font-semibold"> followers, likes, views </span>
                and more for all major platforms.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-16">
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/50 transition-all text-lg">
                  Get Started <FiArrowRight />
                </Link>
                {!user && (
                  <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-200 dark:border-[#253a5e] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-[#253a5e]/50 hover:scale-105 transition-all text-lg">
                    Create Account
                  </Link>
                )}
              </div>
            </motion.div>
          </div>

          {/* Stats Grid Below */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 glow-border glow-border-blue"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <FiUsers className="text-white" size={18} />
                </div>
                <p className="text-xs text-gray-400 font-medium">Total Users</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stats.totalUsers.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 glow-border glow-border-blue"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
                  <FiShoppingBag className="text-white" size={18} />
                </div>
                <p className="text-xs text-gray-400 font-medium">Total Orders</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stats.totalOrders.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 glow-border glow-border-blue"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-600/30 relative">
                  <FiUsers className="text-white" size={18} />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">Online Users</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stats.onlineUsers.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300 glow-border glow-border-blue"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <FiPackage className="text-white" size={18} />
                </div>
                <p className="text-xs text-gray-400 font-medium">Total Services</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stats.totalServices.toLocaleString()}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Top 10 Users Section - MOVED BEFORE PLATFORMS */}
      <section className="py-20">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              🏆 Top <span className="text-blue-600 dark:text-blue-400">10 Users</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Our most active customers with highest orders</p>
          </motion.div>

          <div className="max-w-7xl mx-auto">
            {topUsers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {topUsers.map((topUser, index) => (
                  <motion.div
                    key={topUser.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="group bg-white dark:bg-[#1a2742] rounded-2xl p-5 text-center hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-[#253a5e] hover:-translate-y-1 relative glow-border glow-border-blue"
                  >
                    {/* Rank Badge */}
                    <div className={`absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-500 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                      #{index + 1}
                    </div>

                    {/* Profile Picture */}
                    <div className="relative mx-auto mb-3">
                      <div className={`w-20 h-20 rounded-full mx-auto overflow-hidden ring-4 ${
                        index === 0 ? 'ring-yellow-400' :
                        index === 1 ? 'ring-gray-400' :
                        index === 2 ? 'ring-orange-400' :
                        'ring-blue-400'
                      }`}>
                        {topUser.photoURL ? (
                          <img 
                            src={topUser.photoURL} 
                            alt={topUser.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(topUser.name)}&size=200&background=random`;
                            }}
                          />
                        ) : (
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(topUser.name)}&size=200&background=random`}
                            alt={topUser.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      {index < 3 && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-3xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3 px-2 break-words" style={{wordBreak: 'break-word'}}>
                      {topUser.name}
                    </h4>

                    {/* Order Count */}
                    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-100 dark:border-[#253a5e] mb-3">
                      <FiAward className="text-blue-600 dark:text-blue-400" size={14} />
                      <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                        {topUser.orderCount}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">orders</span>
                    </div>

                    <Link 
                      href="/dashboard" 
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20"
                    >
                      View Services <FiArrowRight size={12} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e]">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-6">
                  <span className="text-5xl">👥</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No Top Users Yet</h3>
                <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto mb-6">
                  Be the first to place orders and become a top user! Start ordering now to appear in our leaderboard.
                </p>
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20">
                  Start Ordering <FiArrowRight />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Platforms Section - MOVED AFTER TOP USERS */}
      {(loadingPlatforms || platforms.length > 0) && (
        <section className="py-20 bg-gray-50 dark:bg-dark-900">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                Available <span className="text-blue-600 dark:text-blue-400">Platforms</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400">We support all major social media platforms</p>
            </motion.div>

            {loadingPlatforms ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white dark:bg-[#1a2742] rounded-2xl p-8 text-center animate-pulse border border-gray-100 dark:border-[#253a5e]">
                    <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-[#253a5e] mx-auto mb-4" />
                    <div className="h-5 bg-gray-200 dark:bg-[#253a5e] rounded-xl w-2/3 mx-auto mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-[#253a5e] rounded w-full mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {platforms.map((platform, index) => (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="group bg-white dark:bg-[#1a2742] rounded-2xl p-6 text-center border border-gray-100 dark:border-[#253a5e] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 glow-border glow-border-blue"
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: '#274C75', boxShadow: '0 8px 20px -4px #274C7550' }}>
                      {platform.icon ? (
                        <img src={platform.icon} alt={platform.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <span className="text-white font-bold text-2xl">{platform.name[0]}</span>
                      )}
                    </div>
                    
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                      {platform.name}
                    </h3>
                    {platform.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">
                        {platform.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-600/30 hover:shadow-2xl hover:shadow-blue-600/50 transition-all text-lg">
                View All Services <FiArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Why Choose <span className="text-blue-600 dark:text-blue-400">MSF SMM Panel</span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              The <span className="text-blue-600 dark:text-blue-400 font-bold">best SMM panel</span> for your social media growth
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group bg-white dark:bg-[#1a2742] rounded-2xl p-6 text-center border border-gray-100 dark:border-[#253a5e] hover:shadow-xl transition-all duration-300 hover:-translate-y-1 glow-border glow-border-blue"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-600/30">
                  <feature.icon className="text-white" size={22} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Grow Your 
              <span className="block mt-2 text-yellow-300">Social Media?</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto font-medium leading-relaxed">
              Join <span className="text-yellow-300 font-bold">thousands of satisfied customers</span> who trust MSF SMM Panel for their social media growth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-white text-blue-600 font-bold text-lg hover:bg-yellow-300 hover:text-blue-700 transition-all shadow-2xl hover:shadow-white/50 transform hover:scale-105">
                Start Now <FiArrowRight />
              </Link>
              {!user && (
                <Link href="/auth/login" className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl border-2 border-white/50 bg-white/10 backdrop-blur-sm text-white font-bold text-lg hover:bg-white/20 hover:border-white transition-all shadow-lg hover:scale-105">
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Admin Photo Modal */}
      <AdminPhotoModal 
        isOpen={showAdminPhotoModal} 
        onClose={() => setShowAdminPhotoModal(false)} 
        adminSettings={adminSettings} 
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-[#0f172a] dark:to-[#1a2742]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
