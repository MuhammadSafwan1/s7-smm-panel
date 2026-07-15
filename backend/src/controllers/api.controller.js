const { db } = require('../config/firebaseAdmin');

// ==================== API V2 HANDLER (Standard SMM Panel Format) ====================
exports.handleApiV2 = async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action) {
      return res.status(400).json({ 
        error: 'Missing required parameter: action' 
      });
    }
    
    // Route to appropriate handler based on action
    switch (action.toLowerCase()) {
      case 'services':
        return await handleServicesV2(req, res);
      case 'add':
        return await handleAddOrderV2(req, res);
      case 'status':
        return await handleOrderStatusV2(req, res);
      case 'balance':
        return await handleBalanceV2(req, res);
      default:
        return res.status(400).json({ 
          error: `Invalid action: ${action}` 
        });
    }
  } catch (error) {
    console.error('API v2 error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

// ==================== V2 SERVICES ====================
const handleServicesV2 = async (req, res) => {
  try {
    const servicesQuery = db.collection('services').where('isActive', '==', true);
    const snapshot = await servicesQuery.get();
    
    const services = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get platform and category names
      let platformName = 'Unknown';
      let categoryName = 'General';
      
      try {
        if (data.platformId) {
          const platformDoc = await db.collection('platforms').doc(data.platformId).get();
          if (platformDoc.exists) {
            platformName = platformDoc.data().name;
          }
        }
        
        if (data.categoryId) {
          const categoryDoc = await db.collection('categories').doc(data.categoryId).get();
          if (categoryDoc.exists) {
            categoryName = categoryDoc.data().name;
          }
        }
      } catch (err) {
        console.error('Error fetching platform/category:', err);
      }
      
      services.push({
        service: doc.id,
        name: data.name,
        type: data.type || 'Default',
        category: categoryName,
        platform: platformName,
        rate: data.rate ? (data.rate).toFixed(2) : '0.00',
        min: data.min || 100,
        max: data.max || 10000,
        refill: data.refill || false,
        cancel: data.cancel || false
      });
    }
    
    res.json(services);
  } catch (error) {
    console.error('Get services v2 error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services' 
    });
  }
};

// ==================== V2 ADD ORDER ====================
const handleAddOrderV2 = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { service, link, quantity } = req.body;
    
    if (!service || !link || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required parameters: service, link, quantity' 
      });
    }
    
    // Get service details
    const serviceDoc = await db.collection('services').doc(service).get();
    
    if (!serviceDoc.exists) {
      return res.json({ 
        error: 'Incorrect service ID' 
      });
    }
    
    const serviceData = serviceDoc.data();
    
    if (!serviceData.isActive) {
      return res.json({ 
        error: 'Service is currently unavailable' 
      });
    }
    
    const qty = parseInt(quantity);
    if (qty < serviceData.min || qty > serviceData.max) {
      return res.json({ 
        error: `Quantity must be between ${serviceData.min} and ${serviceData.max}` 
      });
    }
    
    // Calculate charge
    const charge = ((serviceData.rate || 0) / 1000) * qty;
    
    // Get user balance
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if ((userData.balance || 0) < charge) {
      return res.json({ 
        error: 'Insufficient balance' 
      });
    }
    
    // Create order
    const orderRef = await db.collection('orders').add({
      userId,
      serviceId: service,
      serviceName: serviceData.name,
      platformId: serviceData.platformId,
      categoryId: serviceData.categoryId,
      link,
      quantity: qty,
      charge,
      status: 'Pending',
      startCount: 0,
      remains: qty,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Deduct balance
    await db.collection('users').doc(userId).update({
      balance: (userData.balance || 0) - charge,
      totalOrders: (userData.totalOrders || 0) + 1,
      totalSpent: (userData.totalSpent || 0) + charge,
      updatedAt: new Date()
    });
    
    res.json({
      order: orderRef.id
    });
  } catch (error) {
    console.error('Add order v2 error:', error);
    res.status(500).json({ 
      error: 'Failed to place order' 
    });
  }
};

