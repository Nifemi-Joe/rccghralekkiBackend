"use strict";
// src/validators/report.validator.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inactiveMembersQuerySchema = exports.scheduleIdParamsSchema = exports.reportTypeParamsSchema = exports.instanceIdParamsSchema = exports.reportFiltersSchema = exports.scheduleReportSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.scheduleReportSchema = joi_1.default.object({
    reportType: joi_1.default.string()
        .valid('attendance', 'member-growth', 'financial', 'first-timer', 'event-performance', 'full')
        .required()
        .messages({
        'any.required': 'Report type is required',
        'any.only': 'Invalid report type'
    }),
    frequency: joi_1.default.string()
        .valid('daily', 'weekly', 'monthly')
        .required()
        .messages({
        'any.required': 'Frequency is required',
        'any.only': 'Invalid frequency'
    }),
    recipients: joi_1.default.array()
        .items(joi_1.default.string().email())
        .min(1)
        .required()
        .messages({
        'array.min': 'At least one recipient is required',
        'any.required': 'Recipients are required',
        'string.email': 'Invalid email address'
    }),
    format: joi_1.default.string()
        .valid('pdf', 'excel')
        .required()
        .messages({
        'any.required': 'Format is required',
        'any.only': 'Invalid format. Must be pdf or excel'
    }),
    filters: joi_1.default.object({
        granularity: joi_1.default.string()
            .valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
            .optional(),
        eventType: joi_1.default.string().optional(),
        eventId: joi_1.default.string().uuid().optional(),
    }).optional()
});
exports.reportFiltersSchema = joi_1.default.object({
    startDate: joi_1.default.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
        'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
    }),
    endDate: joi_1.default.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
        'string.pattern.base': 'End date must be in YYYY-MM-DD format'
    }),
    granularity: joi_1.default.string()
        .valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
        .optional(),
    eventType: joi_1.default.string().optional(),
    eventId: joi_1.default.string().uuid().optional(),
    groupId: joi_1.default.string().uuid().optional(),
});
exports.instanceIdParamsSchema = joi_1.default.object({
    instanceId: joi_1.default.string()
        .uuid()
        .required()
        .messages({
        'any.required': 'Instance ID is required',
        'string.guid': 'Invalid instance ID format'
    })
});
exports.reportTypeParamsSchema = joi_1.default.object({
    reportType: joi_1.default.string()
        .valid('attendance', 'member-growth', 'financial', 'first-timer', 'event-performance', 'full')
        .required()
        .messages({
        'any.required': 'Report type is required',
        'any.only': 'Invalid report type'
    })
});
exports.scheduleIdParamsSchema = joi_1.default.object({
    scheduleId: joi_1.default.string()
        .uuid()
        .required()
        .messages({
        'any.required': 'Schedule ID is required',
        'string.guid': 'Invalid schedule ID format'
    })
});
exports.inactiveMembersQuerySchema = joi_1.default.object({
    daysThreshold: joi_1.default.number()
        .integer()
        .min(1)
        .max(365)
        .optional()
        .default(30)
        .messages({
        'number.min': 'Days threshold must be at least 1',
        'number.max': 'Days threshold cannot exceed 365'
    })
});
//# sourceMappingURL=report.validator.js.map