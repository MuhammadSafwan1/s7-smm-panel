const { db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const smmProviderService = require('../services/smmProvider.service');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    
    let query = db.collection('users').orderBy('createdAt', 'desc');
    
    if (search) {
      // Search by email or displayName
      query = query.where('email', '>=', search).where('email', '<=', search + '\uf8ff');
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
    
    return successResponse(res, users, 'Users retrieved successfully');
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update user balance (admin only)
const adjustUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, type, description } = req.body;
    
    if (!amount || amount <= 0) {
      return errorResponse(res, 'Invalid amount', 400);
    }
    
    if (!type || !['credit', 'debit'].includes(type)) {
      return errorResponse(res, 'Type must be credit or debit', 400);
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return errorResponse(res, 'User not found', 404);
    }
    
    const currentBalance = userDoc.data()?.balance || 0;
    const adjustAmount = type === 'credit' ? parseFloat(amount) : -parseFloat(amount);
    
    if (type === 'debit' && currentBalance < amount) {
      return errorResponse(res, 'Insufficient balance', 400);
    }
    
    await db.collection('users').doc(userId).update({
      balance: FieldValue.increment(adjustAmount),
    });
    
    // Create transaction record
    await db.collection('transactions').add({
      userId,
      type,
      amount: parseFloat(amount),
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + adjustAmount,
      method: 'admin',
      reference: 'admin-adjustment',
      status: 'completed',
      description: description || `Admin ${type} adjustment`,
      createdAt: Timestamp.now(),
    });
    
    // Create notification
    await db.collection('notifications').add({
      userId,
      title: `Balance ${type === 'credit' ? 'Added' : 'Deducted'}`,
      message: `$${amount} has been ${type === 'credit' ? 'added to' : 'deducted from'} your account`,
      type: 'payment',
      isRead: false,
      link: '/dashboard/wallet',
      createdAt: Timestamp.now(),
    });
    
    return successResponse(res, {
      previousBalance: currentBalance,
      newBalance: currentBalance + adjustAmount,
      adjustment: adjustAmount,
    }, 'Balance adjusted successfully');
  } catch (error) {
    console.error('Adjust balance error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = db.collection('orders').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    console.error('Get orders error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update order status manually (admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'completed', 'partial', 'cancelled', 'refunded', 'failed', 'refilling'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }
    
    const orderDoc = await db.collection('orders').doc(id).get();
    
    if (!orderDoc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }
    
    const updates = {
      status,
      updatedAt: Timestamp.now(),
    };
    
    if (['completed', 'partial'].includes(status)) {
      updates.completedAt = Timestamp.now();
    }
    
    await db.collection('orders').doc(id).update(updates);
    
    return successResponse(res, null, 'Order status updated successfully');
  } catch (error) {
    console.error('Update order status error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Refund order manually (admin only)
const refundOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    const orderDoc = await db.collection('orders').doc(id).get();
    
    if (!orderDoc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }
    
    const order = orderDoc.data();
    
    if (order.status === 'refunded') {
      return errorResponse(res, 'Order already refunded', 400);
    }
    
    // Refund user
    const userDoc = await db.collection('users').doc(order.userId).get();
    const currentBalance = userDoc.data()?.balance || 0;
    
    await db.collection('users').doc(order.userId).update({
      balance: FieldValue.increment(order.charge),
    });
    
    // Create refund transaction
    await db.collection('transactions').add({
      userId: order.userId,
      type: 'credit',
      amount: order.charge,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + order.charge,
      method: 'refund',
      reference: id,
      status: 'completed',
      description: `Admin refund for order #${id.substring(0, 8)}`,
      createdAt: Timestamp.now(),
    });
    
    await db.collection('orders').doc(id).update({
      status: 'refunded',
      updatedAt: Timestamp.now(),
    });
    
    // Create notification
    await db.collection('notifications').add({
      userId: order.userId,
      title: 'Order Refunded',
      message: `Order #${id.substring(0, 8)} has been refunded`,
      type: 'order',
      isRead: false,
      link: `/dashboard/orders/${id}`,
      createdAt: Timestamp.now(),
    });
    
    return successResponse(res, null, 'Order refunded successfully');
  } catch (error) {
    console.error('Refund order error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get all pending deposit requests (admin only)
const getPendingDeposits = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .where('type', '==', 'credit')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    const deposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Get user info for each deposit
    for (const deposit of deposits) {
      const userDoc = await db.collection('users').doc(deposit.userId).get();
      if (userDoc.exists) {
        deposit.user = {
          email: userDoc.data().email,
          displayName: userDoc.data().displayName,
        };
      }
    }
    
    return successResponse(res, deposits, 'Pending deposits retrieved successfully');
  } catch (error) {
    console.error('Get pending deposits error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Approve deposit (admin only)
const approveDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transactionDoc = await db.collection('transactions').doc(id).get();
    
    if (!transactionDoc.exists) {
      return errorResponse(res, 'Transaction not found', 404);
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      return errorResponse(res, 'Transaction already processed', 400);
    }
    
    // Add balance to user
    await db.collection('users').doc(transaction.userId).update({
      balance: FieldValue.increment(transaction.amount),
    });
    
    // Update transaction
    await db.collection('transactions').doc(id).update({
      status: 'completed',
      balanceAfter: transaction.balanceBefore + transaction.amount,
    });
    
    // Create notification
    await db.collection('notifications').add({
      userId: transaction.userId,
      title: 'Deposit Approved',
      message: `Your deposit of $${transaction.amount} has been approved`,
      type: 'payment',
      isRead: false,
      link: '/dashboard/wallet',
      createdAt: Timestamp.now(),
    });
    
    return successResponse(res, null, 'Deposit approved successfully');
  } catch (error) {
    console.error('Approve deposit error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Reject deposit (admin only)
const rejectDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const transactionDoc = await db.collection('transactions').doc(id).get();
    
    if (!transactionDoc.exists) {
      return errorResponse(res, 'Transaction not found', 404);
    }
    
    const transaction = transactionDoc.data();
    
    if (transaction.status !== 'pending') {
      return errorResponse(res, 'Transaction already processed', 400);
    }
    
    // Update transaction
    await db.collection('transactions').doc(id).update({
      status: 'failed',
      description: `${transaction.description} - Rejected: ${reason || 'No reason provided'}`,
    });
    
    // Create notification
    await db.collection('notifications').add({
      userId: transaction.userId,
      title: 'Deposit Rejected',
      message: `Your deposit of $${transaction.amount} was rejected${reason ? `: ${reason}` : ''}`,
      type: 'payment',
      isRead: false,
      link: '/dashboard/wallet',
      createdAt: Timestamp.now(),
    });
    
    return successResponse(res, null, 'Deposit rejected');
  } catch (error) {
    console.error('Reject deposit error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get dashboard statistics (admin only)
const getStatistics = async (req, res) => {
  try {
    // Get users count
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;
    
    // Get orders count and revenue
    const ordersSnapshot = await db.collection('orders').get();
    let totalOrders = 0;
    let totalRevenue = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      totalOrders++;
      totalRevenue += order.charge || 0;
      if (order.status === 'completed') completedOrders++;
      if (order.status === 'pending' || order.status === 'processing') pendingOrders++;
    });
    
    // Get services count
    const servicesSnapshot = await db.collection('services').where('isActive', '==', true).get();
    const activeServices = servicesSnapshot.size;
    
    // Get pending deposits
    const pendingDepositsSnapshot = await db.collection('transactions')
      .where('type', '==', 'credit')
      .where('status', '==', 'pending')
      .get();
    const pendingDeposits = pendingDepositsSnapshot.size;
    
    // Get open tickets
    const openTicketsSnapshot = await db.collection('tickets')
      .where('status', '==', 'open')
      .get();
    const openTickets = openTicketsSnapshot.size;
    
    // Get provider balances
    let providerBalances = {};
    try {
      const smmDecentBalance = await smmProviderService.getBalance('smmdecent');
      const smmCloudBalance = await smmProviderService.getBalance('smmcloud');
      providerBalances = {
        smmdecent: smmDecentBalance?.balance || 0,
        smmcloud: smmCloudBalance?.balance || 0,
      };
    } catch (error) {
      console.error('Error fetching provider balances:', error);
    }
    
    return successResponse(res, {
      totalUsers,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: totalRevenue.toFixed(2),
      activeServices,
      pendingDeposits,
      openTickets,
      providerBalances,
    }, 'Statistics retrieved successfully');
  } catch (error) {
    console.error('Get statistics error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get all tickets (admin only)
const getAllTickets = async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    
    let query = db.collection('tickets').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Get user info for each ticket
    for (const ticket of tickets) {
      const userDoc = await db.collection('users').doc(ticket.userId).get();
      if (userDoc.exists) {
        ticket.user = {
          email: userDoc.data().email,
          displayName: userDoc.data().displayName,
        };
      }
    }
    
    return successResponse(res, tickets, 'Tickets retrieved successfully');
  } catch (error) {
    console.error('Get tickets error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
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
};
