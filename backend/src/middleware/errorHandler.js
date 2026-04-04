/**
 * Wraps an async Express route handler so that any rejected promise or thrown
 * error is forwarded to Express's next() error-handling middleware.
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware function
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Global Express error-handling middleware. Must be registered after all routes.
 *
 * @param {Error}    err
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
