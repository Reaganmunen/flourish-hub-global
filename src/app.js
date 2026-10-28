// src/app.js
// Builds and configures the Express app. Does NOT call .listen() -
// that's server.js's job, which keeps app.js testable in isolation
// (e.g. with supertest) without opening a real port.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const mainRoute = require('./routes/mainRoute');
const webhookRoutes = require('./routes/webhookRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// __dirname here is <root>/src, so '..' is the project root - that's
// where uploads/ and public/ live, alongside package.json.
const PROJECT_ROOT = path.join(__dirname, '..');

app.use(cors({ origin: true, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cookieParser());

// IMPORTANT: the Stripe webhook route needs the raw request body to
// verify the signature, so it's mounted BEFORE express.json() runs.
// If it were mounted after, express.json() would already have parsed
// (and thereby altered) the body, breaking Stripe's signature check.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public book covers, post images, thumbnails etc. Podcast media,
// digital book files, and other non-public assets are also written to
// this same folder on disk, but they're only ever served through the
// gated /api/downloads/:token and content_access-checked routes -
// never linked directly, even though the folder itself is static.
app.use('/uploads', express.static(path.join(PROJECT_ROOT, process.env.UPLOAD_DIR || 'uploads')));

app.use('/api', mainRoute);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Frontend - storefront + admin CMS. public/admin/*.html is served
// automatically by this same mount (public/admin/login.html answers
// GET /admin/login.html), so a single static mount covers both.
// This MUST come after the /api routes above: if it were mounted
// first, express.static would try (and fail) to resolve /api/... paths
// as files before mainRoute ever got a chance to handle them.
app.use(express.static(path.join(PROJECT_ROOT, 'public')));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;