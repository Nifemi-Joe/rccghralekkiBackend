// src/controllers/NotificationController.ts

import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '@services/UserNotificationService';
import { NotificationFilters } from '@/dtos/notification.types';

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id

        const filters: NotificationFilters = {
            churchId,
            userId,
            type: req.query.type as any,
            isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
            entityType: req.query.entityType as string,
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
        };

        const result = await this.notificationService.getNotifications(filters);

        res.json({
            status: 'success',
            data: result,
        });
    });

    getNotificationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
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

    markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
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

    markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id

        const count = await this.notificationService.markAllAsRead(churchId, userId);

        res.json({
            status: 'success',
            message: `Marked ${count} notifications as read`,
            data: { count },
        });
    });

    deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
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

    getUnreadCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id

        const count = await this.notificationService.getUnreadCount(churchId, userId);

        res.json({
            status: 'success',
            data: { count },
        });
    });

    getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id; // Changed from userId to id

        const stats = await this.notificationService.getStats(churchId, userId);

        res.json({
            status: 'success',
            data: stats,
        });
    });
}