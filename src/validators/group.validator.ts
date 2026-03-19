// src/validators/group.validator.ts
import Joi from 'joi';

export const createGroupSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Group name must be at least 2 characters',
        'any.required': 'Group name is required',
    }),
    description: Joi.string().max(1000).allow('', null),
    groupTypeId: Joi.string().uuid().allow(null),
    leaderId: Joi.string().uuid().allow(null),
    coLeaderId: Joi.string().uuid().allow(null),
    // FIX: Added '' to allow empty string
    defaultMeetingDay: Joi.string().valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday').allow('', null),
    // FIX: Added '' to allow empty string
    defaultMeetingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null),
    defaultMeetingType: Joi.string().valid('physical', 'online', 'hybrid').default('physical'),
    defaultLocationType: Joi.string().valid('church', 'custom').default('church'),
    defaultLocationAddress: Joi.string().max(500).allow('', null),
    defaultLocationCity: Joi.string().max(100).allow('', null),
    defaultLocationNotes: Joi.string().max(500).allow('', null),
    // FIX: Added '' to allow empty string
    defaultOnlinePlatform: Joi.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow('', null),
    defaultMeetingLink: Joi.string().uri().allow('', null),
    defaultMeetingId: Joi.string().max(100).allow('', null),
    defaultMeetingPassword: Joi.string().max(100).allow('', null),
    coverImageUrl: Joi.string().uri().allow('', null),
    isPublic: Joi.boolean().default(true),
    maxMembers: Joi.number().integer().min(1).max(1000).allow(null),
});

export const updateGroupSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(1000).allow('', null),
    groupTypeId: Joi.string().uuid().allow('', null),
    leaderId: Joi.string().uuid().allow('', null),
    coLeaderId: Joi.string().uuid().allow('', null),
    // FIX: Added '' to allow empty string
    defaultMeetingDay: Joi.string().valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday').allow('', null),
    // FIX: Added '' to allow empty string
    defaultMeetingTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null),
    defaultMeetingType: Joi.string().valid('physical', 'online', 'hybrid'),
    defaultLocationType: Joi.string().valid('church', 'custom'),
    defaultLocationAddress: Joi.string().max(500).allow('', null),
    defaultLocationCity: Joi.string().max(100).allow('', null),
    defaultLocationNotes: Joi.string().max(500).allow('', null),
    // FIX: Added '' to allow empty string
    defaultOnlinePlatform: Joi.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow('', null),
    defaultMeetingLink: Joi.string().uri().allow('', null),
    defaultMeetingId: Joi.string().max(100).allow('', null),
    defaultMeetingPassword: Joi.string().max(100).allow('', null),
    coverImageUrl: Joi.string().uri().allow('', null),
    isPublic: Joi.boolean(),
    isActive: Joi.boolean(),
    maxMembers: Joi.number().integer().min(1).max(1000).allow(null),
});

export const addGroupMemberSchema = Joi.object({
    memberId: Joi.string().uuid().required(),
    role: Joi.string().valid('leader', 'co_leader', 'secretary', 'treasurer', 'member').default('member'),
    notes: Joi.string().max(500).allow('', null),
});

export const createMeetingSchema = Joi.object({
    groupId: Joi.string().uuid().required(),
    title: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(2000).allow('', null),
    meetingDate: Joi.date().required(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
    timezone: Joi.string().max(50).default('UTC'),
    meetingType: Joi.string().valid('physical', 'online', 'hybrid').required(),

    // Physical location
    locationType: Joi.string().valid('church', 'custom').allow(null),
    locationAddress: Joi.string().max(500).allow('', null),
    locationCity: Joi.string().max(100).allow('', null),
    locationNotes: Joi.string().max(500).allow('', null),
    locationMapUrl: Joi.string().uri().allow('', null),

    // Online meeting
    onlinePlatform: Joi.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow(null),
    meetingLink: Joi.string().uri().allow('', null),
    meetingId: Joi.string().max(100).allow('', null),
    meetingPasscode: Joi.string().max(100).allow('', null),
    hostName: Joi.string().max(100).allow('', null),
    dialInNumber: Joi.string().max(50).allow('', null),
    additionalInstructions: Joi.string().max(1000).allow('', null),

    isRecurring: Joi.boolean().default(false),
    recurrencePattern: Joi.string().valid('weekly', 'biweekly', 'monthly').allow(null),
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

export const updateMeetingSchema = Joi.object({
    title: Joi.string().min(2).max(200),
    description: Joi.string().max(2000).allow('', null),
    meetingDate: Joi.date(),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
    timezone: Joi.string().max(50),
    meetingType: Joi.string().valid('physical', 'online', 'hybrid'),
    locationType: Joi.string().valid('church', 'custom').allow(null),
    locationAddress: Joi.string().max(500).allow('', null),
    locationCity: Joi.string().max(100).allow('', null),
    locationNotes: Joi.string().max(500).allow('', null),
    locationMapUrl: Joi.string().uri().allow('', null),
    onlinePlatform: Joi.string().valid('zoom', 'google_meet', 'microsoft_teams', 'other').allow(null),
    meetingLink: Joi.string().uri().allow('', null),
    meetingId: Joi.string().max(100).allow('', null),
    meetingPasscode: Joi.string().max(100).allow('', null),
    hostName: Joi.string().max(100).allow('', null),
    dialInNumber: Joi.string().max(50).allow('', null),
    additionalInstructions: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled'),
    cancelledReason: Joi.string().max(500).allow('', null),
});

export const shareMeetingSchema = Joi.object({
    shareVia: Joi.string().valid('email', 'sms', 'whatsapp').required(),
    recipientIds: Joi.array().items(Joi.string().uuid()),
    customMessage: Joi.string().max(500).allow('', null),
    includeAllMembers: Joi.boolean().default(false),
});

export const groupTypeSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow('', null),
    icon: Joi.string().max(50).allow('', null),
    color: Joi.string().max(20).allow('', null),
});