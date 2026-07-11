'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from '@/hooks/useAccounts';
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from '@/utils/helpers';
import { Spinner } from '@/components/common/Loader';
import { FiArrowLeft, FiMessageCircle, FiCheck, FiStar, FiTrendingUp, FiShield, FiCalendar, FiTag, FiImage, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

export default function AccountDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('categoryId');
  const [accountId, setAccountId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Extract ID from URL on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const id = path.split('/accounts/')[1]?.split('/')[0];
      if (id && id !== 'placeholder') {
        setAccountId(decodeURIComponent(id));
      }
    }
  }, []);

  const { account, loading, error } = useAccount(accountId);

  const handleWhatsAppBuy = () => {
    const message = encodeURIComponent(
      `Hi, I'm interested in buying this account:\n\n` +
      `*${account.title}*\n` +
      `Price: ₨${account.price?.toLocaleString()}\n` +
      `Account ID: ${accountId}\n\n` +
      `Please provide more details.`
    );
    window.open(`https://wa.me/923345216246?text=${message}`, '_blank');
  };

  if (!accountId || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="container-custom py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center mx-auto mb-6">
          <FiImage className="text-3xl text-dark-400" />
        </div>
        <h2 className="text-2xl font-bold text-dark-900 dark:text-white mb-2">
          Account Not Found
        </h2>
        <p className="text-dark-500 dark:text-dark-400 mb-6">
          This account may have been sold or removed.
        </p>
        <Link href={`/accounts${categoryId ? `?categoryId=${categoryId}` : ''}`} className="btn-primary btn-sm inline-flex items-center gap-2">
          <FiArrowLeft />
          Browse Accounts
        </Link>
      </div>
    );
  }

  const images = account.images || [];

  return (
    <div className="container-custom py-12">
      {/* Back button */}
      <Link
        href={`/accounts${categoryId ? `?categoryId=${categoryId}` : ''}`}
        className="inline-flex items-center gap-2 text-dark-600 dark:text-dark-400 hover:text-primary-600 dark:hover:text-primary-400 mb-8 transition-colors"
      >
        <FiArrowLeft />
        Back to Accounts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* Main Image - Clickable for fullscreen */}
          <div 
            className="relative h-80 sm:h-96 lg:h-[500px] rounded-2xl overflow-hidden card cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => images.length > 0 && setFullscreenImage(selectedImage)}
          >
            {images.length > 0 ? (
              <Image
                src={images[selectedImage]}
                alt={account.title}
                fill
                className="object-cover hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full gradient-bg flex items-center justify-center">
                <FiStar className="text-white/30 text-6xl" />
              </div>
            )}

            {/* Status badge */}
            <div className="absolute top-4 right-4">
              <span className={`badge ${getStatusColor(account.status)} text-sm`}>
                {getStatusLabel(account.status)}
              </span>
            </div>

            {account.featured && (
              <div className="absolute top-4 left-4 flex items-center gap-1 badge-primary text-sm">
                <FiStar className="text-xs" />
                Featured
              </div>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-black/70 text-white text-sm">
                {selectedImage + 1} / {images.length}
              </div>
            )}

            {/* Click to enlarge hint */}
            {images.length > 0 && (
              <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-black/70 text-white text-xs">
                Click to enlarge
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all cursor-pointer hover:scale-105 ${
                    selectedImage === idx
                      ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-900'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`Image ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* All Images Grid - Show all uploaded images */}
          {images.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-dark-900 dark:text-white mb-3 flex items-center gap-2">
                <FiImage />
                All Images ({images.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImage(idx);
                      setFullscreenImage(idx);
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden transition-all hover:scale-105 cursor-pointer ${
                      selectedImage === idx ? 'ring-2 ring-primary-500' : ''
                    }`}
                  >
                    <Image src={img} alt={`Gallery ${idx + 1}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                      {idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-dark-900 dark:text-white mb-2">
              {account.title}
            </h1>
            {account.description && (
              <p className="text-dark-500 dark:text-dark-400 leading-relaxed whitespace-pre-line">
                {account.description}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="glass-card p-6">
            <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">Price</p>
            <p className="text-4xl font-bold gradient-text">{formatPrice(account.price)}</p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            {account.season && (
              <div className="glass-card p-4">
                <FiCalendar className="text-primary-400 mb-2" />
                <p className="text-xs text-dark-500 dark:text-dark-400">Season</p>
                <p className="font-semibold text-dark-900 dark:text-white capitalize">
                  {account.season.replace('season', 'Season ')}
                </p>
              </div>
            )}
            {account.level && (
              <div className="glass-card p-4">
                <FiTrendingUp className="text-primary-400 mb-2" />
                <p className="text-xs text-dark-500 dark:text-dark-400">Level</p>
                <p className="font-semibold text-dark-900 dark:text-white">{account.level}</p>
              </div>
            )}
            {account.rank && (
              <div className="glass-card p-4">
                <FiStar className="text-primary-400 mb-2" />
                <p className="text-xs text-dark-500 dark:text-dark-400">Rank</p>
                <p className="font-semibold text-dark-900 dark:text-white capitalize">{account.rank}</p>
              </div>
            )}
            {account.type && (
              <div className="glass-card p-4">
                <FiTag className="text-primary-400 mb-2" />
                <p className="text-xs text-dark-500 dark:text-dark-400">Type</p>
                <p className="font-semibold text-dark-900 dark:text-white capitalize">{account.type}</p>
              </div>
            )}
          </div>

          {/* Features list */}
          {account.features && account.features.length > 0 && (
            <div>
              <h3 className="font-semibold text-dark-900 dark:text-white mb-3">Account Features</h3>
              <div className="grid grid-cols-2 gap-2">
                {account.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-dark-600 dark:text-dark-400">
                    <FiCheck className="text-green-500 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Created date */}
          <p className="text-sm text-dark-400 dark:text-dark-500">
            Listed on {formatDate(account.createdAt)}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={handleWhatsAppBuy}
              disabled={account.status !== 'available'}
              className={`flex-1 btn-lg flex items-center justify-center gap-3 ${
                account.status === 'available' 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'btn-secondary opacity-50 cursor-not-allowed'
              }`}
            >
              <FiMessageCircle />
              {account.status === 'available' ? 'Buy via WhatsApp' : 'Sold Out'}
            </button>

            <Link
              href="/accounts"
              className="btn-secondary btn-lg flex items-center justify-center gap-2"
            >
              <FiArrowLeft />
              Continue Browsing
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4 pt-4 border-t border-dark-200 dark:border-dark-700">
            <div className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
              <FiShield className="text-green-500" />
              Secure Transaction
            </div>
            <div className="flex items-center gap-2 text-sm text-dark-500 dark:text-dark-400">
              <FiCheck className="text-green-500" />
              Verified Account
            </div>
          </div>

          {/* Contact Info */}
          <div className="glass-card p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
            <p className="text-sm text-green-800 dark:text-green-200 mb-2 font-semibold">
              Contact Us Directly
            </p>
            <div className="space-y-1 text-sm">
              <p className="text-dark-700 dark:text-dark-300">
                <strong>WhatsApp:</strong> +92 3345216246
              </p>
              <p className="text-dark-700 dark:text-dark-300">
                <strong>Email:</strong> ms8347750@gmail.com
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all text-white z-50"
          >
            <FiX className="text-2xl" />
          </button>

          {/* Main image */}
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
            <Image
              src={images[fullscreenImage]}
              alt={`${account.title} - Full size`}
              fill
              className="object-contain"
              quality={100}
            />
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/70 text-white text-sm">
            {fullscreenImage + 1} / {images.length}
          </div>

          {/* Navigation buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setFullscreenImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all text-white"
              >
                ❮
              </button>
              <button
                onClick={() => setFullscreenImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all text-white"
              >
                ❯
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
