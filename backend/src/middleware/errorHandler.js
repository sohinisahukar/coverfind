/**
 * errorHandler.js — Express error-handling middleware and async wrapper.
 *
 * asyncHandler:  Wraps async route handlers so rejected promises are
 *                forwarded to Express's error pipeline via next().
 *
 * errorHandler:  Catches all errors, logs them, and sends a JSON response.
 *                Controllers can throw an Error with a `.status` property
 *                (e.g. 404) — otherwise the status defaults to 500.
 */

import { logger } from '../utils/logger.js';

/**
 * Wraps an async Express route handler so thrown / rejected errors
 * reach the global error handler instead of crashing the process.
 *
 * @param {Function} fn  Async route handler (req, res, next) => Promise
 * @returns {Function}   Express middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Global Express error handler — must be registered LAST via app.use().
 *
 * - 5xx errors:  full stack trace logged to console.
 * - 4xx errors:  one-line warning only.
 * - Client always receives JSON `{ error: "message" }`.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.url} -> ${status} ${message}`);
    if (err.stack) logger.error(err.stack);
  } else {
    logger.warn(`${req.method} ${req.url} -> ${status} ${message}`);
  }

  res.status(status).json({ error: message });
}
