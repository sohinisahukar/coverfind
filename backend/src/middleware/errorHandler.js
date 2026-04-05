/**
 * Wraps an async Express route handler so that any rejected promise or thrown
 * error is forwarded to Express's next() error-handling middleware.
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware function
 */
import { logger } from '../utils/logger.js';

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    logger.error(`${req.method} ${req.url} → ${status} ${message}`);
    if (err.stack) logger.error(err.stack);
  } else {
    logger.warn(`${req.method} ${req.url} → ${status} ${message}`);
  }

  res.status(status).json({ error: message });
}
