"use strict";
// src/services/FollowUpService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpService = void 0;
const database_1 = require("@config/database");
const FollowUpRepository_1 = require("@repositories/FollowUpRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const UserNotificationService_1 = require("@services/UserNotificationService");
class FollowUpService {
    constructor() {
        this.followUpRepository = new FollowUpRepository_1.FollowUpRepository();
        this.notificationService = new UserNotificationService_1.NotificationService();
    }
    // ========================================================================
    // DEPARTMENT
    // ========================================================================
    async getDepartment(churchId) {
        return this.followUpRepository.getOrCreateDepartment(churchId);
    }
    async updateDepartmentSettings(churchId, settings) {
        // Normalise: the service receives camelCase from the controller
        const normalised = {
            autoAssign: settings.autoAssign,
            maxAssignmentsPerMember: settings.maxAssignmentsPerMember,
            followUpDeadlineDays: settings.followUpDeadlineDays,
            reminderIntervals: settings.reminderIntervals,
            notificationPreferences: settings.notificationPreferences,
        };
        // Get current and merge
        const current = await this.followUpRepository.getOrCreateDepartment(churchId);
        const merged = {
            ...normalised,
            notificationPreferences: {
                ...current.settings.notificationPreferences,
                ...(normalised.notificationPreferences || {}),
            },
        };
        return this.followUpRepository.updateDepartmentSettings(churchId, merged);
    }
    // ========================================================================
    // MEMBERS
    // ========================================================================
    async getMembers(churchId, filters) {
        return this.followUpRepository.getMembers(churchId, filters);
    }
    async addMember(churchId, userId, data) {
        return this.followUpRepository.addMember(churchId, data, userId);
    }
    async updateMember(churchId, followUpMemberId, data) {
        const updated = await this.followUpRepository.updateMember(churchId, followUpMemberId, data);
        if (!updated) {
            throw new AppError_1.AppError('Follow-up member not found', 404);
        }
        return updated;
    }
    async removeMember(churchId, followUpMemberId) {
        const removed = await this.followUpRepository.removeMember(churchId, followUpMemberId);
        if (!removed) {
            throw new AppError_1.AppError('Follow-up member not found', 404);
        }
    }
    // ========================================================================
    // ASSIGNMENTS
    // ========================================================================
    async getAssignments(churchId, filters) {
        return this.followUpRepository.getAssignments(churchId, {
            ...filters,
            churchId,
        });
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
        const assignment = await this.followUpRepository.createAssignment(churchId, data, userId);
        // Fire-and-forget notifications
        this.notifyAssignedMembers(churchId, assignment.id, data.assignedMemberIds).catch(err => logger_1.default.error('Failed to send assignment notifications:', err));
        return assignment;
    }
    async bulkCreateAssignments(churchId, userId, data) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const department = await this.followUpRepository.getOrCreateDepartment(churchId);
            const created = [];
            const errors = [];
            // Build member-workload map for auto-distribute
            const workloadMap = new Map();
            if (data.autoDistribute && data.assignedMemberIds.length > 1) {
                const workloadResult = await client.query(`SELECT fm.id, COUNT(fam.id) AS cnt
                     FROM follow_up_members fm
                              LEFT JOIN follow_up_assigned_members fam ON fm.id = fam.follow_up_member_id
                              LEFT JOIN follow_up_assignments fa
                                        ON fam.assignment_id = fa.id AND fa.status = 'active'
                     WHERE fm.department_id = $1
                       AND fm.id = ANY($2)
                       AND fm.status = 'active'
                     GROUP BY fm.id`, [department.id, data.assignedMemberIds]);
                workloadResult.rows.forEach((r) => workloadMap.set(r.id, parseInt(r.cnt, 10)));
            }
            for (const firstTimerId of data.firstTimerIds) {
                try {
                    // Skip if already has active assignment
                    const existing = await client.query(`SELECT id FROM follow_up_assignments
                         WHERE first_timer_id = $1 AND church_id = $2 AND status = 'active'`, [firstTimerId, churchId]);
                    if (existing.rows.length > 0) {
                        errors.push({
                            firstTimerId,
                            error: 'Already has an active assignment',
                        });
                        continue;
                    }
                    // Determine which members to assign
                    let assignedMemberIds;
                    if (data.autoDistribute && workloadMap.size > 0) {
                        const sorted = [...workloadMap.entries()].sort((a, b) => a[1] - b[1]);
                        assignedMemberIds = [sorted[0][0]];
                        workloadMap.set(sorted[0][0], sorted[0][1] + 1);
                    }
                    else {
                        assignedMemberIds = data.assignedMemberIds;
                    }
                    // Insert assignment
                    const assignmentRes = await client.query(`INSERT INTO follow_up_assignments
                         (church_id, first_timer_id, priority, due_date, created_by)
                         VALUES ($1, $2, $3, $4, $5)
                         RETURNING id`, [
                        churchId,
                        firstTimerId,
                        data.priority || 'medium',
                        data.dueDate || null,
                        userId,
                    ]);
                    const assignmentId = assignmentRes.rows[0].id;
                    // Insert assigned members
                    for (let i = 0; i < assignedMemberIds.length; i++) {
                        await client.query(`INSERT INTO follow_up_assigned_members
                             (assignment_id, follow_up_member_id, is_primary)
                             VALUES ($1, $2, $3)`, [assignmentId, assignedMemberIds[i], i === 0]);
                    }
                    // Update first timer status
                    await client.query(`UPDATE first_timers
                         SET follow_up_status = 'scheduled', updated_at = NOW()
                         WHERE id = $1`, [firstTimerId]);
                    const assignment = await this.followUpRepository.getAssignmentById(churchId, assignmentId);
                    if (assignment) {
                        created.push(assignment);
                    }
                }
                catch (err) {
                    errors.push({ firstTimerId, error: err.message });
                }
            }
            await client.query('COMMIT');
            return {
                created: created.length,
                failed: errors.length,
                assignments: created,
                errors,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async updateAssignment(churchId, assignmentId, data) {
        const updated = await this.followUpRepository.updateAssignment(churchId, assignmentId, data);
        if (!updated) {
            throw new AppError_1.AppError('Assignment not found', 404);
        }
        return updated;
    }
    async completeAssignment(churchId, userId, assignmentId, notes) {
        const assignment = await this.followUpRepository.completeAssignment(churchId, assignmentId, notes);
        if (!assignment) {
            throw new AppError_1.AppError('Assignment not found', 404);
        }
        return assignment;
    }
    async reassignMember(churchId, assignmentId, data) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            // Verify assignment exists
            const assignment = await this.followUpRepository.getAssignmentById(churchId, assignmentId);
            if (!assignment) {
                throw new AppError_1.AppError('Assignment not found', 404);
            }
            // Remove old member if specified
            if (data.removeMemberId) {
                await client.query(`UPDATE follow_up_assigned_members
                     SET status = 'removed', updated_at = NOW()
                     WHERE assignment_id = $1 AND follow_up_member_id = $2`, [assignmentId, data.removeMemberId]);
            }
            // Add new member if specified
            if (data.addMemberId) {
                const existingRow = await client.query(`SELECT id FROM follow_up_assigned_members
                     WHERE assignment_id = $1 AND follow_up_member_id = $2`, [assignmentId, data.addMemberId]);
                if (existingRow.rows.length > 0) {
                    // Re-activate if previously removed
                    await client.query(`UPDATE follow_up_assigned_members
                         SET status = 'active',
                             is_primary = $1,
                             updated_at = NOW()
                         WHERE assignment_id = $2 AND follow_up_member_id = $3`, [data.makePrimary || false, assignmentId, data.addMemberId]);
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
            const updated = await this.followUpRepository.getAssignmentById(churchId, assignmentId);
            if (!updated) {
                throw new AppError_1.AppError('Assignment not found after update', 500);
            }
            return updated;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // ========================================================================
    // ACTIVITIES
    // ========================================================================
    async getActivities(churchId, assignmentId, filters) {
        return this.followUpRepository.getActivities(churchId, assignmentId, filters);
    }
    async sendMessage(churchId, userId, data) {
        // Verify assignment exists
        const assignment = await this.getAssignmentById(churchId, data.assignmentId);
        // Fetch first timer contact details
        const ftResult = await database_1.pool.query('SELECT first_name, last_name, email, phone FROM first_timers WHERE id = $1', [data.firstTimerId]);
        if (ftResult.rows.length === 0) {
            throw new AppError_1.AppError('First timer not found', 404);
        }
        const firstTimer = ftResult.rows[0];
        let externalMessageId;
        let deliveryStatus = 'pending';
        let activityStatus = 'completed';
        // Attempt to send via the relevant channel
        try {
            switch (data.channel) {
                case 'sms':
                case 'whatsapp': {
                    if (!firstTimer.phone) {
                        throw new AppError_1.AppError('First timer has no phone number', 400);
                    }
                    // Platform messaging handled externally; log intent
                    logger_1.default.info(`[FollowUpService] ${data.channel.toUpperCase()} message queued ` +
                        `to ${firstTimer.phone}`);
                    deliveryStatus = 'sent';
                    break;
                }
                case 'email': {
                    if (!firstTimer.email) {
                        throw new AppError_1.AppError('First timer has no email address', 400);
                    }
                    const sent = await this.notificationService.sendEmail({
                        to: firstTimer.email,
                        subject: data.subject || 'Message from your Church',
                        text: data.content,
                        data: {
                            title: data.subject || 'Message from your Church',
                            message: data.content,
                        },
                    });
                    deliveryStatus = sent ? 'sent' : 'failed';
                    if (!sent) {
                        activityStatus = 'failed';
                    }
                    break;
                }
                default:
                    // phone_call / in_person / other — just record
                    deliveryStatus = 'sent';
                    break;
            }
        }
        catch (sendError) {
            logger_1.default.error('Error sending follow-up message:', sendError);
            activityStatus = 'failed';
            deliveryStatus = 'failed';
        }
        return this.followUpRepository.createMessageActivity(churchId, userId, {
            assignmentId: data.assignmentId,
            firstTimerId: data.firstTimerId,
            channel: data.channel,
            subject: data.subject,
            content: data.content,
            status: activityStatus,
            externalMessageId,
            deliveryStatus,
            scheduledAt: data.scheduledAt,
        });
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
        return activity;
    }
    // ========================================================================
    // TEMPLATES
    // ========================================================================
    async getTemplates(churchId, channel) {
        return this.followUpRepository.getTemplates(churchId, channel);
    }
    async createTemplate(churchId, userId, data) {
        return this.followUpRepository.createTemplate(churchId, userId, data);
    }
    async updateTemplate(churchId, templateId, data) {
        const updated = await this.followUpRepository.updateTemplate(churchId, templateId, data);
        if (!updated) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return updated;
    }
    async deleteTemplate(churchId, templateId) {
        const deleted = await this.followUpRepository.deleteTemplate(churchId, templateId);
        if (!deleted) {
            throw new AppError_1.AppError('Template not found', 404);
        }
    }
    // ========================================================================
    // STATISTICS
    // ========================================================================
    async getStatistics(churchId) {
        return this.followUpRepository.getStatistics(churchId);
    }
    // ========================================================================
    // UNASSIGNED FIRST TIMERS
    // ========================================================================
    async getUnassignedFirstTimers(churchId) {
        return this.followUpRepository.getUnassignedFirstTimers(churchId);
    }
    // ========================================================================
    // MY ASSIGNMENTS
    // ========================================================================
    async getMyAssignments(churchId, userId, filters) {
        // Resolve the follow-up member record for this user
        const memberResult = await database_1.pool.query(`SELECT fm.id
             FROM follow_up_members fm
             JOIN members m ON fm.member_id = m.id
             WHERE fm.church_id = $1 AND m.user_id = $2`, [churchId, userId]);
        if (memberResult.rows.length === 0) {
            return {
                assignments: [],
                pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            };
        }
        const followUpMemberId = memberResult.rows[0].id;
        return this.getAssignments(churchId, {
            ...filters,
            assignedMemberId: followUpMemberId,
        });
    }
    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================
    async notifyAssignedMembers(churchId, assignmentId, memberIds) {
        try {
            const assignment = await this.followUpRepository.getAssignmentById(churchId, assignmentId);
            if (!assignment)
                return;
            const firstTimerName = assignment.firstTimer
                ? `${assignment.firstTimer.firstName} ${assignment.firstTimer.lastName}`
                : 'a first timer';
            for (const memberId of memberIds) {
                await this.notificationService.createNotification({
                    churchId,
                    userId: memberId,
                    type: 'follow_up_assignment',
                    title: 'New Follow-Up Assignment',
                    message: `You have been assigned to follow up with ${firstTimerName}.`,
                    actionType: 'view',
                    actionUrl: `/follow-up?assignment=${assignmentId}`,
                    entityType: 'follow_up_assignment',
                    entityId: assignmentId,
                    data: {
                        assignmentId,
                        firstTimerId: assignment.firstTimerId,
                        firstTimerName,
                        priority: assignment.priority,
                    },
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error sending assignment notifications:', error);
        }
    }
}
exports.FollowUpService = FollowUpService;
//# sourceMappingURL=followup.service.js.map