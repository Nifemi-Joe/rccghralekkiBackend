"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/registrationRoutes.ts
const express_1 = require("express");
const ManualRegistrationController_1 = require("@controllers/ManualRegistrationController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const controller = new ManualRegistrationController_1.ManualRegistrationController();
// Validation schemas
const searchSchema = joi_1.default.object({
    search: joi_1.default.string().min(2).max(100),
    includeMembers: joi_1.default.string().valid('true', 'false'),
    includeFirstTimers: joi_1.default.string().valid('true', 'false'),
    limit: joi_1.default.number().min(1).max(50)
});
const manualRegistrationSchema = joi_1.default.object({
    eventId: joi_1.default.string().uuid().required(),
    eventInstanceId: joi_1.default.string().uuid().allow(null, ''),
    registrantType: joi_1.default.string()
        .valid('existing_member', 'new_member', 'first_timer', 'guest')
        .required(),
    memberId: joi_1.default.string().uuid().when('registrantType', {
        is: 'existing_member',
        then: joi_1.default.required(),
        otherwise: joi_1.default.allow(null, '')
    }),
    firstName: joi_1.default.string().max(50).when('registrantType', {
        is: joi_1.default.valid('new_member', 'first_timer', 'guest'),
        then: joi_1.default.required()
    }),
    lastName: joi_1.default.string().max(50).when('registrantType', {
        is: joi_1.default.valid('new_member', 'first_timer', 'guest'),
        then: joi_1.default.required()
    }),
    email: joi_1.default.string().email().max(255).allow(null, ''),
    phone: joi_1.default.string().max(20).allow(null, ''),
    sendNotification: joi_1.default.boolean().default(false),
    notificationChannels: joi_1.default.array().items(joi_1.default.string().valid('email', 'sms', 'whatsapp')),
    notes: joi_1.default.string().max(500).allow(null, '')
});
const quickCheckInSchema = joi_1.default.object({
    eventId: joi_1.default.string().uuid().required(),
    eventInstanceId: joi_1.default.string().uuid().allow(null, ''),
    registrationId: joi_1.default.string().uuid(), // For pre-registered attendees
    memberId: joi_1.default.string().uuid(), // For members checking in
    // For walk-ins (new people)
    walkIn: joi_1.default.object({
        type: joi_1.default.string().valid('first_timer', 'guest').required(),
        firstName: joi_1.default.string().max(50).required(),
        lastName: joi_1.default.string().max(50).required(),
        email: joi_1.default.string().email().max(255).allow(null, ''),
        phone: joi_1.default.string().max(20).allow(null, ''),
        gender: joi_1.default.string().valid('male', 'female').allow(null, ''),
        isFirstTimer: joi_1.default.boolean().default(false)
    })
}).xor('registrationId', 'memberId', 'walkIn'); // Only one of these should be provided
// All routes require authentication
router.use(authenticate_1.authenticate);
// ============================================================================
// SEARCH & LOOKUP
// ============================================================================
router.get('/search', (0, authenticate_1.authorize)(['admin', 'pastor']), controller.searchRegistrants);
router.get('/registrant/:id', (0, authenticate_1.authorize)(['admin', 'pastor']), controller.getRegistrantDetails);
// ============================================================================
// EVENT OPTIONS & ATTENDEES
// ============================================================================
router.get('/event/:eventId/options', (0, authenticate_1.authorize)(['admin', 'pastor']), controller.getEventRegistrationOptions);
router.get('/event/:eventId/stats', (0, authenticate_1.authorize)(['admin', 'staff']), controller.getEventRegistrationStats);
/**
 * Get event attendees for quick check-in
 * Returns: registered attendees + all members
 */
router.get('/event/:eventId/attendees', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), controller.getEventAttendees);
/**
 * Get all members for quick search during check-in
 */
router.get('/members/all', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), controller.getAllMembers);
// ============================================================================
// REGISTRATION
// ============================================================================
router.post('/', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(manualRegistrationSchema), controller.registerForEvent);
// ============================================================================
// QUICK CHECK-IN
// ============================================================================
/**
 * Quick check-in - handles:
 * 1. Checking in pre-registered attendees (registrationId)
 * 2. Checking in members who didn't register (memberId)
 * 3. Adding and checking in walk-ins (walkIn)
 */
router.post('/quick-checkin', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(quickCheckInSchema), controller.quickCheckIn);
/**
 * Undo check-in
 */
router.post('/undo-checkin/:registrationId', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), controller.undoCheckIn);
/**
 * Get recent check-ins for an event
 */
router.get('/event/:eventId/recent-checkins', (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), controller.getRecentCheckIns);
// ============================================================================
// NOTIFICATIONS
// ============================================================================
router.post('/:registrationId/resend-notification', (0, authenticate_1.authorize)(['admin', 'staff']), controller.resendProfileNotification);
exports.default = router;
//# sourceMappingURL=registrationRoutes.js.map