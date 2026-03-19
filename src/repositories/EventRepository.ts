// src/repositories/EventRepository.ts
import { pool } from '@config/database';
import { v4 as uuidv4 } from 'uuid';
import {
    Event,
    EventInstance,
    EventInstanceWithDetails,
    EventRegistration,
    EventTicketType,
    CreateEventDTO,
    UpdateEventDTO,
    CreateEventInstanceDTO,
    UpdateEventInstanceDTO,
    CreateRegistrationDTO,
    EventFilters,
    EventStatistics,
    PaginatedEvents,
    CreateTicketTypeDTO,
} from '@/dtos/event.types';
import { generateQRCode } from '@utils/helpers';

// Extended Event type with offerings
export interface EventWithOfferings extends Event {
    offerings?: OfferingSummary;
    offeringDetails?: OfferingDetail[];
}

export interface OfferingSummary {
    totalAmount: number;
    offeringCount: number;
    tithes: number;
    offerings: number;
    donations: number;
    pledges: number;
}

export interface OfferingDetail {
    id: string;
    transactionType: string;
    amount: number;
    paymentMethod: string;
    transactionDate: string;
    accountName: string;
    donorName?: string;
    memberName?: string;
    description?: string;
}

export class EventRepository {

    // ============================================================================
    // EVENTS
    // ============================================================================

    async create(churchId: string, data: CreateEventDTO, createdBy?: string): Promise<Event> {
        const id = uuidv4();
        const qrCode = generateQRCode();

        const query = `
            INSERT INTO events (
                id, church_id, name, description, event_type, recurrence,
                start_date, end_date, start_time, end_time, timezone,
                location_type, location_name, location_address, location_city, location_map_url,
                online_platform, meeting_link, meeting_id, meeting_password, stream_url,
                capacity, is_registration_required, registration_deadline, max_registrations,
                is_paid, price, currency, early_bird_price, early_bird_deadline,
                banner_url, thumbnail_url,
                qr_code, is_active, is_public, is_featured,
                allow_self_checkin, allow_guest_checkin, require_approval,
                send_reminders, reminder_hours,
                group_id, ministry_id, tags,
                created_by, current_registrations, total_attendance, total_revenue,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21,
                $22, $23, $24, $25,
                $26, $27, $28, $29, $30,
                $31, $32,
                $33, $34, $35, $36,
                $37, $38, $39,
                $40, $41,
                $42, $43, $44,
                $45, 0, 0, 0,
                NOW(), NOW()
            )
            RETURNING *
        `;

        const values = [
            id, churchId, data.name, data.description || null, data.eventType, data.recurrence || 'none',
            data.startDate, data.endDate || null, data.startTime, data.endTime || null, data.timezone || 'UTC',
            data.locationType || 'physical', data.locationName || null, data.locationAddress || null, data.locationCity || null, data.locationMapUrl || null,
            data.onlinePlatform || null, data.meetingLink || null, data.meetingId || null, data.meetingPassword || null, data.streamUrl || null,
            data.capacity || null, data.isRegistrationRequired ?? false, data.registrationDeadline || null, data.maxRegistrations || null,
            data.isPaid ?? false, data.price || null, data.currency || 'USD', data.earlyBirdPrice || null, data.earlyBirdDeadline || null,
            data.bannerUrl || null, data.thumbnailUrl || null,
            qrCode, data.isActive ?? true, data.isPublic ?? true, data.isFeatured ?? false,
            data.allowSelfCheckin ?? true, data.allowGuestCheckin ?? false, data.requireApproval ?? false,
            data.sendReminders ?? true, data.reminderHours ?? 24,
            data.groupId || null, data.ministryId || null, data.tags ? JSON.stringify(data.tags) : null,
            createdBy || null
        ];

        const result = await pool.query(query, values);
        return this.mapToEvent(result.rows[0]);
    }

    async findById(id: string, churchId?: string, includeOfferings: boolean = true): Promise<EventWithOfferings | null> {
        let query = `SELECT * FROM events WHERE id = $1`;
        const params: any[] = [id];

        if (churchId) {
            params.push(churchId);
            query += ` AND church_id = $${params.length}`;
        }

        const result = await pool.query(query, params);

        if (!result.rows[0]) return null;

        const event = this.mapToEvent(result.rows[0]);

        if (includeOfferings) {
            const offerings = await this.getEventOfferings(id, churchId || result.rows[0].church_id);
            return {
                ...event,
                offerings: offerings.summary,
                offeringDetails: offerings.details
            };
        }

        return event;
    }

    async findByQRCode(qrCode: string): Promise<EventWithOfferings | null> {
        const query = `SELECT * FROM events WHERE qr_code = $1 AND is_active = true`;
        const result = await pool.query(query, [qrCode]);

        if (!result.rows[0]) return null;

        const event = this.mapToEvent(result.rows[0]);
        const offerings = await this.getEventOfferings(event.id, event.churchId);

        return {
            ...event,
            offerings: offerings.summary,
            offeringDetails: offerings.details
        };
    }

