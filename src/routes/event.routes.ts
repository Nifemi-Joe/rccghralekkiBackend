// src/routes/event.routes.ts
import { Router } from 'express';
import { EventController } from '@controllers/EventController';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import {
    createEventSchema,
    updateEventSchema,
    createEventInstanceSchema,
    updateEventInstanceSchema,
    createRegistrationSchema,
    shareEventSchema,
    checkInSchema,
} from '@validators/event.validator';

const router = Router();
const eventController = new EventController();

// ============================================================================
// PUBLIC ROUTES (no auth required)
// ============================================================================

// Public check-in via QR code
router.post('/checkin/:qrCode', validateRequest(checkInSchema), eventController.publicCheckIn);

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================
router.use(authenticate);

// Statistics
router.get('/statistics', eventController.getStatistics);

// Events CRUD
router.post('/', authorize(['admin', 'staff']), validateRequest(createEventSchema), eventController.create);
router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.put('/:id', authorize(['admin', 'staff']), validateRequest(updateEventSchema), eventController.update);
router.delete('/:id', authorize(['admin']), eventController.delete);

// Event actions
router.get('/:id/qr-code', eventController.getQRCode);
router.post('/:id/start', authorize(['admin', 'staff']), eventController.startEvent);
router.post('/:id/share', authorize(['admin', 'staff']), validateRequest(shareEventSchema), eventController.share);

// Event Instances
router.post('/instances', authorize(['admin', 'staff']), validateRequest(createEventInstanceSchema), eventController.createInstance);
router.get('/:id/instances', eventController.getInstances);
router.get('/instances/:instanceId', eventController.getInstance);
router.put('/instances/:instanceId', authorize(['admin', 'staff']), validateRequest(updateEventInstanceSchema), eventController.updateInstance);
router.get('/instances/:instanceId/qr-code', eventController.getInstanceQRCode);

// Registrations
router.post('/registrations', validateRequest(createRegistrationSchema), eventController.register);
router.get('/:id/registrations', authorize(['admin', 'staff']), eventController.getRegistrations);
router.delete('/registrations/:registrationId', eventController.cancelRegistration);
router.post('/registrations/:registrationId/payment', authorize(['admin', 'staff']), eventController.processPayment);

// Ticket Types
router.get('/:id/ticket-types', eventController.getTicketTypes);

// Check-in (authenticated)
router.post('/check-in', authorize(['admin', 'staff']), validateRequest(checkInSchema), eventController.checkIn);

export default router;