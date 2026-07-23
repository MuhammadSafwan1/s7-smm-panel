// DevTools detection - static file (runs before React)
(function() {
  'use strict';

  function showError() {
    document.documentElement.innerHTML = '<head><title>Error</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.err{text-align:center;max-width:600px;padding:40px}.tag{display:inline-block;padding:6px 16px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;margin-bottom:24px;font-size:13px;color:#333;font-family:Menlo,Consolas,monospace}h1{font-size:16px;font-weight:normal;color:#333;margin:0 0 12px;line-height:1.5}p{font-size:13px;color:#666;margin:0 0 8px}button{padding:10px 24px;font-size:14px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500}</style></head><body><div class="err"><div class="tag">Application error: a client-side exception has occurred (see the browser console for more information).</div><h1>This application is loading. Please wait a moment.</h1><p>If you see this message persist after the page has fully loaded, disable your browser extensions and hard refresh.</p><p>Developer Tools are not allowed on this site. Please close them and refresh.</p><br><button onclick="location.reload()">Refresh</button></div></body>';
  }

  // Detect DevTools
  setInterval(function() {
    var threshold = 160;
    var w = window.outerWidth - window.innerWidth > threshold;
    var h = window.outerHeight - window.innerHeight > threshold;
    if (w || h) {
      showError();
    }
  }, 500);

})();
