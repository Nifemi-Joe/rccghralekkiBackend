"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
const AppError_1 = require("./AppError");
const requestCounts = new Map();
const rateLimit = (config) => {
    return (req, res, next) => {
        const identifier = req.user?.id || req.ip || 'unknown';
        const now = Date.now();
        let record = requestCounts.get(identifier);
        if (!record || now > record.resetTime) {
            record = {
                count: 0,
                resetTime: now + config.windowMs,
            };
        }
        record.count++;
        requestCounts.set(identifier, record);
        if (record.count > config.maxRequests) {
            throw new AppError_1.AppError(config.message || 'Too many requests, please try again later', 429);
        }
        next();
    };
};
exports.rateLimit = rateLimit;
// Cleanup old records periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCounts.entries()) {
        if (now > value.resetTime) {
            requestCounts.delete(key);
        }
    }
}, 60000); // Clean up every minute
//# sourceMappingURL=rateLimit.js.map