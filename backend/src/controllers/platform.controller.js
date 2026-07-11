const { db } = require('../config/firebaseAdmin');
const Platform = require('../models/Platform');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all platforms (public)
const getAllPlatforms = async (req, res) => {
  try {
    const { active } = req.query;
    
    let query = db.collection('platforms').orderBy('sortOrder', 'asc');
    
    if (active === 'true') {
      query = query.where('isActive', '==', true);
    }
    
    const snapshot = await query.get();
    const platforms = snapshot.docs.map(doc => Platform.fromFirestore(doc));
    
    return successResponse(res, platforms, 'Platforms retrieved successfully');
  } catch (error) {
    console.error('Get platforms error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get single platform
const getPlatform = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('platforms').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Platform not found', 404);
    }
    
    const platform = Platform.fromFirestore(doc);
    return successResponse(res, platform, 'Platform retrieved successfully');
  } catch (error) {
    console.error('Get platform error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Create platform (admin only)
const createPlatform = async (req, res) => {
  try {
    const platformData = new Platform(req.body);
    
    // Check if slug already exists
    const existingSlug = await db.collection('platforms')
      .where('slug', '==', platformData.slug)
      .get();
    
    if (!existingSlug.empty) {
      return errorResponse(res, 'Platform with this name already exists', 400);
    }
    
    const docRef = await db.collection('platforms').add(platformData.toFirestore());
    const newPlatform = await docRef.get();
    
    return successResponse(res, Platform.fromFirestore(newPlatform), 'Platform created successfully', 201);
  } catch (error) {
    console.error('Create platform error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update platform (admin only)
const updatePlatform = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('platforms').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Platform not found', 404);
    }
    
    const existingData = doc.data();
    const updatedData = new Platform({ ...existingData, ...req.body });
    
    await docRef.update(updatedData.toFirestore());
    const updated = await docRef.get();
    
    return successResponse(res, Platform.fromFirestore(updated), 'Platform updated successfully');
  } catch (error) {
    console.error('Update platform error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete platform (admin only)
const deletePlatform = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('platforms').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Platform not found', 404);
    }
    
    // Check if platform has categories
    const categories = await db.collection('categories')
      .where('platformId', '==', id)
      .limit(1)
      .get();
    
    if (!categories.empty) {
      return errorResponse(res, 'Cannot delete platform with existing categories', 400);
    }
    
    await docRef.delete();
    return successResponse(res, null, 'Platform deleted successfully');
  } catch (error) {
    console.error('Delete platform error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllPlatforms,
  getPlatform,
  createPlatform,
  updatePlatform,
  deletePlatform,
};
