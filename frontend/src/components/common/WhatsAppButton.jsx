'use client';

import { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { cachedQuery } from '@/lib/cache';

export default function WhatsAppButton() {
  const [whatsappUrl, setWhatsappUrl] = useState('https://whatsapp.com/channel/0029Vb5txzUJkK714Q3onN1l');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetchWhatsAppSettings();
  }, []);

  const fetchWhatsAppSettings = async () => {
    try {
      const settingsSnap = await cachedQuery('siteSettings:general', () => getDoc(doc(db, 'siteSettings', 'general')), 300000);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.whatsappChannelUrl) {
          setWhatsappUrl(data.whatsappChannelUrl);
        }
        if (data.whatsappChannelEnabled !== undefined) {
          setEnabled(data.whatsappChannelEnabled);
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp settings:', error);
    }
  };

  if (!enabled || !whatsappUrl) {
    return null;
  }

  const handleClick = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed left-6 bottom-6 z-50 group"
      aria-label="Join WhatsApp Channel"
    >
      {/* Main WhatsApp Icon */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/50 hover:shadow-green-500/70 transition-all duration-300 hover:scale-110 cursor-pointer">
          <FaWhatsapp className="text-3xl text-white" />
        </div>
        
        {/* Pulse Animation */}
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-20"></div>
        
        {/* Notification Badge */}
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xs font-bold">1</span>
        </div>
      </div>

      {/* Hover Tooltip */}
      <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-2 rounded-xl shadow-2xl whitespace-nowrap border border-gray-700">
          <p className="font-bold text-sm">📢 Join Our Channel</p>
          <p className="text-xs text-gray-300">Get latest updates!</p>
        </div>
        {/* Arrow */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900 dark:border-r-gray-800"></div>
      </div>
    </button>
  );
}
