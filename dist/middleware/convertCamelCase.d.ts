import { Request, Response, NextFunction } from 'express';
/**
 * Middleware that converts all incoming request body keys
 * from snake_case to camelCase so Joi validators work correctly
 * regardless of which format the client sends.
 */
export declare function convertCamelCase(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=convertCamelCase.d.ts.map