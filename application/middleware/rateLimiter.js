const rateLimit = require('express-rate-limit');

/**
 * Rate-limit code execution to prevent abuse.
 * 30 executions per minute per IP.
 */
const executionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many executions – please wait a moment before running more code.' },
});

/**
 * General API rate limiter – 120 requests / minute.
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests – slow down.' },
});

module.exports = { executionLimiter, apiLimiter };
