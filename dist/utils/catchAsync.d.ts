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
export declare const catchAsync: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Alternative implementation with better TypeScript support
 */
export declare function asyncHandler<T = any>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>): (req: Request, res: Response, next: NextFunction) => void;
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
export declare const wrapAsync: (middlewares: Array<(req: Request, res: Response, next: NextFunction) => Promise<any>>) => ((req: Request, res: Response, next: NextFunction) => void)[];
export default catchAsync;
//# sourceMappingURL=catchAsync.d.ts.map