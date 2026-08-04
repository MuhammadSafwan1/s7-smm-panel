'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiMinus, FiSearch, FiChevronDown, FiChevronRight, FiAlertTriangle, FiTrash2, FiXCircle, FiEdit2 } from 'react-icons/fi';
import { useCurrency } from '@/context/CurrencyContext';
import toast from 'react-hot-toast';
import { cachedQuery } from '@/lib/cache';
import ServiceEditModal from '@/components/admin/ServiceEditModal';

const PROXY_URL = 'https://smm-proxy.ms8347750.workers.dev';

export default function ServiceMonitorPage() {
  const { rates } = useCurrency();
  const [data, setData] = useState([]);
  const [issues, setIssues] = useState({ deleted: [], nameChanged: [], idChanged: [], limitsChanged: [] });
  const [platforms, setPlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'changed' | 'same'
  const [expanded, setExpanded] = useState({});
  const [servicesMap, setServicesMap] = useState({});
  const [editService, setEditService] = useState(null);
  const USD_TO_PKR = rates?.PKR || 278.5;

  const load = async () => {
    setLoading(true);
    setData([]);
    setIssues({ deleted: [], nameChanged: [], idChanged: [], limitsChanged: [] });
    try {
      const [snap, pSnap, cSnap, prSnap] = await Promise.all([
        cachedQuery('collection:services', () => getDocs(collection(db, 'services'))),
        cachedQuery('collection:platforms', () => getDocs(collection(db, 'platforms'))),
        cachedQuery('collection:categories', () => getDocs(collection(db, 'categories'))),
        cachedQuery('collection:providers', () => getDocs(collection(db, 'providers'))),
      ]);

      const allServices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const svcMap = {};
      allServices.forEach(s => { svcMap[s.id] = s; });
      setServicesMap(svcMap);
      const providersList = prSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const cList = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlatforms(pList);
      setCategories(cList);
      setProviders(providersList);

      setExpanded({});

      const byProvider = {};
      const withProvider = allServices.filter(s => s.providerId && s.providerServiceId);
      withProvider.forEach(s => {
        const pid = s.providerId;
        if (!byProvider[pid]) byProvider[pid] = [];
        byProvider[pid].push(s);
      });

      const results = [];
      const deletedList = [];
      const nameChangedList = [];
      const idChangedList = [];
      const limitsChangedList = [];

      for (const provider of providersList) {
        if (!byProvider[provider.id]?.length) continue;
        try {
          const res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiUrl: provider.apiUrl,
              apiKey: provider.apiKey,
              action: 'services',
            }),
            signal: AbortSignal.timeout(20000),
          });
          const result = await res.json();
          let liveList = [];
          if (result.success && Array.isArray(result.data)) liveList = result.data;
          else if (Array.isArray(result)) liveList = result;

          const liveMap = {};
          liveList.forEach(l => { liveMap[String(l.service)] = l; });

          // Build name-based lookup for ID change detection
          const liveByName = {};
          liveList.forEach(l => {
            if (l.name) liveByName[l.name.toLowerCase().trim()] = l;
          });

          for (const svc of byProvider[provider.id]) {
            const live = liveMap[svc.providerServiceId];

            // Service not found by ID — check if deleted or ID changed
            if (!live) {
              // Try to find by name match (ID might have changed)
              const nameKey = (svc.name || '').toLowerCase().trim();
              const matchedByName = nameKey ? liveByName[nameKey] : null;

              if (matchedByName) {
                // ID changed — found same name but different ID
                const newId = String(matchedByName.service);
                const liveRate = parseFloat(matchedByName.rate || 0);
                const liveInPKR = liveRate * USD_TO_PKR;
                const ourPrice = parseFloat(svc.price || 0);
                const diff = ourPrice - liveInPKR;

                idChangedList.push({
                  id: svc.id,
                  serviceId: svc.serviceId,
                  name: svc.name,
                  platformId: svc.platformId,
                  categoryId: svc.categoryId,
                  providerName: provider.name,
                  oldProviderServiceId: svc.providerServiceId,
                  newProviderServiceId: newId,
                  ourPrice,
                  livePrice: liveInPKR,
                  liveRate,
                  diff,
                  status: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'same',
                  ourMin: parseInt(svc.minQuantity || svc.min || 0),
                  ourMax: parseInt(svc.maxQuantity || svc.max || 0),
                  liveMin: parseInt(matchedByName.min || 0),
                  liveMax: parseInt(matchedByName.max || 0),
                  minChanged: parseInt(svc.minQuantity || svc.min || 0) !== parseInt(matchedByName.min || 0),
                  maxChanged: parseInt(svc.maxQuantity || svc.max || 0) !== parseInt(matchedByName.max || 0),
                });
              } else {
                // Service deleted by provider
                deletedList.push({
                  id: svc.id,
                  serviceId: svc.serviceId,
                  name: svc.name,
                  platformId: svc.platformId,
                  categoryId: svc.categoryId,
                  providerName: provider.name,
                  providerServiceId: svc.providerServiceId,
                  isActive: svc.isActive !== false,
                });
              }
              continue;
            }

            const ourPrice = parseFloat(svc.price || 0);
            const liveRate = parseFloat(live.rate || 0);
            const liveInPKR = liveRate * USD_TO_PKR;
            const diff = ourPrice - liveInPKR;
            const diffPercent = liveInPKR > 0 ? ((diff / liveInPKR) * 100).toFixed(2) : '0.00';

            // Check name change
            const liveName = (live.name || '').trim();
            const ourName = (svc.name || '').trim();
            const nameDiff = liveName.toLowerCase() !== ourName.toLowerCase() && liveName !== '';

            // Check min/max quantity changes
            const ourMin = parseInt(svc.minQuantity || svc.min || 0);
            const ourMax = parseInt(svc.maxQuantity || svc.max || 0);
            const liveMin = parseInt(live.min || 0);
            const liveMax = parseInt(live.max || 0);
            const minChanged = ourMin !== liveMin;
            const maxChanged = ourMax !== liveMax;
            const limitChanged = minChanged || maxChanged;

            const entry = {
              id: svc.id,
              serviceId: svc.serviceId,
              name: svc.name,
              platformId: svc.platformId,
              categoryId: svc.categoryId,
              providerName: provider.name,
              providerServiceId: svc.providerServiceId,
              ourPrice,
              livePrice: liveInPKR,
              liveRate,
              diff,
              diffPercent,
              status: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'same',
              nameChanged: nameDiff,
              liveName: nameDiff ? liveName : null,
              ourMin, ourMax, liveMin, liveMax,
              minChanged, maxChanged, limitChanged,
            };
            results.push(entry);

            if (nameDiff) {
              nameChangedList.push(entry);
            }

            if (limitChanged) {
              limitsChangedList.push(entry);
            }
          }
        } catch {}
      }

      results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
      setData(results);
      setIssues({ deleted: deletedList, nameChanged: nameChangedList, idChanged: idChangedList, limitsChanged: limitsChangedList });

      // Auto-mark deleted services as inactive
      if (deletedList.length > 0) {
        const batch = writeBatch(db);
        deletedList.forEach(s => {
          batch.update(doc(db, 'services', s.id), {
            isActive: false,
            deletedFromProvider: true,
          });
        });
        await batch.commit();
      }

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDeleteService = async (serviceId, name) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'services', serviceId));
      toast.success(`Deleted: ${name}`);
      load();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleMarkActive = async (serviceId) => {
    try {
      await updateDoc(doc(db, 'services', serviceId), {
        isActive: true,
        deletedFromProvider: false,
      });
      toast.success('Marked as active');
      load();
    } catch (e) {
      toast.error('Failed');
    }
  };

  const hasIssues = issues.deleted.length > 0 || issues.nameChanged.length > 0 || issues.idChanged.length > 0 || issues.limitsChanged.length > 0;

  const filterChanged = data.filter(d => d.status !== 'same' || d.nameChanged || d.limitChanged);
  const noChangeCount = data.filter(d => d.status === 'same' && !d.nameChanged && !d.limitChanged).length;
  const limitsChangedCount = data.filter(d => d.limitChanged).length;

  // Data filtered by the active chip (grouped list shows All / Changed / No Change)
  const visibleData = filter === 'changed'
    ? filterChanged
    : filter === 'same'
      ? data.filter(d => d.status === 'same' && !d.nameChanged && !d.limitChanged)
      : data;

  const grouped = {};
  platforms.forEach(p => {
    if (!platforms.length) return;
    grouped[p.id] = { platform: p, cats: {} };
    categories.filter(c => c.platformId === p.id).forEach(c => {
      const svcs = visibleData.filter(s => s.platformId === p.id && s.categoryId === c.id);
      if (svcs.length) grouped[p.id].cats[c.id] = { category: c, svcs };
    });
    if (!Object.keys(grouped[p.id].cats).length) delete grouped[p.id];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white">Service Monitor</h2>
          <p className="text-sm text-dark-500 mt-1">Compare prices, detect deletions, name changes & ID changes</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-primary flex items-center gap-2">
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          {loading ? 'Checking...' : 'Check Now'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-dark-500">Total Tracked</p>
          <p className="text-2xl font-bold mt-1">{data.length + issues.deleted.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-dark-500">Price Changed</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{filterChanged.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-dark-500">Increased</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{filterChanged.filter(d => d.status === 'up').length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-dark-500">Decreased</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{filterChanged.filter(d => d.status === 'down').length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-dark-500">No Change</p>
          <p className="text-2xl font-bold mt-1 text-dark-400">{noChangeCount}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-dark-500">Min/Max Changed</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{limitsChangedCount}</p>
        </div>
        <div className="glass-card p-5 border-red-500/30">
          <p className="text-xs text-dark-500">Deleted by Provider</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{issues.deleted.length}</p>
        </div>
        <div className="glass-card p-5 border-amber-500/30">
          <p className="text-xs text-dark-500">Name/ID Changed</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{issues.nameChanged.length + issues.idChanged.length}</p>
        </div>
      </div>

      {/* Issues Section */}
      {hasIssues && (
        <div className="glass-card p-5 border-red-500/30">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertTriangle className="text-red-500" size={20} />
            <h3 className="font-bold text-lg text-dark-900 dark:text-white">Issues Detected</h3>
          </div>

          {/* Deleted Services */}
          {issues.deleted.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-red-600 mb-2">🚫 Deleted by Provider ({issues.deleted.length})</h4>
              <div className="space-y-2">
                {issues.deleted.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FiXCircle className="text-red-500 flex-shrink-0" size={18} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-dark-500">#{s.serviceId} | PID: {s.providerServiceId} | {s.providerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.isActive && <span className="text-[10px] px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-medium">Auto-deactivated</span>}
                      <button onClick={() => setEditService(servicesMap[s.id] || null)} className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Edit</button>
                      <button onClick={() => handleMarkActive(s.id)} className="text-[10px] px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">Reactivate</button>
                      <button onClick={() => handleDeleteService(s.id, s.name)} className="text-[10px] px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"><FiTrash2 size={12} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ID Changed */}
          {issues.idChanged.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-amber-600 mb-2">🔄 Service ID Changed ({issues.idChanged.length})</h4>
              <div className="space-y-2">
                {issues.idChanged.map(s => (
                  <div key={s.id + s.oldProviderServiceId} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-amber-600 text-lg">🔄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-dark-500">
                          PID: <span className="line-through text-red-500">{s.oldProviderServiceId}</span>
                          {' → '}
                          <span className="text-green-600 font-bold">{s.newProviderServiceId}</span>
                          {' | '}{s.providerName}
                        </p>
                        <p className="text-[10px] text-dark-400">Website Service ID: <span className="font-bold text-blue-600 dark:text-blue-400">#{s.serviceId}</span> (Doc: <span className="font-mono">{s.id}</span>)</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 text-[10px]">
                      <p className="text-dark-500">Price diff: <span className={s.diff > 0.01 ? 'text-red-600' : s.diff < -0.01 ? 'text-green-600' : 'text-dark-400'}>₨{s.diff.toFixed(2)}</span></p>
                      {(s.minChanged || s.maxChanged) && (
                        <p className="text-dark-500 mt-0.5">
                          <span className="text-purple-600 dark:text-purple-400">Min/Max: {s.ourMin.toLocaleString()}–{s.ourMax.toLocaleString()}</span>
                          {' → '}
                          <span className="text-indigo-600 dark:text-indigo-400">{s.liveMin.toLocaleString()}–{s.liveMax.toLocaleString()}</span>
                        </p>
                      )}
                      <button onClick={() => setEditService(servicesMap[s.id] || null)} className="mt-1 text-[10px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 ml-auto"><FiEdit2 size={12} /> Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Min/Max Changed */}
          {issues.limitsChanged.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-purple-600 mb-2">📏 Min/Max Changed by Provider ({issues.limitsChanged.length})</h4>
              <div className="space-y-2">
                {issues.limitsChanged.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-purple-600">📏</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-dark-500">
                          #{s.serviceId} | {s.providerName}
                          {s.minChanged && (
                            <span className="ml-2 text-purple-600 dark:text-purple-400">Min: <span className="line-through text-red-500">{s.ourMin.toLocaleString()}</span> → <span className="text-green-600 font-bold">{s.liveMin.toLocaleString()}</span></span>
                          )}
                          {s.maxChanged && (
                            <span className="ml-2 text-indigo-600 dark:text-indigo-400">Max: <span className="line-through text-red-500">{s.ourMax.toLocaleString()}</span> → <span className="text-green-600 font-bold">{s.liveMax.toLocaleString()}</span></span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setEditService(servicesMap[s.id] || null)} className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><FiEdit2 size={12} /> Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Name Changed */}
          {issues.nameChanged.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-600 mb-2">✏️ Name Changed ({issues.nameChanged.length})</h4>
              <div className="space-y-2">
                {issues.nameChanged.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-amber-600">✏️</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-dark-500">
                          <span className="line-through text-red-500">{s.name}</span>
                          {' → '}
                          <span className="text-green-600 font-bold">{s.liveName}</span>
                        </p>
                        <p className="text-[10px] text-dark-400">#{s.serviceId} | {s.providerName}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 text-[10px]">
                      <p className="text-dark-500">Price diff: <span className={s.diff > 0.01 ? 'text-red-600' : s.diff < -0.01 ? 'text-green-600' : 'text-dark-400'}>₨{s.diff.toFixed(2)}</span></p>
                      {(s.minChanged || s.maxChanged) && (
                        <p className="text-dark-500 mt-0.5">
                          <span className="text-purple-600 dark:text-purple-400">Min/Max: {s.ourMin.toLocaleString()}–{s.ourMax.toLocaleString()}</span>
                          {' → '}
                          <span className="text-indigo-600 dark:text-indigo-400">{s.liveMin.toLocaleString()}–{s.liveMax.toLocaleString()}</span>
                        </p>
                      )}
                      <button onClick={() => setEditService(servicesMap[s.id] || null)} className="mt-1 text-[10px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 ml-auto"><FiEdit2 size={12} /> Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input type="text" placeholder="Search by name or service ID..." value={search}
            onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${filter === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-dark-50 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'}`}>
            All ({data.length})
          </button>
          <button onClick={() => setFilter('changed')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${filter === 'changed' ? 'bg-yellow-600 text-white shadow-md shadow-yellow-600/20' : 'bg-dark-50 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'}`}>
            ⚠️ Changed ({filterChanged.length})
          </button>
          <button onClick={() => setFilter('same')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${filter === 'same' ? 'bg-green-600 text-white shadow-md shadow-green-600/20' : 'bg-dark-50 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-700'}`}>
            ✅ No Change ({noChangeCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 && !hasIssues ? (
        <div className="text-center py-16 glass-card">
          <p className="text-dark-500">No services with provider mapping found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(grouped).map(({ platform, cats }) => (
            <div key={platform.id} className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800/50 border-b border-dark-200 dark:border-dark-700"
                onClick={() => setExpanded(prev => ({ ...prev, [platform.id]: !prev[platform.id] }))}>
                {expanded[platform.id] ? <FiChevronDown className="text-dark-400" /> : <FiChevronRight className="text-dark-400" />}
                {platform.icon
                  ? <img src={platform.icon} alt={platform.name} className="w-7 h-7 rounded-lg object-contain" style={{ backgroundColor: platform.color }} />
                  : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: platform.color||'#6366f1' }}>{platform.name[0]}</div>}
                <span className="font-bold text-dark-900 dark:text-white">{platform.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-dark-100 dark:bg-dark-700 text-dark-500">{data.filter(d => d.platformId === platform.id).length} services</span>
              </div>
              {expanded[platform.id] && (
                <div>
                  {Object.values(cats).map(({ category, svcs }) => {
                    const isExp = expanded[category.id] === true;
                    const changed = svcs.filter(s => s.status !== 'same' || s.limitChanged).length;
                    const nameChanges = svcs.filter(s => s.nameChanged).length;
                    const filtered = svcs.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.serviceId?.includes(search));
                    return (
                      <div key={category.id} className="border-b border-dark-100 dark:border-dark-800 last:border-0">
                        <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-dark-50 dark:hover:bg-dark-800/30"
                          onClick={() => setExpanded(prev => ({ ...prev, [category.id]: !prev[category.id] }))}>
                          {isExp ? <FiChevronDown className="text-dark-400 text-xs" /> : <FiChevronRight className="text-dark-400 text-xs" />}
                          <span className="text-sm font-semibold text-dark-700 dark:text-dark-300">{category.name}</span>
                          <span className="text-xs text-dark-400">({svcs.length})</span>
                          {changed > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-bold">{changed} changed</span>}
                          {nameChanges > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">{nameChanges} renamed</span>}
                        </div>
                        {isExp && (
                          <div className="px-4 pb-3 space-y-2">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-dark-400 py-2">No matches</p>
                            ) : filtered.map((item, i) => (
                              <div key={item.id || i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-dark-50 dark:bg-dark-800/50">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <span className="text-[10px] font-mono bg-dark-200 dark:bg-dark-700 text-dark-500 px-1.5 py-0.5 rounded font-bold">#{item.serviceId}</span>
                                    <span className="text-[10px] font-mono bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded">PID: {item.providerServiceId}</span>
                                    {item.status === 'up' && <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><FiTrendingUp size={10} />+{item.diffPercent}%</span>}
                                    {item.status === 'down' && <span className="text-[10px] bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><FiTrendingDown size={10} />{item.diffPercent}%</span>}
                                    {item.status === 'same' && <span className="text-[10px] bg-dark-100 dark:bg-dark-800 text-dark-500 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"><FiMinus size={10} />0%</span>}
                                    {item.nameChanged && <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">✏️ Name: {item.liveName}</span>}
                                    {item.minChanged && <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold">Min: {item.ourMin.toLocaleString()} → {item.liveMin.toLocaleString()}</span>}
                                    {item.maxChanged && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">Max: {item.ourMax.toLocaleString()} → {item.liveMax.toLocaleString()}</span>}
                                  </div>
                                  <p className="text-xs font-medium text-dark-900 dark:text-white truncate">{item.name}</p>
                                  <p className="text-[10px] text-dark-400">{item.providerName}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="grid grid-cols-3 gap-3 text-[10px]">
                                    <div>
                                      <p className="text-dark-400 mb-0.5">Our Price</p>
                                      <p className="text-xs font-bold text-dark-900 dark:text-white">₨{item.ourPrice.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-dark-400 mb-0.5">Provider</p>
                                      <p className="text-xs font-bold text-dark-900 dark:text-white">${item.liveRate.toFixed(4)}</p>
                                    </div>
                                    <div>
                                      <p className="text-dark-400 mb-0.5">Provider (PKR)</p>
                                      <p className={`text-xs font-bold ${item.diff > 0.01 ? 'text-red-600' : item.diff < -0.01 ? 'text-green-600' : 'text-dark-500'}`}>
                                        ₨{item.livePrice.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <p className={`text-[10px] font-bold mt-0.5 ${item.diff > 0.01 ? 'text-red-600' : item.diff < -0.01 ? 'text-green-600' : 'text-dark-400'}`}>
                                    {item.diff > 0.01 ? '+' : ''}₨{item.diff.toFixed(2)}
                                  </p>
                                  <button onClick={() => setEditService(servicesMap[item.id] || null)} className="mt-1 text-[10px] px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"><FiEdit2 size={11} /> Edit</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editService && (
        <ServiceEditModal
          service={editService}
          platforms={platforms}
          categories={categories}
          providers={providers}
          allServices={Object.values(servicesMap)}
          onClose={() => setEditService(null)}
          onSaved={(updated) => {
            // ❌ NO auto re-monitoring (no provider API calls) — patch locally only
            setServicesMap(prev => ({ ...prev, [updated.id]: { ...(prev[updated.id] || {}), ...updated } }));
            setData(prev => prev.map(entry => {
              if (entry.id !== updated.id) return entry;
              const ourPrice = parseFloat(updated.price || 0);
              const livePrice = entry.livePrice || 0;
              const diff = ourPrice - livePrice;
              return {
                ...entry,
                name: updated.name,
                serviceId: updated.serviceId,
                providerServiceId: updated.providerServiceId || entry.providerServiceId,
                ourPrice,
                diff,
                diffPercent: livePrice > 0 ? ((diff / livePrice) * 100).toFixed(2) : '0.00',
                status: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'same',
                nameChanged: false,
                liveName: null,
                ourMin: parseInt(updated.minQuantity || 0),
                ourMax: parseInt(updated.maxQuantity || 0),
                minChanged: false,
                maxChanged: false,
                limitChanged: false,
              };
            }));
            setIssues(prev => ({
              ...prev,
              idChanged: prev.idChanged.filter(i => i.id !== updated.id),
              nameChanged: prev.nameChanged.filter(i => i.id !== updated.id),
              deleted: prev.deleted.filter(i => i.id !== updated.id),
              limitsChanged: prev.limitsChanged.filter(i => i.id !== updated.id),
            }));
          }}
        />
      )}
    </div>
  );
}
