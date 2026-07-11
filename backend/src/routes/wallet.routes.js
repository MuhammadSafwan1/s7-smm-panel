const express = require('express');
const router = express.Router();
const {
  getBalance,
  getTransactions,
  requestDeposit,
} = require('../controllers/wallet.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

// All wallet routes require authentication
router.get('/balance', verifyFirebaseToken, getBalance);
router.get('/transactions', verifyFirebaseToken, getTransactions);
router.post('/deposit', verifyFirebaseToken, requestDeposit);

module.exports = router;
