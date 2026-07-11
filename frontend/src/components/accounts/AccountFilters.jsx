'use client';

import { useState, useEffect } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { getCategories } from '@/firebase/firestore';

export default function AccountFilters({ filters, onFilterChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      const { data, error } = await getCategories();
      if (!error && data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (key, value) => {
    onFilterChange({ [key]: value || undefined });
  };

  return (
    <>
      {/* Mobile filter toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden btn-secondary btn-sm flex items-center gap-2 mb-4"
      >
        <FiFilter />
        Filters
        {isOpen ? <FiX /> : null}
      </button>

      {/* Filter panel */}
      <div className={`${isOpen ? 'block' : 'hidden'} lg:block card p-5 space-y-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-dark-900 dark:text-white">Filters</h3>
          <button 
            onClick={onReset} 
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Reset
          </button>
        </div>

        {/* Category */}
        {categories.length > 0 && (
          <div>
            <label className="input-label">Category</label>
            <select
              value={filters.categoryId || ''}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className="input-field"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price Range */}
        <div>
          <label className="input-label">Min Price (₨)</label>
          <input
            type="number"
            placeholder="0"
            value={filters.minPrice || ''}
            onChange={(e) => handleChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
            className="input-field"
          />
        </div>
        
        <div>
          <label className="input-label">Max Price (₨)</label>
          <input
            type="number"
            placeholder="1000000"
            value={filters.maxPrice || ''}
            onChange={(e) => handleChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            className="input-field"
          />
        </div>

        {/* Level */}
        <div>
          <label className="input-label">Level</label>
          <input
            type="number"
            placeholder="Any level"
            value={filters.level || ''}
            onChange={(e) => handleChange('level', e.target.value ? Number(e.target.value) : undefined)}
            className="input-field"
            min="1"
            max="100"
          />
        </div>
      </div>
    </>
  );
}