// ==================== V2 ORDER STATUS ====================
const handleOrderStatusV2 = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { order } = req.body;
    
    if (!order) {
      return res.json({ 
        error: 'Missing required parameter: order' 
      });
    }
    
    const orderDoc = await db.collection('orders').doc(order).get();
    
    if (!orderDoc.exists) {
      return res.json({ 
        error: 'Incorrect order ID' 
      });
    }
    
    const orderData = orderDoc.data();
    
    if (orderData.userId !== userId) {
      return res.json({ 
        error: 'Incorrect order ID' 
      });
    }
    
    res.json({
      charge: orderData.charge ? orderData.charge.toFixed(5) : '0.00000',
      start_count: (orderData.startCount || 0).toString(),
      status: orderData.status || 'Pending',
      remains: (orderData.remains || 0).toString(),
      currency: 'PKR'
    });
  } catch (error) {
    console.error('Get order status v2 error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order status' 
    });
  }
};

// ==================== V2 BALANCE ====================
const handleBalanceV2 = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.json({ 
        error: 'User not found' 
      });
    }
    
    const userData = userDoc.data();
    
    res.json({
      balance: (userData.balance || 0).toFixed(5),
      currency: 'PKR'
    });
  } catch (error) {
    console.error('Get balance v2 error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balance' 
    });
  }
};

// ==================== GET SERVICES (Legacy v1) ====================
exports.getServices = async (req, res) => {
  try {
    const { platform, category } = req.query;
    
    let servicesQuery = db.collection('services').where('isActive', '==', true);
    
    if (platform) {
      servicesQuery = servicesQuery.where('platformId', '==', platform);
    }
    
    if (category) {
      servicesQuery = servicesQuery.where('categoryId', '==', category);
    }
    
    const snapshot = await servicesQuery.get();
    
    const services = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      services.push({
        id: doc.id,
        name: data.name,
        platform: data.platformId,
        category: data.categoryId,
        price: data.rate,
        min: data.min,
        max: data.max,
        description: data.description || ''
      });
    });
    
    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch services' 
    });
  }
};

// ==================== GET BALANCE ====================
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    const userData = userDoc.data();
    
    res.json({
      success: true,
      data: {
        balance: userData.balance || 0,
        currency: userData.currency || 'PKR'
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch balance' 
    });
  }
};

// ==================== PLACE ORDER ====================
exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { serviceId, link, quantity } = req.body;
    
    // Validate input
    if (!serviceId || !link || !quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: serviceId, link, quantity' 
      });
    }
    
    // Get service details
    const serviceDoc = await db.collection('services').doc(serviceId).get();
    
    if (!serviceDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Service not found' 
      });
    }
    
    const serviceData = serviceDoc.data();
    
    // Check if service is active
    if (!serviceData.isActive) {
      return res.status(400).json({ 
        success: false, 
        error: 'Service is currently unavailable' 
      });
    }
    
    // Validate quantity
    if (quantity < serviceData.min || quantity > serviceData.max) {
      return res.status(400).json({ 
        success: false, 
        error: `Quantity must be between ${serviceData.min} and ${serviceData.max}` 
      });
    }
    
    // Calculate charge
    const charge = (serviceData.rate / 1000) * quantity;
    
    // Get user balance
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (userData.balance < charge) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance' 
      });
    }
    
    // Create order
    const orderRef = await db.collection('orders').add({
      userId,
      serviceId,
      serviceName: serviceData.name,
      platformId: serviceData.platformId,
      categoryId: serviceData.categoryId,
      link,
      quantity,
      charge,
      status: 'pending',
      startCount: 0,
      remains: quantity,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Deduct balance
    await db.collection('users').doc(userId).update({
      balance: userData.balance - charge,
      totalOrders: (userData.totalOrders || 0) + 1,
      totalSpent: (userData.totalSpent || 0) + charge,
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      data: {
        orderId: orderRef.id,
        status: 'pending',
        charge
      }
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to place order' 
    });
  }
};

// ==================== GET ORDER STATUS ====================
exports.getOrderStatus = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { orderId } = req.params;
    
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }
    
    const orderData = orderDoc.data();
    
    // Check if order belongs to user
    if (orderData.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }
    
    res.json({
      success: true,
      data: {
        orderId: orderDoc.id,
        status: orderData.status,
        startCount: orderData.startCount || 0,
        remains: orderData.remains || 0
      }
    });
  } catch (error) {
    console.error('Get order status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch order status' 
    });
  }
};
