'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname } from 'next/navigation';
import { cachedQuery, invalidateCache } from '@/lib/cache';

export default function DevToolsBlocker() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [checked, setChecked] = useState(false);

  const isAdminPage = pathname?.startsWith('/s7bHG74TY09161NJASKLPW');

  // Check whitelist from Firestore
  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }
    const check = async () => {
      try {
        const snap = await cachedQuery('siteSettings:general', () => getDoc(doc(db, 'siteSettings', 'general')), 120000);
        if (snap.exists()) {
          const emails = snap.data().whitelistedEmails || [];
          const current = (user.email || '').trim().toLowerCase();
          const list = Array.isArray(emails)
            ? emails.map(e => (e || '').trim().toLowerCase()).filter(Boolean)
            : [];
          setIsWhitelisted(list.includes(current));
        }
      } catch (e) {}
      setChecked(true);
    };
    check();
  }, [user]);

  useEffect(() => {
    if (!checked) return;

    // Skip all protection for admin portal OR whitelisted users
    if (isAdminPage || isWhitelisted) return;

    // Block DevTools keyboard shortcuts only
    const handleKeyDown = (e) => {
      if (e.keyCode === 123) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
    };

    // Detect DevTools open via window size
    const detectDevTools = () => {
      const threshold = 160;
      const w = window.outerWidth - window.innerWidth > threshold;
      const h = window.outerHeight - window.innerHeight > threshold;
      if (w || h) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const interval = setInterval(detectDevTools, 500);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, [checked, isAdminPage, isWhitelisted]);

  // Don't render anything for admin pages or whitelisted users
  if (!checked || isAdminPage || isWhitelisted) return null;

  // Show Application Error overlay if DevTools detected
  if (isDevToolsOpen) {
    return (
      <div
        id="devtools-error"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483647,
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '600px', padding: '40px' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#333',
            fontFamily: 'Menlo, Consolas, monospace',
          }}>
            Application error: a client-side exception has occurred (see the browser console for more information).
          </div>
          <h1 style={{
            fontSize: '16px',
            fontWeight: 'normal',
            color: '#333',
            margin: '0 0 12px',
            lineHeight: '1.5',
          }}>
            This application is loading. Please wait a moment.
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: '0 0 8px',
          }}>
            If you see this message persist after the page has fully loaded, disable your browser extensions and hard refresh.
          </p>
          <p style={{
            fontSize: '13px',
            color: '#666',
            margin: '0 0 30px',
          }}>
            Developer Tools are not allowed on this site. Please close them and refresh.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return null;
}
