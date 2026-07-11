'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiCheckCircle, 
  FiXCircle,
  FiGlobe,
  FiMail
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    apiUrl: '',
    apiKey: '',
    type: 'api_v2',
    description: '',
    website: '',
    supportEmail: '',
    isActive: true,
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'providers'));
      const providersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProviders(providersList);
    } catch (error) {
      console.error('Failed to load providers:', error);
      setProviders([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const providerData = {
        ...formData,
        balance: 0,
        currency: 'USD',
        lastSyncedAt: null,
        lastCheckedAt: null,
        updatedAt: Timestamp.now(),
      };

      if (editingProvider) {
        await updateDoc(doc(db, 'providers', editingProvider.id), providerData);
        toast.success('Provider updated successfully');
      } else {
        providerData.createdAt = Timestamp.now();
        await addDoc(collection(db, 'providers'), providerData);
        toast.success('Provider added successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchProviders();
    } catch (error) {
      toast.error(error.message || 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };
  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey || '',
      type: provider.type,
      description: provider.description || '',
      website: provider.website || '',
      supportEmail: provider.supportEmail || '',
      isActive: provider.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
                                                                        
    try {
      await deleteDoc(doc(db, 'providers', id));
      toast.success('Provider deleted successfully');
      fetchProviders();
    } catch (error) {
      toast.error(error.message || 'Failed to delete provider');
    }
  };

  const toggleActive = async (provider) => {
    try {
      await updateDoc(doc(db, 'providers', provider.id), {
        isActive: !provider.isActive,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Provider ${!provider.isActive ? 'activated' : 'deactivated'}`);
      fetchProviders();
    } catch (error) {
      toast.error('Failed to update provider status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      apiUrl: '',
      apiKey: '',
      type: 'api_v2',
      description: '',
      website: '',
      supportEmail: '',
      isActive: true,
    });
    setEditingProvider(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
            Provider Management
          </h2>
          <p className="text-dark-500 dark:text-dark-400">
            Connect to any SMM provider and manage your service sources
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Provider
        </button>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : providers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
            <FiGlobe className="text-4xl text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">
            No Providers Yet
          </h3>
          <p className="text-dark-500 dark:text-dark-400 mb-6">
            Add your first provider to start importing services
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <FiPlus className="inline mr-2" />
            Add Your First Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="glass-card p-6 hover:shadow-xl transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-1">
                    {provider.name}
                  </h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 break-all">
                    {provider.apiUrl}
                  </p>
                </div>
                <div className="ml-2">
                  {provider.isActive ? (
                    <FiCheckCircle className="text-green-500 text-xl" title="Active" />
                  ) : (
                    <FiXCircle className="text-red-500 text-xl" title="Inactive" />
                  )}
                </div>
              </div>
              {/* Info */}
              {provider.description && (
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-4">
                  {provider.description}
                </p>
              )}

              {/* Metadata */}
              <div className="space-y-2 mb-4 text-xs">
                {provider.website && (
                  <div className="flex items-center gap-2 text-dark-500">
                    <FiGlobe className="flex-shrink-0" />
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary-600 truncate"
                    >
                      {provider.website}
                    </a>
                  </div>
                )}
                {provider.supportEmail && (
                  <div className="flex items-center gap-2 text-dark-500">
                    <FiMail className="flex-shrink-0" />
                    <span className="truncate">{provider.supportEmail}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleActive(provider)}
                  className={`btn-sm ${provider.isActive ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {provider.isActive ? 'Deactivate' : 'Activate'}
                </button>
                
                <button
                  onClick={() => handleEdit(provider)}
                  className="btn-outline btn-sm flex items-center justify-center gap-2"
                >
                  <FiEdit2 /> Edit
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(provider.id, provider.name)}
                className="w-full mt-2 btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-800"
              >
                <FiTrash2 className="inline mr-2" />
                Delete Provider
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-900 p-6 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-2xl font-bold text-dark-900 dark:text-white">
                {editingProvider ? 'Edit Provider' : 'Add New Provider'}
              </h3>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                Connect to any SMM API v2 compatible provider
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Provider Name */}
                <div className="md:col-span-2">
                  <label className="label">Provider Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., SMMDecent"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                  />
                </div>

                {/* API URL */}
                <div className="md:col-span-2">
                  <label className="label">API URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://provider.com/api/v2"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    className="input"
                  />
                </div>

                {/* API Key */}
                <div className="md:col-span-2">
                  <label className="label">API Key *</label>
                  <input
                    type="text"
                    required={!editingProvider}
                    placeholder="Enter your API key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="input font-mono"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="label">Website</label>
                  <input
                    type="url"
                    placeholder="https://provider.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="input"
                  />
                </div>

                {/* Support Email */}
                <div>
                  <label className="label">Support Email</label>
                  <input
                    type="email"
                    placeholder="support@provider.com"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                    className="input"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    rows="3"
                    placeholder="Brief description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-dark-200 dark:border-dark-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-outline flex-1"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingProvider ? 'Update Provider' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}