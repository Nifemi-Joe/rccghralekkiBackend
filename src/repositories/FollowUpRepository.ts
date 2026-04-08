// src/repositories/FollowUpRepository.ts

import { pool } from '@config/database';
import {
    FollowUpDepartment,
    FollowUpDepartmentSettings,
    FollowUpMember,
    FollowUpAssignment,
    AssignedMember,
    FollowUpActivity,
    MessageTemplate,
    FollowUpStatistics,
    FollowUpFilters,
    ActivityFilters,
    PaginatedAssignments,
    PaginatedActivities,
    CreateFollowUpMemberDTO,
    CreateAssignmentDTO,
    UpdateAssignmentDTO,
    SendMessageDTO,
    RecordActivityDTO,
    CreateTemplateDTO,
    UpdateTemplateDTO,
    UpdateDepartmentSettingsDTO,
    FollowUpDepartmentRow,
    FollowUpMemberRow,
    FollowUpAssignmentRow,
    AssignedMemberRow,
    FollowUpActivityRow,
    MessageTemplateRow,
    FollowUpChannel,
    FollowUpPriority,
} from '@/dtos/followup.types';
import logger from '@config/logger';

export class FollowUpRepository {
    // ============================================================================
    // DEPARTMENT
    // ============================================================================

    async getOrCreateDepartment(churchId: string): Promise<FollowUpDepartment> {
        const client = await pool.connect();
        try {
            // Check if department exists
            let result = await client.query(
                'SELECT * FROM follow_up_departments WHERE church_id = $1',
                [churchId]
            );

            if (result.rows.length > 0) {
                return this.mapDepartment(result.rows[0]);
            }

            // Create new department with default settings
            const defaultSettings: FollowUpDepartmentSettings = {
                autoAssign: false,
                maxAssignmentsPerMember: 10,
                followUpDeadlineDays: 7,
                reminderIntervals: [1, 3, 7],
                defaultMessageTemplates: {},
                notificationPreferences: {
                    notifyOnNewAssignment: true,
                    notifyOnDeadline: true,
                    notifyOnResponse: true,
                },
            };

            result = await client.query(
                `INSERT INTO follow_up_departments (church_id, name, description, settings)
                 VALUES ($1, 'Follow Up Department', 'Department responsible for following up with first-time visitors', $2)
                 RETURNING *`,
                [churchId, JSON.stringify(defaultSettings)]
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
        const client = await pool.connect();
        try {
            // Get current settings
            const current = await this.getOrCreateDepartment(churchId);

            // Merge settings (converting to snake_case for DB storage if needed)
            const newSettings: FollowUpDepartmentSettings = {
                ...current.settings,
                ...settings,
                notificationPreferences: {
                    ...current.settings.notificationPreferences,
                    ...(settings.notificationPreferences || {}),
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

    // ============================================================================
    // MEMBERS
    // ============================================================================

    async getMembers(
        churchId: string,
        filters?: { search?: string; status?: string }
    ): Promise<FollowUpMember[]> {
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

        const { rows } = await pool.query(query, params);
        return rows.map((row: FollowUpMemberRow) => this.mapMemberWithStats(row));
    }

    async getMemberById(churchId: string, followUpMemberId: string): Promise<FollowUpMember | null> {
        const query = `
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
            WHERE fm.id = $1 AND fm.church_id = $2
        `;
        const { rows } = await pool.query(query, [followUpMemberId, churchId]);

        if (rows.length === 0) return null;
        return this.mapMemberWithStats(rows[0]);
    }

    async addMember(
        churchId: string,
        data: CreateFollowUpMemberDTO,
        userId?: string
    ): Promise<FollowUpMember> {
        const client = await pool.connect();
        try {
            const department = await this.getOrCreateDepartment(churchId);

            // Check if member exists in church
            const memberCheck = await client.query(
                'SELECT id FROM members WHERE id = $1 AND church_id = $2',
                [data.memberId, churchId]
            );

            if (memberCheck.rows.length === 0) {
                throw new Error('Member not found in this church');
            }

            // Check if already in department
            const existingCheck = await client.query(
                'SELECT id FROM follow_up_members WHERE department_id = $1 AND member_id = $2',
                [department.id, data.memberId]
            );

            if (existingCheck.rows.length > 0) {
                throw new Error('Member is already in the follow-up department');
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
                active_count: '0',
                total_count: '0',
                completed_count: '0',
            });
        } finally {
            client.release();
        }
    }

    async updateMember(
        churchId: string,
        followUpMemberId: string,
        data: { role?: string; status?: string }
    ): Promise<FollowUpMember | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.role !== undefined) {
            setClauses.push(`role = $${paramIndex++}`);
            params.push(data.role);
        }

        if (data.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            params.push(data.status);
        }

        if (setClauses.length === 0) {
            return this.getMemberById(churchId, followUpMemberId);
        }

        setClauses.push('updated_at = NOW()');
        params.push(followUpMemberId, churchId);

        await pool.query(
            `UPDATE follow_up_members
             SET ${setClauses.join(', ')}
             WHERE id = $${paramIndex++} AND church_id = $${paramIndex}`,
            params
        );

        return this.getMemberById(churchId, followUpMemberId);
    }

    async removeMember(churchId: string, followUpMemberId: string): Promise<boolean> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mark assignments as removed
            await client.query(
                `UPDATE follow_up_assigned_members
                 SET status = 'removed', updated_at = NOW()
                 WHERE follow_up_member_id = $1`,
                [followUpMemberId]
            );

            // Remove member from department
            const result = await client.query(
                'DELETE FROM follow_up_members WHERE id = $1 AND church_id = $2 RETURNING id',
                [followUpMemberId, churchId]
            );

            await client.query('COMMIT');
            return result.rowCount !== null && result.rowCount > 0;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // ASSIGNMENTS
    // ============================================================================

    async getAssignments(churchId: string, filters: FollowUpFilters): Promise<PaginatedAssignments> {
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
                `EXISTS (SELECT 1 FROM follow_up_assigned_members fam WHERE fam.assignment_id = fa.id AND fam.follow_up_member_id = $${paramIndex} AND fam.status = 'active')`
            );
            params.push(filters.assignedMemberId);
            paramIndex++;
        }

        if (filters.overdue) {
            whereConditions.push(`fa.due_date < NOW() AND fa.status = 'active'`);
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
        const countResult = await pool.query(
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

        const result = await pool.query(
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
        const assignments: FollowUpAssignment[] = [];
        for (const row of result.rows) {
            const assignedMembers = await this.getAssignedMembers(row.id);
            assignments.push(this.mapAssignment(row, assignedMembers));
        }

        return {
            assignments,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getAssignmentById(churchId: string, assignmentId: string): Promise<FollowUpAssignment | null> {
        const result = await pool.query(
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

        if (result.rows.length === 0) return null;

        const assignedMembers = await this.getAssignedMembers(assignmentId);
        return this.mapAssignment(result.rows[0], assignedMembers);
    }

    async getAssignmentByFirstTimer(churchId: string, firstTimerId: string): Promise<FollowUpAssignment | null> {
        const result = await pool.query(
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

        if (result.rows.length === 0) return null;

        const assignedMembers = await this.getAssignedMembers(result.rows[0].id);
        return this.mapAssignment(result.rows[0], assignedMembers);
    }

    async createAssignment(
        churchId: string,
        data: CreateAssignmentDTO,
        userId: string
    ): Promise<FollowUpAssignment> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify first timer exists
            const ftCheck = await client.query(
                'SELECT id, status FROM first_timers WHERE id = $1 AND church_id = $2',
                [data.firstTimerId, churchId]
            );

            if (ftCheck.rows.length === 0) {
                throw new Error('First timer not found');
            }

            // Check if active assignment already exists
            const existingCheck = await client.query(
                `SELECT id FROM follow_up_assignments 
                 WHERE first_timer_id = $1 AND church_id = $2 AND status = 'active'`,
                [data.firstTimerId, churchId]
            );

            if (existingCheck.rows.length > 0) {
                throw new Error('An active assignment already exists for this first timer');
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

            return (await this.getAssignmentById(churchId, assignmentId))!;
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
    ): Promise<FollowUpAssignment | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.priority !== undefined) {
            setClauses.push(`priority = $${paramIndex++}`);
            params.push(data.priority);
        }

        if (data.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            params.push(data.status);
            if (data.status === 'completed') {
                setClauses.push(`completed_at = NOW()`);
            }
        }

        if (data.dueDate !== undefined) {
            setClauses.push(`due_date = $${paramIndex++}`);
            params.push(data.dueDate);
        }

        if (data.notes !== undefined) {
            setClauses.push(`notes = $${paramIndex++}`);
            params.push(data.notes);
        }

        if (data.tags !== undefined) {
            setClauses.push(`tags = $${paramIndex++}`);
            params.push(data.tags);
        }

        if (setClauses.length === 0) {
            return this.getAssignmentById(churchId, assignmentId);
        }

        setClauses.push('updated_at = NOW()');
        params.push(assignmentId, churchId);

        await pool.query(
            `UPDATE follow_up_assignments
             SET ${setClauses.join(', ')}
             WHERE id = $${paramIndex++} AND church_id = $${paramIndex}`,
            params
        );

        return this.getAssignmentById(churchId, assignmentId);
    }

    async completeAssignment(
        churchId: string,
        assignmentId: string,
        notes?: string
    ): Promise<FollowUpAssignment | null> {
        const client = await pool.connect();
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
                await client.query('ROLLBACK');
                return null;
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

            return this.getAssignmentById(churchId, assignmentId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    private async getAssignedMembers(assignmentId: string): Promise<AssignedMember[]> {
        const result = await pool.query(
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

        return result.rows.map((row: AssignedMemberRow) => ({
            id: row.id,
            assignmentId: row.assignment_id,
            followUpMemberId: row.follow_up_member_id,
            isPrimary: row.is_primary,
            status: row.status as 'active' | 'completed' | 'removed',
            assignedAt: row.assigned_at,
            completedAt: row.completed_at,
            member: {
                id: row.follow_up_member_id,
                firstName: row.first_name || '',
                lastName: row.last_name || '',
                email: row.email,
                phone: row.phone,
                profileImageUrl: row.profile_image_url,
            },
        }));
    }

    // ============================================================================
    // ACTIVITIES
    // ============================================================================

    async getActivities(
        churchId: string,
        assignmentId: string,
        filters: ActivityFilters
    ): Promise<PaginatedActivities> {
        let whereConditions = ['fua.assignment_id = $1', 'fua.church_id = $2'];
        const params: any[] = [assignmentId, churchId];
        let paramIndex = 3;

        if (filters.channel) {
            whereConditions.push(`fua.channel = $${paramIndex}`);
            params.push(filters.channel);
            paramIndex++;
        }

        if (filters.activityType) {
            whereConditions.push(`fua.activity_type = $${paramIndex}`);
            params.push(filters.activityType);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Count
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM follow_up_activities fua WHERE ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Paginated results
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;

        params.push(limit, offset);

        const result = await pool.query(
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
            activities: result.rows.map((row: FollowUpActivityRow) => this.mapActivity(row)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async createActivity(
        churchId: string,
        userId: string,
        data: RecordActivityDTO
    ): Promise<FollowUpActivity> {
        const result = await pool.query(
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
        await pool.query(
            `UPDATE first_timers 
             SET follow_up_status = 'contacted', last_contact_date = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [data.firstTimerId]
        );

        // Get performer info
        const userResult = await pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [userId]
        );

        return this.mapActivity({
            ...result.rows[0],
            performer_first_name: userResult.rows[0]?.first_name,
            performer_last_name: userResult.rows[0]?.last_name,
        });
    }

    async createMessageActivity(
        churchId: string,
        userId: string,
        data: {
            assignmentId: string;
            firstTimerId: string;
            channel: FollowUpChannel;
            subject?: string;
            content: string;
            status: string;
            externalMessageId?: string;
            deliveryStatus?: string;
            scheduledAt?: string;
        }
    ): Promise<FollowUpActivity> {
        const result = await pool.query(
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
                data.status,
                data.subject || null,
                data.content,
                data.externalMessageId || null,
                data.deliveryStatus || 'pending',
                data.scheduledAt || null,
            ]
        );

        // Update first timer
        await pool.query(
            `UPDATE first_timers 
             SET follow_up_status = 'contacted', last_contact_date = NOW(), updated_at = NOW()
             WHERE id = $1 AND follow_up_status IN ('pending', 'scheduled')`,
            [data.firstTimerId]
        );

        const userResult = await pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [userId]
        );

        return this.mapActivity({
            ...result.rows[0],
            performer_first_name: userResult.rows[0]?.first_name,
            performer_last_name: userResult.rows[0]?.last_name,
        });
    }

    async updateActivityDeliveryStatus(
        activityId: string,
        deliveryStatus: string,
        externalMessageId?: string
    ): Promise<void> {
        await pool.query(
            `UPDATE follow_up_activities
             SET delivery_status = $1, external_message_id = COALESCE($2, external_message_id), updated_at = NOW()
             WHERE id = $3`,
            [deliveryStatus, externalMessageId, activityId]
        );
    }

    async recordResponse(
        churchId: string,
        activityId: string,
        response: string
    ): Promise<FollowUpActivity | null> {
        const result = await pool.query(
            `UPDATE follow_up_activities
             SET response = $1, response_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND church_id = $3
             RETURNING *`,
            [response, activityId, churchId]
        );

        if (result.rows.length === 0) return null;

        const userResult = await pool.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [result.rows[0].performed_by]
        );

        return this.mapActivity({
            ...result.rows[0],
            performer_first_name: userResult.rows[0]?.first_name,
            performer_last_name: userResult.rows[0]?.last_name,
        });
    }

    // ============================================================================
    // TEMPLATES
    // ============================================================================

    async getTemplates(churchId: string, channel?: string): Promise<MessageTemplate[]> {
        let query = 'SELECT * FROM follow_up_templates WHERE church_id = $1 AND is_active = true';
        const params: any[] = [churchId];

        if (channel) {
            query += ' AND channel = $2';
            params.push(channel);
        }

        query += ' ORDER BY is_default DESC, name ASC';

        const { rows } = await pool.query(query, params);
        return rows.map((row: MessageTemplateRow) => this.mapTemplate(row));
    }

    async createTemplate(
        churchId: string,
        userId: string,
        data: CreateTemplateDTO
    ): Promise<MessageTemplate> {
        // Extract variables from content
        const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
        const variables = variableMatches.map((v) => v.replace(/\{\{|\}\}/g, ''));

        const result = await pool.query(
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
                data.isDefault || false,
                userId,
            ]
        );

        return this.mapTemplate(result.rows[0]);
    }

    async updateTemplate(
        churchId: string,
        templateId: string,
        data: UpdateTemplateDTO
    ): Promise<MessageTemplate | null> {
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            setClauses.push(`name = $${paramIndex++}`);
            params.push(data.name);
        }

        if (data.subject !== undefined) {
            setClauses.push(`subject = $${paramIndex++}`);
            params.push(data.subject);
        }

        if (data.content !== undefined) {
            setClauses.push(`content = $${paramIndex++}`);
            params.push(data.content);

            // Update variables
            const variableMatches = data.content.match(/\{\{(\w+)\}\}/g) || [];
            const variables = variableMatches.map((v) => v.replace(/\{\{|\}\}/g, ''));
            setClauses.push(`variables = $${paramIndex++}`);
            params.push(variables);
        }

        if (data.isDefault !== undefined) {
            setClauses.push(`is_default = $${paramIndex++}`);
            params.push(data.isDefault);
        }

        if (data.isActive !== undefined) {
            setClauses.push(`is_active = $${paramIndex++}`);
            params.push(data.isActive);
        }

        if (setClauses.length === 0) {
            const result = await pool.query(
                'SELECT * FROM follow_up_templates WHERE id = $1 AND church_id = $2',
                [templateId, churchId]
            );
            return result.rows[0] ? this.mapTemplate(result.rows[0]) : null;
        }

        setClauses.push('updated_at = NOW()');
        params.push(templateId, churchId);

        const result = await pool.query(
            `UPDATE follow_up_templates
             SET ${setClauses.join(', ')}
             WHERE id = $${paramIndex++} AND church_id = $${paramIndex}
             RETURNING *`,
            params
        );

        return result.rows[0] ? this.mapTemplate(result.rows[0]) : null;
    }

    async deleteTemplate(churchId: string, templateId: string): Promise<boolean> {
        const result = await pool.query(
            'DELETE FROM follow_up_templates WHERE id = $1 AND church_id = $2 RETURNING id',
            [templateId, churchId]
        );
        return result.rowCount !== null && result.rowCount > 0;
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStatistics(churchId: string): Promise<FollowUpStatistics> {
        // Basic counts
        const countsResult = await pool.query(
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
        const avgResult = await pool.query(
            `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) as avg_days
             FROM follow_up_assignments
             WHERE church_id = $1 AND status = 'completed' AND completed_at IS NOT NULL`,
            [churchId]
        );

        // Activities by channel
        const channelResult = await pool.query(
            `SELECT channel, COUNT(*) as count
             FROM follow_up_activities
             WHERE church_id = $1
             GROUP BY channel`,
            [churchId]
        );

        const activitiesByChannel: Record<string, number> = {};
        let totalActivities = 0;
        channelResult.rows.forEach((row: any) => {
            activitiesByChannel[row.channel] = parseInt(row.count);
            totalActivities += parseInt(row.count);
        });

        // Member performance
        const performanceResult = await pool.query(
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

        const memberPerformance = performanceResult.rows.map((row: any) => {
            const active = parseInt(row.active_count) || 0;
            const completed = parseInt(row.completed_count) || 0;
            return {
                memberId: row.member_id,
                memberName: row.member_name,
                activeCount: active,
                completedCount: completed,
                successRate: active + completed > 0 ? Math.round((completed / (active + completed)) * 100) : 0,
            };
        });

        // Weekly trend
        const trendResult = await pool.query(
            `SELECT 
                TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') as week,
                COUNT(*) as new_assignments,
                COUNT(*) FILTER (WHERE status = 'completed') as completed
             FROM follow_up_assignments
             WHERE church_id = $1 AND created_at >= NOW() - INTERVAL '8 weeks'
             GROUP BY DATE_TRUNC('week', created_at)
             ORDER BY DATE_TRUNC('week', created_at)`,
            [churchId]
        );

        const weeklyTrend = trendResult.rows.map((row: any) => ({
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
    }

    // ============================================================================
    // UNASSIGNED FIRST TIMERS
    // ============================================================================

    async getUnassignedFirstTimers(churchId: string): Promise<any[]> {
        const result = await pool.query(
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
    }

    // ============================================================================
    // MAPPERS
    // ============================================================================

    private mapDepartment(row: FollowUpDepartmentRow): FollowUpDepartment {
        const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
        return {
            id: row.id,
            churchId: row.church_id,
            name: row.name,
            description: row.description,
            isActive: row.is_active,
            settings: {
                autoAssign: settings.autoAssign ?? settings.auto_assign ?? false,
                maxAssignmentsPerMember: settings.maxAssignmentsPerMember ?? settings.max_assignments_per_member ?? 10,
                followUpDeadlineDays: settings.followUpDeadlineDays ?? settings.follow_up_deadline_days ?? 7,
                reminderIntervals: settings.reminderIntervals ?? settings.reminder_intervals ?? [1, 3, 7],
                defaultMessageTemplates: settings.defaultMessageTemplates ?? settings.default_message_templates ?? {},
                notificationPreferences: {
                    notifyOnNewAssignment: settings.notificationPreferences?.notifyOnNewAssignment ??
                        settings.notification_preferences?.notify_on_new_assignment ?? true,
                    notifyOnDeadline: settings.notificationPreferences?.notifyOnDeadline ??
                        settings.notification_preferences?.notify_on_deadline ?? true,
                    notifyOnResponse: settings.notificationPreferences?.notifyOnResponse ??
                        settings.notification_preferences?.notify_on_response ?? true,
                },
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapMemberWithStats(row: FollowUpMemberRow): FollowUpMember {
        const total = parseInt(row.total_count || '0');
        const completed = parseInt(row.completed_count || '0');

        return {
            id: row.id,
            departmentId: row.department_id,
            memberId: row.member_id,
            churchId: row.church_id,
            role: row.role as FollowUpMemberRole,
            status: row.status as FollowUpMemberStatus,
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            member: {
                id: row.member_id,
                firstName: row.first_name || '',
                lastName: row.last_name || '',
                email: row.email,
                phone: row.phone,
                profileImageUrl: row.profile_image_url,
            },
            activeAssignmentsCount: parseInt(row.active_count || '0'),
            totalAssignmentsCount: total,
            completedAssignmentsCount: completed,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }

    private mapAssignment(row: FollowUpAssignmentRow, assignedMembers: AssignedMember[]): FollowUpAssignment {
        return {
            id: row.id,
            churchId: row.church_id,
            firstTimerId: row.first_timer_id,
            priority: row.priority as FollowUpPriority,
            status: row.status as AssignmentStatus,
            dueDate: row.due_date,
            notes: row.notes,
            tags: row.tags,
            createdBy: row.created_by,
            completedAt: row.completed_at,
            completionNotes: row.completion_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            firstTimer: {
                id: row.first_timer_id,
                firstName: row.ft_first_name || '',
                lastName: row.ft_last_name || '',
                email: row.ft_email,
                phone: row.ft_phone,
                firstVisitDate: row.ft_first_visit_date || '',
                status: row.ft_status || '',
                followUpStatus: row.ft_follow_up_status || '',
                howDidYouHear: row.ft_how_did_you_hear,
                address: row.ft_address,
                notes: row.ft_notes,
            },
            assignedMembers,
        };
    }

    private mapActivity(row: FollowUpActivityRow): FollowUpActivity {
        return {
            id: row.id,
            assignmentId: row.assignment_id,
            firstTimerId: row.first_timer_id,
            churchId: row.church_id,
            performedBy: row.performed_by,
            channel: row.channel as FollowUpChannel,
            activityType: row.activity_type as ActivityType,
            status: row.status as FollowUpStatus,
            subject: row.subject,
            content: row.content,
            response: row.response,
            responseAt: row.response_at,
            durationMinutes: row.duration_minutes,
            metadata: row.metadata,
            scheduledAt: row.scheduled_at,
            externalMessageId: row.external_message_id,
            deliveryStatus: row.delivery_status as DeliveryStatus,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            performer: row.performer_first_name
                ? {
                    id: row.performed_by,
                    firstName: row.performer_first_name,
                    lastName: row.performer_last_name || '',
                }
                : undefined,
        };
    }

    private mapTemplate(row: MessageTemplateRow): MessageTemplate {
        return {
            id: row.id,
            churchId: row.church_id,
            name: row.name,
            channel: row.channel as FollowUpChannel,
            subject: row.subject,
            content: row.content,
            variables: row.variables || [],
            isDefault: row.is_default,
            isActive: row.is_active,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}