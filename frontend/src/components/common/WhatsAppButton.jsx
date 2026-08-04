'use client';

import { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { cachedQuery } from '@/lib/cache';

export default function WhatsAppButton() {
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetchWhatsAppSettings();
  }, []);

  // Hide button on mobile while support chat is open (desktop unaffected)
  useEffect(() => {
    const onOpen  = () => setChatOpen(true);
    const onClose = () => setChatOpen(false);
    window.addEventListener('msf:chat-open', onOpen);
    window.addEventListener('msf:chat-close', onClose);
    return () => {
      window.removeEventListener('msf:chat-open', onOpen);
      window.removeEventListener('msf:chat-close', onClose);
    };
  }, []);

  const fetchWhatsAppSettings = async () => {
    try {
      const settingsSnap = await cachedQuery('siteSettings:general', () => getDoc(doc(db, 'siteSettings', 'general')), 120000);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        // Only set URL if admin has provided one
        if (data.whatsappChannelUrl) {
          setWhatsappUrl(data.whatsappChannelUrl);
        }
        // Only enable if admin explicitly enabled AND URL exists
        if (data.whatsappChannelEnabled === true && data.whatsappChannelUrl) {
          setEnabled(true);
        }
      }
    } catch (error) {
      console.error('Error fetching WhatsApp settings:', error);
    }
  };

  // Don't render anything if disabled or no URL
  if (!enabled || !whatsappUrl) {
    return null;
  }

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`fixed right-4 sm:left-6 bottom-24 sm:bottom-6 z-50 ${chatOpen ? 'hidden sm:block' : ''}`}>
      {/* Simple clean button - no overlapping elements */}
      <button
        onClick={handleClick}
        className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-110 active:scale-95 transition-all duration-300 group"
        aria-label="Join WhatsApp Channel"
      >
        {/* WhatsApp Icon */}
        <FaWhatsapp className="text-2xl sm:text-3xl text-white relative z-10" />
        
        {/* Pulse effect (purely visual, non-interactive) */}
        <span className="absolute inset-0 rounded-full bg-green-400 opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-700 pointer-events-none"></span>
        
        {/* Simple tooltip on hover */}
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none hidden sm:block">
          Join Our WhatsApp Channel
        </span>
        
        {/* Mobile tooltip (right side) */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none sm:hidden">
          Join Channel
        </span>
      </button>
    </div>
  );
}
