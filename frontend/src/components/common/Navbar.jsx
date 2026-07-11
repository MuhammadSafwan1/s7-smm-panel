'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { FiMenu, FiX, FiShoppingCart, FiUser, FiLogOut, FiSun, FiMoon, FiPackage, FiSettings } from 'react-icons/fi';
import { logout } from '@/firebase/auth';
import { getCategories } from '@/firebase/firestore';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategoryId = searchParams.get('categoryId');
  const { user, userProfile, isAdmin } = useAuth();
  const { cartCount } = useCart();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Check theme
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(dark);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Fetch categories
    fetchCategories();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await getCategories();
    if (!error && data) {
      setCategories(data);
    }
  };

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    const { error } = await logout();
    if (error) {
      toast.error(error);
    } else {
      toast.success('Logged out successfully');
      setDropdownOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'glass-nav shadow-lg' : 'bg-transparent'
    }`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 md:w-14 rounded-xl sm:rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary-500/50 hover:scale-110 transition-transform">
              <FiPackage className="text-white text-lg sm:text-xl md:text-2xl font-bold" />
            </div>
            <span className="text-xl sm:text-2xl md:text-3xl font-black gradient-text" style={{
              letterSpacing: '0.05em',
              textShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '900',
            }}>
              MSF SMM
            </span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-8 flex-1 justify-center px-4 overflow-x-auto">
            <Link
              href="/"
              className={`relative font-bold transition-all duration-200 text-sm lg:text-base tracking-wider pb-2 whitespace-nowrap ${
                pathname === '/'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-dark-600 dark:text-dark-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              HOME
              {pathname === '/' && (
                <span className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary-500 rounded-full" />
              )}
            </Link>
            <Link
              href="/dashboard"
              className={`relative font-bold transition-all duration-200 text-sm lg:text-base tracking-wider pb-2 whitespace-nowrap ${
                pathname.startsWith('/dashboard')
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-dark-600 dark:text-dark-300 hover:text-primary-600 dark:hover:text-primary-400'
              }`}
            >
              DASHBOARD
              {pathname.startsWith('/dashboard') && (
                <span className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary-500 rounded-full" />
              )}
            </Link>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? <FiSun className="text-base" /> : <FiMoon className="text-base" />}
            </button>

            {/* Auth buttons */}
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                >
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                    {userProfile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  {isAdmin && (
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">Admin</span>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 glass-card p-2 z-20 animate-slide-down">
                      <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-700">
                        <p className="font-semibold text-sm">
                          {userProfile?.displayName || 'User'}
                        </p>
                        <p className="text-xs text-dark-500 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FiUser className="text-dark-400" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/orders"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FiPackage className="text-dark-400" />
                          My Orders
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FiSettings className="text-dark-400" />
                          Settings
                        </Link>
                      </div>
                      <div className="border-t border-dark-200 dark:border-dark-700 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 w-full transition-all"
                        >
                          <FiLogOut />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : !pathname.startsWith('/admin') ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/auth/login" className="btn-secondary btn-xs md:btn-sm">
                  Login
                </Link>
                <Link href="/auth/register" className="btn-primary btn-xs md:btn-sm">
                  Register
                </Link>
              </div>
            ) : null}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-1.5 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
            >
              {isOpen ? <FiX className="text-base" /> : <FiMenu className="text-base" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-dark-200/50 dark:border-dark-700/50 animate-slide-down">
          <div className="px-4 py-4 space-y-2">
            {/* Home Link */}
            <Link
              href="/"
              className={`block px-4 py-3 rounded-xl font-semibold transition-all ${
                pathname === '/'
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800'
              }`}
              onClick={() => setIsOpen(false)}
            >
              HOME
            </Link>
            
            {/* Dashboard Link */}
            <Link
              href="/dashboard"
              className={`block px-4 py-3 rounded-xl font-semibold transition-all ${
                pathname.startsWith('/dashboard')
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800'
              }`}
              onClick={() => setIsOpen(false)}
            >
              DASHBOARD
            </Link>

            <div className="border-t border-dark-200 dark:border-dark-700 pt-2 mt-2">
              {user ? (
                <>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold">
                      {userProfile?.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{userProfile?.displayName || 'User'}</p>
                      <p className="text-xs text-dark-500">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 rounded-xl font-medium text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="block px-4 py-3 rounded-xl font-medium text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                    onClick={() => setIsOpen(false)}
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-3 rounded-xl font-medium text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                    onClick={() => setIsOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : !pathname.startsWith('/admin') ? (
                <div className="flex gap-3 px-4 py-3">
                  <Link
                    href="/auth/login"
                    className="flex-1 btn-secondary btn-sm text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="flex-1 btn-primary btn-sm text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}