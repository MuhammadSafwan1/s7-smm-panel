const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');
const { verifyFirebaseToken } = require('../middleware/verifyFirebaseToken');
const { isAdmin } = require('../middleware/isAdmin');

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategory);

// Admin routes
router.post('/', verifyFirebaseToken, isAdmin, createCategory);
router.put('/:id', verifyFirebaseToken, isAdmin, updateCategory);
router.delete('/:id', verifyFirebaseToken, isAdmin, deleteCategory);

module.exports = router;
