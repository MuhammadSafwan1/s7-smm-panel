const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  adjustUserBalance,
  getAllOrders,
  updateOrderStatus,
  refundOrder,
  getPendingDeposits,
  approveDeposit,
  rejectDeposit,
  getStatistics,
  getAllTickets,
} = require('../controllers/admin.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { isAdmin } = require('../middleware/isAdmin');

// All admin routes require authentication and admin role
router.use(verifyFirebaseToken, isAdmin);

// Statistics
router.get('/statistics', getStatistics);

// User Management
router.get('/users', getAllUsers);
router.post('/users/:userId/balance', adjustUserBalance);

// Order Management
router.get('/orders', getAllOrders);
router.put('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/refund', refundOrder);

// Payment/Deposit Management
router.get('/deposits/pending', getPendingDeposits);
router.post('/deposits/:id/approve', approveDeposit);
router.post('/deposits/:id/reject', rejectDeposit);

// Ticket Management
router.get('/tickets', getAllTickets);

module.exports = router;
