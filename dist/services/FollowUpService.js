"use strict";
// src/services/FollowUpService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpService = void 0;
const FollowUpRepository_1 = require("@repositories/FollowUpRepository");
const SmsService_1 = require("@services/SmsService");
const UserNotificationService_1 = require("@services/UserNotificationService");
const AppError_1 = require("@utils/AppError");
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
class FollowUpService {
    constructor() {
        this.followUpRepository = new FollowUpRepository_1.FollowUpRepository();
        this.smsService = new SmsService_1.SmsService();
        this.notificationService = new UserNotificationService_1.NotificationService();
    }
    // ============================================================================
    // DEPARTMENT
    // ============================================================================
    async getDepartment(churchId) {
        return this.followUpRepository.getOrCreateDepartment(churchId);
    }
    async updateDepartmentSettings(churchId, settings) {
        return this.followUpRepository.updateDepartmentSettings(churchId, settings);
    }
    // ============================================================================
    // MEMBERS
    // ============================================================================
    async getMembers(churchId, filters) {
        return this.followUpRepository.getMembers(churchId, filters);
    }
    async addMember(churchId, userId, data) {
        const member = await this.followUpRepository.addMember(churchId, data, userId);
        logger_1.default.info(`Added member ${data.memberId} to follow-up department for church ${churchId}`);
        return member;
    }
    async updateMember(churchId, followUpMemberId, data) {
        const member = await this.followUpRepository.updateMember(churchId, followUpMemberId, data);
        // src/services/FollowUpService.ts (continued)
        if (!member) {
            throw new AppError_1.AppError('Follow-up member not found', 404);
        }
        return member;
    }
    async removeMember(churchId, followUpMemberId) {
        const removed = await this.followUpRepository.removeMember(churchId, followUpMemberId);
        if (!removed) {
            throw new AppError_1.AppError('Follow-up member not found', 404);
        }
        logger_1.default.info(`Removed member ${followUpMemberId} from follow-up department`);
    }
    // ============================================================================
    // ASSIGNMENTS
    // ============================================================================
    async getAssignments(churchId, filters) {
        return this.followUpRepository.getAssignments(churchId, filters);
    }
    async getAssignmentById(churchId, assignmentId) {
        const assignment = await this.followUpRepository.getAssignmentById(churchId, assignmentId);
        if (!assignment) {
            throw new AppError_1.AppError('Assignment not found', 404);
        }
        return assignment;
    }
    async getAssignmentByFirstTimer(churchId, firstTimerId) {
        return this.followUpRepository.getAssignmentByFirstTimer(churchId, firstTimerId);
    }
    async createAssignment(churchId, userId, data) {
        try {
            // Verify assigned members are in follow-up department
            const department = await this.followUpRepository.getOrCreateDepartment(churchId);
            const members = await this.followUpRepository.getMembers(churchId, { status: 'active' });
            const memberIds = members.map(m => m.id);
            const invalidMembers = data.assignedMemberIds.filter(id => !memberIds.includes(id));
            if (invalidMembers.length > 0) {
                throw new AppError_1.AppError('Some assigned members are not in the follow-up department', 400);
            }
            const assignment = await this.followUpRepository.createAssignment(churchId, data, userId);
            // Get user info for notifications
            const userResult = await database_1.pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
            const actorName = userResult.rows[0]
                ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
                : 'System';
            // Get full member info for assigned members
            const assignedMembers = members.filter(m => data.assignedMemberIds.includes(m.id));
            // Send notifications to assigned members
            await this.notificationService.notifyFollowUpAssignment(churchId, assignment, assignedMembers, userId, actorName);
            logger_1.default.info(`Created follow-up assignment ${assignment.id} for first timer ${data.firstTimerId}`);
            return assignment;
        }
        catch (error) {
            logger_1.default.error('Error creating assignment:', error);
            throw error;
        }
    }
    async bulkCreateAssignments(churchId, userId, data) {
        const results = [];
        const errors = [];
        let created = 0;
        let failed = 0;
        // Get members for distribution
        const members = await this.followUpRepository.getMembers(churchId, { status: 'active' });
        const validMemberIds = data.assignedMemberIds.filter(id => members.some(m => m.id === id));
        if (validMemberIds.length === 0) {
            throw new AppError_1.AppError('No valid follow-up members found', 400);
        }
        // Get member workloads for auto-distribution
        const memberWorkload = new Map();
        if (data.autoDistribute) {
            for (const member of members.filter(m => validMemberIds.includes(m.id))) {
                memberWorkload.set(member.id, member.activeAssignmentsCount || 0);
            }
        }
        for (const firstTimerId of data.firstTimerIds) {
            try {
                // Check if already has active assignment
                const existing = await this.followUpRepository.getAssignmentByFirstTimer(churchId, firstTimerId);
                if (existing) {
                    errors.push({ firstTimerId, error: 'Already has active assignment' });
                    failed++;
                    continue;
                }
                let assignedMemberIds;
                if (data.autoDistribute && validMemberIds.length > 1) {
                    // Assign to member with lowest workload
                    const sortedMembers = [...memberWorkload.entries()]
                        .sort((a, b) => a[1] - b[1]);
                    assignedMemberIds = [sortedMembers[0][0]];
                    memberWorkload.set(sortedMembers[0][0], sortedMembers[0][1] + 1);
                }
                else {
                    assignedMemberIds = validMemberIds;
                }
                const assignment = await this.followUpRepository.createAssignment(churchId, {
                    firstTimerId,
                    assignedMemberIds,
                    primaryMemberId: assignedMemberIds[0],
                    priority: data.priority || 'medium',
                    dueDate: data.dueDate,
                }, userId);
                results.push(assignment);
                created++;
            }
            catch (error) {
                errors.push({ firstTimerId, error: error.message });
                failed++;
            }
        }
        logger_1.default.info(`Bulk created ${created} follow-up assignments, ${failed} failed`);
        return {
            created,
            failed,
            assignments: results,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    async updateAssignment(churchId, assignmentId, data) {
        const assignment = await this.followUpRepository.updateAssignment(churchId, assignmentId, data);
        if (!assignment) {
            throw new AppError_1.AppError('Assignment not found', 404);
        }
        return assignment;
    }
    async completeAssignment(churchId, userId, assignmentId, notes) {
        const assignment = await this.followUpRepository.completeAssignment(churchId, assignmentId, notes);
        if (!assignment) {
            throw new AppError_1.AppError('Assignment not found', 404);
        }
        // Get user info for notifications
        const userResult = await database_1.pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const completedBy = {
            id: userId,
            name: userResult.rows[0]
                ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`
                : 'Unknown',
        };
        // Send completion notifications
        await this.notificationService.notifyFollowUpCompleted(churchId, assignment, completedBy);
        logger_1.default.info(`Completed follow-up assignment ${assignmentId}`);
        return assignment;
    }
    async reassignMember(churchId, assignmentId, data) {
        // Verify assignment exists
        const assignment = await this.getAssignmentById(churchId, assignmentId);
        // If adding a member, verify they're in the follow-up department
        if (data.addMemberId) {
            const member = await this.followUpRepository.getMemberById(churchId, data.addMemberId);
            if (!member) {
                throw new AppError_1.AppError('Member is not in the follow-up department', 400);
            }
        }
        // Update in database
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            if (data.removeMemberId) {
                await client.query(`UPDATE follow_up_assigned_members
                     SET status = 'removed', updated_at = NOW()
                     WHERE assignment_id = $1 AND follow_up_member_id = $2`, [assignmentId, data.removeMemberId]);
            }
            if (data.addMemberId) {
                // Check if already assigned
                const existing = await client.query(`SELECT id, status FROM follow_up_assigned_members
                     WHERE assignment_id = $1 AND follow_up_member_id = $2`, [assignmentId, data.addMemberId]);
                if (existing.rows.length > 0) {
                    if (existing.rows[0].status === 'removed') {
                        await client.query(`UPDATE follow_up_assigned_members
                             SET status = 'active', is_primary = $1, updated_at = NOW()
                             WHERE assignment_id = $2 AND follow_up_member_id = $3`, [data.makePrimary || false, assignmentId, data.addMemberId]);
                    }
                }
                else {
                    await client.query(`INSERT INTO follow_up_assigned_members
                         (assignment_id, follow_up_member_id, is_primary)
                         VALUES ($1, $2, $3)`, [assignmentId, data.addMemberId, data.makePrimary || false]);
                }
                if (data.makePrimary) {
                    await client.query(`UPDATE follow_up_assigned_members
                         SET is_primary = false
                         WHERE assignment_id = $1 AND follow_up_member_id != $2`, [assignmentId, data.addMemberId]);
                }
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
        return this.getAssignmentById(churchId, assignmentId);
    }
    // ============================================================================
    // ACTIVITIES & COMMUNICATION
    // ============================================================================
    async getActivities(churchId, assignmentId, filters) {
        // Verify assignment exists
        await this.getAssignmentById(churchId, assignmentId);
        return this.followUpRepository.getActivities(churchId, assignmentId, filters);
    }
    async sendMessage(churchId, userId, data) {
        try {
            // Verify assignment exists
            const assignment = await this.getAssignmentById(churchId, data.assignmentId);
            // Get first timer contact info
            const ftResult = await database_1.pool.query('SELECT first_name, last_name, email, phone FROM first_timers WHERE id = $1', [data.firstTimerId]);
            if (ftResult.rows.length === 0) {
                throw new AppError_1.AppError('First timer not found', 404);
            }
            const firstTimer = ftResult.rows[0];
            const recipientName = `${firstTimer.first_name} ${firstTimer.last_name}`;
            // Process template variables if using a template
            let messageContent = data.content;
            if (data.templateId) {
                const templateVariables = await this.smsService.getFollowUpTemplateVariables(churchId, data.firstTimerId);
                messageContent = this.smsService.processFollowUpTemplate(data.content, templateVariables);
            }
            let result;
            switch (data.channel) {
                case 'sms':
                    if (!firstTimer.phone) {
                        throw new AppError_1.AppError('First timer has no phone number', 400);
                    }
                    const smsResult = await this.smsService.sendFollowUpSms({
                        churchId,
                        userId,
                        assignmentId: data.assignmentId,
                        firstTimerId: data.firstTimerId,
                        channel: 'sms',
                        to: firstTimer.phone,
                        message: messageContent,
                        recipientName,
                    });
                    result = {
                        success: smsResult.success,
                        messageId: smsResult.messageId,
                        externalId: smsResult.externalId,
                        channel: 'sms',
                        deliveryStatus: smsResult.deliveryStatus,
                        error: smsResult.error,
                    };
                    break;
                case 'whatsapp':
                    if (!firstTimer.phone) {
                        throw new AppError_1.AppError('First timer has no phone number', 400);
                    }
                    const waResult = await this.smsService.sendFollowUpWhatsApp({
                        churchId,
                        userId,
                        assignmentId: data.assignmentId,
                        firstTimerId: data.firstTimerId,
                        channel: 'whatsapp',
                        to: firstTimer.phone,
                        message: messageContent,
                        recipientName,
                    });
                    result = {
                        success: waResult.success,
                        messageId: waResult.messageId,
                        externalId: waResult.externalId,
                        channel: 'whatsapp',
                        deliveryStatus: waResult.deliveryStatus,
                        error: waResult.error,
                    };
                    break;
                case 'email':
                    if (!firstTimer.email) {
                        throw new AppError_1.AppError('First timer has no email address', 400);
                    }
                    const emailResult = await this.sendFollowUpEmail(churchId, userId, data.assignmentId, data.firstTimerId, firstTimer.email, data.subject || 'Message from Church', messageContent, recipientName);
                    result = emailResult;
                    break;
                default:
                    // For other channels (phone_call, in_person), just record the activity
                    const activity = await this.followUpRepository.createMessageActivity(churchId, userId, {
                        assignmentId: data.assignmentId,
                        firstTimerId: data.firstTimerId,
                        channel: data.channel,
                        subject: data.subject,
                        content: messageContent,
                        status: 'completed',
                    });
                    result = {
                        success: true,
                        messageId: activity.id,
                        channel: data.channel,
                        deliveryStatus: 'delivered',
                        activity,
                    };
            }
            logger_1.default.info(`Follow-up message sent via ${data.channel} for assignment ${data.assignmentId}`);
            return result;
        }
        catch (error) {
            logger_1.default.error('Error sending follow-up message:', error);
            throw error;
        }
    }
    async sendFollowUpEmail(churchId, userId, assignmentId, firstTimerId, to, subject, content, recipientName) {
        try {
            // Get church name for email
            const churchResult = await database_1.pool.query('SELECT name FROM churches WHERE id = $1', [churchId]);
            const churchName = churchResult.rows[0]?.name || 'Church';
            // Send email via notification service
            const emailSent = await this.notificationService.sendEmail({
                to,
                subject,
                data: {
                    title: subject,
                    message: content,
                    churchName,
                    recipientName,
                },
            });
            const status = emailSent ? 'completed' : 'failed';
            const deliveryStatus = emailSent ? 'sent' : 'failed';
            // Record activity
            const activity = await this.followUpRepository.createMessageActivity(churchId, userId, {
                assignmentId,
                firstTimerId,
                channel: 'email',
                subject,
                content,
                status,
                deliveryStatus,
            });
            return {
                success: emailSent,
                messageId: activity.id,
                channel: 'email',
                deliveryStatus: deliveryStatus,
                error: emailSent ? undefined : 'Failed to send email',
                activity,
            };
        }
        catch (error) {
            logger_1.default.error('Error sending follow-up email:', error);
            return {
                success: false,
                channel: 'email',
                deliveryStatus: 'failed',
                error: error.message,
            };
        }
    }
    async recordActivity(churchId, userId, data) {
        // Verify assignment exists
        await this.getAssignmentById(churchId, data.assignmentId);
        return this.followUpRepository.createActivity(churchId, userId, data);
    }
    async recordResponse(churchId, activityId, response) {
        const activity = await this.followUpRepository.recordResponse(churchId, activityId, response);
        if (!activity) {
            throw new AppError_1.AppError('Activity not found', 404);
        }
        // Get assignment for notifications
        const assignment = await this.getAssignmentById(churchId, activity.assignmentId);
        // Send notifications about response
        await this.notificationService.notifyFollowUpResponse(churchId, assignment, response, activity.channel);
        return activity;
    }
    // ============================================================================
    // TEMPLATES
    // ============================================================================
    async getTemplates(churchId, channel) {
        return this.followUpRepository.getTemplates(churchId, channel);
    }
    async createTemplate(churchId, userId, data) {
        return this.followUpRepository.createTemplate(churchId, userId, data);
    }
    async updateTemplate(churchId, templateId, data) {
        const template = await this.followUpRepository.updateTemplate(churchId, templateId, data);
        if (!template) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return template;
    }
    async deleteTemplate(churchId, templateId) {
        const deleted = await this.followUpRepository.deleteTemplate(churchId, templateId);
        if (!deleted) {
            throw new AppError_1.AppError('Template not found', 404);
        }
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStatistics(churchId) {
        return this.followUpRepository.getStatistics(churchId);
    }
    // ============================================================================
    // UNASSIGNED FIRST TIMERS
    // ============================================================================
    async getUnassignedFirstTimers(churchId) {
        return this.followUpRepository.getUnassignedFirstTimers(churchId);
    }
    // ============================================================================
    // MY ASSIGNMENTS (For follow-up members)
    // ============================================================================
    async getMyAssignments(churchId, userId, filters) {
        // Get the follow-up member ID for this user
        const memberResult = await database_1.pool.query(`SELECT fm.id FROM follow_up_members fm
             JOIN members m ON fm.member_id = m.id
             WHERE fm.church_id = $1 AND m.user_id = $2 AND fm.status = 'active'`, [churchId, userId]);
        if (memberResult.rows.length === 0) {
            return {
                assignments: [],
                pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            };
        }
        const followUpMemberId = memberResult.rows[0].id;
        const modifiedFilters = { ...filters, assignedMemberId: followUpMemberId };
        return this.followUpRepository.getAssignments(churchId, modifiedFilters);
    }
    // ============================================================================
    // DEADLINE REMINDER JOB
    // ============================================================================
    async processDeadlineReminders() {
        try {
            // Get all active assignments with due dates
            const result = await database_1.pool.query(`SELECT fa.*, fd.settings, fd.church_id
                 FROM follow_up_assignments fa
                 JOIN follow_up_departments fd ON fa.church_id = fd.church_id
                 WHERE fa.status = 'active' AND fa.due_date IS NOT NULL`);
            for (const row of result.rows) {
                const settings = typeof row.settings === 'string'
                    ? JSON.parse(row.settings)
                    : row.settings;
                const reminderIntervals = settings.reminderIntervals ||
                    settings.reminder_intervals || [1, 3, 7];
                const dueDate = new Date(row.due_date);
                const now = new Date();
                const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (reminderIntervals.includes(daysUntilDue) || daysUntilDue === 0) {
                    // Get full assignment with populated fields
                    const assignment = await this.getAssignmentById(row.church_id, row.id);
                    await this.notificationService.notifyFollowUpDeadline(row.church_id, assignment, daysUntilDue);
                    logger_1.default.info(`Sent deadline reminder for assignment ${row.id}, due in ${daysUntilDue} days`);
                }
            }
        }
        catch (error) {
            logger_1.default.error('Error processing deadline reminders:', error);
        }
    }
}
exports.FollowUpService = FollowUpService;
//# sourceMappingURL=FollowUpService.js.map