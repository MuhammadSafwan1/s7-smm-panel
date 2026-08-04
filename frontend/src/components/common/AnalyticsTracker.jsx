'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/lib/analytics';

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      // Extract page title from pathname
      const pageTitles = {
        '/': 'Home',
        '/dashboard': 'Dashboard',
        '/dashboard/orders': 'My Orders',
        '/dashboard/services': 'Services',
        '/dashboard/add-funds': 'Add Funds',
        '/dashboard/add-funds/payment': 'Payment',
        '/dashboard/transactions': 'Transactions',
        '/dashboard/api': 'API',
        '/dashboard/api-docs': 'API Documentation',
        '/dashboard/settings': 'Settings',
        '/auth/login': 'Login',
        '/auth/register': 'Register',
        '/auth/forgot-password': 'Forgot Password',
        '/help': 'Help',
        '/policies': 'Policies',
      };

      const pageTitle = pageTitles[pathname] || pathname.split('/').pop() || 'Unknown Page';
      
      // Log page view
      logPageView(`MSF SMM - ${pageTitle}`, pathname);
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
