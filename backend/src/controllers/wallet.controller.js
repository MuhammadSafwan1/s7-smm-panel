const { db } = require('../config/firebaseAdmin');
const { Timestamp } = require('firebase-admin/firestore');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get user balance
const getBalance = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return errorResponse(res, 'User not found', 404);
    }
    
    const userData = userDoc.data();
    
    return successResponse(res, {
      balance: userData.balance || 0,
      totalSpent: userData.totalSpent || 0,
      totalOrders: userData.totalOrders || 0,
    }, 'Balance retrieved successfully');
  } catch (error) {
    console.error('Get balance error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get transaction history
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, offset = 0, type } = req.query;
    
    let query = db.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return successResponse(res, transactions, 'Transactions retrieved successfully');
  } catch (error) {
    console.error('Get transactions error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Request deposit (create pending transaction)
const requestDeposit = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { amount, method, reference } = req.body;
    
    if (!amount || amount <= 0) {
      return errorResponse(res, 'Invalid amount', 400);
    }
    
    if (!method) {
      return errorResponse(res, 'Payment method is required', 400);
    }
    
    const validMethods = ['easypaisa', 'jazzcash', 'bank', 'crypto', 'binance'];
    if (!validMethods.includes(method)) {
      return errorResponse(res, 'Invalid payment method', 400);
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    const currentBalance = userDoc.data()?.balance || 0;
    
    const transactionData = {
      userId,
      type: 'credit',
      amount: parseFloat(amount),
      balanceBefore: currentBalance,
      balanceAfter: currentBalance, // Will be updated when approved
      method,
      reference: reference || '',
      status: 'pending',
      description: `Deposit via ${method}`,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await db.collection('transactions').add(transactionData);
    
    // Create notification for user
    await db.collection('notifications').add({
      userId,
      title: 'Deposit Request Submitted',
      message: `Your deposit request of $${amount} is pending approval`,
      type: 'payment',
      isRead: false,
      link: '/dashboard/wallet',
      createdAt: Timestamp.now(),
    });
    
    const newTransaction = await docRef.get();
    
    return successResponse(res, {
      id: newTransaction.id,
      ...newTransaction.data(),
    }, 'Deposit request submitted successfully', 201);
  } catch (error) {
    console.error('Request deposit error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getBalance,
  getTransactions,
  requestDeposit,
};
