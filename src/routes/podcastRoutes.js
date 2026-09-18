// src/routes/podcastRoutes.js
const express = require('express');
const router = express.Router();
const podcastController = require('../controllers/podcastController');
const { authenticateAdmin, attachCustomerIfPresent, checkPremiumAccess } = require('../middleware/auth');
const { upload, resolveMediaType } = require('../middleware/upload');
const mediaModel = require('../models/mediaModel');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/podcasts.

// ---- Public listening ----
router.get('/', asyncHandler(podcastController.listPublic));
router.get(
  '/slug/:slug',
  attachCustomerIfPresent,
  asyncHandler(podcastController.loadPodcastBySlug),
  asyncHandler(checkPremiumAccess('podcast')),
  asyncHandler(podcastController.getPublicBySlug)
);

// ---- Admin management ----
router.get('/manage', authenticateAdmin, asyncHandler(podcastController.list));
router.get('/manage/:id', authenticateAdmin, asyncHandler(podcastController.getById));
router.post('/', authenticateAdmin, asyncHandler(podcastController.create));
router.put('/:id', authenticateAdmin, asyncHandler(podcastController.update));
router.delete('/:id', authenticateAdmin, asyncHandler(podcastController.remove));

// Convenience: upload the audio/video file (and optional teaser clip)
// straight to media_library in one call, returning ids ready to hand
// to POST/PUT above as media_id / preview_media_id.
router.post(
  '/upload-media',
  authenticateAdmin,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const media = await mediaModel.create({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: resolveMediaType(req.file.mimetype),
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      uploadedBy: req.admin.id,
    });
    res.status(201).json({ media });
  })
);

module.exports = router;
