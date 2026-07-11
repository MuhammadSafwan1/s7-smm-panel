import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { Toaster } from 'react-hot-toast';
import { Suspense } from 'react';
import './globals.css';

export const metadata = {
  title: 'MSF SMM Panel - Premium Social Media Marketing Services',
  description: 'Professional SMM Panel offering Instagram, Facebook, YouTube, TikTok, Twitter followers, likes, views and more. Affordable prices, instant delivery, 24/7 support.',
  keywords: 'smm panel, social media marketing, instagram followers, youtube views, tiktok likes, facebook followers, twitter engagement, smm services',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<nav className="h-16 md:h-16 bg-transparent" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1 pt-16">
              {children}
            </main>
            <Footer />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  color: '#ffffff',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}