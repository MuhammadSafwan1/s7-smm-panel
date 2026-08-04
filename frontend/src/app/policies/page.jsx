'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { cachedQuery } from '@/lib/cache';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiFileText, FiHelpCircle, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    try {
      const policiesList = await cachedQuery('policies:list', async () => {
        const snap = await getDocs(collection(db, 'policies'));
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.isActive);
      });
      setPolicies(policiesList);
      if (policiesList.length > 0 && !selectedPolicy) {
        setSelectedPolicy(policiesList[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  if (policies.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-sm text-dark-500 hover:text-primary-500 flex items-center gap-1 mb-6 transition-colors">
            <FiArrowLeft /> Back to Home
          </Link>
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-500/10 dark:to-secondary-500/10 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/10">
              <FiHelpCircle className="text-4xl text-primary-500" />
            </div>
            <p className="text-dark-700 dark:text-white font-bold text-xl mb-2">No Terms Available</p>
            <p className="text-dark-400 text-sm">Terms of Service will appear here once added by admin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <Link href="/" className="p-2.5 rounded-xl glass-card hover:shadow-lg transition-all hover:scale-105 active:scale-95">
            <FiArrowLeft className="text-lg text-dark-500 dark:text-dark-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold gradient-text">Terms of Service</h1>
            <p className="text-dark-500 dark:text-dark-400 text-sm mt-0.5">Terms & Conditions</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 xl:grid-cols-6 gap-6" style={{ minHeight: 'calc(100vh - 160px)' }}>
          {/* Sidebar - Policy List */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 xl:col-span-1"
          >
            <div className="glass-card p-3 sm:p-4 h-full flex flex-col lg:sticky lg:top-24 max-h-[calc(100vh-120px)]">
              <div className="px-3 py-2 mb-3">
                <h3 className="font-bold text-dark-700 dark:text-white text-xs uppercase tracking-widest">
                  Select Question
                </h3>
                <div className="w-10 h-1 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 mt-2"></div>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 custom-scrollbar pr-2">
                {policies.map((policy, index) => (
                  <motion.button
                    key={policy.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                    onClick={() => setSelectedPolicy(policy)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-all flex flex-col gap-2 group ${
                      selectedPolicy?.id === policy.id
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 scale-[1.02]'
                        : 'hover:bg-primary-50 dark:hover:bg-dark-700/50 text-dark-600 dark:text-dark-300 border border-transparent hover:border-primary-100 dark:hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedPolicy?.id === policy.id
                          ? 'bg-white/20'
                          : 'bg-primary-50 dark:bg-primary-500/10'
                      }`}>
                        <FiFileText className={`text-sm ${
                          selectedPolicy?.id === policy.id ? 'text-white' : 'text-primary-500'
                        }`} />
                      </div>
                      <FiChevronDown className={`flex-shrink-0 w-4 h-4 transition-transform ml-auto ${
                        selectedPolicy?.id === policy.id ? 'text-white rotate-0' : 'text-dark-300 dark:text-dark-500 -rotate-90'
                      }`} />
                    </div>
                    <span className="text-xs font-medium leading-relaxed break-words">{policy.title}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 xl:col-span-5"
          >
            <AnimatePresence mode="wait">
              {selectedPolicy && (
                <motion.div
                  key={selectedPolicy.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card overflow-hidden"
                >
                  {/* Content Header */}
                  <div className="relative px-4 sm:px-8 py-4 sm:py-6 border-b border-dark-100 dark:border-dark-700/50">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-secondary-500/5"></div>
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                          <FiHelpCircle className="text-white text-sm sm:text-lg" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-2xl font-bold text-dark-900 dark:text-white">
                            {selectedPolicy.title}
                          </h2>
                          <p className="text-[10px] sm:text-xs text-dark-400 dark:text-dark-500 mt-0.5">
                            Last updated: {selectedPolicy.updatedAt?.toDate?.()?.toLocaleDateString('en-US', { 
                              year: 'numeric', month: 'long', day: 'numeric' 
                            }) || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Body */}
                  <div className="p-4 sm:p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <div className="text-dark-600 dark:text-dark-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-[15px]">
                        {selectedPolicy.content}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
