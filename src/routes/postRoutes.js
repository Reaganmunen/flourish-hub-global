// src/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateAdmin, attachCustomerIfPresent, checkPremiumAccess } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/posts.

// ---- Public reading ----
router.get('/', asyncHandler(postController.listPublic));
// Chain: load the post -> figure out if this viewer (customer/guest/token)
// has paid for it -> controller decides full content vs preview_content.
router.get(
  '/slug/:slug',
  attachCustomerIfPresent,
  asyncHandler(postController.loadPostBySlug),
  asyncHandler(checkPremiumAccess('post')),
  asyncHandler(postController.getPublicBySlug)
);

// ---- Admin CMS ----
router.get('/manage', authenticateAdmin, asyncHandler(postController.list));
router.get('/manage/:id', authenticateAdmin, asyncHandler(postController.getById));
router.post('/', authenticateAdmin, asyncHandler(postController.create));
// PUT is what the drag-and-drop editor calls on every autosave and on Publish.
router.put('/:id', authenticateAdmin, asyncHandler(postController.update));
router.delete('/:id', authenticateAdmin, asyncHandler(postController.remove));

module.exports = router;
