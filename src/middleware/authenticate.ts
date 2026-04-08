// src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

// ============================================================================
// USER ROLES
// ============================================================================

/**
 * All valid roles in the system.
 *
 * Core roles:
 *   admin          – Full access to all features
 *   super_admin    – Super-set of admin; platform-level access
 *   pastor         – Access to most features except critical admin functions
 *   finance        – Access to financial features
 *   staff          – Limited access to member and event management
 *   member         – Read-only access to their own data
 *
 * Follow-up department roles:
 *   follow_up_leader      – Can create/manage assignments within the dept
 *   follow_up_coordinator – Can create assignments; limited management access
 */
export type UserRole =
    | 'admin'
    | 'super_admin'
    | 'pastor'
    | 'finance'
    | 'staff'
    | 'member'
    | 'follow_up_leader'
    | 'follow_up_coordinator';

// ============================================================================
// JWT PAYLOAD
// ============================================================================

interface JwtPayload {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    churchId: string;
    role: UserRole;
}

// ============================================================================
// AUGMENT EXPRESS REQUEST
// ============================================================================

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Authenticate requests using a Bearer JWT.
 * Extracts and validates the token from the Authorization header.
 */
export const authenticate = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'SecretKey123!';

        if (!jwtSecret) {
            logger.error('JWT_SECRET is not defined');
            throw new AppError('Server configuration error', 500);
        }

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        req.user = decoded;

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Invalid token', 401));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(new AppError('Token expired', 401));
        } else {
            next(error);
        }
    }
};

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
export const authorize = (roles: UserRole | UserRole[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError('Authentication required', 401));
            return;
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(
                `Access denied for user ${req.user.id} with role ${req.user.role}. ` +
                `Required roles: ${allowedRoles.join(', ')}`
            );
            next(new AppError('Insufficient permissions', 403));
            return;
        }

        next();
    };
};

/**
 * Ensure the authenticated user belongs to a church.
 * Used to enforce multi-tenant data isolation.
 */
export const requireSameChurch = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.user?.churchId) {
        next(new AppError('Church ID not found in token', 401));
        return;
    }

    // churchId is available in req.user for downstream middleware / handlers
    next();
};

/**
 * Optional authentication.
 * Sets req.user when a valid Bearer token is present, but never rejects the
 * request if the token is absent or invalid.
 */
export const optionalAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
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

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        req.user = decoded;
        next();
    } catch {
        // Invalid / expired token — continue without a user
        next();
    }
};