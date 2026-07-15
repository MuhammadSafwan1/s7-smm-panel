'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, where, limit } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiTrash2, FiEdit2, FiPlus, FiBell, FiX } from 'react-icons/fi';
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
    type: 'info', // info, success, warning, new_service
    serviceIds: [] // CHANGED: Array of service IDs
  });

  const [serviceDetails, setServiceDetails] = useState([]); // CHANGED: Array of services
  const [loadingService, setLoadingService] = useState(false);
  const [currentServiceInput, setCurrentServiceInput] = useState(''); // NEW: Temporary input field

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and Message are required');
      return;
    }

    try {
      const announcementData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      // Add service details if service IDs provided
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
    if (!serviceId.trim()) {
      return null;
    }

    try {
      const trimmedId = serviceId.trim();
      
      // Try 1: Get document by Firestore document ID directly
      const serviceDocRef = doc(db, 'services', trimmedId);
      const serviceSnapshot = await getDoc(serviceDocRef);
      
      if (serviceSnapshot.exists()) {
        return { id: serviceSnapshot.id, ...serviceSnapshot.data() };
      }
      
      // Try 2: Search by serviceId field (the purple #1, #2, etc)
      const servicesQuery = query(
        collection(db, 'services'), 
        where('serviceId', '==', trimmedId),
        limit(1)
      );
      const querySnapshot = await getDocs(servicesQuery);
      
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      
      // Try 3: Search by serviceId as number (if user enters just "1" instead of "1")
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

    // Check if already added
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
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type || 'info',
      serviceIds: announcement.serviceIds || []
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
    setFormData({ title: '', message: '', type: 'info', serviceIds: [] });
    setServiceDetails([]);
    setCurrentServiceInput('');
    setEditingId(null);
    setShowModal(false);
  };

  const getTypeConfig = (type) => {
    return announcementTypes.find(t => t.value === type) || announcementTypes[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white">Announcements</h2>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
            Create announcements for new services, updates, or important notices
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> New Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.map((announcement) => {
          const typeConfig = getTypeConfig(announcement.type);
          return (
            <div
              key={announcement.id}
              className="glass-card p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{typeConfig.emoji}</span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-500/20 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`}>
                      {typeConfig.label}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">
                    {announcement.title}
                  </h3>
                  <p className="text-dark-600 dark:text-dark-300 whitespace-pre-wrap">
                    {announcement.message}
                  </p>
                  <p className="text-xs text-dark-400 mt-3">
                    {announcement.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                    title="Edit"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 transition-all"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {announcements.length === 0 && (
        <div className="text-center py-12 glass-card">
          <FiBell className="text-6xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-dark-500 dark:text-dark-400">No announcements yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4"
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
            <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 glass-card border-b border-dark-200 dark:border-dark-700 p-6 mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                  {editingId ? 'Edit Announcement' : 'New Announcement'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {announcementTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          formData.type === type.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                            : 'border-dark-200 dark:border-dark-700 hover:border-dark-300 dark:hover:border-dark-600'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.emoji}</div>
                        <div className="text-xs font-semibold">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="New Instagram Followers Service Added!"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1">{formData.title.length}/100</p>
                </div>

                {/* Service ID Field - Optional */}
                {formData.type === 'new_service' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Add Services (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentServiceInput}
                        onChange={(e) => setCurrentServiceInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                        className="input-field font-mono text-sm flex-1"
                        placeholder="Enter service #number (1, 2) or Firestore ID"
                        disabled={loadingService}
                      />
                      <button
                        type="button"
                        onClick={handleAddService}
                        disabled={loadingService}
                        className="btn-primary px-6 disabled:opacity-50"
                      >
                        {loadingService ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                    <p className="text-xs text-dark-400 mt-1">
                      Enter service number (1, 2, 3...) or Firestore document ID and click Add
                    </p>
                    
                    {/* Added Services List */}
                    {serviceDetails.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {serviceDetails.map((service, index) => (
                          <div key={index} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-start gap-3 hover:bg-slate-800/90 transition-colors">
                            {/* Service ID on left - light navy blue */}
                            <div className="flex-shrink-0">
                              <span className="text-sm px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-400/30 inline-block">
                                #{service.serviceId}
                              </span>
                            </div>
                            {/* Service details */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-white truncate mb-1.5">{service.name}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-400">Price:</span>
                                  <span className="ml-1 font-semibold text-cyan-400">
                                    {format(parseFloat(service.price || 0))}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400">Min:</span>
                                  <span className="ml-1 font-semibold text-slate-300">{service.minQuantity}</span>
                                </div>
                              </div>
                            </div>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveService(index)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0 border border-transparent hover:border-red-500/30"
                              title="Remove service"
                            >
                              <FiX />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-field min-h-[150px]"
                    placeholder="We've added a new high-quality Instagram Followers service with instant delivery. Check it out now!"
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1">{formData.message.length}/500</p>
                </div>

                {/* Preview */}
                <div className="border-t border-dark-200 dark:border-dark-700 pt-4">
                  <label className="block text-sm font-medium mb-2">Preview</label>
                  <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getTypeConfig(formData.type).emoji}</span>
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {getTypeConfig(formData.type).label}
                      </span>
                    </div>
                    <h4 className="font-bold text-dark-900 dark:text-white mb-1">
                      {formData.title || 'Your title here...'}
                    </h4>
                    <p className="text-sm text-dark-600 dark:text-dark-300 whitespace-pre-wrap">
                      {formData.message || 'Your message here...'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetForm} className="flex-1 btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
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
