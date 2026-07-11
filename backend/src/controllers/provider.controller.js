const { db } = require('../config/firebaseAdmin');
const { Timestamp } = require('firebase-admin/firestore');
const Provider = require('../models/Provider');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const smmProviderService = require('../services/smmProvider.service');

// Get all providers (admin - with masked keys)
const getAllProviders = async (req, res) => {
  try {
    const { active } = req.query;
    
    let query = db.collection('providers').orderBy('createdAt', 'desc');
    
    if (active === 'true') {
      query = query.where('isActive', '==', true);
    }
    
    const snapshot = await query.get();
    const providers = snapshot.docs.map(doc => {
      const provider = new Provider(doc.data());
      return {
        id: doc.id,
        ...provider.toPublic(), // Masked API key
      };
    });
    
    return successResponse(res, providers, 'Providers retrieved successfully');
  } catch (error) {
    console.error('Get providers error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get single provider (admin)
const getProvider = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('providers').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    const provider = new Provider(doc.data());
    
    return successResponse(res, {
      id: doc.id,
      ...provider.toFirestore(), // Full API key for editing
    }, 'Provider retrieved successfully');
  } catch (error) {
    console.error('Get provider error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Create provider (admin only)
const createProvider = async (req, res) => {
  try {
    const { name, apiUrl, apiKey, type, description, website, supportEmail } = req.body;
    
    if (!name || !apiUrl || !apiKey) {
      return errorResponse(res, 'Name, API URL, and API Key are required', 400);
    }
    
    // Validate API URL format
    try {
      new URL(apiUrl);
    } catch (err) {
      return errorResponse(res, 'Invalid API URL format', 400);
    }
    
    const providerData = new Provider({
      name,
      apiUrl: apiUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey,
      type: type || 'api_v2',
      description,
      website,
      supportEmail,
    });
    
    // Check if provider with same slug exists
    const existingSlug = await db.collection('providers')
      .where('slug', '==', providerData.slug)
      .get();
    
    if (!existingSlug.empty) {
      return errorResponse(res, 'Provider with this name already exists', 400);
    }
    
    const docRef = await db.collection('providers').add(providerData.toFirestore());
    
    // Test connection
    let connectionTest = { success: false, message: 'Not tested' };
    try {
      const testResult = await smmProviderService.testConnection(docRef.id);
      connectionTest = testResult;
    } catch (err) {
      console.error('Connection test error:', err);
    }
    
    const newProvider = await docRef.get();
    const provider = new Provider(newProvider.data());
    
    return successResponse(res, {
      provider: {
        id: newProvider.id,
        ...provider.toPublic(),
      },
      connectionTest,
    }, 'Provider created successfully', 201);
  } catch (error) {
    console.error('Create provider error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update provider (admin only)
const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('providers').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    const existingData = doc.data();
    
    // Don't allow slug change
    if (req.body.slug && req.body.slug !== existingData.slug) {
      delete req.body.slug;
    }
    
    // Validate API URL if provided
    if (req.body.apiUrl) {
      try {
        new URL(req.body.apiUrl);
        req.body.apiUrl = req.body.apiUrl.replace(/\/$/, '');
      } catch (err) {
        return errorResponse(res, 'Invalid API URL format', 400);
      }
    }
    
    const updatedData = new Provider({ ...existingData, ...req.body });
    
    await docRef.update(updatedData.toFirestore());
    const updated = await docRef.get();
    const provider = new Provider(updated.data());
    
    return successResponse(res, {
      id: updated.id,
      ...provider.toPublic(),
    }, 'Provider updated successfully');
  } catch (error) {
    console.error('Update provider error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete provider (admin only)
const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('providers').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    // Check if provider has services
    const services = await db.collection('services')
      .where('provider', '==', id)
      .limit(1)
      .get();
    
    if (!services.empty) {
      return errorResponse(res, 'Cannot delete provider with existing services. Deactivate it instead.', 400);
    }
    
    await docRef.delete();
    return successResponse(res, null, 'Provider deleted successfully');
  } catch (error) {
    console.error('Delete provider error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Test provider connection (admin only)
const testProviderConnection = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('providers').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    const result = await smmProviderService.testConnection(id);
    
    // Update last checked timestamp
    await db.collection('providers').doc(id).update({
      lastCheckedAt: Timestamp.now(),
    });
    
    return successResponse(res, result, 'Connection test completed');
  } catch (error) {
    console.error('Test connection error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Check provider balance (admin only)
const checkProviderBalance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('providers').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    const balanceData = await smmProviderService.getBalance(id);
    
    if (balanceData && balanceData.balance !== undefined) {
      // Update balance in database
      await db.collection('providers').doc(id).update({
        balance: parseFloat(balanceData.balance),
        currency: balanceData.currency || 'USD',
        lastCheckedAt: Timestamp.now(),
      });
    }
    
    return successResponse(res, balanceData, 'Balance retrieved successfully');
  } catch (error) {
    console.error('Check balance error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get provider services for syncing (admin only)
const getProviderServices = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('providers').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Provider not found', 404);
    }
    
    const services = await smmProviderService.getServices(id);
    
    return successResponse(res, services, 'Provider services retrieved successfully');
  } catch (error) {
    console.error('Get provider services error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  testProviderConnection,
  checkProviderBalance,
  getProviderServices,
};
