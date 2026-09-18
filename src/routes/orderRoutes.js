// src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateAdmin, attachCustomerIfPresent, requireCustomer } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mounted at /api/orders.

// Checkout works for both logged-in customers and guests, hence
// attachCustomerIfPresent (optional) rather than requireCustomer.
router.post('/checkout', attachCustomerIfPresent, asyncHandler(orderController.checkout));
router.get('/lookup/:orderNumber', attachCustomerIfPresent, asyncHandler(orderController.getByOrderNumber));
router.get('/mine', requireCustomer, asyncHandler(orderController.listMine));

// ---- Admin ----
router.get('/manage', authenticateAdmin, asyncHandler(orderController.listAll));
router.get('/manage/:id', authenticateAdmin, asyncHandler(orderController.getById));
router.put('/manage/:id/status', authenticateAdmin, asyncHandler(orderController.updateStatus));

module.exports = router;
