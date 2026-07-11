'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/common/Loader';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FiGrid, FiServer, FiPackage, FiUsers, FiLayers, FiShoppingBag, FiArrowLeft, FiHome, FiLogOut } from 'react-icons/fi';
import toast from 'react-hot-toast';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: FiGrid },
  { href: '/admin/providers', label: 'Providers', icon: FiServer },
  { href: '/admin/platforms', label: 'Platforms', icon: FiPackage },
  { href: '/admin/categories', label: 'Categories', icon: FiLayers },
  { href: '/admin/services', label: 'Services', icon: FiShoppingBag },
  { href: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
];

export default function AdminLayout({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = localStorage.getItem('adminAuth');
    const adminUser = localStorage.getItem('adminUser');
    
    if (adminAuth === 'true' && adminUser === 'safwan') {
      setIsAdminAuthenticated(true);
    } else {
      setIsAdminAuthenticated(false);
    }
    setChecking(false);
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminUser');
    toast.success('Admin logged out');
    router.push('/admin/login');
  };

  if (loading || checking) return <PageLoader />;

  // Redirect to admin login if not authenticated
  if (!isAdminAuthenticated && pathname !== '/admin/login') {
    router.push('/admin/login');
    return <PageLoader />;
  }

  // If on login page and already authenticated, redirect to admin dashboard
  if (pathname === '/admin/login' && isAdminAuthenticated) {
    router.push('/admin');
    return <PageLoader />;
  }

  // Don't show layout on login page
  if (pathname === '/admin/login') {
    return children;
  }

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950/50 w-full py-4 md:py-6 lg:py-8 px-4 sm:px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-dark-500 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 mb-2 transition-colors">
            <FiArrowLeft className="text-xs" /> Back to Site
          </Link>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white">Admin Panel</h1>
          <p className="text-sm text-dark-500 dark:text-dark-400">Logged in as: <span className="font-semibold">safwan</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="btn-outline btn-sm flex items-center gap-2">
            <FiHome /> View Site
          </Link>
          <button 
            onClick={handleAdminLogout}
            className="btn-secondary btn-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex overflow-x-auto gap-2 mb-8 pb-2 custom-scrollbar">
        {adminNavItems.map((item) => {
          const isActive = item.href === '/admin' 
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
              }`}
            >
              <item.icon className="text-base" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
