'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { FiXCircle } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';

export default function AnnouncementPopup() {
  const { format } = useCurrency();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const announcementTypes = [
    { value: 'info', label: 'Info', color: 'blue', emoji: 'ℹ️' },
    { value: 'success', label: 'Success', color: 'green', emoji: '✅' },
    { value: 'warning', label: 'Warning', color: 'yellow', emoji: '⚠️' },
    { value: 'new_service', label: 'New Service', color: 'purple', emoji: '🆕' },
  ];

  useEffect(() => {
    fetchLatestAnnouncement();
  }, []);

  const fetchLatestAnnouncement = async () => {
    try {
      // 🔒 Only show last 7 days announcements (older ones are filtered out)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const q = query(
        collection(db, 'announcements'),
        where('createdAt', '>=', sevenDaysAgo),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
        
        // Find first unseen announcement that targets this user
        for (const docSnapshot of snapshot.docs) {
          const announcementData = { id: docSnapshot.id, ...docSnapshot.data() };
          const targetUsers = announcementData.targetUsers || [];
          
          // Skip if already seen
          if (seenAnnouncements.includes(announcementData.id)) continue;
          
          // Check targeting: if no targetUsers, it's global; otherwise check if user is targeted
          if (targetUsers.length === 0 || (user && targetUsers.includes(user.uid))) {
            setAnnouncement(announcementData);
            setIsOpen(true);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    }
  };

  const handleClose = () => {
    if (announcement) {
      const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
      seenAnnouncements.push(announcement.id);
      localStorage.setItem('seenAnnouncements', JSON.stringify(seenAnnouncements));
    }
    setIsOpen(false);
  };

  const getTypeConfig = (type) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0];
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'info': return { bg: 'bg-blue-600', badge: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' };
      case 'success': return { bg: 'bg-green-600', badge: 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30' };
      case 'warning': return { bg: 'bg-amber-500', badge: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' };
      case 'new_service': return { bg: 'bg-violet-600', badge: 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30' };
      default: return { bg: 'bg-blue-600', badge: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' };
    }
  };

  if (!isOpen || !announcement) return null;

  const typeConfig = getTypeConfig(announcement.type);
  const typeStyles = getTypeStyles(announcement.type);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 animate-fade-in">
        <div className="relative max-w-lg w-full animate-slide-up">
          {/* Main card */}
          <div className="bg-white dark:bg-[#1a2742] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-gray-100 dark:border-[#253a5e]">
            {/* Header */}
            <div className="border-b border-gray-100 dark:border-[#253a5e] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold mb-4 shadow-lg shadow-blue-600/20">
                    <span className="text-lg">📢</span>
                    ANNOUNCEMENT
                  </div>
                  
                  {/* Type badge */}
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${typeStyles.bg} flex items-center justify-center shadow-lg`}>
                      <span className="text-2xl">{typeConfig.emoji}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${typeStyles.badge}`}>
                      {typeConfig.label}
                    </span>
                  </div>
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72] transition-all"
                  aria-label="Close"
                >
                  <FiXCircle size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Title */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                {announcement.title}
              </h2>

              {/* Message */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-100 dark:border-[#253a5e]">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {announcement.message}
                </p>
              </div>

              {/* Service cards */}
              {announcement.serviceDetails && announcement.serviceDetails.length > 0 && (
                <div className="space-y-2">
                  {announcement.serviceDetails.map((service, index) => (
                    <div key={index} className="p-4 rounded-xl bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-100 dark:border-[#253a5e] flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-200 dark:border-blue-500/30">
                          #{service.serviceId}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate mb-1">{service.name}</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">Price:</span>
                            <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                              {format(parseFloat(service.price || 0))}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 dark:text-gray-500">Min:</span>
                            <span className="ml-1 font-semibold text-gray-600 dark:text-gray-300">{service.minQuantity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action button */}
              <button
                onClick={handleClose}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
              >
                Got it, thanks! 🎉
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
