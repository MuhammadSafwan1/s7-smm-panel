const functions = require('firebase-functions');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Firebase Admin setup
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import controllers and middleware
const rateLimitConfigs = require('../backend/src/middleware/rateLimit');
const { logIPAccess } = require('../backend/src/utils/ipUtils');
const paymentRoutes = require('../backend/src/routes/payment.routes');
const adminRoutes = require('../backend/src/routes/admin.routes');
const smmRoutes = require('../backend/src/routes/smm.routes');
const platformRoutes = require('../backend/src/routes/platform.routes');
const categoryRoutes = require('../backend/src/routes/category.routes');
const serviceRoutes = require('../backend/src/routes/service.routes');
const orderRoutes = require('../backend/src/routes/order.routes');
const walletRoutes = require('../backend/src/routes/wallet.routes');
const ticketRoutes = require('../backend/src/routes/ticket.routes');
const notificationRoutes = require('../backend/src/routes/notification.routes');
const providerRoutes = require('../backend/src/routes/provider.routes');
const proxyRoutes = require('../backend/src/routes/proxy.routes');
const uploadRoutes = require('../backend/src/routes/upload.routes');
const userRoutes = require('../backend/src/routes/user.routes');
const apiV1Routes = require('../backend/src/routes/api.routes');
const { errorHandler, notFound } = require('../backend/src/middleware/error.middleware');

// Create Express app for the API
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.firebaseapp.com", "https://*.googleapis.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: [
    'https://msfsmm.web.app',
    'https://msfsmm.firebaseapp.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// IP logging middleware
app.use((req, res, next) => {
  try {
    logIPAccess(req, 'api_request');
  } catch (err) {
    console.warn('IP logging failed:', err.message);
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MSF SMM Panel API is running', timestamp: new Date().toISOString() });
});

// Routes with rate limiting
app.use('/api/upload', uploadRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/user', rateLimitConfigs.auth, userRoutes);
app.use('/api', rateLimitConfigs.api, apiV1Routes);
app.use('/api/providers', rateLimitConfigs.admin, providerRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', rateLimitConfigs.orders, orderRoutes);
app.use('/api/wallet', rateLimitConfigs.payment, walletRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', rateLimitConfigs.payment, paymentRoutes);
app.use('/api/admin', rateLimitConfigs.admin, adminRoutes);
app.use('/api/smm', smmRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Export as Cloud Function
exports.api = functions.runWith({
  timeoutSeconds: 540,
  memory: '1GB'
}).https.onRequest(app);

/**
 * Standalone provider proxy function — bypasses CORS
 * Call this from the frontend to fetch services from SMM providers
 */
exports.providerProxy = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { apiUrl, apiKey, action } = req.body;

    if (!apiUrl || !apiKey || !action) {
      res.status(400).json({ success: false, error: 'Missing apiUrl, apiKey, or action' });
      return;
    }

    // Build the request params
    const params = new URLSearchParams();
    params.append('key', apiKey);
    params.append('action', action);

    // Build URL
    const url = `${apiUrl}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    if (!response.ok) {
      res.status(502).json({
        success: false,
        error: `Provider responded with status ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Provider proxy error:', err);
    res.status(500).json({ success: false, error: err.message || 'Proxy request failed' });
  }
});