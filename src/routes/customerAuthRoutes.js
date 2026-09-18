// src/routes/customerAuthRoutes.js
const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { requireCustomer } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/customers/auth
router.post('/register', asyncHandler(customerAuthController.register));
router.post('/login', asyncHandler(customerAuthController.login));
router.get('/me', requireCustomer, asyncHandler(customerAuthController.me));

module.exports = router;
