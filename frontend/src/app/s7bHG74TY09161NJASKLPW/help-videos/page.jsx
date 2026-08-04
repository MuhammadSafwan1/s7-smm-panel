'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { cachedQuery, invalidateCache } from '@/lib/cache';
import toast from 'react-hot-toast';
import { FiTrash2, FiEdit2, FiPlus, FiVideo, FiArrowUp, FiArrowDown } from 'react-icons/fi';

export default function AdminHelpVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    videoUrl: '',
    description: '',
    category: 'Getting Started'
  });

  const categories = [
    'Getting Started',
    'Account Management',
    'Orders & Services',
    'Payments & Wallet',
    'Troubleshooting',
    'Other'
  ];

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const q = query(collection(db, 'helpVideos'), orderBy('sortOrder', 'asc'), limit(100));
      const snapshot = await cachedQuery('collection:help-videos', () => getDocs(q));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(data);
    } catch (error) {
      console.error('Error fetching help videos:', error);
      toast.error('Failed to load help videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.videoUrl.trim()) {
      toast.error('Title and Video URL are required');
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'helpVideos', editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Help video updated successfully');
      } else {
        // Create new with highest sort order
        const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.sortOrder || 0)) : 0;
        await addDoc(collection(db, 'helpVideos'), {
          ...formData,
          sortOrder: maxOrder + 1,
          createdAt: serverTimestamp()
        });
        toast.success('Help video created successfully');
      }
      
      resetForm();
      fetchVideos();
      invalidateCache('help:videos');
      invalidateCache('collection:help-videos');
    } catch (error) {
      console.error('Error saving help video:', error);
      toast.error('Failed to save help video');
    }
  };

  const handleEdit = (video) => {
    setFormData({
      title: video.title,
      videoUrl: video.videoUrl,
      description: video.description || '',
      category: video.category || 'Getting Started'
    });
    setEditingId(video.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this help video?')) return;
    
    try {
      await deleteDoc(doc(db, 'helpVideos', id));
      toast.success('Help video deleted');
      fetchVideos();
      invalidateCache('help:videos');
      invalidateCache('collection:help-videos');
    } catch (error) {
      console.error('Error deleting help video:', error);
      toast.error('Failed to delete help video');
    }
  };

  const handleReorder = async (id, direction) => {
    const currentIndex = videos.findIndex(v => v.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === videos.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newVideos = [...videos];
    [newVideos[currentIndex], newVideos[newIndex]] = [newVideos[newIndex], newVideos[currentIndex]];

    try {
      // Update sort orders
      await Promise.all([
        updateDoc(doc(db, 'helpVideos', newVideos[currentIndex].id), { sortOrder: currentIndex }),
        updateDoc(doc(db, 'helpVideos', newVideos[newIndex].id), { sortOrder: newIndex })
      ]);
      invalidateCache('help:videos');
      invalidateCache('collection:help-videos');
      setVideos(newVideos);
      toast.success('Order updated');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', videoUrl: '', description: '', category: 'Getting Started' });
    setEditingId(null);
    setShowModal(false);
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    
    try {
      // YouTube watch URLs
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // YouTube short URLs
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // YouTube shorts
      if (url.includes('youtube.com/shorts/')) {
        const videoId = url.split('shorts/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // Already embed URL
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
      
      // nocookie embed - convert to regular
      if (url.includes('youtube-nocookie.com/embed/')) {
        const videoId = url.split('embed/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // Vimeo
      if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
        if (videoId) return `https://player.vimeo.com/video/${videoId}`;
      }
      
      // Direct video URLs
      if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
      
      return url;
    } catch (error) {
      console.error('Error parsing video URL:', error);
      return '';
    }
  };

  const getVideoThumbnail = (url) => {
    if (!url) return null;
    try {
      // YouTube thumbnails
      let videoId = null;
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get('v');
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('/')[0];
      } else if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0]?.split('/')[0];
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0]?.split('/')[0];
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
      return null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-900 dark:text-white">Help Videos</h2>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
            Manage tutorial videos accessible from Help page
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Video
        </button>
      </div>

      {/* Videos List */}
      <div className="space-y-4">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className="glass-card p-4 flex flex-col md:flex-row gap-4 hover:shadow-lg transition-all"
          >
            {/* Video Preview */}
            <div className="md:w-64 flex-shrink-0">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-100 dark:bg-dark-800">
                <iframe
                  src={getEmbedUrl(video.videoUrl)}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  title={video.title}
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400">
                      {video.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-dark-900 dark:text-white">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-dark-500 dark:text-dark-400 mt-1 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleReorder(video.id, 'up')}
                    disabled={index === 0}
                    className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Move up"
                  >
                    <FiArrowUp />
                  </button>
                  <button
                    onClick={() => handleReorder(video.id, 'down')}
                    disabled={index === videos.length - 1}
                    className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Move down"
                  >
                    <FiArrowDown />
                  </button>
                  <button
                    onClick={() => handleEdit(video)}
                    className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-all"
                    title="Edit"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 transition-all"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12 glass-card">
          <FiVideo className="text-6xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-dark-500 dark:text-dark-400">No help videos yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4"
          >
            Add First Help Video
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={resetForm}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 glass-card border-b border-dark-200 dark:border-dark-700 p-6 mb-6">
                <h3 className="text-xl font-bold text-dark-900 dark:text-white">
                  {editingId ? 'Edit Help Video' : 'New Help Video'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="Enter video title"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1">{formData.title.length}/100</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Video URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                  <p className="text-xs text-dark-400 mt-1">YouTube, Vimeo, or direct video URL</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field min-h-[100px]"
                    placeholder="Brief description of what this video covers"
                    maxLength={300}
                  />
                  <p className="text-xs text-dark-400 mt-1">{formData.description.length}/300</p>
                </div>

                {/* Video Preview */}
                {formData.videoUrl && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Preview</label>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-100 dark:bg-dark-800">
                      {getEmbedUrl(formData.videoUrl) ? (
                        (() => {
                          const thumbnail = getVideoThumbnail(formData.videoUrl);
                          const embedUrl = getEmbedUrl(formData.videoUrl);
                          const isYouTube = formData.videoUrl.includes('youtube');
                          
                          if (isYouTube && thumbnail) {
                            return (
                              <div className="relative w-full h-full">
                                <img 
                                  src={thumbnail}
                                  alt="Video thumbnail"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-all">
                                  <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              loading="lazy"
                              title="Video preview"
                            />
                          );
                        })()
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-dark-400">
                          <FiVideo className="text-4xl mb-2" />
                          <p className="text-sm">Invalid video URL</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={resetForm} className="flex-1 btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    {editingId ? 'Update' : 'Create'} Video
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
