'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FiPackage, FiMail, FiMapPin, FiPhone, FiGlobe, FiArrowUpRight } from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('MSF SMM PANEL');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'siteSettings', 'general'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.siteLogo) setSiteLogo(data.siteLogo);
          if (data.adminName) setSiteName(data.adminName);
        }
      } catch (e) {
        console.error('Footer settings fetch error:', e);
      }
    };
    fetchSettings();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="bg-dark-900 dark:bg-dark-950 text-dark-300 border-t border-dark-800">
      <div className="max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-16 xl:px-24 py-16 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-20">

          {/* Brand + Logo — wider column */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 group" onClick={scrollToTop}>
              {siteLogo ? (
                <div className="w-[48px] h-[48px] rounded-full overflow-hidden group-hover:scale-105 transition-transform flex-shrink-0" style={{ 
                  minWidth: '48px', 
                  minHeight: '48px'
                }}>
                  <img
                    src={siteLogo}
                    alt={siteName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 gradient-bg" style={{ 
                  minWidth: '48px', 
                  minHeight: '48px'
                }}>
                  <FiPackage className="text-white text-3xl" />
                </div>
              )}
              <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{siteName}</span>
            </Link>
            <p className="text-sm lg:text-base text-dark-400 leading-relaxed max-w-md">
              Premium SMM Panel for social media marketing. Boost your Instagram, YouTube, Facebook, Twitter and more with instant delivery and 24/7 support.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/923345216246"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-lg bg-dark-800 hover:bg-green-600 flex items-center justify-center text-dark-400 hover:text-white transition-all shadow-lg hover:shadow-green-600/30"
                aria-label="WhatsApp"
              >
                <FiPhone size={20} />
              </a>
              <a
                href="mailto:ms8347750@gmail.com"
                className="w-11 h-11 rounded-lg bg-dark-800 hover:bg-primary-600 flex items-center justify-center text-dark-400 hover:text-white transition-all shadow-lg hover:shadow-primary-600/30"
                aria-label="Email"
              >
                <FiMail size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3">
            <h4 className="text-white font-bold text-base lg:text-lg uppercase tracking-wider mb-6">Quick Links</h4>
            <ul className="space-y-3.5">
              {[
                { href: '/dashboard', label: 'Services' },
                { href: '/dashboard/orders', label: 'My Orders' },
                { href: '/dashboard/add-funds', label: 'Add Funds' },
                { href: '/auth/login', label: 'Login' },
                { href: '/auth/register', label: 'Register' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm lg:text-base text-dark-400 hover:text-primary-400 transition-colors inline-flex items-center gap-2 group"
                  >
                    {link.label}
                    <FiArrowUpRight className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold text-base lg:text-lg uppercase tracking-wider mb-6">Services</h4>
            <ul className="space-y-3.5">
              {['Instagram', 'YouTube', 'Facebook', 'Twitter', 'TikTok'].map((platform) => (
                <li key={platform}>
                  <Link
                    href="/dashboard"
                    className="text-sm lg:text-base text-dark-400 hover:text-primary-400 transition-colors inline-flex items-center gap-2 group"
                  >
                    {platform}
                    <FiArrowUpRight className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us */}
          <div className="lg:col-span-3">
            <h4 className="text-white font-bold text-base lg:text-lg uppercase tracking-wider mb-6">Contact Us</h4>
            <ul className="space-y-5">
              <li>
                <a
                  href="https://wa.me/923345216246"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm lg:text-base text-dark-400 hover:text-green-400 transition-colors group"
                >
                  <FiPhone className="mt-1 flex-shrink-0 text-green-500 text-lg" />
                  <div>
                    <span className="font-semibold text-white text-sm block mb-1">WhatsApp</span>
                    +92 3345216246
                  </div>
                </a>
              </li>
              <li>
                <a
                  href="mailto:ms8347750@gmail.com"
                  className="flex items-start gap-3 text-sm lg:text-base text-dark-400 hover:text-primary-400 transition-colors group"
                >
                  <FiMail className="mt-1 flex-shrink-0 text-primary-500 text-lg" />
                  <div>
                    <span className="font-semibold text-white text-sm block mb-1">Email</span>
                    ms8347750@gmail.com
                  </div>
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm lg:text-base text-dark-400">
                <FiMapPin className="mt-1 flex-shrink-0 text-primary-500 text-lg" />
                <div>
                  <span className="font-semibold text-white text-sm block mb-1">Location</span>
                  Pakistan
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-dark-800 mt-16 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm lg:text-base text-dark-500">
            &copy; {currentYear} <span className="text-dark-400 font-semibold">{siteName}</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <Link href="/policies" className="text-sm lg:text-base text-dark-500 hover:text-primary-400 transition-colors font-medium">
              Privacy Policy
            </Link>
            <Link href="/policies" className="text-sm lg:text-base text-dark-500 hover:text-primary-400 transition-colors font-medium">
              Terms of Service
            </Link>
            <Link href="/help" className="text-sm lg:text-base text-dark-500 hover:text-primary-400 transition-colors font-medium">
              Help Videos
            </Link>
            <button
              onClick={scrollToTop}
              className="w-10 h-10 rounded-lg bg-dark-800 hover:bg-primary-600 flex items-center justify-center text-dark-400 hover:text-white transition-all shadow-lg hover:shadow-primary-600/30"
              aria-label="Back to top"
            >
              <FiArrowUpRight className="rotate-[-45deg]" size={18} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
