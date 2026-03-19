// src/validations/serviceReport.validation.ts

import Joi from 'joi';

export const createServiceReportSchema = Joi.object({
    event_instance_id: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid event instance ID format',
        'any.required': 'Event instance ID is required'
    }),

    preacher: Joi.string().max(200).optional().allow('', null),
    sermon_title: Joi.string().max(300).optional().allow('', null),
    sermon_notes: Joi.string().max(5000).optional().allow('', null),

    // Attendance fields - all required and must be non-negative
    attendance_men: Joi.number().integer().min(0).required().messages({
        'number.min': 'Men attendance cannot be negative',
        'any.required': 'Men attendance is required'
    }),
    attendance_women: Joi.number().integer().min(0).required().messages({
        'number.min': 'Women attendance cannot be negative',
        'any.required': 'Women attendance is required'
    }),
    attendance_children: Joi.number().integer().min(0).required().messages({
        'number.min': 'Children attendance cannot be negative',
        'any.required': 'Children attendance is required'
    }),
    first_timers: Joi.number().integer().min(0).required().messages({
        'number.min': 'First timers cannot be negative',
        'any.required': 'First timers count is required'
    }),
    new_comers: Joi.number().integer().min(0).required().messages({
        'number.min': 'New comers cannot be negative',
        'any.required': 'New comers count is required'
    }),

    // Financial fields - all required and must be non-negative
    offerings: Joi.number().min(0).required().messages({
        'number.min': 'Offerings cannot be negative',
        'any.required': 'Offerings amount is required'
    }),
    tithes: Joi.number().min(0).required().messages({
        'number.min': 'Tithes cannot be negative',
        'any.required': 'Tithes amount is required'
    }),
    donations: Joi.number().min(0).required().messages({
        'number.min': 'Donations cannot be negative',
        'any.required': 'Donations amount is required'
    }),
    other_income: Joi.number().min(0).optional().default(0).messages({
        'number.min': 'Other income cannot be negative'
    }),
    expenses: Joi.number().min(0).required().messages({
        'number.min': 'Expenses cannot be negative',
        'any.required': 'Expenses amount is required'
    }),

    // Payment channels - all required and must be non-negative
    cash_amount: Joi.number().min(0).required().messages({
        'number.min': 'Cash amount cannot be negative',
        'any.required': 'Cash amount is required'
    }),
    bank_transfer_amount: Joi.number().min(0).required().messages({
        'number.min': 'Bank transfer amount cannot be negative',
        'any.required': 'Bank transfer amount is required'
    }),
    card_amount: Joi.number().min(0).required().messages({
        'number.min': 'Card amount cannot be negative',
        'any.required': 'Card amount is required'
    }),
    mobile_money_amount: Joi.number().min(0).optional().default(0).messages({
        'number.min': 'Mobile money amount cannot be negative'
    }),

    notes: Joi.string().max(2000).optional().allow('', null)
});

export const updateServiceReportSchema = Joi.object({
    preacher: Joi.string().max(200).optional().allow('', null),
    sermon_title: Joi.string().max(300).optional().allow('', null),
    sermon_notes: Joi.string().max(5000).optional().allow('', null),

    attendance_men: Joi.number().integer().min(0).optional(),
    attendance_women: Joi.number().integer().min(0).optional(),
    attendance_children: Joi.number().integer().min(0).optional(),
    first_timers: Joi.number().integer().min(0).optional(),
    new_comers: Joi.number().integer().min(0).optional(),

    offerings: Joi.number().min(0).optional(),
    tithes: Joi.number().min(0).optional(),
    donations: Joi.number().min(0).optional(),
    other_income: Joi.number().min(0).optional(),
    expenses: Joi.number().min(0).optional(),

    cash_amount: Joi.number().min(0).optional(),
    bank_transfer_amount: Joi.number().min(0).optional(),
    card_amount: Joi.number().min(0).optional(),
    mobile_money_amount: Joi.number().min(0).optional(),

    notes: Joi.string().max(2000).optional().allow('', null)
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

export const serviceReportFilterSchema = Joi.object({
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    event_id: Joi.string().uuid().optional(),
    preacher: Joi.string().optional()
});