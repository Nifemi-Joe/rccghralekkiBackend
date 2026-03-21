import { Request, Response, NextFunction, RequestHandler } from 'express';
/**
 * Wrapper for async route handlers to catch errors and pass them to Express error handler
 * This eliminates the need for try-catch blocks in every controller method
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => RequestHandler;
//# sourceMappingURL=asyncHandler.d.ts.map