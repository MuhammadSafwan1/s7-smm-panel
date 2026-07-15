const rateLimit = require('express-rate-limit');
const { getClientIP } = require('../utils/ipUtils');

// Rate limiting configurations
const rateLimitConfigs = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again after 15 minutes.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
  }),

  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    message: {
      error: 'Too many login attempts from this IP, please try again after 15 minutes.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
    skipSuccessfulRequests: true, // Don't count successful requests
  }),

  // Very strict rate limit for admin endpoints
  admin: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 admin requests per 5 minutes
    message: {
      error: 'Too many admin requests from this IP, please try again after 5 minutes.',
      retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
  }),

  // API key rate limiting
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 1 request per second average
    message: {
      error: 'API rate limit exceeded. Maximum 60 requests per minute.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.apiKey || getClientIP(req),
  }),

  // Order creation rate limiting
  orders: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Max 5 orders per minute per IP
    message: {
      error: 'Order creation rate limit exceeded. Maximum 5 orders per minute.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
  }),

  // Payment rate limiting
  payment: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // Max 3 payment attempts per minute
    message: {
      error: 'Payment rate limit exceeded. Maximum 3 attempts per minute.',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIP(req),
  }),
};

module.exports = rateLimitConfigs;