'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { FiSave, FiImage, FiToggleLeft, FiToggleRight, FiLock, FiUnlock, FiTool, FiUserCheck, FiX, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    adminName: '',
    adminDescription: '',
    adminPhoto: '',
    websiteLoginEnabled: true,
    maintenanceMode: false,
    whitelistedEmails: [], // Array of emails that can access during maintenance
  });
  const [imagePreview, setImagePreview] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchAllUsers();
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
          websiteLoginEnabled: data.websiteLoginEnabled !== false,
          maintenanceMode: data.maintenanceMode || false,
          whitelistedEmails: data.whitelistedEmails || [],
        });
        setImagePreview(data.adminPhoto || '');
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
      const usersSnapshot = await getDocs(collection(db, 'users'));
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

  const handleSave = async () => {
    if (!settings.adminName.trim()) {
      toast.error('Admin name is required');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'siteSettings', 'general'), settings, { merge: true });
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
                      className="w-32 h-32 rounded-2xl object-cover border-4 border-primary-500 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
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
                  <p className="text-xs text-dark-500 mt-2">Max 2MB, recommended 400x400px</p>
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

      {/* Whitelisted Users Section - Always visible */}
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
                      <FiX className="text-lg" />
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
