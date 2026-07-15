'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { 
  FiArrowRight,
  FiShield, 
  FiZap, 
  FiHeadphones, 
  FiDollarSign,
  FiUsers,
  FiPackage,
  FiShoppingBag,
  FiAward
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { user } = useAuth();
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

  useEffect(() => {
    // SEO: Update document title and meta tags
    document.title = 'MSF SMM Panel - Best SMM Panel for Social Media Growth | Instagram, Facebook, YouTube, TikTok';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = 'MSF SMM Panel - #1 SMM Panel in Pakistan. Buy Instagram followers, Facebook likes, YouTube views, TikTok followers. Cheapest SMM services with instant delivery. 24/7 support.';
    
    // Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = 'MSF SMM, MSF SMM Panel, SMM panel Pakistan, buy Instagram followers, buy Facebook likes, buy YouTube views, buy TikTok followers, cheapest SMM panel, best SMM panel, social media marketing';
    
    // Add Open Graph tags for social sharing
    const ogTags = [
      { property: 'og:title', content: 'MSF SMM Panel - Best SMM Services' },
      { property: 'og:description', content: 'Buy Instagram, Facebook, YouTube, TikTok services at cheapest rates' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://msfsmm.web.app' }
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
    // Only fetch once on mount, use cached data for 5 minutes
    const lastFetch = localStorage.getItem('homepageLastFetch');
    const cachedData = localStorage.getItem('homepageData');
    const now = Date.now();
    
    if (cachedData && lastFetch && (now - parseInt(lastFetch)) < 5 * 60 * 1000) {
      // Use cached data (less than 5 minutes old) - 0 reads!
      console.log('✅ Using cached data (saves Firestore reads)');
      const parsed = JSON.parse(cachedData);
      setPlatforms(parsed.platforms || []);
      setTopUsers(parsed.topUsers || []);
      setAdminSettings(parsed.adminSettings || null);
      setStats(parsed.stats || {});
      setDataLoaded(true);
      setLoading(false);
      setLoadingPlatforms(false);
    } else {
      // Fetch fresh data
      console.log('🔄 Fetching fresh data from Firestore...');
      fetchAllData();
    }
  }, [retryCount]);

  const fetchAllData = async () => {
    console.log('📡 Fetching all data from Firestore...');
    setLoading(true);
    try {
      // Fetch admin settings from siteSettings/general (1 READ)
      console.log('1️⃣ Fetching admin settings from siteSettings...');
      const settingsDocRef = doc(db, 'siteSettings', 'general');
      const settingsSnap = await getDoc(settingsDocRef);
      let adminSettingsData = null;
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        adminSettingsData = {
          adminName: data.adminName || 'Admin',
          adminDescription: data.adminDescription || '',
          adminPhoto: data.adminPhoto || null
        };
        console.log('✅ Admin settings loaded:', adminSettingsData);
      } else {
        console.log('⚠️ No admin settings found, using defaults');
        adminSettingsData = {
          adminName: 'MSF SMM Admin',
          adminDescription: 'Professional SMM Panel Services',
          adminPhoto: null
        };
      }

      // Fetch platforms (Multiple reads, but sorted client-side)
      console.log('2️⃣ Fetching platforms...');
      const platformsSnap = await getDocs(
        query(collection(db, 'platforms'), where('isActive', '==', true))
      );
      const platformsData = platformsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setPlatforms(platformsData);
      console.log('✅ Platforms loaded:', platformsData.length);

      // Fetch all users (Multiple reads)
      console.log('3️⃣ Fetching users...');
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('✅ Users loaded:', usersData.length);
      
      // Calculate online users (active in last 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const onlineCount = usersData.filter(u => {
        if (!u.lastSeen) return false;
        const lastSeen = u.lastSeen?.toMillis?.() || u.lastSeen?.seconds * 1000 || u.lastSeen;
        return lastSeen > fiveMinutesAgo;
      }).length;
      console.log('✅ Online users (last 5 min):', onlineCount, 'out of', usersData.length);

      // Fetch all orders (Multiple reads)
      console.log('4️⃣ Fetching orders...');
      const ordersSnap = await getDocs(collection(db, 'orders'));
      console.log('✅ Orders loaded:', ordersSnap.docs.length);
      
      // Fetch all services (Multiple reads)
      console.log('5️⃣ Fetching services...');
      const servicesSnap = await getDocs(collection(db, 'services'));
      console.log('✅ Services loaded:', servicesSnap.docs.length);
      
      // Calculate top 5 users by total orders
      console.log('6️⃣ Calculating top users...');
      const userOrderCounts = {};
      ordersSnap.docs.forEach(doc => {
        const order = doc.data();
        if (order.userId) {
          userOrderCounts[order.userId] = (userOrderCounts[order.userId] || 0) + 1;
        }
      });
      
      console.log('👥 Users with orders:', Object.keys(userOrderCounts).length);
      
      const topUsersData = Object.entries(userOrderCounts)
        .map(([userId, orderCount]) => {
          const userData = usersData.find(u => u.id === userId);
          return {
            id: userId,
            name: userData?.displayName || userData?.email?.split('@')[0] || 'User',
            email: userData?.email || '',
            photoURL: userData?.photoURL || null,
            orderCount
          };
        })
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 10); // Changed from 5 to 10

      console.log('🏆 Top 10 users:', topUsersData);
      setTopUsers(topUsersData);
      
      const finalStats = {
        totalUsers: usersData.length,
        totalOrders: ordersSnap.docs.length,
        onlineUsers: onlineCount,
        totalServices: servicesSnap.docs.length
      };
      
      console.log('📊 Final Stats:', finalStats);
      setStats(finalStats);
      setAdminSettings(adminSettingsData);
      setDataLoaded(true);
      
      // Cache ALL data for 5 minutes (including admin settings)
      localStorage.setItem('homepageData', JSON.stringify({
        platforms: platformsData,
        topUsers: topUsersData,
        adminSettings: adminSettingsData,
        stats: finalStats
      }));
      localStorage.setItem('homepageLastFetch', Date.now().toString());
      
      console.log('✅ All data loaded successfully and cached for 5 minutes!');

    } catch (error) {
      console.error('❌ Error loading data:', error);
      console.error('Error details:', error.message);
      setDataLoaded(false);
    } finally {
      setLoading(false);
      setLoadingPlatforms(false);
      console.log('✅ Loading complete!');
    }
  };

  const handleRetry = () => {
    console.log('🔄 Manual retry triggered');
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
    <div className="bg-dark-50 dark:bg-dark-950 min-h-screen">
      {/* Debug Panel - Remove after fixing */}
      {!dataLoaded && !loading && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-2xl max-w-sm">
          <h3 className="font-bold mb-2">⚠️ Data Not Loading</h3>
          <p className="text-sm mb-3">Stats: {JSON.stringify(stats)}</p>
          <button onClick={handleRetry} className="bg-white text-red-500 px-4 py-2 rounded font-bold hover:bg-gray-100">
            Retry Loading Data
          </button>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-dark-50 dark:bg-dark-950">
        <div className="relative container-custom z-10 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Admin Profile */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              {adminSettings ? (
                <div className="relative bg-dark-100 dark:bg-dark-800 rounded-3xl p-8 border-2 border-primary-500 dark:border-primary-600 shadow-2xl shadow-primary-500/20 hover:shadow-primary-500/40 transition-all duration-300">
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/10 to-transparent opacity-50"></div>
                  
                  <div className="relative flex flex-col items-center text-center">
                    {/* Admin Photo */}
                    <div className="relative mb-6 group">
                      {adminSettings.adminPhoto ? (
                        <img
                          src={adminSettings.adminPhoto}
                          alt={adminSettings.adminName}
                          className="w-40 h-40 rounded-3xl object-cover border-4 border-primary-500 dark:border-primary-600 shadow-2xl shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-5xl font-bold shadow-2xl shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300">
                          {adminSettings.adminName?.[0] || 'A'}
                        </div>
                      )}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg animate-pulse">
                        ✨ Admin
                      </div>
                    </div>

                    {/* Admin Name */}
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-primary-500 via-purple-500 to-primary-600 bg-clip-text text-transparent mb-3">
                      {adminSettings.adminName}
                    </h3>

                    {/* Admin Description */}
                    {adminSettings.adminDescription && (
                      <p className="text-dark-700 dark:text-dark-200 text-lg leading-relaxed max-w-md font-medium whitespace-pre-wrap break-words">
                        {adminSettings.adminDescription}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative bg-dark-100 dark:bg-dark-800 rounded-3xl p-8 border-2 border-dark-300 dark:border-dark-700">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-5xl font-bold animate-pulse mb-6">
                      👤
                    </div>
                    <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-3">
                      Admin Profile
                    </h3>
                    <p className="text-dark-600 dark:text-dark-400 text-sm">
                      Loading admin information...
                    </p>
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
                <span className="text-dark-900 dark:text-white">Boost Your </span>
                <span className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Social Media
                </span>
                <br />
                <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 bg-clip-text text-transparent animate-gradient">
                  Growth Today
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-dark-700 dark:text-dark-200 mb-10 font-medium leading-relaxed">
                <span className="bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">
                  Premium SMM Panel
                </span> with instant delivery. Get 
                <span className="text-primary-600 dark:text-primary-400 font-semibold"> followers, likes, views </span>
                and more for all major platforms.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-16">
                <Link href="/dashboard" className="btn-primary btn-lg inline-flex items-center gap-2 shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/50 transition-all">
                  Get Started <FiArrowRight />
                </Link>
                {!user && (
                  <Link href="/auth/register" className="btn-outline btn-lg hover:scale-105 transition-transform">
                    Create Account
                  </Link>
                )}
              </div>
            </motion.div>
          </div>

          {/* Stats Grid Below */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="glass-card p-6 text-center relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300"
            >
              {/* Animated background pulse */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-3 relative group-hover:scale-110 transition-transform duration-300">
                <FiUsers className="text-white text-2xl" />
              </div>
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 relative z-10">
                {loading ? '...' : stats.totalUsers.toLocaleString()}
              </div>
              <div className="text-dark-600 dark:text-dark-400 text-sm relative z-10">Total Users</div>
            </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="glass-card p-6 text-center relative overflow-hidden group hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300"
              >
                {/* Animated background pulse */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3 relative group-hover:scale-110 transition-transform duration-300">
                  <FiShoppingBag className="text-white text-2xl" />
                </div>
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 relative z-10">
                  {loading ? '...' : stats.totalOrders.toLocaleString()}
                </div>
                <div className="text-dark-600 dark:text-dark-400 text-sm relative z-10">Total Orders</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="glass-card p-6 text-center relative overflow-hidden group hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300"
              >
                {/* Animated background pulse */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3 relative">
                  {/* Multiple pulsing rings */}
                  <span className="absolute inline-flex h-full w-full rounded-xl bg-green-400 opacity-75 animate-ping"></span>
                  <span className="absolute inline-flex h-12 w-12 rounded-xl bg-green-500 opacity-50 animate-pulse"></span>
                  
                  {/* Users icon instead of dot */}
                  <FiUsers className="text-white text-2xl relative z-10" />
                  
                  {/* Small blinking indicator */}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-lg"></span>
                  </span>
                </div>
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 relative z-10">
                  {loading ? '...' : stats.onlineUsers.toLocaleString()}
                </div>
                <div className="text-dark-600 dark:text-dark-400 text-sm flex items-center justify-center gap-2 relative z-10">
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Online Users
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="glass-card p-6 text-center relative overflow-hidden group hover:shadow-xl hover:shadow-orange-500/20 transition-all duration-300"
              >
                {/* Animated background pulse */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-3 relative group-hover:scale-110 transition-transform duration-300">
                  <FiPackage className="text-white text-2xl" />
                </div>
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 relative z-10">
                  {loading ? '...' : stats.totalServices.toLocaleString()}
                </div>
                <div className="text-dark-600 dark:text-dark-400 text-sm relative z-10">Total Services</div>
              </motion.div>
            </div>
        </div>
      </section>

      {/* Platforms Section — dynamic from Firestore */}
      {(loadingPlatforms || platforms.length > 0) && (
        <section className="py-20 relative bg-dark-50 dark:bg-dark-950">
          <div className="relative container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="section-title">
                Available <span className="gradient-text">Platforms</span>
              </h2>
              <p className="section-subtitle">We support all major social media platforms</p>
            </motion.div>

            {loadingPlatforms ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-dark-100 dark:bg-dark-800 rounded-3xl p-8 text-center animate-pulse border-2 border-dark-200 dark:border-dark-700">
                    <div className="w-20 h-20 rounded-3xl bg-dark-200 dark:bg-dark-700 mx-auto mb-4" />
                    <div className="h-5 bg-dark-200 dark:bg-dark-700 rounded-xl w-2/3 mx-auto mb-2" />
                    <div className="h-3 bg-dark-200 dark:bg-dark-700 rounded w-full mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {platforms.map((platform, index) => (
                  <motion.div
                    key={platform.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="group relative bg-dark-100 dark:bg-dark-800 rounded-3xl p-8 text-center border-2 border-dark-200 dark:border-dark-700 hover:border-primary-500 dark:hover:border-primary-600 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2"
                  >
                    {/* Glow effect */}
                    <div 
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br"
                      style={{ 
                        backgroundImage: `linear-gradient(135deg, ${platform.color || '#6366f1'}, ${platform.color || '#6366f1'}40)`
                      }}
                    ></div>
                    
                    {/* Glowing border effect */}
                    <div 
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ 
                        boxShadow: `0 0 30px ${platform.color || '#6366f1'}30`
                      }}
                    ></div>

                    {/* Icon with animations */}
                    <div
                      className="relative w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xl mx-auto mb-5"
                      style={{ backgroundColor: platform.color || '#6366f1' }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      
                      {platform.icon ? (
                        <img src={platform.icon} alt={platform.name} className="w-12 h-12 object-contain relative z-10" />
                      ) : (
                        <span className="text-white font-bold text-3xl relative z-10">{platform.name[0]}</span>
                      )}

                      {/* Sparkle effect */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-yellow-300 text-xl animate-pulse">
                        ✨
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-dark-900 dark:text-white text-center relative z-10 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors mb-2">
                      {platform.name}
                    </h3>
                    {platform.description && (
                      <p className="text-sm text-dark-500 dark:text-dark-400 text-center line-clamp-2 relative z-10">
                        {platform.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <Link href="/dashboard" className="btn-primary btn-lg inline-flex items-center gap-2 shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/50 hover:scale-105 transition-all">
                View All Services <FiArrowRight className="group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Top 5 Users Section - Always show with empty state if no users */}
      <section className="py-20 bg-dark-50 dark:bg-dark-950">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="section-title">
              🏆 Top <span className="gradient-text">10 Users</span>
            </h2>
            <p className="section-subtitle">Our most active customers with highest orders</p>
          </motion.div>

          <div className="max-w-7xl mx-auto">
            {topUsers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {topUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="group relative bg-dark-100 dark:bg-dark-800 rounded-3xl p-6 text-center hover:shadow-2xl hover:shadow-primary-500/20 transition-all duration-300 border-2 border-dark-200 dark:border-dark-700 hover:border-primary-500 dark:hover:border-primary-600 hover:-translate-y-2"
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Rank Badge */}
                    <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10 ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white ring-2 ring-yellow-300' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white ring-2 ring-gray-200' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white ring-2 ring-orange-300' :
                      'bg-gradient-to-br from-primary-400 to-primary-600 text-white ring-2 ring-primary-300'
                    }`}>
                      #{index + 1}
                    </div>

                    {/* Profile Picture */}
                    <div className="relative mx-auto mb-4">
                      <div className={`w-28 h-28 rounded-full mx-auto overflow-hidden ring-4 group-hover:ring-8 transition-all duration-300 ${
                        index === 0 ? 'ring-yellow-400 group-hover:ring-yellow-300' :
                        index === 1 ? 'ring-gray-400 group-hover:ring-gray-300' :
                        index === 2 ? 'ring-orange-400 group-hover:ring-orange-300' :
                        'ring-primary-400 group-hover:ring-primary-300'
                      }`}>
                        {user.photoURL ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=200&background=random`;
                            }}
                          />
                        ) : (
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=200&background=random`}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      {/* Medal for top 3 */}
                      {index < 3 && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>

                    {/* User Info - Full Name, No Truncate */}
                    <h4 className="font-bold text-xl text-dark-900 dark:text-white mb-4 px-2 break-words group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors relative z-10" style={{wordBreak: 'break-word'}}>
                      {user.name}
                    </h4>

                    {/* Order Count */}
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 mb-4 relative z-10">
                      <FiAward className="text-primary-500 text-xl" />
                      <span className="font-bold text-2xl bg-gradient-to-r from-primary-500 to-purple-500 bg-clip-text text-transparent">
                        {user.orderCount}
                      </span>
                      <span className="text-sm text-dark-600 dark:text-dark-400">orders</span>
                    </div>

                    {/* View Services Button */}
                    <Link 
                      href="/dashboard" 
                      className="relative z-10 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold text-sm hover:from-primary-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary-500/30 group-hover:scale-105"
                    >
                      View Services
                      <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-dark-200 to-dark-300 dark:from-dark-700 dark:to-dark-800 flex items-center justify-center mx-auto mb-6">
                  <span className="text-6xl">👥</span>
                </div>
                <h3 className="text-2xl font-bold text-dark-900 dark:text-white mb-3">
                  No Top Users Yet
                </h3>
                <p className="text-dark-600 dark:text-dark-400 max-w-md mx-auto">
                  Be the first to place orders and become a top user! 
                  Start ordering now to appear in our leaderboard.
                </p>
                <Link href="/dashboard" className="btn-primary mt-6 inline-flex items-center gap-2">
                  Start Ordering <FiArrowRight />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-50 dark:bg-dark-950">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-dark-900 dark:text-white">Why Choose </span>
              <span className="bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                MSF SMM Panel
              </span>
            </h2>
            <p className="text-xl text-dark-600 dark:text-dark-300 font-medium">
              The <span className="text-primary-600 dark:text-primary-400 font-bold">best SMM panel</span> for your social media growth
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group relative bg-dark-100 dark:bg-dark-800 rounded-2xl p-8 text-center border border-dark-200 dark:border-dark-700 hover:border-primary-500 dark:hover:border-primary-600 transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/20 hover:-translate-y-2"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-primary-500/30">
                    <feature.icon className="text-white text-2xl" />
                  </div>
                  <h3 className="font-bold text-xl text-dark-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-dark-600 dark:text-dark-300 text-sm leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-primary-600 via-purple-600 to-primary-800 dark:from-primary-700 dark:via-purple-700 dark:to-primary-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Grow Your 
              <span className="block mt-2 text-yellow-300 animate-pulse">Social Media?</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/95 mb-10 max-w-3xl mx-auto font-medium leading-relaxed">
              Join <span className="text-yellow-300 font-bold">thousands of satisfied customers</span> who trust MSF SMM Panel for their social media growth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-white text-primary-600 font-bold text-lg hover:bg-yellow-300 hover:text-primary-700 transition-all shadow-2xl hover:shadow-white/50 transform hover:scale-110">
                Start Now 
                <FiArrowRight className="group-hover:translate-x-2 transition-transform" />
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
    </div>
  );
}
