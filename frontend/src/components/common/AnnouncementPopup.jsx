'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { FiX } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';

export default function AnnouncementPopup() {
  const { format } = useCurrency();
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
      const q = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const latestAnnouncement = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        
        // Check if user has already seen this announcement
        const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
        
        if (!seenAnnouncements.includes(latestAnnouncement.id)) {
          setAnnouncement(latestAnnouncement);
          setIsOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    }
  };

  const handleClose = () => {
    if (announcement) {
      // Mark this announcement as seen
      const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
      seenAnnouncements.push(announcement.id);
      localStorage.setItem('seenAnnouncements', JSON.stringify(seenAnnouncements));
    }
    setIsOpen(false);
  };

  const getTypeConfig = (type) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0];
  };

  if (!isOpen || !announcement) return null;

  const typeConfig = getTypeConfig(announcement.type);

  return (
    <>
      {/* Backdrop with dark blur matching dashboard */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] animate-fade-in"
        onClick={handleClose}
      />
      
      {/* Popup with dark theme */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 animate-fade-in">
        <div className="relative max-w-2xl w-full animate-slide-up">
          {/* Glow effect - purple to cyan */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
          
          {/* Main card - dark slate theme */}
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
            {/* Header with purple-cyan gradient */}
            <div className="relative overflow-hidden border-b border-slate-700/50">
              {/* Background gradient matching your theme */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-cyan-900/40"></div>
              
              <div className="relative p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badge with purple-cyan gradient matching theme */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white text-sm font-bold mb-4 shadow-lg shadow-purple-500/30">
                      <span className="text-xl">📢</span>
                      ANNOUNCEMENT
                    </div>
                    
                    {/* Type badge */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg backdrop-blur-sm">
                        <span className="text-4xl">{typeConfig.emoji}</span>
                      </div>
                      <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg">
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Close button - slate theme */}
                  <button
                    onClick={handleClose}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-slate-700/80 transition-all flex items-center justify-center backdrop-blur-sm border border-slate-600/50 hover:border-slate-500/50"
                    aria-label="Close"
                  >
                    <FiX className="text-xl text-slate-300 hover:text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Title with purple-cyan gradient matching dashboard */}
              <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
                {announcement.title}
              </h2>

              {/* Message box - dark slate */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-2xl blur opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="relative p-6 rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
                  <p className="text-lg text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {announcement.message}
                  </p>
                </div>
              </div>

              {/* Service cards - dark navy blue theme like services list */}
              {announcement.serviceDetails && announcement.serviceDetails.length > 0 && (
                <div className="space-y-3">
                  {announcement.serviceDetails.map((service, index) => (
                    <div key={index} className="relative group">
                      {/* Subtle glow */}
                      <div className="absolute -inset-0.5 bg-blue-600/10 rounded-xl blur opacity-50"></div>
                      {/* Dark navy blue card - matching services list */}
                      <div className="relative p-4 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-slate-700/60 hover:border-slate-600/60 transition-colors flex items-start gap-4">
                        {/* Service ID on left - light navy blue */}
                        <div className="flex-shrink-0">
                          <span className="text-sm px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-400/30 inline-block">
                            #{service.serviceId}
                          </span>
                        </div>
                        {/* Service details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate mb-2">{service.name}</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-400">Price:</span>
                              <span className="ml-2 font-semibold text-cyan-400">
                                {format(parseFloat(service.price || 0))}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Min:</span>
                              <span className="ml-2 font-semibold text-slate-300">{service.minQuantity}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action button - purple-cyan gradient matching theme */}
              <button
                onClick={handleClose}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 shadow-xl shadow-purple-500/30 hover:shadow-cyan-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
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
