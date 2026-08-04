const { db } = require('../config/firebaseAdmin');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate backup codes
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

// Hash API key for storage
const hashApiKey = (apiKey) => {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Generate a random API key
const generateRandomApiKey = () => {
  return `msfsmm_${crypto.randomBytes(32).toString('hex')}`;
};

// ==================== 2FA CONTROLLERS ====================

// Login 2FA verification (public endpoint - user is mid-login)
exports.verifyLogin2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 6 digits' });
    }

    // Get user's 2FA secret from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    if (!userData.twoFactorEnabled || !userData.twoFactorSecret) {
      return res.status(400).json({ error: '2FA is not enabled for this account' });
    }

    // Verify the TOTP code
    const verified = speakeasy.totp.verify({
      secret: userData.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      // Check backup codes
      const backupCodes = userData.twoFactorBackupCodes || [];
      const codeUpper = code.toUpperCase();
      const backupIndex = backupCodes.indexOf(codeUpper);

      if (backupIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(backupIndex, 1);
        await db.collection('users').doc(userId).update({
          twoFactorBackupCodes: backupCodes,
          updatedAt: new Date()
        });

        return res.json({ success: true, method: 'backup_code' });
      }

      return res.status(400).json({ error: 'Invalid verification code' });
    }

    res.json({ success: true, method: 'totp' });
  } catch (error) {
    console.error('Login 2FA verification error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
};

exports.setup2FA = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Generate secret for 2FA
    const secret = speakeasy.generateSecret({
      name: `MSF SMM (${req.user.email})`,
      issuer: 'MSF SMM Panel'
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store secret and backup codes temporarily (will be confirmed on verification)
    await db.collection('users').doc(userId).update({
      twoFactorSecretTemp: secret.base32,
      twoFactorBackupCodesTemp: backupCodes,
      updatedAt: new Date()
    });

    res.json({
      secret: secret.base32,
      qrCode,
      backupCodes
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
};

exports.verify2FA = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { code, secret } = req.body;

    if (!code || !secret) {
      return res.status(400).json({ error: 'Code and secret are required' });
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps before and after
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Get temporary backup codes
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Enable 2FA permanently
    await db.collection('users').doc(userId).update({
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: userData.twoFactorBackupCodesTemp || [],
      twoFactorSecretTemp: null,
      twoFactorBackupCodesTemp: null,
      updatedAt: new Date()
    });

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
};

exports.disable2FA = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Disable 2FA
    await db.collection('users').doc(userId).update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      twoFactorSecretTemp: null,
      twoFactorBackupCodesTemp: null,
      updatedAt: new Date()
    });

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// ==================== API KEY CONTROLLERS ====================

exports.generateApiKey = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Generate new API key
    const apiKey = generateRandomApiKey();
    const hashedApiKey = hashApiKey(apiKey);

    // Store hashed API key in database
    await db.collection('users').doc(userId).update({
      apiKey: hashedApiKey,
      apiKeyCreatedAt: new Date(),
      updatedAt: new Date()
    });

    // Return plain API key (only shown once)
    res.json({ apiKey });
  } catch (error) {
    console.error('API key generation error:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
};

exports.revokeApiKey = async (req, res) => {
  try {
    const userId = req.user.uid;

    // Remove API key from database
    await db.collection('users').doc(userId).update({
      apiKey: null,
      apiKeyCreatedAt: null,
      updatedAt: new Date()
    });

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('API key revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
};
