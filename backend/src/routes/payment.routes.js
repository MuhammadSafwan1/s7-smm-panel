const express = require('express');
const router = express.Router();
const { createPaymentIntent, confirmPayment } = require('../controllers/payment.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

// POST /api/payments/create-intent - Create a payment intent
router.post('/create-intent', verifyFirebaseToken, createPaymentIntent);

// POST /api/payments/confirm - Confirm a payment
router.post('/confirm', verifyFirebaseToken, confirmPayment);

module.exports = router;