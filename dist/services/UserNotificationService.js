"use strict";
// src/services/NotificationService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const NotificationRepository_1 = require("@repositories/NotificationRepository");
const FollowUpRepository_1 = require("@repositories/FollowUpRepository");
const AuditLogService_1 = require("@services/AuditLogService");
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
const nodemailer_1 = __importDefault(require("nodemailer"));
// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================
class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.isEmailConfigured = false;
        this.notificationRepository = new NotificationRepository_1.NotificationRepository();
        this.followUpRepository = new FollowUpRepository_1.FollowUpRepository();
        this.auditLogService = new AuditLogService_1.AuditLogService();
        this.initializeEmailTransporter();
    }
    initializeEmailTransporter() {
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                this.emailTransporter = nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                    tls: {
                        rejectUnauthorized: process.env.NODE_ENV === 'production',
                    },
                });
                this.isEmailConfigured = true;
                logger_1.default.info('Email transporter initialized successfully');
            }
            else {
                logger_1.default.warn('Email configuration incomplete - emails will be logged only');
            }
        }
        catch (error) {
            logger_1.default.error('Failed to initialize email transporter:', error);
        }
    }
    // ============================================================================
    // CORE NOTIFICATION METHODS
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
    // EMAIL SENDING
    // ============================================================================
    async sendEmail(options) {
        if (!this.isEmailConfigured || !this.emailTransporter) {
            logger_1.default.warn(`Email not sent (not configured): To: ${options.to}, Subject: ${options.subject}`);
            return false;
        }
        try {
            const html = options.html || this.generateEmailHtml(options);
            await this.emailTransporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME || 'Church Management'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html,
            });
            logger_1.default.info(`Email sent successfully to ${options.to}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error sending email:', error);
            return false;
        }
    }
    generateEmailHtml(options) {
        const data = options.data || {};
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${options.subject}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
                    .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
                    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${data.churchName || 'Church Management'}</h1>
                </div>
                <div class="content">
                    <h2>${data.title || options.subject}</h2>
                    <p>${data.message || options.text || ''}</p>
                    ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Details</a>` : ''}
                </div>
                <div class="footer">
                    <p>This email was sent by ${data.churchName || 'Church Management System'}</p>
                </div>
            </body>
            </html>
        `;
    }
    // ============================================================================
    // FOLLOW-UP NOTIFICATIONS
    // ============================================================================
    async notifyFollowUpAssignment(churchId, assignment, assignedMembers, actorId, actorName) {
        try {
            const firstTimerName = `${assignment.firstTimer?.firstName} ${assignment.firstTimer?.lastName}`;
            const notifications = [];
            for (const member of assignedMembers) {
                const userResult = await database_1.pool.query('SELECT user_id FROM members WHERE id = $1', [member.memberId]);
                const userId = userResult.rows[0]?.user_id;
                if (!userId)
                    continue;
                notifications.push({
                    churchId,
                    userId,
                    type: 'follow_up_assignment',
                    title: 'New Follow-Up Assignment',
                    message: `You have been assigned to follow up with ${firstTimerName}.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?assignment=${assignment.id}`,
                    entityType: 'follow_up_assignment',
                    entityId: assignment.id,
                    actorId,
                    actorName,
                    data: {
                        assignmentId: assignment.id,
                        firstTimerId: assignment.firstTimerId,
                        firstTimerName,
                        priority: assignment.priority,
                        dueDate: assignment.dueDate,
                        isPrimary: member.id === assignedMembers.find(m => m === member)?.id,
                    },
                });
            }
            if (notifications.length > 0) {
                await this.createBulkNotifications(notifications);
            }
            for (const member of assignedMembers) {
                if (member.member?.email) {
                    await this.sendEmail({
                        to: member.member.email,
                        subject: `New Follow-Up Assignment: ${firstTimerName}`,
                        data: {
                            title: 'New Follow-Up Assignment',
                            message: `
                                <p>Hello ${member.member.firstName},</p>
                                <p>You have been assigned to follow up with <strong>${firstTimerName}</strong>.</p>
                                <p><strong>Priority:</strong> ${assignment.priority}</p>
                                ${assignment.dueDate ? `<p><strong>Due Date:</strong> ${new Date(assignment.dueDate).toLocaleDateString()}</p>` : ''}
                                ${assignment.firstTimer?.phone ? `<p><strong>Phone:</strong> ${assignment.firstTimer.phone}</p>` : ''}
                                ${assignment.firstTimer?.email ? `<p><strong>Email:</strong> ${assignment.firstTimer.email}</p>` : ''}
                            `,
                            actionUrl: `${process.env.FRONTEND_URL}/follow-up?assignment=${assignment.id}`,
                        },
                    });
                }
            }
            logger_1.default.info(`Follow-up assignment notifications sent for assignment ${assignment.id}`);
        }
        catch (error) {
            logger_1.default.error('Error sending follow-up assignment notifications:', error);
        }
    }
    async notifyFollowUpDeadline(churchId, assignment, daysUntilDue) {
        try {
            const firstTimerName = `${assignment.firstTimer?.firstName} ${assignment.firstTimer?.lastName}`;
            const members = assignment.assignedMembers || [];
            for (const assignedMember of members) {
                if (assignedMember.status !== 'active')
                    continue;
                const memberResult = await database_1.pool.query(`SELECT m.user_id, m.email, m.first_name FROM members m
                                                                      JOIN follow_up_members fm ON m.id = fm.member_id
                     WHERE fm.id = $1`, [assignedMember.followUpMemberId]);
                const user = memberResult.rows[0];
                if (!user?.user_id)
                    continue;
                await this.createNotification({
                    churchId,
                    userId: user.user_id,
                    type: 'follow_up_deadline',
                    title: 'Follow-Up Deadline Approaching',
                    message: daysUntilDue === 0
                        ? `Your follow-up with ${firstTimerName} is due today!`
                        : `Your follow-up with ${firstTimerName} is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?assignment=${assignment.id}`,
                    entityType: 'follow_up_assignment',
                    entityId: assignment.id,
                    data: { assignmentId: assignment.id, firstTimerName, daysUntilDue },
                });
                if (user.email) {
                    await this.sendEmail({
                        to: user.email,
                        subject: daysUntilDue === 0
                            ? `Follow-Up Due Today: ${firstTimerName}`
                            : `Follow-Up Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}: ${firstTimerName}`,
                        data: {
                            title: 'Follow-Up Reminder',
                            message: `<p>Hello ${user.first_name},</p><p>${daysUntilDue === 0
                                ? `Your follow-up with <strong>${firstTimerName}</strong> is due today!`
                                : `Your follow-up with <strong>${firstTimerName}</strong> is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`}</p>`,
                            actionUrl: `${process.env.FRONTEND_URL}/follow-up?assignment=${assignment.id}`,
                        },
                    });
                }
            }
            logger_1.default.info(`Follow-up deadline notifications sent for assignment ${assignment.id}`);
        }
        catch (error) {
            logger_1.default.error('Error sending follow-up deadline notifications:', error);
        }
    }
    async notifyFollowUpCompleted(churchId, assignment, completedBy) {
        try {
            const firstTimerName = `${assignment.firstTimer?.firstName} ${assignment.firstTimer?.lastName}`;
            const members = assignment.assignedMembers || [];
            for (const assignedMember of members) {
                const memberResult = await database_1.pool.query(`SELECT m.user_id FROM members m
                                               JOIN follow_up_members fm ON m.id = fm.member_id
                     WHERE fm.id = $1`, [assignedMember.followUpMemberId]);
                const userId = memberResult.rows[0]?.user_id;
                if (!userId || userId === completedBy.id)
                    continue;
                await this.createNotification({
                    churchId,
                    userId,
                    type: 'follow_up_completed',
                    title: 'Follow-Up Completed',
                    message: `${completedBy.name} marked the follow-up with ${firstTimerName} as completed.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?assignment=${assignment.id}`,
                    entityType: 'follow_up_assignment',
                    entityId: assignment.id,
                    actorId: completedBy.id,
                    actorName: completedBy.name,
                    data: { assignmentId: assignment.id, firstTimerName },
                });
            }
            const adminsResult = await database_1.pool.query(`SELECT id, email, first_name FROM users
                 WHERE church_id = $1 AND role IN ('admin', 'pastor') AND is_active = true`, [churchId]);
            for (const admin of adminsResult.rows) {
                await this.createNotification({
                    churchId,
                    userId: admin.id,
                    type: 'follow_up_completed',
                    title: 'Follow-Up Completed',
                    message: `${completedBy.name} completed the follow-up with ${firstTimerName}.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?assignment=${assignment.id}`,
                    entityType: 'follow_up_assignment',
                    entityId: assignment.id,
                    actorId: completedBy.id,
                    actorName: completedBy.name,
                    data: { assignmentId: assignment.id, firstTimerName },
                });
            }
            logger_1.default.info(`Follow-up completion notifications sent for assignment ${assignment.id}`);
        }
        catch (error) {
            logger_1.default.error('Error sending follow-up completion notifications:', error);
        }
    }
    async notifyFollowUpResponse(churchId, assignment, response, channel) {
        try {
            const firstTimerName = `${assignment.firstTimer?.firstName} ${assignment.firstTimer?.lastName}`;
            const members = assignment.assignedMembers || [];
            for (const assignedMember of members) {
                if (assignedMember.status !== 'active')
                    continue;
                const memberResult = await database_1.pool.query(`SELECT m.user_id, m.email, m.first_name FROM members m
                                                                      JOIN follow_up_members fm ON m.id = fm.member_id
                     WHERE fm.id = $1`, [assignedMember.followUpMemberId]);
                const user = memberResult.rows[0];
                if (!user?.user_id)
                    continue;
                await this.createNotification({
                    churchId,
                    userId: user.user_id,
                    type: 'follow_up_response',
                    title: 'Response Received',
                    message: `${firstTimerName} responded to your ${channel} message.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?assignment=${assignment.id}`,
                    entityType: 'follow_up_assignment',
                    entityId: assignment.id,
                    data: {
                        assignmentId: assignment.id,
                        firstTimerName,
                        channel,
                        responsePreview: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
                    },
                });
                if (user.email) {
                    await this.sendEmail({
                        to: user.email,
                        subject: `Response from ${firstTimerName}`,
                        data: {
                            title: 'Response Received',
                            message: `
                                <p>Hello ${user.first_name},</p>
                                <p><strong>${firstTimerName}</strong> responded to your ${channel} message:</p>
                                <blockquote style="background:#f9f9f9;padding:15px;border-left:3px solid #667eea;margin:15px 0;">
                                    ${response}
                                </blockquote>
                            `,
                            actionUrl: `${process.env.FRONTEND_URL}/follow-up?assignment=${assignment.id}`,
                        },
                    });
                }
            }
            logger_1.default.info(`Follow-up response notifications sent for assignment ${assignment.id}`);
        }
        catch (error) {
            logger_1.default.error('Error sending follow-up response notifications:', error);
        }
    }
    async notifyNewFirstTimer(churchId, firstTimer, actorId, actorName) {
        try {
            const leadersResult = await database_1.pool.query(`SELECT fm.id, m.user_id, m.email, m.first_name
                 FROM follow_up_members fm
                          JOIN members m ON fm.member_id = m.id
                          JOIN follow_up_departments fd ON fm.department_id = fd.id
                 WHERE fd.church_id = $1
                   AND fm.role IN ('leader', 'coordinator')
                   AND fm.status = 'active'`, [churchId]);
            for (const leader of leadersResult.rows) {
                if (!leader.user_id)
                    continue;
                await this.createNotification({
                    churchId,
                    userId: leader.user_id,
                    type: 'new_first_timer_for_followup',
                    title: 'New First Timer',
                    message: `${firstTimer.firstName} ${firstTimer.lastName} is a new first timer and needs follow-up assignment.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?firstTimer=${firstTimer.id}`,
                    entityType: 'first_timer',
                    entityId: firstTimer.id,
                    actorId,
                    actorName,
                    data: {
                        firstTimerId: firstTimer.id,
                        firstTimerName: `${firstTimer.firstName} ${firstTimer.lastName}`,
                    },
                });
            }
            logger_1.default.info(`New first timer notifications sent for ${firstTimer.id}`);
        }
        catch (error) {
            logger_1.default.error('Error sending new first timer notifications:', error);
        }
    }
    // ============================================================================
    // EXISTING NOTIFICATION TRIGGERS
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
                data: {
                    memberId: member.id,
                    memberName: `${member.firstName} ${member.lastName}`,
                    method,
                },
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
                data: {
                    firstTimerId: firstTimer.id,
                    firstTimerName: `${firstTimer.firstName} ${firstTimer.lastName}`,
                },
            });
            await this.notifyNewFirstTimer(churchId, firstTimer, actorId, actorName);
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
                data: {
                    firstTimerId: firstTimer.id,
                    memberId,
                    name: `${firstTimer.firstName} ${firstTimer.lastName}`,
                },
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
                data: {
                    transactionId: offering.id,
                    type: offering.type,
                    amount: offering.amount,
                },
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
                data: {
                    transactionId: expense.id,
                    category: expense.category,
                    amount: expense.amount,
                },
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
    // ============================================================================
    // ADMIN NOTIFICATIONS
    // ============================================================================
    /**
     * Send a notification to every admin / super_admin of a church.
     *
     * The `data` parameter uses `NotificationData` whose `type` field is
     * already typed as `NotificationType`, so spreading it into
     * `CreateNotificationDTO` is fully type-safe.
     */
    async notifyChurchAdmins(data) {
        try {
            const adminsResult = await database_1.pool.query(`SELECT u.id, u.email, u.first_name, u.last_name, u.phone
                 FROM users u
                 WHERE u.church_id = $1
                   AND u.role IN ('admin', 'super_admin')
                   AND u.is_active = true`, [data.churchId]);
            if (adminsResult.rows.length === 0) {
                logger_1.default.warn(`No admins found for church ${data.churchId}`);
                return;
            }
            // Build a properly-typed CreateNotificationDTO for each admin.
            // Because NotificationData.type is NotificationType, the spread
            // produces a valid CreateNotificationDTO without any cast.
            const notificationInserts = adminsResult.rows.map(admin => this.createNotification({
                churchId: data.churchId,
                userId: admin.id,
                type: data.type, // NotificationType ✓
                title: data.title,
                message: data.message,
                actionUrl: data.actionUrl,
                entityType: data.entityType,
                entityId: data.entityId,
                actorId: data.actorId,
                actorName: data.actorName,
                data: data.metadata,
            }));
            await Promise.all(notificationInserts);
            const emailPromises = adminsResult.rows
                .filter(admin => admin.email)
                .map(admin => this.sendEmail({
                to: admin.email,
                subject: data.title,
                data: {
                    title: data.title,
                    message: data.message,
                    actionUrl: data.actionUrl,
                    ...data.metadata,
                },
            }));
            await Promise.allSettled(emailPromises);
            logger_1.default.info(`Notifications sent to ${adminsResult.rows.length} admins for church ${data.churchId}`);
        }
        catch (error) {
            logger_1.default.error('Error sending notifications to admins:', error);
            throw error;
        }
    }
}
exports.NotificationService = NotificationService;
// Export singleton instance
exports.notificationService = new NotificationService();
//# sourceMappingURL=UserNotificationService.js.map