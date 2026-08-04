'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/firestore';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { cachedQuery } from '@/lib/cache';
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
      const data = await cachedQuery('help:videos', async () => {
        const q = query(collection(db, 'helpVideos'), orderBy('sortOrder', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      });
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

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(v => v.category === selectedCategory);
    }

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
    if (!url) return '';
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtube.com/shorts/')) {
      const videoId = url.split('shorts/')[1]?.split('?')[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    if (url.includes('youtube-nocookie.com/embed/')) {
      return url;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) return `https://player.vimeo.com/video/${videoId}`;
    }
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
            <FiVideo className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Help & Tutorials
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Watch step-by-step video guides to get the most out of MSF SMM Panel
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-3xl mx-auto">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1a2742] border border-gray-200 dark:border-[#253a5e] rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                    : 'bg-gray-100 dark:bg-[#253a5e] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2f4a72]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Videos Grid */}
        <div>
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e] overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Video Player */}
                  <div className="relative aspect-video bg-gray-100 dark:bg-[#253a5e]/30">
                    <iframe
                      src={getEmbedUrl(video.videoUrl)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                        {video.category}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-[#1a2742] rounded-2xl border border-gray-100 dark:border-[#253a5e]">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-[#253a5e] flex items-center justify-center mx-auto mb-4">
                <FiVideo className="text-gray-400 dark:text-gray-500" size={28} />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold text-lg">
                {searchQuery || selectedCategory !== 'All' 
                  ? 'No videos found matching your search'
                  : 'No help videos available yet'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
