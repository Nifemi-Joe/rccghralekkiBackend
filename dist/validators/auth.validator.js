"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailSchema = exports.firstLoginResetPasswordSchema = exports.verifyResetOTPSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
exports.registerSchema = joi_1.default.object({
    churchId: joi_1.default.string().uuid().required()
        .messages({
        'string.empty': 'Church ID is required',
        'string.uuid': 'Invalid church ID format'
    }),
    email: joi_1.default.string().email().required()
        .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
    }),
    password: joi_1.default.string().min(8).required()
        .pattern(passwordPattern)
        .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
    firstName: joi_1.default.string().min(2).max(50).required()
        .messages({
        'string.empty': 'First name is required',
        'string.min': 'First name must be at least 2 characters'
    }),
    lastName: joi_1.default.string().min(2).max(50).required()
        .messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name must be at least 2 characters'
    }),
    role: joi_1.default.string().valid('admin', 'staff', 'member').optional()
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required()
        .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
    }),
    password: joi_1.default.string().required()
        .messages({
        'string.empty': 'Password is required'
    })
});
exports.forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required()
        .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
    })
});
exports.resetPasswordSchema = joi_1.default.object({
    token: joi_1.default.string().required()
        .messages({
        'string.empty': 'Reset token is required'
    }),
    password: joi_1.default.string().min(8).required()
        .pattern(passwordPattern)
        .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    })
});
// Verify Reset OTP
exports.verifyResetOTPSchema = joi_1.default.object({
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    otp: joi_1.default.string().length(6).pattern(/^\d+$/).required().messages({
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
    })
});
exports.firstLoginResetPasswordSchema = joi_1.default.object({
    userId: joi_1.default.string().uuid().required(),
    oldPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string()
        .min(8)
        .pattern(/[A-Z]/, 'uppercase')
        .pattern(/[a-z]/, 'lowercase')
        .pattern(/[0-9]/, 'number')
        .pattern(/[^A-Za-z0-9]/, 'special character')
        .required()
        .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.name': 'Password must contain at least one {#name}'
    })
});
exports.verifyEmailSchema = joi_1.default.object({
    token: joi_1.default.string().required()
        .messages({
        'string.empty': 'Verification token is required'
    })
});
//# sourceMappingURL=auth.validator.js.map