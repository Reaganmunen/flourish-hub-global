// src/routes/webhookRoutes.js
// Kept as its own router (not merged into mainRoute's json-parsed tree)
// because Stripe signature verification needs the EXACT raw request
// body bytes. app.js mounts this BEFORE express.json() runs on it -
// see the comment there.
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Mounted at /api/webhooks/stripe
router.post('/stripe', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
