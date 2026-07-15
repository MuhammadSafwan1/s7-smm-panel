'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiUpload, FiX, FiLink } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';

function IconUpload({ value, onChange }) {
  const [mode, setMode] = useState('cloudinary');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);

  // Cloudinary Upload
  const uploadToCloudinary = () => {
    setUploading(true);
    
    if (typeof window !== 'undefined' && window.cloudinary) {
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'url', 'camera'],
          multiple: false,
          clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
          maxFileSize: 10000000, // 10MB
          maxImageWidth: 2000,
          maxImageHeight: 2000,
          quality: 'auto:best', // Best quality
          fetch_format: 'auto',
        },
        (error, result) => {
          setUploading(false);
          if (error) {
            toast.error('Upload failed');
            console.error(error);
            return;
          }
          if (result.event === 'success') {
            onChange(result.info.secure_url);
            toast.success('Image uploaded successfully!');
          }
        }
      );
      widget.open();
    } else {
      setUploading(false);
      toast.error('Cloudinary not loaded. Please refresh.');
    }
  };

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    toast.success('Image URL saved!');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('cloudinary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'cloudinary' ? 'bg-primary-500 text-white shadow-md' : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'}`}>
          <FiUpload /> Upload (HD)
        </button>
        <button type="button" onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'url' ? 'bg-primary-500 text-white shadow-md' : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'}`}>
          <FiLink /> URL
        </button>
      </div>

      {mode === 'cloudinary' && !value && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-400 text-sm">
          <FiUpload className="flex-shrink-0" />
          <span>Upload HD quality images via Cloudinary</span>
        </div>
      )}

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-500/30 bg-green-50 dark:bg-green-900/20">
          <img src={value} alt="icon" className="w-14 h-14 rounded-xl object-contain bg-white dark:bg-dark-800 p-1 border border-dark-200 dark:border-dark-700" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">✓ Image ready</p>
            <p className="text-xs text-dark-400 mt-0.5">High Quality</p>
          </div>
          <button type="button" onClick={() => onChange('')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><FiX /></button>
        </div>
      ) : mode === 'cloudinary' ? (
        <button type="button" onClick={uploadToCloudinary} disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-dark-300 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-500 bg-dark-50 dark:bg-dark-800 transition-colors cursor-pointer disabled:opacity-50">
          {uploading ? (
            <><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-dark-500">Uploading...</span></>
          ) : (
            <><FiUpload className="text-3xl text-dark-400" /><span className="text-sm font-medium text-dark-600 dark:text-dark-300">Click to upload (HD Quality)</span></>
          )}
        </button>
      ) : mode === 'url' ? (
        <div className="flex gap-2">
          <input type="url" placeholder="https://example.com/image.png" value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSave())}
            className="flex-1 px-3 py-2.5 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-dark-900 dark:text-white" />
          <button type="button" onClick={handleUrlSave} disabled={!urlInput.trim()}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function PaymentMethodsPage() {
  const { format, currentCurrency, currency, rates, currencies } = useCurrency();
  const [methods, setMethods] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    image: '',
    exampleImage: '', // NEW: Example payment image
    instructions: '', // NEW: Payment instructions/note
    instructionsColor: '#3b82f6', // NEW: Note text color (default blue)
    showInstructions: true, // NEW: Show/hide instructions
    minAmount: '',
    maxAmount: '',
    feePercent: 3, // Default 3% fee
    isActive: true,
    paymentType: 'manual', // 'auto' or 'manual'
    autoPayEnabled: false, // NEW: Auto payment toggle
    // Custom form field labels
    field1Label: 'Full Name',
    field1Placeholder: 'Your full name',
    field2Label: 'Account Number',
    field2Placeholder: 'Your account/wallet number',
    field3Label: 'Transaction ID',
    field3Placeholder: 'Transaction reference number',
  });

  // Format amount range like user panel with proper conversion
  const formatAmountRange = (minAmount, maxAmount) => {
    // Convert PKR amounts to admin's selected currency
    if (currency === 'PKR') {
      // Show PKR amounts directly
      const minPkr = minAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      const maxPkr = maxAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      return `₨${minPkr} - ₨${maxPkr}`;
    }

    // Convert PKR to selected currency
    const minUsd = minAmount / rates.PKR;
    const maxUsd = maxAmount / rates.PKR;
    const minConverted = minUsd * rates[currency];
    const maxConverted = maxUsd * rates[currency];

    // Get currency symbol
    const currencyObj = currencies.find(c => c.code === currency);
    const symbol = currencyObj?.symbol || currency;

    // Format with proper decimals
    let decimals = 2;
    if (['PKR', 'BDT', 'INR', 'SAR', 'AED'].includes(currency)) {
      decimals = minConverted < 10 ? 4 : 0;
    }

    const minConvertedStr = minConverted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const maxConvertedStr = maxConverted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${symbol}${minConvertedStr} - ${symbol}${maxConvertedStr}`;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'paymentMethods'));
      setMethods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const openAdd = () => {
    setEditingMethod(null);
    setForm({ 
      name: '', 
      description: '', 
      image: '', 
      exampleImage: '',
      instructions: '',
      instructionsColor: '#3b82f6',
      showInstructions: true,
      minAmount: '', 
      maxAmount: '', 
      feePercent: 3, 
      isActive: true, 
      paymentType: 'manual',
      field1Label: 'Full Name',
      field1Placeholder: 'Your full name',
      field2Label: 'Account Number',
      field2Placeholder: 'Your account/wallet number',
      field3Label: 'Transaction ID',
      field3Placeholder: 'Transaction reference number',
      autoPayEnabled: false,
      autoPayDescription: '',
    });
    setShowModal(true);
  };

  const openEdit = (method) => {
    setEditingMethod(method);
    setForm({
      name: method.name,
      description: method.description || '',
      image: method.image || '',
      exampleImage: method.exampleImage || '',
      instructions: method.instructions || '',
      instructionsColor: method.instructionsColor || '#3b82f6',
      showInstructions: method.showInstructions !== false,
      minAmount: method.minAmount || '',
      maxAmount: method.maxAmount || '',
      feePercent: method.feePercent ?? 3,
      isActive: method.isActive,
      paymentType: method.paymentType || 'manual',
      field1Label: method.field1Label || 'Full Name',
      field1Placeholder: method.field1Placeholder || 'Your full name',
      field2Label: method.field2Label || 'Account Number',
      field2Placeholder: method.field2Placeholder || 'Your account/wallet number',
      field3Label: method.field3Label || 'Transaction ID',
      field3Placeholder: method.field3Placeholder || 'Transaction reference number',
      autoPayEnabled: method.autoPayEnabled || false,
      autoPayDescription: method.autoPayDescription || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Payment method name is required'); return; }
    if (!form.minAmount || !form.maxAmount) { toast.error('Min and max amounts are required'); return; }
    if (parseFloat(form.minAmount) >= parseFloat(form.maxAmount)) { toast.error('Min must be less than max'); return; }
    
    setSaving(true);
    try {
      const data = {
        name: form.name,
        description: form.description,
        image: form.image,
        exampleImage: form.exampleImage,
        instructions: form.instructions,
        instructionsColor: form.instructionsColor,
        showInstructions: form.showInstructions,
        minAmount: parseFloat(form.minAmount),
        maxAmount: parseFloat(form.maxAmount),
        feePercent: parseFloat(form.feePercent) || 0,
        isActive: form.isActive,
        paymentType: form.paymentType,
        field1Label: form.field1Label,
        field1Placeholder: form.field1Placeholder,
        field2Label: form.field2Label,
        field2Placeholder: form.field2Placeholder,
        field3Label: form.field3Label,
        field3Placeholder: form.field3Placeholder,
        autoPayEnabled: form.autoPayEnabled,
        autoPayDescription: form.autoPayDescription,
        updatedAt: Timestamp.now(),
      };

      if (editingMethod) {
        await updateDoc(doc(db, 'paymentMethods', editingMethod.id), data);
        toast.success('Payment method updated');
      } else {
        await addDoc(collection(db, 'paymentMethods'), {
          ...data,
          createdAt: Timestamp.now(),
        });
        toast.success('Payment method added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'paymentMethods', id));
      toast.success('Payment method deleted');
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const toggleActive = async (method) => {
    try {
      await updateDoc(doc(db, 'paymentMethods', method.id), {
        isActive: !method.isActive,
        updatedAt: Timestamp.now(),
      });
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">Payment Methods</h2>
          <p className="text-dark-500 dark:text-dark-400 text-sm">Manage payment methods for user deposits</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Method
        </button>
      </div>

      {/* Grid */}
      {methods.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">No Payment Methods</h3>
          <p className="text-dark-500 mb-6">Add payment methods to allow users to deposit funds</p>
          <button onClick={openAdd} className="btn-primary"><FiPlus className="inline mr-2" />Add Payment Method</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {methods.map((method) => (
            <div key={method.id} className="glass-card p-5 hover:shadow-xl transition-all border-t-4 border-primary-500">
              {method.image && (
                <img src={method.image} alt={method.name} className="w-full h-40 object-contain rounded-lg mb-4 bg-white dark:bg-dark-700 p-2" />
              )}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-dark-900 dark:text-white">{method.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-semibold ${method.paymentType === 'auto' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'}`}>
                  {method.paymentType === 'auto' ? '🔄 Auto' : '📋 Manual'}
                </span>
              </div>
              
              {/* Amount Range */}
              <div className="text-xs text-dark-400 space-y-1 mb-4">
                <p className="font-medium text-dark-600 dark:text-dark-300">Amount Range:</p>
                <p>{formatAmountRange(parseFloat(method.minAmount), parseFloat(method.maxAmount))}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${method.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                  {method.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(method)} className={`btn-sm ${method.isActive ? 'btn-secondary' : 'btn-primary'}`}>
                    {method.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEdit(method)} className="btn-outline btn-sm flex items-center gap-1">
                    <FiEdit2 className="text-xs" /> Edit
                  </button>
                  <button onClick={() => handleDelete(method.id, method.name)}
                    className="btn-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 flex items-center justify-center text-dark-500 text-xl">×</button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Currency Note */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 <strong>Note:</strong> Enter amounts in PKR (₨). Users will see converted prices in their selected currency.
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Method Name *</label>
                <input type="text" required placeholder="e.g., Bank Transfer, PayPal, Crypto"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
              </div>

              {/* Min / Max Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Min Amount *</label>
                  <input type="number" step="0.01" required placeholder="10"
                    value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
                  <p className="text-xs text-dark-400 mt-1">In PKR (₨)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Max Amount *</label>
                  <input type="number" step="0.01" required placeholder="1000"
                    value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                    className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
                  <p className="text-xs text-dark-400 mt-1">In PKR (₨)</p>
                </div>
              </div>

              {/* Fee Percent */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Fee Percent *</label>
                <input type="number" step="0.01" min="0" max="100" required placeholder="3"
                  value={form.feePercent} onChange={(e) => setForm({ ...form, feePercent: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
                <p className="text-xs text-dark-400 mt-1">Fee charged on deposits (e.g., 3 for 3%). Set to 0 for no fee.</p>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Payment Method Image</label>
                <IconUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Description</label>
                <textarea rows="3" placeholder="Instructions for users..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white resize-none" />
              </div>

              {/* NEW: Example Image */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Example Payment Image</label>
                <IconUpload value={form.exampleImage} onChange={(url) => setForm({ ...form, exampleImage: url })} />
                <p className="text-xs text-dark-400 mt-1">Upload example/reference image showing how to pay</p>
              </div>

              {/* NEW: Instructions/Note */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Payment Instructions/Note</label>
                <textarea rows="4" placeholder="Enter payment instructions for users (multiline supported)..."
                  value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white resize-none font-mono text-sm" />
                
                {/* Color Picker and Show/Hide Toggle */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex-1">
                    <label className="block text-xs text-dark-500 mb-1">Note Text Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={form.instructionsColor}
                        onChange={(e) => setForm({ ...form, instructionsColor: e.target.value })}
                        className="w-12 h-10 rounded-lg cursor-pointer border-2 border-dark-300 dark:border-dark-600"
                      />
                      <input
                        type="text"
                        value={form.instructionsColor}
                        onChange={(e) => setForm({ ...form, instructionsColor: e.target.value })}
                        placeholder="#3b82f6"
                        className="flex-1 px-3 py-2 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-500 mb-1">Show Note</label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, showInstructions: !form.showInstructions })}
                      className={`w-20 h-10 rounded-lg font-medium text-sm transition-all ${
                        form.showInstructions
                          ? 'bg-green-500 text-white'
                          : 'bg-dark-200 dark:bg-dark-700 text-dark-500'
                      }`}
                    >
                      {form.showInstructions ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
                
                {/* Preview */}
                {form.instructions && form.showInstructions && (
                  <div className="mt-3 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: form.instructionsColor + '40', backgroundColor: form.instructionsColor + '10' }}>
                    <p className="text-xs font-semibold mb-2 text-dark-500">Preview:</p>
                    <p className="whitespace-pre-wrap text-sm font-medium" style={{ color: form.instructionsColor }}>
                      {form.instructions}
                    </p>
                  </div>
                )}
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

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Payment Processing Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm({ ...form, paymentType: 'manual' })}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${form.paymentType === 'manual' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 'border-dark-200 dark:border-dark-700 text-dark-500 hover:border-yellow-400'}`}>
                    📋 Manual
                    <p className="text-xs mt-1 font-normal">Admin verifies each payment</p>
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, paymentType: 'auto' })}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${form.paymentType === 'auto' ? 'border-green-500 bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'border-dark-200 dark:border-dark-700 text-dark-500 hover:border-green-400'}`}>
                    🔄 Auto
                    <p className="text-xs mt-1 font-normal">Instant payment processing</p>
                  </button>
                </div>
              </div>

              {/* Coming Soon Toggle - Show for both Manual and Auto */}
              <div className="border-2 border-blue-500/30 rounded-xl p-4 bg-blue-500/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-dark-900 dark:text-white">🚧 Coming Soon Mode</h4>
                    <p className="text-xs text-dark-500 mt-1">Turn ON to show "Coming Soon" message instead of payment form</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, autoPayEnabled: !form.autoPayEnabled })}
                    className={`w-16 h-8 rounded-full transition-all ${
                      form.autoPayEnabled
                        ? 'bg-green-500'
                        : 'bg-dark-300 dark:bg-dark-700'
                    }`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                      form.autoPayEnabled ? 'translate-x-9' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {form.autoPayEnabled && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ When enabled, users will see "Coming Soon" instead of payment form
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Form Field Labels */}
              <div className="border-t-2 border-dark-200 dark:border-dark-700 pt-5 mt-2">
                <h4 className="text-sm font-bold text-dark-900 dark:text-white mb-4">📝 Custom Form Fields (User Side)</h4>
                <p className="text-xs text-dark-500 mb-4">Customize the labels and placeholders for user form fields</p>
                
                <div className="space-y-4">
                  {/* Field 1 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">Field 1 Label</label>
                      <input type="text" placeholder="e.g., Full Name"
                        value={form.field1Label}
                        onChange={(e) => setForm({ ...form, field1Label: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">Field 1 Placeholder</label>
                      <input type="text" placeholder="e.g., Your full name"
                        value={form.field1Placeholder}
                        onChange={(e) => setForm({ ...form, field1Placeholder: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>

                  {/* Field 2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">Field 2 Label</label>
                      <input type="text" placeholder="e.g., Account Number"
                        value={form.field2Label}
                        onChange={(e) => setForm({ ...form, field2Label: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">Field 2 Placeholder</label>
                      <input type="text" placeholder="e.g., Your account/wallet number"
                        value={form.field2Placeholder}
                        onChange={(e) => setForm({ ...form, field2Placeholder: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>

                  {/* Field 3 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">Field 3 Label</label>
                      <input type="text" placeholder="e.g., Transaction ID"
                        value={form.field3Label}
                        onChange={(e) => setForm({ ...form, field3Label: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-dark-600 dark:text-dark-400 mb-1">Field 3 Placeholder</label>
                      <input type="text" placeholder="e.g., Transaction reference number"
                        value={form.field3Placeholder}
                        onChange={(e) => setForm({ ...form, field3Placeholder: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : editingMethod ? 'Update' : 'Add Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
