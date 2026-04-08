import { Request, Response, NextFunction } from 'express';
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
export type UserRole = 'admin' | 'super_admin' | 'pastor' | 'finance' | 'staff' | 'member' | 'follow_up_leader' | 'follow_up_coordinator';
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
 * Authenticate requests using a Bearer JWT.
 * Extracts and validates the token from the Authorization header.
 */
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
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
export declare const authorize: (roles: UserRole | UserRole[]) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Ensure the authenticated user belongs to a church.
 * Used to enforce multi-tenant data isolation.
 */
export declare const requireSameChurch: (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Optional authentication.
 * Sets req.user when a valid Bearer token is present, but never rejects the
 * request if the token is absent or invalid.
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=authenticate.d.ts.map