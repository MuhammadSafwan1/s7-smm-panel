'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, getStatusColor, getStatusLabel, truncateText } from '@/utils/helpers';
import { FiMessageCircle, FiStar, FiTrendingUp } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function AccountCard({ account, index = 0, categoryId = null }) {
  const handleWhatsAppClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const message = encodeURIComponent(
      `Hi, I'm interested in: ${account.title}\nPrice: ₨${account.price?.toLocaleString()}`
    );
    window.open(`https://wa.me/923345216246?text=${message}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/accounts/${account.id}${categoryId ? `?categoryId=${categoryId}` : ''}`} className="group block">
        <div className="card-hover overflow-hidden">
          {/* Image */}
          <div className="relative h-48 sm:h-56 overflow-hidden">
            {account.images && account.images.length > 0 ? (
              <Image
                src={account.images[0]}
                alt={account.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full gradient-bg flex items-center justify-center">
                <FiStar className="text-white/50 text-5xl" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {account.featured && (
                <span className="badge-primary flex items-center gap-1 text-xs">
                  <FiStar className="text-xs" />
                  Featured
                </span>
              )}
            </div>
            <div className="absolute top-3 right-3">
              <span className={`badge ${getStatusColor(account.status)}`}>
                {getStatusLabel(account.status)}
              </span>
            </div>

            {/* Price */}
            <div className="absolute bottom-3 left-3">
              <span className="text-2xl font-bold text-white drop-shadow-lg">
                {formatPrice(account.price)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-semibold text-lg mb-2 text-dark-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {truncateText(account.title, 50)}
            </h3>

            {/* Details */}
            <div className="flex flex-wrap gap-3 mb-4">
              {account.level && (
                <span className="inline-flex items-center gap-1 text-xs text-dark-500 dark:text-dark-400">
                  <FiTrendingUp className="text-primary-400" />
                  Level {account.level}
                </span>
              )}
              {account.season && (
                <span className="inline-flex items-center gap-1 text-xs text-dark-500 dark:text-dark-400">
                  {account.season.replace('season', 'S')}
                </span>
              )}
              {account.rank && (
                <span className="inline-flex items-center gap-1 text-xs text-dark-500 dark:text-dark-400 capitalize">
                  {account.rank}
                </span>
              )}
            </div>

            {/* Action */}
            <button
              onClick={handleWhatsAppClick}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                account.status === 'available'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-dark-200 dark:bg-dark-700 text-dark-400 cursor-not-allowed'
              }`}
              disabled={account.status !== 'available'}
            >
              <FiMessageCircle />
              {account.status === 'available' ? 'Buy via WhatsApp' : 'Sold Out'}
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}