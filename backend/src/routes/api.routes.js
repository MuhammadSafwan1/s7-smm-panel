const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/verifyApiKey');
const apiController = require('../controllers/api.controller');

// API v2 - Standard SMM Panel Format (POST with action parameter)
router.post('/v2', verifyApiKey, apiController.handleApiV2);

// Legacy API v1 routes (backward compatibility)
router.get('/services', verifyApiKey, apiController.getServices);
router.get('/balance', verifyApiKey, apiController.getBalance);
router.post('/order', verifyApiKey, apiController.placeOrder);
router.get('/order/:orderId', verifyApiKey, apiController.getOrderStatus);

module.exports = router;
