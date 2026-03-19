// src/repositories/ReportRepository.ts

import { pool } from '@config/database';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import {
    ReportFilters,
    DashboardStats,
    AttendanceTrendReport,
    MemberGrowthReport,
    FirstTimerConversionReport,
    FinancialSummaryReport,
    EventPerformanceReport,
    InactiveMemberReport,
    FamilyAttendanceReport,
    GroupActivityReport,
    ServiceReport,
    InactiveMemberFilters,
} from '@/dtos/report.types';
import { format, subDays } from 'date-fns';

export class ReportRepository {
    // ============================================================================
    // DASHBOARD STATS
    // ============================================================================

    async getDashboardStats(churchId: string): Promise<DashboardStats> {
        const client = await pool.connect();

        try {
            const query = `
                WITH member_stats AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as total_members,
                        COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active_members,
                        COUNT(*) FILTER (WHERE status = 'inactive' AND deleted_at IS NULL) as inactive_members,
                        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND deleted_at IS NULL) as new_this_month,
                        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE) AND deleted_at IS NULL) as new_this_week
                    FROM members 
                    WHERE church_id = $1
                ),
                family_stats AS (
                    SELECT COUNT(*) as total_families
                    FROM families 
                    WHERE church_id = $1 AND is_active = true
                ),
                first_timer_stats AS (
                    SELECT 
                        COUNT(*) as total_first_timers,
                        COUNT(*) FILTER (WHERE first_visit_date >= DATE_TRUNC('month', CURRENT_DATE)) as new_this_month,
                        COUNT(*) FILTER (WHERE first_visit_date >= DATE_TRUNC('week', CURRENT_DATE)) as new_this_week,
                        COUNT(*) FILTER (WHERE status = 'converted') as converted,
                        COUNT(*) FILTER (WHERE follow_up_status = 'pending') as pending_followups
                    FROM first_timers 
                    WHERE church_id = $1 AND deleted_at IS NULL
                ),
                group_stats AS (
                    SELECT 
                        COUNT(*) as total_groups,
                        COUNT(*) FILTER (WHERE is_active = true) as active_groups
                    FROM groups 
                    WHERE church_id = $1
                ),
                event_stats AS (
                    SELECT 
                        COUNT(DISTINCT e.id) as total_events,
                        COUNT(DISTINCT ei.id) FILTER (WHERE ei.instance_date >= CURRENT_DATE) as upcoming_events
                    FROM events e
                    LEFT JOIN event_instances ei ON ei.event_id = e.id AND ei.status != 'cancelled'
                    WHERE e.church_id = $1 AND e.deleted_at IS NULL
                ),
                attendance_stats AS (
                    SELECT 
                        COALESCE(AVG(ei.total_attendance), 0) as average_attendance,
                        COALESCE(SUM(ei.total_attendance) FILTER (WHERE ei.instance_date >= DATE_TRUNC('week', CURRENT_DATE)), 0) as this_week,
                        COALESCE(SUM(ei.total_attendance) FILTER (
                            WHERE ei.instance_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week' 
                            AND ei.instance_date < DATE_TRUNC('week', CURRENT_DATE)
                        ), 0) as last_week
                    FROM event_instances ei
                    WHERE ei.church_id = $1 AND ei.status = 'completed'
                ),
                financial_stats AS (
                    SELECT 
                        COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) as total_revenue,
                        COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
                        COALESCE(SUM(CASE WHEN transaction_type = 'income' AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as revenue_this_month,
                        COALESCE(SUM(CASE WHEN transaction_type = 'expense' AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as expenses_this_month
                    FROM transactions 
                    WHERE church_id = $1 AND approval_status = 'approved'
                )
                SELECT 
                    m.total_members,
                    m.active_members,
                    m.inactive_members,
                    m.new_this_month as new_members_this_month,
                    m.new_this_week as new_members_this_week,
                    CASE 
                        WHEN m.total_members > 0 THEN ROUND((m.new_this_month::numeric / m.total_members * 100), 2)
                        ELSE 0
                    END as member_growth_rate,
                    f.total_families,
                    ft.total_first_timers,
                    ft.new_this_month as first_timers_this_month,
                    ft.new_this_week as first_timers_this_week,
                    CASE 
                        WHEN ft.total_first_timers > 0 THEN ROUND((ft.converted::numeric / ft.total_first_timers * 100), 2)
                        ELSE 0
                    END as conversion_rate,
                    ft.pending_followups as pending_follow_ups,
                    g.total_groups,
                    g.active_groups,
                    e.total_events,
                    e.upcoming_events,
                    ROUND(a.average_attendance::numeric, 0) as average_attendance,
                    a.this_week as attendance_this_week,
                    a.last_week as attendance_last_week,
                    CASE 
                        WHEN a.last_week > 0 THEN ROUND(((a.this_week - a.last_week) / a.last_week * 100), 2)
                        ELSE 0
                    END as attendance_growth,
                    fn.total_revenue,
                    fn.total_expenses,
                    fn.total_revenue - fn.total_expenses as net_income,
                    fn.revenue_this_month,
                    fn.expenses_this_month
                FROM member_stats m
                CROSS JOIN family_stats f
                CROSS JOIN first_timer_stats ft
                CROSS JOIN group_stats g
                CROSS JOIN event_stats e
                CROSS JOIN attendance_stats a
                CROSS JOIN financial_stats fn
            `;

            const result = await client.query(query, [churchId]);
            const row = result.rows[0];

            return {
                totalMembers: parseInt(row.total_members) || 0,
                activeMembers: parseInt(row.active_members) || 0,
                inactiveMembers: parseInt(row.inactive_members) || 0,
                newMembersThisMonth: parseInt(row.new_members_this_month) || 0,
                newMembersThisWeek: parseInt(row.new_members_this_week) || 0,
                memberGrowthRate: parseFloat(row.member_growth_rate) || 0,
                totalFamilies: parseInt(row.total_families) || 0,
                totalFirstTimers: parseInt(row.total_first_timers) || 0,
                firstTimersThisMonth: parseInt(row.first_timers_this_month) || 0,
                firstTimersThisWeek: parseInt(row.first_timers_this_week) || 0,
                conversionRate: parseFloat(row.conversion_rate) || 0,
                pendingFollowUps: parseInt(row.pending_follow_ups) || 0,
                totalGroups: parseInt(row.total_groups) || 0,
                activeGroups: parseInt(row.active_groups) || 0,
                totalEvents: parseInt(row.total_events) || 0,
                upcomingEvents: parseInt(row.upcoming_events) || 0,
                averageAttendance: parseInt(row.average_attendance) || 0,
                attendanceThisWeek: parseInt(row.attendance_this_week) || 0,
                attendanceLastWeek: parseInt(row.attendance_last_week) || 0,
                attendanceGrowth: parseFloat(row.attendance_growth) || 0,
                totalRevenue: parseFloat(row.total_revenue) || 0,
                totalExpenses: parseFloat(row.total_expenses) || 0,
                netIncome: parseFloat(row.net_income) || 0,
                revenueThisMonth: parseFloat(row.revenue_this_month) || 0,
                expensesThisMonth: parseFloat(row.expenses_this_month) || 0,
            };
        } catch (error) {
            logger.error('Error in ReportRepository.getDashboardStats:', error);
            throw new AppError('Failed to fetch dashboard stats', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // ATTENDANCE TRENDS
    // ============================================================================

    async getAttendanceTrends(churchId: string, filters: ReportFilters): Promise<AttendanceTrendReport[]> {
        const client = await pool.connect();

        try {
            const dateGroup = this.getDateGroupSQL(filters.granularity, 'ei.instance_date');
            const periodLabel = this.getPeriodLabelSQL(filters.granularity, 'ei.instance_date');

            let eventFilter = '';
            const params: any[] = [churchId, filters.startDate, filters.endDate];
            let paramIndex = 4;

            if (filters.eventId) {
                eventFilter += ` AND e.id = $${paramIndex}`;
                params.push(filters.eventId);
                paramIndex++;
            } else if (filters.eventType) {
                eventFilter += ` AND e.event_type = $${paramIndex}`;
                params.push(filters.eventType);
                paramIndex++;
            }

            const query = `
                WITH attendance_data AS (
                    SELECT
                        ${dateGroup} as period,
                        ${periodLabel} as period_label,
                        COUNT(DISTINCT ei.id) as event_count,
                        COALESCE(SUM(ei.total_attendance), 0) as total_attendance,
                        COALESCE(SUM(ei.member_attendance), 0) as member_attendance,
                        COALESCE(SUM(ei.guest_attendance), 0) as guest_attendance,
                        COUNT(DISTINCT a.member_id) FILTER (WHERE a.member_id IS NOT NULL) as unique_members
                    FROM event_instances ei
                             LEFT JOIN events e ON e.id = ei.event_id
                             LEFT JOIN attendance a ON a.event_instance_id = ei.id
                    WHERE ei.church_id = $1
                      AND ei.instance_date >= $2
                      AND ei.instance_date <= $3
                      AND ei.status = 'completed'
                    ${eventFilter}
                GROUP BY ${dateGroup}, ${periodLabel}
                    )
                SELECT
                    period,
                    period_label,
                    event_count,
                    total_attendance,
                    member_attendance,
                    guest_attendance,
                    unique_members,
                    CASE
                        WHEN event_count > 0
                            THEN ROUND(total_attendance::numeric / event_count::numeric, 2)
                        ELSE 0
                        END as average_attendance,
                    CASE
                        WHEN total_attendance > 0
                            THEN ROUND((member_attendance::numeric / total_attendance::numeric * 100), 2)
                        ELSE 0
                        END as attendance_rate
                FROM attendance_data
                ORDER BY period
            `;

            const result = await client.query(query, params);

            return result.rows.map(row => ({
                period: row.period_label,
                totalAttendance: parseInt(row.total_attendance) || 0,
                memberAttendance: parseInt(row.member_attendance) || 0,
                guestAttendance: parseInt(row.guest_attendance) || 0,
                uniqueMembers: parseInt(row.unique_members) || 0,
                averageAttendance: parseFloat(row.average_attendance) || 0,
                eventCount: parseInt(row.event_count) || 0,
                attendanceRate: parseFloat(row.attendance_rate) || 0,
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getAttendanceTrends:', error);
            throw new AppError('Failed to fetch attendance trends', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // MEMBER GROWTH
    // ============================================================================

    async getMemberGrowth(churchId: string, filters: ReportFilters): Promise<MemberGrowthReport[]> {
        const client = await pool.connect();

        try {
            const dateGroup = this.getDateGroupSQL(filters.granularity, 'm.created_at');
            const periodLabel = this.getPeriodLabelSQL(filters.granularity, 'm.created_at');
            const interval = this.getGranularityInterval(filters.granularity);

            const query = `
                WITH period_stats AS (
                    SELECT
                        ${dateGroup} as period,
                        ${periodLabel} as period_label,
                        COUNT(*) as new_members,
                        COUNT(*) FILTER (WHERE m.status = 'inactive') as inactive_members
                    FROM members m
                    WHERE m.church_id = $1
                      AND m.created_at >= $2
                      AND m.created_at <= $3
                      AND m.deleted_at IS NULL
                    GROUP BY ${dateGroup}, ${periodLabel}
                ),
                cumulative AS (
                    SELECT
                        period,
                        period_label,
                        new_members,
                        inactive_members,
                        SUM(new_members) OVER (ORDER BY period) as total_members,
                        SUM(new_members) OVER (ORDER BY period) - SUM(inactive_members) OVER (ORDER BY period) as active_members
                    FROM period_stats
                )
                SELECT
                    period,
                    period_label,
                    new_members,
                    total_members,
                    GREATEST(active_members, 0) as active_members,
                    inactive_members,
                    CASE 
                        WHEN LAG(total_members) OVER (ORDER BY period) IS NOT NULL 
                          AND LAG(total_members) OVER (ORDER BY period) > 0
                        THEN ROUND(
                            ((total_members - LAG(total_members) OVER (ORDER BY period))::numeric / 
                             LAG(total_members) OVER (ORDER BY period)::numeric * 100), 
                            2
                        )
                        ELSE 0
                    END as growth_rate,
                    CASE 
                        WHEN total_members > 0 
                        THEN ROUND((GREATEST(active_members, 0)::numeric / total_members::numeric * 100), 2)
                        ELSE 100
                    END as retention_rate
                FROM cumulative
                ORDER BY period
            `;

            const result = await client.query(query, [churchId, filters.startDate, filters.endDate]);

            return result.rows.map(row => ({
                period: row.period_label,
                newMembers: parseInt(row.new_members) || 0,
                totalMembers: parseInt(row.total_members) || 0,
                activeMembers: parseInt(row.active_members) || 0,
                inactiveMembers: parseInt(row.inactive_members) || 0,
                growthRate: parseFloat(row.growth_rate) || 0,
                retentionRate: parseFloat(row.retention_rate) || 100,
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getMemberGrowth:', error);
            throw new AppError('Failed to fetch member growth', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // FIRST TIMER CONVERSION
    // ============================================================================

    async getFirstTimerConversion(churchId: string, filters: ReportFilters): Promise<FirstTimerConversionReport[]> {
        const client = await pool.connect();

        try {
            const dateGroup = this.getDateGroupSQL(filters.granularity, 'ft.first_visit_date');
            const periodLabel = this.getPeriodLabelSQL(filters.granularity, 'ft.first_visit_date');

            const query = `
                WITH conversion_data AS (
                    SELECT
                        ${dateGroup} as period,
                        ${periodLabel} as period_label,
                        COUNT(*) as total_first_timers,
                        COUNT(*) FILTER (WHERE ft.status = 'converted') as converted,
                        COUNT(*) FILTER (WHERE ft.status != 'converted') as pending_conversion,
                        COUNT(*) FILTER (WHERE ft.follow_up_status != 'pending') as followed_up,
                        AVG(
                                EXTRACT(DAY FROM (ft.converted_at - ft.first_visit_date))
                        ) FILTER (WHERE ft.status = 'converted' AND ft.converted_at IS NOT NULL) as avg_conversion_days
                    FROM first_timers ft
                    WHERE ft.church_id = $1
                      AND ft.first_visit_date >= $2
                      AND ft.first_visit_date <= $3
                      AND ft.deleted_at IS NULL
                    GROUP BY ${dateGroup}, ${periodLabel}
                )
                SELECT
                    period,
                    period_label,
                    total_first_timers,
                    converted,
                    pending_conversion,
                    CASE
                        WHEN total_first_timers > 0
                            THEN ROUND((converted::numeric / total_first_timers::numeric * 100), 2)
                        ELSE 0
                        END as conversion_rate,
                    COALESCE(ROUND(avg_conversion_days::numeric, 0), 0) as average_days_to_convert,
                    CASE
                        WHEN total_first_timers > 0
                            THEN ROUND((followed_up::numeric / total_first_timers::numeric * 100), 2)
                        ELSE 0
                        END as follow_up_rate
                FROM conversion_data
                ORDER BY period
            `;

            const result = await client.query(query, [churchId, filters.startDate, filters.endDate]);

            return result.rows.map(row => ({
                period: row.period_label,
                totalFirstTimers: parseInt(row.total_first_timers) || 0,
                converted: parseInt(row.converted) || 0,
                conversionRate: parseFloat(row.conversion_rate) || 0,
                averageDaysToConvert: parseInt(row.average_days_to_convert) || 0,
                pendingConversion: parseInt(row.pending_conversion) || 0,
                followUpRate: parseFloat(row.follow_up_rate) || 0,
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getFirstTimerConversion:', error);
            throw new AppError('Failed to fetch first timer conversion', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // FINANCIAL SUMMARY
    // ============================================================================

    async getFinancialSummary(churchId: string, filters: ReportFilters): Promise<FinancialSummaryReport[]> {
        const client = await pool.connect();

        try {
            const dateGroup = this.getDateGroupSQL(filters.granularity, 't.transaction_date');
            const periodLabel = this.getPeriodLabelSQL(filters.granularity, 't.transaction_date');

            const query = `
                WITH financial_data AS (
                    SELECT
                        ${dateGroup} as period,
                        ${periodLabel} as period_label,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' AND LOWER(t.description) LIKE '%tithe%' THEN t.amount ELSE 0 END), 0) as tithes,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' AND LOWER(t.description) LIKE '%offering%' THEN t.amount ELSE 0 END), 0) as offerings,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' AND LOWER(t.description) LIKE '%donation%' THEN t.amount ELSE 0 END), 0) as donations,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'income' AND LOWER(t.description) LIKE '%pledge%' THEN t.amount ELSE 0 END), 0) as pledges,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'income'
                            AND LOWER(t.description) NOT LIKE '%tithe%'
                            AND LOWER(t.description) NOT LIKE '%offering%'
                            AND LOWER(t.description) NOT LIKE '%donation%'
                            AND LOWER(t.description) NOT LIKE '%pledge%'
                                              THEN t.amount ELSE 0 END), 0) as other_income,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' AND t.expense_category = 'operational' THEN t.amount ELSE 0 END), 0) as operational_expenses,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' AND t.expense_category = 'project' THEN t.amount ELSE 0 END), 0) as project_expenses,
                        COALESCE(SUM(CASE WHEN t.transaction_type = 'expense'
                            AND (t.expense_category IS NULL OR t.expense_category NOT IN ('operational', 'project'))
                                              THEN t.amount ELSE 0 END), 0) as other_expenses
                    FROM transactions t
                    WHERE t.church_id = $1
                      AND t.transaction_date >= $2
                      AND t.transaction_date <= $3
                      AND t.approval_status = 'approved'
                    GROUP BY ${dateGroup}, ${periodLabel}
                )
                SELECT
                    period,
                    period_label,
                    total_income,
                    total_expenses,
                    total_income - total_expenses as net_balance,
                    tithes,
                    offerings,
                    donations,
                    pledges,
                    other_income,
                    operational_expenses,
                    project_expenses,
                    other_expenses
                FROM financial_data
                ORDER BY period
            `;

            const result = await client.query(query, [churchId, filters.startDate, filters.endDate]);

            return result.rows.map(row => ({
                period: row.period_label,
                totalIncome: parseFloat(row.total_income) || 0,
                totalExpenses: parseFloat(row.total_expenses) || 0,
                netBalance: parseFloat(row.net_balance) || 0,
                tithes: parseFloat(row.tithes) || 0,
                offerings: parseFloat(row.offerings) || 0,
                donations: parseFloat(row.donations) || 0,
                pledges: parseFloat(row.pledges) || 0,
                otherIncome: parseFloat(row.other_income) || 0,
                operationalExpenses: parseFloat(row.operational_expenses) || 0,
                projectExpenses: parseFloat(row.project_expenses) || 0,
                otherExpenses: parseFloat(row.other_expenses) || 0,
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getFinancialSummary:', error);
            throw new AppError('Failed to fetch financial summary', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // EVENT PERFORMANCE
    // ============================================================================

    async getEventPerformance(churchId: string, filters: ReportFilters): Promise<EventPerformanceReport[]> {
        const client = await pool.connect();

        try {
            let eventFilter = '';
            const params: any[] = [churchId, filters.startDate, filters.endDate];
            let paramIndex = 4;

            if (filters.eventId) {
                eventFilter = ` AND e.id = $${paramIndex}`;
                params.push(filters.eventId);
                paramIndex++;
            } else if (filters.eventType) {
                eventFilter = ` AND e.event_type = $${paramIndex}`;
                params.push(filters.eventType);
                paramIndex++;
            }

            const query = `
                WITH event_stats AS (
                    SELECT
                        e.id as event_id,
                        e.name as event_name,
                        e.event_type,
                        COUNT(DISTINCT ei.id) as instance_count,
                        COALESCE(SUM(ei.total_attendance), 0) as total_attendance,
                        COALESCE(ROUND(AVG(ei.total_attendance), 0), 0) as average_attendance,
                        COALESCE(SUM(ei.member_attendance), 0) as member_count,
                        COALESCE(SUM(ei.guest_attendance), 0) as guest_count,
                        COUNT(DISTINCT a.member_id) as unique_attendees,
                        MAX(ei.instance_date) as last_held_date
                    FROM events e
                             LEFT JOIN event_instances ei ON ei.event_id = e.id
                        AND ei.instance_date >= $2
                        AND ei.instance_date <= $3
                        AND ei.status = 'completed'
                             LEFT JOIN attendance a ON a.event_instance_id = ei.id
                    WHERE e.church_id = $1
                      AND e.deleted_at IS NULL
                    ${eventFilter}
                GROUP BY e.id, e.name, e.event_type
                HAVING COUNT(ei.id) > 0
                    )
                SELECT
                    event_id,
                    event_name,
                    event_type,
                    instance_count,
                    total_attendance,
                    average_attendance,
                    unique_attendees,
                    member_count,
                    guest_count,
                    CASE
                        WHEN total_attendance > 0
                            THEN ROUND((member_count::numeric / total_attendance::numeric * 100), 2)
                        ELSE 0
                        END as attendance_rate,
                    0 as revenue,
                    last_held_date
                FROM event_stats
                ORDER BY average_attendance DESC
            `;

            const result = await client.query(query, params);

            return result.rows.map(row => ({
                eventId: row.event_id,
                eventName: row.event_name,
                eventType: row.event_type,
                instanceCount: parseInt(row.instance_count) || 0,
                totalAttendance: parseInt(row.total_attendance) || 0,
                averageAttendance: parseInt(row.average_attendance) || 0,
                uniqueAttendees: parseInt(row.unique_attendees) || 0,
                attendanceRate: parseFloat(row.attendance_rate) || 0,
                guestCount: parseInt(row.guest_count) || 0,
                memberCount: parseInt(row.member_count) || 0,
                revenue: parseFloat(row.revenue) || 0,
                lastHeldDate: row.last_held_date ? format(new Date(row.last_held_date), 'yyyy-MM-dd') : '',
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getEventPerformance:', error);
            throw new AppError('Failed to fetch event performance', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
// INACTIVE MEMBERS
// ============================================================================

    async getInactiveMembers(
        churchId: string,
        filters: InactiveMemberFilters = {}
    ): Promise<InactiveMemberReport[]> {
        const {
            daysThreshold = 30,
            includeStatusInactive = true,
            includeNeverAttended = true,
            limit = 100
        } = filters;

        const client = await pool.connect();

        try {
            const statusCondition = includeStatusInactive
                ? `m.status IN ('active', 'inactive')`
                : `m.status = 'active'`;

            const query = `
                WITH member_last_attendance AS (
                    SELECT
                        m.id as member_id,
                        CONCAT(m.first_name, ' ', m.last_name) as member_name,
                        m.email,
                        m.phone,
                        m.profile_image_url as profile_photo,
                        m.status,
                        m.member_type,
                        COALESCE(m.membership_date, m.created_at::date) as membership_date,
                        MAX(a.checkin_time) as last_attended,
                        COUNT(a.id) as total_attendance_count
                    FROM members m
                             LEFT JOIN attendance a ON a.member_id = m.id
                    WHERE m.church_id = $1
                      AND m.deleted_at IS NULL
                      AND ${statusCondition}
                    GROUP BY
                        m.id,
                        m.first_name,
                        m.last_name,
                        m.email,
                        m.phone,
                        m.profile_image_url,
                        m.status,
                        m.member_type,
                        m.membership_date,
                        m.created_at
                ),
                     inactive_calculation AS (
                         SELECT
                             member_id,
                             member_name,
                             email,
                             phone,
                             profile_photo,
                             status,
                             member_type,
                             membership_date,
                             last_attended,
                             total_attendance_count,
                             CASE
                                 WHEN last_attended IS NULL THEN
                                     EXTRACT(DAY FROM NOW() - membership_date::timestamp)::integer
                    ELSE
                    EXTRACT(DAY FROM NOW() - last_attended)::integer
                END as days_inactive,
                    CASE 
                        WHEN last_attended IS NULL THEN true
                        ELSE false
                END as never_attended
                FROM member_last_attendance
            )
                SELECT
                    member_id,
                    member_name,
                    email,
                    phone,
                    profile_photo,
                    status,
                    member_type,
                    membership_date,
                    last_attended,
                    total_attendance_count,
                    days_inactive,
                    never_attended
                FROM inactive_calculation
                WHERE
                    (
                        (never_attended = true AND $3 = true AND days_inactive >= $2)
                            OR
                        (never_attended = false AND days_inactive >= $2)
                        )
                ORDER BY
                    days_inactive DESC,
                    member_name ASC
                    LIMIT $4
            `;

            const values = [
                churchId,
                daysThreshold,
                includeNeverAttended,
                limit
            ];

            const result = await client.query(query, values);

            return result.rows.map(row => ({
                memberId: row.member_id,
                memberName: row.member_name || 'Unknown',
                email: row.email || '',
                phone: row.phone || '',
                lastAttended: row.last_attended
                    ? format(new Date(row.last_attended), 'yyyy-MM-dd')
                    : null,
                daysInactive: parseInt(row.days_inactive) || 0,
                totalAttendanceCount: parseInt(row.total_attendance_count) || 0,
                membershipDate: row.membership_date
                    ? format(new Date(row.membership_date), 'yyyy-MM-dd')
                    : null,
                profilePhoto: row.profile_photo || null,
                status: row.status || 'active',
                membershipType: row.member_type || 'regular',
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getInactiveMembers:', error);
            throw new AppError('Failed to fetch inactive members', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // FAMILY ATTENDANCE
    // ============================================================================

    async getFamilyAttendance(churchId: string, filters: ReportFilters): Promise<FamilyAttendanceReport[]> {
        const client = await pool.connect();

        try {
            const query = `
                WITH family_stats AS (
                    SELECT
                        f.id as family_id,
                        f.name as family_name,
                        COUNT(DISTINCT m.id) as total_members,
                        COUNT(DISTINCT m.id) FILTER (
                            WHERE EXISTS (
                                SELECT 1 FROM attendance att 
                                JOIN event_instances ei ON ei.id = att.event_instance_id
                                WHERE att.member_id = m.id 
                                  AND ei.instance_date >= $2
                                  AND ei.instance_date <= $3
                            )
                        ) as active_members,
                        MAX(att.checkin_time) as last_family_attendance,
                        COUNT(DISTINCT ei.id) FILTER (WHERE ei.instance_date >= $2 AND ei.instance_date <= $3) as total_events,
                        COUNT(DISTINCT CASE WHEN att.id IS NOT NULL THEN ei.id END) as attended_events
                    FROM families f
                             LEFT JOIN members m ON m.family_id = f.id AND m.deleted_at IS NULL
                             LEFT JOIN attendance att ON att.member_id = m.id
                             LEFT JOIN event_instances ei ON ei.id = att.event_instance_id
                    WHERE f.church_id = $1
                      AND f.is_active = true
                    GROUP BY f.id, f.name
                )
                SELECT
                    family_id,
                    family_name,
                    total_members,
                    active_members,
                    last_family_attendance,
                    CASE
                        WHEN total_members = 0 THEN 0
                        ELSE ROUND((active_members::numeric / total_members * 100), 0)
                        END as attendance_rate,
                    CASE
                        WHEN last_family_attendance IS NULL THEN 999
                        ELSE EXTRACT(DAY FROM NOW() - last_family_attendance)::integer
                END as consecutive_absences
                FROM family_stats
                WHERE total_members > 0
                ORDER BY attendance_rate DESC, family_name
            `;

            const result = await client.query(query, [churchId, filters.startDate, filters.endDate]);

            return result.rows.map(row => ({
                familyId: row.family_id,
                familyName: row.family_name,
                totalMembers: parseInt(row.total_members) || 0,
                activeMembers: parseInt(row.active_members) || 0,
                attendanceRate: parseInt(row.attendance_rate) || 0,
                lastAttendedDate: row.last_family_attendance
                    ? format(new Date(row.last_family_attendance), 'yyyy-MM-dd')
                    : null,
                consecutiveAbsences: parseInt(row.consecutive_absences) || 0,
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getFamilyAttendance:', error);
            throw new AppError('Failed to fetch family attendance', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // GROUP ACTIVITY
    // ============================================================================

    async getGroupActivity(churchId: string, filters: ReportFilters): Promise<GroupActivityReport[]> {
        const client = await pool.connect();

        try {
            let groupFilter = '';
            const params: any[] = [churchId, filters.startDate, filters.endDate];

            if (filters.groupId) {
                groupFilter = ` AND g.id = $4`;
                params.push(filters.groupId);
            }

            const query = `
                WITH group_stats AS (
                    SELECT
                        g.id as group_id,
                        g.name as group_name,
                        COALESCE(gt.name, 'General') as group_type,
                        COUNT(DISTINCT gm.id) as member_count,
                        COUNT(DISTINCT gm.id) FILTER (WHERE gm.status = 'active') as active_member_count,
                        COUNT(DISTINCT gmt.id) as meeting_count,
                        MAX(gmt.meeting_date) as last_meeting_date
                    FROM groups g
                             LEFT JOIN group_types gt ON gt.id = g.group_type_id
                             LEFT JOIN group_members gm ON gm.group_id = g.id
                             LEFT JOIN group_meetings gmt ON gmt.group_id = g.id
                        AND gmt.meeting_date >= $2
                        AND gmt.meeting_date <= $3
                        AND gmt.status != 'cancelled'
                WHERE g.church_id = $1
                  AND g.deleted_at IS NULL
                    ${groupFilter}
                GROUP BY g.id, g.name, gt.name
                    )
                SELECT
                    group_id,
                    group_name,
                    group_type,
                    member_count,
                    active_member_count,
                    meeting_count,
                    last_meeting_date,
                    CASE
                        WHEN meeting_count > 0 AND member_count > 0
                            THEN ROUND((active_member_count::numeric / member_count * 100), 2)
                        ELSE 0
                        END as attendance_rate,
                    CASE
                        WHEN meeting_count > 0
                            THEN ROUND(active_member_count::numeric / meeting_count::numeric, 0)
                        ELSE 0
                        END as average_attendance
                FROM group_stats
                ORDER BY meeting_count DESC, group_name
            `;

            const result = await client.query(query, params);

            return result.rows.map(row => ({
                groupId: row.group_id,
                groupName: row.group_name,
                groupType: row.group_type,
                memberCount: parseInt(row.member_count) || 0,
                activeMemberCount: parseInt(row.active_member_count) || 0,
                meetingCount: parseInt(row.meeting_count) || 0,
                averageAttendance: parseInt(row.average_attendance) || 0,
                attendanceRate: parseFloat(row.attendance_rate) || 0,
                lastMeetingDate: row.last_meeting_date
                    ? format(new Date(row.last_meeting_date), 'yyyy-MM-dd')
                    : null,
            }));
        } catch (error) {
            logger.error('Error in ReportRepository.getGroupActivity:', error);
            throw new AppError('Failed to fetch group activity', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // SERVICE REPORT
    // ============================================================================

    async getServiceReport(churchId: string, instanceId: string): Promise<ServiceReport> {
        const client = await pool.connect();

        try {
            const query = `
                SELECT
                    ei.id as instance_id,
                    e.name as event_name,
                    ei.instance_date,
                    COALESCE(ei.total_attendance, 0) as total_attendance,
                    COALESCE(ei.member_attendance, 0) as member_attendance,
                    COALESCE(ei.guest_attendance, 0) as guest_attendance,
                    COUNT(DISTINCT a.id) FILTER (WHERE m.gender = 'male') as men_count,
                    COUNT(DISTINCT a.id) FILTER (WHERE m.gender = 'female') as women_count,
                    COUNT(DISTINCT a.id) FILTER (WHERE m.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM AGE(m.date_of_birth)) < 18) as children_count,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.is_first_time = true) as first_timers_count,
                    0 as new_converts_count,
                    0 as salvations,
                    0 as baptisms,
                    COALESCE(ei.notes, '') as notes,
                    COALESCE(
                            (SELECT SUM(t.amount)
                             FROM transactions t
                             WHERE t.event_instance_id = ei.id
                               AND t.transaction_type = 'income'
                               AND t.approval_status = 'approved'),
                            0
                    ) as offerings
                FROM event_instances ei
                         JOIN events e ON e.id = ei.event_id
                         LEFT JOIN attendance a ON a.event_instance_id = ei.id
                         LEFT JOIN members m ON m.id = a.member_id
                WHERE ei.id = $1
                  AND ei.church_id = $2
                GROUP BY ei.id, e.name, ei.instance_date, ei.total_attendance, ei.member_attendance, ei.guest_attendance, ei.notes
            `;

            const result = await client.query(query, [instanceId, churchId]);

            if (result.rows.length === 0) {
                throw new AppError('Service report not found', 404);
            }

            const row = result.rows[0];

            return {
                instanceId: row.instance_id,
                eventName: row.event_name,
                instanceDate: format(new Date(row.instance_date), 'yyyy-MM-dd'),
                totalAttendance: parseInt(row.total_attendance) || 0,
                memberAttendance: parseInt(row.member_attendance) || 0,
                guestAttendance: parseInt(row.guest_attendance) || 0,
                childrenCount: parseInt(row.children_count) || 0,
                menCount: parseInt(row.men_count) || 0,
                womenCount: parseInt(row.women_count) || 0,
                firstTimersCount: parseInt(row.first_timers_count) || 0,
                newConvertsCount: parseInt(row.new_converts_count) || 0,
                salvations: parseInt(row.salvations) || 0,
                baptisms: parseInt(row.baptisms) || 0,
                offerings: parseFloat(row.offerings) || 0,
                notes: row.notes || '',
            };
        } catch (error) {
            logger.error('Error in ReportRepository.getServiceReport:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to fetch service report', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // ALL SERVICE REPORTS
    // ============================================================================

    async getAllServiceReports(
        churchId: string,
        filters: { startDate?: string; endDate?: string; eventId?: string; page?: number; limit?: number }
    ): Promise<{ reports: ServiceReport[]; total: number; totalPages: number }> {
        const client = await pool.connect();

        try {
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;

            let whereConditions = ['ei.church_id = $1'];
            const params: any[] = [churchId];
            let paramIndex = 2;

            if (filters.startDate) {
                whereConditions.push(`ei.instance_date >= $${paramIndex}`);
                params.push(filters.startDate);
                paramIndex++;
            }

            if (filters.endDate) {
                whereConditions.push(`ei.instance_date <= $${paramIndex}`);
                params.push(filters.endDate);
                paramIndex++;
            }

            if (filters.eventId) {
                whereConditions.push(`e.id = $${paramIndex}`);
                params.push(filters.eventId);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            const countQuery = `
                SELECT COUNT(*) as total
                FROM event_instances ei
                         JOIN events e ON e.id = ei.event_id
                WHERE ${whereClause}
            `;

            const dataQuery = `
                SELECT
                    ei.id as instance_id,
                    e.name as event_name,
                    ei.instance_date,
                    COALESCE(ei.total_attendance, 0) as total_attendance,
                    COALESCE(ei.member_attendance, 0) as member_attendance,
                    COALESCE(ei.guest_attendance, 0) as guest_attendance,
                    COALESCE(ei.notes, '') as notes,
                    COALESCE(
                            (SELECT SUM(t.amount)
                             FROM transactions t
                             WHERE t.event_instance_id = ei.id
                               AND t.transaction_type = 'income'
                               AND t.approval_status = 'approved'),
                            0
                    ) as offerings
                FROM event_instances ei
                         JOIN events e ON e.id = ei.event_id
                WHERE ${whereClause}
                ORDER BY ei.instance_date DESC
                    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                client.query(countQuery, params.slice(0, paramIndex - 1)),
                client.query(dataQuery, params)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            const reports = dataResult.rows.map(row => ({
                instanceId: row.instance_id,
                eventName: row.event_name,
                instanceDate: format(new Date(row.instance_date), 'yyyy-MM-dd'),
                totalAttendance: parseInt(row.total_attendance) || 0,
                memberAttendance: parseInt(row.member_attendance) || 0,
                guestAttendance: parseInt(row.guest_attendance) || 0,
                childrenCount: 0,
                menCount: 0,
                womenCount: 0,
                firstTimersCount: 0,
                newConvertsCount: 0,
                salvations: 0,
                baptisms: 0,
                offerings: parseFloat(row.offerings) || 0,
                notes: row.notes || '',
            }));

            return {
                reports,
                total,
                totalPages,
            };
        } catch (error) {
            logger.error('Error in ReportRepository.getAllServiceReports:', error);
            throw new AppError('Failed to fetch service reports', 500);
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private getDateGroupSQL(granularity: string = 'monthly', dateColumn: string = 'ei.instance_date'): string {
        switch (granularity) {
            case 'daily':
                return `DATE(${dateColumn})`;
            case 'weekly':
                return `DATE_TRUNC('week', ${dateColumn})`;
            case 'monthly':
                return `DATE_TRUNC('month', ${dateColumn})`;
            case 'quarterly':
                return `DATE_TRUNC('quarter', ${dateColumn})`;
            case 'yearly':
                return `DATE_TRUNC('year', ${dateColumn})`;
            default:
                return `DATE_TRUNC('month', ${dateColumn})`;
        }
    }

    private getPeriodLabelSQL(granularity: string = 'monthly', dateColumn: string = 'ei.instance_date'): string {
        switch (granularity) {
            case 'daily':
                return `TO_CHAR(${dateColumn}, 'Mon DD, YYYY')`;
            case 'weekly':
                return `'Week ' || TO_CHAR(${dateColumn}, 'WW, YYYY')`;
            case 'monthly':
                return `TO_CHAR(${dateColumn}, 'Mon YYYY')`;
            case 'quarterly':
                return `'Q' || EXTRACT(QUARTER FROM ${dateColumn})::text || ' ' || EXTRACT(YEAR FROM ${dateColumn})::text`;
            case 'yearly':
                return `TO_CHAR(${dateColumn}, 'YYYY')`;
            default:
                return `TO_CHAR(${dateColumn}, 'Mon YYYY')`;
        }
    }

    private getGranularityInterval(granularity: string = 'monthly'): string {
        switch (granularity) {
            case 'daily':
                return 'day';
            case 'weekly':
                return 'week';
            case 'monthly':
                return 'month';
            case 'quarterly':
                return 'quarter';
            case 'yearly':
                return 'year';
            default:
                return 'month';
        }
    }
}