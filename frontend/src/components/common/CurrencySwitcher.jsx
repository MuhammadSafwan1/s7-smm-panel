'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { FiChevronDown, FiRefreshCw } from 'react-icons/fi';

export default function CurrencySwitcher() {
  const { currency, setCurrency, currencies, currentCurrency, loading, fetchRates } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700
          text-dark-700 dark:text-dark-300 text-sm font-semibold
          border border-dark-200 dark:border-dark-700
          transition-all duration-200"
        title="Change currency"
      >
        <span className="text-base leading-none">{currentCurrency.flag}</span>
        <span>{currentCurrency.code}</span>
        {loading
          ? <FiRefreshCw className="text-xs animate-spin text-primary-500" />
          : <FiChevronDown className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 z-50 overflow-hidden animate-slide-down">
            <div className="px-3 py-2.5 border-b border-dark-100 dark:border-dark-800">
              <p className="text-xs font-bold text-dark-500 uppercase tracking-wider">Select Currency</p>
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {currencies.map(cur => (
                <button
                  key={cur.code}
                  onClick={() => { setCurrency(cur.code); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all hover:bg-dark-50 dark:hover:bg-dark-800 ${
                    currency === cur.code
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-dark-700 dark:text-dark-300'
                  }`}
                >
                  <span className="text-lg leading-none w-6 flex-shrink-0">{cur.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold leading-tight">{cur.code}</p>
                    <p className="text-xs text-dark-400 leading-tight">{cur.name}</p>
                  </div>
                  <span className="text-xs font-bold text-dark-400">{cur.symbol}</span>
                  {currency === cur.code && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-dark-100 dark:border-dark-800">
              <button
                onClick={() => { fetchRates(); }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-dark-400 hover:text-primary-500 transition-colors"
              >
                <FiRefreshCw className={`text-xs ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Updating rates...' : 'Refresh live rates'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
