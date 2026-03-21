"use strict";
// src/routes/notificationRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserNotificationController_1 = require("@controllers/UserNotificationController");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const controller = new UserNotificationController_1.NotificationController();
router.use(authenticate_1.authenticate);
router.get('/', controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getNotificationById);
router.patch('/:id/read', controller.markAsRead);
router.patch('/mark-all-read', controller.markAllAsRead);
router.delete('/:id', controller.deleteNotification);
exports.default = router;
//# sourceMappingURL=notificationRoutes.js.map