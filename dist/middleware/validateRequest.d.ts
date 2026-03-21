import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validateRequest: (schema: Joi.ObjectSchema) => (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=validateRequest.d.ts.map