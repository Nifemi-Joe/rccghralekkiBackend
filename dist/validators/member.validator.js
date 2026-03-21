"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrRegisterSchema = exports.sendProfileLinkSchema = exports.updateMemberSchema = exports.createMemberSchema = void 0;
// src/validators/member.validator.ts
const joi_1 = __importDefault(require("joi"));
exports.createMemberSchema = joi_1.default.object({
    firstName: joi_1.default.string().required().max(100),
    lastName: joi_1.default.string().required().max(100),
    email: joi_1.default.string().email().optional().allow(null, ''),
    phone: joi_1.default.string().optional().allow(null, ''),
    gender: joi_1.default.string().valid('male', 'female', 'other').optional().allow(null),
    maritalStatus: joi_1.default.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(null),
    dateOfBirth: joi_1.default.date().optional().allow(null),
    weddingAnniversary: joi_1.default.date().optional().allow(null),
    address: joi_1.default.string().optional().allow(null, ''),
    city: joi_1.default.string().optional().allow(null, ''),
    state: joi_1.default.string().optional().allow(null, ''),
    country: joi_1.default.string().optional().allow(null, ''),
    postalCode: joi_1.default.string().optional().allow(null, ''),
    profileImageUrl: joi_1.default.string().uri().optional().allow(null, ''),
    status: joi_1.default.string().valid('active', 'inactive', 'suspended').optional(),
    notes: joi_1.default.string().optional().allow(null, ''),
    familyId: joi_1.default.string().uuid().optional().allow(null),
    familyRole: joi_1.default.string().optional().allow(null),
    familyRoleOther: joi_1.default.string().optional().allow(null, ''),
    sendProfileLink: joi_1.default.boolean().optional(), // NEW
});
exports.updateMemberSchema = joi_1.default.object({
    firstName: joi_1.default.string().max(100).optional(),
    lastName: joi_1.default.string().max(100).optional(),
    email: joi_1.default.string().email().optional().allow(null, ''),
    phone: joi_1.default.string().optional().allow(null, ''),
    gender: joi_1.default.string().valid('male', 'female', 'other').optional().allow(null),
    maritalStatus: joi_1.default.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(null),
    dateOfBirth: joi_1.default.date().optional().allow(null),
    weddingAnniversary: joi_1.default.date().optional().allow(null),
    address: joi_1.default.string().optional().allow(null, ''),
    city: joi_1.default.string().optional().allow(null, ''),
    state: joi_1.default.string().optional().allow(null, ''),
    country: joi_1.default.string().optional().allow(null, ''),
    postalCode: joi_1.default.string().optional().allow(null, ''),
    profileImageUrl: joi_1.default.string().uri().optional().allow(null, ''),
    status: joi_1.default.string().valid('active', 'inactive', 'suspended').optional(),
    notes: joi_1.default.string().optional().allow(null, ''),
    familyId: joi_1.default.string().uuid().optional().allow(null),
    familyRole: joi_1.default.string().optional().allow(null),
    familyRoleOther: joi_1.default.string().optional().allow(null, ''),
});
exports.sendProfileLinkSchema = joi_1.default.object({
    channels: joi_1.default.array().items(joi_1.default.string().valid('email', 'sms')).min(1).required(),
});
exports.qrRegisterSchema = joi_1.default.object({
    churchId: joi_1.default.string().uuid().required(),
    firstName: joi_1.default.string().min(2).max(50).required(),
    lastName: joi_1.default.string().min(2).max(50).required(),
    email: joi_1.default.string().email().allow('', null),
    phone: joi_1.default.string().max(20).allow('', null),
    dateOfBirth: joi_1.default.date().optional().allow(null),
    gender: joi_1.default.string().valid('male', 'female', 'other').allow(null),
    maritalStatus: joi_1.default.string().valid('single', 'married', 'divorced', 'widowed').allow(null),
    weddingAnniversary: joi_1.default.date().max('now').allow(null),
});
//# sourceMappingURL=member.validator.js.map