// src/routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateAdmin, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/admin/auth by mainRoute.js
router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticateAdmin, asyncHandler(authController.me));

// Only an existing owner can create more admin accounts.
router.post('/register', authenticateAdmin, requireRole('owner'), asyncHandler(authController.register));
router.get('/users', authenticateAdmin, requireRole('owner'), asyncHandler(authController.listAdmins));

module.exports = router;
