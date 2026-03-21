"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const errorHandler = (err, req, res, next) => {
    // Prevent headers already sent error
    if (res.headersSent) {
        return next(err);
    }
    if (err instanceof AppError_1.AppError) {
        logger_1.default.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
        return;
    }
    // Handle Joi validation errors
    if (err.name === 'ValidationError') {
        logger_1.default.error(`Validation Error: ${err.message}`);
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            details: err.message
        });
        return;
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        logger_1.default.error(`JWT Error: ${err.message}`);
        res.status(401).json({
            status: 'error',
            message: 'Invalid token'
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        logger_1.default.error(`JWT Expired: ${err.message}`);
        res.status(401).json({
            status: 'error',
            message: 'Token expired'
        });
        return;
    }
    // Default error
    logger_1.default.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    logger_1.default.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map