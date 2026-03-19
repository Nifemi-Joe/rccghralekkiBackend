// src/routes/notificationRoutes.ts

import { Router } from 'express';
import { NotificationController } from '@controllers/UserNotificationController';
import { authenticate } from '@middleware/authenticate';

const router = Router();
const controller = new NotificationController();

router.use(authenticate);

router.get('/', controller.getNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.get('/stats', controller.getStats);
router.get('/:id', controller.getNotificationById);
router.patch('/:id/read', controller.markAsRead);
router.patch('/mark-all-read', controller.markAllAsRead);
router.delete('/:id', controller.deleteNotification);

export default router;