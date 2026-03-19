// src/repositories/RegistrationRepository.ts

import { pool } from '@config/database';
import { v4 as uuidv4 } from 'uuid';
import { generateQRCode } from '@utils/helpers';
import {
    RegistrantSearchResult,
    EventOption,
    EventInstance,
    ManualRegistrationForm,
    QuickCheckInRequest,
    EventAttendee,
    AttendanceStats,
    AttendeeSource,
} from '@/dtos/registration';

export class RegistrationRepository {

    // ============================================================================
    // SEARCH - Searches both members and first_timers tables
    // ============================================================================

    async searchRegistrants(
        churchId: string,
        query: string,
        limit: number = 20
    ): Promise<RegistrantSearchResult[]> {
        const searchPattern = `%${query}%`;
        const halfLimit = Math.ceil(limit / 2);

        // Search members
        const memberQuery = `
            SELECT 
                id,
                first_name,
                last_name,
                email,
                phone,
                profile_image_url as avatar,
                status,
                'member' as source,
                created_at as member_since
            FROM members
            WHERE church_id = $1
                AND status = 'active'
                AND (
                    first_name ILIKE $2
                    OR last_name ILIKE $2
                    OR CONCAT(first_name, ' ', last_name) ILIKE $2
                    OR email ILIKE $2
                    OR phone ILIKE $2
                )
            ORDER BY 
                CASE 
                    WHEN CONCAT(first_name, ' ', last_name) ILIKE $3 THEN 0
                    WHEN first_name ILIKE $3 THEN 1
                    ELSE 2
                END,
                first_name, last_name
            LIMIT $4
        `;

        // Search first timers (not converted)
        const firstTimerQuery = `
            SELECT 
                id,
                first_name,
                last_name,
                email,
                phone,
                NULL as avatar,
                status,
                'first_timer' as source,
                first_visit_date,
                visit_count
            FROM first_timers
            WHERE church_id = $1
                AND status NOT IN ('converted')
                AND (
                    first_name ILIKE $2
                    OR last_name ILIKE $2
                    OR CONCAT(first_name, ' ', last_name) ILIKE $2
                    OR email ILIKE $2
                    OR phone ILIKE $2
                )
            ORDER BY 
                CASE 
                    WHEN CONCAT(first_name, ' ', last_name) ILIKE $3 THEN 0
                    WHEN first_name ILIKE $3 THEN 1
                    ELSE 2
                END,
                first_name, last_name
            LIMIT $4
        `;

        const exactPattern = `${query}%`;

        const [memberResult, firstTimerResult] = await Promise.all([
            pool.query(memberQuery, [churchId, searchPattern, exactPattern, halfLimit]),
            pool.query(firstTimerQuery, [churchId, searchPattern, exactPattern, halfLimit]),
        ]);

        const results: RegistrantSearchResult[] = [];

        // Add members first (they are existing church members)
        memberResult.rows.forEach(row => {
            results.push({
                id: row.id,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.email,
                phone: row.phone,
                avatar: row.avatar,
                source: 'member',
                status: row.status,
                memberSince: row.member_since,
            });
        });

        // Add first timers
        firstTimerResult.rows.forEach(row => {
            results.push({
                id: row.id,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.email,
                phone: row.phone,
                source: 'first_timer',
                status: row.status,
                firstVisitDate: row.first_visit_date,
                visitCount: row.visit_count,
            });
        });

        return results;
    }

    // ============================================================================
    // GET EVENTS FOR REGISTRATION
    // ============================================================================

