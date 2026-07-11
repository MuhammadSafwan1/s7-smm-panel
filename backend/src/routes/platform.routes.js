const express = require('express');
const router = express.Router();
const {
  getAllPlatforms,
  getPlatform,
  createPlatform,
  updatePlatform,
  deletePlatform,
} = require('../controllers/platform.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { isAdmin } = require('../middleware/isAdmin');

// Public routes
router.get('/', getAllPlatforms);
router.get('/:id', getPlatform);

// Admin routes
router.post('/', verifyFirebaseToken, isAdmin, createPlatform);
router.put('/:id', verifyFirebaseToken, isAdmin, updatePlatform);
router.delete('/:id', verifyFirebaseToken, isAdmin, deletePlatform);

module.exports = router;
