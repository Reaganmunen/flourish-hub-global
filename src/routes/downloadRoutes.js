// src/routes/downloadRoutes.js
const express = require('express');
const router = express.Router();
const downloadController = require('../controllers/downloadController');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/downloads. No auth required — the token itself IS the
// credential (long, random, single-purpose, expiring, and rate-limited
// by max_downloads). This is exactly the link a customer clicks from
// their order confirmation email.
router.get('/:token', asyncHandler(downloadController.download));

module.exports = router;
