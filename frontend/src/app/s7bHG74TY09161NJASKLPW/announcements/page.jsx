'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, where, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiTrash2, FiEdit2, FiPlus, FiBell, FiX, FiUsers, FiGlobe, FiUser } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';

export default function AdminAnnouncementsPage() {
  const { format } = useCurrency();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    serviceIds: [],
    targetUsers: [],
    sendTo: 'all'
  });

  const [serviceDetails, setServiceDetails] = useState([]);
  const [loadingService, setLoadingService] = useState(false);
  const [currentServiceInput, setCurrentServiceInput] = useState('');

  // User search state
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const announcementTypes = [
    { value: 'info', label: 'Info', color: 'blue', emoji: 'ℹ️' },
    { value: 'success', label: 'Success', color: 'green', emoji: '✅' },
    { value: 'warning', label: 'Warning', color: 'yellow', emoji: '⚠️' },
    { value: 'new_service', label: 'New Service', color: 'purple', emoji: '🆕' },
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const term = searchTerm.toLowerCase().trim();
      
      // Search by email (prefix match)
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '>=', term),
        where('email', '<=', term + '\uf8ff'),
        limit(10)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      // Search by name (prefix match)
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', term),
        where('displayName', '<=', term + '\uf8ff'),
        limit(10)
      );
      const nameSnapshot = await getDocs(nameQuery);

      // Search by username (prefix match)
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '>=', term),
        where('username', '<=', term + '\uf8ff'),
        limit(10)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      // Merge results, avoid duplicates
      const resultsMap = new Map();
      
      [...emailSnapshot.docs, ...nameSnapshot.docs, ...usernameSnapshot.docs].forEach(doc => {
        if (!resultsMap.has(doc.id)) {
          const data = doc.data();
          resultsMap.set(doc.id, {
            uid: doc.id,
            email: data.email || '',
            displayName: data.displayName || data.username || '',
            username: data.username || ''
          });
        }
      });

      setUserSearchResults(Array.from(resultsMap.values()));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddUser = (user) => {
    if (formData.targetUsers.includes(user.uid)) {
      toast.error('User already added');
      return;
    }
    setSelectedUsers([...selectedUsers, user]);
    setFormData({ ...formData, targetUsers: [...formData.targetUsers, user.uid] });
    setUserSearchInput('');
    setUserSearchResults([]);
  };

  const handleRemoveUser = (uid) => {
    setSelectedUsers(selectedUsers.filter(u => u.uid !== uid));
    setFormData({ ...formData, targetUsers: formData.targetUsers.filter(id => id !== uid) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and Message are required');
      return;
    }

    try {
      const announcementData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        serviceIds: formData.serviceIds,
        targetUsers: formData.sendTo === 'specific' ? formData.targetUsers : [],
        updatedAt: serverTimestamp()
      };

      if (formData.serviceIds.length > 0 && serviceDetails.length > 0) {
        announcementData.serviceDetails = serviceDetails;
      }

      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), announcementData);
        toast.success('Announcement updated successfully');
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...announcementData,
          createdAt: serverTimestamp(),
          active: true
        });
        toast.success('Announcement created successfully');
      }
      
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const fetchServiceDetails = async (serviceId) => {
    if (!serviceId.trim()) return null;

    try {
      const trimmedId = serviceId.trim();
      
      const serviceDocRef = doc(db, 'services', trimmedId);
      const serviceSnapshot = await getDoc(serviceDocRef);
      
      if (serviceSnapshot.exists()) {
        return { id: serviceSnapshot.id, ...serviceSnapshot.data() };
      }
      
      const servicesQuery = query(
        collection(db, 'services'), 
        where('serviceId', '==', trimmedId),
        limit(1)
      );
      const querySnapshot = await getDocs(servicesQuery);
      
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      
      const numericId = parseInt(trimmedId);
      if (!isNaN(numericId)) {
        const numQuery = query(
          collection(db, 'services'),
          where('serviceId', '==', numericId),
          limit(1)
        );
        const numSnapshot = await getDocs(numQuery);
        
        if (!numSnapshot.empty) {
          return { id: numSnapshot.docs[0].id, ...numSnapshot.docs[0].data() };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching service:', error);
      return null;
    }
  };

  const handleAddService = async () => {
    if (!currentServiceInput.trim()) {
      toast.error('Please enter a service ID');
      return;
    }

    if (formData.serviceIds.includes(currentServiceInput.trim())) {
      toast.error('Service already added');
      return;
    }

    setLoadingService(true);
    const service = await fetchServiceDetails(currentServiceInput);
    
    if (service) {
      setServiceDetails([...serviceDetails, service]);
      setFormData({ 
        ...formData, 
        serviceIds: [...formData.serviceIds, currentServiceInput.trim()] 
      });
      setCurrentServiceInput('');
      toast.success('Service added!');
    } else {
      toast.error('Service not found: ' + currentServiceInput);
    }
    setLoadingService(false);
  };

  const handleRemoveService = (index) => {
    const newServiceIds = formData.serviceIds.filter((_, i) => i !== index);
    const newServiceDetails = serviceDetails.filter((_, i) => i !== index);
    setFormData({ ...formData, serviceIds: newServiceIds });
    setServiceDetails(newServiceDetails);
    toast.success('Service removed');
  };

  const handleEdit = (announcement) => {
    const targetUsers = announcement.targetUsers || [];
    const isSpecific = targetUsers.length > 0;
    
    // Fetch user details for targeted users
    const usersList = targetUsers.map(uid => ({ uid, email: '', displayName: '' }));
    setSelectedUsers(usersList);
    
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type || 'info',
      serviceIds: announcement.serviceIds || [],
      targetUsers: targetUsers,
      sendTo: isSpecific ? 'specific' : 'all'
    });
    setServiceDetails(announcement.serviceDetails || []);
    setEditingId(announcement.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await deleteDoc(doc(db, 'announcements', id));
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', message: '', type: 'info', serviceIds: [], targetUsers: [], sendTo: 'all' });
    setServiceDetails([]);
    setSelectedUsers([]);
    setUserSearchInput('');
    setUserSearchResults([]);
    setCurrentServiceInput('');
    setEditingId(null);
    setShowModal(false);
  };

  const getTypeConfig = (type) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0];
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'info': return { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-600' };
      case 'success': return { bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/30', text: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-600' };
      case 'warning': return { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500' };
      case 'new_service': return { bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/30', text: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-600' };
      default: return { bg: 'bg-gray-50 dark:bg-gray-500/10', border: 'border-gray-200 dark:border-gray-500/30', text: 'text-gray-600 dark:text-gray-400', iconBg: 'bg-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Create announcements for all users or specific users
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20"
        >
          <FiPlus size={16} /> New Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => {
          const typeConfig = getTypeConfig(announcement.type);
          const typeStyles = getTypeStyles(announcement.type);
          const targetUsers = announcement.targetUsers || [];
          const isSpecific = targetUsers.length > 0;
          return (
            <div
              key={announcement.id}
              className="bg-white dark:bg-[#1a2742] rounded-2xl p-5 border border-gray-100 dark:border-[#253a5e] hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${typeStyles.iconBg} flex items-center justify-center shadow-lg`}>
                      <span className="text-lg">{typeConfig.emoji}</span>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${typeStyles.bg} ${typeStyles.border} ${typeStyles.text} border`}>
                      {typeConfig.label}
                    </span>
                    {/* Target badge */}
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      isSpecific 
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' 
                        : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                    }`}>
                      {isSpecific ? `👤 ${targetUsers.length} user(s)` : '🌍 All Users'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm">
                    {announcement.message}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                    {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                    title="Edit"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {announcements.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e]">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
            <FiBell className="text-gray-400 dark:text-gray-500" size={28} />
          </div>
          <p className="text-gray-900 dark:text-white font-semibold text-lg">No announcements yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
          >
            Create First Announcement
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={resetForm}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a2742] max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 dark:border-[#253a5e] shadow-2xl">
              <div className="sticky top-0 bg-white dark:bg-[#1a2742] border-b border-gray-100 dark:border-[#253a5e] px-6 py-5 rounded-t-2xl z-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingId ? 'Edit Announcement' : 'New Announcement'}
                  </h3>
                  <button onClick={resetForm} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <FiX size={16} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {announcementTypes.map(type => {
                      const ts = getTypeStyles(type.value);
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            formData.type === type.value
                              ? `${ts.border} ${ts.bg} border-2`
                              : 'border-gray-200 dark:border-[#253a5e] hover:border-gray-300 dark:hover:border-[#2f4a72]'
                          }`}
                        >
                          <div className="text-2xl mb-1">{type.emoji}</div>
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{type.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Send To Toggle */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Send To <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sendTo: 'all', targetUsers: [], selectedUsers: [] })}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        formData.sendTo === 'all'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                          : 'border-gray-200 dark:border-[#253a5e] hover:border-gray-300 dark:hover:border-[#2f4a72]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.sendTo === 'all' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-[#253a5e]'
                      }`}>
                        <FiGlobe className={`text-lg ${formData.sendTo === 'all' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${formData.sendTo === 'all' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>All Users</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Everyone sees this</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sendTo: 'specific' })}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        formData.sendTo === 'specific'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10'
                          : 'border-gray-200 dark:border-[#253a5e] hover:border-gray-300 dark:hover:border-[#2f4a72]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.sendTo === 'specific' ? 'bg-amber-500' : 'bg-gray-200 dark:bg-[#253a5e]'
                      }`}>
                        <FiUser className={`text-lg ${formData.sendTo === 'specific' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${formData.sendTo === 'specific' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>Specific Users</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">Only selected users</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* User Search - Only when specific is selected */}
                {formData.sendTo === 'specific' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Search Users
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearchInput}
                        onChange={(e) => {
                          setUserSearchInput(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                        placeholder="Search by email, name, or username..."
                      />
                      {searchingUsers && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                        </div>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {userSearchResults.length > 0 && (
                      <div className="mt-2 bg-white dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        {userSearchResults.map((u) => (
                          <button
                            key={u.uid}
                            type="button"
                            onClick={() => handleAddUser(u)}
                            disabled={formData.targetUsers.includes(u.uid)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                              formData.targetUsers.includes(u.uid)
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gray-50 dark:hover:bg-[#2f4a72]'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              <FiUser className="text-amber-600 dark:text-amber-400 text-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.displayName || u.username || 'User'}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</p>
                            </div>
                            {formData.targetUsers.includes(u.uid) && (
                              <span className="text-xs text-green-500 font-bold">Added</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Selected Users ({selectedUsers.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedUsers.map((u) => (
                            <div key={u.uid} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                {u.displayName || u.email || u.uid.slice(0, 8)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(u.uid)}
                                className="text-amber-500 hover:text-red-500 transition-colors"
                              >
                                <FiX size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="New Instagram Followers Service Added!"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formData.title.length}/100</p>
                </div>

                {/* Service ID Field */}
                {formData.type === 'new_service' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Add Services (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentServiceInput}
                        onChange={(e) => setCurrentServiceInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm transition-all"
                        placeholder="Enter service #number (1, 2) or Firestore ID"
                        disabled={loadingService}
                      />
                      <button
                        type="button"
                        onClick={handleAddService}
                        disabled={loadingService}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                      >
                        {loadingService ? '...' : 'Add'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Enter service number (1, 2, 3...) or Firestore document ID
                    </p>
                    
                    {serviceDetails.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {serviceDetails.map((service, index) => (
                          <div key={index} className="p-3 rounded-xl bg-gray-50 dark:bg-[#253a5e]/30 border border-gray-200 dark:border-[#253a5e] flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-200 dark:border-blue-500/30">
                                #{service.serviceId}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate mb-1">{service.name}</p>
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
                            <button
                              type="button"
                              onClick={() => handleRemoveService(index)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-all flex-shrink-0"
                              title="Remove service"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#253a5e]/50 border border-gray-200 dark:border-[#253a5e] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none transition-all"
                    placeholder="We've added a new high-quality Instagram Followers service with instant delivery."
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formData.message.length}/500</p>
                </div>

                {/* Preview */}
                <div className="border-t border-gray-100 dark:border-[#253a5e] pt-4">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview</label>
                  <div className="bg-gray-50 dark:bg-[#253a5e]/30 rounded-xl p-4 border border-gray-200 dark:border-[#253a5e]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getTypeConfig(formData.type).emoji}</span>
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {getTypeConfig(formData.type).label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        formData.sendTo === 'all' 
                          ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                          : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {formData.sendTo === 'all' ? '🌍 All Users' : `👤 ${selectedUsers.length} user(s)`}
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1 text-sm">
                      {formData.title || 'Your title here...'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                      {formData.message || 'Your message here...'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-[#253a5e] text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-[#253a5e]/50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md shadow-blue-600/20">
                    {editingId ? 'Update' : 'Create'} Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
