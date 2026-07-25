const { db } = require('../config/firebaseAdmin');
const { sendVerificationEmail } = require('../services/emailService');

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification code
 * POST /api/verification/send
 */
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    // Check if user already exists
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered. Please login.' 
      });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore (temporary collection)
    await db.collection('verificationCodes').doc(email).set({
      code,
      email,
      name,
      expiresAt,
      createdAt: new Date(),
      attempts: 0
    });

    // Send email
    const emailResult = await sendVerificationEmail(email, code, name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email. Please try again.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Verification code sent to your email' 
    });

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Verify code
 * POST /api/verification/verify
 */
exports.verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and code are required' 
      });
    }

    // Get stored code
    const codeDoc = await db.collection('verificationCodes').doc(email).get();

    if (!codeDoc.exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code not found or expired' 
      });
    }

    const codeData = codeDoc.data();

    // Check expiration
    if (new Date() > codeData.expiresAt.toDate()) {
      await db.collection('verificationCodes').doc(email).delete();
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code expired. Please request a new one.' 
      });
    }

    // Check attempts (max 5)
    if (codeData.attempts >= 5) {
      await db.collection('verificationCodes').doc(email).delete();
      return res.status(400).json({ 
        success: false, 
        message: 'Too many attempts. Please request a new code.' 
      });
    }

    // Verify code
    if (codeData.code !== code) {
      // Increment attempts
      await db.collection('verificationCodes').doc(email).update({
        attempts: codeData.attempts + 1
      });

      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code. Please try again.' 
      });
    }

    // Code is valid - delete it
    await db.collection('verificationCodes').doc(email).delete();

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Resend verification code
 * POST /api/verification/resend
 */
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Get existing code doc
    const codeDoc = await db.collection('verificationCodes').doc(email).get();

    if (!codeDoc.exists) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending verification found' 
      });
    }

    const codeData = codeDoc.data();

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Update code
    await db.collection('verificationCodes').doc(email).update({
      code,
      expiresAt,
      attempts: 0,
      resentAt: new Date()
    });

    // Send email
    const emailResult = await sendVerificationEmail(email, code, codeData.name);

    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification email' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Verification code resent' 
    });

  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};
