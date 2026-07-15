// Disable F12, Right Click, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
(function() {
  // Disable right click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      return false;
    }
    // Ctrl+S
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      return false;
    }
  });

  // Detect DevTools
  const devtools = /./;
  devtools.toString = function() {
    this.opened = true;
  };
  
  const checkDevTools = setInterval(() => {
    if (devtools.opened) {
      window.location.href = 'about:blank';
    }
    devtools.opened = false;
  }, 1000);
})();
