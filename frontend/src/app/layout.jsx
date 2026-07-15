'use client';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { SeasonalBackground } from '@/components/common/SeasonalBackground';
import ThemeToaster from '@/components/common/ThemeToaster';
import SupportButton from '@/components/common/SupportButton';
import AnnouncementPopup from '@/components/common/AnnouncementPopup';
import SourceProtection from '@/components/common/SourceProtection';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import VerifyGate from '@/components/common/VerifyGate';
import './globals.css';

function LayoutContent({ children }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/s7bHG74TY09161NJASKLPW');
  
  return (
    <>
      <SourceProtection />
      <SeasonalBackground />
      {!isAdminPage && (
        <Suspense fallback={<nav className="h-16 md:h-16 bg-transparent" />}>
          <Navbar />
        </Suspense>
      )}
      <main className={isAdminPage ? 'flex-1' : 'flex-1 pt-16'}>
        <VerifyGate required={true}>
          {children}
        </VerifyGate>
      </main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <SupportButton />}
      {!isAdminPage && <AnnouncementPopup />}
      <ThemeToaster />
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="nntcX1cmLS1n1nr0WDcOKmWwusVeITxgkNHkQnFZ2_o" />
        {/* Disable DevTools */}
        <script src="/disable-devtools.js" />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (t === 'dark' || (!t && d)) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <CurrencyProvider>
              <ThemeProvider>
                <LayoutContent>{children}</LayoutContent>
              </ThemeProvider>
            </CurrencyProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}