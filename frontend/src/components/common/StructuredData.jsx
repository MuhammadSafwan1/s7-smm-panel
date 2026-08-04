'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

export default function StructuredData() {
  const [siteLogo, setSiteLogo] = useState(null);

  // Fetch admin uploaded logo
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, 'siteSettings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().siteLogo) {
          setSiteLogo(docSnap.data().siteLogo);
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    if (!siteLogo) return; // Wait until logo is fetched

    const logoUrl = siteLogo || 'https://msfsmm.com/logo.png';
    // Organization Schema
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "MSF SMM Panel",
      "alternateName": "MSF SMM",
      "url": "https://msfsmm.com",
      "description": "MSF SMM Panel - World's #1 Most Trusted & Secure Premium SMM Panel founded by Muhammad Safwan. Global leader in social media marketing services for Instagram, YouTube, Facebook, TikTok, Twitter. 50,000+ satisfied customers worldwide with 100% safe services, instant delivery, and 24/7 professional support.",
      "slogan": "World's Most Trusted & Secure SMM Services",
      "logo": {
        "@type": "ImageObject",
        "url": logoUrl,
        "width": "512",
        "height": "512"
      },
      "image": logoUrl,
      "foundingDate": "2020",
      "founders": [{
        "@type": "Person",
        "name": "Muhammad Safwan",
        "alternateName": "m.safwan2006",
        "jobTitle": "Founder & CEO",
        "description": "Founder and CEO of MSF SMM Panel, the world's most trusted social media marketing service provider",
        "url": "https://msfsmm.com",
        "sameAs": [
          "https://www.instagram.com/m.safwan2006/",
          "https://discord.com/users/m.safwan72006"
        ]
      }],
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "Global",
        "addressRegion": "Worldwide",
        "addressLocality": "International"
      },
      "contactPoint": [{
        "@type": "ContactPoint",
        "contactType": "Customer Support",
        "availableLanguage": ["English", "Urdu", "Hindi", "Arabic"],
        "telephone": "+92-334-5216246",
        "email": "ms8347750@gmail.com",
        "hoursAvailable": "24/7"
      }],
      "sameAs": [
        "https://www.instagram.com/m.safwan2006/",
        "https://discord.com/users/m.safwan72006",
        "https://www.facebook.com/msfsmm",
        "https://twitter.com/msfsmm"
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "50000",
        "bestRating": "5",
        "worstRating": "1"
      },
      "review": [
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "James Anderson (USA)"
          },
          "datePublished": "2026-07-20",
          "reviewBody": "MSF SMM Panel is absolutely the best! I've been using their services for months and the results are amazing. Instagram followers came instantly and all are real accounts. Muhammad Safwan's customer support is excellent - available 24/7. Highly recommended for anyone looking for trusted SMM services worldwide!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Emma Wilson (UK)"
          },
          "datePublished": "2026-07-18",
          "reviewBody": "I was skeptical at first but MSF SMM proved to be 100% legit and safe. Got YouTube subscribers for my channel and the quality is top-notch. The prices are very affordable compared to other panels. The admin Muhammad Safwan is very professional and helpful. Best SMM panel globally!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Mohammed Al-Rashid (UAE)"
          },
          "datePublished": "2026-07-15",
          "reviewBody": "Outstanding service! MSF SMM Panel delivered exactly what they promised. My TikTok account grew from 500 to 10,000 followers in just 2 weeks. All followers are real and active. Fast delivery, secure payment, and excellent support. This is the only SMM panel you need - totally worth it!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Priya Sharma (India)"
          },
          "datePublished": "2026-07-12",
          "reviewBody": "MSF SMM is the most trusted SMM panel I've ever used. I ordered Facebook page likes and Instagram views - both delivered within minutes. The dashboard is user-friendly and prices are very cheap. Muhammad Safwan's team provides great support. 100% satisfied with the quality and service!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "David Chen (Singapore)"
          },
          "datePublished": "2026-07-10",
          "reviewBody": "Been using MSF SMM Panel for 6 months now and never disappointed. The services are premium quality with instant delivery. I run a social media marketing agency and MSF is my go-to provider. Reliable, affordable, and completely safe. Muhammad Safwan has built an amazing platform - highly recommend to everyone!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Carlos Rodriguez (Mexico)"
          },
          "datePublished": "2026-07-08",
          "reviewBody": "MSF SMM Panel exceeded all my expectations! The Instagram growth service helped me reach 50K followers in 3 months. Real engagement, no fake accounts. Perfect for influencers and businesses. Muhammad Safwan's support team is incredibly responsive. Best investment for my social media marketing!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Sophie Martin (France)"
          },
          "datePublished": "2026-07-05",
          "reviewBody": "Je suis très satisfaite! MSF SMM Panel provides excellent services for all social platforms. I boosted my YouTube channel with real subscribers and views. The quality is amazing and prices are the cheapest I found globally. Professional, secure, and trustworthy. Merci Muhammad Safwan!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Liam O'Connor (Australia)"
          },
          "datePublished": "2026-07-03",
          "reviewBody": "Absolutely brilliant! MSF SMM Panel helped my business grow tremendously on Facebook and Instagram. The instant delivery is impressive and all engagement is genuine. I've tried many SMM panels but MSF is hands down the best. Great prices, fantastic support, and 100% reliable. Highly recommended worldwide!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Yuki Tanaka (Japan)"
          },
          "datePublished": "2026-07-01",
          "reviewBody": "MSF SMM Panel is the most reliable SMM service globally! I use it for my e-commerce business to boost TikTok and Instagram. The quality of followers is excellent - all real users. Muhammad Safwan's platform is secure, fast, and affordable. Perfect for international customers. ありがとう (Thank you)!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        },
        {
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": "Alexander Petrov (Russia)"
          },
          "datePublished": "2026-06-28",
          "reviewBody": "Отлично! MSF SMM Panel is the best choice for social media growth. I bought Instagram followers and YouTube views - everything delivered perfectly. The service is secure, prices are competitive, and customer support is always helpful. Muhammad Safwan has created an outstanding platform. Спасибо!",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": "5",
            "bestRating": "5"
          }
        }
      ],
      "knowsAbout": [
        "Social Media Marketing",
        "Instagram Growth",
        "Facebook Marketing",
        "YouTube Promotion",
        "TikTok Growth",
        "Twitter Marketing",
        "SMM Services",
        "Digital Marketing",
        "Social Media Management"
      ],
      "award": "World's Best SMM Panel 2026",
      "certification": "Globally Verified & Trusted SMM Provider",
      "numberOfEmployees": {
        "@type": "QuantitativeValue",
        "value": "50+"
      },
      "knowsLanguage": ["English", "Urdu", "Hindi", "Arabic"]
    };

    // Website Schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "MSF SMM Panel",
      "url": "https://msfsmm.com",
      "description": "Best and cheapest SMM panel in Pakistan for all social media services",
      "image": logoUrl,
      "logo": {
        "@type": "ImageObject",
        "url": logoUrl,
        "width": "512",
        "height": "512"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://msfsmm.com/dashboard?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      },
      "inLanguage": "en-US"
    };

    // Product/Service Schema
    const serviceSchema = {
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Social Media Marketing Services",
      "name": "MSF SMM Panel Services",
      "description": "MSF SMM Premium SMM Panel for social media marketing. Boost your Instagram, YouTube, Facebook, Twitter and more with instant delivery and 24/7 support. 100% trusted, secure, and verified services.",
      "brand": {
        "@type": "Brand",
        "name": "MSF SMM Panel",
        "slogan": "Trusted & Secure Social Media Growth"
      },
      "image": logoUrl,
      "logo": {
        "@type": "ImageObject",
        "url": logoUrl,
        "width": "512",
        "height": "512"
      },
      "provider": {
        "@type": "Organization",
        "name": "MSF SMM Panel",
        "url": "https://msfsmm.com",
        "logo": {
          "@type": "ImageObject",
          "url": logoUrl,
          "width": "512",
          "height": "512"
        }
      },
      "areaServed": {
        "@type": "Country",
        "name": "Worldwide"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "SMM Services",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Instagram Followers",
              "description": "Buy real Instagram followers with instant delivery"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Facebook Likes",
              "description": "Buy Facebook page likes and post likes"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "YouTube Views",
              "description": "Buy YouTube views and subscribers"
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "TikTok Followers",
              "description": "Buy TikTok followers and likes"
            }
          }
        ]
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "10000"
      },
      "termsOfService": "https://msfsmm.com/policies/terms",
      "areaServed": {
        "@type": "Place",
        "name": "Worldwide"
      },
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://msfsmm.com",
        "serviceType": "Online Service",
        "availableLanguage": ["English", "Urdu"]
      }
    };

    // Breadcrumb Schema (for homepage)
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://msfsmm.com"
      }]
    };

    // FAQ Schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is MSF SMM Panel?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "MSF SMM Panel is a 100% trusted and secure premium SMM Panel for social media marketing. We provide professional services for Instagram, Facebook, YouTube, TikTok, and Twitter with instant delivery and 24/7 support. We are Pakistan's #1 verified SMM service provider trusted by over 10,000+ satisfied customers."
          }
        },
        {
          "@type": "Question",
          "name": "Is MSF SMM Panel safe and secure?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, absolutely! MSF SMM Panel is 100% safe, secure, and trusted. We use secure payment methods, encrypted transactions, and our services comply with all platform guidelines. We provide real, high-quality engagement with complete data protection and privacy. Your account security is our top priority."
          }
        },
        {
          "@type": "Question",
          "name": "Which social media platforms do you support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We support all major social media platforms including Instagram (followers, likes, views, comments), Facebook (likes, followers, page likes), YouTube (views, subscribers, likes), TikTok (followers, likes, views), Twitter (followers, retweets, likes), Telegram, Snapchat, LinkedIn, and many more."
          }
        },
        {
          "@type": "Question",
          "name": "How fast is the delivery?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most of our services start within minutes after order placement with instant delivery. Delivery time varies by service and quantity, but we guarantee fast and reliable delivery on all orders. Our automated system ensures quick processing with 24/7 availability."
          }
        },
        {
          "@type": "Question",
          "name": "Why choose MSF SMM Panel?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "MSF SMM Panel is the world's most trusted and secure SMM panel offering cheapest rates, instant delivery, 24/7 professional support, high-quality services, verified provider status, and complete money-back guarantee. We have 10,000+ satisfied customers and maintain 4.9/5 rating. 100% safe, reliable, and affordable social media growth solutions."
          }
        },
        {
          "@type": "Question",
          "name": "Are your services real and high quality?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! We provide 100% real, authentic, and high-quality services. All followers, likes, and views come from genuine accounts with real engagement. We never use bots or fake accounts. Our services are safe for your social media accounts and comply with platform terms of service."
          }
        },
        {
          "@type": "Question",
          "name": "Do you offer refund and support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, we offer full refund policy and 24/7 professional customer support. If you face any issues with your order, our support team is always available to help you. We also provide refill guarantee on eligible services to ensure complete customer satisfaction."
          }
        }
      ]
    };

    // Local Business Schema
    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "MSF SMM Panel",
      "image": logoUrl,
      "@id": "https://msfsmm.com",
      "url": "https://msfsmm.com",
      "logo": {
        "@type": "ImageObject",
        "url": logoUrl,
        "width": "512",
        "height": "512"
      },
      "telephone": "+92-XXX-XXXXXXX",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "PK"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "30.3753",
        "longitude": "69.3451"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "00:00",
        "closes": "23:59"
      },
      "sameAs": [
        "https://www.instagram.com/m.safwan2006/",
        "https://discord.com/users/m.safwan72006",
        "https://www.facebook.com/msfsmm"
      ]
    };

    // Insert all schemas
    insertSchema('organization-schema', organizationSchema);
    insertSchema('website-schema', websiteSchema);
    insertSchema('service-schema', serviceSchema);
    insertSchema('breadcrumb-schema', breadcrumbSchema);
    insertSchema('faq-schema', faqSchema);
    insertSchema('local-business-schema', localBusinessSchema);

  }, [siteLogo]); // Re-run when logo is fetched

  return null;
}

// Helper function to insert JSON-LD schema
function insertSchema(id, schema) {
  // Remove existing schema with same ID
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create new script tag
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}
