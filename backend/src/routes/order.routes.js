const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderDetails,
  checkOrderStatus,
  requestRefill,
  cancelOrder,
} = require('../controllers/order.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

// All order routes require authentication
router.post('/', verifyFirebaseToken, createOrder);
router.get('/', verifyFirebaseToken, getUserOrders);
router.get('/:id', verifyFirebaseToken, getOrderDetails);
router.get('/:id/status', verifyFirebaseToken, checkOrderStatus);
router.post('/:id/refill', verifyFirebaseToken, requestRefill);
router.post('/:id/cancel', verifyFirebaseToken, cancelOrder);

module.exports = router;
