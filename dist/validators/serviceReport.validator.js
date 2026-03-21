"use strict";
// src/validations/serviceReport.validation.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceReportFilterSchema = exports.updateServiceReportSchema = exports.createServiceReportSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createServiceReportSchema = joi_1.default.object({
    event_instance_id: joi_1.default.string().uuid().required().messages({
        'string.guid': 'Invalid event instance ID format',
        'any.required': 'Event instance ID is required'
    }),
    preacher: joi_1.default.string().max(200).optional().allow('', null),
    sermon_title: joi_1.default.string().max(300).optional().allow('', null),
    sermon_notes: joi_1.default.string().max(5000).optional().allow('', null),
    // Attendance fields - all required and must be non-negative
    attendance_men: joi_1.default.number().integer().min(0).required().messages({
        'number.min': 'Men attendance cannot be negative',
        'any.required': 'Men attendance is required'
    }),
    attendance_women: joi_1.default.number().integer().min(0).required().messages({
        'number.min': 'Women attendance cannot be negative',
        'any.required': 'Women attendance is required'
    }),
    attendance_children: joi_1.default.number().integer().min(0).required().messages({
        'number.min': 'Children attendance cannot be negative',
        'any.required': 'Children attendance is required'
    }),
    first_timers: joi_1.default.number().integer().min(0).required().messages({
        'number.min': 'First timers cannot be negative',
        'any.required': 'First timers count is required'
    }),
    new_comers: joi_1.default.number().integer().min(0).required().messages({
        'number.min': 'New comers cannot be negative',
        'any.required': 'New comers count is required'
    }),
    // Financial fields - all required and must be non-negative
    offerings: joi_1.default.number().min(0).required().messages({
        'number.min': 'Offerings cannot be negative',
        'any.required': 'Offerings amount is required'
    }),
    tithes: joi_1.default.number().min(0).required().messages({
        'number.min': 'Tithes cannot be negative',
        'any.required': 'Tithes amount is required'
    }),
    donations: joi_1.default.number().min(0).required().messages({
        'number.min': 'Donations cannot be negative',
        'any.required': 'Donations amount is required'
    }),
    other_income: joi_1.default.number().min(0).optional().default(0).messages({
        'number.min': 'Other income cannot be negative'
    }),
    expenses: joi_1.default.number().min(0).required().messages({
        'number.min': 'Expenses cannot be negative',
        'any.required': 'Expenses amount is required'
    }),
    // Payment channels - all required and must be non-negative
    cash_amount: joi_1.default.number().min(0).required().messages({
        'number.min': 'Cash amount cannot be negative',
        'any.required': 'Cash amount is required'
    }),
    bank_transfer_amount: joi_1.default.number().min(0).required().messages({
        'number.min': 'Bank transfer amount cannot be negative',
        'any.required': 'Bank transfer amount is required'
    }),
    card_amount: joi_1.default.number().min(0).required().messages({
        'number.min': 'Card amount cannot be negative',
        'any.required': 'Card amount is required'
    }),
    mobile_money_amount: joi_1.default.number().min(0).optional().default(0).messages({
        'number.min': 'Mobile money amount cannot be negative'
    }),
    notes: joi_1.default.string().max(2000).optional().allow('', null)
});
exports.updateServiceReportSchema = joi_1.default.object({
    preacher: joi_1.default.string().max(200).optional().allow('', null),
    sermon_title: joi_1.default.string().max(300).optional().allow('', null),
    sermon_notes: joi_1.default.string().max(5000).optional().allow('', null),
    attendance_men: joi_1.default.number().integer().min(0).optional(),
    attendance_women: joi_1.default.number().integer().min(0).optional(),
    attendance_children: joi_1.default.number().integer().min(0).optional(),
    first_timers: joi_1.default.number().integer().min(0).optional(),
    new_comers: joi_1.default.number().integer().min(0).optional(),
    offerings: joi_1.default.number().min(0).optional(),
    tithes: joi_1.default.number().min(0).optional(),
    donations: joi_1.default.number().min(0).optional(),
    other_income: joi_1.default.number().min(0).optional(),
    expenses: joi_1.default.number().min(0).optional(),
    cash_amount: joi_1.default.number().min(0).optional(),
    bank_transfer_amount: joi_1.default.number().min(0).optional(),
    card_amount: joi_1.default.number().min(0).optional(),
    mobile_money_amount: joi_1.default.number().min(0).optional(),
    notes: joi_1.default.string().max(2000).optional().allow('', null)
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});
exports.serviceReportFilterSchema = joi_1.default.object({
    start_date: joi_1.default.date().iso().optional(),
    end_date: joi_1.default.date().iso().optional(),
    event_id: joi_1.default.string().uuid().optional(),
    preacher: joi_1.default.string().optional()
});
//# sourceMappingURL=serviceReport.validator.js.map