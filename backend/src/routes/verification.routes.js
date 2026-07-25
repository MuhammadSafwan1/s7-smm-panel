const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification.controller');

// Send verification code
router.post('/send', verificationController.sendVerificationCode);

// Verify code
router.post('/verify', verificationController.verifyCode);

// Resend code
router.post('/resend', verificationController.resendVerificationCode);

module.exports = router;
