const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const userController = require('../controllers/user.controller');

// 2FA Routes
router.post('/2fa/login-verify', userController.verifyLogin2FA);
router.post('/2fa/setup', verifyFirebaseToken, userController.setup2FA);
router.post('/2fa/verify', verifyFirebaseToken, userController.verify2FA);
router.post('/2fa/disable', verifyFirebaseToken, userController.disable2FA);

// API Key Routes
router.post('/api-key/generate', verifyFirebaseToken, userController.generateApiKey);
router.post('/api-key/revoke', verifyFirebaseToken, userController.revokeApiKey);

module.exports = router;
