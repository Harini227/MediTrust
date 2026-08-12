/**
 * Wraps an async route handler so rejected promises are forwarded to
 * Express's error handler instead of crashing the process.
 * Usage: router.get('/x', catchAsync(async (req, res) => {...}))
 */
module.exports = function catchAsync(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
