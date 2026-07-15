'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export default function ThemeToaster() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read initial theme
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();

    // Watch for theme changes via MutationObserver
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: isDark
          ? {
              // Dark mode: glassmorphism transparent
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              color: '#ffffff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }
          : {
              // Light mode: white background with subtle border
              background: '#ffffff',
              border: '1px solid rgba(229, 231, 235, 0.9)',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              color: '#111827',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            },
        success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  );
}
