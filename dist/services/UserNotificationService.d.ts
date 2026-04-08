import { Notification, CreateNotificationDTO, NotificationFilters, PaginatedNotifications, NotificationType } from '@/dtos/notification.types';
import { FollowUpAssignment, FollowUpMember } from '@/dtos/followup.types';
/**
 * Looser data bag used internally when building notifications for church
 * admins.  The `type` field is typed as `NotificationType` so it is
 * compatible with `CreateNotificationDTO`.
 */
export interface NotificationData {
    churchId: string;
    /** Must be one of the valid NotificationType values */
    type: NotificationType;
    title: string;
    message: string;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    actorName?: string;
    metadata?: Record<string, any>;
}
export interface EmailOptions {
    to: string;
    subject: string;
    template?: string;
    text?: string;
    html?: string;
    data?: Record<string, any>;
}
export interface SendNotificationOptions {
    userId?: string;
    email?: string;
    phone?: string;
    channels: ('email' | 'sms' | 'in_app')[];
    data: NotificationData;
    templateData?: Record<string, any>;
}
export interface NotificationResult {
    sent: string[];
    failed: string[];
    errors: Record<string, string>;
}
export declare class NotificationService {
    private notificationRepository;
    private followUpRepository;
    private auditLogService;
    private emailTransporter;
    private isEmailConfigured;
    constructor();
    private initializeEmailTransporter;
    createNotification(data: CreateNotificationDTO): Promise<Notification>;
    createBulkNotifications(notifications: CreateNotificationDTO[]): Promise<Notification[]>;
    getNotifications(filters: NotificationFilters): Promise<PaginatedNotifications>;
    getNotificationById(id: string, churchId: string): Promise<Notification | null>;
    markAsRead(id: string, churchId: string): Promise<Notification | null>;
    markAllAsRead(churchId: string, userId?: string): Promise<number>;
    deleteNotification(id: string, churchId: string): Promise<boolean>;
    getUnreadCount(churchId: string, userId?: string): Promise<number>;
    getStats(churchId: string, userId?: string): Promise<import("@/dtos/notification.types").NotificationStats>;
    sendEmail(options: EmailOptions): Promise<boolean>;
    private generateEmailHtml;
    notifyFollowUpAssignment(churchId: string, assignment: FollowUpAssignment, assignedMembers: FollowUpMember[], actorId: string, actorName: string): Promise<void>;
    notifyFollowUpDeadline(churchId: string, assignment: FollowUpAssignment, daysUntilDue: number): Promise<void>;
    notifyFollowUpCompleted(churchId: string, assignment: FollowUpAssignment, completedBy: {
        id: string;
        name: string;
    }): Promise<void>;
    notifyFollowUpResponse(churchId: string, assignment: FollowUpAssignment, response: string, channel: string): Promise<void>;
    notifyNewFirstTimer(churchId: string, firstTimer: {
        id: string;
        firstName: string;
        lastName: string;
    }, actorId: string, actorName: string): Promise<void>;
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
    /**
     * Send a notification to every admin / super_admin of a church.
     *
     * The `data` parameter uses `NotificationData` whose `type` field is
     * already typed as `NotificationType`, so spreading it into
     * `CreateNotificationDTO` is fully type-safe.
     */
    notifyChurchAdmins(data: NotificationData): Promise<void>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=UserNotificationService.d.ts.map