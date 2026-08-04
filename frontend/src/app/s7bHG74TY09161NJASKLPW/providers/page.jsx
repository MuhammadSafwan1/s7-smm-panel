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
  FiMail,
  FiDollarSign
} from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';
import { cachedQuery, invalidateCache } from '@/lib/cache';
import { useCurrency } from '@/context/CurrencyContext';

export default function ProvidersPage() {
  const { currency, rates, currentCurrency } = useCurrency();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showServicesListModal, setShowServicesListModal] = useState(false);
  const [fetchedServices, setFetchedServices] = useState([]);
  const [fetchingServices, setFetchingServices] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [importingServices, setImportingServices] = useState(false);
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [balances, setBalances] = useState({});

  const PROXY = 'https://smm-proxy.ms8347750.workers.dev';

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
    fetchPlatformsAndCategories();
  }, []);

  const fetchPlatformsAndCategories = async () => {
    try {
      const [platformsSnap, categoriesSnap] = await Promise.all([
        cachedQuery('collection:platforms', () => getDocs(collection(db, 'platforms')), 30000),
        cachedQuery('collection:categories', () => getDocs(collection(db, 'categories')), 30000),
      ]);
      setPlatforms(platformsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCategories(categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Failed to load platforms/categories:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const querySnapshot = await cachedQuery('collection:providers', () => getDocs(collection(db, 'providers')), 30000);
      const providersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProviders(providersList);
      providersList.forEach(p => fetchBalance(p));
    } catch (error) {
      console.error('Failed to load providers:', error);
      setProviders([]);
    }
  };

  const fetchBalance = async (provider) => {
    if (!provider.apiUrl || !provider.apiKey) return;
    setBalances(prev => ({ ...prev, [provider.id]: { ...prev[provider.id], loading: true, error: null } }));
    try {
      const res = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiUrl: provider.apiUrl, apiKey: provider.apiKey, action: 'balance' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      let balance = 0;
      if (typeof result === 'number') balance = result;
      else if (result.balance !== undefined) balance = parseFloat(result.balance) || 0;
      else if (result.data?.balance !== undefined) balance = parseFloat(result.data.balance) || 0;
      else if (result.funds !== undefined) balance = parseFloat(result.funds) || 0;
      setBalances(prev => ({ ...prev, [provider.id]: { balance, loading: false, error: null } }));
    } catch (e) {
      setBalances(prev => ({ ...prev, [provider.id]: { balance: 0, loading: false, error: e.message } }));
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
    if (!confirm(`⚠️ WARNING: This will delete ${name} and ALL its services!\n\nAre you sure you want to continue?`)) return;
    
    const loadingToast = toast.loading('Deleting provider and its services...');
    
    try {
      // Step 1: Get all services from this provider
      const servicesSnapshot = await cachedQuery('collection:services', () => getDocs(collection(db, 'services')), 30000);
      const providerServices = servicesSnapshot.docs.filter(
        doc => doc.data().providerId === id
      );
      
      // Step 2: Delete all services
      const deletePromises = providerServices.map(serviceDoc => 
        deleteDoc(doc(db, 'services', serviceDoc.id))
      );
      await Promise.all(deletePromises);
      
      // Step 3: Delete the provider
      await deleteDoc(doc(db, 'providers', id));
      
      toast.success(
        `Provider deleted successfully!\n${providerServices.length} service(s) removed.`,
        { id: loadingToast }
      );
      
      invalidateCache('collection:services');
      invalidateCache('collection:providers');
      invalidateCache('services:');
      fetchProviders();
    } catch (error) {
      toast.error(error.message || 'Failed to delete provider', { id: loadingToast });
    }
  };

  const toggleActive = async (provider) => {
    const newStatus = !provider.isActive;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (!confirm(`This will ${action} ${provider.name} and ALL its services!\n\nContinue?`)) return;
    
    const loadingToast = toast.loading(`${action === 'activate' ? 'Activating' : 'Deactivating'} provider and services...`);
    
    try {
      // Step 1: Update provider status
      await updateDoc(doc(db, 'providers', provider.id), {
        isActive: newStatus,
        updatedAt: Timestamp.now(),
      });
      
      // Step 2: Get all services from this provider
      const servicesSnapshot = await cachedQuery('collection:services', () => getDocs(collection(db, 'services')), 30000);
      const providerServices = servicesSnapshot.docs.filter(
        doc => doc.data().providerId === provider.id
      );
      
      // Step 3: Update all services status
      const updatePromises = providerServices.map(serviceDoc => 
        updateDoc(doc(db, 'services', serviceDoc.id), {
          isActive: newStatus,
          updatedAt: Timestamp.now(),
        })
      );
      await Promise.all(updatePromises);
      
      toast.success(
        `Provider ${action}d successfully!\n${providerServices.length} service(s) ${action}d.`,
        { id: loadingToast }
      );
      
      fetchProviders();
    } catch (error) {
      toast.error(`Failed to ${action} provider`, { id: loadingToast });
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

  const fetchServicesFromProvider = async (provider) => {
    setSelectedProvider(provider);
    setFetchingServices(true);
    setShowServicesListModal(true);
    setFetchedServices([]);
    setSelectedServices([]);

    try {
      const response = await fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: provider.apiUrl,
          apiKey: provider.apiKey,
          action: 'services',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('Services API Response:', result);

      // Check if response is successful
      if (result.success === false) {
        throw new Error(result.error || result.message || 'API returned error');
      }

      let servicesList = [];

      // Parse different response formats
      if (Array.isArray(result)) {
        servicesList = result;
      } else if (Array.isArray(result.data)) {
        servicesList = result.data;
      } else if (result.services && Array.isArray(result.services)) {
        servicesList = result.services;
      } else {
        throw new Error('No services data found. Response: ' + JSON.stringify(result).substring(0, 200));
      }

      if (servicesList.length === 0) {
        toast.info(`No services found from ${provider.name}`);
      } else {
        setFetchedServices(servicesList);
        toast.success(`Found ${servicesList.length} services from ${provider.name}`);
      }
    } catch (error) {
      console.error('Fetch services error:', error);
      toast.error(`Failed to fetch services: ${error.message}`);
      setShowServicesListModal(false);
    } finally {
      setFetchingServices(false);
    }
  };

  const handleSelectService = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSelectAllServices = () => {
    if (selectedServices.length === fetchedServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices(fetchedServices.map(s => s.service));
    }
  };

  const handleImportServices = async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service to import');
      return;
    }

    if (platforms.length === 0 || categories.length === 0) {
      toast.error('Please create platforms and categories first before importing services');
      return;
    }

    setImportingServices(true);

    try {
      const servicesToImport = fetchedServices.filter(s => selectedServices.includes(s.service));
      
      // Get highest existing service ID
      const existingServicesSnap = await cachedQuery('collection:services', () => getDocs(collection(db, 'services')), 30000);
      const existingServiceIds = existingServicesSnap.docs.map(d => parseInt(d.data().serviceId) || 0);
      let nextServiceId = existingServiceIds.length > 0 ? Math.max(...existingServiceIds) + 1 : 1;

      let imported = 0;
      let skipped = 0;

      for (const svc of servicesToImport) {
        try {
          // Check if service already exists from this provider
          const existingService = existingServicesSnap.docs.find(d => 
            d.data().providerId === selectedProvider.id && 
            d.data().providerServiceId === String(svc.service)
          );

          if (existingService) {
            skipped++;
            continue;
          }

          // Create service document
          const serviceData = {
            serviceId: String(nextServiceId),
            name: svc.name || `Service ${svc.service}`,
            providerId: selectedProvider.id,
            providerServiceId: String(svc.service),
            price: parseFloat(svc.rate || 0) * 278.5, // Convert USD to PKR
            minQuantity: parseInt(svc.min || 100),
            maxQuantity: parseInt(svc.max || 100000),
            avgTime: '1-6 Hours',
            description: svc.description || svc.desc || svc.details || svc.note || svc.notes || svc.instructions || svc.full_description || svc.service_description || svc.sdesc || svc.short_desc || svc.service_desc || svc.long_desc || '',
            platformId: platforms[0]?.id || '', // Default to first platform
            categoryId: categories[0]?.id || '', // Default to first category
            customCommentsRequired: false,
            isActive: true,
            isFeatured: false,
            isPopular: false,
            refillSupported: svc.refill === true || svc.refill === 'true' || svc.refill === '1',
            cancelSupported: svc.cancel === true || svc.cancel === 'true' || svc.cancel === '1',
            refundSupported: false,
            maintenance: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await addDoc(collection(db, 'services'), serviceData);
          imported++;
          nextServiceId++;
        } catch (err) {
          console.error(`Failed to import service ${svc.service}:`, err);
        }
      }

      toast.success(
        `✅ Import Complete!\n` +
        `✓ Imported: ${imported} services\n` +
        `${skipped > 0 ? `⊘ Skipped: ${skipped} (already exist)` : ''}`,
        { duration: 5000 }
      );

      setShowServicesListModal(false);
      setSelectedServices([]);
      fetchProviders();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Failed to import services: ${error.message}`);
    } finally {
      setImportingServices(false);
    }
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

              {/* Balance */}
              <div className="mb-4 p-3 rounded-xl bg-dark-50 dark:bg-dark-800/50 border border-dark-200 dark:border-dark-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-dark-500 dark:text-dark-400">Balance</span>
                  {balances[provider.id]?.loading ? (
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  ) : balances[provider.id]?.error ? (
                    <span className="text-xs text-red-500" title={balances[provider.id].error}>Failed</span>
                  ) : (
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {currentCurrency.symbol}{((balances[provider.id]?.balance || 0) * (rates[currency] || 1)).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fetchServicesFromProvider(provider)}
                  className="btn-primary btn-sm flex items-center justify-center gap-1 text-xs"
                  title="Fetch & import services from this provider"
                >
                  <FiGlobe className="text-sm" /> Fetch & Import
                </button>
                
                <button
                  onClick={() => handleEdit(provider)}
                  className="btn-outline btn-sm flex items-center justify-center gap-2"
                >
                  <FiEdit2 /> Edit
                </button>
              </div>

              {/* Toggle Status */}
              <button
                onClick={() => toggleActive(provider)}
                className={`w-full mt-2 btn-sm ${provider.isActive ? 'btn-secondary' : 'btn-primary'}`}
              >
                {provider.isActive ? 'Deactivate' : 'Activate'}
              </button>

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

      {/* Fetched Services List Modal with Import */}
      {showServicesListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-dark-200 dark:border-dark-700 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-dark-900 dark:text-white">
                  Import Services from {selectedProvider?.name}
                </h3>
                <p className="text-sm text-dark-500 mt-1">
                  {fetchingServices ? 'Loading...' : `${selectedServices.length} of ${fetchedServices.length} selected`}
                </p>
              </div>
              <button
                onClick={() => setShowServicesListModal(false)}
                className="text-2xl text-dark-400 hover:text-dark-600"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {fetchingServices ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Spinner size="lg" />
                  <p className="text-dark-500 mt-4">Fetching services from {selectedProvider?.name}...</p>
                </div>
              ) : fetchedServices.length === 0 ? (
                <div className="text-center py-12">
                  <FiGlobe className="text-5xl text-dark-300 mx-auto mb-4" />
                  <p className="text-dark-500">No services found</p>
                </div>
              ) : (
                <>
                  {/* Select All Checkbox */}
                  <div className="mb-4 flex items-center gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border-2 border-primary-200 dark:border-primary-800">
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={selectedServices.length === fetchedServices.length && fetchedServices.length > 0}
                      onChange={handleSelectAllServices}
                      className="w-5 h-5 rounded border-2 border-primary-400 text-primary-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    />
                    <label htmlFor="selectAll" className="text-sm font-semibold text-dark-900 dark:text-white cursor-pointer">
                      Select All Services ({fetchedServices.length})
                    </label>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-dark-100 dark:bg-dark-800 border-b border-dark-200 dark:border-dark-700 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase w-12">Select</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Service ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Service Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Rate (USD)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Min/Max</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 dark:text-dark-300 uppercase">Features</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-200 dark:divide-dark-700">
                        {fetchedServices.map((service, index) => (
                          <tr 
                            key={index} 
                            className={`hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors cursor-pointer ${selectedServices.includes(service.service) ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                            onClick={() => handleSelectService(service.service)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedServices.includes(service.service)}
                                onChange={() => handleSelectService(service.service)}
                                className="w-4 h-4 rounded border-2 border-dark-300 text-primary-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">
                                {service.service}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-dark-900 dark:text-white">
                                {service.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-dark-700 dark:text-dark-300">
                                {service.category || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                ${service.rate}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-dark-500">
                                {service.min} - {service.max}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 text-xs">
                                {(service.refill === true || service.refill === 'true' || service.refill === '1') && (
                                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    ↩ Refill
                                  </span>
                                )}
                                {(service.cancel === true || service.cancel === 'true' || service.cancel === '1') && (
                                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                    ✕ Cancel
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!fetchingServices && fetchedServices.length > 0 && (
              <div className="px-6 py-4 border-t border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-dark-900 dark:text-white">
                      {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-dark-500 mt-0.5">
                      💡 Services will be imported to first platform & category. You can edit them later.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowServicesListModal(false)}
                      className="btn-outline"
                      disabled={importingServices}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportServices}
                      disabled={selectedServices.length === 0 || importingServices}
                      className="btn-primary flex items-center gap-2"
                    >
                      {importingServices ? (
                        <>
                          <Spinner size="sm" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <FiPlus /> Import {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}