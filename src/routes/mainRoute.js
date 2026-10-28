// src/routes/mainRoute.js
// Every feature router gets mounted here ONCE, and app.js mounts this
// single file at /api. Adding a new resource later = one require + one
// router.use() line here, nothing to touch in app.js or server.js.
//
// NOTE: webhookRoutes is deliberately NOT included here - it needs a
// raw-body parser instead of the JSON body-parser this main tree sits
// behind, so app.js mounts it separately, before express.json().
const express = require('express');
const router = express.Router();

router.use('/admin/auth', require('./adminAuthRoutes'));
router.use('/customers/auth', require('./customerAuthRoutes'));
router.use('/admin/media', require('./mediaRoutes'));
router.use('/books', require('./bookRoutes'));
router.use('/posts', require('./postRoutes'));
router.use('/podcasts', require('./podcastRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/downloads', require('./downloadRoutes'));
router.use('/taxonomy', require('./taxonomyRoutes'));
router.use('/gallery', require('./galleryRoutes'));
router.use('/contact', require('./contactRoutes'));

module.exports = router;
