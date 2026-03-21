"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const NotificationController_1 = require("@controllers/NotificationController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const notification_validator_1 = require("@validators/notification.validator");
const router = (0, express_1.Router)();
// Public endpoint to get VAPID key for push subscription
router.get('/push/vapid-key', NotificationController_1.notificationController.getVapidKey);
// Push notification subscription (requires authentication)
router.post('/push/subscribe', authenticate_1.authenticate, (0, validateRequest_1.validateRequest)(notification_validator_1.subscribeSchema), NotificationController_1.notificationController.subscribe);
router.post('/push/unsubscribe', authenticate_1.authenticate, (0, validateRequest_1.validateRequest)(notification_validator_1.unsubscribeSchema), NotificationController_1.notificationController.unsubscribe);
// Send push notifications (admin/pastor only)
router.post('/push/member/:memberId', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(notification_validator_1.sendToMemberSchema), NotificationController_1.notificationController.sendToMember);
router.post('/push/church', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(notification_validator_1.sendToChurchSchema), NotificationController_1.notificationController.sendToChurch);
router.post('/push/event-reminder', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(notification_validator_1.eventReminderSchema), NotificationController_1.notificationController.sendEventReminder);
router.post('/push/proximity-alert', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(notification_validator_1.proximityAlertSchema), NotificationController_1.notificationController.sendProximityAlert);
// Email endpoints (admin/pastor/staff only)
router.post('/email/send', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(notification_validator_1.sendEmailSchema), NotificationController_1.notificationController.sendEmail);
router.post('/email/bulk', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor']), (0, validateRequest_1.validateRequest)(notification_validator_1.bulkEmailSchema), NotificationController_1.notificationController.sendBulkEmail);
router.post('/email/template', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin', 'pastor', 'staff']), (0, validateRequest_1.validateRequest)(notification_validator_1.templateEmailSchema), NotificationController_1.notificationController.sendTemplateEmail);
router.get('/email/verify', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), NotificationController_1.notificationController.verifyEmailConnection);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map