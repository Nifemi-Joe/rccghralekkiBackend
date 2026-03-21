"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        status: 'success',
        message,
        data
    });
};
exports.successResponse = successResponse;
const errorResponse = (res, message = 'Error occurred', statusCode = 500, errors) => {
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(errors && { errors })
    });
};
exports.errorResponse = errorResponse;
//# sourceMappingURL=responseHandler.js.map