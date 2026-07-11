'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { 
  FiArrowRight,
  FiShield, 
  FiZap, 
  FiHeadphones, 
  FiTrendingUp,
  FiDollarSign
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function HomePage() {
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'platforms'), where('isActive', '==', true), orderBy('sortOrder'))
      );
      setPlatforms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading platforms:', error);
      setPlatforms([]);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const features = [
    { icon: FiZap, title: 'Instant Delivery', description: 'Orders start processing immediately after placement. Get results fast.' },
    { icon: FiDollarSign, title: 'Affordable Prices', description: 'Competitive rates for all services. Best value in the market.' },
    { icon: FiShield, title: 'Secure & Safe', description: 'All transactions are encrypted. Your data is protected.' },
    { icon: FiHeadphones, title: '24/7 Support', description: 'Our support team is always available to help you.' },
  ];

  const stats = [
    { value: '50K+', label: 'Happy Customers' },
    { value: '500K+', label: 'Orders Completed' },
    { value: '99.9%', label: 'Success Rate' },
    { value: '24/7', label: 'Support Available' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-90" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        
        <div className="relative container-custom text-center z-10 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Boost Your Social Media
              <br />
              <span className="gradient-text-alt">Growth Today</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-3xl mx-auto">
              Premium SMM Panel with instant delivery. Get followers, likes, views and more for all major platforms.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-600 font-bold text-lg hover:bg-dark-50 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105">
                Get Started <FiArrowRight />
              </Link>
              <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                Create Account
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="glass-card p-6 text-center backdrop-blur-lg"
                >
                  <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Platforms Section — dynamic from Firestore */}
      {(loadingPlatforms || platforms.length > 0) && (
        <section className="py-20 relative">
          <div className="absolute inset-0 gradient-bg-subtle opacity-50" />
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
                  <div key={i} className="glass-card p-8 text-center animate-pulse">
                    <div className="w-16 h-16 rounded-2xl bg-dark-200 dark:bg-dark-700 mx-auto mb-4" />
                    <div className="h-4 bg-dark-200 dark:bg-dark-700 rounded w-2/3 mx-auto mb-2" />
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
                  >
                    <Link
                      href={`/dashboard?platform=${platform.id}`}
                      className="glass-card p-8 text-center hover:scale-105 transition-transform duration-300 block group"
                      style={{ borderTop: `3px solid ${platform.color || '#6366f1'}` }}
                    >
                      {/* Icon */}
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform overflow-hidden"
                        style={{ backgroundColor: platform.color || '#6366f1' }}
                      >
                        {platform.icon ? (
                          <img src={platform.icon} alt={platform.name} className="w-10 h-10 object-contain" />
                        ) : (
                          <span className="text-white font-bold text-2xl">{platform.name[0]}</span>
                        )}
                      </div>

                      <h3 className="font-bold text-xl text-dark-900 dark:text-white mb-2">{platform.name}</h3>
                      {platform.description && (
                        <p className="text-sm text-dark-500 dark:text-dark-400">{platform.description}</p>
                      )}
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <Link href="/dashboard" className="btn-primary btn-lg inline-flex items-center gap-2">
                View All Services <FiArrowRight />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="section-title">
              Why Choose <span className="gradient-text">MSF SMM Panel</span>
            </h2>
            <p className="section-subtitle">The best SMM panel for your social media growth</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="glass-card p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-5">
                  <feature.icon className="text-white text-2xl" />
                </div>
                <h3 className="font-semibold text-lg text-dark-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-dark-500 dark:text-dark-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle opacity-50" />
        <div className="relative container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="section-title">How It <span className="gradient-text">Works</span></h2>
            <p className="section-subtitle">Get started in just 3 simple steps</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '01', title: 'Create Account', description: 'Sign up for free and add funds to your account' },
              { step: '02', title: 'Choose Service', description: 'Select the service and platform you want to boost' },
              { step: '03', title: 'Get Results', description: 'Your order starts instantly and completes quickly' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="glass-card p-8 text-center relative"
              >
                <div className="text-6xl font-bold gradient-text opacity-20 absolute top-4 right-6">{item.step}</div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-xl text-dark-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-dark-500 dark:text-dark-400">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-bg opacity-90" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Grow Your Social Media?</h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust MSF SMM Panel for their social media growth.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-600 font-bold text-lg hover:bg-dark-50 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105">
                Start Now <FiArrowRight />
              </Link>
              <Link href="/auth/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition-all">
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
