const express = require('express');
const router = express.Router();
const {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
  syncServicesFromProvider,
} = require('../controllers/service.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { isAdmin } = require('../middleware/isAdmin');

// Public routes
router.get('/', getAllServices);
router.get('/:id', getService);

// Admin routes
router.post('/', verifyFirebaseToken, isAdmin, createService);
router.put('/:id', verifyFirebaseToken, isAdmin, updateService);
router.delete('/:id', verifyFirebaseToken, isAdmin, deleteService);
router.post('/sync', verifyFirebaseToken, isAdmin, syncServicesFromProvider);

module.exports = router;
