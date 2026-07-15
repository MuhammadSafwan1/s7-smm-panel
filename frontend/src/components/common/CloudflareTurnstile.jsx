'use client';

import { useEffect, useRef } from 'react';

export default function CloudflareTurnstile({ onVerify, onError, theme = 'auto' }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const styleRef = useRef(null);
  const scriptRef = useRef(null);

  useEffect(() => {
    // Aggressively hide Cloudflare test message with CSS
    const style = document.createElement('style');
    style.id = 'cf-turnstile-hider';
    style.textContent = `
      /* COMPLETELY HIDE ALL Cloudflare "testing" messages */
      .cf-turnstile div[class]:last-child,
      .cf-turnstile div:not([class]) {
        font-size: 0 !important;
        line-height: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      
      .cf-turnstile iframe + div {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        position: absolute !important;
        height: 0 !important;
        width: 0 !important;
      }
      
      /* Hide any red/colored text */
      .cf-turnstile div[style*="color"] {
        display: none !important;
      }
      
      .cf-turnstile [style*="text-align"] {
        display: none !important;
      }
      
      /* Hide last child which is usually the text */
      .cf-turnstile > div > div:last-child {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    // Real production site key - NO test message
    const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAAD2AbCQNfNViYoF_';

    // Load Cloudflare Turnstile script
    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      scriptRef.current = script;
      
      script.onload = renderWidget;
    } else if (window.turnstile) {
      renderWidget();
    }

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return;

      // Remove old widget first
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch(e) {}
        containerRef.current.innerHTML = '';
      }
      
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        callback: (token) => {
          if (onVerify) onVerify(token);
        },
        'error-callback': () => {
          if (onError) onError();
        },
      });
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch(e) {}
      }
      if (styleRef.current && styleRef.current.parentNode) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, [onVerify, onError, theme]);

  return (
    <div className="flex justify-center my-2 min-h-[65px]">
      <div ref={containerRef} />
    </div>
  );
}