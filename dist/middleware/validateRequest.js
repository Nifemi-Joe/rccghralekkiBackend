"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const AppError_1 = require("@utils/AppError");
const validateRequest = (schema) => {
    return (req, _res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join('; ');
            throw new AppError_1.AppError(errorMessage, 400);
        }
        req.body = value;
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validateRequest.js.map