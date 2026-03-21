"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventFiltersSchema = exports.checkInSchema = exports.shareEventSchema = exports.createRegistrationSchema = exports.updateEventInstanceSchema = exports.createEventInstanceSchema = exports.updateEventSchema = exports.createEventSchema = void 0;
// src/validators/event.validator.ts
const joi_1 = __importDefault(require("joi"));
const eventTypes = ['service', 'meeting', 'conference', 'outreach', 'fellowship', 'workshop', 'retreat', 'concert', 'other'];
const recurrenceTypes = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'];
const locationTypes = ['physical', 'online', 'hybrid'];
const onlinePlatforms = ['zoom', 'google_meet', 'microsoft_teams', 'youtube', 'facebook', 'other'];
const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
exports.createEventSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(200).required().messages({
        'string.empty': 'Event name is required',
        'string.min': 'Event name must be at least 2 characters',
    }),
    description: joi_1.default.string().max(5000).allow('', null),
    eventType: joi_1.default.string().valid(...eventTypes).required().messages({
        'any.only': 'Invalid event type',
    }),
    recurrence: joi_1.default.string().valid(...recurrenceTypes).default('none'),
    // Date and Time
    startDate: joi_1.default.date().iso().required().messages({
        'date.format': 'Invalid start date format',
    }),
    endDate: joi_1.default.date().iso().min(joi_1.default.ref('startDate')).allow(null).messages({
        'date.min': 'End date must be after start date',
    }),
    startTime: joi_1.default.string().pattern(timePattern).required().messages({
        'string.pattern.base': 'Invalid time format (HH:MM)',
    }),
    endTime: joi_1.default.string().pattern(timePattern).allow('', null),
    timezone: joi_1.default.string().max(50).default('Africa/Accra'),
    // Location
    locationType: joi_1.default.string().valid(...locationTypes).default('physical'),
    locationName: joi_1.default.string().max(255).allow('', null),
    locationAddress: joi_1.default.string().max(500).allow('', null),
    locationCity: joi_1.default.string().max(100).allow('', null),
    locationMapUrl: joi_1.default.string().uri().allow('', null),
    // Online
    onlinePlatform: joi_1.default.string().valid(...onlinePlatforms).allow('', null),
    meetingLink: joi_1.default.string().uri().allow('', null),
    meetingId: joi_1.default.string().max(100).allow('', null),
    meetingPassword: joi_1.default.string().max(100).allow('', null),
    streamUrl: joi_1.default.string().uri().allow('', null),
    // Capacity & Registration
    capacity: joi_1.default.number().integer().min(1).max(100000).allow(null),
    isRegistrationRequired: joi_1.default.boolean().default(false),
    registrationDeadline: joi_1.default.date().iso().allow(null),
    maxRegistrations: joi_1.default.number().integer().min(1).allow(null),
    // Payment
    isPaid: joi_1.default.boolean().default(false),
    price: joi_1.default.when('isPaid', {
        is: true,
        then: joi_1.default.number().min(0).required(),
        otherwise: joi_1.default.number().min(0).allow(null),
    }),
    currency: joi_1.default.string().length(3).default('GHS'),
    earlyBirdPrice: joi_1.default.number().min(0).allow(null),
    earlyBirdDeadline: joi_1.default.date().iso().allow(null),
    // Visuals
    bannerUrl: joi_1.default.string().uri().allow('', null),
    thumbnailUrl: joi_1.default.string().uri().allow('', null),
    // Settings
    isActive: joi_1.default.boolean().default(true),
    isPublic: joi_1.default.boolean().default(true),
    isFeatured: joi_1.default.boolean().default(false),
    allowSelfCheckin: joi_1.default.boolean().default(true),
    allowGuestCheckin: joi_1.default.boolean().default(true),
    requireApproval: joi_1.default.boolean().default(false),
    sendReminders: joi_1.default.boolean().default(true),
    reminderHours: joi_1.default.number().integer().min(1).max(168).default(24),
    // Relations
    groupId: joi_1.default.string().uuid().allow('', null),
    ministryId: joi_1.default.string().uuid().allow('', null),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
    // Ticket Types
    ticketTypes: joi_1.default.array().items(joi_1.default.object({
        name: joi_1.default.string().max(100).required(),
        description: joi_1.default.string().max(500).allow('', null),
        price: joi_1.default.number().min(0).required(),
        currency: joi_1.default.string().length(3).default('GHS'),
        quantityAvailable: joi_1.default.number().integer().min(1).allow(null),
        maxPerOrder: joi_1.default.number().integer().min(1).max(100).default(10),
        saleStartDate: joi_1.default.date().iso().allow(null),
        saleEndDate: joi_1.default.date().iso().allow(null),
    })),
}).custom((value, helpers) => {
    // Validate online fields if location type includes online
    if ((value.locationType === 'online' || value.locationType === 'hybrid') && !value.meetingLink && !value.streamUrl) {
        return helpers.message({ custom: 'Meeting link or stream URL is required for online/hybrid events' });
    }
    return value;
});
exports.updateEventSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(200),
    description: joi_1.default.string().max(5000).allow('', null),
    eventType: joi_1.default.string().valid(...eventTypes),
    recurrence: joi_1.default.string().valid(...recurrenceTypes),
    startDate: joi_1.default.date().iso(),
    endDate: joi_1.default.date().iso().allow(null),
    startTime: joi_1.default.string().pattern(timePattern),
    endTime: joi_1.default.string().pattern(timePattern).allow('', null),
    timezone: joi_1.default.string().max(50),
    locationType: joi_1.default.string().valid(...locationTypes),
    locationName: joi_1.default.string().max(255).allow('', null),
    locationAddress: joi_1.default.string().max(500).allow('', null),
    locationCity: joi_1.default.string().max(100).allow('', null),
    locationMapUrl: joi_1.default.string().uri().allow('', null),
    onlinePlatform: joi_1.default.string().valid(...onlinePlatforms).allow('', null),
    meetingLink: joi_1.default.string().uri().allow('', null),
    meetingId: joi_1.default.string().max(100).allow('', null),
    meetingPassword: joi_1.default.string().max(100).allow('', null),
    streamUrl: joi_1.default.string().uri().allow('', null),
    capacity: joi_1.default.number().integer().min(1).allow(null),
    isRegistrationRequired: joi_1.default.boolean(),
    registrationDeadline: joi_1.default.date().iso().allow(null),
    maxRegistrations: joi_1.default.number().integer().min(1).allow(null),
    isPaid: joi_1.default.boolean(),
    price: joi_1.default.number().min(0).allow(null),
    currency: joi_1.default.string().length(3),
    earlyBirdPrice: joi_1.default.number().min(0).allow(null),
    earlyBirdDeadline: joi_1.default.date().iso().allow(null),
    bannerUrl: joi_1.default.string().uri().allow('', null),
    thumbnailUrl: joi_1.default.string().uri().allow('', null),
    isActive: joi_1.default.boolean(),
    isPublic: joi_1.default.boolean(),
    isFeatured: joi_1.default.boolean(),
    allowSelfCheckin: joi_1.default.boolean(),
    allowGuestCheckin: joi_1.default.boolean(),
    requireApproval: joi_1.default.boolean(),
    sendReminders: joi_1.default.boolean(),
    reminderHours: joi_1.default.number().integer().min(1).max(168),
    groupId: joi_1.default.string().uuid().allow('', null),
    ministryId: joi_1.default.string().uuid().allow('', null),
    tags: joi_1.default.array().items(joi_1.default.string().max(50)).max(10),
});
exports.createEventInstanceSchema = joi_1.default.object({
    eventId: joi_1.default.string().uuid().required(),
    instanceDate: joi_1.default.date().iso().required(),
    startTime: joi_1.default.string().pattern(timePattern).allow('', null),
    endTime: joi_1.default.string().pattern(timePattern).allow('', null),
    locationName: joi_1.default.string().max(255).allow('', null),
    meetingLink: joi_1.default.string().uri().allow('', null),
    notes: joi_1.default.string().max(1000).allow('', null),
});
exports.updateEventInstanceSchema = joi_1.default.object({
    startTime: joi_1.default.string().pattern(timePattern),
    endTime: joi_1.default.string().pattern(timePattern).allow('', null),
    locationName: joi_1.default.string().max(255).allow('', null),
    meetingLink: joi_1.default.string().uri().allow('', null),
    notes: joi_1.default.string().max(1000).allow('', null),
    status: joi_1.default.string().valid('scheduled', 'ongoing', 'completed', 'cancelled'),
    cancelledReason: joi_1.default.string().max(500).allow('', null),
});
exports.createRegistrationSchema = joi_1.default.object({
    eventId: joi_1.default.string().uuid().required(),
    eventInstanceId: joi_1.default.string().uuid().allow('', null),
    memberId: joi_1.default.string().uuid().allow('', null),
    guestName: joi_1.default.string().max(200).allow('', null),
    guestEmail: joi_1.default.string().email().allow('', null),
    guestPhone: joi_1.default.string().max(50).allow('', null),
    ticketType: joi_1.default.string().max(50).default('general'),
    quantity: joi_1.default.number().integer().min(1).max(20).default(1),
    notes: joi_1.default.string().max(1000).allow('', null),
    specialRequirements: joi_1.default.string().max(1000).allow('', null),
}).custom((value, helpers) => {
    if (!value.memberId && !value.guestName) {
        return helpers.message({ custom: 'Either member ID or guest name is required' });
    }
    return value;
});
exports.shareEventSchema = joi_1.default.object({
    shareType: joi_1.default.string().valid('email', 'sms', 'whatsapp').required(),
    recipientIds: joi_1.default.array().items(joi_1.default.string().uuid()),
    recipientEmails: joi_1.default.array().items(joi_1.default.string().email()),
    recipientPhones: joi_1.default.array().items(joi_1.default.string()),
    includeAllMembers: joi_1.default.boolean().default(false),
    includeGroupMembers: joi_1.default.boolean().default(false),
    groupId: joi_1.default.string().uuid().allow('', null),
    customMessage: joi_1.default.string().max(1000).allow('', null),
    includeRegistrationLink: joi_1.default.boolean().default(true),
});
exports.checkInSchema = joi_1.default.object({
    qrCode: joi_1.default.string().allow('', null),
    registrationId: joi_1.default.string().uuid().allow('', null),
    eventInstanceId: joi_1.default.string().uuid().allow('', null),
    memberId: joi_1.default.string().uuid().allow('', null),
    guestName: joi_1.default.string().max(200).allow('', null),
    guestEmail: joi_1.default.string().email().allow('', null),
    guestPhone: joi_1.default.string().max(50).allow('', null),
});
exports.eventFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().max(100).allow(''),
    eventType: joi_1.default.string().valid(...eventTypes),
    locationType: joi_1.default.string().valid(...locationTypes),
    startDate: joi_1.default.date().iso(),
    endDate: joi_1.default.date().iso(),
    isActive: joi_1.default.boolean(),
    isPaid: joi_1.default.boolean(),
    isFeatured: joi_1.default.boolean(),
    groupId: joi_1.default.string().uuid(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
    sortBy: joi_1.default.string().valid('name', 'startDate', 'createdAt', 'totalAttendance'),
    sortOrder: joi_1.default.string().valid('asc', 'desc'),
});
//# sourceMappingURL=event.validator.js.map