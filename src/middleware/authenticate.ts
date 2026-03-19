import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

// Valid roles in the system
export type UserRole = 'admin' | 'pastor' | 'staff' | 'finance' | 'member' | 'super_admin';

interface JwtPayload {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    churchId: string;
    role: UserRole;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware to authenticate requests using JWT
 * Extracts and validates the Bearer token from Authorization header
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
        const jwtSecret = process.env.JWT_SECRET || "SecretKey123!";

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
export const authorize = (roles: UserRole[] | UserRole) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AppError('Authentication required', 401));
            return;
        }

        // Convert single role to array for consistent handling
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
            next(new AppError('Insufficient permissions', 403));
            return;
        }

        next();
    };
};

/**
 * Middleware to check if user belongs to the same church
 * Used to ensure multi-tenant data isolation
 */
export const requireSameChurch = (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.churchId) {
        next(new AppError('Church ID not found in token', 401));
        return;
    }

    // The churchId is available in req.user for downstream use
    next();
};

/**
 * Middleware for optional authentication
 * Sets req.user if valid token is provided, but doesn't fail if not
 */
export const optionalAuth = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
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

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        // Token invalid or expired, continue without user
        next();
    }
};