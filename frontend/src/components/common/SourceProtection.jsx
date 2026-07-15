'use client';

import { useEffect } from 'react';

export default function SourceProtection() {
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (Inspect)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
      }
    };

    // Detect DevTools open
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // DevTools detected - redirect or show warning
        document.body.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: system-ui, -apple-system, sans-serif;
            color: white;
            text-align: center;
            padding: 20px;
          ">
            <div>
              <h1 style="font-size: 48px; margin-bottom: 20px;">⚠️</h1>
              <h2 style="font-size: 32px; margin-bottom: 16px;">Developer Tools Detected</h2>
              <p style="font-size: 18px; opacity: 0.9;">
                Access denied for security reasons.<br>
                Please close developer tools and refresh the page.
              </p>
            </div>
          </div>
        `;
      }
    };

    // Disable text selection
    const disableSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.mozUserSelect = 'none';
      document.body.style.msUserSelect = 'none';
    };

    // Console warning
    const consoleWarning = () => {
      console.log('%cSTOP!', 'color: red; font-size: 60px; font-weight: bold;');
      console.log(
        '%cThis is a browser feature intended for developers. If someone told you to copy-paste something here, it is a scam and will give them access to your account.',
        'font-size: 18px;'
      );
      console.log(
        '%c⚠️ WARNING: Do not paste any code here unless you know what you are doing!',
        'color: orange; font-size: 16px; font-weight: bold;'
      );
    };

    // Attach event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    disableSelection();
    consoleWarning();

    // Check for DevTools every 1 second
    const devToolsInterval = setInterval(detectDevTools, 1000);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
      clearInterval(devToolsInterval);
    };
  }, []);

  return null;
}
