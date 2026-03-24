"use strict";
// src/validators/firstTimer.validator.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConversionSettingsSchema = exports.convertToMemberSchema = exports.recordVisitSchema = exports.updateFirstTimerSchema = exports.createFirstTimerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createFirstTimerSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50).required().messages({
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required',
    }),
    lastName: joi_1.default.string().min(2).max(50).required().messages({
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required',
    }),
    email: joi_1.default.string().email().allow('', null),
    phone: joi_1.default.string().max(20).allow('', null),
    gender: joi_1.default.string().valid('male', 'female', 'other').allow(null),
    dateOfBirth: joi_1.default.date().max('now').allow(null),
    address: joi_1.default.string().max(255).allow('', null),
    city: joi_1.default.string().max(100).allow('', null),
    state: joi_1.default.string().max(100).allow('', null),
    country: joi_1.default.string().max(100).allow('', null),
    firstVisitDate: joi_1.default.date().max('now').default(new Date()),
    howDidYouHear: joi_1.default.string().max(100).allow('', null),
    invitedBy: joi_1.default.string().uuid().allow(null),
    interests: joi_1.default.array().items(joi_1.default.string()).allow(null),
    prayerRequest: joi_1.default.string().max(2000).allow('', null),
    wantsFollowUp: joi_1.default.boolean().default(true),
    notes: joi_1.default.string().max(2000).allow('', null),
    interestedInMembership: joi_1.default.boolean().allow(null),
})
    .options({ stripUnknown: true })
    .unknown(false);
exports.updateFirstTimerSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50),
    lastName: joi_1.default.string().min(2).max(50),
    email: joi_1.default.string().email().allow('', null),
    phone: joi_1.default.string().max(20).allow('', null),
    gender: joi_1.default.string().valid('male', 'female', 'other').allow(null),
    dateOfBirth: joi_1.default.date().max('now').allow(null),
    address: joi_1.default.string().max(255).allow('', null),
    city: joi_1.default.string().max(100).allow('', null),
    state: joi_1.default.string().max(100).allow('', null),
    country: joi_1.default.string().max(100).allow('', null),
    howDidYouHear: joi_1.default.string().max(100).allow('', null),
    invitedBy: joi_1.default.string().uuid().allow(null),
    interests: joi_1.default.array().items(joi_1.default.string()).allow(null),
    prayerRequest: joi_1.default.string().max(2000).allow('', null),
    wantsFollowUp: joi_1.default.boolean(),
    followUpStatus: joi_1.default.string().valid('pending', 'contacted', 'scheduled', 'completed', 'no_response'),
    followUpAssignedTo: joi_1.default.string().uuid().allow(null),
    followUpDate: joi_1.default.date().allow(null),
    followUpNotes: joi_1.default.string().max(2000).allow('', null),
    status: joi_1.default.string().valid('new', 'following_up', 'regular_visitor', 'converted', 'inactive'),
    notes: joi_1.default.string().max(2000).allow('', null),
    interestedInMembership: joi_1.default.boolean().allow(null),
})
    .options({ stripUnknown: true });
exports.recordVisitSchema = joi_1.default.object({
    visitDate: joi_1.default.date().max('now').default(new Date()),
    notes: joi_1.default.string().max(500).allow('', null),
})
    .options({ stripUnknown: true });
exports.convertToMemberSchema = joi_1.default.object({
    additionalData: joi_1.default.object({
        maritalStatus: joi_1.default.string().valid('single', 'married', 'divorced', 'widowed').allow(null),
        weddingAnniversary: joi_1.default.date().allow(null),
        postalCode: joi_1.default.string().max(20).allow('', null),
        notes: joi_1.default.string().max(2000).allow('', null),
    }).allow(null),
})
    .options({ stripUnknown: true });
exports.updateConversionSettingsSchema = joi_1.default.object({
    conversionPeriodDays: joi_1.default.number().integer().min(1).max(365).required().messages({
        'number.min': 'Conversion period must be at least 1 day',
        'number.max': 'Conversion period cannot exceed 365 days',
        'any.required': 'Conversion period is required',
    }),
})
    .options({ stripUnknown: true });
//# sourceMappingURL=firstTimer.validator.js.map