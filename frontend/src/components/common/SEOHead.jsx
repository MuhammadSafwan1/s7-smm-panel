'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

export default function SEOHead({ 
  title, 
  description, 
  keywords,
  ogImage,
  ogType = 'website',
  canonicalUrl,
  noindex = false 
}) {
  const pathname = usePathname();
  const [siteLogo, setSiteLogo] = useState(null);
  
  // Fetch admin uploaded logo for OG image
  useEffect(() => {
    const fetchSiteLogo = async () => {
      try {
        const docRef = doc(db, 'siteSettings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().siteLogo) {
          setSiteLogo(docSnap.data().siteLogo);
        }
      } catch (error) {
        console.error('Error fetching site logo:', error);
      }
    };
    fetchSiteLogo();
  }, []);
  
  // Default values with HIGH VOLUME keywords
  const defaultTitle = 'MSF SMM | WORLD BEST AND SECURE SMM PANEL';
  const defaultDescription = 'MSF SMM Panel - World\'s Best & Most Secure Premium SMM Panel for social media marketing. Founded by Muhammad Safwan. Boost Instagram, YouTube, Facebook, TikTok, Twitter followers, likes, views, comments & subscribers instantly. 100% safe, verified, instant delivery, 24/7 support, trusted by 50,000+ customers worldwide. Best SMM panel with cheapest rates globally.';
  const defaultKeywords = 'MSF SMM, MSF SMM Panel, Muhammad Safwan, m.safwan2006, world best SMM panel, globally trusted SMM panel, international SMM panel, worldwide SMM services, trusted SMM panel, secure SMM panel, verified SMM panel, best SMM panel, cheapest SMM panel, top SMM panel, #1 SMM panel, premium SMM panel, professional SMM services, SMM panel Pakistan, Pakistan SMM panel, Indian SMM panel, SMM panel India, USA SMM panel, UK SMM panel, Canada SMM panel, Australia SMM panel, European SMM panel, global SMM panel, international SMM services, buy Instagram followers, buy Instagram likes, buy Instagram views, buy Instagram comments, Instagram growth service, Instagram followers Pakistan, Instagram followers India, Instagram followers USA, buy Facebook likes, buy Facebook followers, Facebook page likes, buy YouTube views, buy YouTube subscribers, YouTube promotion, YouTube monetization, buy TikTok followers, buy TikTok likes, TikTok views, TikTok viral, buy Twitter followers, buy Twitter retweets, social media marketing, social media services, SMM services, Instagram marketing, Facebook marketing, YouTube marketing, TikTok marketing, cheapest social media services, cheap SMM panel, affordable SMM panel, instant delivery SMM, fast delivery SMM, instant followers, instant likes, real followers, real likes, high quality followers, active followers, Pakistani SMM panel, SMM reseller panel, SMM wholesale panel, bulk SMM services, SMM API, reseller SMM panel, wholesale SMM services, SMM panel with API, cheapest reseller panel, best reseller panel, affordable social media marketing, social media growth, grow Instagram, grow TikTok, grow YouTube, grow Facebook, social media boost, buy engagement, buy social media services, premium SMM panel, top rated SMM panel, trusted SMM panel, safe SMM panel, secure SMM services, 24/7 SMM panel, instant SMM panel, automated SMM panel, SMM panel 2026, best SMM panel 2026, top SMM panel 2026, new SMM panel, reliable SMM panel, legit SMM panel, verified SMM panel, authentic SMM services, genuine followers, real engagement, organic growth, boost social media, social proof, influencer growth, brand growth, business growth, marketing services, digital marketing, online marketing, social media management, Muhammad Safwan SMM, Safwan SMM services, MSF social media, global SMM provider, international social media growth, worldwide Instagram services, global TikTok growth, international YouTube promotion';
  const defaultOgImage = siteLogo || 'https://res.cloudinary.com/dv2r4poj6/image/upload/w_1200,h_630,c_fill,f_auto,q_auto/v1784693370/website/logo/uurwgktu9vnplb2lxnfh.png';
  
  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalKeywords = keywords || defaultKeywords;
  const finalOgImage = ogImage || defaultOgImage;
  const finalCanonicalUrl = canonicalUrl || `https://msfsmm.com${pathname}`;
  
  useEffect(() => {
    // Set page title
    document.title = finalTitle;
    
    // Meta Description
    updateMetaTag('name', 'description', finalDescription);
    
    // Meta Keywords
    updateMetaTag('name', 'keywords', finalKeywords);
    
    // Meta Author
    updateMetaTag('name', 'author', 'MSF SMM Panel');
    
    // Meta Robots
    updateMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Googlebot specific
    updateMetaTag('name', 'googlebot', 'index, follow, max-image-preview:large');
    
    // Open Graph - Facebook, LinkedIn
    updateMetaTag('property', 'og:title', finalTitle);
    updateMetaTag('property', 'og:description', finalDescription);
    updateMetaTag('property', 'og:type', ogType);
    updateMetaTag('property', 'og:url', finalCanonicalUrl);
    updateMetaTag('property', 'og:image', finalOgImage);
    updateMetaTag('property', 'og:image:width', '1200');
    updateMetaTag('property', 'og:image:height', '630');
    updateMetaTag('property', 'og:site_name', 'MSF SMM Panel');
    updateMetaTag('property', 'og:locale', 'en_US');
    
    // Twitter Card
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', finalTitle);
    updateMetaTag('name', 'twitter:description', finalDescription);
    updateMetaTag('name', 'twitter:image', finalOgImage);
    updateMetaTag('name', 'twitter:site', '@msfsmm');
    updateMetaTag('name', 'twitter:creator', '@m.safwan2006');
    
    // Additional SEO Meta Tags
    updateMetaTag('name', 'theme-color', '#1A6BBD');
    updateMetaTag('name', 'msapplication-TileColor', '#1A6BBD');
    updateMetaTag('name', 'apple-mobile-web-app-capable', 'yes');
    updateMetaTag('name', 'apple-mobile-web-app-status-bar-style', 'black-translucent');
    
    // Geographic targeting
    updateMetaTag('name', 'geo.region', 'PK');
    updateMetaTag('name', 'geo.placename', 'Pakistan');
    
    // Business/Organization Schema
    updateMetaTag('name', 'classification', 'Social Media Marketing Services');
    updateMetaTag('name', 'coverage', 'Worldwide');
    updateMetaTag('name', 'distribution', 'Global');
    updateMetaTag('name', 'rating', 'General');
    
    // Canonical URL
    updateLinkTag('canonical', finalCanonicalUrl);
    
    // Alternate for mobile
    updateLinkTag('alternate', finalCanonicalUrl, 'handheld');
    
  }, [finalTitle, finalDescription, finalKeywords, finalOgImage, finalCanonicalUrl, ogType, noindex, pathname]);
  
  return null;
}

// Helper function to update meta tags
function updateMetaTag(attribute, name, content) {
  if (!content) return;
  
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

// Helper function to update link tags
function updateLinkTag(rel, href, media = null) {
  if (!href) return;
  
  let selector = `link[rel="${rel}"]`;
  if (media) selector += `[media="${media}"]`;
  
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    if (media) element.setAttribute('media', media);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}
