import { Request, Response, NextFunction } from 'express';
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
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
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
export declare const authorize: (roles: UserRole[] | UserRole) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Middleware to check if user belongs to the same church
 * Used to ensure multi-tenant data isolation
 */
export declare const requireSameChurch: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Middleware for optional authentication
 * Sets req.user if valid token is provided, but doesn't fail if not
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=authenticate.d.ts.map