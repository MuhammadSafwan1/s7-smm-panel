const { db } = require('../config/firebaseAdmin');
const { Timestamp } = require('firebase-admin/firestore');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, offset = 0, unreadOnly } = req.query;
    
    let query = db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');
    
    if (unreadOnly === 'true') {
      query = query.where('isRead', '==', false);
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Get unread count
    const unreadSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();
    
    return successResponse(res, {
      notifications,
      unreadCount: unreadSnapshot.size,
    }, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const notificationDoc = await db.collection('notifications').doc(id).get();
    
    if (!notificationDoc.exists) {
      return errorResponse(res, 'Notification not found', 404);
    }
    
    const notification = notificationDoc.data();
    
    if (notification.userId !== userId) {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    await db.collection('notifications').doc(id).update({
      isRead: true,
    });
    
    return successResponse(res, null, 'Notification marked as read');
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const unreadSnapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();
    
    const batch = db.batch();
    unreadSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
    
    return successResponse(res, null, `${unreadSnapshot.size} notifications marked as read`);
  } catch (error) {
    console.error('Mark all as read error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
