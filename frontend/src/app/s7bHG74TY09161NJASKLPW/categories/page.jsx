'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiLayers, FiUpload, FiXCircle, FiLink, FiTool, FiCloud } from 'react-icons/fi';
import { cachedQuery, invalidateCache } from '@/lib/cache';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';

// Same icon upload component as platforms (with Cloudinary option)
function IconUpload({ value, onChange }) {
  const inputRef = useRef();
  const [mode, setMode] = useState('cloud'); // 'cloud' | 'base64' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [converting, setConverting] = useState(false);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const compressAndConvert = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 256;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
        } else {
          if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png', 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }

    setConverting(true);
    try {
      if (mode === 'cloud') {
        // Compress (keep GIF animation) then upload to Cloudinary → ZERO Firebase bandwidth
        const payload = file.type === 'image/gif' ? await toBase64(file) : await compressAndConvert(file);
        const { url, error } = await uploadToCloudinary(payload, 'smm-panel/icons');
        if (url) {
          onChange(url);
          toast.success('☁️ Icon uploaded to Cloudinary!');
        } else {
          // Fallback: keep as base64 so the admin never loses the icon
          onChange(payload);
          toast.error(`Cloudinary failed (${error || 'upload error'}) — saved as base64`);
        }
      } else {
        // Base64 mode: keep as-is (GIF) or compress
        const base64 = file.type === 'image/gif' ? await toBase64(file) : await compressAndConvert(file);
        onChange(base64);
        toast.success('Icon saved (base64)');
      }
    } catch { toast.error('Failed to process image'); }
    finally { setConverting(false); e.target.value = ''; }
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    toast.success('Icon URL saved!');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('cloud')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'cloud' ? 'bg-sky-500 text-white shadow-md' : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'}`}>
          <FiCloud /> Cloudinary
        </button>
        <button type="button" onClick={() => setMode('base64')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'base64' ? 'bg-primary-500 text-white shadow-md' : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'}`}>
          <FiUpload /> Base64
        </button>
        <button type="button" onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'url' ? 'bg-primary-500 text-white shadow-md' : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'}`}>
          <FiLink /> Paste URL
        </button>
      </div>

      {mode === 'cloud' && !value && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-900/30 border border-sky-700/40 text-sky-400 text-sm">
          <FiCloud className="flex-shrink-0" />
          <span>Upload to Cloudinary — free CDN, uses ZERO Firebase bandwidth</span>
        </div>
      )}

      {mode === 'base64' && !value && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-400 text-sm">
          <FiUpload className="flex-shrink-0" />
          <span>Select image from your device (converted to base64, stored in Firestore)</span>
        </div>
      )}

      {mode === 'url' && !value && (
        <div className="flex gap-2">
          <input type="url" placeholder="https://example.com/icon.png" value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSave())}
            className="flex-1 px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-dark-900 dark:text-white" />
          <button type="button" onClick={handleUrlSave} disabled={!urlInput.trim()}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Save
          </button>
        </div>
      )}

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-500/30 bg-green-50 dark:bg-green-900/20">
          <img src={value} alt="icon" className="w-14 h-14 rounded-xl object-contain bg-white dark:bg-dark-800 p-1 border border-dark-200 dark:border-dark-700" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ Icon ready</p>
            <p className="text-xs text-dark-400 mt-0.5">{value.startsWith('data:') ? 'Base64 encoded (Firestore)' : value.includes('cloudinary') ? '☁️ Cloudinary (off Firebase)' : 'URL image'}</p>
          </div>
          <button type="button" onClick={() => onChange('')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><FiXCircle /></button>
        </div>
      ) : mode !== 'url' ? (
        <>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => inputRef.current.click()} disabled={converting}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-500 bg-dark-50 dark:bg-dark-800 transition-colors cursor-pointer">
            {converting ? (
              <><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-dark-500">Converting...</span></>
            ) : (
              <>{mode === 'cloud' ? <FiCloud className="text-3xl text-dark-400" /> : <FiUpload className="text-3xl text-dark-400" />}<span className="text-sm font-medium text-dark-600 dark:text-dark-300">Click to select image or GIF</span><span className="text-xs text-dark-400">PNG, JPG, SVG, GIF, WebP — max 2MB</span></>
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null); // Changed from 'all' to null

  const [form, setForm] = useState({
    name: '',
    platformId: '',
    icon: '',
    description: '',
    sortOrder: '',
    isActive: true,
    maintenance: false,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [catSnap, platSnap] = await Promise.all([
        cachedQuery('collection:categories', () => getDocs(collection(db, 'categories')), 30000),
        cachedQuery('collection:platforms', () => getDocs(collection(db, 'platforms')), 30000),
      ]);
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const platformsList = platSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlatforms(platformsList);
      // Set first platform as default selected if not already set
      if (!selectedPlatform && platformsList.length > 0) {
        setSelectedPlatform(platformsList[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const openAdd = () => {
    setEditingCategory(null);
    // Use the currently selected platform, or fallback to first platform
    const preselectedPlatformId = selectedPlatform || (platforms[0]?.id || '');
    setForm({ name: '', platformId: preselectedPlatformId, icon: '', description: '', sortOrder: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, platformId: cat.platformId, icon: cat.icon || '', description: cat.description || '', sortOrder: String(cat.sortOrder ?? ''), isActive: cat.isActive, maintenance: !!cat.maintenance });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Category name is required'); return; }
    if (!form.platformId) { toast.error('Please select a platform'); return; }
    
    // Check if sortOrder is already used in the same platform
    const sortStr = String(form.sortOrder || '').trim();
    if (sortStr !== '') {
      const duplicateOrder = categories.find(
        cat => cat.platformId === form.platformId && 
               cat.sortOrder === parseInt(sortStr) &&
               (!editingCategory || cat.id !== editingCategory.id)
      );
      if (duplicateOrder) {
        const platformName = platforms.find(p => p.id === form.platformId)?.name || 'this platform';
        toast.error(`Display Order ${sortStr} is already used by "${duplicateOrder.name}" in ${platformName}`);
        return;
      }
    }
    
    setSaving(true);
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!editingCategory && form.maintenance === undefined) form.maintenance = false;
      // Convert sortOrder to number, default to 999 if not provided
      const sortOrderValue = sortStr ? parseInt(sortStr) : 999;
      const data = { ...form, slug, sortOrder: sortOrderValue, updatedAt: Timestamp.now() };
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), data);
        toast.success('Category updated');
      } else {
        await addDoc(collection(db, 'categories'), { ...data, createdAt: Timestamp.now() });
        toast.success('Category added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    const snap = await cachedQuery('collection:services', () => getDocs(collection(db, 'services')), 30000);
    if (snap.docs.some(d => d.data().categoryId === id)) { toast.error('Delete services in this category first'); return; }
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteDoc(doc(db, 'categories', id));
    invalidateCache('collection:categories');
    invalidateCache('categories:');
    toast.success('Category deleted');
    fetchData();
  };

  const toggleActive = async (cat) => {
    await updateDoc(doc(db, 'categories', cat.id), { isActive: !cat.isActive, updatedAt: Timestamp.now() });
    fetchData();
  };

  const getPlatform = (id) => platforms.find(p => p.id === id);

  const filtered = selectedPlatform
    ? categories.filter(c => c.platformId === selectedPlatform).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">Category Management</h2>
          <p className="text-dark-500 dark:text-dark-400 text-sm">Organize services by category per platform</p>
        </div>
        <button onClick={openAdd} disabled={platforms.length === 0} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Category
        </button>
      </div>

      {platforms.length === 0 && (
        <div className="glass-card p-5 mb-6 border border-yellow-500/30 bg-yellow-500/10">
          <p className="text-yellow-300 text-sm">Create platforms first before adding categories.</p>
        </div>
      )}

      {/* Platform Filter */}
      {platforms.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {platforms.map(p => (
            <button key={p.id} onClick={() => setSelectedPlatform(p.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedPlatform === p.id ? 'text-white' : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'}`}
              style={selectedPlatform === p.id ? { backgroundColor: p.color || '#6366f1' } : {}}>
              {p.icon && <img src={p.icon} alt={p.name} className="w-4 h-4 rounded object-contain" />}
              {p.name} ({categories.filter(c => c.platformId === p.id).length})
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FiLayers className="text-5xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">No Categories</h3>
          <p className="text-dark-500 mb-6">No categories for this platform yet</p>
          {platforms.length > 0 && (
            <button onClick={openAdd} className="btn-primary"><FiPlus className="inline mr-2" />Add Category</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((cat) => {
            const platform = getPlatform(cat.platformId);
            return (
              <div key={cat.id} className="glass-card p-5 hover:shadow-xl transition-all"
                style={{ borderTop: `4px solid ${platform?.color || '#6366f1'}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {cat.icon ? (
                      <img src={cat.icon} alt={cat.name} className="w-11 h-11 rounded-xl object-contain bg-white dark:bg-dark-800 p-1 border border-dark-200 dark:border-dark-700" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: platform?.color || '#6366f1' }}>
                        {cat.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-dark-900 dark:text-white">{cat.name}</h3>
                        {cat.sortOrder !== undefined && cat.sortOrder !== 999 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                            #{cat.sortOrder}
                          </span>
                        )}
                      </div>
                      {platform && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: platform.color || '#6366f1' }}>
                          {platform.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {cat.description && <p className="text-xs text-dark-500 mb-3">{cat.description}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => toggleActive(cat)} className={`btn-sm ${cat.isActive ? 'btn-secondary' : 'btn-primary'}`}>
                    {cat.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => openEdit(cat)} className="btn-outline btn-sm flex items-center justify-center gap-1">
                    <FiEdit2 /> Edit
                  </button>
                </div>
                <button onClick={() => handleDelete(cat.id, cat.name)}
                  className="w-full mt-2 btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg py-1.5">
                  <FiTrash2 className="inline mr-1" /> Delete
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 flex items-center justify-center text-dark-500 text-xl">×</button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5">
              <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
                {/* Platform */}
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Platform *</label>
                  <select value={form.platformId} onChange={(e) => setForm({ ...form, platformId: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white">
                    <option value="">Select Platform</option>
                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Category Name */}
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Category Name *</label>
                  <input type="text" placeholder="e.g., Followers, Likes, Views"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
                </div>

                {/* Display Order */}
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Display Order</label>
                  <input type="number" min="1" placeholder="e.g., 1, 2, 3"
                    value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
                  <p className="text-xs text-dark-400 mt-1">Lower numbers appear first on user dashboard (e.g., 1 = first position, 2 = second position)</p>
                </div>

                {/* Icon Upload */}
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Icon / GIF</label>
                  <IconUpload value={form.icon} onChange={(url) => setForm({ ...form, icon: url })} />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Status</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setForm({ ...form, isActive: true })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form.isActive ? 'border-green-500 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'border-dark-200 dark:border-dark-700 text-dark-500 hover:border-green-400'}`}>
                      ● Active
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, isActive: false })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${!form.isActive ? 'border-red-500 bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400' : 'border-dark-200 dark:border-dark-700 text-dark-500 hover:border-red-400'}`}>
                      ○ Inactive
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Description</label>
                  <textarea rows="2" placeholder="e.g., Get real Instagram followers fast"
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white resize-none" />
                </div>

                {/* Maintenance Mode Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                    <div className="flex items-center gap-3">
                      <span className="text-orange-500 text-xl">🔧</span>
                      <div>
                        <p className="font-semibold text-dark-900 dark:text-white text-sm">Maintenance Mode</p>
                        <p className="text-xs text-dark-500">Non-whitelisted users will see "Under Maintenance" for this category</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, maintenance: !form.maintenance })}
                      className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors ${form.maintenance ? 'bg-orange-500' : 'bg-gray-400'}`}
                    >
                      <span className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform ${form.maintenance ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
              </div>

              {/* Actions */}
                <div className="flex gap-3 pt-2 mt-5">
                  <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                    className="flex-1 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800 transition-all">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-all disabled:opacity-60">
                    {saving ? 'Saving...' : editingCategory ? 'Update' : 'Add Category'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
