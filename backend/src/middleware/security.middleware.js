/**
 * Security Middleware - Protection against various attacks
 * - File Injection
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - NoSQL Injection
 * - Path Traversal
 * - Command Injection
 */

// Sanitize input to prevent various injection attacks
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Remove potential XSS patterns
    input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    input = input.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    input = input.replace(/javascript:/gi, '');
    input = input.replace(/on\w+\s*=/gi, ''); // Remove inline event handlers
    
    // Remove potential SQL injection patterns
    input = input.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '');
    input = input.replace(/(-{2}|\/\*|\*\/|;|\||&&)/g, ''); // SQL comment chars
    
    // Remove potential NoSQL injection patterns
    input = input.replace(/(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi, '');
    
    // Remove potential path traversal patterns
    input = input.replace(/\.\.[\/\\]/g, '');
    input = input.replace(/[\/\\]etc[\/\\]passwd/gi, '');
    
    // Remove potential command injection patterns
    input = input.replace(/[;&|`$()]/g, '');
    
    // Remove null bytes
    input = input.replace(/\0/g, '');
  }
  
  return input;
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const sanitizedKey = sanitizeInput(key);
      sanitized[sanitizedKey] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
};

// Validate file upload (if any)
const validateFileUpload = (file) => {
  if (!file) return true;
  
  // Allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'];
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'application/pdf',
    'text/plain'
  ];
  
  // Check file extension
  const ext = file.originalname?.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !allowedExtensions.includes(ext)) {
    return false;
  }
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return false;
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  
  // Check for double extensions (e.g., file.php.jpg)
  const doubleExt = file.originalname.match(/\.\w+\.\w+$/);
  if (doubleExt) {
    return false;
  }
  
  // Check for executable extensions hidden in filename
  const dangerousPatterns = /\.(php|exe|sh|bat|cmd|com|pif|application|gadget|msi|msp|scr|hta|cpl|jar|vbs|js|wsf|wsh)$/i;
  if (dangerousPatterns.test(file.originalname)) {
    return false;
  }
  
  return true;
};

// Main security middleware
const securityMiddleware = (req, res, next) => {
  try {
    // 1. Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // 2. Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    // 3. Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    
    // 4. Validate file uploads (if any)
    if (req.file) {
      if (!validateFileUpload(req.file)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file upload. Only images and documents are allowed.'
        });
      }
    }
    
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (!validateFileUpload(file)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid file upload. Only images and documents are allowed.'
          });
        }
      }
    }
    
    // 5. Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
    for (const header of suspiciousHeaders) {
      if (req.headers[header]) {
        console.warn(`[Security] Suspicious header detected: ${header}`);
      }
    }
    
    // 6. Block requests with null bytes in URL
    if (req.url.includes('\0') || req.url.includes('%00')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }
    
    // 7. Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
  } catch (error) {
    console.error('[Security Middleware Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Security validation failed'
    });
  }
};

// Additional validation functions
const validateUrl = (url) => {
  if (typeof url !== 'string') return false;
  
  // Must start with http:// or https://
  if (!url.match(/^https?:\/\//)) return false;
  
  // Block localhost and private IPs
  if (url.match(/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)/i)) {
    return false;
  }
  
  // Block file:// protocol
  if (url.match(/^file:\/\//i)) return false;
  
  return true;
};

const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  if (typeof phone !== 'string') return false;
  
  // Allow international format with + and digits
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

const validateAlphanumeric = (str, allowSpaces = false) => {
  if (typeof str !== 'string') return false;
  
  const regex = allowSpaces ? /^[a-zA-Z0-9\s]+$/ : /^[a-zA-Z0-9]+$/;
  return regex.test(str);
};

// Export middleware and validators
module.exports = {
  securityMiddleware,
  sanitizeInput,
  sanitizeObject,
  validateFileUpload,
  validateUrl,
  validateEmail,
  validatePhoneNumber,
  validateAlphanumeric
};
