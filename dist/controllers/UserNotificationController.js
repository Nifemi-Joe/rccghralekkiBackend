"use strict";
// src/controllers/NotificationController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const UserNotificationService_1 = require("@services/UserNotificationService");
// Async handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
class NotificationController {
    constructor() {
        this.getNotifications = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const filters = {
                churchId,
                userId,
                type: req.query.type,
                isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
                entityType: req.query.entityType,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
            };
            const result = await this.notificationService.getNotifications(filters);
            res.json({
                status: 'success',
                data: result,
            });
        });
        this.getNotificationById = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const notification = await this.notificationService.getNotificationById(id, churchId);
            if (!notification) {
                res.status(404).json({
                    status: 'error',
                    message: 'Notification not found',
                });
                return;
            }
            res.json({
                status: 'success',
                data: notification,
            });
        });
        this.markAsRead = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const notification = await this.notificationService.markAsRead(id, churchId);
            if (!notification) {
                res.status(404).json({
                    status: 'error',
                    message: 'Notification not found',
                });
                return;
            }
            res.json({
                status: 'success',
                data: notification,
            });
        });
        this.markAllAsRead = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const count = await this.notificationService.markAllAsRead(churchId, userId);
            res.json({
                status: 'success',
                message: `Marked ${count} notifications as read`,
                data: { count },
            });
        });
        this.deleteNotification = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const deleted = await this.notificationService.deleteNotification(id, churchId);
            if (!deleted) {
                res.status(404).json({
                    status: 'error',
                    message: 'Notification not found',
                });
                return;
            }
            res.json({
                status: 'success',
                message: 'Notification deleted',
            });
        });
        this.getUnreadCount = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const count = await this.notificationService.getUnreadCount(churchId, userId);
            res.json({
                status: 'success',
                data: { count },
            });
        });
        this.getStats = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id; // Changed from userId to id
            const stats = await this.notificationService.getStats(churchId, userId);
            res.json({
                status: 'success',
                data: stats,
            });
        });
        this.notificationService = new UserNotificationService_1.NotificationService();
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=UserNotificationController.js.map