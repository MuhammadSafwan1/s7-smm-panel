'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FiMenu, FiXCircle, FiLogOut, FiSun, FiMoon, FiPackage, FiSettings, FiCode } from 'react-icons/fi';
import { logout } from '@/firebase/auth';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import CurrencySwitcher from './CurrencySwitcher';
import AnnouncementBell from './AnnouncementBell';

// Animated Text Component - Letter by Letter
function AnimatedText({ text }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let charIndex = 0;
    let isDeleting = false;

    const animate = () => {
      if (!isDeleting) {
        // Typing letter by letter
        if (charIndex < text.length) {
          setDisplayText(text.substring(0, charIndex + 1));
          charIndex++;
          setTimeout(animate, 250); // 250ms delay between letters
        } else {
          // Wait 3 seconds before starting to delete
          setTimeout(() => {
            isDeleting = true;
            animate();
          }, 3000);
        }
      } else {
        // Deleting letter by letter
        if (charIndex > 0) {
          charIndex--;
          setDisplayText(text.substring(0, charIndex));
          setTimeout(animate, 250); // 250ms delay between letter deletions
        } else {
          // Start typing again
          isDeleting = false;
          animate();
        }
      }
    };

    animate();
  }, [text]);

  return <span>{displayText}</span>;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [siteLogo, setSiteLogo] = useState('');
  const pathname = usePathname();
  const { user, userProfile, isAdmin, is2FAVerified } = useAuth(); // 🔒 Get 2FA verified state

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Check theme
    const stored = localStorage.getItem('theme');
    const dark = stored === 'dark';
    setIsDark(dark);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Fetch site logo
    fetchSiteLogo();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const fetchSiteLogo = async () => {
    try {
      // Use sessionStorage (clears on tab close automatically)
      const cachedData = sessionStorage.getItem('siteLogo_cache');
      if (cachedData) {
        const { logo } = JSON.parse(cachedData);
        console.log('📦 Using cached site logo from sessionStorage');
        setSiteLogo(logo);
        updateFavicon(logo);
        return;
      }

      // Fetch from Firestore on first load or after refresh
      const docRef = doc(db, 'siteSettings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().siteLogo) {
        const logo = docSnap.data().siteLogo;
        setSiteLogo(logo);
        updateFavicon(logo);
        // Store in sessionStorage (no expiry, clears on tab close)
        sessionStorage.setItem('siteLogo_cache', JSON.stringify({ logo }));
        console.log('✅ Site logo fetched and cached in sessionStorage');
      }
    } catch (error) {
      console.error('Error fetching site logo:', error);
    }
  };

  const updateFavicon = (logoUrl) => {
    if (!logoUrl) return;
    
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = logoUrl;
    document.head.appendChild(link);
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
          <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group hover:opacity-90 transition-opacity flex-shrink-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] rounded-full flex items-center justify-center hover:scale-110 transition-transform overflow-hidden" style={{
              minWidth: '32px',
              minHeight: '32px'
            }}>
              {siteLogo ? (
                <img 
                  src={siteLogo} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full rounded-full gradient-bg flex items-center justify-center">
                  <FiPackage className="text-white text-2xl font-bold" />
                </div>
              )}
            </div>
            
            <span className="text-base sm:text-xl md:text-3xl font-black inline-block" style={{
              minWidth: 'clamp(90px, 20vw, 200px)',
              color: '#17599F',
              letterSpacing: '0.05em',
              textShadow: '0 0 15px rgba(23, 89, 159, 0.5), 0 0 30px rgba(23, 89, 159, 0.3)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: '900',
              WebkitTextStroke: '3px #0a1929',
              textStroke: '3px #0a1929',
              paintOrder: 'stroke fill',
              filter: 'brightness(1.3)',
            }}>
              <AnimatedText text="MSF SMM" />
            </span>
          </Link>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-1 justify-center px-4 overflow-x-auto">
            {pathname !== '/' && (
              <Link
                href="/"
                className="relative font-bold transition-all duration-200 text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800"
              >
                🏠 HOME
              </Link>
            )}
            
            {/* Only show dashboard links if user is logged in AND email is verified AND 2FA is verified */}
            {user && user.emailVerified && is2FAVerified ? (
              <>
                {pathname !== '/dashboard' && (
                  <Link
                    href="/dashboard"
                    className="relative font-bold transition-all duration-200 text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800"
                  >
                    📊 DASHBOARD
                  </Link>
                )}
                
                {!pathname.startsWith('/dashboard/add-funds') && (
                  <Link
                    href="/dashboard/add-funds"
                    className="font-bold text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center gap-1"
                  >
                    💰 ADD FUNDS
                  </Link>
                )}
                
                {pathname !== '/dashboard/orders' && (
                  <Link
                    href="/dashboard/orders"
                    className="font-bold text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center gap-1"
                  >
                    📦 ORDERS
                  </Link>
                )}
                
                {pathname !== '/dashboard/services' && (
                  <Link
                    href="/dashboard/services"
                    className="font-bold text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center gap-1"
                  >
                    ⚡ SERVICES
                  </Link>
                )}
                
                {pathname !== '/dashboard/transactions' && (
                  <Link
                    href="/dashboard/transactions"
                    className="font-bold text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center gap-1"
                  >
                    💳 TRANSACTIONS
                  </Link>
                )}
              </>
            ) : null}
            
            {/* Always show Terms and Help */}
            {pathname !== '/policies' && (
              <Link
                href="/policies"
                className="font-bold text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center gap-1"
              >
                📋 TERMS
              </Link>
            )}
            
            {pathname !== '/help' && (
              <Link
                href="/help"
                className="font-bold text-xs lg:text-sm tracking-wider px-3 lg:px-4 py-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all flex items-center gap-1"
              >
                🆘 HELP
              </Link>
            )}
          </div>

          {/* Right section - Show based on 2FA verification status */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {/* Currency Switcher - Show only for 2FA verified users */}
            {user && user.emailVerified && is2FAVerified && (
              <CurrencySwitcher />
            )}

            {/* Announcement Bell - Show only for 2FA verified users */}
            {user && user.emailVerified && is2FAVerified && (
              <AnnouncementBell />
            )}

            {/* Theme Toggle - Always show */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
              aria-label="Toggle theme"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <FiSun className="text-base sm:text-lg text-yellow-400" /> : <FiMoon className="text-base sm:text-lg text-blue-500" />}
            </button>

            {/* User Profile - Show only for 2FA verified users */}
            {user && is2FAVerified ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-2 ring-primary-500/30">
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt={userProfile.displayName || 'User'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || user.email || 'User')}&size=100&background=random`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                        {userProfile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <span className="hidden sm:inline-block text-xs font-semibold text-primary-600 dark:text-primary-400">Admin</span>
                  )}
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 glass-card rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 z-20 animate-slide-down max-h-[85vh] overflow-y-auto flex flex-col">
                      <div className="sticky top-0 z-30 bg-white dark:bg-dark-900 rounded-t-2xl px-2 py-2 border-b border-dark-200 dark:border-dark-700 flex justify-end">
                        <button
                          onClick={() => setDropdownOpen(false)}
                          className="p-2 rounded-lg bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 transition-all shadow-sm"
                          aria-label="Close menu"
                        >
                          <FiXCircle className="text-lg text-dark-600 dark:text-dark-300" />
                        </button>
                      </div>
                      
                      <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-700 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary-500/30 flex-shrink-0">
                          {userProfile?.photoURL ? (
                            <img
                              src={userProfile.photoURL}
                              alt={userProfile.displayName || 'User'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || user.email || 'User')}&size=100&background=random`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full gradient-bg flex items-center justify-center text-white text-lg font-bold">
                              {userProfile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {userProfile?.displayName || 'User'}
                          </p>
                          <p className="text-xs text-dark-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="py-2 px-2 flex-1 overflow-y-auto">
                        <Link
                          href="/dashboard/api"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <FiCode className="text-dark-400" />
                          API
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
                      
                      <div className="sticky bottom-0 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-700 p-2 rounded-b-2xl">
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
            ) : !user || !is2FAVerified ? (
              !pathname.startsWith('/admin') ? (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="btn-secondary btn-xs md:btn-sm">
                    Login
                  </Link>
                  <Link href="/auth/register" className="btn-primary btn-xs md:btn-sm">
                    Register
                  </Link>
                </div>
              ) : null
            ) : null}

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-1.5 rounded-lg text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
            >
              {isOpen ? <FiXCircle className="text-base" /> : <FiMenu className="text-base" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-dark-200/50 dark:border-dark-700/50 animate-slide-down max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-4 space-y-2">
            {/* Close button at top */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 transition-all"
                aria-label="Close menu"
              >
                <FiXCircle className="text-lg text-dark-600 dark:text-dark-300" />
              </button>
            </div>
            <Link
              href="/"
              className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
              onClick={() => setIsOpen(false)}
            >
              🏠 HOME
            </Link>
            
            {/* Only show dashboard links if user is logged in AND email is verified AND 2FA is verified */}
            {user && user.emailVerified && is2FAVerified && (
              <>
                <Link
                  href="/dashboard"
                  className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  📊 DASHBOARD
                </Link>
                <Link
                  href="/dashboard/add-funds"
                  className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  💰 ADD FUNDS
                </Link>
                <Link
                  href="/dashboard/orders"
                  className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  📦 ORDERS
                </Link>
                <Link
                  href="/dashboard/services"
                  className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  ⚡ SERVICES
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                  onClick={() => setIsOpen(false)}
                >
                  💳 TRANSACTIONS
                </Link>
              </>
            )}
            
            {/* Always show Terms and Help */}
            <Link
              href="/policies"
              className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
              onClick={() => setIsOpen(false)}
            >
              📋 TERMS
            </Link>
            <Link
              href="/help"
              className="block px-4 py-3 rounded-xl font-semibold text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
              onClick={() => setIsOpen(false)}
            >
              🆘 HELP
            </Link>

            <div className="border-t border-dark-200 dark:border-dark-700 pt-2 mt-2">
              {user && is2FAVerified ? (
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
                  <button
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : !user || !is2FAVerified ? (
                !pathname.startsWith('/admin') ? (
                  <div className="flex gap-2 sm:gap-3 px-4 py-3">
                    <Link
                      href="/auth/login"
                      className="flex-1 btn-secondary btn-xs sm:btn-sm text-center"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="flex-1 btn-primary btn-xs sm:btn-sm text-center"
                      onClick={() => setIsOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                ) : null
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
