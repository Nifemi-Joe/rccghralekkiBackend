"use strict";
// src/middleware/convertCamelCase.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertCamelCase = convertCamelCase;
/**
 * Converts a single snake_case string to camelCase
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
function convertKeysToCamel(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamel(item));
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
        const result = {};
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
function convertCamelCase(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        console.log('[convertCamelCase] BEFORE conversion:', JSON.stringify(req.body));
        req.body = convertKeysToCamel(req.body);
        console.log('[convertCamelCase] AFTER conversion:', JSON.stringify(req.body));
    }
    next();
}
//# sourceMappingURL=convertCamelCase.js.map