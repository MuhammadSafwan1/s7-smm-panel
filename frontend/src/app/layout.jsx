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
import AnalyticsTracker from '@/components/common/AnalyticsTracker';
import { Suspense, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import VerifyGate from '@/components/common/VerifyGate';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { initSessionManager } from '@/utils/sessionManager';
import './globals.css';

function LayoutContent({ children }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/s7bHG74TY09161NJASKLPW');
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  // Initialize session manager on mount
  useEffect(() => {
    initSessionManager();
  }, []);

  // Fetch and set dynamic favicon & OG image
  useEffect(() => {
    const fetchSiteLogo = async () => {
      try {
        const docSnap = await cachedQuery('siteSettings:general', () => getDoc(doc(db, 'siteSettings', 'general')), 120000);
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
      <AnalyticsTracker />
      <SeasonalBackground />
      {/* Show Navbar only after Cloudflare verification (or on admin page) */}
      {!isAdminPage && isVerified && (
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
      {/* Show Right Sidebar on all pages except home and admin (only when verified) */}
      {!isAdminPage && pathname !== '/' && isVerified && <RightSidebar />}
      {/* Show Footer, Support Button, WhatsApp Button and Announcement only when verified */}
      {!isAdminPage && isVerified && <Footer />}
      {!isAdminPage && isVerified && <SupportButton />}
      {!isAdminPage && isVerified && <WhatsAppButton />}
      {!isAdminPage && isVerified && <AnnouncementPopup />}
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
        <link rel="icon" type="image/png" href="https://res.cloudinary.com/dv2r4poj6/image/upload/w_48,h_48,c_fill,g_center/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dv2r4poj6/image/upload/w_192,h_192,c_fill,g_center/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Primary SEO Meta Tags */}
        <title>MSF SMM | WORLD BEST AND SECURE SMM PANEL</title>
        <meta name="title" content="MSF SMM | WORLD BEST AND SECURE SMM PANEL" />
        <meta name="description" content="Best SMM Panel. Boost Instagram, YouTube, Facebook, TikTok instantly. 50K+ customers trust us. 100% safe & affordable." />
        <meta name="keywords" content="MSF SMM, MSF SMM Panel, m.safwan2006, best SMM panel, cheapest SMM panel, world best SMM panel, top SMM panel, SMM panel Pakistan, Pakistan SMM panel, Indian SMM panel, SMM panel India, USA SMM panel, UK SMM panel, buy Instagram followers, buy Instagram likes, buy Instagram views, buy Instagram comments, Instagram growth service, Instagram followers Pakistan, Instagram followers India, buy Facebook likes, buy Facebook followers, Facebook page likes, buy YouTube views, buy YouTube subscribers, YouTube promotion, YouTube views Pakistan, buy TikTok followers, buy TikTok likes, TikTok views, TikTok growth, buy Twitter followers, buy Twitter retweets, social media marketing, social media services, SMM services, Instagram marketing, Facebook marketing, YouTube marketing, TikTok marketing, cheapest social media services, cheap SMM panel, affordable SMM panel, instant delivery SMM, fast delivery SMM, instant followers, instant likes, real followers, real likes, high quality followers, active followers, Pakistani SMM panel, SMM reseller panel, SMM wholesale panel, bulk SMM services, SMM API, reseller SMM panel, wholesale SMM services, SMM panel with API, cheapest reseller panel, best reseller panel, affordable social media marketing, social media growth, grow Instagram, grow TikTok, grow YouTube, grow Facebook, social media boost, buy engagement, buy social media services, premium SMM panel, top rated SMM panel, trusted SMM panel, safe SMM panel, secure SMM services, 24/7 SMM panel, instant SMM panel, automated SMM panel, SMM panel 2026, best SMM panel 2026, top SMM panel 2026, new SMM panel, reliable SMM panel, legit SMM panel, verified SMM panel" />
        <meta name="author" content="MSF SMM Panel" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large" />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="nntcX1cmLS1n1nr0WDcOKmWwusVeITxgkNHkQnFZ2_o" />
        
        {/* Google AdSense */}
        <meta name="google-adsense-account" content="ca-pub-8706118096152482" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8706118096152482" crossOrigin="anonymous"></script>
        
        {/* Schema.org Structured Data for better Google understanding & AI Overview */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": "https://msfsmm.com/#organization",
          "name": "MSF SMM Panel",
          "alternateName": "MSF SMM",
          "url": "https://msfsmm.com",
          "logo": {
            "@type": "ImageObject",
            "url": "https://res.cloudinary.com/dv2r4poj6/image/upload/w_1200,h_630,c_fill,g_center,b_rgb:1e3a5f/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png",
            "width": 1200,
            "height": 630
          },
          "description": "World's Best & Most Secure Premium SMM Panel for social media marketing services. Founded by Muhammad Safwan, MSF SMM Panel provides Instagram, YouTube, Facebook, Twitter, TikTok, and other social media growth services at affordable rates with instant delivery.",
          "foundingDate": "2026",
          "founder": {
            "@type": "Person",
            "@id": "https://msfsmm.com/#founder",
            "name": "Muhammad Safwan",
            "givenName": "Muhammad",
            "familyName": "Safwan",
            "jobTitle": "Founder & CEO",
            "url": "https://instagram.com/m.safwan2006",
            "sameAs": [
              "https://instagram.com/m.safwan2006",
              "https://twitter.com/msfsmm"
            ],
            "description": "Founder of MSF SMM Panel, a premium SMM service provider operating worldwide since 2026."
          },
          "contactPoint": [
            {
              "@type": "ContactPoint",
              "contactType": "Customer Service",
              "availableLanguage": ["English", "Urdu"]
            }
          ],
          "sameAs": [
            "https://instagram.com/m.safwan2006",
            "https://twitter.com/msfsmm"
          ],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "50000",
            "bestRating": "5",
            "worstRating": "1"
          },
          "knowsAbout": ["Social Media Marketing", "Instagram Growth", "YouTube Marketing", "TikTok Promotion", "Facebook Advertising"],
          "areaServed": { "@type": "Country", "name": ["Pakistan", "India", "United States", "United Kingdom", "Worldwide"] }
        }) }} />
        
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": "https://msfsmm.com/#website",
          "name": "MSF SMM Panel",
          "url": "https://msfsmm.com",
          "publisher": { "@id": "https://msfsmm.com/#organization" },
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://msfsmm.com/dashboard/services?search={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        }) }} />
        
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "serviceType": "Social Media Marketing",
          "provider": { "@id": "https://msfsmm.com/#organization" },
          "areaServed": ["Worldwide", "Pakistan", "India", "USA", "UK", "UAE"],
          "audience": { "@type": "Audience", "audienceType": ["Social Media Managers", "Influencers", "Businesses", "Content Creators"] },
          "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "PKR",
            "offerCount": "5000+",
            "description": "Instagram followers, likes, views, comments; YouTube subscribers, views; Facebook page likes, post likes; TikTok followers, likes; Twitter followers, retweets; and many more social media services."
          }
        }) }} />
        
        {/* FAQ Schema for AI Overview in Search Results */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is MSF SMM Panel?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "MSF SMM Panel is a premium social media marketing platform founded by Muhammad Safwan. We provide instant Instagram followers, likes, views, YouTube subscribers, Facebook page likes, TikTok followers, and other social media growth services at affordable rates worldwide."
              }
            },
            {
              "@type": "Question",
              "name": "Who owns MSF SMM Panel?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "MSF SMM Panel is owned and founded by Muhammad Safwan. He started the platform in 2026 with a mission to provide reliable, secure, and affordable social media marketing services to customers worldwide."
              }
            },
            {
              "@type": "Question",
              "name": "Is MSF SMM Panel safe and secure?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, MSF SMM Panel is 100% safe and secure. We use encrypted connections, secure payment gateways, and never require your social media passwords. Our services are used by 50,000+ satisfied customers globally."
              }
            },
            {
              "@type": "Question",
              "name": "What services does MSF SMM Panel offer?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "MSF SMM Panel offers Instagram followers, likes, views, and comments; YouTube subscribers and views; Facebook followers, page likes, and post likes; TikTok followers and likes; Twitter followers, retweets, and likes; and many more social media marketing services."
              }
            },
            {
              "@type": "Question",
              "name": "How fast does MSF SMM Panel deliver orders?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Most orders on MSF SMM Panel start within minutes and complete within 1-6 hours. We offer instant delivery on many services, with real-time order tracking available in your dashboard."
              }
            }
          ]
        }) }} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://msfsmm.com/" />
        <meta property="og:title" content="MSF SMM | WORLD BEST AND SECURE SMM PANEL" />
        <meta property="og:description" content="Best SMM Panel. Boost Instagram, YouTube, Facebook, TikTok instantly. 50K+ customers trust us. 100% safe & affordable." />
        <meta property="og:image" content="https://res.cloudinary.com/dv2r4poj6/image/upload/w_1200,h_630,c_fill,g_center,b_rgb:1e3a5f/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png" />
        <meta property="og:image:secure_url" content="https://res.cloudinary.com/dv2r4poj6/image/upload/w_1200,h_630,c_fill,g_center,b_rgb:1e3a5f/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png" />
        <meta property="og:image:alt" content="MSF SMM Panel - World's Best SMM Services Logo" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:site_name" content="MSF SMM Panel" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://msfsmm.com/" />
        <meta name="twitter:title" content="MSF SMM | WORLD BEST AND SECURE SMM PANEL" />
        <meta name="twitter:description" content="Best SMM Panel. Boost Instagram, YouTube, Facebook, TikTok instantly. 50K+ customers trust us." />
        <meta name="twitter:image" content="https://res.cloudinary.com/dv2r4poj6/image/upload/w_1200,h_630,c_fill,g_center,b_rgb:1e3a5f/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png" />
        <meta name="twitter:image:alt" content="MSF SMM Panel - World's Best SMM Services Logo" />
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
        
        {/* Preconnect & DNS-Prefetch for Performance */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
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