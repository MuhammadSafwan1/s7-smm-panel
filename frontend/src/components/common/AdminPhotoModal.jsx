'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';

export default function AdminPhotoModal({ isOpen, onClose, adminSettings }) {
  if (!isOpen || !adminSettings?.adminPhoto) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="relative max-w-4xl max-h-[90vh] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-4 -right-4 z-10 w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110"
          >
            <FiX className="text-2xl" />
          </button>

          {/* Image */}
          <img
            src={adminSettings.adminPhoto}
            alt={adminSettings.adminName}
            className="w-full h-full object-contain rounded-2xl shadow-2xl"
          />

          {/* Admin Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
              {adminSettings.adminName}
            </h2>
            {adminSettings.adminDescription && (
              <p className="text-white/90 text-sm">
                {adminSettings.adminDescription}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
