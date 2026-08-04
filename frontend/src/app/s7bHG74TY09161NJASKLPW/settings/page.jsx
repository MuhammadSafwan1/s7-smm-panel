'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { FiSave, FiImage, FiToggleLeft, FiToggleRight, FiLock, FiUnlock, FiTool, FiUserCheck, FiXCircle, FiPlus, FiMessageCircle, FiUpload, FiCheck, FiAlertTriangle, FiPhone, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import { cachedQuery, invalidateCache } from '@/lib/cache';

const PAGE_MAINTENANCE_KEYS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'Main ordering page', icon: '🏠' },
  { key: 'addFunds', label: 'Add Funds', desc: 'Deposit & payment page', icon: '💰' },
  { key: 'orders', label: 'My Orders', desc: 'Order history & tracking', icon: '📦' },
  { key: 'services', label: 'Services', desc: 'Service browsing page', icon: '🛍️' },
  { key: 'settings', label: 'Settings', desc: 'User profile settings', icon: '⚙️' },
  { key: 'transactions', label: 'Transactions', desc: 'Deposit & withdrawal history', icon: '📜' },
];

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [settings, setSettings] = useState({
    adminName: '',
    adminDescription: '',
    adminPhoto: '',
    siteLogo: '',
    websiteLoginEnabled: true,
    maintenanceMode: false,
    pageMaintenance: {},
    whitelistedEmails: [],
    whatsappChannelUrl: '',
    whatsappChannelEnabled: false,
    contactPhone: '',
    contactEmail: '',
    instagramGuideGif: '',
  });
  const [imagePreview, setImagePreview] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [guideUploading, setGuideUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAllUsers();
    
    // Load Cloudinary Upload Widget script
    if (!document.getElementById('cloudinary-upload-widget')) {
      const script = document.createElement('script');
      script.id = 'cloudinary-upload-widget';
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'siteSettings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          adminName: data.adminName || '',
          adminDescription: data.adminDescription || '',
          adminPhoto: data.adminPhoto || '',
          siteLogo: data.siteLogo || '',
          websiteLoginEnabled: data.websiteLoginEnabled !== false,
          maintenanceMode: data.maintenanceMode || false,
          pageMaintenance: data.pageMaintenance || {},
          whitelistedEmails: data.whitelistedEmails || [],
          whatsappChannelUrl: data.whatsappChannelUrl || 'https://whatsapp.com/channel/0029Vb5txzUJkK714Q3onN1l',
          whatsappChannelEnabled: data.whatsappChannelEnabled !== false,
          contactPhone: data.contactPhone || '+92 33315546339',
          contactEmail: data.contactEmail || 'ms8347750@gmail.com',
          instagramGuideGif: data.instagramGuideGif || '',
        });
        setImagePreview(data.adminPhoto || '');
        setLogoPreview(data.siteLogo || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const usersSnapshot = await cachedQuery('collection:users:all', () => getDocs(collection(db, 'users')), 30000);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        displayName: doc.data().displayName || '',
        photoURL: doc.data().photoURL || null,
      }));
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addWhitelistedEmail = (email) => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    
    if (settings.whitelistedEmails.includes(email)) {
      toast.error('Email already whitelisted');
      return;
    }

    setSettings(prev => ({
      ...prev,
      whitelistedEmails: [...prev.whitelistedEmails, email]
    }));
    setNewEmail('');
    toast.success('Email added to whitelist');
  };

  const removeWhitelistedEmail = (email) => {
    setSettings(prev => ({
      ...prev,
      whitelistedEmails: prev.whitelistedEmails.filter(e => e !== email)
    }));
    toast.success('Email removed from whitelist');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(base64);
        setSettings(prev => ({ ...prev, adminPhoto: base64 }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be less than 5MB'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => { setLogoPreview(event.target.result); };
    reader.readAsDataURL(file);
  };

  const handleLogoUploadCloudinary = async () => {
    if (!logoFile) { toast.error('Select a logo file first'); return; }
    setLogoUploading(true);
    const uploadToast = toast.loading('Uploading to Cloudinary...');
    try {
      const result = await uploadToCloudinary(logoFile, 'website/logo', (progress) => {
        toast.loading(`Uploading to Cloudinary... ${progress}%`, { id: uploadToast });
      });
      if (result.url) {
        setLogoPreview(result.url);
        setSettings(prev => ({ ...prev, siteLogo: result.url }));
        setLogoFile(null);
        toast.success('Logo uploaded via Cloudinary!', { id: uploadToast });
      } else {
        toast.error(result.error || 'Cloudinary upload failed', { id: uploadToast });
      }
    } catch (err) {
      toast.error('Cloudinary upload error: ' + err.message, { id: uploadToast });
    } finally { setLogoUploading(false); }
  };

  const handleLogoUploadFirebase = async () => {
    if (!logoFile) { toast.error('Select a logo file first'); return; }
    setLogoUploading(true);
    const uploadToast = toast.loading('Uploading to Firebase...');
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 800;
            let width = img.width, height = img.height;
            if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
            else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(logoFile);
      });
      setLogoPreview(base64);
      setSettings(prev => ({ ...prev, siteLogo: base64 }));
      setLogoFile(null);
      toast.success('Logo saved to Firebase!', { id: uploadToast });
    } catch (err) {
      toast.error('Firebase upload error: ' + err.message, { id: uploadToast });
    } finally { setLogoUploading(false); }
  };

  const togglePageMaintenance = (pageKey) => {
    setSettings(prev => ({
      ...prev,
      pageMaintenance: {
        ...prev.pageMaintenance,
        [pageKey]: !prev.pageMaintenance[pageKey],
      }
    }));
  };

  const handleSave = async () => {
    if (!settings.adminName.trim()) {
      toast.error('Admin name is required');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'siteSettings', 'general'), settings, { merge: true });
      invalidateCache('siteSettings:general');
      invalidateCache('siteSettings:general:data');
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">Website Settings</h2>
        <p className="text-dark-500 dark:text-dark-400">Manage admin profile and website configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Profile Card */}
        <div className="lg:col-span-2 bg-dark-100 dark:bg-dark-800 rounded-2xl p-6 border border-dark-200 dark:border-dark-700">
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-6 flex items-center gap-2">
            <FiImage className="text-primary-500" />
            Admin Profile
          </h3>

          <div className="space-y-6">
            {/* Admin Photo */}
            <div>
              <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">
                Profile Picture
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Admin"
                      className="w-40 h-40 rounded-2xl object-cover border-[5px] border-primary-500 shadow-xl shadow-primary-500/30"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-primary-500/30">
                      {settings.adminName?.[0] || 'A'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                    <FiImage /> Choose Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-dark-500 mt-2">Max 2MB, recommended 500x500px</p>
                </div>
              </div>
            </div>

            {/* Admin Name */}
            <div>
              <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">
                Admin Name *
              </label>
              <input
                type="text"
                value={settings.adminName}
                onChange={(e) => setSettings(prev => ({ ...prev, adminName: e.target.value }))}
                placeholder="Enter admin name"
                className="input-field"
                maxLength={50}
              />
            </div>

            {/* Admin Description */}
            <div>
              <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">
                Admin Description
              </label>
              <textarea
                value={settings.adminDescription}
                onChange={(e) => setSettings(prev => ({ ...prev, adminDescription: e.target.value }))}
                placeholder="Write a brief description about yourself..."
                className="input-field min-h-[120px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-dark-500 mt-1">
                {settings.adminDescription.length}/500 characters
              </p>
            </div>

            {/* Website Logo Upload */}
            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700">
              <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3">
                Website Logo (HD)
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Website Logo"
                      className="h-24 max-w-[200px] rounded-xl object-contain border-2 border-primary-500 shadow-lg bg-white dark:bg-dark-800 p-2"
                    />
                  ) : (
                    <div className="h-24 w-[200px] rounded-xl bg-dark-100 dark:bg-dark-700 border-2 border-dashed border-dark-300 dark:border-dark-600 flex items-center justify-center">
                      <div className="text-center">
                        <FiImage className="text-2xl text-dark-400 mx-auto mb-1" />
                        <p className="text-[10px] text-dark-400">No logo</p>
                      </div>
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="btn-primary cursor-pointer inline-flex items-center gap-2 text-sm">
                      <FiImage /> Select Logo File
                      <input type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
                    </label>
                    <p className="text-[10px] text-dark-400 mt-1">Max 5MB, PNG/SVG recommended</p>
                  </div>
                  {logoPreview && logoFile && (
                    <div className="flex gap-2">
                      <button onClick={handleLogoUploadCloudinary} disabled={logoUploading}
                        className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                        {logoUploading ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <FiUpload />}
                        Cloudinary
                      </button>
                      <button onClick={handleLogoUploadFirebase} disabled={logoUploading}
                        className="flex-1 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
                        {logoUploading ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <FiUpload />}
                        Firebase
                      </button>
                    </div>
                  )}
                  {logoPreview && !logoFile && (
                    <div className="flex gap-2">
                      <label className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer text-center">
                        Re-upload via Cloudinary
                        <input type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
                      </label>
                      <label className="flex-1 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold cursor-pointer text-center">
                        Re-upload via Firebase
                        <input type="file" accept="image/*" onChange={handleLogoFileSelect} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
                {logoPreview && (
                  <button onClick={() => { setLogoPreview(''); setSettings(prev => ({ ...prev, siteLogo: '' })); setLogoFile(null); }}
                    className="ml-auto p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors" title="Remove logo">
                    <FiXCircle />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Website Controls Card */}
        <div className="bg-dark-100 dark:bg-dark-800 rounded-2xl p-6 border border-dark-200 dark:border-dark-700">
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-6 flex items-center gap-2">
            <FiTool className="text-primary-500" />
            Controls
          </h3>

          <div className="space-y-6">
            {/* Website Login Toggle */}
            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {settings.websiteLoginEnabled ? (
                    <FiUnlock className="text-green-500" />
                  ) : (
                    <FiLock className="text-red-500" />
                  )}
                  <span className="font-semibold text-dark-900 dark:text-white">
                    Website Login
                  </span>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, websiteLoginEnabled: !prev.websiteLoginEnabled }))}
                  className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${
                    settings.websiteLoginEnabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${
                      settings.websiteLoginEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-dark-500">
                {settings.websiteLoginEnabled
                  ? 'Users can login to the website'
                  : 'Login is currently disabled'}
              </p>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiTool className={settings.maintenanceMode ? 'text-yellow-500' : 'text-gray-500'} />
                  <span className="font-semibold text-dark-900 dark:text-white">
                    Maintenance Mode
                  </span>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${
                    settings.maintenanceMode ? 'bg-yellow-500' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${
                      settings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-dark-500">
                {settings.maintenanceMode
                  ? '⚠️ User panel is hidden - Under Maintenance'
                  : 'User panel is accessible'}
              </p>
            </div>

            {/* WhatsApp Channel Toggle */}
            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiMessageCircle className={settings.whatsappChannelEnabled ? 'text-green-500' : 'text-gray-500'} />
                  <span className="font-semibold text-dark-900 dark:text-white">
                    WhatsApp Channel
                  </span>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, whatsappChannelEnabled: !prev.whatsappChannelEnabled }))}
                  className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${
                    settings.whatsappChannelEnabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${
                      settings.whatsappChannelEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-dark-500">
                {settings.whatsappChannelEnabled
                  ? '✅ Button visible to users'
                  : 'Button is hidden'}
              </p>
              
              {/* WhatsApp Channel URL Input */}
              <div className="mt-3">
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  Channel URL
                </label>
                <input
                  type="url"
                  value={settings.whatsappChannelUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, whatsappChannelUrl: e.target.value }))}
                  placeholder="https://whatsapp.com/channel/..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700">
              <div className="flex items-center gap-2 mb-3">
                <FiPhone className="text-blue-500" />
                <span className="font-semibold text-dark-900 dark:text-white">
                  Contact Information
                </span>
              </div>
              <p className="text-xs text-dark-500 mb-3">
                These contact details appear in the footer for users to reach you
              </p>
              
              {/* Contact Phone */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  <FiPhone className="inline mr-1" /> Contact Phone
                </label>
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="+92 33315546339"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1">
                  <FiMail className="inline mr-1" /> Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="ms8347750@gmail.com"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Instagram Guide GIF */}
            <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700">
              <div className="flex items-center gap-2 mb-3">
                <FiImage className="text-purple-500" />
                <span className="font-semibold text-dark-900 dark:text-white">
                  Instagram Guide GIF
                </span>
              </div>
              <p className="text-xs text-dark-500 mb-3">
                Upload guide GIF to Cloudinary to save Firebase bandwidth (shows on dashboard)
              </p>
              
              {/* Current GIF Preview */}
              {settings.instagramGuideGif && (
                <div className="mb-3 rounded-lg overflow-hidden border border-dark-200 dark:border-dark-700">
                  <img 
                    src={settings.instagramGuideGif} 
                    alt="Instagram Guide" 
                    className="w-full h-auto object-contain max-h-48"
                  />
                </div>
              )}

              {/* Cloudinary Upload (direct — no widget needed) */}
              <input
                id="guide-file"
                type="file"
                accept="image/gif,image/png,image/jpeg"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return; }
                  if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
                  setGuideUploading(true);
                  try {
                    const { url, error } = await uploadToCloudinary(file, 'website/guides');
                    if (url) {
                      setSettings(prev => ({ ...prev, instagramGuideGif: url }));
                      toast.success('GIF uploaded to Cloudinary!');
                    } else {
                      toast.error(error || 'Upload failed');
                    }
                  } catch (err) {
                    toast.error('Upload failed: ' + err.message);
                  } finally {
                    setGuideUploading(false);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('guide-file')?.click()}
                disabled={guideUploading}
                className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {guideUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FiUpload /> Upload to Cloudinary
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-dark-400 mt-2 text-center">
                💡 Saves 300+ KB Firebase bandwidth per user visit
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave /> Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Per-Page Maintenance Mode */}
      <div className="mt-6 bg-dark-100 dark:bg-dark-800 rounded-2xl p-6 border border-dark-200 dark:border-dark-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
              <FiAlertTriangle className="text-orange-500" />
              Per-Page Maintenance
            </h3>
            <p className="text-sm text-dark-500 dark:text-dark-400 mt-2">
              Put individual pages under maintenance. Users will see "Under Maintenance" for that specific page.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
            {Object.values(settings.pageMaintenance).filter(Boolean).length} / {PAGE_MAINTENANCE_KEYS.length} Active
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {PAGE_MAINTENANCE_KEYS.map(({ key, label, desc, icon }) => {
            const isMaintenance = settings.pageMaintenance[key] || false;
            return (
              <div
                key={key}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isMaintenance
                    ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                    : 'border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-900 hover:border-dark-300 dark:hover:border-dark-600'
                }`}
                onClick={() => togglePageMaintenance(key)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="font-semibold text-dark-900 dark:text-white text-sm">{label}</span>
                  </div>
                  <div className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${isMaintenance ? 'bg-orange-500' : 'bg-gray-300 dark:bg-dark-600'}`}>
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform shadow-sm ${isMaintenance ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </div>
                <p className="text-xs text-dark-500 dark:text-dark-400">{desc}</p>
                {isMaintenance && (
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-2 uppercase tracking-wide">⚠️ Under Maintenance</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Whitelisted Users Section */}
      <div className="mt-6 bg-dark-100 dark:bg-dark-800 rounded-2xl p-6 border border-dark-200 dark:border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-dark-900 dark:text-white flex items-center gap-2">
              <FiUserCheck className="text-green-500" />
              Whitelisted Users (Maintenance Bypass)
            </h3>
            <p className="text-sm text-dark-500 dark:text-dark-400 mt-2">
              These users can access the website even during maintenance mode. {' '}
              {settings.maintenanceMode ? (
                <span className="text-yellow-600 dark:text-yellow-400 font-semibold">⚠️ Currently Active</span>
              ) : (
                <span className="text-dark-600 dark:text-dark-300">Will work when maintenance is enabled</span>
              )}
            </p>
          </div>
        </div>

          {/* Add Email Input */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addWhitelistedEmail(newEmail)}
                placeholder="Enter user email to whitelist"
                className="input-field pr-24"
              />
              {allUsers.length > 0 && newEmail && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-700 border border-dark-200 dark:border-dark-600 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                  {allUsers
                    .filter(u => u.email.toLowerCase().includes(newEmail.toLowerCase()))
                    .slice(0, 5)
                    .map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          addWhitelistedEmail(user.email);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-dark-50 dark:hover:bg-dark-600 transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&size=80&background=random`}
                              alt={user.displayName}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-dark-900 dark:text-white truncate">
                            {user.displayName || 'User'}
                          </p>
                          <p className="text-xs text-dark-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={() => addWhitelistedEmail(newEmail)}
              className="btn-primary flex items-center gap-2 px-6"
            >
              <FiPlus /> Add
            </button>
          </div>

          {/* Whitelisted Emails List */}
          <div className="space-y-2">
            {settings.whitelistedEmails.length === 0 ? (
              <div className="text-center py-8 text-dark-500 dark:text-dark-400">
                <FiUserCheck className="text-4xl mx-auto mb-2 opacity-50" />
                <p>No whitelisted users yet</p>
                <p className="text-xs mt-1">Add users who should have access during maintenance</p>
              </div>
            ) : (
              settings.whitelistedEmails.map((email, index) => {
                const user = allUsers.find(u => u.email === email);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-50 dark:bg-dark-900 border border-dark-200 dark:border-dark-700 hover:border-primary-500 dark:hover:border-primary-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-green-500/50">
                        {user?.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || email)}&size=80&background=random`}
                            alt={user?.displayName || email}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-dark-900 dark:text-white text-sm truncate">
                          {user?.displayName || 'User'}
                        </p>
                        <p className="text-xs text-dark-500 truncate">{email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-semibold">
                        <FiUserCheck /> Whitelisted
                      </div>
                    </div>
                    <button
                      onClick={() => removeWhitelistedEmail(email)}
                      className="ml-3 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors"
                      title="Remove from whitelist"
                    >
                      <FiXCircle className="text-lg" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
    </div>
  );
}
