import { Notification, CreateNotificationDTO, NotificationFilters, PaginatedNotifications } from '@/dtos/notification.types';
export declare class NotificationService {
    private notificationRepository;
    private auditLogService;
    constructor();
    createNotification(data: CreateNotificationDTO): Promise<Notification>;
    createBulkNotifications(notifications: CreateNotificationDTO[]): Promise<Notification[]>;
    getNotifications(filters: NotificationFilters): Promise<PaginatedNotifications>;
    getNotificationById(id: string, churchId: string): Promise<Notification | null>;
    markAsRead(id: string, churchId: string): Promise<Notification | null>;
    markAllAsRead(churchId: string, userId?: string): Promise<number>;
    deleteNotification(id: string, churchId: string): Promise<boolean>;
    getUnreadCount(churchId: string, userId?: string): Promise<number>;
    getStats(churchId: string, userId?: string): Promise<import("@/dtos/notification.types").NotificationStats>;
    notifyMemberAdded(churchId: string, actorId: string, actorName: string, member: {
        id: string;
        firstName: string;
        lastName: string;
    }, method?: 'manual' | 'import'): Promise<void>;
    notifyMembersImported(churchId: string, actorId: string, actorName: string, count: number): Promise<void>;
    notifyFirstTimerAdded(churchId: string, actorId: string, actorName: string, firstTimer: {
        id: string;
        firstName: string;
        lastName: string;
    }): Promise<void>;
    notifyFirstTimerConverted(churchId: string, actorId: string, actorName: string, firstTimer: {
        id: string;
        firstName: string;
        lastName: string;
    }, memberId: string): Promise<void>;
    notifyOfferingRecorded(churchId: string, actorId: string, actorName: string, offering: {
        id: string;
        type: string;
        amount: number;
        eventName?: string;
    }): Promise<void>;
    notifyExpenseRecorded(churchId: string, actorId: string, actorName: string, expense: {
        id: string;
        category: string;
        amount: number;
        description?: string;
    }): Promise<void>;
    notifyEventCreated(churchId: string, actorId: string, actorName: string, event: {
        id: string;
        name: string;
        startDate: string;
    }): Promise<void>;
    notifyCheckin(churchId: string, actorId: string, actorName: string, checkin: {
        eventId: string;
        eventName: string;
        memberName: string;
        checkInTime: string;
    }): Promise<void>;
    notifyStaffAdded(churchId: string, actorId: string, actorName: string, staff: {
        id: string;
        name: string;
        email: string;
        role: string;
    }): Promise<void>;
}
//# sourceMappingURL=UserNotificationService.d.ts.map