// src/routes/registrationRoutes.ts
import { Router } from 'express';
import { ManualRegistrationController } from '@controllers/ManualRegistrationController';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import Joi from 'joi';

const router = Router();
const controller = new ManualRegistrationController();

// Validation schemas
const searchSchema = Joi.object({
    search: Joi.string().min(2).max(100),
    includeMembers: Joi.string().valid('true', 'false'),
    includeFirstTimers: Joi.string().valid('true', 'false'),
    limit: Joi.number().min(1).max(50)
});

const manualRegistrationSchema = Joi.object({
    eventId: Joi.string().uuid().required(),
    eventInstanceId: Joi.string().uuid().allow(null, ''),
    registrantType: Joi.string()
        .valid('existing_member', 'new_member', 'first_timer', 'guest')
        .required(),
    memberId: Joi.string().uuid().when('registrantType', {
        is: 'existing_member',
        then: Joi.required(),
        otherwise: Joi.allow(null, '')
    }),
    firstName: Joi.string().max(50).when('registrantType', {
        is: Joi.valid('new_member', 'first_timer', 'guest'),
        then: Joi.required()
    }),
    lastName: Joi.string().max(50).when('registrantType', {
        is: Joi.valid('new_member', 'first_timer', 'guest'),
        then: Joi.required()
    }),
    email: Joi.string().email().max(255).allow(null, ''),
    phone: Joi.string().max(20).allow(null, ''),
    sendNotification: Joi.boolean().default(false),
    notificationChannels: Joi.array().items(
        Joi.string().valid('email', 'sms', 'whatsapp')
    ),
    notes: Joi.string().max(500).allow(null, '')
});

const quickCheckInSchema = Joi.object({
    eventId: Joi.string().uuid().required(),
    eventInstanceId: Joi.string().uuid().allow(null, ''),
    registrationId: Joi.string().uuid(), // For pre-registered attendees
    memberId: Joi.string().uuid(), // For members checking in
    // For walk-ins (new people)
    walkIn: Joi.object({
        type: Joi.string().valid('first_timer', 'guest').required(),
        firstName: Joi.string().max(50).required(),
        lastName: Joi.string().max(50).required(),
        email: Joi.string().email().max(255).allow(null, ''),
        phone: Joi.string().max(20).allow(null, ''),
        gender: Joi.string().valid('male', 'female').allow(null, ''),
        isFirstTimer: Joi.boolean().default(false)
    })
}).xor('registrationId', 'memberId', 'walkIn'); // Only one of these should be provided

// All routes require authentication
router.use(authenticate);

// ============================================================================
// SEARCH & LOOKUP
// ============================================================================

router.get(
    '/search',
    authorize(['admin', 'pastor']),
    controller.searchRegistrants
);

router.get(
    '/registrant/:id',
    authorize(['admin', 'pastor']),
    controller.getRegistrantDetails
);

// ============================================================================
// EVENT OPTIONS & ATTENDEES
// ============================================================================

router.get(
    '/event/:eventId/options',
    authorize(['admin', 'pastor']),
    controller.getEventRegistrationOptions
);

router.get(
    '/event/:eventId/stats',
    authorize(['admin', 'staff']),
    controller.getEventRegistrationStats
);

/**
 * Get event attendees for quick check-in
 * Returns: registered attendees + all members
 */
router.get(
    '/event/:eventId/attendees',
    authorize(['admin', 'pastor', 'staff']),
    controller.getEventAttendees
);

/**
 * Get all members for quick search during check-in
 */
router.get(
    '/members/all',
    authorize(['admin', 'pastor', 'staff']),
    controller.getAllMembers
);

// ============================================================================
// REGISTRATION
// ============================================================================

router.post(
    '/',
    authorize(['admin', 'staff']),
    validateRequest(manualRegistrationSchema),
    controller.registerForEvent
);

// ============================================================================
// QUICK CHECK-IN
// ============================================================================

/**
 * Quick check-in - handles:
 * 1. Checking in pre-registered attendees (registrationId)
 * 2. Checking in members who didn't register (memberId)
 * 3. Adding and checking in walk-ins (walkIn)
 */
router.post(
    '/quick-checkin',
    authorize(['admin', 'pastor', 'staff']),
    validateRequest(quickCheckInSchema),
    controller.quickCheckIn
);

/**
 * Undo check-in
 */
router.post(
    '/undo-checkin/:registrationId',
    authorize(['admin', 'pastor', 'staff']),
    controller.undoCheckIn
);

/**
 * Get recent check-ins for an event
 */
router.get(
    '/event/:eventId/recent-checkins',
    authorize(['admin', 'pastor', 'staff']),
    controller.getRecentCheckIns
);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

router.post(
    '/:registrationId/resend-notification',
    authorize(['admin', 'staff']),
    controller.resendProfileNotification
);

export default router;