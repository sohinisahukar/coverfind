export class HttpError extends Error {
  /** @param {number} statusCode */
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode ?? err.status ?? 500;
  const payload = { error: err.message || 'Internal Server Error' };
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.details = err.stack;
  }
  res.status(status).json(payload);
}

/** Catches sync throws and rejected async route handlers */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
}
