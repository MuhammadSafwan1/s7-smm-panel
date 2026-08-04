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
  setDoc,
} from 'firebase/firestore';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import { cachedQuery } from '@/lib/cache';
import {
  FiMessageSquare,
  FiSearch,
  FiSend,
  FiPaperclip,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiInbox,
  FiTrash2,
  FiPlus,
  FiX,
  FiMail,
  FiUser,
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

function Avatar({ name, photoURL, size = 10 }) {
  const colors = [
    'bg-purple-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-red-600',
    'bg-yellow-600',
    'bg-pink-600',
  ];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  
  // If photoURL exists, show image instead of initials
  if (photoURL) {
    return (
      <div
        className="rounded-full flex-shrink-0 overflow-hidden border-2 border-purple-500/30"
        style={{ minWidth: `${size * 4}px`, minHeight: `${size * 4}px`, width: `${size * 4}px`, height: `${size * 4}px` }}
      >
        <img
          src={photoURL}
          alt={name || 'User'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  
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
  const [userPhotoFallback, setUserPhotoFallback] = useState({});
  
  // New conversation modal states
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);

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
      // Fetch user photoURL fallback if missing from chat doc
      const chat = chats.find((c) => c.id === chatId);
      if (chat && !chat.userPhotoURL && !userPhotoFallback[chatId]) {
        try {
          const userSnap = await getDoc(doc(db, 'users', chatId));
          if (userSnap.exists()) {
            const url = userSnap.data().photoURL || '';
            if (url) setUserPhotoFallback((p) => ({ ...p, [chatId]: url }));
          }
        } catch {}
      }
    },
    [subscribeMessages, chats, userPhotoFallback]
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

      const chatSnap = await cachedQuery(`chat:${selectedChatId}`, () => getDoc(doc(db, 'supportChats', selectedChatId)), 30000);
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

      const chatSnap = await cachedQuery(`chat:${selectedChatId}`, () => getDoc(doc(db, 'supportChats', selectedChatId)), 30000);
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

  // ── delete chat ────────────────────────────────────────────────────────────
  const deleteChat = async (chatId, e) => {
    e?.stopPropagation(); // Prevent selecting chat when clicking delete
    
    if (!confirm('Are you sure you want to delete this chat? This will remove all messages.')) {
      return;
    }

    try {
      // Delete all messages associated with this chat
      const messagesQuery = query(
        collection(db, 'supportMessages'),
        where('chatId', '==', chatId)
      );
      const messagesSnap = await cachedQuery('collection:supportMessages-' + chatId, () => getDocs(messagesQuery), 30000);
      const batch = writeBatch(db);
      
      messagesSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete the chat document
      batch.delete(doc(db, 'supportChats', chatId));
      
      await batch.commit();

      // If this was the selected chat, clear selection
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete chat error:', err);
      alert('Failed to delete chat. Please try again.');
    }
  };

  // ── keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Load all registered users ─────────────────────────────────────────────
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map(doc => ({
        uid: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName || doc.data().email?.split('@')[0] || 'User',
        photoURL: doc.data().photoURL || null,
        banned: doc.data().banned || false,
        disabled: doc.data().disabled || false,
      })).filter(u => !u.banned && !u.disabled); // Filter out banned/disabled users
      
      setAllUsers(usersList);
      // Initially show only first 25 users
      setFilteredUsers(usersList.slice(0, 25));
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ── Filter users based on search ──────────────────────────────────────────
  useEffect(() => {
    if (!userSearch.trim()) {
      // No search, show only first 25 users
      setFilteredUsers(allUsers.slice(0, 25));
      return;
    }
    
    const s = userSearch.toLowerCase();
    // When searching, search through ALL users
    const filtered = allUsers.filter(u => 
      u.displayName.toLowerCase().includes(s) || 
      u.email.toLowerCase().includes(s)
    );
    setFilteredUsers(filtered);
  }, [userSearch, allUsers]);

  // ── Create new conversation with user ─────────────────────────────────────
  const startChatWithUser = async (selectedUser) => {
    try {
      // Check if chat already exists
      const existingChat = chats.find(c => c.id === selectedUser.uid);
      
      if (existingChat) {
        // Chat exists, just select it
        setShowNewChatModal(false);
        setUserSearch('');
        selectChat(existingChat.id);
        return;
      }

      // Create new chat document
      const chatRef = doc(db, 'supportChats', selectedUser.uid);
      
      const chatData = {
        userId: selectedUser.uid,
        userName: selectedUser.displayName,
        userEmail: selectedUser.email,
        userPhotoURL: selectedUser.photoURL || '',
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: Timestamp.now(),
        unreadUser: 0,
        unreadAdmin: 0,
      };

      console.log('Creating chat with data:', chatData);
      await setDoc(chatRef, chatData);
      console.log('Chat created successfully!');

      // Close modal and select the new chat
      setShowNewChatModal(false);
      setUserSearch('');
      
      // Wait a bit for Firestore to sync
      setTimeout(() => {
        selectChat(selectedUser.uid);
      }, 500);
      
    } catch (err) {
      console.error('Error starting chat:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      alert(`Failed to start conversation: ${err.message}`);
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
  const userPhoto = selectedChat?.userPhotoURL || (selectedChatId ? userPhotoFallback[selectedChatId] : '');

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
          onClick={() => {
            setShowNewChatModal(true);
            loadAllUsers();
          }}
          className="glass-card px-4 py-2 flex items-center gap-2 text-sm text-white hover:bg-blue-600/20 transition-colors"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' }}
        >
          <FiPlus size={15} />
          New Chat
        </button>
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
                <div
                  key={chat.id}
                  className={`w-full flex items-center gap-2 px-3 py-3 transition-colors border-b group ${
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
                  <button
                    onClick={() => selectChat(chat.id)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <Avatar name={chat.userName || chat.userEmail} photoURL={chat.userPhotoURL || userPhotoFallback[chat.id]} size={10} />
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
                  
                  {/* Delete button - shows on hover */}
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 flex-shrink-0"
                    aria-label="Delete chat"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
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
                  <Avatar name={selectedChat?.userName || selectedChat?.userEmail} photoURL={userPhoto} size={10} />
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
                          <div className="flex items-center gap-2 mb-1 ml-1">
                            <Avatar name={selectedChat?.userName || 'User'} photoURL={userPhoto} size={6} />
                            <span className={`text-[10px] font-medium ${
                              isDark ? 'text-primary-400' : 'text-primary-600'
                            }`}>
                              {selectedChat?.userName || 'User'}
                            </span>
                          </div>
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

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-dark-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                  <FiPlus className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Start New Conversation</h3>
                  <p className="text-sm text-gray-400">Search and select a user to message</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setUserSearch('');
                }}
                className="p-2 rounded-lg hover:bg-dark-700 text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-6 border-b border-dark-700 flex-shrink-0">
              <div className="flex items-center gap-3 bg-dark-900 rounded-xl px-4 py-3 border border-dark-700">
                <FiSearch className="text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {userSearch 
                  ? `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found` 
                  : `Showing first 25 users (${allUsers.length} total)`
                }
              </p>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="sm" />
                  <span className="ml-3 text-gray-400">Loading users...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FiUsers className="text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400 text-sm">
                    {userSearch ? 'No users found matching your search' : 'No users registered yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((u) => {
                    const hasExistingChat = chats.find(c => c.id === u.uid);
                    return (
                      <button
                        key={u.uid}
                        onClick={() => startChatWithUser(u)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-900 border border-dark-700 hover:border-blue-500 hover:bg-dark-700 transition-all group"
                      >
                        <div className="relative">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/30 group-hover:border-blue-500"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-blue-500/30 group-hover:border-blue-500">
                              {getInitials(u.displayName)}
                            </div>
                          )}
                          {hasExistingChat && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-dark-900 flex items-center justify-center">
                              <FiCheckCircle size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-white truncate">{u.displayName}</p>
                            {hasExistingChat && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                                Active Chat
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 truncate flex items-center gap-1">
                            <FiMail size={12} />
                            {u.email}
                          </p>
                        </div>
                        <div className="text-blue-400 group-hover:text-blue-300 transition-colors">
                          <FiMessageSquare size={20} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
