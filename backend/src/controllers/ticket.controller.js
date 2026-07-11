const { db } = require('../config/firebaseAdmin');
const { Timestamp } = require('firebase-admin/firestore');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get user tickets
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = db.collection('tickets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return successResponse(res, tickets, 'Tickets retrieved successfully');
  } catch (error) {
    console.error('Get user tickets error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Create ticket
const createTicket = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { subject, orderId, message, priority = 'medium' } = req.body;
    
    if (!subject || !message) {
      return errorResponse(res, 'Subject and message are required', 400);
    }
    
    const ticketData = {
      userId,
      orderId: orderId || null,
      subject,
      status: 'open',
      priority,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    const ticketRef = await db.collection('tickets').add(ticketData);
    
    // Add initial message
    await db.collection('ticketMessages').add({
      ticketId: ticketRef.id,
      userId,
      isAdmin: false,
      message,
      attachments: [],
      createdAt: Timestamp.now(),
    });
    
    // Create notification
    await db.collection('notifications').add({
      userId,
      title: 'Ticket Created',
      message: `Your support ticket has been created: ${subject}`,
      type: 'ticket',
      isRead: false,
      link: `/dashboard/tickets/${ticketRef.id}`,
      createdAt: Timestamp.now(),
    });
    
    const newTicket = await ticketRef.get();
    
    return successResponse(res, {
      id: newTicket.id,
      ...newTicket.data(),
    }, 'Ticket created successfully', 201);
  } catch (error) {
    console.error('Create ticket error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get ticket details with messages
const getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const ticketDoc = await db.collection('tickets').doc(id).get();
    
    if (!ticketDoc.exists) {
      return errorResponse(res, 'Ticket not found', 404);
    }
    
    const ticket = {
      id: ticketDoc.id,
      ...ticketDoc.data(),
    };
    
    // Check if user owns the ticket (or is admin)
    if (ticket.userId !== userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    // Get messages
    const messagesSnapshot = await db.collection('ticketMessages')
      .where('ticketId', '==', id)
      .orderBy('createdAt', 'asc')
      .get();
    
    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    ticket.messages = messages;
    
    return successResponse(res, ticket, 'Ticket retrieved successfully');
  } catch (error) {
    console.error('Get ticket details error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Add message to ticket
const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const { message, attachments = [] } = req.body;
    
    if (!message) {
      return errorResponse(res, 'Message is required', 400);
    }
    
    const ticketDoc = await db.collection('tickets').doc(id).get();
    
    if (!ticketDoc.exists) {
      return errorResponse(res, 'Ticket not found', 404);
    }
    
    const ticket = ticketDoc.data();
    
    // Check if user owns the ticket (or is admin)
    const isAdmin = req.user.role === 'admin';
    if (ticket.userId !== userId && !isAdmin) {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return errorResponse(res, 'Cannot add message to closed ticket', 400);
    }
    
    // Add message
    const messageData = {
      ticketId: id,
      userId,
      isAdmin,
      message,
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: Timestamp.now(),
    };
    
    const messageRef = await db.collection('ticketMessages').add(messageData);
    
    // Update ticket status and timestamp
    await db.collection('tickets').doc(id).update({
      status: isAdmin ? 'replied' : 'open',
      updatedAt: Timestamp.now(),
    });
    
    // Create notification for the other party
    if (isAdmin) {
      // Notify user
      await db.collection('notifications').add({
        userId: ticket.userId,
        title: 'Ticket Reply',
        message: `Admin replied to your ticket: ${ticket.subject}`,
        type: 'ticket',
        isRead: false,
        link: `/dashboard/tickets/${id}`,
        createdAt: Timestamp.now(),
      });
    }
    
    const newMessage = await messageRef.get();
    
    return successResponse(res, {
      id: newMessage.id,
      ...newMessage.data(),
    }, 'Message added successfully', 201);
  } catch (error) {
    console.error('Add message error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Close ticket
const closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const ticketDoc = await db.collection('tickets').doc(id).get();
    
    if (!ticketDoc.exists) {
      return errorResponse(res, 'Ticket not found', 404);
    }
    
    const ticket = ticketDoc.data();
    
    // Check if user owns the ticket (or is admin)
    if (ticket.userId !== userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    await db.collection('tickets').doc(id).update({
      status: 'closed',
      updatedAt: Timestamp.now(),
      closedAt: Timestamp.now(),
    });
    
    return successResponse(res, null, 'Ticket closed successfully');
  } catch (error) {
    console.error('Close ticket error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getUserTickets,
  createTicket,
  getTicketDetails,
  addMessage,
  closeTicket,
};
