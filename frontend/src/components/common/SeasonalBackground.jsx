'use client';

import { useEffect, useState } from 'react';

export function SeasonalBackground() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    };

    checkTheme();

    const observer = new MutationObserver(() => {
      const newIsDark = document.documentElement.classList.contains('dark');
      setIsDark(newIsDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-50">
      {/* Light mode: soft blue-grey gradient */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 30%, #f0f4ff 60%, #ffffff 100%)',
        }} />
      </div>

      {/* Dark mode: modern navy gradient with subtle depth */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, #0a1628 0%, #0f1d35 30%, #111f3a 60%, #0c1a30 100%)',
        }} />
        {/* Subtle radial glow top-right */}
        <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)' }} />
        {/* Subtle radial glow bottom-left */}
        <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.4) 0%, transparent 70%)' }} />
      </div>
    </div>
  );
}
