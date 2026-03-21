"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChurchSchema = exports.createAdditionalAdminSchema = exports.skipSetupSchema = exports.registerChurchSchema = exports.setupAdminSchema = exports.verifyOTPSchema = exports.registerChurchOnlySchema = void 0;
const joi_1 = __importDefault(require("joi"));
// New simplified church registration (just church name, email, password)
exports.registerChurchOnlySchema = joi_1.default.object({
    churchName: joi_1.default.string().min(2).max(100).required()
        .messages({
        'string.empty': 'Church name is required',
        'string.min': 'Church name must be at least 2 characters'
    }),
    email: joi_1.default.string().email().required()
        .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
    }),
    password: joi_1.default.string().min(8).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
    })
});
// Verify OTP schema
exports.verifyOTPSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    otp: joi_1.default.string().length(6).required()
        .messages({
        'string.length': 'OTP must be 6 digits'
    })
});
// Setup admin after church registration
exports.setupAdminSchema = joi_1.default.object({
    churchId: joi_1.default.string().uuid().required(),
    firstName: joi_1.default.string().min(2).max(50).required()
        .messages({
        'string.empty': 'First name is required'
    }),
    lastName: joi_1.default.string().min(2).max(50).required()
        .messages({
        'string.empty': 'Last name is required'
    }),
    phoneNumber: joi_1.default.string().min(10).max(20).required(),
    country: joi_1.default.string().min(2).max(100).required(),
    membershipSize: joi_1.default.string().required()
});
// Legacy - Register church with admin (combined)
exports.registerChurchSchema = joi_1.default.object({
    church: joi_1.default.object({
        name: joi_1.default.string().min(2).max(100).required()
            .messages({
            'string.empty': 'Church name is required',
            'string.min': 'Church name must be at least 2 characters'
        }),
        address: joi_1.default.string().max(255).optional(),
        city: joi_1.default.string().max(100).optional(),
        state: joi_1.default.string().max(100).optional(),
        country: joi_1.default.string().max(100).optional(),
        phone: joi_1.default.string().max(20).optional(),
        email: joi_1.default.string().email().optional(),
        website: joi_1.default.string().uri().optional(),
        timezone: joi_1.default.string().optional().default('UTC'),
        currency: joi_1.default.string().length(3).optional().default('USD')
    }).required(),
    admin: joi_1.default.object({
        email: joi_1.default.string().email().required()
            .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address'
        }),
        password: joi_1.default.string().min(8).required()
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
        }),
        firstName: joi_1.default.string().min(2).max(50).required()
            .messages({
            'string.empty': 'First name is required'
        }),
        lastName: joi_1.default.string().min(2).max(50).required()
            .messages({
            'string.empty': 'Last name is required'
        })
    }).required()
});
exports.skipSetupSchema = joi_1.default.object({
    churchId: joi_1.default.string().uuid().required()
});
exports.createAdditionalAdminSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(100).required(),
    lastName: joi_1.default.string().min(2).max(100).required(),
    email: joi_1.default.string().email().max(255).required(),
    phoneNumber: joi_1.default.string().min(10).max(20).required(),
    role: joi_1.default.string().valid('admin', 'pastor').required()
});
exports.updateChurchSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).optional(),
    address: joi_1.default.string().max(255).optional(),
    city: joi_1.default.string().max(100).optional(),
    state: joi_1.default.string().max(100).optional(),
    country: joi_1.default.string().max(100).optional(),
    phone: joi_1.default.string().max(20).optional(),
    email: joi_1.default.string().email().optional(),
    website: joi_1.default.string().uri().optional(),
    timezone: joi_1.default.string().optional(),
    currency: joi_1.default.string().length(3).optional(),
    logo_url: joi_1.default.string().uri().optional(),
    settings: joi_1.default.object().optional()
});
//# sourceMappingURL=church.validator.js.map