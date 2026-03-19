// src/utils/rateLimit.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (config: RateLimitConfig) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const identifier = req.user?.id || req.ip || 'unknown';
        const now = Date.now();

        let record = requestCounts.get(identifier);

        if (!record || now > record.resetTime) {
            record = {
                count: 0,
                resetTime: now + config.windowMs,
            };
        }

        record.count++;
        requestCounts.set(identifier, record);

        if (record.count > config.maxRequests) {
            throw new AppError(
                config.message || 'Too many requests, please try again later',
                429
            );
        }

        next();
    };
};

// Cleanup old records periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCounts.entries()) {
        if (now > value.resetTime) {
            requestCounts.delete(key);
        }
    }
}, 60000); // Clean up every minute
