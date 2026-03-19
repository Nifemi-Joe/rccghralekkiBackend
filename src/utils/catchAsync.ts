// src/utils/catchAsync.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper function to catch async errors in Express route handlers
 * This eliminates the need for try-catch blocks in every async controller
 *
 * @param fn - Async function to wrap
 * @returns Express middleware function
 *
 * @example
 * router.get('/users', catchAsync(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */
export const catchAsync = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Alternative implementation with better TypeScript support
 */
export function asyncHandler<T = any>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

/**
 * Utility to wrap multiple middleware functions
 *
 * @example
 * router.post('/users',
 *   wrapAsync([
 *     authenticate,
 *     authorize('admin'),
 *     createUser
 *   ])
 * );
 */
export const wrapAsync = (
    middlewares: Array<(req: Request, res: Response, next: NextFunction) => Promise<any>>
) => {
    return middlewares.map(middleware => catchAsync(middleware));
};

// Export default
export default catchAsync;