// src/validators/family.validator.ts
import Joi from 'joi';

const familyRoles = [
    'father', 'mother', 'son', 'daughter',
    'grandfather', 'grandmother', 'grandson', 'granddaughter',
    'uncle', 'aunt', 'nephew', 'niece', 'cousin',
    'brother', 'sister', 'brother_in_law', 'sister_in_law',
    'father_in_law', 'mother_in_law',
    'stepfather', 'stepmother', 'stepson', 'stepdaughter',
    'guardian', 'ward', 'other'
];

export const createFamilySchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Family name must be at least 2 characters',
        'any.required': 'Family name is required',
    }),
    headId: Joi.string().uuid().allow(null, ''),
    address: Joi.string().max(500).allow(null, ''),
    city: Joi.string().max(100).allow(null, ''),
    state: Joi.string().max(100).allow(null, ''),
    postalCode: Joi.string().max(20).allow(null, ''),
    country: Joi.string().max(100).allow(null, ''),
    homePhone: Joi.string().max(20).allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    weddingAnniversary: Joi.date().allow(null, ''),
    notes: Joi.string().max(2000).allow(null, ''),
    profileImageUrl: Joi.string().uri().allow(null, ''),
    members: Joi.array().items(
        Joi.object({
            memberId: Joi.string().uuid().required(),
            familyRole: Joi.string().valid(...familyRoles).required(),
            familyRoleOther: Joi.string().max(100).allow(null, ''),
            isHead: Joi.boolean().default(false),
        })
    ).optional(),
});

export const updateFamilySchema = Joi.object({
    name: Joi.string().min(2).max(100),
    headId: Joi.string().uuid().allow(null, ''),
    address: Joi.string().max(500).allow(null, ''),
    city: Joi.string().max(100).allow(null, ''),
    state: Joi.string().max(100).allow(null, ''),
    postalCode: Joi.string().max(20).allow(null, ''),
    country: Joi.string().max(100).allow(null, ''),
    homePhone: Joi.string().max(20).allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    weddingAnniversary: Joi.date().allow(null, ''),
    notes: Joi.string().max(2000).allow(null, ''),
    profileImageUrl: Joi.string().uri().allow(null, ''),
    isActive: Joi.boolean(),
});

export const addFamilyMemberSchema = Joi.object({
    memberId: Joi.string().uuid().required(),
    familyRole: Joi.string().valid(...familyRoles).required(),
    familyRoleOther: Joi.when('familyRole', {
        is: 'other',
        then: Joi.string().max(100).required().messages({
            'any.required': 'Please specify the relationship when using "other"',
        }),
        otherwise: Joi.string().max(100).allow(null, ''),
    }),
    isHead: Joi.boolean().default(false),
});

export const updateFamilyMemberSchema = Joi.object({
    familyRole: Joi.string().valid(...familyRoles),
    familyRoleOther: Joi.string().max(100).allow(null, ''),
    isHead: Joi.boolean(),
});

export const familyFiltersSchema = Joi.object({
    search: Joi.string().max(100).allow(''),
    isActive: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});