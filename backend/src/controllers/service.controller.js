const { db } = require('../config/firebaseAdmin');
const Service = require('../models/Service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const smmProviderService = require('../services/smmProvider.service');

// Get all services (public - filtered)
const getAllServices = async (req, res) => {
  try {
    const { platformId, categoryId, active, featured, popular } = req.query;
    
    let query = db.collection('services');
    
    if (platformId) {
      query = query.where('platformId', '==', platformId);
    }
    
    if (categoryId) {
      query = query.where('categoryId', '==', categoryId);
    }
    
    if (active === 'true') {
      query = query.where('isActive', '==', true);
    }
    
    if (featured === 'true') {
      query = query.where('isFeatured', '==', true);
    }
    
    if (popular === 'true') {
      query = query.where('isPopular', '==', true);
    }
    
    query = query.orderBy('sortOrder', 'asc');
    
    const snapshot = await query.get();
    const services = snapshot.docs.map(doc => Service.fromFirestore(doc));
    
    return successResponse(res, services, 'Services retrieved successfully');
  } catch (error) {
    console.error('Get services error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get single service
const getService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('services').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Service not found', 404);
    }
    
    const service = Service.fromFirestore(doc);
    return successResponse(res, service, 'Service retrieved successfully');
  } catch (error) {
    console.error('Get service error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Create service (admin only)
const createService = async (req, res) => {
  try {
    // Verify platform and category exist
    const platformDoc = await db.collection('platforms').doc(req.body.platformId).get();
    if (!platformDoc.exists) {
      return errorResponse(res, 'Platform not found', 404);
    }
    
    const categoryDoc = await db.collection('categories').doc(req.body.categoryId).get();
    if (!categoryDoc.exists) {
      return errorResponse(res, 'Category not found', 404);
    }
    
    // Calculate price if not provided
    if (!req.body.price && req.body.providerPrice && req.body.profit) {
      req.body.price = parseFloat(req.body.providerPrice) + parseFloat(req.body.profit);
    }
    
    const serviceData = new Service(req.body);
    
    const docRef = await db.collection('services').add(serviceData.toFirestore());
    const newService = await docRef.get();
    
    return successResponse(res, Service.fromFirestore(newService), 'Service created successfully', 201);
  } catch (error) {
    console.error('Create service error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update service (admin only)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('services').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Service not found', 404);
    }
    
    // Recalculate price if providerPrice or profit changed
    if (req.body.providerPrice !== undefined || req.body.profit !== undefined) {
      const existingData = doc.data();
      const newProviderPrice = req.body.providerPrice !== undefined 
        ? parseFloat(req.body.providerPrice) 
        : parseFloat(existingData.providerPrice);
      const newProfit = req.body.profit !== undefined 
        ? parseFloat(req.body.profit) 
        : parseFloat(existingData.profit);
      req.body.price = newProviderPrice + newProfit;
    }
    
    const existingData = doc.data();
    const updatedData = new Service({ ...existingData, ...req.body });
    
    await docRef.update(updatedData.toFirestore());
    const updated = await docRef.get();
    
    return successResponse(res, Service.fromFirestore(updated), 'Service updated successfully');
  } catch (error) {
    console.error('Update service error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete service (admin only)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('services').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Service not found', 404);
    }
    
    // Check if service has orders
    const orders = await db.collection('orders')
      .where('serviceId', '==', id)
      .limit(1)
      .get();
    
    if (!orders.empty) {
      // Don't delete, just deactivate
      await docRef.update({ isActive: false, updatedAt: new Date() });
      return successResponse(res, null, 'Service deactivated (has existing orders)');
    }
    
    await docRef.delete();
    return successResponse(res, null, 'Service deleted successfully');
  } catch (error) {
    console.error('Delete service error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Sync services from provider (admin only)
const syncServicesFromProvider = async (req, res) => {
  try {
    const { providerId, platformId, categoryId } = req.body;
    
    if (!providerId) {
      return errorResponse(res, 'Provider ID is required', 400);
    }
    
    // Verify provider exists
    const providerDoc = await db.collection('providers').doc(providerId).get();
    if (!providerDoc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    // Get services from provider
    const providerServices = await smmProviderService.getServices(providerId);
    
    if (!providerServices || !Array.isArray(providerServices)) {
      return errorResponse(res, 'Failed to fetch services from provider', 500);
    }
    
    let synced = 0;
    let skipped = 0;
    let updated = 0;
    
    for (const providerService of providerServices) {
      // Check if service already exists
      const existing = await db.collection('services')
        .where('provider', '==', providerId)
        .where('providerServiceId', '==', providerService.service)
        .get();
      
      if (!existing.empty) {
        // Update existing service with latest provider data
        const existingDoc = existing.docs[0];
        const existingData = existingDoc.data();
        
        await db.collection('services').doc(existingDoc.id).update({
          name: providerService.name,
          description: providerService.description || existingData.description,
          providerPrice: parseFloat(providerService.rate),
          minQuantity: parseInt(providerService.min),
          maxQuantity: parseInt(providerService.max),
          refillSupported: providerService.refill || false,
          cancelSupported: providerService.cancel || false,
          updatedAt: new Date(),
        });
        
        updated++;
        continue;
      }
      
      // Create new service
      const serviceData = new Service({
        platformId: platformId || '',
        categoryId: categoryId || '',
        name: providerService.name,
        description: providerService.description || '',
        provider: providerId,
        providerServiceId: providerService.service,
        providerPrice: parseFloat(providerService.rate),
        profit: 0, // Admin needs to set profit
        price: parseFloat(providerService.rate),
        minQuantity: parseInt(providerService.min),
        maxQuantity: parseInt(providerService.max),
        refillSupported: providerService.refill || false,
        cancelSupported: providerService.cancel || false,
        refundSupported: providerService.refund || false,
        refundPercent: 85,
        isActive: false, // Admin needs to activate and assign platform/category
      });
      
      await db.collection('services').add(serviceData.toFirestore());
      synced++;
    }
    
    // Update provider's last synced timestamp
    await db.collection('providers').doc(providerId).update({
      lastSyncedAt: new Date(),
    });
    
    return successResponse(res, {
      synced,
      updated,
      skipped,
      total: providerServices.length,
    }, `Synced services from provider: ${synced} new, ${updated} updated`);
  } catch (error) {
    console.error('Sync services error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
  syncServicesFromProvider,
};
