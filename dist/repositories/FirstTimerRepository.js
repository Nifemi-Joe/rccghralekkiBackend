"use strict";
// src/repositories/FirstTimerRepository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstTimerRepository = void 0;
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
class FirstTimerRepository {
    // ============================================================================
    // CREATE
    // ============================================================================
    async create(data) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            // Get conversion period from church settings (defensive: handle missing column)
            let conversionDays = 90;
            try {
                const settingsResult = await client.query(`SELECT COALESCE(
                        (settings->>'first_timer_conversion_days')::int,
                        90
                    ) as conversion_days
                    FROM churches WHERE id = $1`, [data.churchId]);
                conversionDays = settingsResult.rows[0]?.conversion_days || 90;
            }
            catch (settingsError) {
                logger_1.default.warn('Could not read church settings for conversion days, using default 90', settingsError);
            }
            const firstVisitDate = data.firstVisitDate ? new Date(data.firstVisitDate) : new Date();
            const conversionEligibleDate = new Date(firstVisitDate);
            conversionEligibleDate.setDate(conversionEligibleDate.getDate() + conversionDays);
            // Handle interests array properly for PostgreSQL
            let interestsValue = null;
            if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) {
                interestsValue = data.interests;
            }
            const query = `
                INSERT INTO first_timers (
                    church_id,
                    first_name,
                    last_name,
                    email,
                    phone,
                    gender,
                    date_of_birth,
                    address,
                    city,
                    state,
                    country,
                    first_visit_date,
                    how_did_you_hear,
                    invited_by,
                    interests,
                    prayer_request,
                    wants_follow_up,
                    follow_up_status,
                    status,
                    visit_count,
                    last_visit_date,
                    conversion_eligible_date,
                    contact_attempts,
                    notes,
                    created_by
                )
                VALUES (
                           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                           $21, $22, $23, $24, $25
                       )
                    RETURNING *
            `;
            const values = [
                data.churchId,
                data.firstName,
                data.lastName,
                data.email?.toLowerCase() || null,
                data.phone || null,
                data.gender || null,
                data.dateOfBirth || null,
                data.address || null,
                data.city || null,
                data.state || null,
                data.country || null,
                firstVisitDate,
                data.howDidYouHear || null,
                data.invitedBy || null,
                interestsValue,
                data.prayerRequest || null,
                data.wantsFollowUp ?? true,
                'pending',
                'new',
                1,
                firstVisitDate,
                conversionEligibleDate,
                0,
                data.notes || null,
                data.createdBy || null,
            ];
            const result = await client.query(query, values);
            await client.query('COMMIT');
            return this.mapToFirstTimer(result.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.default.error('Error creating first timer:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    // ============================================================================
    // READ
    // ============================================================================
    async findById(id, churchId) {
        const query = `
            SELECT ft.*,
                   u.first_name || ' ' || u.last_name as assigned_to_name,
                   m.first_name || ' ' || m.last_name as converted_member_name
            FROM first_timers ft
                     LEFT JOIN users u ON ft.follow_up_assigned_to = u.id
                     LEFT JOIN members m ON ft.converted_to_member_id = m.id
            WHERE ft.id = $1 AND ft.church_id = $2 AND ft.deleted_at IS NULL
        `;
        const result = await database_1.pool.query(query, [id, churchId]);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    async findByEmail(email, churchId) {
        const query = `
            SELECT * FROM first_timers
            WHERE LOWER(email) = LOWER($1)
              AND church_id = $2
              AND deleted_at IS NULL
        `;
        const result = await database_1.pool.query(query, [email, churchId]);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    async findByPhone(phone, churchId) {
        const query = `
            SELECT * FROM first_timers
            WHERE phone = $1
              AND church_id = $2
              AND deleted_at IS NULL
        `;
        const result = await database_1.pool.query(query, [phone, churchId]);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    async findAll(filters) {
        let whereClause = 'WHERE ft.church_id = $1 AND ft.deleted_at IS NULL';
        const values = [filters.churchId];
        let paramCount = 1;
        // Search filter
        if (filters.search) {
            paramCount++;
            whereClause += ` AND (
                ft.first_name ILIKE $${paramCount} OR
                ft.last_name ILIKE $${paramCount} OR
                ft.email ILIKE $${paramCount} OR
                ft.phone ILIKE $${paramCount} OR
                CONCAT(ft.first_name, ' ', ft.last_name) ILIKE $${paramCount}
            )`;
            values.push(`%${filters.search}%`);
        }
        // Status filter
        if (filters.status) {
            paramCount++;
            whereClause += ` AND ft.status = $${paramCount}`;
            values.push(filters.status);
        }
        // Follow-up status filter
        if (filters.followUpStatus) {
            paramCount++;
            whereClause += ` AND ft.follow_up_status = $${paramCount}`;
            values.push(filters.followUpStatus);
        }
        // Wants follow-up filter
        if (filters.wantsFollowUp !== undefined) {
            paramCount++;
            whereClause += ` AND ft.wants_follow_up = $${paramCount}`;
            values.push(filters.wantsFollowUp);
        }
        // Date range filters
        if (filters.startDate) {
            paramCount++;
            whereClause += ` AND ft.first_visit_date >= $${paramCount}`;
            values.push(filters.startDate);
        }
        if (filters.endDate) {
            paramCount++;
            whereClause += ` AND ft.first_visit_date <= $${paramCount}`;
            values.push(filters.endDate);
        }
        // Conversion eligible filter
        if (filters.conversionEligible) {
            whereClause += ` AND ft.conversion_eligible_date <= NOW() AND ft.status != 'converted'`;
        }
        // Count query
        const countQuery = `
            SELECT COUNT(*) as total
            FROM first_timers ft
                ${whereClause}
        `;
        // Sorting
        const sortBy = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const sortColumn = {
            'firstName': 'ft.first_name',
            'lastName': 'ft.last_name',
            'firstVisitDate': 'ft.first_visit_date',
            'status': 'ft.status',
            'followUpStatus': 'ft.follow_up_status',
            'visitCount': 'ft.visit_count',
            'createdAt': 'ft.created_at',
            'created_at': 'ft.created_at',
        }[sortBy] || 'ft.created_at';
        // Data query with pagination
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const offset = (page - 1) * limit;
        const dataQuery = `
            SELECT ft.*,
                   u.first_name || ' ' || u.last_name as assigned_to_name
            FROM first_timers ft
                     LEFT JOIN users u ON ft.follow_up_assigned_to = u.id
                ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        const countValues = [...values];
        values.push(limit, offset);
        const [countResult, dataResult] = await Promise.all([
            database_1.pool.query(countQuery, countValues),
            database_1.pool.query(dataQuery, values),
        ]);
        const total = parseInt(countResult.rows[0].total);
        return {
            firstTimers: dataResult.rows.map(row => this.mapToFirstTimer(row)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    // ============================================================================
    // UPDATE
    // ============================================================================
    async update(id, churchId, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;
        const fieldMappings = {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            phone: 'phone',
            gender: 'gender',
            dateOfBirth: 'date_of_birth',
            address: 'address',
            city: 'city',
            state: 'state',
            country: 'country',
            howDidYouHear: 'how_did_you_hear',
            invitedBy: 'invited_by',
            interests: 'interests',
            prayerRequest: 'prayer_request',
            wantsFollowUp: 'wants_follow_up',
            followUpStatus: 'follow_up_status',
            followUpAssignedTo: 'follow_up_assigned_to',
            followUpDate: 'follow_up_date',
            followUpNotes: 'follow_up_notes',
            status: 'status',
            notes: 'notes',
        };
        for (const [key, dbField] of Object.entries(fieldMappings)) {
            const value = data[key];
            if (value !== undefined) {
                paramCount++;
                fields.push(`${dbField} = $${paramCount}`);
                // Handle special cases
                if (key === 'email' && value) {
                    values.push(value.toLowerCase());
                }
                else if (key === 'interests') {
                    if (Array.isArray(value) && value.length > 0) {
                        values.push(value);
                    }
                    else {
                        values.push(null);
                    }
                }
                else {
                    values.push(value ?? null);
                }
            }
        }
        if (fields.length === 0) {
            return this.findById(id, churchId);
        }
        // Add updated_by if provided
        if (data.updatedBy) {
            paramCount++;
            fields.push(`updated_by = $${paramCount}`);
            values.push(data.updatedBy);
        }
        paramCount++;
        values.push(id);
        paramCount++;
        values.push(churchId);
        const query = `
            UPDATE first_timers
            SET ${fields.join(', ')}, updated_at = NOW()
            WHERE id = $${paramCount - 1} AND church_id = $${paramCount} AND deleted_at IS NULL
                RETURNING *
        `;
        const result = await database_1.pool.query(query, values);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    // ============================================================================
    // DELETE
    // ============================================================================
    async delete(id, churchId) {
        const query = `
            UPDATE first_timers
            SET deleted_at = NOW()
            WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
        `;
        const result = await database_1.pool.query(query, [id, churchId]);
        return result.rowCount !== null && result.rowCount > 0;
    }
    // ============================================================================
    // VISIT TRACKING
    // ============================================================================
    async recordVisit(id, churchId, visitDate) {
        const date = visitDate || new Date();
        const query = `
            UPDATE first_timers
            SET visit_count = visit_count + 1,
                last_visit_date = $3,
                updated_at = NOW()
            WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                RETURNING *
        `;
        const result = await database_1.pool.query(query, [id, churchId, date]);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    async recordContactAttempt(id, churchId, notes) {
        let query = `
            UPDATE first_timers
            SET contact_attempts = contact_attempts + 1,
                last_contacted_at = NOW(),
                updated_at = NOW()
        `;
        const values = [id, churchId];
        if (notes) {
            query += `, follow_up_notes = COALESCE(follow_up_notes, '') || $3`;
            values.push(`\n[${new Date().toISOString()}] ${notes}`);
        }
        query += ` WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL RETURNING *`;
        const result = await database_1.pool.query(query, values);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    // ============================================================================
    // CONVERSION
    // ============================================================================
    async markAsConverted(id, churchId, memberId) {
        const query = `
            UPDATE first_timers
            SET status = 'converted',
                converted_to_member_id = $3,
                converted_at = NOW(),
                follow_up_status = 'completed',
                updated_at = NOW()
            WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
                RETURNING *
        `;
        const result = await database_1.pool.query(query, [id, churchId, memberId]);
        return result.rows[0] ? this.mapToFirstTimer(result.rows[0]) : null;
    }
    async getConversionEligible(churchId) {
        const query = `
            SELECT ft.*,
                   u.first_name || ' ' || u.last_name as assigned_to_name
            FROM first_timers ft
                     LEFT JOIN users u ON ft.follow_up_assigned_to = u.id
            WHERE ft.church_id = $1
              AND ft.deleted_at IS NULL
              AND ft.status != 'converted'
            AND ft.conversion_eligible_date <= NOW()
            ORDER BY ft.conversion_eligible_date ASC
        `;
        const result = await database_1.pool.query(query, [churchId]);
        return result.rows.map(row => this.mapToFirstTimer(row));
    }
    // ============================================================================
    // FOLLOW-UP
    // ============================================================================
    async getPendingFollowUps(churchId) {
        const query = `
            SELECT ft.*,
                   u.first_name || ' ' || u.last_name as assigned_to_name
            FROM first_timers ft
                     LEFT JOIN users u ON ft.follow_up_assigned_to = u.id
            WHERE ft.church_id = $1
              AND ft.deleted_at IS NULL
              AND ft.status != 'converted'
            AND ft.wants_follow_up = true
            AND ft.follow_up_status IN ('pending', 'contacted', 'scheduled')
            ORDER BY
                CASE ft.follow_up_status
                WHEN 'pending' THEN 1
                WHEN 'scheduled' THEN 2
                WHEN 'contacted' THEN 3
                ELSE 4
            END,
                ft.first_visit_date ASC
        `;
        const result = await database_1.pool.query(query, [churchId]);
        return result.rows.map(row => this.mapToFirstTimer(row));
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStatistics(churchId) {
        const query = `
            WITH stats AS (
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_this_month,
                    COUNT(CASE WHEN follow_up_status = 'pending' AND wants_follow_up = true AND status != 'converted' THEN 1 END) as pending_follow_up,
                    COUNT(CASE WHEN conversion_eligible_date <= NOW() AND status != 'converted' THEN 1 END) as conversion_eligible,
                    COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
                    COUNT(CASE WHEN status = 'new' THEN 1 END) as status_new,
                    COUNT(CASE WHEN status = 'following_up' THEN 1 END) as status_following_up,
                    COUNT(CASE WHEN status = 'regular_visitor' THEN 1 END) as status_regular_visitor,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as status_inactive
                FROM first_timers
                WHERE church_id = $1 AND deleted_at IS NULL
            ),
                 sources AS (
                     SELECT how_did_you_hear as source, COUNT(*) as count
            FROM first_timers
            WHERE church_id = $1 AND deleted_at IS NULL AND how_did_you_hear IS NOT NULL
            GROUP BY how_did_you_hear
            ORDER BY count DESC
                LIMIT 10
                ),
                weekly_trend AS (
            SELECT
                TO_CHAR(DATE_TRUNC('week', first_visit_date), 'YYYY-MM-DD') as week,
                COUNT(*) as count
            FROM first_timers
            WHERE church_id = $1
              AND deleted_at IS NULL
              AND first_visit_date >= NOW() - INTERVAL '12 weeks'
            GROUP BY DATE_TRUNC('week', first_visit_date)
            ORDER BY week DESC
                )
            SELECT
                s.*,
                COALESCE(json_agg(DISTINCT jsonb_build_object('source', src.source, 'count', src.count)) FILTER (WHERE src.source IS NOT NULL), '[]') as by_source,
                COALESCE(json_agg(DISTINCT jsonb_build_object('week', wt.week, 'count', wt.count)) FILTER (WHERE wt.week IS NOT NULL), '[]') as weekly_trend
            FROM stats s
                     LEFT JOIN sources src ON true
                     LEFT JOIN weekly_trend wt ON true
            GROUP BY s.total, s.new_this_week, s.new_this_month, s.pending_follow_up,
                     s.conversion_eligible, s.converted, s.status_new, s.status_following_up,
                     s.status_regular_visitor, s.status_inactive
        `;
        const result = await database_1.pool.query(query, [churchId]);
        const row = result.rows[0];
        // Handle case where table exists but has no data
        if (!row) {
            return {
                total: 0,
                newThisWeek: 0,
                newThisMonth: 0,
                pendingFollowUp: 0,
                conversionEligible: 0,
                converted: 0,
                conversionRate: 0,
                byStatus: {
                    new: 0,
                    following_up: 0,
                    regular_visitor: 0,
                    converted: 0,
                    inactive: 0,
                },
                bySource: [],
                weeklyTrend: [],
            };
        }
        const total = parseInt(row.total) || 0;
        const converted = parseInt(row.converted) || 0;
        return {
            total,
            newThisWeek: parseInt(row.new_this_week) || 0,
            newThisMonth: parseInt(row.new_this_month) || 0,
            pendingFollowUp: parseInt(row.pending_follow_up) || 0,
            conversionEligible: parseInt(row.conversion_eligible) || 0,
            converted,
            conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
            byStatus: {
                new: parseInt(row.status_new) || 0,
                following_up: parseInt(row.status_following_up) || 0,
                regular_visitor: parseInt(row.status_regular_visitor) || 0,
                converted,
                inactive: parseInt(row.status_inactive) || 0,
            },
            bySource: row.by_source || [],
            weeklyTrend: row.weekly_trend || [],
        };
    }
    // ============================================================================
    // SETTINGS
    // ============================================================================
    async getConversionPeriod(churchId) {
        try {
            const query = `
                SELECT COALESCE(
                    (settings->>'first_timer_conversion_days')::int,
                    90
                ) as days
                FROM churches
                WHERE id = $1
            `;
            const result = await database_1.pool.query(query, [churchId]);
            return result.rows[0]?.days || 90;
        }
        catch (error) {
            // If the settings column doesn't exist, return default
            if (error.code === '42703') {
                logger_1.default.warn('settings column does not exist on churches table, returning default 90 days');
                return 90;
            }
            throw error;
        }
    }
    async setConversionPeriod(churchId, days) {
        try {
            const query = `
                UPDATE churches
                SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('first_timer_conversion_days', $2),
                    updated_at = NOW()
                WHERE id = $1
            `;
            await database_1.pool.query(query, [churchId, days]);
        }
        catch (error) {
            // If the settings column doesn't exist, try to add it first
            if (error.code === '42703') {
                logger_1.default.warn('settings column does not exist, attempting to add it');
                await database_1.pool.query(`ALTER TABLE churches ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb`);
                // Retry the update
                const query = `
                    UPDATE churches
                    SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('first_timer_conversion_days', $2),
                        updated_at = NOW()
                    WHERE id = $1
                `;
                await database_1.pool.query(query, [churchId, days]);
            }
            else {
                throw error;
            }
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    mapToFirstTimer(row) {
        return {
            id: row.id,
            church_id: row.church_id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            phone: row.phone,
            gender: row.gender,
            date_of_birth: row.date_of_birth,
            address: row.address,
            city: row.city,
            state: row.state,
            country: row.country,
            first_visit_date: row.first_visit_date,
            how_did_you_hear: row.how_did_you_hear,
            invited_by: row.invited_by,
            interests: row.interests || [],
            prayer_request: row.prayer_request,
            wants_follow_up: row.wants_follow_up,
            follow_up_status: row.follow_up_status,
            follow_up_assigned_to: row.follow_up_assigned_to,
            follow_up_date: row.follow_up_date,
            follow_up_notes: row.follow_up_notes,
            last_contacted_at: row.last_contacted_at,
            contact_attempts: row.contact_attempts || 0,
            status: row.status,
            conversion_eligible_date: row.conversion_eligible_date,
            converted_to_member_id: row.converted_to_member_id,
            converted_at: row.converted_at,
            visit_count: row.visit_count || 1,
            last_visit_date: row.last_visit_date,
            notes: row.notes,
            created_by: row.created_by,
            updated_by: row.updated_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
            deleted_at: row.deleted_at,
            // Additional mapped fields from joins
            ...(row.assigned_to_name && { assignedToName: row.assigned_to_name }),
            ...(row.converted_member_name && { convertedMemberName: row.converted_member_name }),
        };
    }
}
exports.FirstTimerRepository = FirstTimerRepository;
//# sourceMappingURL=FirstTimerRepository.js.map