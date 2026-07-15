'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CURRENCIES = [
  { code: 'USD', symbol: '$',    name: 'US Dollar',          flag: '🇺🇸' },
  { code: 'PKR', symbol: '₨',   name: 'Pakistani Rupee',    flag: '🇵🇰' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',       flag: '🇮🇳' },
  { code: 'BDT', symbol: '৳',   name: 'Bangladeshi Taka',   flag: '🇧🇩' },
  { code: 'EUR', symbol: '€',   name: 'Euro',                flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',      flag: '🇬🇧' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',         flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal',        flag: '🇸🇦' },
];

// Accurate fallback rates vs USD (July 2025)
const FALLBACK_RATES = {
  USD: 1,
  PKR: 278.5,
  INR: 83.5,
  BDT: 110.0,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState('PKR'); // Default to PKR since all balances are in PKR
  const [rates, setRates]             = useState(FALLBACK_RATES);
  const [loading, setLoading]         = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('preferredCurrency');
      if (saved && CURRENCIES.find(c => c.code === saved)) setCurrencyState(saved);
    } catch (_) {}
    fetchRates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRates = useCallback(async () => {
    if (lastFetched && Date.now() - lastFetched < 30 * 60 * 1000) return;
    setLoading(true);
    try {
      // ExchangeRate-API open endpoint — supports PKR, INR, BDT, etc.
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (data?.result === 'success' && data.rates) {
        const needed = {};
        CURRENCIES.forEach(c => {
          if (data.rates[c.code] !== undefined) needed[c.code] = data.rates[c.code];
          else needed[c.code] = FALLBACK_RATES[c.code];
        });
        needed.USD = 1;
        setRates(needed);
        setLastFetched(Date.now());
      }
    } catch (_) {
      // silent — keeps fallback rates
    } finally {
      setLoading(false);
    }
  }, [lastFetched]);

  const setCurrency = (code) => {
    setCurrencyState(code);
    try { localStorage.setItem('preferredCurrency', code); } catch (_) {}
  };

  const convert = useCallback((pkrAmount) => {
    // All prices are stored in PKR, convert to selected currency
    if (currency === 'PKR') {
      return pkrAmount; // Already in PKR, no conversion needed
    }
    const pkrRate = rates['PKR'] ?? 278.5;
    const targetRate = rates[currency] ?? 1;
    // Convert PKR to target currency: PKR → USD → Target
    const usdAmount = pkrAmount / pkrRate;
    return usdAmount * targetRate;
  }, [currency, rates]);

  const format = useCallback((pkrAmount) => {
    const cur       = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
    const converted = convert(pkrAmount);
    
    // Determine decimals based on currency and amount
    let decimals = 2; // Default for USD, EUR, etc
    if (['PKR', 'BDT', 'INR', 'SAR', 'AED'].includes(currency)) {
      // For high-value currencies: show decimals only if amount is small
      decimals = converted < 10 ? 4 : 0;
    }
    
    // Use toLocaleString for thousands separators
    const formatted = converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${cur.symbol}${formatted}`;
  }, [currency, convert]);

  const currentCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <CurrencyContext.Provider value={{
      currency, setCurrency, rates, loading,
      convert, format, currencies: CURRENCIES, currentCurrency, fetchRates,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
