// src/middleware/errorHandler.js
// Catch-all. Any controller that does `next(err)` (or throws inside an
// async handler wrapped by asyncHandler) ends up here instead of crashing
// the process or leaking a stack trace to the client.
function errorHandler(err, req, res, next) {
  console.error(err);

  // Postgres unique_violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate value violates a unique constraint', detail: err.detail });
  }
  // Postgres foreign_key_violation
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Related record not found', detail: err.detail });
  }
  // Postgres check_violation
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Invalid data', detail: err.detail || err.message });
  }

  // Uploads over the configured size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'That file is too large to upload' });
  }

  const status = err.status || 500;
  // Do not leak internal error text to visitors in production.
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(status).json({ error: message });
}

/** Wrap async route handlers so thrown errors reach errorHandler instead of hanging the request. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
