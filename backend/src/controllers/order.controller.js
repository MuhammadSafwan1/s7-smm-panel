const { db } = require('../config/firebaseAdmin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const smmProviderService = require('../services/smmProvider.service');

// Create order
const createOrder = async (req, res) => {
  try {
    const { serviceId, link, quantity } = req.body;
    const userId = req.user.uid;
    
    if (!serviceId || !link || !quantity) {
      return errorResponse(res, 'Service, link, and quantity are required', 400);
    }
    
    // Get service details
    const serviceDoc = await db.collection('services').doc(serviceId).get();
    if (!serviceDoc.exists || !serviceDoc.data().isActive) {
      return errorResponse(res, 'Service not found or inactive', 404);
    }
    
    const service = serviceDoc.data();
    
    // Validate quantity
    if (quantity < service.minQuantity || quantity > service.maxQuantity) {
      return errorResponse(res, `Quantity must be between ${service.minQuantity} and ${service.maxQuantity}`, 400);
    }
    
    // Calculate charge
    const charge = (service.price * quantity) / 1000;
    
    // Check user balance
    const userDoc = await db.collection('users').doc(userId).get();
    const userBalance = userDoc.data()?.balance || 0;
    
    if (userBalance < charge) {
      return errorResponse(res, 'Insufficient balance', 400);
    }
    
    // Create order in Firestore first
    const orderData = new Order({
      userId,
      serviceId,
      platformId: service.platformId,
      categoryId: service.categoryId,
      provider: service.provider,
      providerServiceId: service.providerServiceId,
      link,
      quantity: parseInt(quantity),
      charge,
      status: 'pending',
      refillSupported: service.refillSupported || false,
      refillPeriodDays: parseInt(service.refillPeriodDays || service.refillDays || 0),
      refundPercent: parseFloat(service.refundPercent) || 85,
      refillUsed: false,
      refillUsedAt: null,
      refillRequested: false,
      refillRequestedAt: null,
    });
    
    const orderRef = await db.collection('orders').add(orderData.toFirestore());
    
    try {
      // Send order to provider
      const providerResponse = await smmProviderService.createOrder(
        service.provider,
        {
          service: service.providerServiceId,
          link,
          quantity: parseInt(quantity),
        }
      );
      
      if (providerResponse && providerResponse.order) {
        // Update order with provider order ID
        await orderRef.update({
          providerOrderId: providerResponse.order.toString(),
          status: 'processing',
          updatedAt: Timestamp.now(),
        });
        
        // Deduct balance from user
        await db.collection('users').doc(userId).update({
          balance: FieldValue.increment(-charge),
          totalSpent: FieldValue.increment(charge),
          totalOrders: FieldValue.increment(1),
        });
        
        // Create transaction record
        await db.collection('transactions').add({
          userId,
          type: 'debit',
          amount: charge,
          balanceBefore: userBalance,
          balanceAfter: userBalance - charge,
          method: 'order',
          reference: orderRef.id,
          status: 'completed',
          description: `Order #${orderRef.id.substring(0, 8)}`,
          createdAt: Timestamp.now(),
        });
        
        // Create notification
        await db.collection('notifications').add({
          userId,
          title: 'Order Created',
          message: `Your order has been placed successfully`,
          type: 'order',
          isRead: false,
          link: `/dashboard/orders/${orderRef.id}`,
          createdAt: Timestamp.now(),
        });
        
        const createdOrder = await orderRef.get();
        return successResponse(res, Order.fromFirestore(createdOrder), 'Order created successfully', 201);
      } else {
        // Provider failed, update order status
        await orderRef.update({
          status: 'failed',
          updatedAt: Timestamp.now(),
        });
        return errorResponse(res, 'Failed to place order with provider', 500);
      }
    } catch (providerError) {
      // Provider API error, update order status
      await orderRef.update({
        status: 'failed',
        updatedAt: Timestamp.now(),
      });
      return errorResponse(res, `Provider error: ${providerError.message}`, 500);
    }
  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(parseInt(limit)).offset(parseInt(offset));
    
    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => Order.fromFirestore(doc));
    
    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    console.error('Get user orders error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const doc = await db.collection('orders').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }
    
    const order = Order.fromFirestore(doc);
    
    // Check if user owns the order (or is admin)
    if (order.userId !== userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    // Get service details
    const serviceDoc = await db.collection('services').doc(order.serviceId).get();
    if (serviceDoc.exists) {
      order.service = serviceDoc.data();
    }
    
    return successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    console.error('Get order details error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Check and update order status
const checkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const doc = await db.collection('orders').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }
    
    const order = Order.fromFirestore(doc);
    
    // Check if user owns the order (or is admin)
    if (order.userId !== userId && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    // If order is already completed, return current status
    if (order.isCompleted()) {
      return successResponse(res, order, 'Order status retrieved');
    }
    
    // Check status from provider
    if (order.providerOrderId) {
      try {
        const providerStatus = await smmProviderService.getOrderStatus(
          order.provider,
          order.providerOrderId
        );
        
        if (providerStatus) {
          const updates = {
            status: providerStatus.status || order.status,
            startCount: providerStatus.start_count || order.startCount,
            remains: providerStatus.remains || order.remains,
            updatedAt: Timestamp.now(),
          };
          
          if (['Completed', 'completed'].includes(providerStatus.status)) {
            updates.completedAt = Timestamp.now();
          }
          
          await db.collection('orders').doc(id).update(updates);
          
          const updatedDoc = await db.collection('orders').doc(id).get();
          return successResponse(res, Order.fromFirestore(updatedDoc), 'Order status updated');
        }
      } catch (providerError) {
        console.error('Provider status check error:', providerError);
        // Return current status if provider check fails
      }
    }
    
    return successResponse(res, order, 'Order status retrieved');
  } catch (error) {
    console.error('Check order status error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Request refill
const requestRefill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const doc = await db.collection('orders').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }
    
    const order = Order.fromFirestore(doc);
    
    // Check if user owns the order
    if (order.userId !== userId) {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    // Check if order can be refilled
    if (order.refillUsed) {
      return errorResponse(res, 'Refill has already been used for this order', 400);
    }

    if (!order.canRefill()) {
      return errorResponse(res, 'Order cannot be refilled or the refill period has expired', 400);
    }

    // Get service to check refill support
    const serviceDoc = await db.collection('services').doc(order.serviceId).get();
    if (!serviceDoc.exists || !serviceDoc.data().refillSupported) {
      return errorResponse(res, 'Refill not supported for this service', 400);
    }

    // Send refill request to provider
    try {
      const refillResult = await smmProviderService.createRefill(order.provider, order.providerOrderId);
      
      await db.collection('orders').doc(id).update({
        status: 'refilling',
        refillUsed: true,
        refillUsedAt: Timestamp.now(),
        refillId: refillResult?.data?.refill || null,
        refillRequested: true,
        refillRequestedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      // Create notification
      await db.collection('notifications').add({
        userId,
        title: 'Refill Requested',
        message: `Refill request submitted for order #${id.substring(0, 8)}`,
        type: 'order',
        isRead: false,
        link: `/dashboard/orders/${id}`,
        createdAt: Timestamp.now(),
      });
      
      return successResponse(res, null, 'Refill requested successfully');
    } catch (providerError) {
      return errorResponse(res, `Refill request failed: ${providerError.message}`, 500);
    }
  } catch (error) {
    console.error('Request refill error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    const doc = await db.collection('orders').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }
    
    const order = Order.fromFirestore(doc);
    
    // Check if user owns the order
    if (order.userId !== userId) {
      return errorResponse(res, 'Unauthorized', 403);
    }
    
    // Check if order can be cancelled
    if (!order.canCancel()) {
      return errorResponse(res, 'Order cannot be cancelled', 400);
    }
    
    // Get service to check cancel support
    const serviceDoc = await db.collection('services').doc(order.serviceId).get();
    if (!serviceDoc.exists || !serviceDoc.data().cancelSupported) {
      return errorResponse(res, 'Cancellation not supported for this service', 400);
    }
    
    const serviceData = serviceDoc.data();
    const refundSupported = serviceData.refundSupported || false;
    const refundPercent = Math.min(Math.max(parseFloat(serviceData.refundPercent ?? order.refundPercent ?? 85) || 85, 0), 100);
    const refundAmount = refundSupported ? parseFloat(((order.charge * refundPercent) / 100).toFixed(2)) : 0;
    
    // Send cancel request to provider
    try {
      await smmProviderService.cancelOrder(order.provider, order.providerOrderId);
      
      // Refund user if applicable
      let updatedOrder = {
        status: 'cancelled',
        refundIssued: refundAmount > 0,
        refundAmount,
        refundPercent,
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      if (refundAmount > 0) {
        const userDoc = await db.collection('users').doc(userId).get();
        const currentBalance = userDoc.data()?.balance || 0;
        
        await db.collection('users').doc(userId).update({
          balance: FieldValue.increment(refundAmount),
        });
        
        // Create refund transaction
        await db.collection('transactions').add({
          userId,
          type: 'credit',
          amount: refundAmount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + refundAmount,
          method: 'refund',
          reference: id,
          status: 'completed',
          description: `Refund for cancelled order #${id.substring(0, 8)}`,
          createdAt: Timestamp.now(),
        });
      }
      
      await db.collection('orders').doc(id).update(updatedOrder);
      
      // Create notification
      await db.collection('notifications').add({
        userId,
        title: 'Order Cancelled',
        message: refundAmount > 0
          ? `Order #${id.substring(0, 8)} cancelled and refunded ${refundPercent}% of the charge.`
          : `Order #${id.substring(0, 8)} has been cancelled. No refund was configured for this service.`,
        type: 'order',
        isRead: false,
        link: `/dashboard/orders/${id}`,
        createdAt: Timestamp.now(),
      });
      
      return successResponse(res, null, 'Order cancelled and refunded successfully');
    } catch (providerError) {
      return errorResponse(res, `Cancellation failed: ${providerError.message}`, 500);
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderDetails,
  checkOrderStatus,
  requestRefill,
  cancelOrder,
};
