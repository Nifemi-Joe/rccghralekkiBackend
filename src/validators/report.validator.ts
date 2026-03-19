// src/validators/report.validator.ts

import Joi from 'joi';

export const scheduleReportSchema = Joi.object({
    reportType: Joi.string()
        .valid('attendance', 'member-growth', 'financial', 'first-timer', 'event-performance', 'full')
        .required()
        .messages({
            'any.required': 'Report type is required',
            'any.only': 'Invalid report type'
        }),
    frequency: Joi.string()
        .valid('daily', 'weekly', 'monthly')
        .required()
        .messages({
            'any.required': 'Frequency is required',
            'any.only': 'Invalid frequency'
        }),
    recipients: Joi.array()
        .items(Joi.string().email())
        .min(1)
        .required()
        .messages({
            'array.min': 'At least one recipient is required',
            'any.required': 'Recipients are required',
            'string.email': 'Invalid email address'
        }),
    format: Joi.string()
        .valid('pdf', 'excel')
        .required()
        .messages({
            'any.required': 'Format is required',
            'any.only': 'Invalid format. Must be pdf or excel'
        }),
    filters: Joi.object({
        granularity: Joi.string()
            .valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
            .optional(),
        eventType: Joi.string().optional(),
        eventId: Joi.string().uuid().optional(),
    }).optional()
});

export const reportFiltersSchema = Joi.object({
    startDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
        }),
    endDate: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
            'string.pattern.base': 'End date must be in YYYY-MM-DD format'
        }),
    granularity: Joi.string()
        .valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
        .optional(),
    eventType: Joi.string().optional(),
    eventId: Joi.string().uuid().optional(),
    groupId: Joi.string().uuid().optional(),
});

export const instanceIdParamsSchema = Joi.object({
    instanceId: Joi.string()
        .uuid()
        .required()
        .messages({
            'any.required': 'Instance ID is required',
            'string.guid': 'Invalid instance ID format'
        })
});

export const reportTypeParamsSchema = Joi.object({
    reportType: Joi.string()
        .valid('attendance', 'member-growth', 'financial', 'first-timer', 'event-performance', 'full')
        .required()
        .messages({
            'any.required': 'Report type is required',
            'any.only': 'Invalid report type'
        })
});

export const scheduleIdParamsSchema = Joi.object({
    scheduleId: Joi.string()
        .uuid()
        .required()
        .messages({
            'any.required': 'Schedule ID is required',
            'string.guid': 'Invalid schedule ID format'
        })
});

export const inactiveMembersQuerySchema = Joi.object({
    daysThreshold: Joi.number()
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