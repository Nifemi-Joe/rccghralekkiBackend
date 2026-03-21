"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupTypeSchema = exports.shareMeetingSchema = exports.updateMeetingSchema = exports.createMeetingSchema = exports.addGroupMemberSchema = exports.updateGroupSchema = exports.createGroupSchema = void 0;
// src/validators/group.validator.ts
const joi_1 = __importDefault(require("joi"));
exports.createGroupSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required().messages({
        'string.min': 'Group name must be at least 2 characters',
        'any.required': 'Group name is required',
    }),
    description: joi_1.default.string().max(1000).allow('', null),
    groupTypeId: joi_1.default.string().uuid().allow(null),
    leaderId: joi_1.default.string().uuid().allow(null),
    coLeaderId: joi_1.default.string().uuid().allow(null),
    // FIX: Added '' to allow empty string
    defaultMeetingDay: joi_1.default.string().valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday').allow('', null),
    // FIX: Added '' to allow empty string
    defaultMeetingTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null),
    defaultMeetingType: joi_1.default.string().valid('physical', 'online', 'hybrid').default('physical'),
    defaultLocationType: joi_1.default.string().valid('church', 'custom').default('church'),
    defaultLocationAddress: joi_1.default.string().max(500).allow('', null),
    defaultLocationCity: joi_1.default.string().max(100).allow('', null),
    defaultLocationNotes: joi_1.default.string().max(500).allow('', null),
    // FIX: Added '' to allow empty string
    defaultOnlinePlatform: joi_1.default.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow('', null),
    defaultMeetingLink: joi_1.default.string().uri().allow('', null),
    defaultMeetingId: joi_1.default.string().max(100).allow('', null),
    defaultMeetingPassword: joi_1.default.string().max(100).allow('', null),
    coverImageUrl: joi_1.default.string().uri().allow('', null),
    isPublic: joi_1.default.boolean().default(true),
    maxMembers: joi_1.default.number().integer().min(1).max(1000).allow(null),
});
exports.updateGroupSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100),
    description: joi_1.default.string().max(1000).allow('', null),
    groupTypeId: joi_1.default.string().uuid().allow('', null),
    leaderId: joi_1.default.string().uuid().allow('', null),
    coLeaderId: joi_1.default.string().uuid().allow('', null),
    // FIX: Added '' to allow empty string
    defaultMeetingDay: joi_1.default.string().valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday').allow('', null),
    // FIX: Added '' to allow empty string
    defaultMeetingTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null),
    defaultMeetingType: joi_1.default.string().valid('physical', 'online', 'hybrid'),
    defaultLocationType: joi_1.default.string().valid('church', 'custom'),
    defaultLocationAddress: joi_1.default.string().max(500).allow('', null),
    defaultLocationCity: joi_1.default.string().max(100).allow('', null),
    defaultLocationNotes: joi_1.default.string().max(500).allow('', null),
    // FIX: Added '' to allow empty string
    defaultOnlinePlatform: joi_1.default.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow('', null),
    defaultMeetingLink: joi_1.default.string().uri().allow('', null),
    defaultMeetingId: joi_1.default.string().max(100).allow('', null),
    defaultMeetingPassword: joi_1.default.string().max(100).allow('', null),
    coverImageUrl: joi_1.default.string().uri().allow('', null),
    isPublic: joi_1.default.boolean(),
    isActive: joi_1.default.boolean(),
    maxMembers: joi_1.default.number().integer().min(1).max(1000).allow(null),
});
exports.addGroupMemberSchema = joi_1.default.object({
    memberId: joi_1.default.string().uuid().required(),
    role: joi_1.default.string().valid('leader', 'co_leader', 'secretary', 'treasurer', 'member').default('member'),
    notes: joi_1.default.string().max(500).allow('', null),
});
exports.createMeetingSchema = joi_1.default.object({
    groupId: joi_1.default.string().uuid().required(),
    title: joi_1.default.string().min(2).max(200).required(),
    description: joi_1.default.string().max(2000).allow('', null),
    meetingDate: joi_1.default.date().required(),
    startTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
    timezone: joi_1.default.string().max(50).default('UTC'),
    meetingType: joi_1.default.string().valid('physical', 'online', 'hybrid').required(),
    // Physical location
    locationType: joi_1.default.string().valid('church', 'custom').allow(null),
    locationAddress: joi_1.default.string().max(500).allow('', null),
    locationCity: joi_1.default.string().max(100).allow('', null),
    locationNotes: joi_1.default.string().max(500).allow('', null),
    locationMapUrl: joi_1.default.string().uri().allow('', null),
    // Online meeting
    onlinePlatform: joi_1.default.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow(null),
    meetingLink: joi_1.default.string().uri().allow('', null),
    meetingId: joi_1.default.string().max(100).allow('', null),
    meetingPasscode: joi_1.default.string().max(100).allow('', null),
    hostName: joi_1.default.string().max(100).allow('', null),
    dialInNumber: joi_1.default.string().max(50).allow('', null),
    additionalInstructions: joi_1.default.string().max(1000).allow('', null),
    isRecurring: joi_1.default.boolean().default(false),
    recurrencePattern: joi_1.default.string().valid('weekly', 'biweekly', 'monthly').allow(null),
}).custom((value, helpers) => {
    // Validate online fields if meeting type is online or hybrid
    if ((value.meetingType === 'online' || value.meetingType === 'hybrid') && !value.onlinePlatform) {
        return helpers.message({ custom: 'Online platform is required for online meetings' });
    }
    // Validate physical fields if meeting type is physical or hybrid
    if ((value.meetingType === 'physical' || value.meetingType === 'hybrid') && !value.locationType) {
        return helpers.message({ custom: 'Location type is required for physical meetings' });
    }
    return value;
});
exports.updateMeetingSchema = joi_1.default.object({
    title: joi_1.default.string().min(2).max(200),
    description: joi_1.default.string().max(2000).allow('', null),
    meetingDate: joi_1.default.date(),
    startTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
    timezone: joi_1.default.string().max(50),
    meetingType: joi_1.default.string().valid('physical', 'online', 'hybrid'),
    locationType: joi_1.default.string().valid('church', 'custom').allow(null),
    locationAddress: joi_1.default.string().max(500).allow('', null),
    locationCity: joi_1.default.string().max(100).allow('', null),
    locationNotes: joi_1.default.string().max(500).allow('', null),
    locationMapUrl: joi_1.default.string().uri().allow('', null),
    onlinePlatform: joi_1.default.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow(null),
    meetingLink: joi_1.default.string().uri().allow('', null),
    meetingId: joi_1.default.string().max(100).allow('', null),
    meetingPasscode: joi_1.default.string().max(100).allow('', null),
    hostName: joi_1.default.string().max(100).allow('', null),
    dialInNumber: joi_1.default.string().max(50).allow('', null),
    additionalInstructions: joi_1.default.string().max(1000).allow('', null),
    status: joi_1.default.string().valid('scheduled', 'in_progress', 'completed', 'cancelled'),
    cancelledReason: joi_1.default.string().max(500).allow('', null),
});
exports.shareMeetingSchema = joi_1.default.object({
    shareVia: joi_1.default.string().valid('email', 'sms', 'whatsapp').required(),
    recipientIds: joi_1.default.array().items(joi_1.default.string().uuid()),
    customMessage: joi_1.default.string().max(500).allow('', null),
    includeAllMembers: joi_1.default.boolean().default(false),
});
exports.groupTypeSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    description: joi_1.default.string().max(500).allow('', null),
    icon: joi_1.default.string().max(50).allow('', null),
    color: joi_1.default.string().max(20).allow('', null),
});
//# sourceMappingURL=group.validator.js.map