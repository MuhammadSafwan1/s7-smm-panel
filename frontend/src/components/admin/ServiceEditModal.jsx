'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSearch } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';
import { invalidateCache } from '@/lib/cache';
import { updateServiceLive } from '@/lib/liveSync';

const USE_DIRECT_API = true;
const PROXY_URL = 'https://smm-proxy.ms8347750.workers.dev';

const inputCls = "w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white placeholder-dark-400 dark:placeholder-dark-500 transition-all";
const labelCls = "block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2";

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

      if (Array.isArray(data)) {
        setList(data);
      }
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

export default function ServiceEditModal({ service, platforms, categories, providers, allServices = [], onClose, onSaved }) {
  const { rates } = useCurrency();
  const [saving, setSaving] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [form, setForm] = useState(() => ({
    serviceId: service.serviceId||'',
    name: service.name,
    platformId: service.platformId,
    categoryId: service.categoryId,
    providerId: service.providerId||'',
    providerServiceId: service.providerServiceId||'',
    price: service.price,
    priceUnit: service.priceUnit || 'Per 1000',
    minQuantity: service.minQuantity,
    maxQuantity: service.maxQuantity,
    avgTime: service.avgTime||'1-6 Hours',
    description: service.description||'',
    customCommentsRequired: service.customCommentsRequired||false,
    isActive: service.isActive,
    isFeatured: service.isFeatured||false,
    isPopular: service.isPopular||false,
    isBestSeller: service.isBestSeller||false,
    isTrending: service.isTrending||false,
    isTopRated: service.isTopRated||false,
    isSale: service.isSale||false,
    isPremium: service.isPremium||false,
    isVIP: service.isVIP||false,
    refillSupported: service.refillSupported||false,
    refillPeriodDays: service.refillPeriodDays || '',
    cancelSupported: service.cancelSupported||false,
    refundSupported: service.refundSupported||false,
    refundPercent: service.refundPercent ?? 85,
    maintenance: !!service.maintenance,
  }));

  const currentProvider = providers.find(p => p.id === form.providerId);
  const availableCategories = form.platformId ? categories.filter(c => c.platformId === form.platformId) : [];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.platformId) { toast.error('Select a platform'); return; }
    if (!form.categoryId) { toast.error('Select a category'); return; }

    if (form.serviceId && form.serviceId.trim() !== '') {
      const duplicateService = allServices.find(
        svc => svc.serviceId === form.serviceId.trim() && svc.id !== service.id
      );
      if (duplicateService) {
        toast.error(`Service ID "${form.serviceId.trim()}" is already used by "${duplicateService.name}"`);
        return;
      }
    }

    if (form.providerId && form.providerServiceId && form.providerServiceId.trim() !== '') {
      const dupProviderService = allServices.find(
        svc => svc.providerId === form.providerId &&
               svc.providerServiceId === form.providerServiceId.trim() &&
               svc.id !== service.id
      );
      if (dupProviderService) {
        const providerName = providers.find(p => p.id === form.providerId)?.name || 'this provider';
        toast.error(`Provider Service ID "${form.providerServiceId}" is already used for ${providerName} by "${dupProviderService.name}"`);
        return;
      }
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        serviceId: String(form.serviceId||'').trim(),
        price: parseFloat(form.price)||0,
        minQuantity: parseInt(form.minQuantity)||1,
        maxQuantity: parseInt(form.maxQuantity)||100000,
        updatedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, 'services', service.id), data);
      invalidateCache('collection:services');
      invalidateCache('services:');
      invalidateCache('collection:services:byServiceId');
      updateServiceLive({ id: service.id, ...data }); // 🔴 real-time: only this service
      toast.success('Service updated');
      onSaved && onSaved({ id: service.id, ...data });
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showBrowse && currentProvider && (
        <ProviderBrowseModal
          provider={currentProvider}
          onClose={() => setShowBrowse(false)}
          onSelect={async svc => {
            const requiresCustomComments = svc.type === 'Custom Comments' || (svc.name && svc.name.toLowerCase().includes('custom comment'));
            const priceInPKR = parseFloat(svc.rate || 0) * (rates?.PKR || 278.5);
            let refillPeriodDays = '';
            const refillMatch = svc.name?.match(/refill[:\s]+(\d+)\s*days?/i);
            if (refillMatch) { refillPeriodDays = refillMatch[1]; }

            const descKeys = ['description','desc','details','detail','note','notes','instructions','full_description','service_description','sdesc','short_desc','service_desc','long_desc','dripfeed','info','information'];
            let description = '';
            for (const key of descKeys) {
              const foundKey = Object.keys(svc).find(k => k.toLowerCase() === key.toLowerCase());
              if (foundKey && svc[foundKey]) {
                description = String(svc[foundKey]).trim();
                break;
              }
            }
            if (!description) {
              const skipKeys = ['service', 'name', 'category', 'rate', 'min', 'max', 'type', 'refill', 'cancel', 'price', 'add_type', 'link', 'dripfeed'];
              const textFields = Object.entries(svc)
                .filter(([k, v]) =>
                  typeof v === 'string' &&
                  v.length > 20 &&
                  !skipKeys.includes(k.toLowerCase())
                )
                .map(([k, v]) => v);
              if (textFields.length > 0) {
                description = textFields[0];
              }
            }

            const hasRefill = svc.refill === true || svc.refill === 'true' || refillMatch;
            setForm(prev => ({
              ...prev,
              name: svc.name || prev.name,
              providerServiceId: String(svc.service),
              price: priceInPKR.toFixed(4),
              providerPrice: priceInPKR.toFixed(4),
              minQuantity: parseInt(svc.min || 100),
              maxQuantity: parseInt(svc.max || 100000),
              description: description,
              refillPeriodDays: refillPeriodDays,
              customCommentsRequired: requiresCustomComments,
              refillSupported: hasRefill,
              cancelSupported: svc.cancel === true || svc.cancel === 'true',
            }));
            setShowBrowse(false);
          }}
        />
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700 sticky top-0 bg-white dark:bg-dark-900">
            <h3 className="text-xl font-bold text-dark-900 dark:text-white">Edit Service</h3>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 flex items-center justify-center text-dark-500 text-xl">×</button>
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
                {[['isActive','✓ Active'],['isFeatured','★ Featured'],['isPopular','🔥 Popular'],['isBestSeller','🏆 Best Seller'],['isTrending','📈 Trending'],['isTopRated','⭐ Top Rated'],['isSale','🏷️ Sale'],['isPremium','💎 Premium'],['isVIP','👑 VIP'],['refillSupported','↩ Refill'],['cancelSupported','✕ Cancel'],['refundSupported','$ Refund'],['customCommentsRequired','💬 Custom Comments']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setForm({ ...form, [key]: !form[key] })}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form[key] ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400' : 'border-dark-200 dark:border-dark-700 text-dark-500 hover:border-primary-400'}`}>
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
              <button type="button" onClick={onClose} disabled={saving}
                className="flex-1 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-60">
                {saving ? 'Saving...' : 'Update Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
