// src/routes/galleryRoutes.js
const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { authenticateAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/gallery.

// ---- Public ----
router.get('/', asyncHandler(galleryController.listPublic));
router.get('/albums', asyncHandler(galleryController.listAlbumsPublic));

// ---- Admin ----
router.get('/manage', authenticateAdmin, asyncHandler(galleryController.list));
router.post('/', authenticateAdmin, asyncHandler(galleryController.create));
router.put('/:id', authenticateAdmin, asyncHandler(galleryController.update));
router.delete('/:id', authenticateAdmin, asyncHandler(galleryController.remove));

module.exports = router;
