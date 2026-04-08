// src/services/followup.service.ts

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    FollowUpDepartment,
    FollowUpDepartmentSettings,
    FollowUpMember,
    FollowUpAssignment,
    AssignedMember,
    FollowUpActivity,
    MessageTemplate,
    FollowUpStatistics,
    FollowUpChannel,
    FollowUpPriority,
} from '../types/followup.types';
import {
    CreateFollowUpMemberDTO,
    UpdateFollowUpMemberDTO,
    CreateAssignmentDTO,
    BulkCreateAssignmentsDTO,
    UpdateAssignmentDTO,
    SendMessageDTO,
    RecordActivityDTO,
    CreateTemplateDTO,
    UpdateTemplateDTO,
    FollowUpFiltersDTO,
    ActivityFiltersDTO,
    UpdateDepartmentSettingsDTO,
} from '../dtos/followup.dto';
import { MessagingService } from './messaging.service';
import { NotificationService } from './notification.service';
import { AppError } from '../utils/errors';

export class FollowUpService {
    private pool: Pool;
    private messagingService: MessagingService;
    private notificationService: NotificationService;

    constructor(pool: Pool) {
        this.pool = pool;
        this.messagingService = new MessagingService();
        this.notificationService = new NotificationService();
    }

    // ========================================================================
    // DEPARTMENT MANAGEMENT
    // ========================================================================

