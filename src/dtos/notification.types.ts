// src/dtos/notification.types.ts

export type NotificationType =
// Member notifications
    | 'member_added'
    | 'member_imported'
    | 'members_bulk_imported'
    | 'member_profile_updated'

    // First timer notifications
    | 'first_timer_added'
    | 'first_timer_converted'

    // Financial notifications
    | 'offering_recorded'
    | 'expense_recorded'
    | 'payment_received'
    | 'payment_failed'

    // Event notifications
    | 'event_created'
    | 'event_updated'
    | 'event_cancelled'
    | 'event_checkin'
    | 'attendance_recorded'

    // Staff notifications
    | 'staff_added'
    | 'staff_removed'
    | 'staff_role_changed'

    // Account notifications
    | 'password_changed'
    | 'profile_updated'
    | 'login_from_new_device'

    // Family notifications
    | 'family_created'
    | 'family_member_added'

    // Follow-up notifications
    | 'follow_up_assigned'
    | 'follow_up_reassigned'
    | 'follow_up_completed'
    | 'follow_up_overdue'
    | 'follow_up_due_soon'
    | 'follow_up_response_received'
    | 'follow_up_message_sent'
    | 'follow_up_message_delivered'
    | 'follow_up_message_failed'
    | 'follow_up_reminder'
    | 'follow_up_member_added'
    | 'follow_up_member_removed'
    | 'follow_up_activity_logged'

    // Communication notifications
    | 'sms_sent'
    | 'sms_delivered'
    | 'sms_failed'
    | 'email_sent'
    | 'email_delivered'
    | 'email_failed'
    | 'whatsapp_sent'
    | 'whatsapp_delivered'
    | 'whatsapp_failed'

    // System notifications
    | 'system_alert'
    | 'system_maintenance'
    | 'system_update'
    | 'reminder'
    | 'announcement'

    // Wallet/Credits notifications
    | 'credits_purchased'
    | 'credits_low'
    | 'credits_depleted'
    | 'follow_up_assignment'
    | 'follow_up_deadline'
    | 'follow_up_response'
    | 'new_first_timer_for_followup'

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
    recentCount: number; // Last 24 hours
}

export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string; // HH:MM format
    quietHoursEnd?: string;
    disabledTypes: NotificationType[];
}

// Notification action types for frontend handling
export type NotificationActionType =
    | 'navigate'
    | 'open_modal'
    | 'external_link'
    | 'dismiss'
    | 'call_api';


// Helper function to get notification icon based on type
export function getNotificationIcon(type: NotificationType): string {
    const iconMap: Record<string, string> = {
        // Members
        member_added: 'user-plus',
        member_imported: 'upload',
        members_bulk_imported: 'users',

        // First timers
        first_timer_added: 'user-plus',
        first_timer_converted: 'user-check',

        // Financial
        offering_recorded: 'dollar-sign',
        expense_recorded: 'receipt',
        payment_received: 'credit-card',

        // Events
        event_created: 'calendar-plus',
        event_checkin: 'check-circle',
        attendance_recorded: 'clipboard-check',

        // Follow-up
        follow_up_assigned: 'user-plus',
        follow_up_completed: 'check-circle',
        follow_up_overdue: 'alert-circle',
        follow_up_response_received: 'message-circle',
        follow_up_message_sent: 'send',

        // System
        system_alert: 'alert-triangle',
        reminder: 'bell',
    };

    return iconMap[type] || 'bell';
}

// Helper function to get notification color based on type
export function getNotificationColor(type: NotificationType): string {
    if (type.includes('failed') || type.includes('overdue') || type.includes('depleted')) {
        return 'destructive';
    }
    if (type.includes('completed') || type.includes('success') || type.includes('delivered')) {
        return 'success';
    }
    if (type.includes('warning') || type.includes('due_soon') || type.includes('low')) {
        return 'warning';
    }
    return 'default';
}