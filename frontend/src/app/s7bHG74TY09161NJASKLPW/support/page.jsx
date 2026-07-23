'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/common/Loader';
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch,
  updateDoc,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import {
  FiMessageSquare,
  FiSearch,
  FiSend,
  FiPaperclip,
  FiRefreshCw,
  FiCheckCircle,
  FiX,
  FiUsers,
  FiInbox,
} from 'react-icons/fi';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return (
    date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

function sevenDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 5); // Changed from 7 to 5 days
  return Timestamp.fromDate(d);
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 10 }) {
  const colors = [
    'bg-purple-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-red-600',
    'bg-yellow-600',
    'bg-pink-600',
  ];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${colors[idx]}`}
      style={{ fontSize: size >= 10 ? '16px' : '12px', minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function AdminSupportPage() {
  const { user } = useAuth();

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDark, setIsDark] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const unsubChatsRef = useRef(null);
  const unsubMsgsRef = useRef(null);

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

  // ── scroll to bottom ───────────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages]);

  // ── auto-grow textarea ─────────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 80) + 'px';
    }
  }, [text]);

  // ── subscribe to all chats ─────────────────────────────────────────────────
  const subscribeChats = useCallback(() => {
    setChatsLoading(true);
    unsubChatsRef.current?.();

    // Query all chats, sort client-side to avoid needing Firestore index
    const q = query(collection(db, 'supportChats'));

    unsubChatsRef.current = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTs = a.lastMessageAt?.toMillis?.() ?? 0;
          const bTs = b.lastMessageAt?.toMillis?.() ?? 0;
          return bTs - aTs; // descending
        });
      setChats(list);
      setChatsLoading(false);
    });
  }, []);

  useEffect(() => {
    subscribeChats();
    return () => {
      unsubChatsRef.current?.();
      unsubMsgsRef.current?.();
    };
  }, [subscribeChats]);

  // ── subscribe to messages for selected chat ────────────────────────────────
  const subscribeMessages = useCallback((chatId) => {
    setMsgsLoading(true);
    unsubMsgsRef.current?.();

    // Query WITHOUT orderBy to avoid needing a composite index
    // Sort client-side instead
    const q = query(
      collection(db, 'supportMessages'),
      where('chatId', '==', chatId)
    );

    unsubMsgsRef.current = onSnapshot(q, async (snap) => {
      const now = Date.now();
      const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000; // Changed from 7 to 5 days
      const toDelete = [];
      const valid = [];

      snap.docs.forEach((d) => {
        const data = d.data();
        const ts = data.createdAt?.toMillis?.() ?? now;
        if (now - ts > FIVE_DAYS) { // Changed from SEVEN_DAYS to FIVE_DAYS
          toDelete.push(d.id);
        } else {
          valid.push({ id: d.id, ...data });
        }
      });

      if (toDelete.length > 0) {
        const batch = writeBatch(db);
        toDelete.forEach((id) => batch.delete(doc(db, 'supportMessages', id)));
        batch.commit().catch(() => {});
      }

      // Sort client-side by createdAt ascending
      valid.sort((a, b) => {
        const aTs = a.createdAt?.toMillis?.() ?? 0;
        const bTs = b.createdAt?.toMillis?.() ?? 0;
        return aTs - bTs;
      });

      setMessages(valid);
      setMsgsLoading(false);
    });
  }, []);

  const selectChat = useCallback(
    async (chatId) => {
      setSelectedChatId(chatId);
      subscribeMessages(chatId);
      // Reset unread for admin
      await updateDoc(doc(db, 'supportChats', chatId), {
        unreadAdmin: 0,
      }).catch(() => {});
    },
    [subscribeMessages]
  );

  // ── send message (admin) ───────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending || !selectedChatId || !user) return;
    setSending(true);
    const msgText = text.trim();
    setText('');

    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'supportMessages'), {
        chatId: selectedChatId,
        senderId: 'admin',
        isAdmin: true,
        message: msgText,
        createdAt: Timestamp.now(),
        expiresAt,
      });

      const chatSnap = await getDoc(doc(db, 'supportChats', selectedChatId));
      const currentUnread = chatSnap.data()?.unreadUser || 0;

      await updateDoc(doc(db, 'supportChats', selectedChatId), {
        updatedAt: serverTimestamp(),
        lastMessage: msgText,
        lastMessageAt: Timestamp.now(),
        unreadAdmin: 0,
        unreadUser: currentUnread + 1,
        status: 'open',
      });
    } catch (err) {
      console.error('Admin send error:', err);
    } finally {
      setSending(false);
    }
  };

  // ── send image (admin) ─────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedChatId || !user) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;

    setUploadProgress(0);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const folder = `support/admin`;
      const result = await uploadToCloudinary(file, folder, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      if (!result?.url) throw new Error(result?.error || 'Upload failed');

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + 7 * 24 * 60 * 60 * 1000);

      await addDoc(collection(db, 'supportMessages'), {
        chatId: selectedChatId,
        senderId: 'admin',
        isAdmin: true,
        message: '',
        imageUrl: result.url,
        createdAt: Timestamp.now(),
        expiresAt,
      });

      const chatSnap = await getDoc(doc(db, 'supportChats', selectedChatId));
      const currentUnread = chatSnap.data()?.unreadUser || 0;

      await updateDoc(doc(db, 'supportChats', selectedChatId), {
        updatedAt: serverTimestamp(),
        lastMessage: '📷 Image',
        lastMessageAt: Timestamp.now(),
        unreadAdmin: 0,
        unreadUser: currentUnread + 1,
      });
    } catch (err) {
      console.error('Admin image upload error:', err);
    } finally {
      setUploadProgress(null);
    }
  };

  // ── close conversation ─────────────────────────────────────────────────────
  const closeConversation = async (chatId) => {
    await updateDoc(doc(db, 'supportChats', chatId), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  };

  // ── keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── computed stats ─────────────────────────────────────────────────────────
  const totalChats = chats.length;
  const openChats = chats.filter((c) => c.status === 'open').length;
  const unreadTotal = chats.reduce((acc, c) => acc + (c.unreadAdmin || 0), 0);

  // ── filtered chats ─────────────────────────────────────────────────────────
  const filteredChats = chats.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.userName || '').toLowerCase().includes(s) ||
      (c.userEmail || '').toLowerCase().includes(s)
    );
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-0">
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-6 flex-1">
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}>
              <FiUsers className="text-white" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-base font-bold text-white">{totalChats}</p>
            </div>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4169E1 0%, #6495ED 100%)' }}>
              <FiMessageSquare className="text-white" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Open</p>
              <p className="text-base font-bold text-white">{openChats}</p>
            </div>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}>
              <FiInbox className="text-white" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Unread</p>
              <p className="text-base font-bold text-white">{unreadTotal}</p>
            </div>
          </div>
        </div>
        <button
          onClick={subscribeChats}
          className="glass-card px-4 py-2 flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          <FiRefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0 gap-0 rounded-2xl overflow-hidden border border-white/5" style={{ background: isDark ? 'rgb(23, 23, 23)' : 'rgb(255, 255, 255)' }}>
        {/* ── LEFT: Chat list ── */}
        <div
          className="w-[300px] flex-shrink-0 flex flex-col border-r"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* Search */}
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: '#1e1e2e' }}
            >
              <FiSearch size={14} className="text-gray-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {chatsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner size="sm" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                <FiMessageSquare size={24} className="text-gray-600" />
                <p className="text-xs text-gray-500">No conversations yet</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left border-b ${
                    selectedChatId === chat.id
                      ? 'border-transparent'
                      : 'hover:bg-white/5 border-transparent'
                  }`}
                  style={selectedChatId === chat.id ? {
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                    borderBottom: '1px solid rgba(124, 58, 237, 0.3)'
                  } : {
                    borderBottomColor: 'rgba(255,255,255,0.04)'
                  }}
                >
                  <Avatar name={chat.userName || chat.userEmail} size={10} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium text-white truncate">
                        {chat.userName || 'User'}
                      </span>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-xs text-gray-400 truncate">
                        {chat.lastMessage || 'No messages'}
                      </span>
                      {chat.unreadAdmin > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {chat.unreadAdmin > 99 ? '99+' : chat.unreadAdmin}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 truncate">{chat.userEmail}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Chat view ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedChatId ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
              >
                <FiMessageSquare size={30} className="text-white" />
              </div>
              <div className="text-center">
                <p className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Select a conversation</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Choose from the left panel to start replying</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={selectedChat?.userName || selectedChat?.userEmail} size={10} />
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {selectedChat?.userName || 'User'}
                    </p>
                    <p className="text-white/80 text-xs">{selectedChat?.userEmail}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${
                      selectedChat?.status === 'open'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {selectedChat?.status === 'open' ? '● Open' : '○ Closed'}
                  </span>
                </div>
                {selectedChat?.status === 'open' && (
                  <button
                    onClick={() => closeConversation(selectedChatId)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white hover:bg-white/20 transition-colors border border-white/30 bg-white/10"
                  >
                    <FiCheckCircle size={13} />
                    Close
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: isDark ? 'rgb(23, 23, 23)' : 'rgb(255, 255, 255)' }}>
                {msgsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Spinner size="sm" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.isAdmin;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        {!isAdmin && (
                          <span className={`text-[10px] font-medium ml-1 mb-0.5 ${
                            isDark ? 'text-primary-400' : 'text-primary-600'
                          }`}>
                            {selectedChat?.userName || 'User'}
                          </span>
                        )}
                        <div
                          className={`max-w-[70%] px-3 py-2 text-sm text-white break-words ${
                            isAdmin
                              ? 'rounded-t-2xl rounded-bl-2xl rounded-br-md'
                              : 'rounded-t-2xl rounded-br-2xl rounded-bl-md'
                          }`}
                          style={
                            isAdmin
                              ? {
                                  background: 'rgb(14, 110, 227)',
                                  boxShadow: '0 4px 12px rgba(14, 110, 227, 0.25)',
                                }
                              : {
                                  background: isDark ? '#1D4ED8' : '#DBEAFE',
                                  color: isDark ? 'white' : '#1f2937',
                                }
                          }
                        >
                          {msg.imageUrl && (
                            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                              <img
                                src={msg.imageUrl}
                                alt="attachment"
                                className="rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{
                                  maxWidth: '220px',
                                  maxHeight: '220px',
                                  objectFit: 'cover',
                                }}
                              />
                            </a>
                          )}
                          {msg.message && <span>{msg.message}</span>}
                        </div>
                        <span className={`text-[10px] mt-0.5 px-1 ${
                          isDark ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}

                {uploadProgress !== null && (
                  <div className="flex flex-col items-end gap-1">
                    <div className={`w-[60%] rounded-full h-1.5 ${
                      isDark ? 'bg-gray-700' : 'bg-gray-300'
                    }`}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-200"
                        style={{
                          width: `${uploadProgress}%`,
                          background: 'rgb(14, 110, 227)',
                        }}
                      />
                    </div>
                    <span className={`text-[10px] ${
                      isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>Uploading {uploadProgress}%</span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <div
                className="flex-shrink-0 px-4 py-3 border-t"
                style={{ background: isDark ? '#0f1419' : '#f9fafb', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="flex items-end gap-2 rounded-xl px-3 py-2"
                  style={{
                    background: isDark ? '#16213e' : '#e5e7eb',
                    border: '1px solid rgba(124,58,237,0.2)',
                  }}
                >
                  {/* Image button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-purple-400 transition-colors p-1 flex-shrink-0 mb-0.5"
                    aria-label="Attach image"
                  >
                    <FiPaperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Reply as admin..."
                    rows={1}
                    className={`flex-1 bg-transparent text-sm placeholder-gray-500 outline-none resize-none leading-5 ${
                      isDark ? 'text-white' : 'text-gray-800'
                    }`}
                    style={{ maxHeight: '80px' }}
                  />

                  {/* Send */}
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!text.trim() || sending}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                    style={{
                      background: text.trim()
                        ? 'rgb(14, 110, 227)'
                        : isDark ? '#1f2937' : '#9ca3af',
                      boxShadow: text.trim() ? '0 4px 12px rgba(14, 110, 227, 0.3)' : 'none',
                    }}
                    aria-label="Send reply"
                  >
                    <FiSend size={15} className="text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5 ml-1">Replying as Admin</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
