export type NotificationType = 'member_added' | 'member_imported' | 'members_bulk_imported' | 'member_profile_updated' | 'first_timer_added' | 'first_timer_converted' | 'offering_recorded' | 'expense_recorded' | 'payment_received' | 'payment_failed' | 'event_created' | 'event_updated' | 'event_cancelled' | 'event_checkin' | 'attendance_recorded' | 'staff_added' | 'staff_removed' | 'staff_role_changed' | 'password_changed' | 'profile_updated' | 'login_from_new_device' | 'family_created' | 'family_member_added' | 'follow_up_assigned' | 'follow_up_reassigned' | 'follow_up_completed' | 'follow_up_overdue' | 'follow_up_due_soon' | 'follow_up_response_received' | 'follow_up_message_sent' | 'follow_up_message_delivered' | 'follow_up_message_failed' | 'follow_up_reminder' | 'follow_up_member_added' | 'follow_up_member_removed' | 'follow_up_activity_logged' | 'sms_sent' | 'sms_delivered' | 'sms_failed' | 'email_sent' | 'email_delivered' | 'email_failed' | 'whatsapp_sent' | 'whatsapp_delivered' | 'whatsapp_failed' | 'system_alert' | 'system_maintenance' | 'system_update' | 'reminder' | 'announcement' | 'credits_purchased' | 'credits_low' | 'credits_depleted' | 'follow_up_assignment' | 'follow_up_deadline' | 'follow_up_response' | 'new_first_timer_for_followup';
export interface Notification {
    id: string;
    church_id: string;
    user_id?: string;
    type: NotificationType;
    title: string;
    message: string;
    action_type?: string;
    action_url?: string;
    entity_type?: string;
    entity_id?: string;
    data: Record<string, any>;
    is_read: boolean;
    read_at?: Date;
    actor_id?: string;
    actor_name?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
}
export interface CreateNotificationDTO {
    churchId: string;
    userId?: string;
    type: NotificationType;
    title: string;
    message: string;
    actionType?: string;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    data?: Record<string, any>;
    actorId?: string;
    actorName?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    expiresAt?: Date;
}
export interface BulkCreateNotificationDTO {
    churchId: string;
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    actionType?: string;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    data?: Record<string, any>;
    actorId?: string;
    actorName?: string;
}
export interface NotificationFilters {
    churchId: string;
    userId?: string;
    type?: NotificationType | NotificationType[];
    isRead?: boolean;
    entityType?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedNotifications {
    notifications: Notification[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    unreadCount: number;
}
export interface NotificationStats {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    recentCount: number;
}
export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    disabledTypes: NotificationType[];
}
export type NotificationActionType = 'navigate' | 'open_modal' | 'external_link' | 'dismiss' | 'call_api';
export declare function getNotificationIcon(type: NotificationType): string;
export declare function getNotificationColor(type: NotificationType): string;
//# sourceMappingURL=notification.types.d.ts.map