// src/middleware/convertCamelCase.ts

import { Request, Response, NextFunction } from 'express';

/**
 * Converts a single snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
function convertKeysToCamel(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamel(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
        const result: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
            const camelKey = snakeToCamel(key);
            result[camelKey] = convertKeysToCamel(obj[key]);
        }
        return result;
    }

    return obj;
}

/**
 * Middleware that converts all incoming request body keys
 * from snake_case to camelCase so Joi validators work correctly
 * regardless of which format the client sends.
 */
export function convertCamelCase(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === 'object') {
        console.log('[convertCamelCase] BEFORE conversion:', JSON.stringify(req.body));
        req.body = convertKeysToCamel(req.body);
        console.log('[convertCamelCase] AFTER conversion:', JSON.stringify(req.body));
    }
    next();
}