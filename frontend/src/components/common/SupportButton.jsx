'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  collection, doc, setDoc, getDoc, addDoc,
  onSnapshot, query, where,
  serverTimestamp, Timestamp, writeBatch, updateDoc,
} from 'firebase/firestore';
import { FiMessageCircle, FiXCircle, FiSend, FiPaperclip, FiImage } from 'react-icons/fi';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

// ─── component ────────────────────────────────────────────────────────────────

export default function SupportButton() {
  const { user, userProfile } = useAuth();

  const [open, setOpen]                     = useState(false);
  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState('');
  const [sending, setSending]               = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [imagesToday, setImagesToday]       = useState(0);
  const [imageTooltip, setImageTooltip]     = useState(false);
  const [unread, setUnread]                 = useState(0);
  const [chatReady, setChatReady]           = useState(false);
  const [isDark, setIsDark]                 = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);
  const unsubMsg    = useRef(null);
  const unsubChat   = useRef(null);

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // scroll to bottom when messages change
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // auto-grow textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + 'px';
  }, [text]);

  // watch unread badge while closed
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'supportChats', user.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setUnread(snap.data().unreadUser || 0);
    });
    unsubChat.current = unsub;
    return () => unsub();
  }, [user]);

  // ── subscribe to messages ──────────────────────────────────────────────────
  const subscribeMessages = (uid) => {
    unsubMsg.current?.();
    // No orderBy — avoids needing composite Firestore index, sort client-side
    const q = query(
      collection(db, 'supportMessages'),
      where('chatId', '==', uid)
    );
    unsubMsg.current = onSnapshot(q, async snap => {
      const now = Date.now();
      const valid = [];
      const expired = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const ts = data.createdAt?.toMillis?.() ?? now;
        if (now - ts > FIVE_DAYS) {
          expired.push(d.id);
        } else {
          valid.push({ id: d.id, ...data });
        }
      });
      // purge expired
      if (expired.length) {
        const batch = writeBatch(db);
        expired.forEach(id => batch.delete(doc(db, 'supportMessages', id)));
        batch.commit().catch(() => {});
      }
      // Sort client-side ascending by createdAt
      valid.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
      setMessages(valid);
      // count today's user images
      const dayStart = new Date(); dayStart.setHours(0,0,0,0);
      const todayCount = valid.filter(m =>
        !m.isAdmin && m.imageUrl &&
        (m.createdAt?.toMillis?.() ?? now) >= dayStart.getTime()
      ).length;
      setImagesToday(todayCount);
    });
  };

  // ── open ──────────────────────────────────────────────────────────────────
  const openChat = async () => {
    if (!user) return;
    setOpen(true);
    setChatReady(false);
    window.dispatchEvent(new Event('msf:chat-open'));

    const chatRef = doc(db, 'supportChats', user.uid);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      await setDoc(chatRef, {
        userId:    user.uid,
        userEmail: user.email || '',
        userName:  userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'User',
        userPhotoURL: userProfile?.photoURL || user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadAdmin: 0,
        unreadUser:  0,
        status: 'open',
        lastSeenAt: serverTimestamp(),
      });
    } else {
      // Update existing chat with latest photoURL in case user changed it
      await updateDoc(chatRef, { 
        unreadUser: 0, 
        lastSeenAt: serverTimestamp(),
        userPhotoURL: userProfile?.photoURL || user.photoURL || '',
      });
    }
    setUnread(0);
    setChatReady(true);
    subscribeMessages(user.uid);
  };

  // ── close ─────────────────────────────────────────────────────────────────
  const closeChat = async () => {
    setOpen(false);
    window.dispatchEvent(new Event('msf:chat-close'));
    unsubMsg.current?.();
    if (user) {
      updateDoc(doc(db, 'supportChats', user.uid), {
        lastSeenAt: serverTimestamp(), unreadUser: 0,
      }).catch(() => {});
    }
  };

  // ── send text ─────────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault();
    const msg = text.trim();
    if (!msg || sending || !user) return;
    setSending(true);
    setText('');
    try {
      const expiresAt = Timestamp.fromMillis(Date.now() + FIVE_DAYS);
      // Add message — use Timestamp.now() NOT serverTimestamp() so orderBy works immediately
      await addDoc(collection(db, 'supportMessages'), {
        chatId:   user.uid,
        senderId: user.uid,
        isAdmin:  false,
        message:  msg,
        createdAt: Timestamp.now(),
        expiresAt,
      });
      // Update chat meta
      const chatSnap = await getDoc(doc(db, 'supportChats', user.uid));
      const prevUnread = chatSnap.data()?.unreadAdmin ?? 0;
      await updateDoc(doc(db, 'supportChats', user.uid), {
        updatedAt:     serverTimestamp(),
        lastMessage:   msg,
        lastMessageAt: Timestamp.now(),
        unreadAdmin:   prevUnread + 1,
        status: 'open',
      });
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  // ── send image ────────────────────────────────────────────────────────────
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (imagesToday >= 3) {
      setImageTooltip(true);
      setTimeout(() => setImageTooltip(false), 2500);
      return;
    }
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;

    setUploadProgress(0);
    try {
      const folder = `support/${user.uid}`;
      const result = await uploadToCloudinary(file, folder, p => setUploadProgress(p));

      if (!result?.url) throw new Error(result?.error || 'Upload failed');

      const expiresAt = Timestamp.fromMillis(Date.now() + FIVE_DAYS);
      await addDoc(collection(db, 'supportMessages'), {
        chatId:    user.uid,
        senderId:  user.uid,
        isAdmin:   false,
        message:   '',
        imageUrl:  result.url,
        createdAt: Timestamp.now(),
        expiresAt,
      });
      const chatSnap = await getDoc(doc(db, 'supportChats', user.uid));
      const prevUnread = chatSnap.data()?.unreadAdmin ?? 0;
      await updateDoc(doc(db, 'supportChats', user.uid), {
        updatedAt:     serverTimestamp(),
        lastMessage:   '📷 Image',
        lastMessageAt: Timestamp.now(),
        unreadAdmin:   prevUnread + 1,
        status: 'open',
      });
    } catch (err) {
      console.error('Image upload error:', err);
    } finally {
      setUploadProgress(null);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button - Dashboard theme color (smaller on mobile, right side) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        {!open && (
          <button
            onClick={openChat}
            className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 text-white"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)'
            }}
            aria-label="Support"
          >
            <FiMessageCircle className="w-5 h-5 sm:w-[26px] sm:h-[26px]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 sm:min-w-[20px] sm:h-5 px-1 rounded-full bg-red-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center animate-pulse">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Chat window - Theme aware (full width on mobile) */}
      {open && (
        <div
          className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl h-[calc(100dvh-130px)] sm:h-[560px] w-auto sm:w-[370px] ${
            isDark 
              ? 'bg-dark-900 border-primary-500/20' 
              : 'bg-white border-dark-200'
          } border`}
          style={{ maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 80px)' }}
        >
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">Support</span>
              <span className="flex items-center gap-1 text-xs text-white/90">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Online
              </span>
            </div>
            <button onClick={closeChat} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <FiXCircle size={18} />
            </button>
          </div>

          {/* Messages area - Dark/Light theme */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0"
            style={{
              background: isDark ? 'rgb(23, 23, 23)' : 'rgb(255, 255, 255)'
            }}
          >
            {messages.length === 0 && chatReady && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                    }}
                >
                  <FiMessageCircle size={28} className="text-white" />
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Send a message and our support team will reply shortly.
                </p>
              </div>
            )}

            {messages.map(msg => {
              const mine = !msg.isAdmin;
              return (
                <div key={msg.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && (
                    <span className={`text-[10px] font-medium ml-1 mb-0.5 ${
                      isDark ? 'text-primary-400' : 'text-primary-600'
                    }`}>
                      Support Team
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 text-sm break-words ${
                      mine 
                        ? `rounded-t-2xl rounded-bl-2xl rounded-br-md ${isDark ? 'text-white' : 'text-gray-800'}`
                        : `rounded-t-2xl rounded-br-2xl rounded-bl-md text-white`
                    }`}
                    style={
                      mine 
                        ? { background: isDark ? '#1D4ED8' : '#DBEAFE' }
                        : { background: 'rgb(14, 110, 227)' }
                    }
                  >
                    {msg.imageUrl && (
                      <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={msg.imageUrl} alt="img" className="rounded-lg mb-1 cursor-pointer hover:opacity-90" style={{ maxWidth: '220px', maxHeight: '220px', objectFit: 'cover' }} />
                      </a>
                    )}
                    {msg.message && <span className="whitespace-pre-wrap">{msg.message}</span>}
                  </div>
                  <span className={`text-[10px] mt-0.5 px-1 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="flex flex-col items-end gap-1 px-1">
                <div className={`w-4/5 rounded-full h-1.5 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}>
                  <div 
                    className="h-1.5 rounded-full transition-all" 
                    style={{ 
                      width: `${uploadProgress}%`, 
                      background: 'rgb(14, 110, 227)'
                    }} 
                  />
                </div>
                <span className={`text-[10px] ${
                  isDark ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Uploading {uploadProgress}%
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar - Theme aware */}
          <div className={`flex-shrink-0 px-3 py-2.5 border-t ${
            isDark 
              ? 'border-gray-700/50' 
              : 'border-gray-200'
          }`}
            style={{ background: isDark ? '#0f1419' : '#f9fafb' }}>
            {/* Image limit badge */}
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className={`text-[10px] ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                Max 3 images/day
              </span>
              <span className={`text-[10px] font-bold ${
                imagesToday >= 3 
                  ? 'text-red-400' 
                  : isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {imagesToday}/3 used
              </span>
            </div>
            <div 
              className={`flex items-end gap-2 rounded-xl px-3 py-2 border ${
                isDark 
                  ? 'border-primary-500/20' 
                  : 'border-gray-200'
              }`}
              style={{ background: isDark ? '#16213e' : '#e5e7eb' }}
            >
              {/* Image button */}
              <div className="relative flex-shrink-0 mb-0.5">
                <button
                  type="button"
                  onClick={() => { 
                    if (imagesToday >= 3) { 
                      setImageTooltip(true); 
                      setTimeout(() => setImageTooltip(false), 2500); 
                    } else { 
                      fileRef.current?.click(); 
                    } 
                  }}
                  className={`p-1 transition-colors ${
                    imagesToday >= 3 
                      ? 'text-gray-600 cursor-not-allowed' 
                      : isDark 
                        ? 'text-gray-400 hover:text-primary-400' 
                        : 'text-gray-500 hover:text-primary-600'
                  }`}
                  title={imagesToday >= 3 ? '3/3 images used today' : 'Attach image'}
                >
                  <FiImage size={18} />
                </button>
                {imageTooltip && (
                  <div className={`absolute bottom-9 left-0 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap shadow-lg z-10 border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-gray-900 border-gray-800'
                  }`}>
                    3/3 images used today
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImage} />
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type a message..."
                rows={1}
                className={`flex-1 bg-transparent text-sm outline-none resize-none leading-5 ${
                  isDark 
                    ? 'text-white placeholder-gray-500' 
                    : 'text-gray-800 placeholder-gray-400'
                }`}
                style={{ maxHeight: '80px' }}
              />

              {/* Send */}
              <button
                type="button"
                onClick={sendMessage}
                disabled={!text.trim() || sending}
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 text-white"
                style={{ 
                  background: text.trim() 
                    ? 'rgb(14, 110, 227)'
                    : isDark ? '#1f2937' : '#9ca3af',
                  boxShadow: text.trim() ? '0 4px 12px rgba(14, 110, 227, 0.3)' : 'none'
                }}
              >
                <FiSend size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
