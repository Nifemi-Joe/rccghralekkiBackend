import { Notification, CreateNotificationDTO, NotificationFilters, PaginatedNotifications, NotificationStats } from '@/dtos/notification.types';
export declare class NotificationRepository {
    create(data: CreateNotificationDTO): Promise<Notification>;
    createBulk(notifications: CreateNotificationDTO[]): Promise<Notification[]>;
    findById(id: string, churchId: string): Promise<Notification | null>;
    findAll(filters: NotificationFilters): Promise<PaginatedNotifications>;
    markAsRead(id: string, churchId: string): Promise<Notification | null>;
    markAllAsRead(churchId: string, userId?: string): Promise<number>;
    delete(id: string, churchId: string): Promise<boolean>;
    deleteOld(churchId: string, daysOld?: number): Promise<number>;
    getStats(churchId: string, userId?: string): Promise<NotificationStats>;
    getUnreadCount(churchId: string, userId?: string): Promise<number>;
}
//# sourceMappingURL=NotificationRepository.d.ts.map