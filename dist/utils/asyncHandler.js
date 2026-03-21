"use strict";
// src/utils/asyncHandler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wrapper for async route handlers to catch errors and pass them to Express error handler
 * This eliminates the need for try-catch blocks in every controller method
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map