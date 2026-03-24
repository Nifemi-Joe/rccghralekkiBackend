// src/validators/firstTimer.validator.ts

import Joi from 'joi';

export const createFirstTimerSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required',
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required',
    }),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().max(20).allow('', null),
    gender: Joi.string().valid('male', 'female', 'other').allow(null),
    dateOfBirth: Joi.date().max('now').allow(null),
    address: Joi.string().max(255).allow('', null),
    city: Joi.string().max(100).allow('', null),
    state: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    firstVisitDate: Joi.date().max('now').default(new Date()),
    howDidYouHear: Joi.string().max(100).allow('', null),
    invitedBy: Joi.string().uuid().allow(null),
    interests: Joi.array().items(Joi.string()).allow(null),
    prayerRequest: Joi.string().max(2000).allow('', null),
    wantsFollowUp: Joi.boolean().default(true),
    notes: Joi.string().max(2000).allow('', null),
    interestedInMembership: Joi.boolean().allow(null),
})
    .options({ stripUnknown: true })
    .unknown(false);

export const updateFirstTimerSchema = Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().max(20).allow('', null),
    gender: Joi.string().valid('male', 'female', 'other').allow(null),
    dateOfBirth: Joi.date().max('now').allow(null),
    address: Joi.string().max(255).allow('', null),
    city: Joi.string().max(100).allow('', null),
    state: Joi.string().max(100).allow('', null),
    country: Joi.string().max(100).allow('', null),
    howDidYouHear: Joi.string().max(100).allow('', null),
    invitedBy: Joi.string().uuid().allow(null),
    interests: Joi.array().items(Joi.string()).allow(null),
    prayerRequest: Joi.string().max(2000).allow('', null),
    wantsFollowUp: Joi.boolean(),
    followUpStatus: Joi.string().valid('pending', 'contacted', 'scheduled', 'completed', 'no_response'),
    followUpAssignedTo: Joi.string().uuid().allow(null),
    followUpDate: Joi.date().allow(null),
    followUpNotes: Joi.string().max(2000).allow('', null),
    status: Joi.string().valid('new', 'following_up', 'regular_visitor', 'converted', 'inactive'),
    notes: Joi.string().max(2000).allow('', null),
    interestedInMembership: Joi.boolean().allow(null),
})
    .options({ stripUnknown: true });

export const recordVisitSchema = Joi.object({
    visitDate: Joi.date().max('now').default(new Date()),
    notes: Joi.string().max(500).allow('', null),
})
    .options({ stripUnknown: true });

export const convertToMemberSchema = Joi.object({
    additionalData: Joi.object({
        maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').allow(null),
        weddingAnniversary: Joi.date().allow(null),
        postalCode: Joi.string().max(20).allow('', null),
        notes: Joi.string().max(2000).allow('', null),
    }).allow(null),
})
    .options({ stripUnknown: true });

export const updateConversionSettingsSchema = Joi.object({
    conversionPeriodDays: Joi.number().integer().min(1).max(365).required().messages({
        'number.min': 'Conversion period must be at least 1 day',
        'number.max': 'Conversion period cannot exceed 365 days',
        'any.required': 'Conversion period is required',
    }),
})
    .options({ stripUnknown: true });