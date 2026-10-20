const rateLimit = require("express-rate-limit");

const make = (limit, windowMinutes, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

// General limit for the whole API
const apiLimiter = make(1000, 15, "Too many requests, please try again later");

// Strict limit for login / register (stops password guessing)
const authLimiter = make(50, 15, "Too many login attempts, please try again in 15 minutes");

module.exports = { apiLimiter, authLimiter };