// src/repositories/GroupRepository.ts
import { pool } from '@config/database';
import {
    Group,
    GroupType,
    GroupMember,
    GroupMeeting,
    CreateGroupDTO,
    UpdateGroupDTO,
    AddGroupMemberDTO,
    CreateMeetingDTO,
    UpdateMeetingDTO,
    GroupFilters,
    PaginatedGroups,
    GroupStatistics
} from '@/dtos/group.types';
import logger from '@config/logger';

export class GroupRepository {

    // ============================================================================
    // GROUPS
    // ============================================================================

    async create(churchId: string, data: CreateGroupDTO, createdBy?: string): Promise<Group> {
        const query = `
      INSERT INTO groups (
        church_id, name, description, group_type_id, leader_id, co_leader_id,
        default_meeting_day, default_meeting_time, default_meeting_type,
        default_location_type, default_location_address, default_location_city, default_location_notes,
        default_online_platform, default_meeting_link, default_meeting_id, default_meeting_password,
        cover_image_url, is_public, max_members, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

        const values = [
            churchId,
            data.name,
            data.description || null,
            data.groupTypeId || null,
            data.leaderId || null,
            data.coLeaderId || null,
            data.defaultMeetingDay || null,
            data.defaultMeetingTime || null,
            data.defaultMeetingType || 'physical',
            data.defaultLocationType || 'church',
            data.defaultLocationAddress || null,
            data.defaultLocationCity || null,
            data.defaultLocationNotes || null,
            data.defaultOnlinePlatform || null,
            data.defaultMeetingLink || null,
            data.defaultMeetingId || null,
            data.defaultMeetingPassword || null,
            data.coverImageUrl || null,
            data.isPublic !== false,
            data.maxMembers || null,
            createdBy || null,
        ];

        const result = await pool.query(query, values);
        return this.findById(churchId, result.rows[0].id) as Promise<Group>;
    }

    async findAll(filters: GroupFilters): Promise<PaginatedGroups> {
        const {
            churchId,
            search,
            typeId,
            isActive,
            leaderId,
            page = 1,
            limit = 20,
        } = filters;

        let whereClause = 'WHERE g.church_id = $1 AND g.deleted_at IS NULL';
        const values: any[] = [churchId];
        let paramIndex = 2;

        if (search) {
            whereClause += ` AND (LOWER(g.name) LIKE LOWER($${paramIndex}) OR LOWER(g.description) LIKE LOWER($${paramIndex}))`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        if (typeId) {
            whereClause += ` AND g.group_type_id = $${paramIndex}`;
            values.push(typeId);
            paramIndex++;
        }

        if (isActive !== undefined) {
            whereClause += ` AND g.is_active = $${paramIndex}`;
            values.push(isActive);
            paramIndex++;
        }

        if (leaderId) {
            whereClause += ` AND g.leader_id = $${paramIndex}`;
            values.push(leaderId);
            paramIndex++;
        }

        // Count query
        const countQuery = `SELECT COUNT(*) FROM groups g ${whereClause}`;
        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count, 10);

        // Data query
        const offset = (page - 1) * limit;
        const dataQuery = `
      SELECT 
        g.*,
        gt.name as group_type_name,
        gt.icon as group_type_icon,
        gt.color as group_type_color,
        l.first_name as leader_first_name,
        l.last_name as leader_last_name,
        l.email as leader_email,
        l.phone as leader_phone
      FROM groups g
      LEFT JOIN group_types gt ON g.group_type_id = gt.id
      LEFT JOIN members l ON g.leader_id = l.id
      ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        values.push(limit, offset);

        const dataResult = await pool.query(dataQuery, values);

        const groups = dataResult.rows.map(row => ({
            ...row,
            group_type: row.group_type_id ? {
                id: row.group_type_id,
                name: row.group_type_name,
                icon: row.group_type_icon,
                color: row.group_type_color,
            } : null,
            leader: row.leader_id ? {
                id: row.leader_id,
                first_name: row.leader_first_name,
                last_name: row.leader_last_name,
                email: row.leader_email,
                phone: row.leader_phone,
            } : null,
        }));

        return {
            groups,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(churchId: string, groupId: string): Promise<Group | null> {
        const query = `
      SELECT 
        g.*,
        gt.name as group_type_name,
        gt.icon as group_type_icon,
        gt.color as group_type_color,
        l.first_name as leader_first_name,
        l.last_name as leader_last_name,
        l.email as leader_email,
        l.phone as leader_phone,
        cl.first_name as co_leader_first_name,
        cl.last_name as co_leader_last_name
      FROM groups g
      LEFT JOIN group_types gt ON g.group_type_id = gt.id
      LEFT JOIN members l ON g.leader_id = l.id
      LEFT JOIN members cl ON g.co_leader_id = cl.id
      WHERE g.id = $1 AND g.church_id = $2 AND g.deleted_at IS NULL
    `;
        const result = await pool.query(query, [groupId, churchId]);

        if (!result.rows[0]) return null;

        const row = result.rows[0];
        return {
            ...row,
            group_type: row.group_type_id ? {
                id: row.group_type_id,
                name: row.group_type_name,
                icon: row.group_type_icon,
                color: row.group_type_color,
            } : null,
            leader: row.leader_id ? {
                id: row.leader_id,
                first_name: row.leader_first_name,
                last_name: row.leader_last_name,
                email: row.leader_email,
                phone: row.leader_phone,
            } : null,
            co_leader: row.co_leader_id ? {
                id: row.co_leader_id,
                first_name: row.co_leader_first_name,
                last_name: row.co_leader_last_name,
            } : null,
        };
    }

    async update(churchId: string, groupId: string, data: UpdateGroupDTO): Promise<Group | null> {
        const fieldMapping: Record<string, string> = {
            name: 'name',
            description: 'description',
            groupTypeId: 'group_type_id',
            leaderId: 'leader_id',
            coLeaderId: 'co_leader_id',
            defaultMeetingDay: 'default_meeting_day',
            defaultMeetingTime: 'default_meeting_time',
            defaultMeetingType: 'default_meeting_type',
            defaultLocationType: 'default_location_type',
            defaultLocationAddress: 'default_location_address',
            defaultLocationCity: 'default_location_city',
            defaultLocationNotes: 'default_location_notes',
            defaultOnlinePlatform: 'default_online_platform',
            defaultMeetingLink: 'default_meeting_link',
            defaultMeetingId: 'default_meeting_id',
            defaultMeetingPassword: 'default_meeting_password',
            coverImageUrl: 'cover_image_url',
            isPublic: 'is_public',
            isActive: 'is_active',
            maxMembers: 'max_members',
        };

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && fieldMapping[key]) {
                updates.push(`${fieldMapping[key]} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return this.findById(churchId, groupId);
        }

        updates.push(`updated_at = NOW()`);

        const query = `
      UPDATE groups 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1} AND deleted_at IS NULL
      RETURNING *
    `;
        values.push(groupId, churchId);

        await pool.query(query, values);
        return this.findById(churchId, groupId);
    }

    async delete(churchId: string, groupId: string): Promise<boolean> {
        const query = `
      UPDATE groups 
      SET deleted_at = NOW(), is_active = false
      WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
    `;
        const result = await pool.query(query, [groupId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    async getStatistics(churchId: string): Promise<GroupStatistics> {
        const statsQuery = `
      SELECT 
        COUNT(*) as total_groups,
        COUNT(*) FILTER (WHERE is_active = true) as active_groups,
        COALESCE(SUM(member_count), 0) as total_members
      FROM groups 
      WHERE church_id = $1 AND deleted_at IS NULL
    `;
        const statsResult = await pool.query(statsQuery, [churchId]);
        const stats = statsResult.rows[0];

        // Upcoming meetings
        const meetingsQuery = `
      SELECT 
        COUNT(*) as upcoming_meetings,
        COUNT(*) FILTER (WHERE meeting_date >= CURRENT_DATE AND meeting_date < CURRENT_DATE + INTERVAL '7 days') as meetings_this_week
      FROM group_meetings 
      WHERE church_id = $1 AND status = 'scheduled' AND meeting_date >= CURRENT_DATE
    `;
        const meetingsResult = await pool.query(meetingsQuery, [churchId]);
        const meetings = meetingsResult.rows[0];

        // By type
        const typeQuery = `
      SELECT 
        COALESCE(gt.name, 'Uncategorized') as type,
        COUNT(*) as count
      FROM groups g
      LEFT JOIN group_types gt ON g.group_type_id = gt.id
      WHERE g.church_id = $1 AND g.deleted_at IS NULL
      GROUP BY gt.name
      ORDER BY count DESC
    `;
        const typeResult = await pool.query(typeQuery, [churchId]);

        return {
            totalGroups: parseInt(stats.total_groups, 10),
            activeGroups: parseInt(stats.active_groups, 10),
            totalMembers: parseInt(stats.total_members, 10),
            upcomingMeetings: parseInt(meetings.upcoming_meetings, 10),
            meetingsThisWeek: parseInt(meetings.meetings_this_week, 10),
            byType: typeResult.rows.map(row => ({
                type: row.type,
                count: parseInt(row.count, 10),
            })),
        };
    }

    // ============================================================================
    // GROUP MEMBERS
    // ============================================================================

    async addMember(groupId: string, data: AddGroupMemberDTO, invitedBy?: string): Promise<GroupMember> {
        const query = `
      INSERT INTO group_members (group_id, member_id, role, invited_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (group_id, member_id) 
      DO UPDATE SET role = $3, status = 'active', notes = $5
      RETURNING *
    `;
        const values = [groupId, data.memberId, data.role || 'member', invitedBy, data.notes || null];
        const result = await pool.query(query, values);
        return this.getMemberById(groupId, result.rows[0].member_id) as Promise<GroupMember>;
    }

    async removeMember(groupId: string, memberId: string): Promise<boolean> {
        const query = `DELETE FROM group_members WHERE group_id = $1 AND member_id = $2`;
        const result = await pool.query(query, [groupId, memberId]);
        return (result.rowCount ?? 0) > 0;
    }

    async updateMemberRole(groupId: string, memberId: string, role: string): Promise<GroupMember | null> {
        const query = `
      UPDATE group_members 
      SET role = $3
      WHERE group_id = $1 AND member_id = $2
      RETURNING *
    `;
        await pool.query(query, [groupId, memberId, role]);
        return this.getMemberById(groupId, memberId);
    }

    async getMemberById(groupId: string, memberId: string): Promise<GroupMember | null> {
        const query = `
      SELECT 
        gm.*,
        m.first_name, m.last_name, m.email, m.phone, m.profile_image_url
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      WHERE gm.group_id = $1 AND gm.member_id = $2
    `;
        const result = await pool.query(query, [groupId, memberId]);
        if (!result.rows[0]) return null;

        const row = result.rows[0];
        return {
            ...row,
            member: {
                id: row.member_id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                phone: row.phone,
                profile_image_url: row.profile_image_url,
            },
        };
    }

    async getGroupMembers(groupId: string): Promise<GroupMember[]> {
        const query = `
      SELECT 
        gm.*,
        m.first_name, m.last_name, m.email, m.phone, m.profile_image_url
      FROM group_members gm
      JOIN members m ON gm.member_id = m.id
      WHERE gm.group_id = $1 AND gm.status = 'active'
      ORDER BY 
        CASE gm.role 
          WHEN 'leader' THEN 1 
          WHEN 'co_leader' THEN 2 
          WHEN 'secretary' THEN 3 
          WHEN 'treasurer' THEN 4 
          ELSE 5 
        END,
        gm.joined_at
    `;
        const result = await pool.query(query, [groupId]);
        return result.rows.map(row => ({
            ...row,
            member: {
                id: row.member_id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email,
                phone: row.phone,
                profile_image_url: row.profile_image_url,
            },
        }));
    }

    async getMemberGroups(memberId: string, churchId: string): Promise<Group[]> {
        const query = `
      SELECT g.*, gm.role as member_role, gm.joined_at as member_joined_at
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.member_id = $1 AND g.church_id = $2 AND g.deleted_at IS NULL AND gm.status = 'active'
      ORDER BY g.name
    `;
        const result = await pool.query(query, [memberId, churchId]);
        return result.rows;
    }

    async isMember(groupId: string, memberId: string): Promise<boolean> {
        const query = `SELECT 1 FROM group_members WHERE group_id = $1 AND member_id = $2 AND status = 'active'`;
        const result = await pool.query(query, [groupId, memberId]);
        return result.rows.length > 0;
    }

    // ============================================================================
    // MEETINGS
    // ============================================================================

    async createMeeting(churchId: string, data: CreateMeetingDTO, createdBy?: string): Promise<GroupMeeting> {
        const query = `
      INSERT INTO group_meetings (
        group_id, church_id, title, description, meeting_date, start_time, end_time, timezone,
        meeting_type, location_type, location_address, location_city, location_notes, location_map_url,
        online_platform, meeting_link, meeting_id, meeting_passcode, host_name, dial_in_number, additional_instructions,
        is_recurring, recurrence_pattern, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;

        const values = [
            data.groupId,
            churchId,
            data.title,
            data.description || null,
            data.meetingDate,
            data.startTime,
            data.endTime || null,
            data.timezone || 'UTC',
            data.meetingType,
            data.locationType || null,
            data.locationAddress || null,
            data.locationCity || null,
            data.locationNotes || null,
            data.locationMapUrl || null,
            data.onlinePlatform || null,
            data.meetingLink || null,
            data.meetingId || null,
            data.meetingPasscode || null,
            data.hostName || null,
            data.dialInNumber || null,
            data.additionalInstructions || null,
            data.isRecurring || false,
            data.recurrencePattern || null,
            createdBy || null,
        ];

        const result = await pool.query(query, values);
        return this.getMeetingById(result.rows[0].id, churchId) as Promise<GroupMeeting>;
    }

    async getMeetingById(meetingId: string, churchId: string): Promise<GroupMeeting | null> {
        const query = `
      SELECT 
        gm.*,
        g.name as group_name
      FROM group_meetings gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.id = $1 AND gm.church_id = $2
    `;
        const result = await pool.query(query, [meetingId, churchId]);
        if (!result.rows[0]) return null;

        const row = result.rows[0];
        return {
            ...row,
            group: {
                id: row.group_id,
                name: row.group_name,
            },
        };
    }

    async getGroupMeetings(groupId: string, options?: { upcoming?: boolean; limit?: number }): Promise<GroupMeeting[]> {
        let whereClause = 'WHERE gm.group_id = $1';
        const values: any[] = [groupId];
        let paramIndex = 2;

        if (options?.upcoming) {
            whereClause += ` AND gm.meeting_date >= CURRENT_DATE AND gm.status = 'scheduled'`;
        }

        let query = `
      SELECT 
        gm.*,
        g.name as group_name
      FROM group_meetings gm
      JOIN groups g ON gm.group_id = g.id
      ${whereClause}
      ORDER BY gm.meeting_date ASC, gm.start_time ASC
    `;

        if (options?.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(options.limit);
        }

        const result = await pool.query(query, values);
        return result.rows.map(row => ({
            ...row,
            group: {
                id: row.group_id,
                name: row.group_name,
            },
        }));
    }

    async getAllMeetings(churchId: string, options?: { upcoming?: boolean; startDate?: string; endDate?: string }): Promise<GroupMeeting[]> {
        let whereClause = 'WHERE gm.church_id = $1';
        const values: any[] = [churchId];
        let paramIndex = 2;

        if (options?.upcoming) {
            whereClause += ` AND gm.meeting_date >= CURRENT_DATE AND gm.status = 'scheduled'`;
        }

        if (options?.startDate) {
            whereClause += ` AND gm.meeting_date >= $${paramIndex}`;
            values.push(options.startDate);
            paramIndex++;
        }

        if (options?.endDate) {
            whereClause += ` AND gm.meeting_date <= $${paramIndex}`;
            values.push(options.endDate);
            paramIndex++;
        }

        const query = `
      SELECT 
        gm.*,
        g.name as group_name
      FROM group_meetings gm
      JOIN groups g ON gm.group_id = g.id
      ${whereClause}
      ORDER BY gm.meeting_date ASC, gm.start_time ASC
    `;

        const result = await pool.query(query, values);
        return result.rows.map(row => ({
            ...row,
            group: {
                id: row.group_id,
                name: row.group_name,
            },
        }));
    }

    async updateMeeting(meetingId: string, churchId: string, data: UpdateMeetingDTO): Promise<GroupMeeting | null> {
        const fieldMapping: Record<string, string> = {
            title: 'title',
            description: 'description',
            meetingDate: 'meeting_date',
            startTime: 'start_time',
            endTime: 'end_time',
            timezone: 'timezone',
            meetingType: 'meeting_type',
            locationType: 'location_type',
            locationAddress: 'location_address',
            locationCity: 'location_city',
            locationNotes: 'location_notes',
            locationMapUrl: 'location_map_url',
            onlinePlatform: 'online_platform',
            meetingLink: 'meeting_link',
            meetingId: 'meeting_id',
            meetingPasscode: 'meeting_passcode',
            hostName: 'host_name',
            dialInNumber: 'dial_in_number',
            additionalInstructions: 'additional_instructions',
            status: 'status',
        };

        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && fieldMapping[key]) {
                updates.push(`${fieldMapping[key]} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        // Handle cancellation
        if (data.status === 'cancelled') {
            updates.push(`cancelled_at = NOW()`);
            if (data.cancelledReason) {
                updates.push(`cancelled_reason = $${paramIndex}`);
                values.push(data.cancelledReason);
                paramIndex++;
            }
        }

        if (updates.length === 0) {
            return this.getMeetingById(meetingId, churchId);
        }

        updates.push(`updated_at = NOW()`);

        const query = `
      UPDATE group_meetings 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
      RETURNING *
    `;
        values.push(meetingId, churchId);

        await pool.query(query, values);
        return this.getMeetingById(meetingId, churchId);
    }

    async deleteMeeting(meetingId: string, churchId: string): Promise<boolean> {
        const query = `DELETE FROM group_meetings WHERE id = $1 AND church_id = $2`;
        const result = await pool.query(query, [meetingId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }

    async markMeetingShared(meetingId: string, shareType: 'email' | 'sms' | 'whatsapp'): Promise<void> {
        const fieldMap = {
            email: 'shared_via_email',
            sms: 'shared_via_sms',
            whatsapp: 'shared_via_whatsapp',
        };
        const query = `UPDATE group_meetings SET ${fieldMap[shareType]} = true WHERE id = $1`;
        await pool.query(query, [meetingId]);
    }

    // ============================================================================
    // GROUP TYPES
    // ============================================================================

    async createGroupType(churchId: string, name: string, description?: string, icon?: string, color?: string): Promise<GroupType> {
        const query = `
      INSERT INTO group_types (church_id, name, description, icon, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const result = await pool.query(query, [churchId, name, description, icon, color]);
        return result.rows[0];
    }

    async findAllGroupTypes(churchId: string): Promise<GroupType[]> {
        const query = `
      SELECT * FROM group_types 
      WHERE church_id = $1 AND is_active = true
      ORDER BY name
    `;
        const result = await pool.query(query, [churchId]);
        return result.rows;
    }

    async updateGroupType(churchId: string, typeId: string, data: Partial<GroupType>): Promise<GroupType | null> {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(data.description);
        }
        if (data.icon !== undefined) {
            updates.push(`icon = $${paramIndex++}`);
            values.push(data.icon);
        }
        if (data.color !== undefined) {
            updates.push(`color = $${paramIndex++}`);
            values.push(data.color);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = NOW()`);

        const query = `
      UPDATE group_types 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
      RETURNING *
    `;
        values.push(typeId, churchId);

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    async deleteGroupType(churchId: string, typeId: string): Promise<boolean> {
        const query = `UPDATE group_types SET is_active = false WHERE id = $1 AND church_id = $2`;
        const result = await pool.query(query, [typeId, churchId]);
        return (result.rowCount ?? 0) > 0;
    }
}