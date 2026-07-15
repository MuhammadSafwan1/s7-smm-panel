'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs } from 'firebase/firestore';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { FiArrowLeft, FiFileText } from 'react-icons/fi';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPolicies(); }, []);

  const fetchPolicies = async () => {
    try {
      const snap = await getDocs(collection(db, 'policies'));
      const policiesList = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.isActive);
      setPolicies(policiesList);
      
      // Auto-select first policy
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
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-sm text-dark-500 hover:text-primary-500 flex items-center gap-1 mb-6">
            <FiArrowLeft /> Back to Home
          </Link>
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4">📜</div>
            <p className="text-dark-500 font-semibold text-lg">No Policies Available</p>
            <p className="text-dark-400 text-sm mt-1">Policies will be displayed here once added by admin</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-lg transition-colors">
            <FiArrowLeft className="text-lg text-dark-600 dark:text-dark-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white">Policies</h1>
            <p className="text-dark-500 dark:text-dark-400 text-sm mt-1">Read our terms and policies</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Policy List */}
          <div className="lg:col-span-1">
            <div className="glass-card p-4 sticky top-24">
              <h3 className="font-bold text-dark-900 dark:text-white mb-3 text-sm uppercase tracking-wide">
                Select Policy
              </h3>
              <div className="space-y-2">
                {policies.map((policy) => (
                  <button
                    key={policy.id}
                    onClick={() => setSelectedPolicy(policy)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-2 ${
                      selectedPolicy?.id === policy.id
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-dark-50 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <FiFileText className="flex-shrink-0" />
                    <span className="text-sm font-medium">{policy.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedPolicy && (
              <div className="glass-card p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
                  {selectedPolicy.title}
                </h2>
                <p className="text-xs text-dark-400 mb-6">
                  Last updated: {selectedPolicy.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-dark-700 dark:text-dark-300 whitespace-pre-wrap leading-relaxed">
                    {selectedPolicy.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
