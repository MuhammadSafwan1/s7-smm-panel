'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { FiBell, FiXCircle } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';

export default function AnnouncementBell() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [announcements, setAnnouncements] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const ref = useRef(null);

  const announcementTypes = [
    { value: 'info', label: 'Info', emoji: 'ℹ️', color: 'bg-blue-600' },
    { value: 'success', label: 'Success', emoji: '✅', color: 'bg-green-600' },
    { value: 'warning', label: 'Warning', emoji: '⚠️', color: 'bg-amber-500' },
    { value: 'new_service', label: 'New Service', emoji: '🆕', color: 'bg-violet-600' },
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      // 🔒 Only show last 7 days announcements (older ones are filtered out)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const q = query(collection(db, 'announcements'), where('createdAt', '>=', sevenDaysAgo), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter: show only global announcements or announcements targeted to this user
      const filtered = data.filter(a => {
        const targetUsers = a.targetUsers || [];
        // If no targetUsers or empty array, it's a global announcement
        if (targetUsers.length === 0) return true;
        // If targetUsers exists, check if current user is included
        return user && targetUsers.includes(user.uid);
      });
      
      setAnnouncements(filtered);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const getUnreadCount = () => {
    const seen = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
    return announcements.filter(a => !seen.includes(a.id)).length;
  };

  const getTypeConfig = (type) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0];
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      case 'success': return 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'warning': return 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
      case 'new_service': return 'bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30';
      default: return 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
    }
  };

  const markAsSeen = (id) => {
    const seen = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem('seenAnnouncements', JSON.stringify(seen));
    }
  };

  const markAllAsSeen = () => {
    const seen = announcements.map(a => a.id);
    localStorage.setItem('seenAnnouncements', JSON.stringify(seen));
  };

  const unreadCount = getUnreadCount();

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 sm:p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 transition-all"
        title="Announcements"
      >
        <FiBell className="text-amber-600 dark:text-amber-400 text-lg" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 sm:w-96 bg-white dark:bg-[#1a2742] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#253a5e] z-50 overflow-hidden animate-slide-down max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 dark:border-[#253a5e] flex items-center justify-between bg-amber-50 dark:bg-amber-500/5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                  <FiBell className="text-white text-xs sm:text-sm" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">Announcements</h3>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsSeen}
                    className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold whitespace-nowrap"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all"
                >
                  <FiXCircle size={10} />
                </button>
              </div>
            </div>

            {/* Announcements list */}
            <div className="overflow-y-auto flex-1">
              {announcements.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <FiBell className="text-gray-300 dark:text-gray-600" size={16} />
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">No announcements yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[#253a5e]">
                  {announcements.map((a) => {
                    const typeConfig = getTypeConfig(a.type);
                    const seen = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
                    const isSeen = seen.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedAnnouncement(a);
                          markAsSeen(a.id);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 dark:hover:bg-[#253a5e]/50 transition-all ${!isSeen ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''}`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg ${typeConfig.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                            <span className="text-sm sm:text-lg">{typeConfig.emoji}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white truncate">{a.title}</p>
                              {!isSeen && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{a.message}</p>
                            <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
                              {a.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Full announcement modal */}
      {selectedAnnouncement && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={() => setSelectedAnnouncement(null)}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white dark:bg-[#1a2742] max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 dark:border-[#253a5e] animate-slide-up max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="border-b border-gray-100 dark:border-[#253a5e] px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-bold mb-2 sm:mb-3 shadow-lg shadow-amber-500/20">
                      <FiBell size={12} />
                      ANNOUNCEMENT
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${getTypeConfig(selectedAnnouncement.type).color} flex items-center justify-center shadow-lg`}>
                        <span className="text-xl sm:text-2xl">{getTypeConfig(selectedAnnouncement.type).emoji}</span>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border ${getTypeBadgeColor(selectedAnnouncement.type)}`}>
                        {getTypeConfig(selectedAnnouncement.type).label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all flex-shrink-0"
                  >
                    <FiXCircle size={14} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                  {selectedAnnouncement.title}
                </h2>
                <div className="p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-100 dark:border-[#253a5e]">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                    {selectedAnnouncement.message}
                  </p>
                </div>

                {/* Service cards */}
                {selectedAnnouncement.serviceDetails && selectedAnnouncement.serviceDetails.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    {selectedAnnouncement.serviceDetails.map((service, index) => (
                      <div key={index} className="p-2.5 sm:p-3 rounded-xl bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-100 dark:border-[#253a5e] flex items-start gap-2 sm:gap-3">
                        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-200 dark:border-blue-500/30 flex-shrink-0">
                          #{service.serviceId}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">{service.name}</p>
                          <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Price: <span className="font-semibold text-blue-600 dark:text-blue-400">{format(parseFloat(service.price || 0))}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-sm sm:text-base"
                >
                  Got it, thanks! 🎉
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
