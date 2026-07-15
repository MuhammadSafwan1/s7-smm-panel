const { db } = require('../config/firebaseAdmin');
const crypto = require('crypto');

/**
 * Middleware to verify API key from body parameter (standard SMM format) or X-API-Key header
 */
const verifyApiKey = async (req, res, next) => {
  try {
    // Get API key from body (standard SMM format) or header
    const apiKey = req.body.key || req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Unauthorized: No API key provided' });
    }

    // Validate API key format
    if (!apiKey.startsWith('msfsmm_')) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key format' });
    }

    // Hash the provided API key
    const hashedApiKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find user with this API key
    const usersSnapshot = await db.collection('users')
      .where('apiKey', '==', hashedApiKey)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if user account is active
    if (userData.status === 'banned' || userData.status === 'suspended') {
      return res.status(403).json({ error: 'Forbidden: Account is not active' });
    }

    // Attach user info to request
    req.user = {
      uid: userDoc.id,
      email: userData.email,
      role: userData.role,
      apiAuth: true
    };

    next();
  } catch (error) {
    console.error('API key verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { verifyApiKey };
