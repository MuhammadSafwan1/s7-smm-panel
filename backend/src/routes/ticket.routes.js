const express = require('express');
const router = express.Router();
const {
  getUserTickets,
  createTicket,
  getTicketDetails,
  addMessage,
  closeTicket,
} = require('../controllers/ticket.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');

// All ticket routes require authentication
router.get('/', verifyFirebaseToken, getUserTickets);
router.post('/', verifyFirebaseToken, createTicket);
router.get('/:id', verifyFirebaseToken, getTicketDetails);
router.post('/:id/messages', verifyFirebaseToken, addMessage);
router.put('/:id/close', verifyFirebaseToken, closeTicket);

module.exports = router;
