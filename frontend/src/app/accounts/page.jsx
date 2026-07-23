'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AccountCard from '@/components/accounts/AccountCard';
import { useAccounts } from '@/hooks/useAccounts';
import { getCategories } from '@/firebase/firestore';
import { Spinner } from '@/components/common/Loader';
import { FiPackage, FiLogIn } from 'react-icons/fi';
import Link from 'next/link';

function AccountsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const categoryId = searchParams.get('categoryId') || undefined;
  const featured = searchParams.get('featured') === 'true' ? true : undefined;
  const [categoryName, setCategoryName] = useState('Accounts');
  
  useEffect(() => {
    if (categoryId) {
      const fetchCategory = async () => {
        const { data } = await getCategories();
        if (data) {
          const category = data.find(cat => cat.id === categoryId);
          if (category) {
            setCategoryName(category.name);
          }
        }
      };
      fetchCategory();
    } else {
      setCategoryName('Accounts');
    }
  }, [categoryId]);
  
  const { accounts, loading } = useAccounts({
    categoryId,
    featured,
  });

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto py-12">
          <div className="w-20 h-20 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center mx-auto mb-6">
            <FiLogIn className="text-4xl text-dark-400" />
          </div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-3">
            Login Required
          </h2>
          <p className="text-dark-500 dark:text-dark-400 mb-8">
            Please login or create an account to browse our accounts.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login" className="btn-primary btn-lg">
              Login
            </Link>
            <Link href="/auth/register" className="btn-outline btn-lg">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase text-dark-900 dark:text-white mb-2">
          {categoryId ? (
            <>
              {categoryName}
            </>
          ) : (
            <>
              Browse <span className="gradient-text">Accounts</span>
            </>
          )}
        </h1>
        <p className="text-dark-500 dark:text-dark-400 text-lg">
          Find the perfect Free Fire account for you
        </p>
      </div>

      {/* Main content - Full width, no sidebar */}
      <div className="w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : accounts.length > 0 ? (
          <>
            <p className="text-sm text-dark-500 dark:text-dark-400 mb-6">
              Showing {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {accounts.map((account, index) => (
                <AccountCard key={account.id} account={account} index={index} categoryId={categoryId} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center mx-auto mb-6">
              <FiPackage className="text-3xl text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
              No accounts found
            </h3>
            <p className="text-dark-500 dark:text-dark-400 mb-6">
              Check back later for new listings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg" /></div>}>
      <AccountsContent />
    </Suspense>
  );
}