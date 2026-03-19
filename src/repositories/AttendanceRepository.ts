// src/repositories/AttendanceRepository.ts
import {pool} from '@config/database';
import {
    Attendance,
    CheckinDTO,
    AttendanceFilters,
    AttendanceStats,
    MemberAttendanceHistory
} from '@/dtos/attendance.types';
import { v4 as uuidv4 } from 'uuid';

export class AttendanceRepository {

    // ============================================================================
    // CHECK-IN / CHECK-OUT
    // ============================================================================

    async checkin(
        churchId: string,
        data: CheckinDTO,
        checkedInBy?: string,
        isFirstTime: boolean = false
    ): Promise<Attendance> {
        const id = uuidv4();
        const query = `
            INSERT INTO attendance (
                id, church_id, event_instance_id, member_id,
                guest_name, guest_email, guest_phone,
                checkin_type, checkin_time, checked_in_by,
                notes, is_first_time, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, NOW())
            RETURNING *,
                (SELECT CONCAT(first_name, ' ', last_name) FROM members WHERE id = member_id) as member_name
        `;

        const result = await pool.query(query, [
            id,
            churchId,
            data.event_instance_id,
            data.member_id || null,
            data.guest_name || null,
            data.guest_email || null,
            data.guest_phone || null,
            data.checkin_type,
            checkedInBy || null,
            data.notes || null,
            isFirstTime
        ]);

        return this.mapToAttendance(result.rows[0]);
    }

    async checkout(churchId: string, attendanceId: string): Promise<Attendance | null> {
        const query = `
            UPDATE attendance 
            SET checkout_time = NOW()
            WHERE id = $1 AND church_id = $2
            RETURNING *,
                (SELECT CONCAT(first_name, ' ', last_name) FROM members WHERE id = member_id) as member_name
        `;

        const result = await pool.query(query, [attendanceId, churchId]);
        return result.rows[0] ? this.mapToAttendance(result.rows[0]) : null;
    }

    async bulkCheckin(
        churchId: string,
        eventInstanceId: string,
        memberIds: string[],
        checkedInBy: string
    ): Promise<Attendance[]> {
        const attendances: Attendance[] = [];

        for (const memberId of memberIds) {
            const isFirstTime = await this.isFirstTimeAttendee(churchId, memberId);
            const attendance = await this.checkin(
                churchId,
                {
                    event_instance_id: eventInstanceId,
                    member_id: memberId,
                    checkin_type: 'manual'
                },
                checkedInBy,
                isFirstTime
            );
            attendances.push(attendance);
        }

        return attendances;
    }

    // ============================================================================
    // QUERIES
    // ============================================================================

    async findExistingCheckin(
        churchId: string,
        eventInstanceId: string,
        memberId: string
    ): Promise<Attendance | null> {
        const query = `
            SELECT * FROM attendance 
            WHERE church_id = $1 
              AND event_instance_id = $2 
              AND member_id = $3
        `;

        const result = await pool.query(query, [churchId, eventInstanceId, memberId]);
        return result.rows[0] ? this.mapToAttendance(result.rows[0]) : null;
    }

    async findByEventInstance(
        churchId: string,
        eventInstanceId: string,
        filters?: AttendanceFilters
    ): Promise<Attendance[]> {
        let query = `
            SELECT a.*,
                CONCAT(m.first_name, ' ', m.last_name) as member_name,
                m.email as member_email,
                m.phone as member_phone,
                m.photo_url as member_photo
            FROM attendance a
            LEFT JOIN members m ON a.member_id = m.id
            WHERE a.church_id = $1 AND a.event_instance_id = $2
        `;
        const params: any[] = [churchId, eventInstanceId];

        if (filters?.checkin_type) {
            params.push(filters.checkin_type);
            query += ` AND a.checkin_type = $${params.length}`;
        }

        if (filters?.is_first_time !== undefined) {
            params.push(filters.is_first_time);
            query += ` AND a.is_first_time = $${params.length}`;
        }

        query += ' ORDER BY a.checkin_time DESC';

        const result = await pool.query(query, params);
        return result.rows.map(row => this.mapToAttendance(row));
    }

