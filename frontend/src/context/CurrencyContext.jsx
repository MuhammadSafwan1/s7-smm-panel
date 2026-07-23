'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CURRENCIES = [
  { code: 'AED', symbol: 'د.إ',  name: 'UAE Dirham',         flag: '🇦🇪' },
  { code: 'ARS', symbol: 'AR$',  name: 'Argentine Peso',     flag: '🇦🇷' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',  flag: '🇦🇺' },
  { code: 'BDT', symbol: '৳',    name: 'Bangladeshi Taka',   flag: '🇧🇩' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',     flag: '🇧🇷' },
  { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar',    flag: '🇨🇦' },
  { code: 'CLP', symbol: 'CL$',  name: 'Chilean Peso',       flag: '🇨🇱' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',       flag: '🇨🇳' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso',     flag: '🇨🇴' },
  { code: 'EGP', symbol: 'E£',   name: 'Egyptian Pound',     flag: '🇪🇬' },
  { code: 'EUR', symbol: '€',    name: 'Euro',               flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',    name: 'British Pound',      flag: '🇬🇧' },
  { code: 'IDR', symbol: 'Rp',   name: 'Indonesian Rupiah',  flag: '🇮🇩' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',       flag: '🇮🇳' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',       flag: '🇯🇵' },
  { code: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling',    flag: '🇰🇪' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won',   flag: '🇰🇷' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso',       flag: '🇲🇽' },
  { code: 'MYR', symbol: 'RM',   name: 'Malaysian Ringgit',  flag: '🇲🇾' },
  { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira',     flag: '🇳🇬' },
  { code: 'PHP', symbol: '₱',    name: 'Philippine Peso',    flag: '🇵🇭' },
  { code: 'PKR', symbol: '₨',    name: 'Pakistani Rupee',    flag: '🇵🇰' },
  { code: 'RUB', symbol: '₽',    name: 'Russian Ruble',      flag: '🇷🇺' },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',        flag: '🇸🇦' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',   flag: '🇸🇬' },
  { code: 'THB', symbol: '฿',    name: 'Thai Baht',          flag: '🇹🇭' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira',       flag: '🇹🇷' },
  { code: 'USD', symbol: '$',    name: 'US Dollar',          flag: '🇺🇸' },
  { code: 'VND', symbol: '₫',    name: 'Vietnamese Dong',    flag: '🇻🇳' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand', flag: '🇿🇦' },
];

// Accurate fallback rates vs USD (July 2025)
const FALLBACK_RATES = {
  AED: 3.67,
  ARS: 985.0,
  AUD: 1.52,
  BDT: 110.0,
  BRL: 5.45,
  CAD: 1.37,
  CLP: 950.0,
  CNY: 7.24,
  COP: 4100.0,
  EGP: 48.5,
  EUR: 0.92,
  GBP: 0.79,
  IDR: 15800.0,
  INR: 83.5,
  JPY: 149.5,
  KES: 129.0,
  KRW: 1320.0,
  MXN: 18.2,
  MYR: 4.48,
  NGN: 1450.0,
  PHP: 56.5,
  PKR: 278.5,
  RUB: 88.0,
  SAR: 3.75,
  SGD: 1.34,
  THB: 35.2,
  TRY: 32.5,
  USD: 1,
  VND: 24500.0,
  ZAR: 18.5,
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
    
    // Always show 3 decimal places for consistency
    const decimals = 3;
    
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
