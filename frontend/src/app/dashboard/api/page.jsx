'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FiKey, FiClock, FiCode } from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';

export default function ApiPage() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setLoading(false);
    }
  }, [userProfile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
          API Integration
        </h2>
        <p className="text-dark-500 dark:text-dark-400">
          Integrate our services into your application
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="glass-card p-12">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-3xl gradient-bg flex items-center justify-center">
                <FiCode className="text-6xl text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-16 h-16 rounded-2xl bg-yellow-500 flex items-center justify-center animate-pulse">
                <FiClock className="text-3xl text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h3 className="text-4xl font-bold text-dark-900 dark:text-white">
              Coming Soon
            </h3>
            <p className="text-xl text-dark-600 dark:text-dark-300">
              API Integration System
            </p>
          </div>

          {/* Description */}
          <div className="space-y-4 max-w-xl mx-auto">
            <p className="text-dark-600 dark:text-dark-400 leading-relaxed">
              We're building a powerful API system that will allow you to integrate our SMM services directly into your application or website.
            </p>
            
            {/* Features List */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-500/10 dark:to-secondary-500/10 border border-primary-200 dark:border-primary-500/20">
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-4">
                🚀 What's Coming:
              </p>
              <ul className="space-y-2 text-left text-sm text-dark-700 dark:text-dark-300">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
                  <span>Generate and manage secure API keys</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
                  <span>Access services programmatically via REST API</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
                  <span>Create and track orders automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
                  <span>Check balances and order status in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
                  <span>Complete documentation with code examples</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-100 dark:bg-yellow-500/20 border border-yellow-300 dark:border-yellow-500/30">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Under Development
            </span>
          </div>

          {/* Contact Info */}
          <p className="text-sm text-dark-500 dark:text-dark-400 pt-4">
            Have questions? Contact us through the support ticket system.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <FiKey className="text-2xl text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-dark-900 dark:text-white mb-2">
              Stay Tuned!
            </h4>
            <p className="text-sm text-dark-600 dark:text-dark-400 leading-relaxed">
              We're working hard to bring you a seamless API integration experience. The system will be available soon with full documentation and support for standard SMM panel API format.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
