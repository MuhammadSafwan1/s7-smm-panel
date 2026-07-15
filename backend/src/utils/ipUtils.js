/**
 * Get client IP address from request
 * Handles various proxy configurations and headers
 */
const getClientIP = (req) => {
  // Check for IP from various headers (in order of preference)
  const possibleIPs = [
    req.headers['cf-connecting-ip'], // Cloudflare
    req.headers['x-forwarded-for'], // Standard proxy header
    req.headers['x-real-ip'], // Nginx proxy
    req.headers['x-client-ip'], // Apache proxy
    req.headers['x-forwarded'], // General forwarded header
    req.headers['forwarded-for'], // RFC 7239
    req.headers['forwarded'], // RFC 7239
    req.connection.remoteAddress, // Direct connection
    req.socket.remoteAddress, // Socket connection
    req.connection.socket ? req.connection.socket.remoteAddress : null,
    req.info ? req.info.remoteAddress : null, // Hapi.js
  ];

  // Find first valid IP
  for (const ip of possibleIPs) {
    if (ip) {
      // Handle comma-separated IPs (take the first one)
      const cleanIP = ip.split(',')[0].trim();
      
      // Validate IP format
      if (isValidIP(cleanIP)) {
        return cleanIP;
      }
    }
  }

  // Fallback to unknown
  return 'unknown';
};

/**
 * Validate IP address format
 */
const isValidIP = (ip) => {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Get geographical info from IP (basic)
 */
const getIPInfo = (ip) => {
  const info = {
    ip,
    isLocal: false,
    isPrivate: false,
    country: 'unknown',
  };

  // Check for local/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    info.isLocal = true;
  }

  // Private IP ranges
  const privateRanges = [
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
  ];

  for (const range of privateRanges) {
    if (range.test(ip)) {
      info.isPrivate = true;
      break;
    }
  }

  return info;
};

/**
 * Log IP access for security monitoring
 */
const logIPAccess = (req, action = 'access') => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referer = req.headers['referer'] || 'direct';
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip,
    action,
    userAgent,
    referer,
    endpoint: req.originalUrl || req.url,
    method: req.method,
    ipInfo: getIPInfo(ip),
  };

  // In production, you might want to log this to a file or database
  console.log('IP Access Log:', JSON.stringify(logEntry, null, 2));
  
  return logEntry;
};

module.exports = {
  getClientIP,
  isValidIP,
  getIPInfo,
  logIPAccess,
};