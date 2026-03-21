"use strict";
// src/services/NotificationService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const NotificationRepository_1 = require("@repositories/NotificationRepository");
const AuditLogService_1 = require("@services/AuditLogService");
const logger_1 = __importDefault(require("@config/logger"));
class NotificationService {
    constructor() {
        this.notificationRepository = new NotificationRepository_1.NotificationRepository();
        this.auditLogService = new AuditLogService_1.AuditLogService();
    }
    // ============================================================================
    // NOTIFICATION CRUD
    // ============================================================================
    async createNotification(data) {
        try {
            const notification = await this.notificationRepository.create(data);
            logger_1.default.info(`Notification created: ${notification.id} - ${data.type}`);
            return notification;
        }
        catch (error) {
            logger_1.default.error('Error creating notification:', error);
            throw error;
        }
    }
    async createBulkNotifications(notifications) {
        try {
            return await this.notificationRepository.createBulk(notifications);
        }
        catch (error) {
            logger_1.default.error('Error creating bulk notifications:', error);
            throw error;
        }
    }
    async getNotifications(filters) {
        return await this.notificationRepository.findAll(filters);
    }
    async getNotificationById(id, churchId) {
        return await this.notificationRepository.findById(id, churchId);
    }
    async markAsRead(id, churchId) {
        return await this.notificationRepository.markAsRead(id, churchId);
    }
    async markAllAsRead(churchId, userId) {
        return await this.notificationRepository.markAllAsRead(churchId, userId);
    }
    async deleteNotification(id, churchId) {
        return await this.notificationRepository.delete(id, churchId);
    }
    async getUnreadCount(churchId, userId) {
        return await this.notificationRepository.getUnreadCount(churchId, userId);
    }
    async getStats(churchId, userId) {
        return await this.notificationRepository.getStats(churchId, userId);
    }
    // ============================================================================
    // NOTIFICATION TRIGGERS
    // ============================================================================
    async notifyMemberAdded(churchId, actorId, actorName, member, method = 'manual') {
        try {
            await this.createNotification({
                churchId,
                type: 'member_added',
                title: 'New Member Added',
                message: `${actorName} added ${member.firstName} ${member.lastName} as a new member${method === 'import' ? ' (imported)' : ''}.`,
                actionType: 'view',
                actionUrl: `/members/${member.id}`,
                entityType: 'member',
                entityId: member.id,
                actorId,
                actorName,
                data: { memberId: member.id, memberName: `${member.firstName} ${member.lastName}`, method },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending member added notification:', error);
        }
    }
    async notifyMembersImported(churchId, actorId, actorName, count) {
        try {
            await this.createNotification({
                churchId,
                type: 'members_bulk_imported',
                title: 'Members Imported',
                message: `${actorName} imported ${count} member${count > 1 ? 's' : ''}.`,
                actionType: 'view',
                actionUrl: '/members',
                entityType: 'member',
                actorId,
                actorName,
                data: { count },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending members imported notification:', error);
        }
    }
    async notifyFirstTimerAdded(churchId, actorId, actorName, firstTimer) {
        try {
            await this.createNotification({
                churchId,
                type: 'first_timer_added',
                title: 'New First Timer',
                message: `${actorName} registered ${firstTimer.firstName} ${firstTimer.lastName} as a first timer.`,
                actionType: 'view',
                actionUrl: `/first-timers/${firstTimer.id}`,
                entityType: 'first_timer',
                entityId: firstTimer.id,
                actorId,
                actorName,
                data: { firstTimerId: firstTimer.id, firstTimerName: `${firstTimer.firstName} ${firstTimer.lastName}` },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending first timer added notification:', error);
        }
    }
    async notifyFirstTimerConverted(churchId, actorId, actorName, firstTimer, memberId) {
        try {
            await this.createNotification({
                churchId,
                type: 'first_timer_converted',
                title: 'First Timer Converted',
                message: `${actorName} converted ${firstTimer.firstName} ${firstTimer.lastName} to a member.`,
                actionType: 'view',
                actionUrl: `/members/${memberId}`,
                entityType: 'member',
                entityId: memberId,
                actorId,
                actorName,
                data: { firstTimerId: firstTimer.id, memberId, name: `${firstTimer.firstName} ${firstTimer.lastName}` },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending first timer converted notification:', error);
        }
    }
    async notifyOfferingRecorded(churchId, actorId, actorName, offering) {
        try {
            const message = offering.eventName
                ? `${actorName} recorded a ${offering.type} of ${offering.amount} for ${offering.eventName}.`
                : `${actorName} recorded a ${offering.type} of ${offering.amount}.`;
            await this.createNotification({
                churchId,
                type: 'offering_recorded',
                title: 'Offering Recorded',
                message,
                actionType: 'view',
                actionUrl: `/finances/transactions/${offering.id}`,
                entityType: 'transaction',
                entityId: offering.id,
                actorId,
                actorName,
                data: { transactionId: offering.id, type: offering.type, amount: offering.amount },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending offering recorded notification:', error);
        }
    }
    async notifyExpenseRecorded(churchId, actorId, actorName, expense) {
        try {
            await this.createNotification({
                churchId,
                type: 'expense_recorded',
                title: 'Expense Recorded',
                message: `${actorName} recorded an expense of ${expense.amount} for ${expense.category}.`,
                actionType: 'view',
                actionUrl: `/finances/transactions/${expense.id}`,
                entityType: 'transaction',
                entityId: expense.id,
                actorId,
                actorName,
                data: { transactionId: expense.id, category: expense.category, amount: expense.amount },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending expense recorded notification:', error);
        }
    }
    async notifyEventCreated(churchId, actorId, actorName, event) {
        try {
            await this.createNotification({
                churchId,
                type: 'event_created',
                title: 'New Event Created',
                message: `${actorName} created a new event: ${event.name}.`,
                actionType: 'view',
                actionUrl: `/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                actorId,
                actorName,
                data: { eventId: event.id, eventName: event.name, startDate: event.startDate },
            });
        }
        catch (error) {
            logger_1.default.error('Error sending event created notification:', error);
        }
    }
    async notifyCheckin(churchId, actorId, actorName, checkin) {
        try {
            await this.createNotification({
                churchId,
                type: 'event_checkin',
                title: 'Member Checked In',
                message: `${checkin.memberName} checked in to ${checkin.eventName}.`,
                actionType: 'view',
                actionUrl: `/events/${checkin.eventId}/attendance`,
                entityType: 'attendance',
                entityId: checkin.eventId,
                actorId,
                actorName,
                data: checkin,
            });
        }
        catch (error) {
            logger_1.default.error('Error sending checkin notification:', error);
        }
    }
    async notifyStaffAdded(churchId, actorId, actorName, staff) {
        try {
            await this.createNotification({
                churchId,
                type: 'staff_added',
                title: 'New Staff Member',
                message: `${actorName} added ${staff.name} as ${staff.role}.`,
                actionType: 'view',
                actionUrl: '/profile?tab=staff',
                entityType: 'user',
                entityId: staff.id,
                actorId,
                actorName,
                data: staff,
            });
        }
        catch (error) {
            logger_1.default.error('Error sending staff added notification:', error);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=UserNotificationService.js.map