    async findAll(filters: EventFilters): Promise<PaginatedEvents> {
        const {
            churchId,
            search,
            eventType,
            locationType,
            startDate,
            endDate,
            isActive,
            isPaid,
            isFeatured,
            groupId,
            page = 1,
            limit = 20,
            sortBy = 'start_date',
            sortOrder = 'asc'
        } = filters;

        let query = `
            SELECT e.*,
                   -- Offering totals
                   COALESCE((
                                SELECT SUM(t.amount)
                                FROM transactions t
                                WHERE t.event_id = e.id
                                  AND t.transaction_type IN ('offering', 'tithe', 'donation', 'pledge')
                            ), 0) as total_offerings,
                   -- Expense totals
                   COALESCE((
                                SELECT SUM(ABS(t.amount))
                                FROM transactions t
                                WHERE t.event_id = e.id
                                  AND t.transaction_type = 'expense'
                            ), 0) as total_expenses,
                   -- Offering breakdown
                   COALESCE((
                                SELECT SUM(t.amount)
                                FROM transactions t
                                WHERE t.event_id = e.id AND t.transaction_type = 'tithe'
                            ), 0) as tithes_total,
                   COALESCE((
                                SELECT SUM(t.amount)
                                FROM transactions t
                                WHERE t.event_id = e.id AND t.transaction_type = 'offering'
                            ), 0) as offerings_only_total,
                   COALESCE((
                                SELECT SUM(t.amount)
                                FROM transactions t
                                WHERE t.event_id = e.id AND t.transaction_type = 'donation'
                            ), 0) as donations_total,
                   COALESCE((
                                SELECT SUM(t.amount)
                                FROM transactions t
                                WHERE t.event_id = e.id AND t.transaction_type = 'pledge'
                            ), 0) as pledges_total,
                   -- Transaction counts
                   (
                       SELECT COUNT(*)
                       FROM transactions t
                       WHERE t.event_id = e.id
                         AND t.transaction_type IN ('offering', 'tithe', 'donation', 'pledge')
                   ) as offering_count,
                   (
                       SELECT COUNT(*)
                       FROM transactions t
                       WHERE t.event_id = e.id
                         AND t.transaction_type = 'expense'
                   ) as expense_count
            FROM events e
            WHERE e.church_id = $1
        `;

        let countQuery = `SELECT COUNT(*) FROM events WHERE church_id = $1`;
        const params: any[] = [churchId];

        if (search) {
            params.push(`%${search}%`);
            const searchCondition = ` AND (e.name ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
            query += searchCondition;
            countQuery += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
        }

        if (eventType) {
            params.push(eventType);
            query += ` AND e.event_type = $${params.length}`;
            countQuery += ` AND event_type = $${params.length}`;
        }

        if (locationType) {
            params.push(locationType);
            query += ` AND e.location_type = $${params.length}`;
            countQuery += ` AND location_type = $${params.length}`;
        }

        if (startDate) {
            params.push(startDate);
            query += ` AND e.start_date >= $${params.length}`;
            countQuery += ` AND start_date >= $${params.length}`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND e.start_date <= $${params.length}`;
            countQuery += ` AND start_date <= $${params.length}`;
        }

        if (isActive !== undefined) {
            params.push(isActive);
            query += ` AND e.is_active = $${params.length}`;
            countQuery += ` AND is_active = $${params.length}`;
        }

        if (isPaid !== undefined) {
            params.push(isPaid);
            query += ` AND e.is_paid = $${params.length}`;
            countQuery += ` AND is_paid = $${params.length}`;
        }

        if (isFeatured !== undefined) {
            params.push(isFeatured);
            query += ` AND e.is_featured = $${params.length}`;
            countQuery += ` AND is_featured = $${params.length}`;
        }

        if (groupId) {
            params.push(groupId);
            query += ` AND e.group_id = $${params.length}`;
            countQuery += ` AND group_id = $${params.length}`;
        }

        // Sort
        const validSortColumns = ['start_date', 'name', 'created_at'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'start_date';
        const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY e.${sortColumn} ${sortDirection}`;

        // Pagination
        const offset = (page - 1) * limit;
        params.push(limit, offset);
        query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const [eventsResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, params.slice(0, -2))
        ]);

        const total = parseInt(countResult.rows[0].count);

        return {
            events: eventsResult.rows.map(row => this.mapToEventWithFinancials(row)),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    private mapToEventWithFinancials(row: any): any {
        const event = this.mapToEvent(row);

        return {
            ...event,
            financials: {
                totalOfferings: parseFloat(row.total_offerings) || 0,
                totalExpenses: parseFloat(row.total_expenses) || 0,
                netAmount: (parseFloat(row.total_offerings) || 0) - (parseFloat(row.total_expenses) || 0),
                breakdown: {
                    tithes: parseFloat(row.tithes_total) || 0,
                    offerings: parseFloat(row.offerings_only_total) || 0,
                    donations: parseFloat(row.donations_total) || 0,
                    pledges: parseFloat(row.pledges_total) || 0
                },
                offeringCount: parseInt(row.offering_count) || 0,
                expenseCount: parseInt(row.expense_count) || 0
            }
        };
    }

    // Get offerings for a specific event
    async getEventOfferings(eventId: string, churchId: string): Promise<{
        summary: OfferingSummary;
        details: OfferingDetail[];
    }> {
        try {
            // Get offering details
            const detailsQuery = `
                SELECT 
                    t.id,
                    t.transaction_type,
                    t.amount,
                    t.payment_method,
                    t.transaction_date,
                    t.description,
                    t.donor_name,
                    a.name as account_name,
                    CONCAT(m.first_name, ' ', m.last_name) as member_name
                FROM transactions t
                LEFT JOIN accounts a ON a.id = t.account_id
                LEFT JOIN members m ON m.id = t.member_id
                WHERE t.event_id = $1 
                    AND t.church_id = $2
                    AND t.transaction_type IN ('offering', 'tithe', 'donation', 'pledge')
                ORDER BY t.transaction_date DESC, t.created_at DESC
            `;

            const detailsResult = await pool.query(detailsQuery, [eventId, churchId]);

            // Get summary
            const summaryQuery = `
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as offering_count,
                    COALESCE(SUM(CASE WHEN transaction_type = 'tithe' THEN amount ELSE 0 END), 0) as tithes,
                    COALESCE(SUM(CASE WHEN transaction_type = 'offering' THEN amount ELSE 0 END), 0) as offerings,
                    COALESCE(SUM(CASE WHEN transaction_type = 'donation' THEN amount ELSE 0 END), 0) as donations,
                    COALESCE(SUM(CASE WHEN transaction_type = 'pledge' THEN amount ELSE 0 END), 0) as pledges
                FROM transactions
                WHERE event_id = $1 
                    AND church_id = $2
                    AND transaction_type IN ('offering', 'tithe', 'donation', 'pledge')
            `;

            const summaryResult = await pool.query(summaryQuery, [eventId, churchId]);
            const summaryRow = summaryResult.rows[0];

            return {
                summary: {
                    totalAmount: parseFloat(summaryRow.total_amount) || 0,
                    offeringCount: parseInt(summaryRow.offering_count) || 0,
                    tithes: parseFloat(summaryRow.tithes) || 0,
                    offerings: parseFloat(summaryRow.offerings) || 0,
                    donations: parseFloat(summaryRow.donations) || 0,
                    pledges: parseFloat(summaryRow.pledges) || 0
                },
                details: detailsResult.rows.map(row => ({
                    id: row.id,
                    transactionType: row.transaction_type,
                    amount: parseFloat(row.amount),
                    paymentMethod: row.payment_method,
                    transactionDate: row.transaction_date,
                    accountName: row.account_name,
                    donorName: row.donor_name,
                    memberName: row.member_name,
                    description: row.description
                }))
            };
        } catch (error) {
            console.error('Error getting event offerings:', error);
            return {
                summary: {
                    totalAmount: 0,
                    offeringCount: 0,
                    tithes: 0,
                    offerings: 0,
                    donations: 0,
                    pledges: 0
                },
                details: []
            };
        }
    }

    async update(id: string, churchId: string, data: UpdateEventDTO): Promise<Event | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        const fieldMappings: Record<string, string> = {
            name: 'name',
            description: 'description',
            eventType: 'event_type',
            recurrence: 'recurrence',
            startDate: 'start_date',
            endDate: 'end_date',
            startTime: 'start_time',
            endTime: 'end_time',
            timezone: 'timezone',
            locationType: 'location_type',
            locationName: 'location_name',
            locationAddress: 'location_address',
            locationCity: 'location_city',
            locationMapUrl: 'location_map_url',
            onlinePlatform: 'online_platform',
            meetingLink: 'meeting_link',
            meetingId: 'meeting_id',
            meetingPassword: 'meeting_password',
            streamUrl: 'stream_url',
            capacity: 'capacity',
            isRegistrationRequired: 'is_registration_required',
            registrationDeadline: 'registration_deadline',
            maxRegistrations: 'max_registrations',
            isPaid: 'is_paid',
            price: 'price',
            currency: 'currency',
            earlyBirdPrice: 'early_bird_price',
            earlyBirdDeadline: 'early_bird_deadline',
            bannerUrl: 'banner_url',
            thumbnailUrl: 'thumbnail_url',
            isActive: 'is_active',
            isPublic: 'is_public',
            isFeatured: 'is_featured',
            allowSelfCheckin: 'allow_self_checkin',
            allowGuestCheckin: 'allow_guest_checkin',
            requireApproval: 'require_approval',
            sendReminders: 'send_reminders',
            reminderHours: 'reminder_hours',
            groupId: 'group_id',
            ministryId: 'ministry_id',
            tags: 'tags'
        };

        for (const [key, column] of Object.entries(fieldMappings)) {
            if (data[key as keyof UpdateEventDTO] !== undefined) {
                paramCount++;
                fields.push(`${column} = $${paramCount}`);
                let value = data[key as keyof UpdateEventDTO];
                if (key === 'tags' && Array.isArray(value)) {
                    value = JSON.stringify(value);
                }
                values.push(value);
            }
        }

        if (fields.length === 0) return this.findById(id, churchId);

        paramCount++;
        fields.push(`updated_at = NOW()`);

        values.push(id, churchId);
        const query = `
            UPDATE events
            SET ${fields.join(', ')}
            WHERE id = $${paramCount} AND church_id = $${paramCount + 1}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0] ? this.mapToEvent(result.rows[0]) : null;
    }

