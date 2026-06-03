"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRateLimit = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const limiter = new rate_limiter_flexible_1.RateLimiterMemory({
    points: 5,
    duration: 300,
});
const otpRateLimit = async (req, res, next) => {
    const userKey = req.user?.id
        ? `user:${req.user.id}`
        : "user:anonymous";
    const ipKey = `ip:${req.ip}`;
    try {
        await Promise.all([limiter.consume(userKey), limiter.consume(ipKey)]);
        next();
    }
    catch {
        res.status(429).json({ message: "Too many attempts. Try again later." });
    }
};
exports.otpRateLimit = otpRateLimit;
