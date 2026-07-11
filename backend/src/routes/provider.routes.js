const express = require('express');
const router = express.Router();
const {
  getAllProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  testProviderConnection,
  checkProviderBalance,
  getProviderServices,
} = require('../controllers/provider.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { isAdmin } = require('../middleware/isAdmin');

// All provider routes require admin authentication
router.use(verifyFirebaseToken, isAdmin);

// Provider CRUD
router.get('/', getAllProviders);
router.get('/:id', getProvider);
router.post('/', createProvider);
router.put('/:id', updateProvider);
router.delete('/:id', deleteProvider);

// Provider testing and utilities
router.post('/:id/test', testProviderConnection);
router.get('/:id/balance', checkProviderBalance);
router.get('/:id/services', getProviderServices);

module.exports = router;
