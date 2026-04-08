"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireSameChurch = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
// ============================================================================
// MIDDLEWARE
// ============================================================================
/**
 * Authenticate requests using a Bearer JWT.
 * Extracts and validates the token from the Authorization header.
 */
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError_1.AppError('No token provided', 401);
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'SecretKey123!';
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
 * Authorize requests based on user roles.
 * Must be used AFTER the `authenticate` middleware.
 *
 * @param roles - Single role or array of roles allowed to access the route.
 *
 * Role hierarchy (highest → lowest):
 *   super_admin > admin > pastor > finance > staff > member
 *   follow_up_leader > follow_up_coordinator (department-scoped)
 */
const authorize = (roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new AppError_1.AppError('Authentication required', 401));
            return;
        }
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.default.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. ` +
                `Required roles: ${allowedRoles.join(', ')}`);
            next(new AppError_1.AppError('Insufficient permissions', 403));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * Ensure the authenticated user belongs to a church.
 * Used to enforce multi-tenant data isolation.
 */
const requireSameChurch = (req, _res, next) => {
    if (!req.user?.churchId) {
        next(new AppError_1.AppError('Church ID not found in token', 401));
        return;
    }
    // churchId is available in req.user for downstream middleware / handlers
    next();
};
exports.requireSameChurch = requireSameChurch;
/**
 * Optional authentication.
 * Sets req.user when a valid Bearer token is present, but never rejects the
 * request if the token is absent or invalid.
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'SecretKey123!';
        if (!jwtSecret) {
            next();
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = decoded;
        next();
    }
    catch {
        // Invalid / expired token — continue without a user
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=authenticate.js.map