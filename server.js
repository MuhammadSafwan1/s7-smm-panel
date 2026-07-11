const express = require('express');
const path = require('path');
const next = require('next');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Next.js
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  // Backend API routes
  app.use('/api', require('./backend/src/routes/payment.routes'));
  app.use('/api/admin', require('./backend/src/routes/admin.routes'));

  // Serve static files
  app.use(express.static(path.join(__dirname, 'frontend/public')));

  // Handle all other routes with Next.js
  app.all('*', (req, res) => {
    return handle(req, res);
  });

  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`✅ Server running on http://localhost:${port}`);
  });
});
