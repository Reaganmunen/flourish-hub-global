// src/routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { authenticateAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/admin/media — every media action is admin-only.
// This is what the CMS block editor calls when you drag an image/video
// block in and pick a file: it uploads here first, then stores the
// returned media.id inside the post's content JSON.
router.post('/', authenticateAdmin, upload.single('file'), asyncHandler(mediaController.upload));
router.get('/', authenticateAdmin, asyncHandler(mediaController.list));
router.delete('/:id', authenticateAdmin, asyncHandler(mediaController.remove));

module.exports = router;
