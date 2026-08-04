const { db, auth, admin } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const smmProviderService = require('../services/smmProvider.service');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    
    let query = db.collection('users').orderBy('createdAt', 'desc');
    
    if (search) {
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
    
    const { balance, walletBalance } = userDoc.data();
    const currentBalance = balance || walletBalance || 0;
    const adjustAmount = type === 'credit' ? parseFloat(amount) : -parseFloat(amount);
    
    if (type === 'debit' && currentBalance < amount) {
      return errorResponse(res, 'Insufficient balance', 400);
    }
    
    const updates = {
      balance: FieldValue.increment(adjustAmount),
    };
    if (walletBalance !== undefined) {
      updates.walletBalance = FieldValue.increment(adjustAmount);
    }
    
    await db.collection('users').doc(userId).update(updates);
    
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

// Ban or unban a user (admin only)
const toggleUserBan = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ban, reason } = req.body;

    // Try to update Firebase Auth, but continue even if it fails
    try {
      await auth.updateUser(userId, { disabled: ban });
    } catch (authError) {
      console.warn('Auth update failed, continuing with Firestore only:', authError.message);
    }

    // Always update Firestore user doc
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({
        banned: ban,
        bannedAt: ban ? Timestamp.now() : null,
        bannedBy: ban ? req.user?.uid || 'admin' : null,
        banReason: ban ? (reason || 'No reason provided') : null,
        updatedAt: Timestamp.now(),
      });
    }

    return successResponse(res, { disabled: ban, source: userDoc.exists ? 'firestore' : 'auth-only' }, ban ? 'User banned successfully' : 'User unbanned successfully');
  } catch (error) {
    console.error('Toggle user ban error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete user permanently (admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Try to delete from Firebase Auth (may not exist)
    try {
      await auth.deleteUser(userId);
      console.log('✅ User deleted from Firebase Auth:', userId);
    } catch (authError) {
      console.warn('⚠️ Failed to delete from Auth (user may not exist):', authError.message);
      // Continue anyway - we still want to delete from Firestore
    }

    // Delete from Firestore (main deletion)
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      await db.collection('users').doc(userId).delete();
      console.log('✅ User deleted from Firestore:', userId);
    } else {
      console.warn('⚠️ User not found in Firestore:', userId);
    }

    // Delete user's related data
    try {
      // Delete orders
      const ordersSnapshot = await db.collection('orders').where('userId', '==', userId).get();
      const orderDeletePromises = ordersSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(orderDeletePromises);

      // Delete transactions
      const transactionsSnapshot = await db.collection('transactions').where('userId', '==', userId).get();
      const transactionDeletePromises = transactionsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(transactionDeletePromises);

      // Delete notifications
      const notificationsSnapshot = await db.collection('notifications').where('userId', '==', userId).get();
      const notificationDeletePromises = notificationsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(notificationDeletePromises);

      console.log('✅ User related data deleted');
    } catch (cleanupError) {
      console.warn('⚠️ Error cleaning up user data:', cleanupError.message);
    }

    return successResponse(res, null, 'User deleted successfully');
  } catch (error) {
    console.error('❌ Delete user error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update user email (admin only)
const updateUserEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return errorResponse(res, 'Invalid email address', 400);
    }

    // Check if email already taken
    try {
      await auth.getUserByEmail(email);
      return errorResponse(res, 'Email already in use by another account', 400);
    } catch (_) {}

    await auth.updateUser(userId, { email });

    // Also update Firestore
    await db.collection('users').doc(userId).update({ email, updatedAt: Timestamp.now() });

    return successResponse(res, { email }, 'User email updated successfully');
  } catch (error) {
    console.error('Update user email error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update user password (admin only) - only for email/password users
const updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters', 400);
    }

    // Update in Firebase Auth
    try {
      await auth.updateUser(userId, { password });
      console.log('✅ Password updated in Firebase Auth');
    } catch (authError) {
      console.warn('⚠️ Auth password update failed:', authError.message);
      // Continue to update Firestore anyway
    }

    // Update in Firestore (for admin viewing) - stored in admin-only userSecrets collection
    try {
      await db.collection('userSecrets').doc(userId).set({ 
        password: password,
        provider: 'password',
        updatedAt: Timestamp.now() 
      });
      console.log('✅ Password updated in Firestore (userSecrets)');
    } catch (firestoreError) {
      console.warn('⚠️ Firestore password update failed:', firestoreError.message);
    }

    // Create notification for user
    try {
      await db.collection('notifications').add({
        userId,
        title: 'Password Changed',
        message: 'Your password has been updated by an administrator',
        type: 'security',
        isRead: false,
        createdAt: Timestamp.now(),
      });
    } catch (notifError) {
      console.warn('⚠️ Failed to create notification:', notifError.message);
    }

    return successResponse(res, null, 'Password updated successfully (no email sent)');
  } catch (error) {
    console.error('❌ Update user password error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get full user details including auth provider info (admin only)
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get from Firebase Auth
    const userRecord = await auth.getUser(userId);

    // Get provider info
    const providerInfo = userRecord.providerData.map(p => ({
      providerId: p.providerId,
      displayName: p.displayName,
      email: p.email,
      photoURL: p.photoURL,
    }));

    // Determine login method
    let loginMethod = 'unknown';
    if (providerInfo.some(p => p.providerId === 'google.com')) {
      loginMethod = 'google';
    } else if (providerInfo.some(p => p.providerId === 'password')) {
      loginMethod = 'email';
    } else if (providerInfo.length > 0) {
      loginMethod = providerInfo[0].providerId;
    }

    // Get Firestore data
    const userDoc = await db.collection('users').doc(userId).get();
    const firestoreData = userDoc.exists ? userDoc.data() : {};

    return successResponse(res, {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      phoneNumber: userRecord.phoneNumber,
      disabled: userRecord.disabled,
      creationTime: userRecord.metadata?.creationTime,
      lastSignInTime: userRecord.metadata?.lastSignInTime,
      loginMethod,
      providers: providerInfo,
      firestoreData,
    }, 'User details retrieved successfully');
  } catch (error) {
    console.error('Get user details error:', error);
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
  toggleUserBan,
  deleteUser,
  updateUserEmail,
  updateUserPassword,
  getUserDetails,
};