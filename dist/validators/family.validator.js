"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyFiltersSchema = exports.updateFamilyMemberSchema = exports.addFamilyMemberSchema = exports.updateFamilySchema = exports.createFamilySchema = void 0;
// src/validators/family.validator.ts
const joi_1 = __importDefault(require("joi"));
const familyRoles = [
    'father', 'mother', 'son', 'daughter',
    'grandfather', 'grandmother', 'grandson', 'granddaughter',
    'uncle', 'aunt', 'nephew', 'niece', 'cousin',
    'brother', 'sister', 'brother_in_law', 'sister_in_law',
    'father_in_law', 'mother_in_law',
    'stepfather', 'stepmother', 'stepson', 'stepdaughter',
    'guardian', 'ward', 'other'
];
exports.createFamilySchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required().messages({
        'string.min': 'Family name must be at least 2 characters',
        'any.required': 'Family name is required',
    }),
    headId: joi_1.default.string().uuid().allow(null, ''),
    address: joi_1.default.string().max(500).allow(null, ''),
    city: joi_1.default.string().max(100).allow(null, ''),
    state: joi_1.default.string().max(100).allow(null, ''),
    postalCode: joi_1.default.string().max(20).allow(null, ''),
    country: joi_1.default.string().max(100).allow(null, ''),
    homePhone: joi_1.default.string().max(20).allow(null, ''),
    email: joi_1.default.string().email().allow(null, ''),
    weddingAnniversary: joi_1.default.date().allow(null, ''),
    notes: joi_1.default.string().max(2000).allow(null, ''),
    profileImageUrl: joi_1.default.string().uri().allow(null, ''),
    members: joi_1.default.array().items(joi_1.default.object({
        memberId: joi_1.default.string().uuid().required(),
        familyRole: joi_1.default.string().valid(...familyRoles).required(),
        familyRoleOther: joi_1.default.string().max(100).allow(null, ''),
        isHead: joi_1.default.boolean().default(false),
    })).optional(),
});
exports.updateFamilySchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100),
    headId: joi_1.default.string().uuid().allow(null, ''),
    address: joi_1.default.string().max(500).allow(null, ''),
    city: joi_1.default.string().max(100).allow(null, ''),
    state: joi_1.default.string().max(100).allow(null, ''),
    postalCode: joi_1.default.string().max(20).allow(null, ''),
    country: joi_1.default.string().max(100).allow(null, ''),
    homePhone: joi_1.default.string().max(20).allow(null, ''),
    email: joi_1.default.string().email().allow(null, ''),
    weddingAnniversary: joi_1.default.date().allow(null, ''),
    notes: joi_1.default.string().max(2000).allow(null, ''),
    profileImageUrl: joi_1.default.string().uri().allow(null, ''),
    isActive: joi_1.default.boolean(),
});
exports.addFamilyMemberSchema = joi_1.default.object({
    memberId: joi_1.default.string().uuid().required(),
    familyRole: joi_1.default.string().valid(...familyRoles).required(),
    familyRoleOther: joi_1.default.when('familyRole', {
        is: 'other',
        then: joi_1.default.string().max(100).required().messages({
            'any.required': 'Please specify the relationship when using "other"',
        }),
        otherwise: joi_1.default.string().max(100).allow(null, ''),
    }),
    isHead: joi_1.default.boolean().default(false),
});
exports.updateFamilyMemberSchema = joi_1.default.object({
    familyRole: joi_1.default.string().valid(...familyRoles),
    familyRoleOther: joi_1.default.string().max(100).allow(null, ''),
    isHead: joi_1.default.boolean(),
});
exports.familyFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().max(100).allow(''),
    isActive: joi_1.default.boolean(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
//# sourceMappingURL=family.validator.js.map