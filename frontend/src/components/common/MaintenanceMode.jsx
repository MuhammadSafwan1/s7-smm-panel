'use client';

import { FiTool } from 'react-icons/fi';
import Link from 'next/link';

export default function MaintenanceMode() {
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
          <p className="text-xl text-dark-600 dark:text-dark-300 mb-8">
            We're currently performing scheduled maintenance to improve your experience. 
            Please check back soon!
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-500/30">
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
          <h3 className="font-bold text-dark-900 dark:text-white mb-3">Need urgent support?</h3>
          <p className="text-sm text-dark-600 dark:text-dark-400 mb-4">
            Contact us for any urgent matters during maintenance.
          </p>
          <Link 
            href="/" 
            className="btn-primary inline-flex items-center gap-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
