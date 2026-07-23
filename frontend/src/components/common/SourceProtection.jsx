'use client';

import { useEffect, useState } from 'react';

export default function SourceProtection() {
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let wasOpen = false;

    // DevTools detection via window size difference
    const checkDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      const isOpen = widthThreshold || heightThreshold;

      if (isOpen && !wasOpen) {
        wasOpen = true;
        setDevToolsOpen(true);
      } else if (!isOpen && wasOpen) {
        wasOpen = false;
        setDevToolsOpen(false);
        window.location.reload();
      }
    };

    const interval = setInterval(checkDevTools, 500);

    // Block dev tools shortcuts
    const handleKeyDown = (e) => {
      if (e.keyCode === 123) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!devToolsOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        pointerEvents: 'all',
      }}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div style={{ textAlign: 'center', padding: '40px', maxWidth: '500px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px',
          boxShadow: '0 0 40px rgba(239,68,68,0.4)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>

        <h1 style={{
          color: '#ffffff',
          fontSize: '32px',
          fontWeight: '800',
          margin: '0 0 16px',
          letterSpacing: '-0.02em',
        }}>
          Website Locked
        </h1>

        <p style={{
          color: '#94a3b8',
          fontSize: '18px',
          lineHeight: '1.6',
          margin: '0 0 30px',
        }}>
          Developer tools detected. For security reasons, please <strong style={{ color: '#e2e8f0' }}>turn off developer tools</strong> to access this website.
        </p>

        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          padding: '16px 24px',
          display: 'inline-block',
        }}>
          <p style={{
            color: '#fca5a5',
            fontSize: '14px',
            margin: 0,
          }}>
            Close DevTools and the page will reload automatically
          </p>
        </div>

        <div style={{
          marginTop: '40px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '12px 20px',
            color: '#64748b',
            fontSize: '13px',
          }}>
            <span style={{ color: '#94a3b8', fontWeight: '600' }}>F12</span> Blocked
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '12px 20px',
            color: '#64748b',
            fontSize: '13px',
          }}>
            <span style={{ color: '#94a3b8', fontWeight: '600' }}>Ctrl+Shift+I</span> Blocked
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '12px 20px',
            color: '#64748b',
            fontSize: '13px',
          }}>
            <span style={{ color: '#94a3b8', fontWeight: '600' }}>Ctrl+U</span> Blocked
          </div>
        </div>
      </div>
    </div>
  );
}
