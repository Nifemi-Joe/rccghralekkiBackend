"use strict";
// src/dtos/notification.types.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationIcon = getNotificationIcon;
exports.getNotificationColor = getNotificationColor;
// Helper function to get notification icon based on type
function getNotificationIcon(type) {
    const iconMap = {
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
function getNotificationColor(type) {
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
//# sourceMappingURL=notification.types.js.map