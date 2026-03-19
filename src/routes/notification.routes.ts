import { Router } from 'express';
import { notificationController } from '@controllers/NotificationController';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import {
  subscribeSchema,
  unsubscribeSchema,
  sendToMemberSchema,
  sendToChurchSchema,
  eventReminderSchema,
  proximityAlertSchema,
  sendEmailSchema,
  bulkEmailSchema,
  templateEmailSchema,
} from '@validators/notification.validator';

const router = Router();

// Public endpoint to get VAPID key for push subscription
router.get('/push/vapid-key', notificationController.getVapidKey);

// Push notification subscription (requires authentication)
router.post(
  '/push/subscribe',
  authenticate,
  validateRequest(subscribeSchema),
  notificationController.subscribe
);

router.post(
  '/push/unsubscribe',
  authenticate,
  validateRequest(unsubscribeSchema),
  notificationController.unsubscribe
);

// Send push notifications (admin/pastor only)
router.post(
  '/push/member/:memberId',
  authenticate,
  authorize(['admin', 'pastor']),
  validateRequest(sendToMemberSchema),
  notificationController.sendToMember
);

router.post(
  '/push/church',
  authenticate,
  authorize(['admin', 'pastor']),
  validateRequest(sendToChurchSchema),
  notificationController.sendToChurch
);

router.post(
  '/push/event-reminder',
  authenticate,
  authorize(['admin', 'pastor', 'staff']),
  validateRequest(eventReminderSchema),
  notificationController.sendEventReminder
);

router.post(
  '/push/proximity-alert',
  authenticate,
  authorize(['admin', 'pastor']),
  validateRequest(proximityAlertSchema),
  notificationController.sendProximityAlert
);

// Email endpoints (admin/pastor/staff only)
router.post(
  '/email/send',
  authenticate,
  authorize(['admin', 'pastor', 'staff']),
  validateRequest(sendEmailSchema),
  notificationController.sendEmail
);

router.post(
  '/email/bulk',
  authenticate,
  authorize(['admin', 'pastor']),
  validateRequest(bulkEmailSchema),
  notificationController.sendBulkEmail
);

router.post(
  '/email/template',
  authenticate,
  authorize(['admin', 'pastor', 'staff']),
  validateRequest(templateEmailSchema),
  notificationController.sendTemplateEmail
);

router.get(
  '/email/verify',
  authenticate,
  authorize(['admin']),
  notificationController.verifyEmailConnection
);

export default router;
