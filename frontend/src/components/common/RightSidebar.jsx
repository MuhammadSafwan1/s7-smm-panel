'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FiHome, 
  FiDollarSign, 
  FiPackage, 
  FiZap, 
  FiHelpCircle, 
  FiLifeBuoy,
  FiUser,
  FiCreditCard,
  FiChevronRight,
  FiChevronLeft
} from 'react-icons/fi';

export default function RightSidebar() {
  const pathname = usePathname();
  const { user, is2FAVerified } = useAuth(); // 🔒 Get 2FA verified state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Navigation items
  const navigationItems = [
    { name: 'Home', path: '/', icon: FiHome, emoji: '🏠', color: 'from-blue-400 to-blue-600', show: true },
    { name: 'Dashboard', path: '/dashboard', icon: FiUser, emoji: '📊', color: 'from-purple-400 to-purple-600', show: user && user.emailVerified && is2FAVerified }, // 🔒 Check 2FA
    { name: 'Add Funds', path: '/dashboard/add-funds', icon: FiDollarSign, emoji: '💰', color: 'from-green-400 to-green-600', show: user && user.emailVerified && is2FAVerified }, // 🔒 Check 2FA
    { name: 'Orders', path: '/dashboard/orders', icon: FiPackage, emoji: '📦', color: 'from-orange-400 to-orange-600', show: user && user.emailVerified && is2FAVerified }, // 🔒 Check 2FA
    { name: 'Services', path: '/dashboard/services', icon: FiZap, emoji: '⚡', color: 'from-yellow-400 to-yellow-600', show: user && user.emailVerified && is2FAVerified }, // 🔒 Check 2FA
    { name: 'Transactions', path: '/dashboard/transactions', icon: FiCreditCard, emoji: '💳', color: 'from-pink-400 to-pink-600', show: user && user.emailVerified && is2FAVerified }, // 🔒 Check 2FA
    { name: 'Terms', path: '/policies', icon: FiHelpCircle, emoji: '📋', color: 'from-teal-400 to-teal-600', show: true },
    { name: 'Help', path: '/help', icon: FiLifeBuoy, emoji: '🆘', color: 'from-red-400 to-red-600', show: true }
  ];

  const visibleItems = navigationItems.filter(item => item.show && item.path !== pathname);

  if (visibleItems.length === 0) return null;

  return (
    <>
      <div 
        className={`hidden md:block fixed left-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ${
          isCollapsed ? '-translate-x-[calc(100%-48px)]' : 'translate-x-0'
        }`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white p-2 rounded-r-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          {isCollapsed ? <FiChevronRight className="text-lg" /> : <FiChevronLeft className="text-lg" />}
        </button>

        <div className="glass-card rounded-r-2xl shadow-2xl border-r-4 border-blue-500/50 backdrop-blur-xl">
          <div className="p-3 space-y-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {visibleItems.map((item, index) => {
              const isHovered = hoveredItem === index;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onMouseEnter={() => setHoveredItem(index)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-105 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`} />
                  <div className={`absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b ${item.color} transform translate-x-full group-hover:translate-x-0 transition-transform duration-300`} />
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} shadow-lg transform group-hover:rotate-12 transition-all duration-300`}>
                    <span className="text-2xl">{item.emoji}</span>
                    {isHovered && (
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} animate-ping opacity-50`} />
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="font-semibold text-sm text-dark-700 dark:text-dark-200 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300 whitespace-nowrap">
                      {item.name}
                    </span>
                  )}
                  {!isCollapsed && (
                    <FiChevronRight className={`ml-auto text-dark-400 transition-all duration-300 ${
                      isHovered ? 'translate-x-1 opacity-100' : 'translate-x-0 opacity-0'
                    }`} />
                  )}
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300 -z-10`} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgb(5, 127, 252), rgb(30, 144, 255));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(30, 144, 255), rgb(5, 127, 252));
        }
      `}</style>
    </>
  );
}
