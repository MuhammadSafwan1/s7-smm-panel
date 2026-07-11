const express = require('express');
const router = express.Router();
const smmController = require('../controllers/smm.controller');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/verifyFirebaseToken');

// Public routes (or require auth based on your needs)
router.get('/services', smmController.getAllServices);
router.get('/services/:provider', smmController.getProviderServices);

// Protected routes - require authentication
router.post('/orders', verifyFirebaseToken, smmController.createOrder);
router.get('/orders/user', verifyFirebaseToken, smmController.getUserOrders);
router.get('/orders/:orderId', verifyFirebaseToken, smmController.getOrderStatus);
router.post('/orders/:orderId/refill', verifyFirebaseToken, smmController.createRefill);
router.post('/orders/:orderId/cancel', verifyFirebaseToken, smmController.cancelOrder);

// Admin only routes
router.get('/admin/orders', verifyFirebaseToken, requireAdmin, smmController.getAllOrders);
router.get('/admin/balances', verifyFirebaseToken, requireAdmin, smmController.getProviderBalances);

module.exports = router;