    async getOrCreateDepartment(churchId: string): Promise<FollowUpDepartment> {
        const client = await this.pool.connect();
        try {
            // Check if department exists
            let result = await client.query(
                'SELECT * FROM follow_up_departments WHERE church_id = $1',
                [churchId]
            );

            if (result.rows.length > 0) {
                return this.mapDepartment(result.rows[0]);
            }

            // Create new department
            result = await client.query(
                `INSERT INTO follow_up_departments (church_id, name, description)
                 VALUES ($1, 'Follow Up Department', 'Department responsible for following up with first-time visitors')
                 RETURNING *`,
                [churchId]
            );

            return this.mapDepartment(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async updateDepartmentSettings(
        churchId: string,
        settings: UpdateDepartmentSettingsDTO
    ): Promise<FollowUpDepartment> {
        const client = await this.pool.connect();
        try {
            // Get current settings
            const current = await this.getOrCreateDepartment(churchId);

            // Merge settings
            const newSettings = {
                ...current.settings,
                ...settings,
                notification_preferences: {
                    ...current.settings.notification_preferences,
                    ...(settings.notification_preferences || {}),
                },
            };

            const result = await client.query(
                `UPDATE follow_up_departments
                 SET settings = $1, updated_at = NOW()
                 WHERE church_id = $2
                 RETURNING *`,
                [JSON.stringify(newSettings), churchId]
            );

            return this.mapDepartment(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // MEMBER MANAGEMENT
    // ========================================================================

    async getMembers(
        churchId: string,
        filters?: { search?: string; status?: string }
    ): Promise<FollowUpMember[]> {
        const client = await this.pool.connect();
        try {
            const department = await this.getOrCreateDepartment(churchId);

            let query = `
                SELECT 
                    fm.*,
                    m.first_name,
                    m.last_name,
                    m.email,
                    m.phone,
                    m.profile_image_url,
                    (SELECT COUNT(*) FROM follow_up_assigned_members fam 
                     JOIN follow_up_assignments fa ON fam.assignment_id = fa.id
                     WHERE fam.follow_up_member_id = fm.id AND fa.status = 'active' AND fam.status = 'active') as active_count,
                    (SELECT COUNT(*) FROM follow_up_assigned_members fam 
                     WHERE fam.follow_up_member_id = fm.id) as total_count,
                    (SELECT COUNT(*) FROM follow_up_assigned_members fam 
                     JOIN follow_up_assignments fa ON fam.assignment_id = fa.id
                     WHERE fam.follow_up_member_id = fm.id AND fa.status = 'completed') as completed_count
                FROM follow_up_members fm
                JOIN members m ON fm.member_id = m.id
                WHERE fm.department_id = $1
            `;
            const params: any[] = [department.id];

            if (filters?.search) {
                params.push(`%${filters.search}%`);
                query += ` AND (m.first_name ILIKE $${params.length} OR m.last_name ILIKE $${params.length})`;
            }

            if (filters?.status) {
                params.push(filters.status);
                query += ` AND fm.status = $${params.length}`;
            }

            query += ' ORDER BY fm.role, m.first_name, m.last_name';

            const result = await client.query(query, params);

            return result.rows.map((row) => this.mapMemberWithStats(row));
        } finally {
            client.release();
        }
    }

    async addMember(
        churchId: string,
        userId: string,
        data: CreateFollowUpMemberDTO
    ): Promise<FollowUpMember> {
        const client = await this.pool.connect();
        try {
            const department = await this.getOrCreateDepartment(churchId);

            // Check if member exists in church
            const memberCheck = await client.query(
                'SELECT id FROM members WHERE id = $1 AND church_id = $2',
                [data.memberId, churchId]
            );

            if (memberCheck.rows.length === 0) {
                throw new AppError('Member not found in this church', 404);
            }

            // Check if already in department
            const existingCheck = await client.query(
                'SELECT id FROM follow_up_members WHERE department_id = $1 AND member_id = $2',
                [department.id, data.memberId]
            );

            if (existingCheck.rows.length > 0) {
                throw new AppError('Member is already in the follow-up department', 400);
            }

            const result = await client.query(
                `INSERT INTO follow_up_members (department_id, member_id, church_id, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [department.id, data.memberId, churchId, data.role || 'member']
            );

            // Get full member data
            const memberResult = await client.query(
                'SELECT first_name, last_name, email, phone, profile_image_url FROM members WHERE id = $1',
                [data.memberId]
            );

            return this.mapMemberWithStats({
                ...result.rows[0],
                ...memberResult.rows[0],
                active_count: 0,
                total_count: 0,
                completed_count: 0,
            });
        } finally {
            client.release();
        }
    }

    async updateMember(
        churchId: string,
        followUpMemberId: string,
        data: UpdateFollowUpMemberDTO
    ): Promise<FollowUpMember> {
        const client = await this.pool.connect();
        try {
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (data.role !== undefined) {
                updates.push(`role = $${paramIndex++}`);
                params.push(data.role);
            }

            if (data.status !== undefined) {
                updates.push(`status = $${paramIndex++}`);
                params.push(data.status);
            }

            if (updates.length === 0) {
                throw new AppError('No updates provided', 400);
            }

            params.push(followUpMemberId, churchId);

            const result = await client.query(
                `UPDATE follow_up_members
                 SET ${updates.join(', ')}, updated_at = NOW()
                 WHERE id = $${paramIndex++} AND church_id = $${paramIndex}
                 RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new AppError('Follow-up member not found', 404);
            }

            // Get full data
            return await this.getMemberById(churchId, followUpMemberId);
        } finally {
            client.release();
        }
    }

    async removeMember(churchId: string, followUpMemberId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Check for active assignments
            const activeAssignments = await client.query(
                `SELECT COUNT(*) as count FROM follow_up_assigned_members fam
                 JOIN follow_up_assignments fa ON fam.assignment_id = fa.id
                 WHERE fam.follow_up_member_id = $1 AND fa.status = 'active' AND fam.status = 'active'`,
                [followUpMemberId]
            );

            if (parseInt(activeAssignments.rows[0].count) > 0) {
                // Mark assignments as removed instead of deleting
                await client.query(
                    `UPDATE follow_up_assigned_members
                     SET status = 'removed', updated_at = NOW()
                     WHERE follow_up_member_id = $1`,
                    [followUpMemberId]
                );
            }

            // Remove member from department
            const result = await client.query(
                'DELETE FROM follow_up_members WHERE id = $1 AND church_id = $2 RETURNING id',
                [followUpMemberId, churchId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Follow-up member not found', 404);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private async getMemberById(churchId: string, followUpMemberId: string): Promise<FollowUpMember> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT 
                    fm.*,
                    m.first_name,
                    m.last_name,
                    m.email,
                    m.phone,
                    m.profile_image_url,
                    (SELECT COUNT(*) FROM follow_up_assigned_members fam 
                     JOIN follow_up_assignments fa ON fam.assignment_id = fa.id
                     WHERE fam.follow_up_member_id = fm.id AND fa.status = 'active' AND fam.status = 'active') as active_count,
                    (SELECT COUNT(*) FROM follow_up_assigned_members fam 
                     WHERE fam.follow_up_member_id = fm.id) as total_count,
                    (SELECT COUNT(*) FROM follow_up_assigned_members fam 
                     JOIN follow_up_assignments fa ON fam.assignment_id = fa.id
                     WHERE fam.follow_up_member_id = fm.id AND fa.status = 'completed') as completed_count
                FROM follow_up_members fm
                JOIN members m ON fm.member_id = m.id
                WHERE fm.id = $1 AND fm.church_id = $2`,
                [followUpMemberId, churchId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Follow-up member not found', 404);
            }

            return this.mapMemberWithStats(result.rows[0]);
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // ASSIGNMENT MANAGEMENT
    // ========================================================================

    async getAssignments(
        churchId: string,
        filters: FollowUpFiltersDTO
    ): Promise<{ assignments: FollowUpAssignment[]; pagination: any }> {
        const client = await this.pool.connect();
        try {
            let whereConditions = ['fa.church_id = $1'];
            const params: any[] = [churchId];
            let paramIndex = 2;

            if (filters.search) {
                whereConditions.push(
                    `(ft.first_name ILIKE $${paramIndex} OR ft.last_name ILIKE $${paramIndex})`
                );
                params.push(`%${filters.search}%`);
                paramIndex++;
            }

            if (filters.status) {
                whereConditions.push(`fa.status = $${paramIndex}`);
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.priority) {
                whereConditions.push(`fa.priority = $${paramIndex}`);
                params.push(filters.priority);
                paramIndex++;
            }

            if (filters.assignedMemberId) {
                whereConditions.push(
                    `EXISTS (SELECT 1 FROM follow_up_assigned_members fam WHERE fam.assignment_id = fa.id AND fam.follow_up_member_id = $${paramIndex})`
                );
                params.push(filters.assignedMemberId);
                paramIndex++;
            }

            if (filters.dateFrom) {
                whereConditions.push(`fa.created_at >= $${paramIndex}`);
                params.push(filters.dateFrom);
                paramIndex++;
            }

            if (filters.dateTo) {
                whereConditions.push(`fa.created_at <= $${paramIndex}`);
                params.push(filters.dateTo);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // Count total
            const countResult = await client.query(
                `SELECT COUNT(*) as total
                 FROM follow_up_assignments fa
                 JOIN first_timers ft ON fa.first_timer_id = ft.id
                 WHERE ${whereClause}`,
                params
            );
            const total = parseInt(countResult.rows[0].total);

            // Get paginated results
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;

            params.push(limit, offset);

            const result = await client.query(
                `SELECT 
                    fa.*,
                    ft.first_name as ft_first_name,
                    ft.last_name as ft_last_name,
                    ft.email as ft_email,
                    ft.phone as ft_phone,
                    ft.first_visit_date as ft_first_visit_date,
                    ft.status as ft_status,
                    ft.follow_up_status as ft_follow_up_status,
                    ft.how_did_you_hear as ft_how_did_you_hear,
                    ft.address as ft_address,
                    ft.notes as ft_notes
                 FROM follow_up_assignments fa
                 JOIN first_timers ft ON fa.first_timer_id = ft.id
                 WHERE ${whereClause}
                 ORDER BY 
                    CASE fa.priority 
                        WHEN 'urgent' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        WHEN 'low' THEN 4 
                    END,
                    fa.created_at DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );

            // Get assigned members for each assignment
            const assignments = await Promise.all(
                result.rows.map(async (row) => {
                    const assignedMembers = await this.getAssignedMembers(client, row.id);
                    return this.mapAssignment(row, assignedMembers);
                })
            );

            return {
                assignments,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } finally {
            client.release();
        }
    }

    async getAssignmentById(churchId: string, assignmentId: string): Promise<FollowUpAssignment> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT 
                    fa.*,
                    ft.first_name as ft_first_name,
                    ft.last_name as ft_last_name,
                    ft.email as ft_email,
                    ft.phone as ft_phone,
                    ft.first_visit_date as ft_first_visit_date,
                    ft.status as ft_status,
                    ft.follow_up_status as ft_follow_up_status,
                    ft.how_did_you_hear as ft_how_did_you_hear,
                    ft.address as ft_address,
                    ft.notes as ft_notes
                 FROM follow_up_assignments fa
                 JOIN first_timers ft ON fa.first_timer_id = ft.id
                 WHERE fa.id = $1 AND fa.church_id = $2`,
                [assignmentId, churchId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Assignment not found', 404);
            }

            const assignedMembers = await this.getAssignedMembers(client, assignmentId);
            return this.mapAssignment(result.rows[0], assignedMembers);
        } finally {
            client.release();
        }
    }

    async getAssignmentByFirstTimer(
        churchId: string,
        firstTimerId: string
    ): Promise<FollowUpAssignment | null> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT 
                    fa.*,
                    ft.first_name as ft_first_name,
                    ft.last_name as ft_last_name,
                    ft.email as ft_email,
                    ft.phone as ft_phone,
                    ft.first_visit_date as ft_first_visit_date,
                    ft.status as ft_status,
                    ft.follow_up_status as ft_follow_up_status,
                    ft.how_did_you_hear as ft_how_did_you_hear,
                    ft.address as ft_address,
                    ft.notes as ft_notes
                 FROM follow_up_assignments fa
                 JOIN first_timers ft ON fa.first_timer_id = ft.id
                 WHERE fa.first_timer_id = $1 AND fa.church_id = $2 AND fa.status = 'active'
                 ORDER BY fa.created_at DESC
                 LIMIT 1`,
                [firstTimerId, churchId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const assignedMembers = await this.getAssignedMembers(client, result.rows[0].id);
            return this.mapAssignment(result.rows[0], assignedMembers);
        } finally {
            client.release();
        }
    }

    async createAssignment(
        churchId: string,
        userId: string,
        data: CreateAssignmentDTO
    ): Promise<FollowUpAssignment> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify first timer exists and belongs to church
            const ftCheck = await client.query(
                'SELECT id, status FROM first_timers WHERE id = $1 AND church_id = $2',
                [data.firstTimerId, churchId]
            );

            if (ftCheck.rows.length === 0) {
                throw new AppError('First timer not found', 404);
            }

            // Check if active assignment already exists
            const existingCheck = await client.query(
                `SELECT id FROM follow_up_assignments 
                 WHERE first_timer_id = $1 AND church_id = $2 AND status = 'active'`,
                [data.firstTimerId, churchId]
            );

            if (existingCheck.rows.length > 0) {
                throw new AppError('An active assignment already exists for this first timer', 400);
            }

            // Verify all assigned members are in follow-up department
            const department = await this.getOrCreateDepartment(churchId);
            const memberCheck = await client.query(
                `SELECT id FROM follow_up_members 
                 WHERE department_id = $1 AND id = ANY($2) AND status = 'active'`,
                [department.id, data.assignedMemberIds]
            );

            if (memberCheck.rows.length !== data.assignedMemberIds.length) {
                throw new AppError('Some assigned members are not in the follow-up department', 400);
            }

            // Create assignment
            const assignmentResult = await client.query(
                `INSERT INTO follow_up_assignments 
                 (church_id, first_timer_id, priority, due_date, notes, tags, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    churchId,
                    data.firstTimerId,
                    data.priority || 'medium',
                    data.dueDate || null,
                    data.notes || null,
                    data.tags || null,
                    userId,
                ]
            );

            const assignmentId = assignmentResult.rows[0].id;

            // Create assigned member records
            const primaryMemberId = data.primaryMemberId || data.assignedMemberIds[0];
            for (const memberId of data.assignedMemberIds) {
                await client.query(
                    `INSERT INTO follow_up_assigned_members 
                     (assignment_id, follow_up_member_id, is_primary)
                     VALUES ($1, $2, $3)`,
                    [assignmentId, memberId, memberId === primaryMemberId]
                );
            }

            // Update first timer follow_up_status
            await client.query(
                `UPDATE first_timers SET follow_up_status = 'scheduled', updated_at = NOW()
                 WHERE id = $1`,
                [data.firstTimerId]
            );

            await client.query('COMMIT');

            // Send notifications to assigned members
            await this.notifyAssignedMembers(churchId, assignmentId, data.assignedMemberIds);

            return await this.getAssignmentById(churchId, assignmentId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async bulkCreateAssignments(
        churchId: string,
        userId: string,
        data: BulkCreateAssignmentsDTO
    ): Promise<{ created: number; assignments: FollowUpAssignment[] }> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const department = await this.getOrCreateDepartment(churchId);
            const assignments: FollowUpAssignment[] = [];

            // Get member workload for distribution
            let memberWorkload: Map<string, number> = new Map();
            if (data.autoDistribute) {
                const workloadResult = await client.query(
                    `SELECT fm.id, COUNT(fam.id) as count
                     FROM follow_up_members fm
                     LEFT JOIN follow_up_assigned_members fam ON fm.id = fam.follow_up_member_id
                     LEFT JOIN follow_up_assignments fa ON fam.assignment_id = fa.id AND fa.status = 'active'
                     WHERE fm.department_id = $1 AND fm.id = ANY($2) AND fm.status = 'active'
                     GROUP BY fm.id`,
                    [department.id, data.assignedMemberIds]
                );
                workloadResult.rows.forEach((row) => {
                    memberWorkload.set(row.id, parseInt(row.count));
                });
            }

            for (const firstTimerId of data.firstTimerIds) {
                // Check if already has active assignment
                const existingCheck = await client.query(
                    `SELECT id FROM follow_up_assignments 
                     WHERE first_timer_id = $1 AND church_id = $2 AND status = 'active'`,
                    [firstTimerId, churchId]
                );

                if (existingCheck.rows.length > 0) {
                    continue; // Skip if already assigned
                }

                let assignedMemberIds: string[];
                if (data.autoDistribute && data.assignedMemberIds.length > 1) {
                    // Assign to member with lowest workload
                    const sortedMembers = [...memberWorkload.entries()]
                        .sort((a, b) => a[1] - b[1]);
                    assignedMemberIds = [sortedMembers[0][0]];
                    memberWorkload.set(sortedMembers[0][0], sortedMembers[0][1] + 1);
                } else {
                    assignedMemberIds = data.assignedMemberIds;
                }

                // Create assignment
                const assignmentResult = await client.query(
                    `INSERT INTO follow_up_assignments 
                     (church_id, first_timer_id, priority, due_date, created_by)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                    [
                        churchId,
                        firstTimerId,
                        data.priority || 'medium',
                        data.dueDate || null,
                        userId,
                    ]
                );

                const assignmentId = assignmentResult.rows[0].id;

                // Create assigned member records
                for (let i = 0; i < assignedMemberIds.length; i++) {
                    await client.query(
                        `INSERT INTO follow_up_assigned_members 
                         (assignment_id, follow_up_member_id, is_primary)
                         VALUES ($1, $2, $3)`,
                        [assignmentId, assignedMemberIds[i], i === 0]
                    );
                }

                // Update first timer
                await client.query(
                    `UPDATE first_timers SET follow_up_status = 'scheduled', updated_at = NOW()
                     WHERE id = $1`,
                    [firstTimerId]
                );

                assignments.push(await this.getAssignmentById(churchId, assignmentId));
            }

            await client.query('COMMIT');

            return {
                created: assignments.length,
                assignments,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateAssignment(
        churchId: string,
        assignmentId: string,
        data: UpdateAssignmentDTO
    ): Promise<FollowUpAssignment> {
        const client = await this.pool.connect();
        try {
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (data.priority !== undefined) {
                updates.push(`priority = $${paramIndex++}`);
                params.push(data.priority);
            }

            if (data.status !== undefined) {
                updates.push(`status = $${paramIndex++}`);
                params.push(data.status);
                if (data.status === 'completed') {
                    updates.push(`completed_at = NOW()`);
                }
            }

            if (data.dueDate !== undefined) {
                updates.push(`due_date = $${paramIndex++}`);
                params.push(data.dueDate);
            }

            if (data.notes !== undefined) {
                updates.push(`notes = $${paramIndex++}`);
                params.push(data.notes);
            }

            if (data.tags !== undefined) {
                updates.push(`tags = $${paramIndex++}`);
                params.push(data.tags);
            }

            if (updates.length === 0) {
                return await this.getAssignmentById(churchId, assignmentId);
            }

            params.push(assignmentId, churchId);

            await client.query(
                `UPDATE follow_up_assignments
                 SET ${updates.join(', ')}, updated_at = NOW()
                 WHERE id = $${paramIndex++} AND church_id = $${paramIndex}`,
                params
            );

            return await this.getAssignmentById(churchId, assignmentId);
        } finally {
            client.release();
        }
    }

    async completeAssignment(
        churchId: string,
        assignmentId: string,
        notes?: string
    ): Promise<FollowUpAssignment> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `UPDATE follow_up_assignments
                 SET status = 'completed', completed_at = NOW(), completion_notes = $1, updated_at = NOW()
                 WHERE id = $2 AND church_id = $3
                 RETURNING first_timer_id`,
                [notes || null, assignmentId, churchId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Assignment not found', 404);
            }

            // Update assigned members
            await client.query(
                `UPDATE follow_up_assigned_members
                 SET status = 'completed', completed_at = NOW()
                 WHERE assignment_id = $1`,
                [assignmentId]
            );

            // Update first timer status
            await client.query(
                `UPDATE first_timers 
                 SET follow_up_status = 'completed', updated_at = NOW()
                 WHERE id = $1`,
                [result.rows[0].first_timer_id]
            );

            await client.query('COMMIT');

            return await this.getAssignmentById(churchId, assignmentId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async reassignMember(
        churchId: string,
        assignmentId: string,
        data: { removeMemberId?: string; addMemberId?: string; makePrimary?: boolean }
    ): Promise<FollowUpAssignment> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify assignment exists
            const assignment = await this.getAssignmentById(churchId, assignmentId);

            if (data.removeMemberId) {
                await client.query(
                    `UPDATE follow_up_assigned_members
                     SET status = 'removed', updated_at = NOW()
                     WHERE assignment_id = $1 AND follow_up_member_id = $2`,
                    [assignmentId, data.removeMemberId]
                );
            }

            if (data.addMemberId) {
                // Check if already assigned
                const existing = await client.query(
                    `SELECT id, status FROM follow_up_assigned_members
                     WHERE assignment_id = $1 AND follow_up_member_id = $2`,
                    [assignmentId, data.addMemberId]
                );

                if (existing.rows.length > 0) {
                    if (existing.rows[0].status === 'removed') {
                        await client.query(
                            `UPDATE follow_up_assigned_members
                             SET status = 'active', is_primary = $1, updated_at = NOW()
                             WHERE assignment_id = $2 AND follow_up_member_id = $3`,
                            [data.makePrimary || false, assignmentId, data.addMemberId]
                        );
                    }
                } else {
                    await client.query(
                        `INSERT INTO follow_up_assigned_members
                         (assignment_id, follow_up_member_id, is_primary)
                         VALUES ($1, $2, $3)`,
                        [assignmentId, data.addMemberId, data.makePrimary || false]
                    );
                }

                if (data.makePrimary) {
                    // Remove primary from others
                    await client.query(
                        `UPDATE follow_up_assigned_members
                         SET is_primary = false
                         WHERE assignment_id = $1 AND follow_up_member_id != $2`,
                        [assignmentId, data.addMemberId]
                    );
                }
            }

            await client.query('COMMIT');

            return await this.getAssignmentById(churchId, assignmentId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // ACTIVITIES & COMMUNICATION
    // ========================================================================

    async getActivities(
        churchId: string,
        assignmentId: string,
        filters: ActivityFiltersDTO
    ): Promise<{ activities: FollowUpActivity[]; pagination: any }> {
        const client = await this.pool.connect();
        try {
            let whereConditions = ['fua.assignment_id = $1', 'fua.church_id = $2'];
            const params: any[] = [assignmentId, churchId];
            let paramIndex = 3;

            if (filters.channel) {
                whereConditions.push(`fua.channel = $${paramIndex}`);
                params.push(filters.channel);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // Count
            const countResult = await client.query(
                `SELECT COUNT(*) as total FROM follow_up_activities fua WHERE ${whereClause}`,
                params
            );
            const total = parseInt(countResult.rows[0].total);

            // Paginated results
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;

            params.push(limit, offset);

            const result = await client.query(
                `SELECT 
                    fua.*,
                    u.first_name as performer_first_name,
                    u.last_name as performer_last_name
                 FROM follow_up_activities fua
                 LEFT JOIN users u ON fua.performed_by = u.id
                 WHERE ${whereClause}
                 ORDER BY fua.created_at DESC
                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );

            return {
                activities: result.rows.map((row) => this.mapActivity(row)),
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } finally {
            client.release();
        }
    }

    async sendMessage(
        churchId: string,
        userId: string,
        data: SendMessageDTO
    ): Promise<FollowUpActivity> {
        const client = await this.pool.connect();
        try {
            // Verify assignment exists
            const assignment = await this.getAssignmentById(churchId, data.assignmentId);

            // Get first timer contact info
            const ftResult = await client.query(
                'SELECT first_name, last_name, email, phone FROM first_timers WHERE id = $1',
                [data.firstTimerId]
            );

            if (ftResult.rows.length === 0) {
                throw new AppError('First timer not found', 404);
            }

            const firstTimer = ftResult.rows[0];
            let externalMessageId: string | undefined;
            let deliveryStatus = 'pending';
            let activityStatus: 'completed' | 'failed' = 'completed';

            // Send message based on channel
            try {
                switch (data.channel) {
                    case 'sms':
                        if (!firstTimer.phone) {
                            throw new AppError('First timer has no phone number', 400);
                        }
                        const smsResult = await this.messagingService.sendSMS(
                            firstTimer.phone,
                            data.content
                        );
                        externalMessageId = smsResult.messageId;
                        deliveryStatus = smsResult.status;
                        break;

                    case 'whatsapp':
                        if (!firstTimer.phone) {
                            throw new AppError('First timer has no phone number', 400);
                        }
                        const waResult = await this.messagingService.sendWhatsApp(
                            firstTimer.phone,
                            data.content
                        );
                        externalMessageId = waResult.messageId;
                        deliveryStatus = waResult.status;
                        break;

                    case 'email':
                        if (!firstTimer.email) {
                            throw new AppError('First timer has no email address', 400);
                        }
                        const emailResult = await this.messagingService.sendEmail(
                            firstTimer.email,
                            data.subject || 'Message from Church',
                            data.content
                        );
                        externalMessageId = emailResult.messageId;
                        deliveryStatus = emailResult.status;
                        break;

                    default:
                        // For other channels, just record the activity
                        break;
                }
            } catch (error: any) {
                activityStatus = 'failed';
                deliveryStatus = 'failed';
            }

            // Record activity
            const result = await client.query(
                `INSERT INTO follow_up_activities
                 (assignment_id, first_timer_id, church_id, performed_by, channel, activity_type, status, subject, content, external_message_id, delivery_status, scheduled_at)
                 VALUES ($1, $2, $3, $4, $5, 'message_sent', $6, $7, $8, $9, $10, $11)
                 RETURNING *`,
                [
                    data.assignmentId,
                    data.firstTimerId,
                    churchId,
                    userId,
                    data.channel,
                    activityStatus,
                    data.subject || null,
                    data.content,
                    externalMessageId || null,
                    deliveryStatus,
                    data.scheduledAt || null,
                ]
            );

            // Update first timer follow_up_status if needed
            await client.query(
                `UPDATE first_timers 
                 SET follow_up_status = 'contacted', last_contact_date = NOW(), updated_at = NOW()
                 WHERE id = $1 AND follow_up_status IN ('pending', 'scheduled')`,
                [data.firstTimerId]
            );

            // Get performer info
            const userResult = await client.query(
                'SELECT first_name, last_name FROM users WHERE id = $1',
                [userId]
            );

            return this.mapActivity({
                ...result.rows[0],
                performer_first_name: userResult.rows[0]?.first_name,
                performer_last_name: userResult.rows[0]?.last_name,
            });
        } finally {
            client.release();
        }
    }

    async recordActivity(
        churchId: string,
        userId: string,
        data: RecordActivityDTO
    ): Promise<FollowUpActivity> {
        const client = await this.pool.connect();
        try {
            // Verify assignment exists
            await this.getAssignmentById(churchId, data.assignmentId);

            const result = await client.query(
                `INSERT INTO follow_up_activities
                 (assignment_id, first_timer_id, church_id, performed_by, channel, activity_type, status, subject, content, duration_minutes, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *`,
                [
                    data.assignmentId,
                    data.firstTimerId,
                    churchId,
                    userId,
                    data.channel,
                    data.activityType,
                    data.status,
                    data.subject || null,
                    data.content || null,
                    data.durationMinutes || null,
                    data.metadata ? JSON.stringify(data.metadata) : null,
                ]
            );

            // Update first timer last_contact_date
            await client.query(
                `UPDATE first_timers 
                 SET follow_up_status = 'contacted', last_contact_date = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [data.firstTimerId]
            );

            // Get performer info
            const userResult = await client.query(
                'SELECT first_name, last_name FROM users WHERE id = $1',
                [userId]
            );

            return this.mapActivity({
                ...result.rows[0],
                performer_first_name: userResult.rows[0]?.first_name,
                performer_last_name: userResult.rows[0]?.last_name,
            });
        } finally {
            client.release();
        }
    }

    async recordResponse(
        churchId: string,
        activityId: string,
        response: string
    ): Promise<FollowUpActivity> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `UPDATE follow_up_activities
                 SET response = $1, response_at = NOW(), updated_at = NOW()
                 WHERE id = $2 AND church_id = $3
                 RETURNING *`,
                [response, activityId, churchId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Activity not found', 404);
            }

            const userResult = await client.query(
                'SELECT first_name, last_name FROM users WHERE id = $1',
                [result.rows[0].performed_by]
            );

            return this.mapActivity({
                ...result.rows[0],
                performer_first_name: userResult.rows[0]?.first_name,
                performer_last_name: userResult.rows[0]?.last_name,
            });
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // MESSAGE TEMPLATES
    // ========================================================================

    async getTemplates(churchId: string, channel?: string): Promise<MessageTemplate[]> {
        const client = await this.pool.connect();
        try {
            let query = 'SELECT * FROM follow_up_templates WHERE church_id = $1 AND is_active = true';
            const params: any[] = [churchId];

            if (channel) {
                query += ' AND channel = $2';
                params.push(channel);
            }

            query += ' ORDER BY is_default DESC, name ASC';

            const result = await client.query(query, params);
            return result.rows.map(this.mapTemplate);
        } finally {
            client.release();
        }
    }

    async createTemplate(
        churchId: string,
        userId: string,
        data: CreateTemplateDTO
    ): Promise<MessageTemplate> {
        const client = await this.pool.connect();
        try {
            // Extract variables from content
            const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
            const variables = variableMatches.map((v) => v.replace(/\{\{|\}\}/g, ''));

            const result = await client.query(
                `INSERT INTO follow_up_templates
                 (church_id, name, channel, subject, content, variables, is_default, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    churchId,
                    data.name,
                    data.channel,
                    data.subject || null,
                    data.content,
                    variables,
                    data.is_default || false,
                    userId,
                ]
            );

            return this.mapTemplate(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async updateTemplate(
        churchId: string,
        templateId: string,
        data: UpdateTemplateDTO
    ): Promise<MessageTemplate> {
        const client = await this.pool.connect();
        try {
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (data.name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                params.push(data.name);
            }

            if (data.subject !== undefined) {
                updates.push(`subject = $${paramIndex++}`);
                params.push(data.subject);
            }

            if (data.content !== undefined) {
                updates.push(`content = $${paramIndex++}`);
                params.push(data.content);

                // Update variables
                const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
                const variables = variableMatches.map((v) => v.replace(/\{\{|\}\}/g, ''));
                updates.push(`variables = $${paramIndex++}`);
                params.push(variables);
            }

            if (data.is_default !== undefined) {
                updates.push(`is_default = $${paramIndex++}`);
                params.push(data.is_default);
            }

            if (data.is_active !== undefined) {
                updates.push(`is_active = $${paramIndex++}`);
                params.push(data.is_active);
            }

            if (updates.length === 0) {
                throw new AppError('No updates provided', 400);
            }

            params.push(templateId, churchId);

            const result = await client.query(
                `UPDATE follow_up_templates
                 SET ${updates.join(', ')}, updated_at = NOW()
                 WHERE id = $${paramIndex++} AND church_id = $${paramIndex}
                 RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new AppError('Template not found', 404);
            }

            return this.mapTemplate(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async deleteTemplate(churchId: string, templateId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'DELETE FROM follow_up_templates WHERE id = $1 AND church_id = $2 RETURNING id',
                [templateId, churchId]
            );

            if (result.rows.length === 0) {
                throw new AppError('Template not found', 404);
            }
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // STATISTICS
    // ========================================================================

    async getStatistics(churchId: string): Promise<FollowUpStatistics> {
        const client = await this.pool.connect();
        try {
            // Basic counts
            const countsResult = await client.query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'active') as active,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'active' AND due_date < NOW()) as overdue
                 FROM follow_up_assignments
                 WHERE church_id = $1`,
                [churchId]
            );

            const counts = countsResult.rows[0];

            // Average completion days
            const avgResult = await client.query(
                `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) as avg_days
                 FROM follow_up_assignments
                 WHERE church_id = $1 AND status = 'completed' AND completed_at IS NOT NULL`,
                [churchId]
            );

            // Activities by channel
            const channelResult = await client.query(
                `SELECT channel, COUNT(*) as count
                 FROM follow_up_activities
                 WHERE church_id = $1
                 GROUP BY channel`,
                [churchId]
            );

            const activitiesByChannel: Record<string, number> = {};
            let totalActivities = 0;
            channelResult.rows.forEach((row) => {
                activitiesByChannel[row.channel] = parseInt(row.count);
                totalActivities += parseInt(row.count);
            });

            // Member performance
            const performanceResult = await client.query(
                `SELECT 
                    fm.id as member_id,
                    m.first_name || ' ' || m.last_name as member_name,
                    COUNT(*) FILTER (WHERE fa.status = 'active') as active_count,
                    COUNT(*) FILTER (WHERE fa.status = 'completed') as completed_count
                 FROM follow_up_members fm
                 JOIN members m ON fm.member_id = m.id
                 LEFT JOIN follow_up_assigned_members fam ON fm.id = fam.follow_up_member_id
                 LEFT JOIN follow_up_assignments fa ON fam.assignment_id = fa.id
                 WHERE fm.church_id = $1
                 GROUP BY fm.id, m.first_name, m.last_name`,
                [churchId]
            );

            const memberPerformance = performanceResult.rows.map((row) => ({
                memberId: row.member_id,
                memberName: row.member_name,
                activeCount: parseInt(row.active_count) || 0,
                completedCount: parseInt(row.completed_count) || 0,
                successRate:
                    parseInt(row.active_count) + parseInt(row.completed_count) > 0
                        ? Math.round(
                            (parseInt(row.completed_count) /
                                (parseInt(row.active_count) + parseInt(row.completed_count))) *
                            100
                        )
                        : 0,
            }));

            // Weekly trend (last 8 weeks)
            const trendResult = await client.query(
                `SELECT 
                    TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') as week,
                    COUNT(*) FILTER (WHERE status IS NOT NULL) as new_assignments,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed
                 FROM follow_up_assignments
                 WHERE church_id = $1 AND created_at >= NOW() - INTERVAL '8 weeks'
                 GROUP BY DATE_TRUNC('week', created_at)
                 ORDER BY DATE_TRUNC('week', created_at)`,
                [churchId]
            );

            const weeklyTrend = trendResult.rows.map((row) => ({
                week: row.week,
                newAssignments: parseInt(row.new_assignments),
                completed: parseInt(row.completed),
            }));

            const total = parseInt(counts.total) || 0;
            const completed = parseInt(counts.completed) || 0;

            return {
                totalAssignments: total,
                activeAssignments: parseInt(counts.active) || 0,
                completedAssignments: completed,
                overdueAssignments: parseInt(counts.overdue) || 0,
                averageCompletionDays: Math.round(parseFloat(avgResult.rows[0]?.avg_days) || 0),
                totalActivities,
                activitiesByChannel: activitiesByChannel as Record<FollowUpChannel, number>,
                successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                memberPerformance,
                weeklyTrend,
            };
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // UNASSIGNED FIRST TIMERS
    // ========================================================================

    async getUnassignedFirstTimers(churchId: string): Promise<any[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                `SELECT ft.*
                 FROM first_timers ft
                 WHERE ft.church_id = $1
                 AND ft.status != 'converted'
                 AND NOT EXISTS (
                     SELECT 1 FROM follow_up_assignments fa
                     WHERE fa.first_timer_id = ft.id
                     AND fa.status = 'active'
                 )
                 ORDER BY ft.first_visit_date DESC`,
                [churchId]
            );

            return result.rows;
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // MY ASSIGNMENTS (For follow-up members)
    // ========================================================================

    async getMyAssignments(
        churchId: string,
        userId: string,
        filters: FollowUpFiltersDTO
    ): Promise<{ assignments: FollowUpAssignment[]; pagination: any }> {
        const client = await this.pool.connect();
        try {
            // First, get the follow-up member ID for this user
            const memberResult = await client.query(
                `SELECT fm.id FROM follow_up_members fm
                 JOIN members m ON fm.member_id = m.id
                 WHERE fm.church_id = $1 AND m.user_id = $2`,
                [churchId, userId]
            );

            if (memberResult.rows.length === 0) {
                return { assignments: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
            }

            const followUpMemberId = memberResult.rows[0].id;

            // Modify filters to include this member
            const modifiedFilters = { ...filters, assignedMemberId: followUpMemberId };
            return await this.getAssignments(churchId, modifiedFilters);
        } finally {
            client.release();
        }
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    private async getAssignedMembers(
        client: PoolClient,
        assignmentId: string
    ): Promise<AssignedMember[]> {
        const result = await client.query(
            `SELECT 
                fam.*,
                m.first_name,
                m.last_name,
                m.email,
                m.phone,
                m.profile_image_url
             FROM follow_up_assigned_members fam
             JOIN follow_up_members fm ON fam.follow_up_member_id = fm.id
             JOIN members m ON fm.member_id = m.id
             WHERE fam.assignment_id = $1 AND fam.status != 'removed'
             ORDER BY fam.is_primary DESC, fam.assigned_at`,
            [assignmentId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            assignment_id: row.assignment_id,
            follow_up_member_id: row.follow_up_member_id,
            is_primary: row.is_primary,
            status: row.status,
            assigned_at: row.assigned_at,
            completed_at: row.completed_at,
            member: {
                id: row.follow_up_member_id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                phone: row.phone,
                profile_image_url: row.profile_image_url,
            },
        }));
    }

    private async notifyAssignedMembers(
        churchId: string,
        assignmentId: string,
        memberIds: string[]
    ): Promise<void> {
        // Implementation for notifications (email, push, etc.)
        try {
            const assignment = await this.getAssignmentById(churchId, assignmentId);

            for (const memberId of memberIds) {
                await this.notificationService.sendNotification({
                    userId: memberId,
                    type: 'new_follow_up_assignment',
                    title: 'New Follow-Up Assignment',
                    message: `You have been assigned to follow up with ${assignment.first_timer?.first_name} ${assignment.first_timer?.last_name}`,
                    data: { assignmentId, firstTimerId: assignment.first_timer_id },
                });
            }
        } catch (error) {
            console.error('Failed to send notifications:', error);
        }
    }

    private mapDepartment(row: any): FollowUpDepartment {
        return {
            id: row.id,
            church_id: row.church_id,
            name: row.name,
            description: row.description,
            is_active: row.is_active,
            settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    private mapMemberWithStats(row: any): FollowUpMember {
        const total = parseInt(row.total_count) || 0;
        const completed = parseInt(row.completed_count) || 0;

        return {
            id: row.id,
            department_id: row.department_id,
            member_id: row.member_id,
            church_id: row.church_id,
            role: row.role,
            status: row.status,
            joined_at: row.joined_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            member: {
                id: row.member_id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                phone: row.phone,
                profile_image_url: row.profile_image_url,
            },
            active_assignments_count: parseInt(row.active_count) || 0,
            total_assignments_count: total,
            completed_assignments_count: completed,
            success_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }

    private mapAssignment(row: any, assignedMembers: AssignedMember[]): FollowUpAssignment {
        return {
            id: row.id,
            church_id: row.church_id,
            first_timer_id: row.first_timer_id,
            priority: row.priority,
            status: row.status,
            due_date: row.due_date,
            notes: row.notes,
            tags: row.tags,
            created_by: row.created_by,
            completed_at: row.completed_at,
            completion_notes: row.completion_notes,
            created_at: row.created_at,
            updated_at: row.updated_at,
            first_timer: {
                id: row.first_timer_id,
                first_name: row.ft_first_name,
                last_name: row.ft_last_name,
                email: row.ft_email,
                phone: row.ft_phone,
                first_visit_date: row.ft_first_visit_date,
                status: row.ft_status,
                follow_up_status: row.ft_follow_up_status,
                how_did_you_hear: row.ft_how_did_you_hear,
                address: row.ft_address,
                notes: row.ft_notes,
            },
            assigned_members: assignedMembers,
        };
    }

    private mapActivity(row: any): FollowUpActivity {
        return {
            id: row.id,
            assignment_id: row.assignment_id,
            first_timer_id: row.first_timer_id,
            church_id: row.church_id,
            performed_by: row.performed_by,
            channel: row.channel,
            activity_type: row.activity_type,
            status: row.status,
            subject: row.subject,
            content: row.content,
            response: row.response,
            response_at: row.response_at,
            duration_minutes: row.duration_minutes,
            metadata: row.metadata,
            scheduled_at: row.scheduled_at,
            external_message_id: row.external_message_id,
            delivery_status: row.delivery_status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            performer: row.performer_first_name
                ? {
                    id: row.performed_by,
                    first_name: row.performer_first_name,
                    last_name: row.performer_last_name,
                }
                : undefined,
        };
    }

    private mapTemplate(row: any): MessageTemplate {
        return {
            id: row.id,
            church_id: row.church_id,
            name: row.name,
            channel: row.channel,
            subject: row.subject,
            content: row.content,
            variables: row.variables || [],
            is_default: row.is_default,
            is_active: row.is_active,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}