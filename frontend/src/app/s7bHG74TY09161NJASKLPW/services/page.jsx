"use client";

import { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiFilter, FiChevronDown, FiChevronRight, FiSearch } from 'react-icons/fi';
import { uploadFile } from '@/firebase/storage';
import { useCurrency } from '@/context/CurrencyContext';
import { invalidateCache } from '@/lib/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const USE_DIRECT_API = true;
const PROXY_URL = 'https://smm-proxy.ms8347750.workers.dev';

const inputCls = "w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white placeholder-dark-400 dark:placeholder-dark-500 transition-all";
const labelCls = "block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2";

const EMPTY_FORM = {
  serviceId: '', name: '', platformId: '', categoryId: '',
  providerId: '', providerServiceId: '',
  price: '', priceUnit: 'Per 1000', minQuantity: 100, maxQuantity: 100000,
  avgTime: '1-6 Hours', description: '',
  customCommentsRequired: false,
  isActive: true, isFeatured: false, isPopular: false,
  refillSupported: false, refillPeriodDays: '', cancelSupported: false, refundSupported: false,
  maintenance: false,
};

function ProviderBrowseModal({ provider, onSelect, onClose }) {
  const { rates } = useCurrency();
  const formatPKR = (usdAmount) => {
    const pkrAmount = parseFloat(usdAmount || 0) * (rates?.PKR || 278.5);
    return `₨${pkrAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true); setError('');
    try {
      let res; let usingProxy = false;

      if (USE_DIRECT_API) {
        try {
          const params = new URLSearchParams({ key: provider.apiKey, action: 'services' });
          res = await fetch(`${provider.apiUrl}?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: AbortSignal.timeout(30000),
          });
        } catch (directError) {
          usingProxy = true;
          res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiUrl: provider.apiUrl, apiKey: provider.apiKey, action: 'services' }),
            signal: AbortSignal.timeout(30000),
          });
        }
      } else {
        usingProxy = true;
        res = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiUrl: provider.apiUrl, apiKey: provider.apiKey, action: 'services' }),
          signal: AbortSignal.timeout(30000),
        });
      }

      const responseText = await res.text();
      let result;
      try { result = JSON.parse(responseText); }
      catch (parseError) { throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`); }

      let data;
      if (usingProxy) {
        if (!result.success) throw new Error(result.error || 'Provider API request failed');
        data = result.data;
      } else {
        if (result.error) throw new Error(`Provider error: ${result.error}`);
        data = result;
      }

      if (Array.isArray(data)) { setList(data); }
      else if (data?.error) { throw new Error(`Provider error: ${data.error}`); }
      else { throw new Error('Provider returned invalid response format'); }
    } catch (e) {
      let errorMsg = e.message;
      if (e.name === 'TimeoutError' || errorMsg.includes('timeout')) {
        errorMsg = `Request timeout: ${provider.name} API took too long to respond (>30s).`;
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('fetch')) {
        errorMsg = `Network error: Cannot connect to proxy or provider.`;
      } else if (errorMsg.includes('Invalid JSON')) {
        errorMsg = `${provider.name} API returned invalid data.`;
      } else if (errorMsg.includes('CORS')) {
        errorMsg = `CORS error: Provider API blocked browser request.`;
      }
      setError(errorMsg);
    } finally { setLoading(false); }
  };

  const filtered = list.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(s.service).includes(search) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-dark-900 dark:text-white">{provider.name} — Services</h3>
            <p className="text-sm text-dark-500">{loading ? 'Loading...' : `${filtered.length} / ${list.length} services`}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 flex items-center justify-center text-dark-500 text-xl">×</button>
        </div>
        <div className="px-6 py-3 border-b border-dark-200 dark:border-dark-700 flex-shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input type="text" placeholder="Search by name, ID or category..."
              value={search} onChange={e => setSearch(e.target.value)}
              className={inputCls + ' pl-10 py-2.5'} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-dark-500">Fetching from {provider.name}...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-4">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-500 font-semibold mb-3 text-lg">Cannot Load Services</p>
              <div className="bg-dark-100 dark:bg-dark-800 rounded-xl p-4 text-left max-w-lg mx-auto mb-4">
                <p className="text-dark-400 text-sm leading-relaxed whitespace-pre-line">{error}</p>
              </div>
              <p className="text-xs text-dark-400 mb-4 max-w-md mx-auto">
                You can still add services manually by entering the Provider Service ID in the form.
              </p>
              <button onClick={load} className="btn-outline btn-sm">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-dark-400 py-16">No services found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(svc => (
                <div key={svc.service} onClick={() => onSelect(svc)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-dark-200 dark:border-dark-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all cursor-pointer group">
                  <span className="text-xs font-mono bg-dark-100 dark:bg-dark-800 text-dark-500 px-2.5 py-1 rounded-lg flex-shrink-0 min-w-[52px] text-center font-bold">{svc.service}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-900 dark:text-white font-medium line-clamp-1">{svc.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-dark-400 flex-wrap">
                      {svc.category && <span className="text-primary-500">{svc.category}</span>}
                      <span>Min: {parseInt(svc.min||0).toLocaleString()}</span>
                      <span>Max: {parseInt(svc.max||0).toLocaleString()}</span>
                      {(svc.refill===true||svc.refill==='true') && <span className="text-green-500">↩ Refill</span>}
                      {(svc.cancel===true||svc.cancel==='true') && <span className="text-blue-500">✕ Cancel</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatPKR(parseFloat(svc.rate||0))}</p>
                    <p className="text-xs text-dark-400">Per 1000</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onSelect(svc); }} className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">Select</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { format, rates } = useCurrency();

  const formatPKR = (amount) => {
    const num = parseFloat(amount || 0);
    return `₨${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  const [services, setServices] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [servicesDisplayLimit, setServicesDisplayLimit] = useState({});
  const SERVICES_PER_LOAD = 20;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sS, pS, cS, prS] = await Promise.all([
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'platforms')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'providers')),
      ]);
      setServices(sS.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const idA = parseInt(a.serviceId) || 0;
        const idB = parseInt(b.serviceId) || 0;
        return idA - idB;
      }));
      const pList = pS.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlatforms(pList);
      setCategories(cS.docs.map(d => ({ id: d.id, ...d.data() })));
      setProviders(prS.docs.map(d => ({ id: d.id, ...d.data() })));
      const exp = {}; pList.forEach(p => { exp[p.id] = true; });
      setExpanded(exp);
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.platformId) { toast.error('Select a platform'); return; }
    if (!form.categoryId) { toast.error('Select a category'); return; }
    
    // Check if Service ID is already used by another service
    if (form.serviceId && form.serviceId.trim() !== '') {
      const duplicateService = services.find(
        svc => svc.serviceId === form.serviceId.trim() && 
        (!editingService || svc.id !== editingService.id)
      );
      if (duplicateService) {
        toast.error(`Service ID "${form.serviceId}" is already used by "${duplicateService.name}"`);
        return;
      }
    }

    // Check if Provider Service ID is already used by the same provider
    if (form.providerId && form.providerServiceId && form.providerServiceId.trim() !== '') {
      const dupProvider = services.find(
        svc => svc.providerId === form.providerId &&
               svc.providerServiceId === form.providerServiceId.trim() &&
               (!editingService || svc.id !== editingService.id)
      );
      if (dupProvider) {
        const providerName = providers.find(p => p.id === form.providerId)?.name || 'this provider';
        toast.error(`Provider Service ID "${form.providerServiceId}" is already used for ${providerName} by "${dupProvider.name}"`);
        return;
      }
    }
    
    setSaving(true);
    try {
      if (!editingService && form.maintenance === undefined) form.maintenance = false;
      const data = { ...form, price: parseFloat(form.price)||0, minQuantity: parseInt(form.minQuantity)||100, maxQuantity: parseInt(form.maxQuantity)||100000, updatedAt: Timestamp.now() };
      
      if (editingService) {
        // Update existing service
        await updateDoc(doc(db, 'services', editingService.id), data);
        
        // 🚀 Update in state without re-fetch (NO reads!)
        setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...data } : s));
        toast.success('Service updated');
      } else {
        // Add new service
        const docRef = await addDoc(collection(db, 'services'), { ...data, createdAt: Timestamp.now() });
        
        // 🚀 Add to state without re-fetch (NO reads!)
        const newService = { id: docRef.id, ...data, createdAt: Timestamp.now() };
        setServices(prev => [...prev, newService].sort((a, b) => {
          const idA = parseInt(a.serviceId) || 0;
          const idB = parseInt(b.serviceId) || 0;
          return idA - idB;
        }));
        toast.success('Service added');
      }
      
      setShowModal(false); 
      setForm(EMPTY_FORM); 
      setEditingService(null);
      invalidateCache('collection:services');
      // ❌ Removed: fetchData() - NO re-fetch needed!
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const openEdit = (svc) => {
    setEditingService(svc);
    setForm({
      serviceId: svc.serviceId||'',
      name: svc.name,
      platformId: svc.platformId,
      categoryId: svc.categoryId,
      providerId: svc.providerId||'',
      providerServiceId: svc.providerServiceId||'',
      price: svc.price,
      priceUnit: svc.priceUnit || 'Per 1000',
      minQuantity: svc.minQuantity,
      maxQuantity: svc.maxQuantity,
      avgTime: svc.avgTime||'1-6 Hours',
      description: svc.description||'',
      customCommentsRequired: svc.customCommentsRequired||false,
      isActive: svc.isActive,
      isFeatured: svc.isFeatured||false,
      isPopular: svc.isPopular||false,
      refillSupported: svc.refillSupported||false,
      refillPeriodDays: svc.refillPeriodDays || '',
      cancelSupported: svc.cancelSupported||false,
      refundSupported: svc.refundSupported||false,
      refundPercent: svc.refundPercent ?? 85,
      maintenance: !!svc.maintenance,
    });
    setShowModal(true);
  };

  const openAdd = (platformId = '', categoryId = '') => {
    setEditingService(null); setForm({ ...EMPTY_FORM, platformId, categoryId }); setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteDoc(doc(db, 'services', id)); 
    
    // 🚀 Remove from state without re-fetch (NO reads!)
    setServices(prev => prev.filter(s => s.id !== id));
    invalidateCache('collection:services');
    toast.success('Deleted');
  };

  const toggleActive = async (svc) => {
    await updateDoc(doc(db, 'services', svc.id), { isActive: !svc.isActive, updatedAt: Timestamp.now() }); 
    
    // 🚀 Update in state without re-fetch (NO reads!)
    setServices(prev => prev.map(s => s.id === svc.id ? { ...s, isActive: !s.isActive } : s));
  };

  const availableCategories = form.platformId ? categories.filter(c => c.platformId === form.platformId) : [];
  const currentProvider = providers.find(p => p.id === form.providerId);

  const grouped = {};
  platforms.forEach(p => {
    if (filterPlatform !== 'all' && p.id !== filterPlatform) return;
    grouped[p.id] = { platform: p, cats: {} };
    categories.filter(c => c.platformId === p.id).forEach(c => {
      if (filterCategory !== 'all' && c.id !== filterCategory) return;
      grouped[p.id].cats[c.id] = { category: c, svcs: services.filter(s => s.platformId === p.id && s.categoryId === c.id) };
    });
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">Service Management</h2>
          <p className="text-dark-500 dark:text-dark-400 text-sm">{services.length} services across {platforms.length} platforms</p>
        </div>
        <button onClick={() => openAdd()} disabled={!platforms.length || !categories.length} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add Service
        </button>
      </div>

      {!platforms.length && <div className="glass-card p-4 mb-4 border border-yellow-500/30 bg-yellow-500/10"><p className="text-yellow-300 text-sm">Create platforms first.</p></div>}
      {platforms.length > 0 && !categories.length && <div className="glass-card p-4 mb-4 border border-yellow-500/30 bg-yellow-500/10"><p className="text-yellow-300 text-sm">Create categories first.</p></div>}

      <div className="glass-card p-4 mb-6">
        <div className="flex gap-4 items-center flex-wrap">
          <FiFilter className="text-dark-400" />
          <select value={filterPlatform} onChange={e => { setFilterPlatform(e.target.value); setFilterCategory('all'); }} className={inputCls + ' max-w-[180px] py-2'}>
            <option value="all">All Platforms</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={inputCls + ' max-w-[180px] py-2'} disabled={filterPlatform === 'all'}>
            <option value="all">All Categories</option>
            {categories.filter(c => filterPlatform === 'all' || c.platformId === filterPlatform).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.values(grouped).map(({ platform, cats }) => {
          const isExp = expanded[platform.id];
          const count = services.filter(s => s.platformId === platform.id).length;
          return (
            <div key={platform.id} className="glass-card overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800/50"
                onClick={() => setExpanded(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}>
                <div className="flex items-center gap-3">
                  {isExp ? <FiChevronDown className="text-dark-400" /> : <FiChevronRight className="text-dark-400" />}
                  {platform.icon
                    ? <img src={platform.icon} alt={platform.name} className="w-8 h-8 rounded-lg object-contain" style={{ backgroundColor: platform.color }} />
                    : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: platform.color||'#6366f1' }}>{platform.name[0]}</div>}
                  <span className="font-bold text-dark-900 dark:text-white text-lg">{platform.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-500">{count} services</span>
                </div>
                <button onClick={e => { e.stopPropagation(); openAdd(platform.id); }} className="btn-primary btn-sm flex items-center gap-1" disabled={!categories.filter(c => c.platformId === platform.id).length}>
                  <FiPlus /> Add Service
                </button>
              </div>
              {isExp && (
                <div className="border-t border-dark-200 dark:border-dark-700">
                  {Object.values(cats).length === 0
                    ? <div className="p-6 text-center text-dark-400 text-sm">No categories for {platform.name} yet.</div>
                    : Object.values(cats).map(({ category, svcs }) => (
                      <div key={category.id}>
                        <div className="flex items-center justify-between px-6 py-3 bg-dark-50 dark:bg-dark-800/40 border-b border-dark-200 dark:border-dark-700">
                          <div className="flex items-center gap-2">
                            {category.icon && <img src={category.icon} alt={category.name} className="w-5 h-5 rounded object-contain" />}
                            <span className="font-semibold text-sm text-dark-900 dark:text-white">{category.name}</span>
                            <span className="text-xs text-dark-400">({svcs.length})</span>
                          </div>
                          <button onClick={() => openAdd(platform.id, category.id)} className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 font-medium">
                            <FiPlus className="text-xs" /> Add
                          </button>
                        </div>
                        {svcs.length === 0
                          ? <div className="px-6 py-4 text-sm text-dark-400 italic">No services. <button onClick={() => openAdd(platform.id, category.id)} className="text-primary-500 hover:underline">Add one</button></div>
                          : <div className="divide-y divide-dark-100 dark:divide-dark-800">
                            {svcs.slice(0, servicesDisplayLimit[category.id] || SERVICES_PER_LOAD).map((svc) => (
                              <div key={svc.id} className={`flex items-center gap-3 px-6 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/30 transition-colors group ${!svc.isActive ? 'opacity-50' : ''}`}>
                                <span className="text-sm font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                                  {svc.serviceId}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-dark-900 dark:text-white font-medium">{svc.name}</span>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-dark-400">
                                    <span>Min: {svc.minQuantity?.toLocaleString()} · Max: {svc.maxQuantity?.toLocaleString()}</span>
                                    {svc.avgTime && <span>· {svc.avgTime}</span>}
                                    {svc.refillSupported && <span className="text-green-500">↩ Refill</span>}
                                    {svc.cancelSupported && <span className="text-blue-500">✕ Cancel</span>}
                                    {svc.isFeatured && <span className="text-yellow-500">★ Featured</span>}
                                    {svc.isPopular && <span className="text-pink-500">🔥 Popular</span>}
                                    {svc.maintenance && <span className="text-orange-500 font-bold">🔧 Maintenance</span>}
                                  </div>
                                  {/* Admin-only: Provider Name & Service ID */}
                                  <div className="flex items-center gap-3 mt-1 text-xs">
                                    {svc.providerId && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 font-medium">
                                        <span className="opacity-60">Provider:</span>
                                        <span className="font-semibold">{providers.find(p => p.id === svc.providerId)?.name || 'Unknown'}</span>
                                      </span>
                                    )}
                                    {svc.providerServiceId && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-mono font-medium">
                                        <span className="opacity-60">ID:</span>
                                        <span className="font-bold">{svc.providerServiceId}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">{format(parseFloat(svc.price||0))}/1k</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button onClick={() => toggleActive(svc)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${svc.isActive ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20' : 'bg-green-100 text-green-600 dark:bg-green-500/20'}`}>{svc.isActive ? '○' : '●'}</button>
                                  <button onClick={() => openEdit(svc)} className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center"><FiEdit2 className="text-xs" /></button>
                                  <button onClick={() => handleDelete(svc.id, svc.name)} className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 flex items-center justify-center"><FiTrash2 className="text-xs" /></button>
                                </div>
                              </div>
                            ))}
                            {svcs.length > (servicesDisplayLimit[category.id] || SERVICES_PER_LOAD) && (
                              <div className="px-6 py-4 text-center">
                                <button 
                                  onClick={() => setServicesDisplayLimit(prev => ({ ...prev, [category.id]: (prev[category.id] || SERVICES_PER_LOAD) + SERVICES_PER_LOAD }))}
                                  className="text-sm text-primary-500 hover:text-primary-600 font-semibold flex items-center gap-2 mx-auto hover:underline"
                                >
                                  <FiChevronDown /> Load More Services ({svcs.length - (servicesDisplayLimit[category.id] || SERVICES_PER_LOAD)} remaining)
                                </button>
                              </div>
                            )}
                            {(servicesDisplayLimit[category.id] || SERVICES_PER_LOAD) >= svcs.length && svcs.length > SERVICES_PER_LOAD && (
                              <div className="px-6 py-3 text-center text-xs text-dark-400">
                                All {svcs.length} services loaded
                              </div>
                            )}
                          </div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700 sticky top-0 bg-white dark:bg-dark-900">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
              <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setEditingService(null); }} className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 flex items-center justify-center text-dark-500 text-xl">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Platform *</label>
                  <select required value={form.platformId} onChange={e => setForm({ ...form, platformId: e.target.value, categoryId: '' })} className={inputCls}>
                    <option value="">Select Platform</option>
                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className={inputCls} disabled={!form.platformId}>
                    <option value="">Select Category</option>
                    {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Service Name *</label>
                <input type="text" required placeholder="e.g., TikTok Followers [100% Real] [Speed: 10K/Day]"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Service ID <span className="text-xs font-normal text-dark-400 ml-1">(shown to users — e.g. 1, 2, 100, up to 10000)</span></label>
                <input type="text" placeholder="e.g., 1001" maxLength="5"
                  value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })} className={inputCls} />
                <p className="text-xs text-dark-400 mt-1">Service ID can be 1-10000 (shown in circular badge)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Provider</label>
                  <select value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value, providerServiceId: '' })} className={inputCls}>
                    <option value="">None (Custom)</option>
                    {providers.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Provider Service ID</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g., 9705" value={form.providerServiceId}
                      onChange={e => setForm({ ...form, providerServiceId: e.target.value })}
                      className={inputCls} disabled={!form.providerId} />
                    {form.providerId && (
                      <button type="button" onClick={() => setShowBrowse(true)}
                        className="flex-shrink-0 px-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap">
                        <FiSearch /> Browse
                      </button>
                    )}
                  </div>
                  {!form.providerId && <p className="text-xs text-dark-400 mt-1">Select a provider first to browse</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Price (PKR) *</label>
                  <input type="number" step="0.0001" required placeholder="100.50"
                    value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} />
                  <p className="text-xs text-dark-400 mt-1">Price in PKR. Will be converted to user's currency.</p>
                </div>
                <div>
                  <label className={labelCls}>Price Unit *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g., Per 1000, per 100, per item, each" 
                    value={form.priceUnit || ''} 
                    onChange={e => setForm({ ...form, priceUnit: e.target.value })} 
                    className={inputCls} 
                  />
                  <p className="text-xs text-dark-400 mt-1">How the price is shown (e.g., "Per 1000" or "per view")</p>
                </div>
                <div>
                  <label className={labelCls}>Average Time</label>
                  <input type="text" placeholder="1-6 Hours" value={form.avgTime} onChange={e => setForm({ ...form, avgTime: e.target.value })} className={inputCls} />
                </div>
                <div></div>
                <div>
                  <label className={labelCls}>Min Quantity *</label>
                  <input type="number" required value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Max Quantity *</label>
                  <input type="number" required value={form.maxQuantity} onChange={e => setForm({ ...form, maxQuantity: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Refill Period (days)</label>
                  <input type="number" placeholder="e.g. 30" value={form.refillPeriodDays || ''} onChange={e => setForm({ ...form, refillPeriodDays: e.target.value })} className={inputCls} disabled={!form.refillSupported} />
                  <p className="text-xs text-dark-400 mt-1">How many days user can request refill after completion</p>
                </div>
                <div>
                  <label className={labelCls}>Refund Percent</label>
                  <input type="number" min="0" max="100" step="1" placeholder="85" value={form.refundPercent || ''} onChange={e => setForm({ ...form, refundPercent: e.target.value })} className={inputCls} disabled={!form.refundSupported} />
                  <p className="text-xs text-dark-400 mt-1">Percent refunded when admin cancels an order.</p>
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea rows="8" placeholder="Service details, instructions, requirements..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls + ' resize-none'} />
                <p className="text-xs text-dark-400 mt-1">Add detailed service information. Use line breaks for better formatting.</p>
              </div>

              <div>
                <label className={labelCls}>Features</label>
                <div className="grid grid-cols-3 gap-3">
                  {[['isActive','✓ Active'],['isFeatured','★ Featured'],['isPopular','🔥 Popular'],['refillSupported','↩ Refill'],['cancelSupported','✕ Cancel'],['refundSupported','$ Refund'],['customCommentsRequired','💬 Custom Comments']].map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setForm({ ...form, [key]: !form[key ]})}
                      className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form[key ] ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400' : 'border-dark-200 dark:border-dark-700 text-dark-500 hover:border-primary-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                <div className="flex items-center gap-3">
                  <span className="text-orange-500 text-xl">🔧</span>
                  <div>
                    <p className="font-semibold text-dark-900 dark:text-white text-sm">Maintenance Mode</p>
                    <p className="text-xs text-dark-500">Non-whitelisted users will see "Under Maintenance" for this service</p>
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

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setEditingService(null); }} disabled={saving}
                  className="flex-1 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBrowse && currentProvider && (
        <ProviderBrowseModal
          provider={currentProvider}
          onClose={() => setShowBrowse(false)}
          onSelect={svc => {
            const requiresCustomComments = svc.type === 'Custom Comments' || (svc.name && svc.name.toLowerCase().includes('custom comment'));
            const priceInPKR = parseFloat(svc.rate || 0) * (rates?.PKR || 278.5);
            let refillPeriodDays = '';
            const refillMatch = svc.name?.match(/refill[:\s]+(\d+)\s*days?/i);
            if (refillMatch) { refillPeriodDays = refillMatch[1]; }
            const description = svc.description || svc.desc || svc.dripfeed || '';
            const hasRefill = svc.refill === true || svc.refill === 'true' || refillMatch;
            setForm(prev => ({
              ...prev,
              name: svc.name || prev.name,
              providerServiceId: String(svc.service),
              price: priceInPKR.toFixed(4),
              minQuantity: parseInt(svc.min || 100),
              maxQuantity: parseInt(svc.max || 100000),
              description: description,
              refillPeriodDays: refillPeriodDays,
              customCommentsRequired: requiresCustomComments,
              refillSupported: hasRefill,
              cancelSupported: svc.cancel === true || svc.cancel === 'true',
            }));
            setShowBrowse(false);
            toast.success(`Imported! Price: ₨${priceInPKR.toFixed(4)} PKR`, { duration: 5000 });
          }}
        />
      )}
    </div>
  );
}