'use client';

import Link from 'next/link';
import { FiArrowRight, FiShield, FiZap, FiTrendingUp } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export default function HeroSection() {
  const { user } = useAuth();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute inset-0 gradient-bg-subtle" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary-500/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-500/20 rounded-full blur-[128px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[128px]" />

      <div className="relative container-custom w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl m
          x-auto text-center"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-600 dark:text-primary-400 text-sm font-medium">
              <FiTrendingUp className="text-primary-500" />
              Trusted by 50,000+ Customers
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
          >
            Grow Your{' '}
            <span className="gradient-text">Social Media</span>
            <br />
            Like Never Before
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-dark-500 dark:text-dark-400 mb-10 max-w-2xl mx-auto"
          >
            Premium SMM Panel with instant delivery. Get followers, likes, views, and engagement 
            for Instagram, YouTube, Facebook, Twitter and more. Affordable prices, 24/7 support.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary btn-lg group">
              Browse Services
              <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!user && (
              <Link href="/auth/register" className="btn-outline btn-lg">
                Get Started Free
              </Link>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={itemVariants}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { icon: FiZap, label: 'Instant Start', value: '< 1 Minute' },
              { icon: FiShield, label: 'Secure & Safe', value: '100% Safe' },
              { icon: FiTrendingUp, label: 'Success Rate', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-6 text-center">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="text-white text-xl" />
                </div>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Supported Platforms */}
          <motion.div 
            variants={itemVariants}
            className="mt-12 flex items-center justify-center gap-6 flex-wrap"
          >
            <p className="text-sm text-dark-500 dark:text-dark-400">Supporting All Major Social Media Platforms</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-dark-950 to-transparent" />
    </section>
  );
}