import { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
}
export declare const rateLimit: (config: RateLimitConfig) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=rateLimit.d.ts.map