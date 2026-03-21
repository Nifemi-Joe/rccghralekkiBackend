"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/event.routes.ts
const express_1 = require("express");
const EventController_1 = require("@controllers/EventController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const event_validator_1 = require("@validators/event.validator");
const router = (0, express_1.Router)();
const eventController = new EventController_1.EventController();
// ============================================================================
// PUBLIC ROUTES (no auth required)
// ============================================================================
// Public check-in via QR code
router.post('/checkin/:qrCode', (0, validateRequest_1.validateRequest)(event_validator_1.checkInSchema), eventController.publicCheckIn);
// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================
router.use(authenticate_1.authenticate);
// Statistics
router.get('/statistics', eventController.getStatistics);
// Events CRUD
router.post('/', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(event_validator_1.createEventSchema), eventController.create);
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.put('/:id', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(event_validator_1.updateEventSchema), eventController.update);
router.delete('/:id', (0, authenticate_1.authorize)(['admin']), eventController.delete);
// Event actions
router.get('/:id/qr-code', eventController.getQRCode);
router.post('/:id/start', (0, authenticate_1.authorize)(['admin', 'staff']), eventController.startEvent);
router.post('/:id/share', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(event_validator_1.shareEventSchema), eventController.share);
// Event Instances
router.post('/instances', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(event_validator_1.createEventInstanceSchema), eventController.createInstance);
router.get('/:id/instances', eventController.getInstances);
router.get('/instances/:instanceId', eventController.getInstance);
router.put('/instances/:instanceId', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(event_validator_1.updateEventInstanceSchema), eventController.updateInstance);
router.get('/instances/:instanceId/qr-code', eventController.getInstanceQRCode);
// Registrations
router.post('/registrations', (0, validateRequest_1.validateRequest)(event_validator_1.createRegistrationSchema), eventController.register);
router.get('/:id/registrations', (0, authenticate_1.authorize)(['admin', 'staff']), eventController.getRegistrations);
router.delete('/registrations/:registrationId', eventController.cancelRegistration);
router.post('/registrations/:registrationId/payment', (0, authenticate_1.authorize)(['admin', 'staff']), eventController.processPayment);
// Ticket Types
router.get('/:id/ticket-types', eventController.getTicketTypes);
// Check-in (authenticated)
router.post('/check-in', (0, authenticate_1.authorize)(['admin', 'staff']), (0, validateRequest_1.validateRequest)(event_validator_1.checkInSchema), eventController.checkIn);
exports.default = router;
//# sourceMappingURL=event.routes.js.map