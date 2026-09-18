// src/routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { authenticateAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted once at /api/books. Public and admin endpoints share this
// router — auth middleware is what actually protects the admin ones,
// and /manage is used for admin reads so it can't collide with
// /slug/:slug (the public detail route).

// ---- Public storefront ----
router.get('/', asyncHandler(bookController.listPublic));
router.get('/slug/:slug', asyncHandler(bookController.getPublicBySlug));

// ---- Admin management ----
router.get('/manage', authenticateAdmin, asyncHandler(bookController.list));
router.get('/manage/:id', authenticateAdmin, asyncHandler(bookController.getById));
router.post('/', authenticateAdmin, asyncHandler(bookController.create));
router.put('/:id', authenticateAdmin, asyncHandler(bookController.update));
router.delete('/:id', authenticateAdmin, asyncHandler(bookController.remove));

module.exports = router;
