"use strict";
// src/repositories/CelebrationRepository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CelebrationRepository = void 0;
const database_1 = require("@config/database");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const date_fns_1 = require("date-fns");
class CelebrationRepository {
    async getCelebrations(churchId, filters = {}) {
        const client = await database_1.pool.connect();
        try {
            const daysAhead = filters.daysAhead || 30;
            const page = filters.page || 1;
            const limit = filters.limit || 50;
            const offset = (page - 1) * limit;
            const today = new Date();
            const endDate = (0, date_fns_1.addDays)(today, daysAhead);
            // Build type filter
            let typeFilter = '';
            if (filters.type === 'birthday') {
                typeFilter = 'AND date_of_birth IS NOT NULL';
            }
            else if (filters.type === 'anniversary') {
                typeFilter = 'AND wedding_anniversary IS NOT NULL';
            }
            // Main query to get celebrations
            // FIX: Cast interval to proper type and use explicit date arithmetic
            const query = `
                WITH celebrations AS (
                    -- Birthdays
                    SELECT
                        m.id,
                        m.id as member_id,
                        m.first_name,
                        m.last_name,
                        CONCAT(m.first_name, ' ', m.last_name) as member_name,
                        m.email,
                        m.phone,
                        m.profile_image_url,
                        m.date_of_birth as original_date,
                        'birthday'::text as type,
                        -- Calculate this year's occurrence
                        CASE
                            WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                           EXTRACT(MONTH FROM m.date_of_birth)::int,
                                           LEAST(EXTRACT(DAY FROM m.date_of_birth)::int,
                                                 CASE
                                                     WHEN EXTRACT(MONTH FROM m.date_of_birth) IN (4,6,9,11) THEN 30
                                                     WHEN EXTRACT(MONTH FROM m.date_of_birth) = 2 THEN
                                                         CASE WHEN EXTRACT(YEAR FROM CURRENT_DATE)::int % 4 = 0 THEN 29 ELSE 28 END
                                                   ELSE 31
                                                 END)) >= CURRENT_DATE
                                THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                               EXTRACT(MONTH FROM m.date_of_birth)::int,
                                               LEAST(EXTRACT(DAY FROM m.date_of_birth)::int, 28))
                            ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                                           EXTRACT(MONTH FROM m.date_of_birth)::int,
                                           LEAST(EXTRACT(DAY FROM m.date_of_birth)::int, 28))
                            END as celebration_date,
                        EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.date_of_birth))::int + 1 as years_count
                    FROM members m
                    WHERE m.church_id = $1
                      AND m.deleted_at IS NULL
                      AND m.status = 'active'
                      AND m.date_of_birth IS NOT NULL
                    ${filters.type === 'anniversary' ? 'AND FALSE' : ''}

                UNION ALL

                -- Anniversaries
                SELECT
                    m.id,
                    m.id as member_id,
                    m.first_name,
                    m.last_name,
                    CONCAT(m.first_name, ' ', m.last_name) as member_name,
                    m.email,
                    m.phone,
                    m.profile_image_url,
                    m.wedding_anniversary as original_date,
                    'anniversary'::text as type,
                    CASE
                        WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                       EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                                       LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28)) >= CURRENT_DATE
                            THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                           EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                                           LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28))
                        ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                                       EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                                       LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28))
                        END as celebration_date,
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.wedding_anniversary))::int + 1 as years_count
                FROM members m
                WHERE m.church_id = $1
                  AND m.deleted_at IS NULL
                  AND m.status = 'active'
                  AND m.wedding_anniversary IS NOT NULL
                    ${filters.type === 'birthday' ? 'AND FALSE' : ''}
                )
                SELECT
                    *,
                    (celebration_date - CURRENT_DATE) as days_until,
                    CASE
                        WHEN celebration_date = CURRENT_DATE THEN 'Today'
                        WHEN celebration_date = CURRENT_DATE + INTERVAL '1 day' THEN 'Tomorrow'
                    WHEN celebration_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'This Week'
                    WHEN celebration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'This Month'
                    ELSE 'Upcoming'
                END as day_label
                FROM celebrations
                WHERE celebration_date >= CURRENT_DATE 
                  AND celebration_date <= CURRENT_DATE + ($2 || ' days')::interval
                ORDER BY celebration_date, type, member_name
                LIMIT $3 OFFSET $4
            `;
            const result = await client.query(query, [churchId, daysAhead, limit, offset]);
            // Count query - FIX: Same date arithmetic fixes
            const countQuery = `
                WITH celebrations AS (
                    SELECT m.id, m.date_of_birth as original_date, 'birthday' as type,
                           CASE
                               WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                              EXTRACT(MONTH FROM m.date_of_birth)::int,
                                              LEAST(EXTRACT(DAY FROM m.date_of_birth)::int, 28)) >= CURRENT_DATE
                                   THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                                  EXTRACT(MONTH FROM m.date_of_birth)::int,
                                                  LEAST(EXTRACT(DAY FROM m.date_of_birth)::int, 28))
                               ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                                              EXTRACT(MONTH FROM m.date_of_birth)::int,
                                              LEAST(EXTRACT(DAY FROM m.date_of_birth)::int, 28))
                               END as celebration_date
                    FROM members m
                    WHERE m.church_id = $1 AND m.deleted_at IS NULL AND m.status = 'active' AND m.date_of_birth IS NOT NULL
                    ${filters.type === 'anniversary' ? 'AND FALSE' : ''}
                UNION ALL
                SELECT m.id, m.wedding_anniversary, 'anniversary',
                       CASE
                           WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                          EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                                          LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28)) >= CURRENT_DATE
                               THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int,
                                              EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                                              LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28))
                           ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1,
                                          EXTRACT(MONTH FROM m.wedding_anniversary)::int,
                                          LEAST(EXTRACT(DAY FROM m.wedding_anniversary)::int, 28))
                           END
                FROM members m
                WHERE m.church_id = $1 AND m.deleted_at IS NULL AND m.status = 'active' AND m.wedding_anniversary IS NOT NULL
                    ${filters.type === 'birthday' ? 'AND FALSE' : ''}
                )
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE type = 'birthday' AND celebration_date = CURRENT_DATE) as today_birthdays,
                    COUNT(*) FILTER (WHERE type = 'anniversary' AND celebration_date = CURRENT_DATE) as today_anniversaries,
                    COUNT(*) FILTER (WHERE type = 'birthday' AND celebration_date <= CURRENT_DATE + INTERVAL '7 days') as week_birthdays,
                    COUNT(*) FILTER (WHERE type = 'anniversary' AND celebration_date <= CURRENT_DATE + INTERVAL '7 days') as week_anniversaries,
                    COUNT(*) FILTER (WHERE type = 'birthday' AND celebration_date <= CURRENT_DATE + INTERVAL '30 days') as month_birthdays,
                    COUNT(*) FILTER (WHERE type = 'anniversary' AND celebration_date <= CURRENT_DATE + INTERVAL '30 days') as month_anniversaries
                FROM celebrations
                WHERE celebration_date >= CURRENT_DATE AND celebration_date <= CURRENT_DATE + ($2 || ' days')::interval
            `;
            const countResult = await client.query(countQuery, [churchId, daysAhead]);
            const counts = countResult.rows[0];
            const celebrations = result.rows.map(row => ({
                id: row.id,
                memberId: row.member_id,
                memberName: row.member_name,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.email,
                phone: row.phone,
                profileImageUrl: row.profile_image_url,
                date: (0, date_fns_1.format)(new Date(row.celebration_date), 'yyyy-MM-dd'),
                dayLabel: row.day_label,
                type: row.type,
                age: row.type === 'birthday' ? row.years_count : undefined,
                yearsMarried: row.type === 'anniversary' ? row.years_count : undefined,
                daysUntil: parseInt(row.days_until) || 0,
            }));
            const total = parseInt(counts.total) || 0;
            return {
                celebrations,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
                summary: {
                    todayBirthdays: parseInt(counts.today_birthdays) || 0,
                    todayAnniversaries: parseInt(counts.today_anniversaries) || 0,
                    thisWeekBirthdays: parseInt(counts.week_birthdays) || 0,
                    thisWeekAnniversaries: parseInt(counts.week_anniversaries) || 0,
                    thisMonthBirthdays: parseInt(counts.month_birthdays) || 0,
                    thisMonthAnniversaries: parseInt(counts.month_anniversaries) || 0,
                },
            };
        }
        catch (error) {
            logger_1.default.error('Error in CelebrationRepository.getCelebrations:', error);
            throw new AppError_1.AppError('Failed to fetch celebrations', 500);
        }
        finally {
            client.release();
        }
    }
    async getTodayCelebrations(churchId) {
        const result = await this.getCelebrations(churchId, { daysAhead: 0, limit: 100 });
        return result.celebrations.filter(c => c.daysUntil === 0);
    }
}
exports.CelebrationRepository = CelebrationRepository;
//# sourceMappingURL=CelebrationRepository.js.map