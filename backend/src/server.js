const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import rate limiting configurations
const rateLimitConfigs = require('./middleware/rateLimit');
const { logIPAccess } = require('./utils/ipUtils');
const { securityMiddleware } = require('./middleware/security.middleware');

const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const smmRoutes = require('./routes/smm.routes');
const platformRoutes = require('./routes/platform.routes');
const categoryRoutes = require('./routes/category.routes');
const serviceRoutes = require('./routes/service.routes');
const orderRoutes = require('./routes/order.routes');
const walletRoutes = require('./routes/wallet.routes');
const ticketRoutes = require('./routes/ticket.routes');
const notificationRoutes = require('./routes/notification.routes');
const providerRoutes = require('./routes/provider.routes');
const proxyRoutes = require('./routes/proxy.routes');
const uploadRoutes = require('./routes/upload.routes');
const userRoutes = require('./routes/user.routes');
const apiV1Routes = require('./routes/api.routes');
const verificationRoutes = require('./routes/verification.routes'); // ✅ Added
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware with enhanced headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'", 
        "https://*.firebaseapp.com", 
        "https://*.googleapis.com",
        "https://*.google.com",
        "https://securetoken.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://firestore.googleapis.com",
        "https://www.googleapis.com",
        "https://fcm.googleapis.com",
        "https://firebase.googleapis.com",
        "wss://*.firebaseio.com"
      ],
      frameSrc: ["'self'", "https://*.firebaseapp.com"],
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
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://msfsmm.web.app',
    'https://msfsmm.firebaseapp.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
}));

// IP logging middleware
app.use((req, res, next) => {
  logIPAccess(req, 'api_request');
  next();
});

// Security middleware - MUST be before routes
app.use(securityMiddleware);

// General rate limiting
app.use('/api/', rateLimitConfigs.general);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MSF SMM Panel API is running', timestamp: new Date().toISOString() });
});

// Routes with specific rate limiting
app.use('/api/verification', rateLimitConfigs.auth, verificationRoutes); // ✅ Added verification routes
app.use('/api/upload', uploadRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/user', rateLimitConfigs.auth, userRoutes); // Auth rate limiting for user routes
app.use('/api', rateLimitConfigs.api, apiV1Routes); // API rate limiting for public API
app.use('/api/providers', rateLimitConfigs.admin, providerRoutes); // Admin rate limiting
app.use('/api/platforms', platformRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders', rateLimitConfigs.orders, orderRoutes); // Order rate limiting
app.use('/api/wallet', rateLimitConfigs.payment, walletRoutes); // Payment rate limiting
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', rateLimitConfigs.payment, paymentRoutes); // Payment rate limiting
app.use('/api/admin', rateLimitConfigs.admin, adminRoutes); // Admin rate limiting
app.use('/api/smm', smmRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MSF SMM Panel Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
});

module.exports = app;