    async isFirstTimeAttendee(churchId: string, memberId: string): Promise<boolean> {
        const query = `
            SELECT COUNT(*) as count 
            FROM attendance 
            WHERE church_id = $1 AND member_id = $2
        `;

        const result = await pool.query(query, [churchId, memberId]);
        return parseInt(result.rows[0].count) === 0;
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getEventInstanceStats(
        churchId: string,
        eventInstanceId: string
    ): Promise<{
        total_attendance: number;
        unique_members: number;
        guests: number;
        first_timers: number;
        checkin_types: Record<string, number>;
    }> {
        const query = `
            SELECT 
                COUNT(*) as total_attendance,
                COUNT(DISTINCT member_id) FILTER (WHERE member_id IS NOT NULL) as unique_members,
                COUNT(*) FILTER (WHERE member_id IS NULL) as guests,
                COUNT(*) FILTER (WHERE is_first_time = true) as first_timers,
                checkin_type,
                COUNT(*) as type_count
            FROM attendance
            WHERE church_id = $1 AND event_instance_id = $2
            GROUP BY GROUPING SETS ((), (checkin_type))
        `;

        const result = await pool.query(query, [churchId, eventInstanceId]);

        const stats = {
            total_attendance: 0,
            unique_members: 0,
            guests: 0,
            first_timers: 0,
            checkin_types: {} as Record<string, number>
        };

        for (const row of result.rows) {
            if (row.checkin_type === null) {
                stats.total_attendance = parseInt(row.total_attendance) || 0;
                stats.unique_members = parseInt(row.unique_members) || 0;
                stats.guests = parseInt(row.guests) || 0;
                stats.first_timers = parseInt(row.first_timers) || 0;
            } else {
                stats.checkin_types[row.checkin_type] = parseInt(row.type_count) || 0;
            }
        }

        return stats;
    }

    async getStatistics(churchId: string, options?: {
        startDate?: string;
        endDate?: string;
        eventId?: string;
    }): Promise<AttendanceStats> {
        let query = `
            SELECT 
                COUNT(*) as total_attendance,
                COUNT(DISTINCT member_id) FILTER (WHERE member_id IS NOT NULL) as unique_members,
                COUNT(*) FILTER (WHERE is_first_time = true) as first_timers,
                COUNT(*) FILTER (WHERE member_id IS NULL) as guests
            FROM attendance a
            JOIN event_instances ei ON a.event_instance_id = ei.id
            WHERE a.church_id = $1
        `;
        const params: any[] = [churchId];

        if (options?.startDate) {
            params.push(options.startDate);
            query += ` AND ei.instance_date >= $${params.length}`;
        }

        if (options?.endDate) {
            params.push(options.endDate);
            query += ` AND ei.instance_date <= $${params.length}`;
        }

        if (options?.eventId) {
            params.push(options.eventId);
            query += ` AND ei.event_id = $${params.length}`;
        }

        const result = await pool.query(query, params);
        const row = result.rows[0];

        // Get average and trend
        const avgQuery = `
            SELECT 
                AVG(attendance_count) as average_attendance,
                COUNT(*) as instance_count
            FROM (
                SELECT event_instance_id, COUNT(*) as attendance_count
                FROM attendance
                WHERE church_id = $1
                GROUP BY event_instance_id
            ) counts
        `;
        const avgResult = await pool.query(avgQuery, [churchId]);

        // Calculate trend (compare last month to previous month)
        const trendQuery = `
            SELECT 
                SUM(CASE WHEN date_trunc('month', checkin_time) = date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END) as current_month,
                SUM(CASE WHEN date_trunc('month', checkin_time) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN 1 ELSE 0 END) as previous_month
            FROM attendance
            WHERE church_id = $1
        `;
        const trendResult = await pool.query(trendQuery, [churchId]);
        const currentMonth = parseInt(trendResult.rows[0].current_month) || 0;
        const previousMonth = parseInt(trendResult.rows[0].previous_month) || 1;
        const trendPercentage = previousMonth > 0
            ? ((currentMonth - previousMonth) / previousMonth) * 100
            : 0;

        return {
            total_attendance: parseInt(row.total_attendance) || 0,
            unique_members: parseInt(row.unique_members) || 0,
            first_timers: parseInt(row.first_timers) || 0,
            guests: parseInt(row.guests) || 0,
            average_attendance: parseFloat(avgResult.rows[0].average_attendance) || 0,
            trend_percentage: Math.round(trendPercentage * 10) / 10
        };
    }

    async getAttendanceTrends(
        churchId: string,
        period: 'weekly' | 'monthly',
        months: number
    ): Promise<Array<{ period: string; attendance: number; members: number; guests: number }>> {
        const interval = period === 'weekly' ? 'week' : 'month';
        const query = `
            SELECT 
                date_trunc($3, a.checkin_time)::date as period,
                COUNT(*) as attendance,
                COUNT(DISTINCT a.member_id) FILTER (WHERE a.member_id IS NOT NULL) as members,
                COUNT(*) FILTER (WHERE a.member_id IS NULL) as guests
            FROM attendance a
            WHERE a.church_id = $1 
              AND a.checkin_time >= CURRENT_DATE - INTERVAL '${months} months'
            GROUP BY date_trunc($3, a.checkin_time)
            ORDER BY period DESC
        `;

        const result = await pool.query(query, [churchId, months, interval]);
        return result.rows.map(row => ({
            period: row.period,
            attendance: parseInt(row.attendance),
            members: parseInt(row.members),
            guests: parseInt(row.guests)
        }));
    }

    // ============================================================================
    // MEMBER HISTORY
    // ============================================================================

    async getMemberAttendanceHistory(
        churchId: string,
        memberId: string,
        options?: { startDate?: string; endDate?: string; limit?: number }
    ): Promise<MemberAttendanceHistory> {
        // Get member info
        const memberQuery = `
            SELECT CONCAT(first_name, ' ', last_name) as member_name
            FROM members
            WHERE id = $1 AND church_id = $2
        `;
        const memberResult = await pool.query(memberQuery, [memberId, churchId]);
        const memberName = memberResult.rows[0]?.member_name || 'Unknown';

        // Get attendance history
        let historyQuery = `
            SELECT 
                a.id,
                a.checkin_time,
                a.checkout_time,
                a.checkin_type,
                a.is_first_time,
                ei.instance_date,
                e.name as event_name,
                e.event_type
            FROM attendance a
            JOIN event_instances ei ON a.event_instance_id = ei.id
            JOIN events e ON ei.event_id = e.id
            WHERE a.church_id = $1 AND a.member_id = $2
        `;
        const params: any[] = [churchId, memberId];

        if (options?.startDate) {
            params.push(options.startDate);
            historyQuery += ` AND ei.instance_date >= $${params.length}`;
        }

        if (options?.endDate) {
            params.push(options.endDate);
            historyQuery += ` AND ei.instance_date <= $${params.length}`;
        }

        historyQuery += ' ORDER BY a.checkin_time DESC';

        if (options?.limit) {
            params.push(options.limit);
            historyQuery += ` LIMIT $${params.length}`;
        }

        const historyResult = await pool.query(historyQuery, params);

        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_attendance,
                MAX(a.checkin_time) as last_attended,
                COUNT(DISTINCT ei.event_id) as unique_events
            FROM attendance a
            JOIN event_instances ei ON a.event_instance_id = ei.id
            WHERE a.church_id = $1 AND a.member_id = $2
        `;
        const statsResult = await pool.query(statsQuery, [churchId, memberId]);

        // Calculate attendance rate (last 12 weeks)
        const rateQuery = `
            WITH weeks AS (
                SELECT generate_series(
                    date_trunc('week', CURRENT_DATE - INTERVAL '12 weeks'),
                    date_trunc('week', CURRENT_DATE),
                    INTERVAL '1 week'
                )::date as week_start
            ),
            weekly_events AS (
                SELECT DISTINCT date_trunc('week', ei.instance_date)::date as week_start
                FROM event_instances ei
                JOIN events e ON ei.event_id = e.id
                WHERE e.church_id = $1 
                  AND e.event_type = 'service'
                  AND ei.instance_date >= CURRENT_DATE - INTERVAL '12 weeks'
            ),
            member_attendance AS (
                SELECT DISTINCT date_trunc('week', ei.instance_date)::date as week_start
                FROM attendance a
                JOIN event_instances ei ON a.event_instance_id = ei.id
                JOIN events e ON ei.event_id = e.id
                WHERE a.church_id = $1 
                  AND a.member_id = $2
                  AND e.event_type = 'service'
                  AND ei.instance_date >= CURRENT_DATE - INTERVAL '12 weeks'
            )
            SELECT 
                (SELECT COUNT(*) FROM member_attendance) as attended_weeks,
                (SELECT COUNT(*) FROM weekly_events) as total_weeks
        `;
        const rateResult = await pool.query(rateQuery, [churchId, memberId]);
        const attendedWeeks = parseInt(rateResult.rows[0].attended_weeks) || 0;
        const totalWeeks = parseInt(rateResult.rows[0].total_weeks) || 1;
        const attendanceRate = (attendedWeeks / totalWeeks) * 100;

        // Calculate consecutive absences
        const absenceQuery = `
            WITH last_attendance AS (
                SELECT MAX(ei.instance_date) as last_date
                FROM attendance a
                JOIN event_instances ei ON a.event_instance_id = ei.id
                WHERE a.church_id = $1 AND a.member_id = $2
            ),
            services_since AS (
                SELECT COUNT(*) as count
                FROM event_instances ei
                JOIN events e ON ei.event_id = e.id
                WHERE e.church_id = $1 
                  AND e.event_type = 'service'
                  AND ei.instance_date > (SELECT last_date FROM last_attendance)
                  AND ei.instance_date <= CURRENT_DATE
            )
            SELECT count FROM services_since
        `;
        const absenceResult = await pool.query(absenceQuery, [churchId, memberId]);
        const consecutiveAbsences = parseInt(absenceResult.rows[0]?.count) || 0;

        return {
            member_id: memberId,
            member_name: memberName,
            total_attendance: parseInt(statsResult.rows[0].total_attendance) || 0,
            last_attended: statsResult.rows[0].last_attended,
            attendance_rate: Math.round(attendanceRate * 10) / 10,
            consecutive_absences: consecutiveAbsences,
            history: historyResult.rows.map(row => ({
                id: row.id,
                event_name: row.event_name,
                event_type: row.event_type,
                date: row.instance_date,
                checkin_time: row.checkin_time,
                checkout_time: row.checkout_time,
                checkin_type: row.checkin_type,
                is_first_time: row.is_first_time
            }))
        };
    }

    async getInactiveMembers(churchId: string, days: number): Promise<Array<{
        member_id: string;
        member_name: string;
        email: string;
        phone: string;
        last_attended: Date | null;
        days_inactive: number;
        total_attendance: number;
    }>> {
        const query = `
            WITH member_last_attendance AS (
                SELECT 
                    m.id as member_id,
                    CONCAT(m.first_name, ' ', m.last_name) as member_name,
                    m.email,
                    m.phone,
                    MAX(a.checkin_time) as last_attended,
                    COUNT(a.id) as total_attendance
                FROM members m
                LEFT JOIN attendance a ON m.id = a.member_id
                WHERE m.church_id = $1 AND m.status = 'active'
                GROUP BY m.id, m.first_name, m.last_name, m.email, m.phone
            )
            SELECT 
                member_id,
                member_name,
                email,
                phone,
                last_attended,
                COALESCE(EXTRACT(DAY FROM (CURRENT_TIMESTAMP - last_attended)), 9999)::int as days_inactive,
                total_attendance
            FROM member_last_attendance
            WHERE last_attended IS NULL 
               OR last_attended < CURRENT_TIMESTAMP - INTERVAL '${days} days'
            ORDER BY last_attended ASC NULLS FIRST
        `;

        const result = await pool.query(query, [churchId]);
        return result.rows;
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private mapToAttendance(row: any): Attendance {
        return {
            id: row.id,
            church_id: row.church_id,
            event_instance_id: row.event_instance_id,
            member_id: row.member_id,
            member_name: row.member_name,
            member_email: row.member_email,
            member_phone: row.member_phone,
            member_photo: row.member_photo,
            guest_name: row.guest_name,
            guest_email: row.guest_email,
            guest_phone: row.guest_phone,
            checkin_type: row.checkin_type,
            checkin_time: row.checkin_time,
            checkout_time: row.checkout_time,
            checked_in_by: row.checked_in_by,
            notes: row.notes,
            is_first_time: row.is_first_time,
            created_at: row.created_at
        };
    }
}