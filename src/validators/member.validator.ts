// src/validators/member.validator.ts
import Joi from 'joi';

export const createMemberSchema = Joi.object({
    firstName: Joi.string().required().max(100),
    lastName: Joi.string().required().max(100),
    email: Joi.string().email().optional().allow(null, ''),
    phone: Joi.string().optional().allow(null, ''),
    gender: Joi.string().valid('male', 'female', 'other').optional().allow(null),
    maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(null),
    dateOfBirth: Joi.date().optional().allow(null),
    weddingAnniversary: Joi.date().optional().allow(null),
    address: Joi.string().optional().allow(null, ''),
    city: Joi.string().optional().allow(null, ''),
    state: Joi.string().optional().allow(null, ''),
    country: Joi.string().optional().allow(null, ''),
    postalCode: Joi.string().optional().allow(null, ''),
    profileImageUrl: Joi.string().uri().optional().allow(null, ''),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    notes: Joi.string().optional().allow(null, ''),
    familyId: Joi.string().uuid().optional().allow(null),
    familyRole: Joi.string().optional().allow(null),
    familyRoleOther: Joi.string().optional().allow(null, ''),
    sendProfileLink: Joi.boolean().optional(), // NEW
});

export const updateMemberSchema = Joi.object({
    firstName: Joi.string().max(100).optional(),
    lastName: Joi.string().max(100).optional(),
    email: Joi.string().email().optional().allow(null, ''),
    phone: Joi.string().optional().allow(null, ''),
    gender: Joi.string().valid('male', 'female', 'other').optional().allow(null),
    maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(null),
    dateOfBirth: Joi.date().optional().allow(null),
    weddingAnniversary: Joi.date().optional().allow(null),
    address: Joi.string().optional().allow(null, ''),
    city: Joi.string().optional().allow(null, ''),
    state: Joi.string().optional().allow(null, ''),
    country: Joi.string().optional().allow(null, ''),
    postalCode: Joi.string().optional().allow(null, ''),
    profileImageUrl: Joi.string().uri().optional().allow(null, ''),
    status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
    notes: Joi.string().optional().allow(null, ''),
    familyId: Joi.string().uuid().optional().allow(null),
    familyRole: Joi.string().optional().allow(null),
    familyRoleOther: Joi.string().optional().allow(null, ''),
});



export const sendProfileLinkSchema = Joi.object({
    channels: Joi.array().items(Joi.string().valid('email', 'sms')).min(1).required(),
});


export const qrRegisterSchema = Joi.object({
    churchId: Joi.string().uuid().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().max(20).allow('', null),
    dateOfBirth: Joi.date().optional().allow(null),

    gender: Joi.string().valid('male', 'female', 'other').allow(null),
    maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').allow(null),
    weddingAnniversary: Joi.date().max('now').allow(null),
});