const rateLimit = require('express-rate-limit');

// Brute-force guard for login/register: 20 *failed* attempts per 15 minutes per IP. Successful logins
// don't count, so normal use never trips it. Applied only to POST /login and /register — NOT to the
// frequently-called GET /me (which the app hits on every page load).
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again after 15 minutes.' },
});

// 120 requests per minute per IP for general API routes
exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
