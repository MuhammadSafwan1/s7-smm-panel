'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAccounts,
  getAccount,
  getFeaturedAccounts,
  getLatestAccounts,
  getCategories,
} from '@/firebase/firestore';

export function useAccounts(initialFilters = {}) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  // Update filters when initialFilters change
  useEffect(() => {
    console.log('🔍 Filters changed:', initialFilters);
    setFilters(initialFilters);
  }, [initialFilters.categoryId, initialFilters.featured]);

  const fetchAccounts = useCallback(async () => {
    console.log('📡 Fetching accounts with filters:', filters);
    setLoading(true);
    setError(null);
    
    // Only pass categoryId to Firestore for efficient querying
    const dbFilters = {
      categoryId: filters.categoryId,
    };

    const { data, error: fetchError } = await getAccounts(dbFilters);
    
    console.log('📦 Raw accounts from Firestore:', data?.length, 'accounts');
    
    if (fetchError) {
      console.error('❌ Error fetching accounts:', fetchError);
      setError(fetchError);
      setAccounts([]);
    } else {
      // Apply ALL filters client-side
      let filteredData = data;

      console.log('🔧 Before filtering - Total accounts:', filteredData.length);

      // Only show available accounts
      filteredData = filteredData.filter(account => account.status === 'available');
      console.log('✅ After status filter (available only):', filteredData.length);

      // Filter by featured
      if (filters.featured !== undefined) {
        filteredData = filteredData.filter(account => account.featured === filters.featured);
        console.log('⭐ After featured filter:', filteredData.length);
      }

      // Filter by price range
      if (filters.minPrice !== undefined && filters.minPrice !== null && filters.minPrice !== '') {
        filteredData = filteredData.filter(account => account.price >= Number(filters.minPrice));
        console.log('💰 After min price filter:', filteredData.length);
      }

      if (filters.maxPrice !== undefined && filters.maxPrice !== null && filters.maxPrice !== '') {
        filteredData = filteredData.filter(account => account.price <= Number(filters.maxPrice));
        console.log('💰 After max price filter:', filteredData.length);
      }

      // Filter by exact level
      if (filters.level !== undefined && filters.level !== null && filters.level !== '') {
        filteredData = filteredData.filter(account => account.level === Number(filters.level));
        console.log('📊 After level filter:', filteredData.length);
      }

      console.log('🎯 Final filtered accounts:', filteredData.length);
      setAccounts(filteredData);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return {
    accounts,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    refetch: fetchAccounts,
  };
}

export function useAccount(id) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchAccount = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await getAccount(id);
      if (fetchError) {
        setError(fetchError);
      } else {
        setAccount(data);
      }
      setLoading(false);
    };

    fetchAccount();
  }, [id]);

  return { account, loading, error };
}

export function useFeaturedAccounts(limit = 6) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error: fetchError } = await getFeaturedAccounts(limit);
      if (fetchError) {
        setError(fetchError);
      } else {
        setAccounts(data);
      }
      setLoading(false);
    };
    fetch();
  }, [limit]);

  return { accounts, loading, error };
}

export function useLatestAccounts(limit = 8) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error: fetchError } = await getLatestAccounts(limit);
      if (fetchError) {
        setError(fetchError);
      } else {
        setAccounts(data);
      }
      setLoading(false);
    };
    fetch();
  }, [limit]);

  return { accounts, loading, error };
}

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error: fetchError } = await getCategories();
      if (fetchError) {
        setError(fetchError);
      } else {
        setCategories(data);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { categories, loading, error, refetch: () => {} };
}