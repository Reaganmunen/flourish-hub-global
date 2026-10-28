// src/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const { authenticateAdmin } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/contact.
router.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 6 }), asyncHandler(enquiryController.submit));

// ---- Admin ----
router.get('/manage', authenticateAdmin, asyncHandler(enquiryController.list));
router.put('/manage/:id/status', authenticateAdmin, asyncHandler(enquiryController.updateStatus));
router.delete('/manage/:id', authenticateAdmin, asyncHandler(enquiryController.remove));

module.exports = router;
