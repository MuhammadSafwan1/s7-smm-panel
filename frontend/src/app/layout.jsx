'use client';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { SeasonalBackground } from '@/components/common/SeasonalBackground';
import { cachedQuery } from '@/lib/cache';
import ThemeToaster from '@/components/common/ThemeToaster';
import SupportButton from '@/components/common/SupportButton';
import WhatsAppButton from '@/components/common/WhatsAppButton';
import AnnouncementPopup from '@/components/common/AnnouncementPopup';
import BanCheck from '@/components/common/BanCheck';
import RightSidebar from '@/components/common/RightSidebar';
import { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import VerifyGate from '@/components/common/VerifyGate';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import './globals.css';

function LayoutContent({ children }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/s7bHG74TY09161NJASKLPW');
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  // Fetch and set dynamic favicon & OG image
  useEffect(() => {
    const fetchSiteLogo = async () => {
      try {
        const docSnap = await cachedQuery('siteSettings:general', () => getDoc(doc(db, 'siteSettings', 'general')), 300000);
        if (docSnap.exists() && docSnap.data().siteLogo) {
          const logoUrl = docSnap.data().siteLogo;
          
          // Update favicon
          const faviconLink = document.querySelector("link[rel*='icon']") || document.createElement('link');
          faviconLink.type = 'image/x-icon';
          faviconLink.rel = 'shortcut icon';
          faviconLink.href = logoUrl;
          document.head.appendChild(faviconLink);
          
          // Update OG image to use admin's logo
          let ogImageMeta = document.querySelector('meta[property="og:image"]');
          if (ogImageMeta) {
            ogImageMeta.setAttribute('content', logoUrl);
          }
          
          // Update Twitter image to use admin's logo
          let twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
          if (twitterImageMeta) {
            twitterImageMeta.setAttribute('content', logoUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching site logo for favicon:', error);
      }
    };

    fetchSiteLogo();
  }, []);

  useEffect(() => {
    // Check if user is verified (use localStorage for persistence across tabs)
    const verified = localStorage.getItem('cf_verified') || sessionStorage.getItem('cf_verified');
    const verifiedAt = localStorage.getItem('cf_verified_at') || sessionStorage.getItem('cf_verified_at');
    
    if (verified === 'true' && verifiedAt) {
      const elapsed = Date.now() - parseInt(verifiedAt);
      if (elapsed < 30 * 60 * 1000) { // 30 minutes
        setIsVerified(true);
        // Sync to both storages
        localStorage.setItem('cf_verified', 'true');
        localStorage.setItem('cf_verified_at', verifiedAt);
        sessionStorage.setItem('cf_verified', 'true');
        sessionStorage.setItem('cf_verified_at', verifiedAt);
      }
    }
    setCheckingVerification(false);
  }, []);

  // Listen for verification changes
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const verified = localStorage.getItem('cf_verified') || sessionStorage.getItem('cf_verified');
      const verifiedAt = localStorage.getItem('cf_verified_at') || sessionStorage.getItem('cf_verified_at');
      
      if (verified === 'true' && verifiedAt) {
        const elapsed = Date.now() - parseInt(verifiedAt);
        if (elapsed < 30 * 60 * 1000) {
          if (!isVerified) {
            setIsVerified(true);
          }
        } else {
          // Clear expired verification
          localStorage.removeItem('cf_verified');
          localStorage.removeItem('cf_verified_at');
          sessionStorage.removeItem('cf_verified');
          sessionStorage.removeItem('cf_verified_at');
          if (isVerified) {
            setIsVerified(false);
          }
        }
      } else {
        if (isVerified) {
          setIsVerified(false);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isVerified]);
  
  return (
    <>
      <SeasonalBackground />
      {/* Show Navbar if verified OR on admin page OR always (removed verification requirement) */}
      {!isAdminPage && (
        <Suspense fallback={<nav className="h-16 md:h-16 bg-transparent" />}>
          <Navbar />
        </Suspense>
      )}
      <main className={isAdminPage ? 'flex-1' : 'flex-1 pt-16'}>
        <BanCheck>
          <VerifyGate required={true}>
            {children}
          </VerifyGate>
        </BanCheck>
      </main>
      {/* Show Right Sidebar on all pages except home and admin */}
      {!isAdminPage && pathname !== '/' && <RightSidebar />}
      {/* Show Footer, Support Button, WhatsApp Button and Announcement if not admin page */}
      {!isAdminPage && <Footer />}
      {!isAdminPage && <SupportButton />}
      {!isAdminPage && <WhatsAppButton />}
      {!isAdminPage && <AnnouncementPopup />}
      <ThemeToaster />
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Viewport & Basic Meta */}
        <meta name="viewport" content="width=device-width, initial-scale=1.1, minimum-scale=1.0, maximum-scale=5.0" />
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo192.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Primary SEO Meta Tags */}
        <title>MSF SMM</title>
        <meta name="title" content="MSF SMM" />
        <meta name="description" content="MSF SMM Panel - 100% Trusted & Secure Premium SMM Panel for social media marketing. Boost your Instagram, YouTube, Facebook, Twitter followers, likes, views with instant delivery and 24/7 professional support. Pakistan's #1 verified SMM service provider with 10,000+ satisfied customers. Safe, reliable, and affordable." />
        <meta name="keywords" content="MSF SMM, MSF SMM Panel, m.safwan2006, best SMM panel, cheapest SMM panel, world best SMM panel, top SMM panel, SMM panel Pakistan, Pakistan SMM panel, Indian SMM panel, SMM panel India, USA SMM panel, UK SMM panel, buy Instagram followers, buy Instagram likes, buy Instagram views, buy Instagram comments, Instagram growth service, Instagram followers Pakistan, Instagram followers India, buy Facebook likes, buy Facebook followers, Facebook page likes, buy YouTube views, buy YouTube subscribers, YouTube promotion, YouTube views Pakistan, buy TikTok followers, buy TikTok likes, TikTok views, TikTok growth, buy Twitter followers, buy Twitter retweets, social media marketing, social media services, SMM services, Instagram marketing, Facebook marketing, YouTube marketing, TikTok marketing, cheapest social media services, cheap SMM panel, affordable SMM panel, instant delivery SMM, fast delivery SMM, instant followers, instant likes, real followers, real likes, high quality followers, active followers, Pakistani SMM panel, SMM reseller panel, SMM wholesale panel, bulk SMM services, SMM API, reseller SMM panel, wholesale SMM services, SMM panel with API, cheapest reseller panel, best reseller panel, affordable social media marketing, social media growth, grow Instagram, grow TikTok, grow YouTube, grow Facebook, social media boost, buy engagement, buy social media services, premium SMM panel, top rated SMM panel, trusted SMM panel, safe SMM panel, secure SMM services, 24/7 SMM panel, instant SMM panel, automated SMM panel, SMM panel 2026, best SMM panel 2026, top SMM panel 2026, new SMM panel, reliable SMM panel, legit SMM panel, verified SMM panel" />
        <meta name="author" content="MSF SMM Panel" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large" />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="nntcX1cmLS1n1nr0WDcOKmWwusVeITxgkNHkQnFZ2_o" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://msfsmm.com/" />
        <meta property="og:title" content="MSF SMM Panel - 100% Trusted & Secure Premium SMM Panel" />
        <meta property="og:description" content="MSF SMM Premium SMM Panel for social media marketing. Boost your Instagram, YouTube, Facebook, Twitter and more with instant delivery and 24/7 support. Verified, secure, and trusted by 10,000+ customers." />
        <meta property="og:image" content="https://msfsmm.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="MSF SMM Panel" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://msfsmm.com/" />
        <meta name="twitter:title" content="MSF SMM Panel - 100% Trusted & Secure Premium SMM Panel" />
        <meta name="twitter:description" content="MSF SMM Premium SMM Panel for social media marketing. Boost your Instagram, YouTube, Facebook, Twitter and more with instant delivery and 24/7 support." />
        <meta name="twitter:image" content="https://msfsmm.com/og-image.png" />
        <meta name="twitter:site" content="@msfsmm" />
        <meta name="twitter:creator" content="@m.safwan2006" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="theme-color" content="#1A6BBD" />
        <meta name="msapplication-TileColor" content="#1A6BBD" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Geographic Targeting */}
        <meta name="geo.region" content="PK" />
        <meta name="geo.placename" content="Pakistan" />
        <meta name="geo.position" content="30.3753;69.3451" />
        <meta name="ICBM" content="30.3753, 69.3451" />
        
        {/* Business Information */}
        <meta name="classification" content="Social Media Marketing Services" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        <meta name="rating" content="General" />
        <meta name="target" content="all" />
        <meta name="HandheldFriendly" content="True" />
        <meta name="MobileOptimized" content="320" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://msfsmm.com/" />
        
        {/* Alternate for Mobile */}
        <link rel="alternate" media="handheld" href="https://msfsmm.com/" />
        
        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Theme Script */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t === 'dark') {
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