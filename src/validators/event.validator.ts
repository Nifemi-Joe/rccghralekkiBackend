// src/validators/event.validator.ts
import Joi from 'joi';

const eventTypes = ['service', 'meeting', 'conference', 'outreach', 'fellowship', 'workshop', 'retreat', 'concert', 'other'];
const recurrenceTypes = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'];
const locationTypes = ['physical', 'online', 'hybrid'];
const onlinePlatforms = ['zoom', 'google_meet', 'microsoft_teams', 'youtube', 'facebook', 'other'];
const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createEventSchema = Joi.object({
    name: Joi.string().min(2).max(200).required().messages({
        'string.empty': 'Event name is required',
        'string.min': 'Event name must be at least 2 characters',
    }),

    description: Joi.string().max(5000).allow('', null),

    eventType: Joi.string().valid(...eventTypes).required().messages({
        'any.only': 'Invalid event type',
    }),

    recurrence: Joi.string().valid(...recurrenceTypes).default('none'),

    // Date and Time
    startDate: Joi.date().iso().required().messages({
        'date.format': 'Invalid start date format',
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).allow(null).messages({
        'date.min': 'End date must be after start date',
    }),
    startTime: Joi.string().pattern(timePattern).required().messages({
        'string.pattern.base': 'Invalid time format (HH:MM)',
    }),
    endTime: Joi.string().pattern(timePattern).allow('', null),
    timezone: Joi.string().max(50).default('Africa/Accra'),

    // Location
    locationType: Joi.string().valid(...locationTypes).default('physical'),
    locationName: Joi.string().max(255).allow('', null),
    locationAddress: Joi.string().max(500).allow('', null),
    locationCity: Joi.string().max(100).allow('', null),
    locationMapUrl: Joi.string().uri().allow('', null),

    // Online
    onlinePlatform: Joi.string().valid(...onlinePlatforms).allow('', null),
    meetingLink: Joi.string().uri().allow('', null),
    meetingId: Joi.string().max(100).allow('', null),
    meetingPassword: Joi.string().max(100).allow('', null),
    streamUrl: Joi.string().uri().allow('', null),

    // Capacity & Registration
    capacity: Joi.number().integer().min(1).max(100000).allow(null),
    isRegistrationRequired: Joi.boolean().default(false),
    registrationDeadline: Joi.date().iso().allow(null),
    maxRegistrations: Joi.number().integer().min(1).allow(null),

    // Payment
    isPaid: Joi.boolean().default(false),
    price: Joi.when('isPaid', {
        is: true,
        then: Joi.number().min(0).required(),
        otherwise: Joi.number().min(0).allow(null),
    }),
    currency: Joi.string().length(3).default('GHS'),
    earlyBirdPrice: Joi.number().min(0).allow(null),
    earlyBirdDeadline: Joi.date().iso().allow(null),

    // Visuals
    bannerUrl: Joi.string().uri().allow('', null),
    thumbnailUrl: Joi.string().uri().allow('', null),

    // Settings
    isActive: Joi.boolean().default(true),
    isPublic: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    allowSelfCheckin: Joi.boolean().default(true),
    allowGuestCheckin: Joi.boolean().default(true),
    requireApproval: Joi.boolean().default(false),
    sendReminders: Joi.boolean().default(true),
    reminderHours: Joi.number().integer().min(1).max(168).default(24),

    // Relations
    groupId: Joi.string().uuid().allow('', null),
    ministryId: Joi.string().uuid().allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(10),

    // Ticket Types
    ticketTypes: Joi.array().items(
        Joi.object({
            name: Joi.string().max(100).required(),
            description: Joi.string().max(500).allow('', null),
            price: Joi.number().min(0).required(),
            currency: Joi.string().length(3).default('GHS'),
            quantityAvailable: Joi.number().integer().min(1).allow(null),
            maxPerOrder: Joi.number().integer().min(1).max(100).default(10),
            saleStartDate: Joi.date().iso().allow(null),
            saleEndDate: Joi.date().iso().allow(null),
        })
    ),
}).custom((value, helpers) => {
    // Validate online fields if location type includes online
    if ((value.locationType === 'online' || value.locationType === 'hybrid') && !value.meetingLink && !value.streamUrl) {
        return helpers.message({ custom: 'Meeting link or stream URL is required for online/hybrid events' });
    }
    return value;
});

export const updateEventSchema = Joi.object({
    name: Joi.string().min(2).max(200),
    description: Joi.string().max(5000).allow('', null),
    eventType: Joi.string().valid(...eventTypes),
    recurrence: Joi.string().valid(...recurrenceTypes),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().allow(null),
    startTime: Joi.string().pattern(timePattern),
    endTime: Joi.string().pattern(timePattern).allow('', null),
    timezone: Joi.string().max(50),
    locationType: Joi.string().valid(...locationTypes),
    locationName: Joi.string().max(255).allow('', null),
    locationAddress: Joi.string().max(500).allow('', null),
    locationCity: Joi.string().max(100).allow('', null),
    locationMapUrl: Joi.string().uri().allow('', null),
    onlinePlatform: Joi.string().valid(...onlinePlatforms).allow('', null),
    meetingLink: Joi.string().uri().allow('', null),
    meetingId: Joi.string().max(100).allow('', null),
    meetingPassword: Joi.string().max(100).allow('', null),
    streamUrl: Joi.string().uri().allow('', null),
    capacity: Joi.number().integer().min(1).allow(null),
    isRegistrationRequired: Joi.boolean(),
    registrationDeadline: Joi.date().iso().allow(null),
    maxRegistrations: Joi.number().integer().min(1).allow(null),
    isPaid: Joi.boolean(),
    price: Joi.number().min(0).allow(null),
    currency: Joi.string().length(3),
    earlyBirdPrice: Joi.number().min(0).allow(null),
    earlyBirdDeadline: Joi.date().iso().allow(null),
    bannerUrl: Joi.string().uri().allow('', null),
    thumbnailUrl: Joi.string().uri().allow('', null),
    isActive: Joi.boolean(),
    isPublic: Joi.boolean(),
    isFeatured: Joi.boolean(),
    allowSelfCheckin: Joi.boolean(),
    allowGuestCheckin: Joi.boolean(),
    requireApproval: Joi.boolean(),
    sendReminders: Joi.boolean(),
    reminderHours: Joi.number().integer().min(1).max(168),
    groupId: Joi.string().uuid().allow('', null),
    ministryId: Joi.string().uuid().allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
});

export const createEventInstanceSchema = Joi.object({
    eventId: Joi.string().uuid().required(),
    instanceDate: Joi.date().iso().required(),
    startTime: Joi.string().pattern(timePattern).allow('', null),
    endTime: Joi.string().pattern(timePattern).allow('', null),
    locationName: Joi.string().max(255).allow('', null),
    meetingLink: Joi.string().uri().allow('', null),
    notes: Joi.string().max(1000).allow('', null),
});

export const updateEventInstanceSchema = Joi.object({
    startTime: Joi.string().pattern(timePattern),
    endTime: Joi.string().pattern(timePattern).allow('', null),
    locationName: Joi.string().max(255).allow('', null),
    meetingLink: Joi.string().uri().allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    status: Joi.string().valid('scheduled', 'ongoing', 'completed', 'cancelled'),
    cancelledReason: Joi.string().max(500).allow('', null),
});

export const createRegistrationSchema = Joi.object({
    eventId: Joi.string().uuid().required(),
    eventInstanceId: Joi.string().uuid().allow('', null),
    memberId: Joi.string().uuid().allow('', null),
    guestName: Joi.string().max(200).allow('', null),
    guestEmail: Joi.string().email().allow('', null),
    guestPhone: Joi.string().max(50).allow('', null),
    ticketType: Joi.string().max(50).default('general'),
    quantity: Joi.number().integer().min(1).max(20).default(1),
    notes: Joi.string().max(1000).allow('', null),
    specialRequirements: Joi.string().max(1000).allow('', null),
}).custom((value, helpers) => {
    if (!value.memberId && !value.guestName) {
        return helpers.message({ custom: 'Either member ID or guest name is required' });
    }
    return value;
});

export const shareEventSchema = Joi.object({
    shareType: Joi.string().valid('email', 'sms', 'whatsapp').required(),
    recipientIds: Joi.array().items(Joi.string().uuid()),
    recipientEmails: Joi.array().items(Joi.string().email()),
    recipientPhones: Joi.array().items(Joi.string()),
    includeAllMembers: Joi.boolean().default(false),
    includeGroupMembers: Joi.boolean().default(false),
    groupId: Joi.string().uuid().allow('', null),
    customMessage: Joi.string().max(1000).allow('', null),
    includeRegistrationLink: Joi.boolean().default(true),
});

export const checkInSchema = Joi.object({
    qrCode: Joi.string().allow('', null),
    registrationId: Joi.string().uuid().allow('', null),
    eventInstanceId: Joi.string().uuid().allow('', null),
    memberId: Joi.string().uuid().allow('', null),
    guestName: Joi.string().max(200).allow('', null),
    guestEmail: Joi.string().email().allow('', null),
    guestPhone: Joi.string().max(50).allow('', null),
});

export const eventFiltersSchema = Joi.object({
    search: Joi.string().max(100).allow(''),
    eventType: Joi.string().valid(...eventTypes),
    locationType: Joi.string().valid(...locationTypes),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    isActive: Joi.boolean(),
    isPaid: Joi.boolean(),
    isFeatured: Joi.boolean(),
    groupId: Joi.string().uuid(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('name', 'startDate', 'createdAt', 'totalAttendance'),
    sortOrder: Joi.string().valid('asc', 'desc'),
});