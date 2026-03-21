"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireSameChurch = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
/**
 * Middleware to authenticate requests using JWT
 * Extracts and validates the Bearer token from Authorization header
 */
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError_1.AppError('No token provided', 401);
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || "SecretKey123!";
        if (!jwtSecret) {
            logger_1.default.error('JWT_SECRET is not defined');
            throw new AppError_1.AppError('Server configuration error', 500);
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new AppError_1.AppError('Invalid token', 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new AppError_1.AppError('Token expired', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
/**
 * Middleware to authorize requests based on user roles
 * Must be used after authenticate middleware
 *
 * @param roles - Array of roles that are allowed to access the route
 *
 * Role hierarchy (highest to lowest):
 * - admin: Full access to all features
 * - pastor: Access to most features except critical admin functions
 * - finance: Access to financial features
 * - staff: Limited access to member and event management
 * - member: Read-only access to their own data
 */
const authorize = (roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new AppError_1.AppError('Authentication required', 401));
            return;
        }
        // Convert single role to array for consistent handling
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.default.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
            next(new AppError_1.AppError('Insufficient permissions', 403));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Middleware to check if user belongs to the same church
 * Used to ensure multi-tenant data isolation
 */
const requireSameChurch = (req, _res, next) => {
    if (!req.user?.churchId) {
        next(new AppError_1.AppError('Church ID not found in token', 401));
        return;
    }
    // The churchId is available in req.user for downstream use
    next();
};
exports.requireSameChurch = requireSameChurch;
/**
 * Middleware for optional authentication
 * Sets req.user if valid token is provided, but doesn't fail if not
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without user
            next();
            return;
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || "SecretKey123!";
        if (!jwtSecret) {
            next();
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch (error) {
        // Token invalid or expired, continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=authenticate.js.map