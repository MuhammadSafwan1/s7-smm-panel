'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, increment } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiX } from 'react-icons/fi';
import { Spinner } from '@/components/common/Loader';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { cachedQuery, invalidateCache } from '@/lib/cache';

export default function AccountsManagement() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('file'); // 'url' or 'file'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    secretNotes: '',
    price: '',
    categoryId: '',
    level: '',
    rank: '',
    season: '',
    features: '',
    status: 'available',
    images: [''], // Array of image URLs
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, 'accounts')),
        cachedQuery('collection:categories', () => getDocs(collection(db, 'categories')), 30000),
      ]);

      const accountsData = accountsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    if (formData.images.filter(img => img).length + files.length > 7) {
      toast.error('Maximum 7 images allowed');
      return;
    }

    // Convert files to base64
    const promises = files.map(file => {
      return new Promise((resolve, reject) => {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max 5MB per image.`);
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      const validImages = base64Images.filter(img => img !== null);
      const existingImages = formData.images.filter(img => img);
      const newImages = [...existingImages, ...validImages].slice(0, 7);
      setFormData({ ...formData, images: newImages.length > 0 ? newImages : [''] });
      toast.success(`${validImages.length} image(s) added`);
    });
  };

  const addImageUrlField = () => {
    if (formData.images.length < 7) {
      setFormData({ ...formData, images: [...formData.images, ''] });
    }
  };

  const removeImageUrlField = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const updateImageUrl = (index, url) => {
    const newImages = [...formData.images];
    newImages[index] = url;
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.categoryId) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Filter out empty image URLs
    const validImages = formData.images.filter(img => img.trim() !== '');
    
    if (validImages.length === 0) {
      toast.error('Please add at least 1 image URL');
      return;
    }

    setUploading(true);

    try {
      const accountData = {
        ...formData,
        images: validImages,
        price: parseInt(formData.price),
        features: formData.features.split('\n').filter(f => f.trim()),
        updatedAt: Timestamp.now(),
      };

      if (editingAccount) {
        await updateDoc(doc(db, 'accounts', editingAccount.id), accountData);
        toast.success('Account updated successfully');
      } else {
        accountData.createdAt = Timestamp.now();
        accountData.featured = false;
        
        await addDoc(collection(db, 'accounts'), accountData);

        // Increment category account count
        await updateDoc(doc(db, 'categories', formData.categoryId), {
          accountCount: increment(1),
        });

        toast.success('Account added successfully');
      }

      setShowModal(false);
      setEditingAccount(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Failed to save account');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      secretNotes: '',
      price: '',
      categoryId: '',
      level: '',
      rank: '',
      season: '',
      features: '',
      status: 'available',
      images: [''],
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      title: account.title,
      description: account.description || '',
      secretNotes: account.secretNotes || '',
      price: account.price,
      categoryId: account.categoryId || '',
      level: account.level || '',
      rank: account.rank || '',
      season: account.season || '',
      features: account.features?.join('\n') || '',
      status: account.status || 'available',
      images: account.images || [''],
    });
    setShowModal(true);
  };

  const handleDelete = async (accountId, categoryId) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await deleteDoc(doc(db, 'accounts', accountId));
      
      if (categoryId) {
        await updateDoc(doc(db, 'categories', categoryId), {
          accountCount: increment(-1),
        });
      }

      toast.success('Account deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleMarkAsSold = async (accountId) => {
    try {
      await updateDoc(doc(db, 'accounts', accountId), {
        status: 'sold',
        soldAt: Timestamp.now(),
      });
      toast.success('Account marked as sold');
      fetchData();
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white">Accounts</h2>
          <p className="text-dark-500 dark:text-dark-400">Manage Free Fire accounts</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Account
        </button>
      </div>

      {categories.length === 0 && (
        <div className="glass-card p-6 mb-6 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30">
          <p className="text-yellow-800 dark:text-yellow-200">
            Please create categories first before adding accounts.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const category = categories.find(c => c.id === account.categoryId);
          return (
            <div key={account.id} className="glass-card overflow-hidden hover:shadow-xl transition-shadow">
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-primary-500 to-primary-600">
                {account.images?.[0] ? (
                  <Image
                    src={account.images[0]}
                    alt={account.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiImage className="text-white/30 text-5xl" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    account.status === 'sold' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-green-500 text-white'
                  }`}>
                    {account.status === 'sold' ? 'Sold' : 'Available'}
                  </span>
                </div>

                {/* Image Count */}
                {account.images?.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs">
                    {account.images.length} photos
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-dark-900 dark:text-white mb-2 line-clamp-1">
                  {account.title}
                </h3>
                
                <p className="text-sm text-dark-600 dark:text-dark-400 mb-3 line-clamp-2">
                  {account.description}
                </p>

                {category && (
                  <p className="text-xs text-primary-600 dark:text-primary-400 mb-2">
                    {category.name}
                  </p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold gradient-text">
                    ₨{account.price?.toLocaleString()}
                  </span>
                  {account.level && (
                    <span className="text-sm text-dark-500 dark:text-dark-400">
                      Level {account.level}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {account.status === 'available' && (
                    <button
                      onClick={() => handleMarkAsSold(account.id)}
                      className="flex-1 btn-sm bg-green-500 hover:bg-green-600 text-white"
                    >
                      Mark Sold
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id, account.categoryId)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {accounts.length === 0 && categories.length > 0 && (
          <div className="col-span-full text-center py-12 glass-card">
            <FiImage className="text-4xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
            <p className="text-dark-500 dark:text-dark-400">No accounts yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary btn-sm mt-4"
            >
              Add First Account
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-900 pb-4 mb-4 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="input-label">Account Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 83 Level Prime Account"
                  required
                />
              </div>

              {/* Category and Price Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Price (₨) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    placeholder="900000"
                    required
                  />
                </div>
              </div>

              {/* Description (Public) */}
              <div>
                <label className="input-label">Public Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="83 level prime&#10;11max almost 880vault&#10;30+incublators&#10;google link"
                  required
                />
                <p className="text-xs text-dark-500 mt-1">Visible to users</p>
              </div>

              {/* Secret Notes */}
              <div>
                <label className="input-label">Secret Notes (Admin Only)</label>
                <textarea
                  value={formData.secretNotes}
                  onChange={(e) => setFormData({ ...formData, secretNotes: e.target.value })}
                  className="input-field"
                  rows="2"
                  placeholder="Login credentials, special notes..."
                />
                <p className="text-xs text-dark-500 mt-1">NOT visible to users</p>
              </div>

              {/* Level, Rank, Season */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="input-label">Level</label>
                  <input
                    type="text"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="input-field"
                    placeholder="83"
                  />
                </div>
                <div>
                  <label className="input-label">Rank</label>
                  <input
                    type="text"
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="input-field"
                    placeholder="Heroic"
                  />
                </div>
                <div>
                  <label className="input-label">Season</label>
                  <input
                    type="text"
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                    className="input-field"
                    placeholder="Season 50"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="input-label">Features (one per line)</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  className="input-field"
                  rows="3"
                  placeholder="Prime Subscription&#10;Max Character&#10;Rare Bundles"
                />
              </div>

              {/* Status */}
              <div>
                <label className="input-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="input-label">Images (Min 1, Max 7) *</label>
                
                {/* Upload Method Tabs */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      uploadMethod === 'url'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400'
                    }`}
                  >
                    📝 Paste URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      uploadMethod === 'file'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400'
                    }`}
                  >
                    📤 Upload File
                  </button>
                </div>

                {/* URL Method */}
                {uploadMethod === 'url' && (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        📸 Upload to <a href="https://imgbb.com/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">ImgBB</a> or <a href="https://imgur.com/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Imgur</a>, then paste URL
                      </p>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {formData.images.map((url, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <span className="text-sm font-semibold text-dark-600 dark:text-dark-400 w-8">#{index + 1}</span>
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => updateImageUrl(index, e.target.value)}
                            className="input-field flex-1"
                            placeholder="https://i.ibb.co/..."
                          />
                          {formData.images.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeImageUrlField(index)}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 flex-shrink-0"
                              title="Remove"
                            >
                              <FiX />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {formData.images.length < 7 && (
                      <button
                        type="button"
                        onClick={addImageUrlField}
                        className="mt-3 btn-secondary btn-sm flex items-center gap-2"
                      >
                        <FiPlus /> Add URL ({formData.images.length}/7)
                      </button>
                    )}
                  </>
                )}

                {/* File Upload Method */}
                {uploadMethod === 'file' && (
                  <>
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg p-3 mb-3">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        📤 Select images from your device (converted to base64, no external service needed)
                      </p>
                    </div>

                    <div className="border-2 border-dashed border-dark-300 dark:border-dark-700 rounded-xl p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="fileInput"
                      />
                      <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center gap-2">
                        <FiImage className="text-4xl text-dark-400" />
                        <p className="text-dark-600 dark:text-dark-400 font-medium">
                          Click to select images
                        </p>
                        <p className="text-xs text-dark-500">
                          {formData.images.filter(img => img.startsWith('data:')).length}/7 images selected
                        </p>
                      </label>
                    </div>
                  </>
                )}

                {/* Image Previews */}
                {formData.images.some(url => url.trim()) && (
                  <div className="mt-4 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg">
                    <p className="text-xs font-semibold text-dark-600 dark:text-dark-400 mb-2">Preview:</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {formData.images.filter(url => url.trim()).map((url, index) => (
                        <div key={index} className="relative aspect-square group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border-2 border-dark-200 dark:border-dark-700"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="12"%3EInvalid%3C/text%3E%3C/svg%3E';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImageUrlField(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiX className="text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-dark-900 border-t border-dark-200 dark:border-dark-700 -mx-6 px-6 -mb-6 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                  className="flex-1 btn-secondary"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Spinner size="sm" /> Saving...
                    </>
                  ) : (
                    editingAccount ? 'Update Account' : 'Add Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
