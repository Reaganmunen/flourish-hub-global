// src/routes/taxonomyRoutes.js
const express = require('express');
const router = express.Router();
const taxonomyController = require('../controllers/taxonomyController');
const { authenticateAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/taxonomy.
// Reads are public (storefront needs category names for filters/menus);
// writes are admin-only.
router.get('/categories/:context', asyncHandler(taxonomyController.listCategories));
router.get('/tags', asyncHandler(taxonomyController.listTags));

router.post('/categories', authenticateAdmin, asyncHandler(taxonomyController.createCategory));
router.delete('/categories/:id', authenticateAdmin, asyncHandler(taxonomyController.deleteCategory));
router.post('/tags', authenticateAdmin, asyncHandler(taxonomyController.createTag));

module.exports = router;
