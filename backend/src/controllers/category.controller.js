const { db } = require('../config/firebaseAdmin');
const Category = require('../models/Category');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// Get all categories or by platform (public)
const getAllCategories = async (req, res) => {
  try {
    const { platformId, active } = req.query;
    
    let query = db.collection('categories');
    
    if (platformId) {
      query = query.where('platformId', '==', platformId);
    }
    
    if (active === 'true') {
      query = query.where('isActive', '==', true);
    }
    
    query = query.orderBy('sortOrder', 'asc');
    
    const snapshot = await query.get();
    const categories = snapshot.docs.map(doc => Category.fromFirestore(doc));
    
    return successResponse(res, categories, 'Categories retrieved successfully');
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Get single category
const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection('categories').doc(id).get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Category not found', 404);
    }
    
    const category = Category.fromFirestore(doc);
    return successResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    console.error('Get category error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Create category (admin only)
const createCategory = async (req, res) => {
  try {
    // Verify platform exists
    const platformDoc = await db.collection('platforms').doc(req.body.platformId).get();
    if (!platformDoc.exists) {
      return errorResponse(res, 'Platform not found', 404);
    }
    
    const categoryData = new Category(req.body);
    
    // Check if category with same slug exists for this platform
    const existingSlug = await db.collection('categories')
      .where('platformId', '==', categoryData.platformId)
      .where('slug', '==', categoryData.slug)
      .get();
    
    if (!existingSlug.empty) {
      return errorResponse(res, 'Category with this name already exists for this platform', 400);
    }
    
    const docRef = await db.collection('categories').add(categoryData.toFirestore());
    const newCategory = await docRef.get();
    
    return successResponse(res, Category.fromFirestore(newCategory), 'Category created successfully', 201);
  } catch (error) {
    console.error('Create category error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update category (admin only)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('categories').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Category not found', 404);
    }
    
    const existingData = doc.data();
    const updatedData = new Category({ ...existingData, ...req.body });
    
    await docRef.update(updatedData.toFirestore());
    const updated = await docRef.get();
    
    return successResponse(res, Category.fromFirestore(updated), 'Category updated successfully');
  } catch (error) {
    console.error('Update category error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete category (admin only)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const docRef = db.collection('categories').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return errorResponse(res, 'Category not found', 404);
    }
    
    // Check if category has services
    const services = await db.collection('services')
      .where('categoryId', '==', id)
      .limit(1)
      .get();
    
    if (!services.empty) {
      return errorResponse(res, 'Cannot delete category with existing services', 400);
    }
    
    await docRef.delete();
    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    console.error('Delete category error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
