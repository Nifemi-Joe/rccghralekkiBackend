import { Request, Response, NextFunction } from 'express';
export declare class NotificationController {
    private notificationService;
    constructor();
    getNotifications: (req: Request, res: Response, next: NextFunction) => void;
    getNotificationById: (req: Request, res: Response, next: NextFunction) => void;
    markAsRead: (req: Request, res: Response, next: NextFunction) => void;
    markAllAsRead: (req: Request, res: Response, next: NextFunction) => void;
    deleteNotification: (req: Request, res: Response, next: NextFunction) => void;
    getUnreadCount: (req: Request, res: Response, next: NextFunction) => void;
    getStats: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=UserNotificationController.d.ts.map