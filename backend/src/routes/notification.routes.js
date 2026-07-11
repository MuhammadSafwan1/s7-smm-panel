const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

// All notification routes require authentication
router.get('/', verifyFirebaseToken, getUserNotifications);
router.put('/:id/read', verifyFirebaseToken, markAsRead);
router.put('/read-all', verifyFirebaseToken, markAllAsRead);

module.exports = router;