    async delete(id: string, churchId: string): Promise<void> {
        await pool.query('DELETE FROM events WHERE id = $1 AND church_id = $2', [id, churchId]);
    }

    async getStatistics(churchId: string): Promise<EventStatistics> {
        // Main stats query - using COALESCE for columns that might not exist
        const query = `
            SELECT 
                COUNT(*) as total_events,
                COUNT(*) FILTER (WHERE is_active = true) as active_events,
                COUNT(*) FILTER (WHERE start_date > CURRENT_DATE) as upcoming_events,
                COUNT(*) FILTER (WHERE is_paid = true) as paid_events,
                COUNT(*) FILTER (WHERE location_type IN ('online', 'hybrid')) as online_events
            FROM events 
            WHERE church_id = $1
        `;

        // Get registrations count from event_registrations table
        const registrationsQuery = `
            SELECT COUNT(*) as total_registrations
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE e.church_id = $1
        `;

        // Get attendance from attendance table or event_instances
        const attendanceQuery = `
            SELECT 
                COALESCE(SUM(ei.total_attendance), 0) as total_attendance,
                COALESCE(AVG(NULLIF(ei.total_attendance, 0)), 0) as average_attendance
            FROM event_instances ei
            JOIN events e ON ei.event_id = e.id
            WHERE e.church_id = $1
        `;

        // Get revenue from event_registrations
        const revenueQuery = `
            SELECT COALESCE(SUM(er.amount_paid), 0) as total_revenue
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE e.church_id = $1 AND er.payment_status = 'paid'
        `;

        // Top events by attendance
        const topEventsQuery = `
            SELECT 
                e.id, 
                e.name, 
                COALESCE(SUM(ei.total_attendance), 0) as attendance
            FROM events e
            LEFT JOIN event_instances ei ON e.id = ei.event_id
            WHERE e.church_id = $1
            GROUP BY e.id, e.name
            ORDER BY attendance DESC NULLS LAST
            LIMIT 5
        `;

        // Events by type
        const byTypeQuery = `
            SELECT event_type as type, COUNT(*) as count
            FROM events
            WHERE church_id = $1
            GROUP BY event_type
        `;

        // Registrations by month
        const registrationsByMonthQuery = `
            SELECT 
                TO_CHAR(er.registered_at, 'YYYY-MM') as month,
                COUNT(*) as count
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE e.church_id = $1 AND er.registered_at IS NOT NULL
            GROUP BY TO_CHAR(er.registered_at, 'YYYY-MM')
            ORDER BY month DESC
            LIMIT 12
        `;

        try {
            const [
                statsResult,
                registrationsResult,
                attendanceResult,
                revenueResult,
                topEventsResult,
                byTypeResult,
                registrationsByMonthResult
            ] = await Promise.all([
                pool.query(query, [churchId]),
                pool.query(registrationsQuery, [churchId]),
                pool.query(attendanceQuery, [churchId]),
                pool.query(revenueQuery, [churchId]),
                pool.query(topEventsQuery, [churchId]),
                pool.query(byTypeQuery, [churchId]),
                pool.query(registrationsByMonthQuery, [churchId])
            ]);

            const stats = statsResult.rows[0];
            const registrations = registrationsResult.rows[0];
            const attendance = attendanceResult.rows[0];
            const revenue = revenueResult.rows[0];

            return {
                totalEvents: parseInt(stats.total_events) || 0,
                activeEvents: parseInt(stats.active_events) || 0,
                upcomingEvents: parseInt(stats.upcoming_events) || 0,
                paidEvents: parseInt(stats.paid_events) || 0,
                onlineEvents: parseInt(stats.online_events) || 0,
                totalRegistrations: parseInt(registrations.total_registrations) || 0,
                totalAttendance: parseInt(attendance.total_attendance) || 0,
                totalRevenue: parseFloat(revenue.total_revenue) || 0,
                averageAttendance: parseFloat(attendance.average_attendance) || 0,
                topEvents: topEventsResult.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    attendance: parseInt(row.attendance) || 0
                })),
                byType: byTypeResult.rows.map(row => ({
                    type: row.type,
                    count: parseInt(row.count) || 0
                })),
                registrationsByMonth: registrationsByMonthResult.rows.map(row => ({
                    month: row.month,
                    count: parseInt(row.count) || 0
                }))
            };
        } catch (error) {
            console.error('Error getting statistics:', error);
            // Return default values if query fails
            return {
                totalEvents: 0,
                activeEvents: 0,
                upcomingEvents: 0,
                paidEvents: 0,
                onlineEvents: 0,
                totalRegistrations: 0,
                totalAttendance: 0,
                totalRevenue: 0,
                averageAttendance: 0,
                topEvents: [],
                byType: [],
                registrationsByMonth: []
            };
        }
    }

    // ============================================================================
    // EVENT INSTANCES
    // ============================================================================

    async createInstance(churchId: string, data: CreateEventInstanceDTO): Promise<EventInstance> {
        const id = uuidv4();
        const qrCode = generateQRCode();

        const query = `
            INSERT INTO event_instances (
                id, event_id, church_id, instance_date, start_time, end_time,
                location_name, meeting_link, notes, qr_code, status,
                total_attendance, member_attendance, guest_attendance,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', 0, 0, 0, NOW(), NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            id, data.eventId, churchId, data.instanceDate, data.startTime || null, data.endTime || null,
            data.locationName || null, data.meetingLink || null, data.notes || null, qrCode
        ]);

        return this.mapToEventInstance(result.rows[0]);
    }

    async findInstances(eventId: string, churchId: string, options?: { upcoming?: boolean; limit?: number }): Promise<EventInstance[]> {
        let query = `
            SELECT * FROM event_instances
            WHERE event_id = $1 AND church_id = $2
        `;
        const params: any[] = [eventId, churchId];

        if (options?.upcoming) {
            query += ` AND instance_date >= CURRENT_DATE AND status != 'cancelled'`;
        }

        query += ` ORDER BY instance_date ASC, start_time ASC`;

        if (options?.limit) {
            params.push(options.limit);
            query += ` LIMIT $${params.length}`;
        }

        const result = await pool.query(query, params);
        return result.rows.map(row => this.mapToEventInstance(row));
    }

    async findInstanceById(instanceId: string, churchId: string): Promise<EventInstanceWithDetails | null> {
        const query = `
            SELECT
                ei.*,
                e.name as event_name,
                e.location_name as event_location_name,
                e.allow_self_checkin,
                e.allow_guest_checkin
            FROM event_instances ei
            JOIN events e ON ei.event_id = e.id
            WHERE ei.id = $1 AND ei.church_id = $2
        `;

        const result = await pool.query(query, [instanceId, churchId]);
        return result.rows[0] ? this.mapToEventInstanceWithDetails(result.rows[0]) : null;
    }

    async findInstanceByQRCode(qrCode: string): Promise<EventInstanceWithDetails | null> {
        const query = `
            SELECT
                ei.*,
                e.name as event_name,
                e.church_id,
                e.location_name as event_location_name,
                e.allow_self_checkin,
                e.allow_guest_checkin
            FROM event_instances ei
            JOIN events e ON ei.event_id = e.id
            WHERE ei.qr_code = $1
              AND e.is_active = true
              AND ei.status NOT IN ('cancelled')
        `;

        const result = await pool.query(query, [qrCode]);
        return result.rows[0] ? this.mapToEventInstanceWithDetails(result.rows[0]) : null;
    }

    async updateInstance(instanceId: string, churchId: string, data: UpdateEventInstanceDTO): Promise<EventInstance | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 0;

        const fieldMappings: Record<string, string> = {
            startTime: 'start_time',
            endTime: 'end_time',
            locationName: 'location_name',
            meetingLink: 'meeting_link',
            notes: 'notes',
            status: 'status',
            cancelledReason: 'cancelled_reason'
        };

        for (const [key, column] of Object.entries(fieldMappings)) {
            if (data[key as keyof UpdateEventInstanceDTO] !== undefined) {
                paramCount++;
                fields.push(`${column} = $${paramCount}`);
                values.push(data[key as keyof UpdateEventInstanceDTO]);
            }
        }

        if (data.status === 'cancelled') {
            fields.push('cancelled_at = NOW()');
        }

        if (fields.length === 0) {
            const instance = await this.findInstanceById(instanceId, churchId);
            return instance;
        }

        fields.push('updated_at = NOW()');

        values.push(instanceId, churchId);
        const query = `
            UPDATE event_instances
            SET ${fields.join(', ')}
            WHERE id = $${paramCount + 1} AND church_id = $${paramCount + 2}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0] ? this.mapToEventInstance(result.rows[0]) : null;
    }

    async updateInstanceAttendance(
        instanceId: string,
        churchId: string,
        data: { totalAttendance: number; memberAttendance: number; guestAttendance: number }
    ): Promise<void> {
        const query = `
            UPDATE event_instances
            SET
                total_attendance = $3,
                member_attendance = $4,
                guest_attendance = $5,
                updated_at = NOW()
            WHERE id = $1 AND church_id = $2
        `;

        await pool.query(query, [
            instanceId,
            churchId,
            data.totalAttendance,
            data.memberAttendance,
            data.guestAttendance
        ]);
    }

    // ============================================================================
    // REGISTRATIONS
    // ============================================================================

    async createRegistration(churchId: string, data: CreateRegistrationDTO): Promise<EventRegistration> {
        const id = uuidv4();
        const confirmationCode = this.generateConfirmationCode();
        const qrCode = generateQRCode();

        const query = `
            INSERT INTO event_registrations (
                id, event_id, event_instance_id, church_id,
                member_id, guest_name, guest_email, guest_phone,
                ticket_type, quantity, confirmation_code, qr_code,
                notes, special_requirements, status, payment_status,
                checked_in, registered_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', 'free', false, NOW(), NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            id, data.eventId, data.eventInstanceId || null, churchId,
            data.memberId || null, data.guestName || null, data.guestEmail || null, data.guestPhone || null,
            data.ticketType || 'general', data.quantity || 1, confirmationCode, qrCode,
            data.notes || null, data.specialRequirements || null
        ]);

        // Update registration count on event
        await pool.query(`
            UPDATE events
            SET current_registrations = COALESCE(current_registrations, 0) + $1
            WHERE id = $2
        `, [data.quantity || 1, data.eventId]);

        return this.mapToEventRegistration(result.rows[0]);
    }

    async findRegistrations(eventId: string, options?: {
        status?: string;
        paymentStatus?: string;
        page?: number;
        limit?: number;
    }): Promise<{ registrations: EventRegistration[]; total: number }> {
        let query = `
            SELECT er.*,
                   CONCAT(m.first_name, ' ', m.last_name) as member_name
            FROM event_registrations er
            LEFT JOIN members m ON er.member_id = m.id
            WHERE er.event_id = $1
        `;
        let countQuery = `SELECT COUNT(*) FROM event_registrations WHERE event_id = $1`;
        const params: any[] = [eventId];

        if (options?.status) {
            params.push(options.status);
            query += ` AND er.status = $${params.length}`;
            countQuery += ` AND status = $${params.length}`;
        }

        if (options?.paymentStatus) {
            params.push(options.paymentStatus);
            query += ` AND er.payment_status = $${params.length}`;
            countQuery += ` AND payment_status = $${params.length}`;
        }

        query += ` ORDER BY er.registered_at DESC`;

        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;
        params.push(limit, offset);
        query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const [registrationsResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, params.slice(0, -2))
        ]);

        return {
            registrations: registrationsResult.rows.map(row => this.mapToEventRegistration(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findRegistrationById(registrationId: string): Promise<EventRegistration | null> {
        const query = `
            SELECT er.*,
                   CONCAT(m.first_name, ' ', m.last_name) as member_name
            FROM event_registrations er
            LEFT JOIN members m ON er.member_id = m.id
            WHERE er.id = $1
        `;

        const result = await pool.query(query, [registrationId]);
        return result.rows[0] ? this.mapToEventRegistration(result.rows[0]) : null;
    }

    async findRegistrationByQRCode(qrCode: string): Promise<EventRegistration | null> {
        const query = `
            SELECT er.*, 
                   CONCAT(m.first_name, ' ', m.last_name) as member_name
            FROM event_registrations er
            LEFT JOIN members m ON er.member_id = m.id
            WHERE er.qr_code = $1
        `;

        const result = await pool.query(query, [qrCode]);
        return result.rows[0] ? this.mapToEventRegistration(result.rows[0]) : null;
    }

    async cancelRegistration(registrationId: string): Promise<void> {
        const registration = await this.findRegistrationById(registrationId);
        if (!registration) return;

        await pool.query(`
            UPDATE event_registrations 
            SET status = 'cancelled', cancelled_at = NOW()
            WHERE id = $1
        `, [registrationId]);

        // Update registration count on event
        await pool.query(`
            UPDATE events 
            SET current_registrations = GREATEST(COALESCE(current_registrations, 0) - $1, 0)
            WHERE id = $2
        `, [registration.quantity, registration.eventId]);
    }

    async updateRegistrationPayment(registrationId: string, paymentData: {
        paymentStatus: string;
        paymentReference?: string;
        amountPaid?: number;
        transactionId?: string;
        paymentMethod?: string;
    }): Promise<EventRegistration | null> {
        const query = `
            UPDATE event_registrations
            SET
                payment_status = $2,
                payment_reference = COALESCE($3, payment_reference),
                amount_paid = COALESCE($4, amount_paid),
                transaction_id = COALESCE($5, transaction_id),
                payment_method = COALESCE($6, payment_method),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [
            registrationId,
            paymentData.paymentStatus,
            paymentData.paymentReference || null,
            paymentData.amountPaid || null,
            paymentData.transactionId || null,
            paymentData.paymentMethod || null
        ]);

        return result.rows[0] ? this.mapToEventRegistration(result.rows[0]) : null;
    }

    async checkIn(registrationId: string, checkedInBy?: string): Promise<EventRegistration | null> {
        const query = `
            UPDATE event_registrations 
            SET 
                checked_in = true,
                checked_in_at = NOW(),
                checked_in_by = $2,
                status = 'attended'
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [registrationId, checkedInBy || null]);
        return result.rows[0] ? this.mapToEventRegistration(result.rows[0]) : null;
    }

    // ============================================================================
    // TICKET TYPES
    // ============================================================================

    async createTicketType(eventId: string, data: CreateTicketTypeDTO): Promise<EventTicketType> {
        const id = uuidv4();
        const query = `
            INSERT INTO event_ticket_types (
                id, event_id, name, description, price, currency,
                quantity_available, max_per_order, sale_start_date, sale_end_date,
                is_active, sort_order, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 0, NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            id, eventId, data.name, data.description || null, data.price, data.currency || 'USD',
            data.quantityAvailable || null, data.maxPerOrder || 10, data.saleStartDate || null, data.saleEndDate || null
        ]);

        return this.mapToTicketType(result.rows[0]);
    }

    async getTicketTypes(eventId: string): Promise<EventTicketType[]> {
        const query = `
            SELECT * FROM event_ticket_types
            WHERE event_id = $1 AND is_active = true
            ORDER BY sort_order ASC
        `;

        const result = await pool.query(query, [eventId]);
        return result.rows.map(row => this.mapToTicketType(row));
    }

    // ============================================================================
    // SHARING
    // ============================================================================

    async createShare(churchId: string, eventId: string, data: {
        shareType: string;
        sharedBy?: string;
        recipientCount: number;
        customMessage?: string;
    }): Promise<void> {
        const id = uuidv4();
        const query = `
            INSERT INTO event_shares (
                id, event_id, church_id, share_type, shared_by, 
                recipient_count, custom_message, shared_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `;

        await pool.query(query, [
            id, eventId, churchId, data.shareType, data.sharedBy || null,
            data.recipientCount, data.customMessage || null
        ]);
    }

    async getEventFinancials(eventId: string, churchId: string): Promise<{
        offerings: any[];
        expenses: any[];
        summary: {
            totalOfferings: number;
            totalTithes: number;
            totalDonations: number;
            totalPledges: number;
            totalExpenses: number;
            netAmount: number;
        };
    }> {
        const client = await pool.connect();

        try {
            // Get offerings
            const offeringsQuery = `
        SELECT t.*,
          a.name as account_name,
          m.first_name as member_first_name,
          m.last_name as member_last_name
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        LEFT JOIN members m ON m.id = t.member_id
        WHERE t.event_id = $1 
          AND t.church_id = $2
          AND t.transaction_type IN ('offering', 'tithe', 'donation', 'pledge')
        ORDER BY t.transaction_date DESC
      `;

            // Get expenses
            const expensesQuery = `
        SELECT t.*,
          a.name as account_name,
          ec.name as expense_category_name
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        LEFT JOIN expense_categories ec ON ec.id = t.expense_category_id
        WHERE t.event_id = $1 
          AND t.church_id = $2
          AND t.transaction_type = 'expense'
        ORDER BY t.transaction_date DESC
      `;

            // Get summary
            const summaryQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'offering' THEN amount ELSE 0 END), 0) as offerings,
          COALESCE(SUM(CASE WHEN transaction_type = 'tithe' THEN amount ELSE 0 END), 0) as tithes,
          COALESCE(SUM(CASE WHEN transaction_type = 'donation' THEN amount ELSE 0 END), 0) as donations,
          COALESCE(SUM(CASE WHEN transaction_type = 'pledge' THEN amount ELSE 0 END), 0) as pledges,
          COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN ABS(amount) ELSE 0 END), 0) as expenses
        FROM transactions
        WHERE event_id = $1 AND church_id = $2
      `;

            const [offeringsResult, expensesResult, summaryResult] = await Promise.all([
                client.query(offeringsQuery, [eventId, churchId]),
                client.query(expensesQuery, [eventId, churchId]),
                client.query(summaryQuery, [eventId, churchId])
            ]);

            const summary = summaryResult.rows[0];
            const totalIncome = parseFloat(summary.offerings) + parseFloat(summary.tithes) +
                parseFloat(summary.donations) + parseFloat(summary.pledges);

            return {
                offerings: offeringsResult.rows.map(this.transformTransaction),
                expenses: expensesResult.rows.map(this.transformTransaction),
                summary: {
                    totalOfferings: parseFloat(summary.offerings),
                    totalTithes: parseFloat(summary.tithes),
                    totalDonations: parseFloat(summary.donations),
                    totalPledges: parseFloat(summary.pledges),
                    totalExpenses: parseFloat(summary.expenses),
                    netAmount: totalIncome - parseFloat(summary.expenses)
                }
            };
        } finally {
            client.release();
        }
    }

    private transformTransaction(row: any): any {
        return {
            id: row.id,
            transactionType: row.transaction_type,
            amount: parseFloat(row.amount),
            description: row.description,
            paymentMethod: row.payment_method,
            transactionDate: row.transaction_date,
            accountName: row.account_name,
            donorName: row.donor_name,
            memberName: row.member_first_name ? `${row.member_first_name} ${row.member_last_name}` : null,
            expenseCategoryName: row.expense_category_name
        };
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private generateConfirmationCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    private mapToEvent(row: any): Event {
        return {
            id: row.id,
            churchId: row.church_id,
            name: row.name,
            description: row.description,
            eventType: row.event_type,
            recurrence: row.recurrence || 'none',
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            timezone: row.timezone || 'UTC',
            locationType: row.location_type || 'physical',
            locationName: row.location_name,
            locationAddress: row.location_address,
            locationCity: row.location_city,
            locationMapUrl: row.location_map_url,
            onlinePlatform: row.online_platform,
            meetingLink: row.meeting_link,
            meetingId: row.meeting_id,
            meetingPassword: row.meeting_password,
            streamUrl: row.stream_url,
            capacity: row.capacity,
            isRegistrationRequired: row.is_registration_required ?? false,
            registrationDeadline: row.registration_deadline,
            maxRegistrations: row.max_registrations,
            currentRegistrations: row.current_registrations || 0,
            isPaid: row.is_paid ?? false,
            price: row.price ? parseFloat(row.price) : undefined,
            currency: row.currency || 'USD',
            earlyBirdPrice: row.early_bird_price ? parseFloat(row.early_bird_price) : undefined,
            earlyBirdDeadline: row.early_bird_deadline,
            bannerUrl: row.banner_url,
            thumbnailUrl: row.thumbnail_url,
            qrCode: row.qr_code,
            isActive: row.is_active ?? true,
            isPublic: row.is_public ?? true,
            isFeatured: row.is_featured ?? false,
            allowSelfCheckin: row.allow_self_checkin ?? true,
            allowGuestCheckin: row.allow_guest_checkin ?? false,
            requireApproval: row.require_approval ?? false,
            sendReminders: row.send_reminders ?? true,
            reminderHours: row.reminder_hours || 24,
            groupId: row.group_id,
            groupName: row.group_name,
            ministryId: row.ministry_id,
            tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : undefined,
            customFields: row.custom_fields,
            totalAttendance: row.total_attendance || 0,
            totalRegistrations: row.total_registrations || 0,
            totalRevenue: row.total_revenue ? parseFloat(row.total_revenue) : 0,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapToEventWithOfferings(row: any): EventWithOfferings {
        const event = this.mapToEvent(row);

        return {
            ...event,
            offerings: {
                totalAmount: parseFloat(row.total_offerings_amount) || 0,
                offeringCount: parseInt(row.offerings_count) || 0,
                tithes: parseFloat(row.tithes_total) || 0,
                offerings: parseFloat(row.offerings_total) || 0,
                donations: parseFloat(row.donations_total) || 0,
                pledges: parseFloat(row.pledges_total) || 0
            }
        };
    }

    private mapToEventInstance(row: any): EventInstance {
        return {
            id: row.id,
            eventId: row.event_id,
            churchId: row.church_id,
            instanceDate: row.instance_date,
            startTime: row.start_time,
            endTime: row.end_time,
            locationName: row.location_name,
            meetingLink: row.meeting_link,
            notes: row.notes,
            qrCode: row.qr_code,
            status: row.status || 'scheduled',
            expectedAttendance: row.expected_attendance || 0,
            totalAttendance: row.total_attendance || 0,
            memberAttendance: row.member_attendance || 0,
            guestAttendance: row.guest_attendance || 0,
            cancelledAt: row.cancelled_at,
            cancelledReason: row.cancelled_reason,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapToEventInstanceWithDetails(row: any): EventInstanceWithDetails {
        return {
            ...this.mapToEventInstance(row),
            event_name: row.event_name,
            church_id: row.church_id,
            location_name: row.location_name || row.event_location_name,
            instance_date: row.instance_date,
            allow_self_checkin: row.allow_self_checkin ?? true,
            allow_guest_checkin: row.allow_guest_checkin ?? false
        };
    }

    private mapToEventRegistration(row: any): EventRegistration {
        return {
            id: row.id,
            eventId: row.event_id,
            eventInstanceId: row.event_instance_id,
            churchId: row.church_id,
            memberId: row.member_id,
            memberName: row.member_name,
            guestName: row.guest_name,
            guestEmail: row.guest_email,
            guestPhone: row.guest_phone,
            ticketType: row.ticket_type || 'general',
            quantity: row.quantity || 1,
            paymentStatus: row.payment_status || 'free',
            paymentMethod: row.payment_method,
            paymentReference: row.payment_reference,
            amountPaid: row.amount_paid ? parseFloat(row.amount_paid) : undefined,
            transactionId: row.transaction_id,
            status: row.status || 'pending',
            confirmationCode: row.confirmation_code,
            qrCode: row.qr_code,
            checkedIn: row.checked_in ?? false,
            checkedInAt: row.checked_in_at,
            checkedInBy: row.checked_in_by,
            notes: row.notes,
            specialRequirements: row.special_requirements,
            registeredAt: row.registered_at || row.created_at,
            confirmedAt: row.confirmed_at,
            cancelledAt: row.cancelled_at
        };
    }

    private mapToTicketType(row: any): EventTicketType {
        return {
            id: row.id,
            eventId: row.event_id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price) || 0,
            currency: row.currency || 'USD',
            quantityAvailable: row.quantity_available,
            quantitySold: row.quantity_sold || 0,
            maxPerOrder: row.max_per_order || 10,
            saleStartDate: row.sale_start_date,
            saleEndDate: row.sale_end_date,
            isActive: row.is_active ?? true,
            sortOrder: row.sort_order || 0
        };
    }
}