    async getEventsForRegistration(churchId: string): Promise<EventOption[]> {
        const query = `
            SELECT 
                id,
                name,
                start_date,
                end_date,
                start_time,
                end_time,
                location_name,
                location_address,
                max_registrations,
                current_registrations,
                is_active,
                is_paid,
                price,
                currency
            FROM events
            WHERE church_id = $1
                AND is_active = true
                AND (
                    start_date >= CURRENT_DATE
                    OR (recurrence != 'none' AND recurrence IS NOT NULL)
                )
            ORDER BY start_date ASC, start_time ASC
            LIMIT 50
        `;

        const result = await pool.query(query, [churchId]);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            startDate: row.start_date,
            endDate: row.end_date,
            startTime: row.start_time,
            endTime: row.end_time,
            locationName: row.location_name,
            locationAddress: row.location_address,
            maxRegistrations: row.max_registrations,
            currentRegistrations: row.current_registrations || 0,
            isActive: row.is_active,
            isPaid: row.is_paid,
            price: row.price ? parseFloat(row.price) : undefined,
            currency: row.currency,
        }));
    }

    async getEventWithInstances(eventId: string, churchId: string): Promise<{
        event: EventOption;
        instances: EventInstance[];
    } | null> {
        const eventQuery = `
            SELECT 
                id, name, start_date, end_date, start_time, end_time,
                location_name, location_address, max_registrations,
                current_registrations, is_active, is_paid, price, currency
            FROM events
            WHERE id = $1 AND church_id = $2
        `;

        const eventResult = await pool.query(eventQuery, [eventId, churchId]);

        if (!eventResult.rows[0]) return null;

        const event = eventResult.rows[0];

        const instancesQuery = `
            SELECT 
                id, event_id, instance_date as date, start_time, end_time,
                status, total_attendance
            FROM event_instances
            WHERE event_id = $1 AND church_id = $2
                AND instance_date >= CURRENT_DATE
                AND status != 'cancelled'
            ORDER BY instance_date ASC, start_time ASC
            LIMIT 10
        `;

        const instancesResult = await pool.query(instancesQuery, [eventId, churchId]);

        return {
            event: {
                id: event.id,
                name: event.name,
                startDate: event.start_date,
                endDate: event.end_date,
                startTime: event.start_time,
                endTime: event.end_time,
                locationName: event.location_name,
                locationAddress: event.location_address,
                maxRegistrations: event.max_registrations,
                currentRegistrations: event.current_registrations || 0,
                isActive: event.is_active,
                isPaid: event.is_paid,
                price: event.price ? parseFloat(event.price) : undefined,
                currency: event.currency,
            },
            instances: instancesResult.rows.map(row => ({
                id: row.id,
                eventId: row.event_id,
                date: row.date,
                startTime: row.start_time,
                endTime: row.end_time,
                status: row.status,
                totalAttendance: row.total_attendance || 0,
            })),
        };
    }

    // ============================================================================
    // CREATE FIRST TIMER (for new guests)
    // ============================================================================

    async createFirstTimer(
        churchId: string,
        data: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            gender?: string;
            howDidYouHear?: string;
        }
    ): Promise<{ id: string; firstName: string; lastName: string }> {
        const id = uuidv4();
        const today = new Date().toISOString().split('T')[0];

        const query = `
            INSERT INTO first_timers (
                id, church_id, first_name, last_name, email, phone,
                gender, how_did_you_hear, first_visit_date,
                status, follow_up_status, visit_count,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', 'pending', 1, NOW(), NOW())
            RETURNING id, first_name, last_name
        `;

        const result = await pool.query(query, [
            id,
            churchId,
            data.firstName,
            data.lastName,
            data.email || null,
            data.phone || null,
            data.gender || null,
            data.howDidYouHear || 'event_check_in',
            today,
        ]);

        return {
            id: result.rows[0].id,
            firstName: result.rows[0].first_name,
            lastName: result.rows[0].last_name,
        };
    }

    // ============================================================================
    // CREATE REGISTRATION
    // ============================================================================

    async createRegistration(
        churchId: string,
        eventId: string,
        eventInstanceId: string | undefined,
        registrantId: string,
        registrantSource: AttendeeSource,
        options?: {
            notes?: string;
            ticketType?: string;
            quantity?: number;
            checkedIn?: boolean;
            registeredBy?: string;
        }
    ): Promise<{
        id: string;
        confirmationCode: string;
        qrCode: string;
        registrantName: string;
    }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if registration already exists
            const existingQuery = `
                SELECT id, checked_in FROM event_registrations
                WHERE event_id = $1 
                    AND church_id = $2
                    AND ${registrantSource === 'member' ? 'member_id' : 'first_timer_id'} = $3
                    AND status != 'cancelled'
                ${eventInstanceId ? 'AND (event_instance_id = $4 OR event_instance_id IS NULL)' : ''}
                LIMIT 1
            `;

            const existingParams = eventInstanceId
                ? [eventId, churchId, registrantId, eventInstanceId]
                : [eventId, churchId, registrantId];

            const existingResult = await client.query(existingQuery, existingParams);

            let registrationId: string;
            let confirmationCode: string;
            let qrCode: string;

            if (existingResult.rows[0]) {
                // Registration exists, update if checking in
                registrationId = existingResult.rows[0].id;

                const getCodeQuery = `SELECT confirmation_code, qr_code FROM event_registrations WHERE id = $1`;
                const codeResult = await client.query(getCodeQuery, [registrationId]);
                confirmationCode = codeResult.rows[0].confirmation_code;
                qrCode = codeResult.rows[0].qr_code;

                if (options?.checkedIn && !existingResult.rows[0].checked_in) {
                    await client.query(`
                        UPDATE event_registrations
                        SET checked_in = true, checked_in_at = NOW(), 
                            checked_in_by = $2, status = 'attended', updated_at = NOW()
                        WHERE id = $1
                    `, [registrationId, options.registeredBy]);
                }
            } else {
                // Create new registration
                registrationId = uuidv4();
                confirmationCode = this.generateConfirmationCode();
                qrCode = generateQRCode();

                const insertQuery = `
                    INSERT INTO event_registrations (
                        id, event_id, event_instance_id, church_id,
                        member_id, first_timer_id,
                        ticket_type, quantity, confirmation_code, qr_code, notes,
                        status, payment_status, checked_in, checked_in_at, checked_in_by,
                        registered_by, registered_at, created_at
                    ) VALUES (
                        $1, $2, $3, $4,
                        $5, $6,
                        $7, $8, $9, $10, $11,
                        $12, 'free', $13, ${options?.checkedIn ? 'NOW()' : 'NULL'}, $14,
                        $14, NOW(), NOW()
                    )
                `;

                await client.query(insertQuery, [
                    registrationId,
                    eventId,
                    eventInstanceId || null,
                    churchId,
                    registrantSource === 'member' ? registrantId : null,
                    registrantSource === 'first_timer' ? registrantId : null,
                    options?.ticketType || 'general',
                    options?.quantity || 1,
                    confirmationCode,
                    qrCode,
                    options?.notes || null,
                    options?.checkedIn ? 'attended' : 'confirmed',
                    options?.checkedIn || false,
                    options?.registeredBy || null,
                ]);

                // Update event registration count
                await client.query(`
                    UPDATE events
                    SET current_registrations = COALESCE(current_registrations, 0) + $1, updated_at = NOW()
                    WHERE id = $2
                `, [options?.quantity || 1, eventId]);

                // Update instance attendance if checked in
                if (options?.checkedIn && eventInstanceId) {
                    const attendanceColumn = registrantSource === 'member'
                        ? 'member_attendance'
                        : 'guest_attendance';

                    await client.query(`
                        UPDATE event_instances
                        SET 
                            total_attendance = COALESCE(total_attendance, 0) + 1,
                            ${attendanceColumn} = COALESCE(${attendanceColumn}, 0) + 1,
                            updated_at = NOW()
                        WHERE id = $1
                    `, [eventInstanceId]);
                }
            }

            // Get registrant name
            const nameQuery = registrantSource === 'member'
                ? `SELECT first_name, last_name FROM members WHERE id = $1`
                : `SELECT first_name, last_name FROM first_timers WHERE id = $1`;

            const nameResult = await client.query(nameQuery, [registrantId]);
            const registrantName = nameResult.rows[0]
                ? `${nameResult.rows[0].first_name} ${nameResult.rows[0].last_name}`
                : 'Unknown';

            await client.query('COMMIT');

            return {
                id: registrationId,
                confirmationCode,
                qrCode,
                registrantName,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // CHECK IN - Main method for quick check-in
    // ============================================================================

    async checkIn(
        churchId: string,
        data: QuickCheckInRequest,
        checkedInBy?: string
    ): Promise<{
        registration: {
            id: string;
            confirmationCode: string;
            registrantName: string;
            registrantType: AttendeeSource;
            checkInTime: string;
        };
        newFirstTimer?: {
            id: string;
            firstName: string;
            lastName: string;
        };
    }> {
        let registrantId: string;
        let registrantSource: AttendeeSource;
        let newFirstTimer: { id: string; firstName: string; lastName: string } | undefined;

        // Case 1: Existing person (member or first timer)
        if (data.registrantId && data.registrantSource) {
            registrantId = data.registrantId;
            registrantSource = data.registrantSource;

            // Update first timer visit count if applicable
            if (registrantSource === 'first_timer') {
                await pool.query(`
                    UPDATE first_timers
                    SET visit_count = COALESCE(visit_count, 0) + 1,
                        last_visit_date = CURRENT_DATE,
                        status = CASE WHEN status = 'new' THEN 'following_up' ELSE status END,
                        updated_at = NOW()
                    WHERE id = $1
                `, [registrantId]);
            }
        }
        // Case 2: New person - create as first timer
        else if (data.newPerson) {
            newFirstTimer = await this.createFirstTimer(churchId, {
                firstName: data.newPerson.firstName,
                lastName: data.newPerson.lastName,
                email: data.newPerson.email,
                phone: data.newPerson.phone,
                gender: data.newPerson.gender,
                howDidYouHear: data.newPerson.howDidYouHear || 'event_check_in',
            });

            registrantId = newFirstTimer.id;
            registrantSource = 'first_timer';
        } else {
            throw new Error('Either registrantId or newPerson must be provided');
        }

        // Create/update registration with check-in
        const registration = await this.createRegistration(
            churchId,
            data.eventId,
            data.eventInstanceId,
            registrantId,
            registrantSource,
            {
                checkedIn: true,
                registeredBy: checkedInBy,
            }
        );

        return {
            registration: {
                id: registration.id,
                confirmationCode: registration.confirmationCode,
                registrantName: registration.registrantName,
                registrantType: registrantSource,
                checkInTime: new Date().toISOString(),
            },
            newFirstTimer,
        };
    }

    // ============================================================================
    // REMOVE CHECK-IN
    // ============================================================================

    async removeCheckIn(registrationId: string, churchId: string): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get registration details
            const regQuery = `
                SELECT event_instance_id, member_id, first_timer_id, checked_in
                FROM event_registrations
                WHERE id = $1 AND church_id = $2
            `;
            const regResult = await client.query(regQuery, [registrationId, churchId]);

            if (!regResult.rows[0]) {
                throw new Error('Registration not found');
            }

            const reg = regResult.rows[0];

            if (!reg.checked_in) {
                throw new Error('Registration is not checked in');
            }

            // Update registration
            await client.query(`
                UPDATE event_registrations
                SET checked_in = false, checked_in_at = NULL, checked_in_by = NULL, 
                    status = 'confirmed', updated_at = NOW()
                WHERE id = $1
            `, [registrationId]);

            // Update instance attendance
            if (reg.event_instance_id) {
                const attendanceColumn = reg.member_id ? 'member_attendance' : 'guest_attendance';

                await client.query(`
                    UPDATE event_instances
                    SET 
                        total_attendance = GREATEST(COALESCE(total_attendance, 0) - 1, 0),
                        ${attendanceColumn} = GREATEST(COALESCE(${attendanceColumn}, 0) - 1, 0),
                        updated_at = NOW()
                    WHERE id = $1
                `, [reg.event_instance_id]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================================================
    // GET EVENT ATTENDEES
    // ============================================================================

    async getEventAttendees(
        eventId: string,
        churchId: string,
        instanceId?: string
    ): Promise<EventAttendee[]> {
        const query = `
            SELECT 
                er.id,
                er.member_id,
                er.first_timer_id,
                er.checked_in,
                er.checked_in_at,
                er.registered_at,
                -- Member info
                m.first_name as member_first_name,
                m.last_name as member_last_name,
                m.email as member_email,
                m.phone as member_phone,
                m.profile_image_url as member_avatar,
                -- First timer info
                ft.first_name as ft_first_name,
                ft.last_name as ft_last_name,
                ft.email as ft_email,
                ft.phone as ft_phone
            FROM event_registrations er
            LEFT JOIN members m ON er.member_id = m.id
            LEFT JOIN first_timers ft ON er.first_timer_id = ft.id
            WHERE er.event_id = $1
                AND er.church_id = $2
                AND er.status != 'cancelled'
            ${instanceId ? 'AND (er.event_instance_id = $3 OR er.event_instance_id IS NULL)' : ''}
            ORDER BY 
                er.checked_in DESC,
                COALESCE(m.first_name, ft.first_name),
                COALESCE(m.last_name, ft.last_name)
        `;

        const params = instanceId ? [eventId, churchId, instanceId] : [eventId, churchId];
        const result = await pool.query(query, params);

        return result.rows.map(row => {
            const isMember = !!row.member_id;

            return {
                id: row.id,
                registrantId: isMember ? row.member_id : row.first_timer_id,
                registrantSource: isMember ? 'member' : 'first_timer' as AttendeeSource,
                firstName: isMember ? row.member_first_name : row.ft_first_name,
                lastName: isMember ? row.member_last_name : row.ft_last_name,
                email: isMember ? row.member_email : row.ft_email,
                phone: isMember ? row.member_phone : row.ft_phone,
                avatar: row.member_avatar,
                isCheckedIn: row.checked_in,
                checkInTime: row.checked_in_at,
                registeredAt: row.registered_at,
            };
        });
    }

    // ============================================================================
    // GET ATTENDANCE STATS
    // ============================================================================

    async getAttendanceStats(
        eventId: string,
        churchId: string,
        instanceId?: string
    ): Promise<AttendanceStats> {
        const query = `
            SELECT 
                COUNT(*) as total_registered,
                COUNT(*) FILTER (WHERE checked_in = true) as checked_in,
                COUNT(*) FILTER (WHERE checked_in = false OR checked_in IS NULL) as not_checked_in,
                COUNT(*) FILTER (WHERE member_id IS NOT NULL) as members,
                COUNT(*) FILTER (WHERE first_timer_id IS NOT NULL) as first_timers,
                COUNT(*) FILTER (
                    WHERE first_timer_id IS NOT NULL 
                    AND DATE(registered_at) = CURRENT_DATE
                ) as new_first_timers_today
            FROM event_registrations
            WHERE event_id = $1 
                AND church_id = $2 
                AND status != 'cancelled'
            ${instanceId ? 'AND (event_instance_id = $3 OR event_instance_id IS NULL)' : ''}
        `;

        const params = instanceId ? [eventId, churchId, instanceId] : [eventId, churchId];
        const result = await pool.query(query, params);
        const row = result.rows[0];

        return {
            totalRegistered: parseInt(row.total_registered) || 0,
            checkedIn: parseInt(row.checked_in) || 0,
            notCheckedIn: parseInt(row.not_checked_in) || 0,
            members: parseInt(row.members) || 0,
            firstTimers: parseInt(row.first_timers) || 0,
            newFirstTimersToday: parseInt(row.new_first_timers_today) || 0,
        };
    }

    // ============================================================================
    // GET RECENT CHECK-INS
    // ============================================================================

    async getRecentCheckIns(
        eventId: string,
        churchId: string,
        limit: number = 10
    ): Promise<{
        id: string;
        name: string;
        time: string;
        type: AttendeeSource;
        isNew: boolean;
    }[]> {
        const query = `
            SELECT 
                er.id,
                er.checked_in_at as time,
                er.member_id,
                er.first_timer_id,
                COALESCE(
                    CONCAT(m.first_name, ' ', m.last_name),
                    CONCAT(ft.first_name, ' ', ft.last_name)
                ) as name,
                CASE WHEN m.id IS NOT NULL THEN 'member' ELSE 'first_timer' END as type,
                CASE 
                    WHEN ft.id IS NOT NULL AND DATE(ft.created_at) = CURRENT_DATE 
                    THEN true 
                    ELSE false 
                END as is_new
            FROM event_registrations er
            LEFT JOIN members m ON er.member_id = m.id
            LEFT JOIN first_timers ft ON er.first_timer_id = ft.id
            WHERE er.event_id = $1 
                AND er.church_id = $2 
                AND er.checked_in = true
            ORDER BY er.checked_in_at DESC
            LIMIT $3
        `;

        const result = await pool.query(query, [eventId, churchId, limit]);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            time: row.time,
            type: row.type as AttendeeSource,
            isNew: row.is_new,
        }));
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
}