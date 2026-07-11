const smmProvider = require('../services/smmProvider.service');
const { db } = require('../config/firebaseAdmin');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Get all services from all providers
 */
exports.getAllServices = async (req, res) => {
  try {
    const result = await smmProvider.getAllServices();
    
    if (result.success) {
      return successResponse(res, result.data, 'Services fetched successfully');
    }
    
    return errorResponse(res, 'Failed to fetch services', 500);
  } catch (error) {
    console.error('Get all services error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get services from specific provider
 */
exports.getProviderServices = async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!['smmdecent', 'smmcloud'].includes(provider)) {
      return errorResponse(res, 'Invalid provider', 400);
    }

    const result = await smmProvider.getServices(provider);
    
    if (result.success) {
      return successResponse(res, result.data, 'Services fetched successfully');
    }
    
    return errorResponse(res, result.error || 'Failed to fetch services', 500);
  } catch (error) {
    console.error('Get provider services error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Create new order
 */
exports.createOrder = async (req, res) => {
  try {
    const { provider, service, link, quantity, runs, interval } = req.body;
    const userId = req.user.uid;

    // Validate input
    if (!provider || !service || !link || !quantity) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    if (!['smmdecent', 'smmcloud'].includes(provider)) {
      return errorResponse(res, 'Invalid provider', 400);
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return errorResponse(res, 'User not found', 404);
    }

    const userData = userDoc.data();

    // Get service details to check price
    const servicesResult = await smmProvider.getServices(provider);
    if (!servicesResult.success) {
      return errorResponse(res, 'Failed to fetch service details', 500);
    }

    const serviceDetails = servicesResult.data.find((s) => s.service == service);
    if (!serviceDetails) {
      return errorResponse(res, 'Service not found', 404);
    }

    // Calculate cost
    const cost = (parseFloat(serviceDetails.rate) * parseInt(quantity)) / 1000;

    // Check user balance
    if ((userData.balance || 0) < cost) {
      return errorResponse(res, 'Insufficient balance', 400);
    }

    // Place order with provider
    const orderResult = await smmProvider.addOrder(provider, {
      service,
      link,
      quantity,
      runs,
      interval,
    });

    if (!orderResult.success) {
      return errorResponse(res, orderResult.error || 'Failed to create order', 500);
    }

    // Deduct from user balance
    await db.collection('users').doc(userId).update({
      balance: (userData.balance || 0) - cost,
    });

    // Save order to Firestore
    const orderData = {
      userId,
      provider,
      providerOrderId: orderResult.data.order,
      service: serviceDetails.service,
      serviceName: serviceDetails.name,
      serviceCategory: serviceDetails.category,
      link,
      quantity: parseInt(quantity),
      charge: cost,
      status: 'Pending',
      runs: runs ? parseInt(runs) : null,
      interval: interval ? parseInt(interval) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderRef = await db.collection('orders').add(orderData);

    return successResponse(
      res,
      {
        orderId: orderRef.id,
        providerOrderId: orderResult.data.order,
        charge: cost,
      },
      'Order created successfully'
    );
  } catch (error) {
    console.error('Create order error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get order status
 */
exports.getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    // Get order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }

    const orderData = orderDoc.data();

    // Check if user owns this order (skip check for admin)
    if (orderData.userId !== userId && !req.user.admin) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    // Get status from provider
    const statusResult = await smmProvider.getOrderStatus(
      orderData.provider,
      orderData.providerOrderId
    );

    if (statusResult.success) {
      // Update order status in Firestore
      await db.collection('orders').doc(orderId).update({
        status: statusResult.data.status,
        remains: statusResult.data.remains,
        startCount: statusResult.data.start_count,
        updatedAt: new Date(),
      });

      return successResponse(
        res,
        {
          ...orderData,
          ...statusResult.data,
        },
        'Order status fetched successfully'
      );
    }

    return errorResponse(res, statusResult.error || 'Failed to fetch order status', 500);
  } catch (error) {
    console.error('Get order status error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get user orders
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, status } = req.query;

    let query = db.collection('orders').where('userId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));

    const snapshot = await query.get();
    const orders = [];

    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    return successResponse(res, orders, 'Orders fetched successfully');
  } catch (error) {
    console.error('Get user orders error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all orders (Admin only)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { limit = 100, status } = req.query;

    let query = db.collection('orders');

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));

    const snapshot = await query.get();
    const orders = [];

    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    return successResponse(res, orders, 'Orders fetched successfully');
  } catch (error) {
    console.error('Get all orders error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get provider balances
 */
exports.getProviderBalances = async (req, res) => {
  try {
    const result = await smmProvider.getAllBalances();
    
    if (result.success) {
      return successResponse(res, result.data, 'Balances fetched successfully');
    }
    
    return errorResponse(res, 'Failed to fetch balances', 500);
  } catch (error) {
    console.error('Get provider balances error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Create refill
 */
exports.createRefill = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    // Get order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }

    const orderData = orderDoc.data();

    // Check if user owns this order (skip check for admin)
    if (orderData.userId !== userId && !req.user.admin) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    // Create refill with provider
    const refillResult = await smmProvider.createRefill(
      orderData.provider,
      orderData.providerOrderId
    );

    if (refillResult.success) {
      // Save refill info
      await db.collection('orders').doc(orderId).update({
        refillId: refillResult.data.refill,
        refillRequested: true,
        refillRequestedAt: new Date(),
        updatedAt: new Date(),
      });

      return successResponse(res, refillResult.data, 'Refill created successfully');
    }

    return errorResponse(res, refillResult.error || 'Failed to create refill', 500);
  } catch (error) {
    console.error('Create refill error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    // Get order from Firestore
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return errorResponse(res, 'Order not found', 404);
    }

    const orderData = orderDoc.data();

    // Check if user owns this order (skip check for admin)
    if (orderData.userId !== userId && !req.user.admin) {
      return errorResponse(res, 'Unauthorized', 403);
    }

    // Cancel order with provider
    const cancelResult = await smmProvider.cancelOrders(
      orderData.provider,
      orderData.providerOrderId
    );

    if (cancelResult.success) {
      // Update order status
      await db.collection('orders').doc(orderId).update({
        status: 'Canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      });

      // Refund user if applicable
      const refundAmount = orderData.charge || 0;
      if (refundAmount > 0) {
        const userDoc = await db.collection('users').doc(userId).get();
        const currentBalance = userDoc.data().balance || 0;
        
        await db.collection('users').doc(userId).update({
          balance: currentBalance + refundAmount,
        });
      }

      return successResponse(res, cancelResult.data, 'Order canceled successfully');
    }

    return errorResponse(res, cancelResult.error || 'Failed to cancel order', 500);
  } catch (error) {
    console.error('Cancel order error:', error);
    return errorResponse(res, error.message, 500);
  }
};
