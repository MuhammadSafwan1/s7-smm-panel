'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    isActive: true,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const snap = await getDocs(collection(db, 'policies'));
      setPolicies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const openAdd = () => {
    setEditingPolicy(null);
    setForm({ title: '', content: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (policy) => {
    setEditingPolicy(policy);
    setForm({
      title: policy.title,
      content: policy.content || '',
      isActive: policy.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Question is required'); return; }
    if (!form.content.trim()) { toast.error('Answer is required'); return; }
    
    setSaving(true);
    try {
      const data = {
        title: form.title,
        content: form.content,
        isActive: form.isActive,
        updatedAt: Timestamp.now(),
      };

      if (editingPolicy) {
        await updateDoc(doc(db, 'policies', editingPolicy.id), data);
        toast.success('FAQ updated');
      } else {
        await addDoc(collection(db, 'policies'), {
          ...data,
          createdAt: Timestamp.now(),
        });
        toast.success('FAQ added');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete this FAQ: "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'policies', id));
      toast.success('FAQ deleted');
      fetchData();
    } catch (err) { toast.error(err.message); }
  };

  const toggleActive = async (policy) => {
    try {
      await updateDoc(doc(db, 'policies', policy.id), {
        isActive: !policy.isActive,
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
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-1">FAQs Management</h2>
          <p className="text-dark-500 dark:text-dark-400 text-sm">Manage Frequently Asked Questions</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <FiPlus /> Add FAQ
        </button>
      </div>

      {/* Grid */}
      {policies.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">❓</div>
          <h3 className="text-xl font-bold text-dark-900 dark:text-white mb-2">No FAQs</h3>
          <p className="text-dark-500 mb-6">Add Frequently Asked Questions to help your users</p>
          <button onClick={openAdd} className="btn-primary"><FiPlus className="inline mr-2" />Add FAQ</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {policies.map((policy) => (
            <div key={policy.id} className="glass-card p-5 hover:shadow-xl transition-all border-t-4 border-blue-500">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <FiFileText className="text-blue-500 text-xl flex-shrink-0" />
                  <h3 className="font-bold text-dark-900 dark:text-white">{policy.title}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${policy.isActive ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                  {policy.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {/* Content Preview */}
              <div className="bg-dark-50 dark:bg-dark-800 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
                <p className="text-xs text-dark-600 dark:text-dark-300 whitespace-pre-wrap line-clamp-6">
                  {policy.content}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <button onClick={() => toggleActive(policy)} className={`btn-sm ${policy.isActive ? 'btn-secondary' : 'btn-primary'}`}>
                  {policy.isActive ? 'Disable' : 'Enable'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(policy)} className="btn-outline btn-sm flex items-center gap-1">
                    <FiEdit2 className="text-xs" /> Edit
                  </button>
                  <button onClick={() => handleDelete(policy.id, policy.title)}
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
          <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-dark-200 dark:border-dark-700">
              <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                {editingPolicy ? 'Edit FAQ' : 'Add FAQ'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 flex items-center justify-center text-dark-500 text-xl">×</button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Question *</label>
                <input type="text" required placeholder="e.g., I placed my order a long time ago, why hasn't it started running yet?"
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white" />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-dark-700 dark:text-dark-300 mb-2">Answer *</label>
                <textarea rows="12" required placeholder="Write your answer here..."
                  value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-3 bg-dark-50 dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-dark-900 dark:text-white resize-none" />
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

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  className="flex-1 py-3 rounded-xl border-2 border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-semibold hover:bg-dark-50 dark:hover:bg-dark-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-60">
                  {saving ? 'Saving...' : editingPolicy ? 'Update FAQ' : 'Add FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
