'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FiVideo, FiSearch, FiFilter } from 'react-icons/fi';

export default function HelpPage() {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Getting Started', 'Account Management', 'Orders & Services', 'Payments & Wallet', 'Troubleshooting', 'Other'];

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    filterVideos();
  }, [videos, selectedCategory, searchQuery]);

  const fetchVideos = async () => {
    try {
      const q = query(collection(db, 'helpVideos'), orderBy('sortOrder', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(data);
      setFilteredVideos(data);
    } catch (error) {
      console.error('Error fetching help videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVideos = () => {
    let filtered = videos;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(v => v.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
      );
    }

    setFilteredVideos(filtered);
  };

  const getEmbedUrl = (url) => {
    // Convert YouTube watch URL to embed URL
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-4 shadow-lg shadow-primary-500/50">
          <FiVideo className="text-3xl text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black gradient-text mb-4">
          Help & Tutorials
        </h1>
        <p className="text-lg text-dark-600 dark:text-dark-300 max-w-2xl mx-auto">
          Watch step-by-step video guides to get the most out of MSF SMM Panel
        </p>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 w-full"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <FiFilter className="text-dark-400 flex-shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="glass-card p-4 space-y-3 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                {/* Video Player */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-100 dark:bg-dark-800 shadow-lg">
                  <iframe
                    src={getEmbedUrl(video.videoUrl)}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Video Info */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400">
                      {video.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-dark-900 dark:text-white mb-1">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-dark-500 dark:text-dark-400 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-card">
            <FiVideo className="text-6xl text-dark-300 dark:text-dark-600 mx-auto mb-4" />
            <p className="text-dark-500 dark:text-dark-400 text-lg">
              {searchQuery || selectedCategory !== 'All' 
                ? 'No videos found matching your search'
                : 'No help videos available yet'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
