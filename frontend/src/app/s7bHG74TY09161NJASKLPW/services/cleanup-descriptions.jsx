"use client";

import { useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function CleanupDescriptions() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const HARDCODED_TEXT = '🚫 Important: Instagram Flag Must Be Off!';

  const handleCleanup = async () => {
    if (!confirm('This will remove hardcoded Instagram Flag descriptions from all services. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('🔍 Fetching all services...');
      const servicesSnap = await getDocs(collection(db, 'services'));
      
      if (servicesSnap.empty) {
        toast.error('No services found');
        setLoading(false);
        return;
      }

      console.log(`📦 Found ${servicesSnap.size} services`);

      let updatedCount = 0;
      const updates = [];

      servicesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const description = data.description || '';

        // Check if this service has the hardcoded Instagram Flag description
        if (description.includes(HARDCODED_TEXT)) {
          console.log(`🔧 Will update: ${docSnap.id} - ${data.name}`);
          updates.push({
            id: docSnap.id,
            name: data.name,
            ref: doc(db, 'services', docSnap.id)
          });
          updatedCount++;
        }
      });

      if (updatedCount === 0) {
        toast.success('No hardcoded descriptions found. All clean!');
        setResult({ total: servicesSnap.size, updated: 0 });
        setLoading(false);
        return;
      }

      console.log(`⏳ Updating ${updatedCount} service(s)...`);

      // Update each service
      for (const update of updates) {
        await updateDoc(update.ref, {
          description: '',
          updatedAt: Timestamp.now()
        });
      }

      toast.success(`Successfully cleaned ${updatedCount} service descriptions!`);
      setResult({ 
        total: servicesSnap.size, 
        updated: updatedCount,
        services: updates.map(u => u.name)
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white mb-4">
            Cleanup Service Descriptions
          </h1>
          <p className="text-dark-600 dark:text-dark-400 mb-6">
            This tool will remove hardcoded Instagram Flag descriptions from all services in your database.
          </p>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Warning:</strong> This will set the description field to empty for all services that contain the hardcoded Instagram Flag text. You can add custom descriptions later from the Services page.
            </p>
          </div>

          <button
            onClick={handleCleanup}
            disabled={loading}
            className="btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Cleaning up...' : 'Remove Hardcoded Descriptions'}
          </button>

          {result && (
            <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-900 dark:text-green-100 mb-2">
                ✅ Cleanup Complete!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                Scanned {result.total} services, updated {result.updated} services
              </p>
              {result.updated > 0 && result.services && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Updated services:</p>
                  <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                    {result.services.map((name, idx) => (
                      <li key={idx}>• {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
