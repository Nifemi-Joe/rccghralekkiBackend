// src/services/ManualRegistrationService.ts
import { pool } from '@config/database';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '@utils/AppError';
import {
    ManualRegistrationDTO,
    MemberLookupResult,
    ManualRegistrationResponse,
    BulkManualRegistrationDTO,
    RegistrationSearchFilters,
    NotificationChannel
} from '@/dtos/registration.types';
import { EventRepository } from '@repositories/EventRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { FirstTimerRepository } from '@repositories/FirstTimerRepository';
import { NotificationService } from '@services/NotificationService';
import { generateQRCode } from '@utils/helpers';
import logger from '@config/logger';

export class ManualRegistrationService {
    private eventRepository: EventRepository;
    private memberRepository: MemberRepository;
    private firstTimerRepository: FirstTimerRepository;
    private notificationService: NotificationService;

    constructor() {
        this.eventRepository = new EventRepository();
        this.memberRepository = new MemberRepository();
        this.firstTimerRepository = new FirstTimerRepository();
        this.notificationService = new NotificationService();
    }

    /**
     * Search for existing members and first-timers
     */
    async searchRegistrants(filters: RegistrationSearchFilters): Promise<MemberLookupResult[]> {
        const { churchId, search, includeMembers = true, includeFirstTimers = true, limit = 20 } = filters;
        const results: MemberLookupResult[] = [];
        const searchPattern = `%${search.toLowerCase()}%`;

        // Search members
        if (includeMembers) {
            const memberQuery = `
                SELECT 
                    id, 
                    first_name, 
                    last_name, 
                    email, 
                    phone, 
                    profile_image_url,
                    status
                FROM members
                WHERE church_id = $1 
                  AND deleted_at IS NULL
                  AND status = 'active'
                  AND (
                      LOWER(first_name) LIKE $2 
                      OR LOWER(last_name) LIKE $2 
                      OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2
                      OR LOWER(email) LIKE $2
                      OR phone LIKE $2
                  )
                ORDER BY first_name, last_name
                LIMIT $3
            `;

            const memberResult = await pool.query(memberQuery, [churchId, searchPattern, limit]);

            for (const row of memberResult.rows) {
                results.push({
                    id: row.id,
                    type: 'member',
                    firstName: row.first_name,
                    lastName: row.last_name,
                    fullName: `${row.first_name} ${row.last_name}`,
                    email: row.email,
                    phone: row.phone,
                    profileImageUrl: row.profile_image_url,
                    status: row.status
                });
            }
        }

        // Search first-timers
        if (includeFirstTimers) {
            const firstTimerQuery = `
                SELECT 
                    id, 
                    first_name, 
                    last_name, 
                    email, 
                    phone,
                    status
                FROM first_timers
                WHERE church_id = $1 
                  AND deleted_at IS NULL
                  AND status NOT IN ('converted', 'inactive')
                  AND (
                      LOWER(first_name) LIKE $2 
                      OR LOWER(last_name) LIKE $2 
                      OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $2
                      OR LOWER(email) LIKE $2
                      OR phone LIKE $2
                  )
                ORDER BY first_name, last_name
                LIMIT $3
            `;

            const firstTimerResult = await pool.query(firstTimerQuery, [churchId, searchPattern, limit]);

            for (const row of firstTimerResult.rows) {
                results.push({
                    id: row.id,
                    type: 'first_timer',
                    firstName: row.first_name,
                    lastName: row.last_name,
                    fullName: `${row.first_name} ${row.last_name}`,
                    email: row.email,
                    phone: row.phone,
                    status: row.status
                });
            }
        }

        // Sort combined results by name
        results.sort((a, b) => a.fullName.localeCompare(b.fullName));

        return results.slice(0, limit);
    }

    // src/services/ManualRegistrationService.ts - Add these methods

    /**
     * Get all members for quick check-in
     */
    async getAllMembers(churchId: string, options?: {
        search?: string;
        limit?: number;
    }): Promise<Array<{
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        avatar?: string;
        membershipDate?: string;
    }>> {
        const { search, limit = 100 } = options || {};

        let query = `
        SELECT 
            id, first_name, last_name, email, phone, 
            profile_image_url as avatar, created_at as membership_date
        FROM members
        WHERE church_id = $1 
          AND deleted_at IS NULL
          AND status = 'active'
    `;

        const params: any[] = [churchId];

        if (search && search.length >= 2) {
            const searchPattern = `%${search.toLowerCase()}%`;
            params.push(searchPattern);
            query += ` AND (
            LOWER(first_name) LIKE $${params.length}
            OR LOWER(last_name) LIKE $${params.length}
            OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE $${params.length}
            OR LOWER(email) LIKE $${params.length}
            OR phone LIKE $${params.length}
        )`;
        }

        query += ` ORDER BY first_name, last_name LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            avatar: row.avatar,
            membershipDate: row.membership_date
        }));
    }

    /**
     * Get event attendees (pre-registered people)
     */
    async getEventAttendees(churchId: string, eventId: string, options?: {
        instanceId?: string;
        search?: string;
    }) {
        const { instanceId, search } = options || {};

        let query = `
        SELECT 
            er.id as registration_id,
            er.member_id,
            er.guest_name,
            er.guest_email,
            er.guest_phone,
            er.checked_in,
            er.checked_in_at,
            er.registered_at,
            er.status,
            m.first_name as member_first_name,
            m.last_name as member_last_name,
            m.email as member_email,
            m.phone as member_phone,
            m.profile_image_url as member_avatar
        FROM event_registrations er
        LEFT JOIN members m ON er.member_id = m.id
        WHERE er.event_id = $1 
          AND er.church_id = $2
          AND er.status != 'cancelled'
    `;

        const params: any[] = [eventId, churchId];

        if (instanceId) {
            params.push(instanceId);
            query += ` AND (er.event_instance_id = $${params.length} OR er.event_instance_id IS NULL)`;
        }

        if (search && search.length >= 2) {
            const searchPattern = `%${search.toLowerCase()}%`;
            params.push(searchPattern);
            query += ` AND (
            LOWER(m.first_name) LIKE $${params.length}
            OR LOWER(m.last_name) LIKE $${params.length}
            OR LOWER(er.guest_name) LIKE $${params.length}
            OR LOWER(m.email) LIKE $${params.length}
            OR LOWER(er.guest_email) LIKE $${params.length}
            OR m.phone LIKE $${params.length}
            OR er.guest_phone LIKE $${params.length}
        )`;
        }

        query += ` ORDER BY er.checked_in DESC, er.registered_at DESC`;

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
            registrationId: row.registration_id,
            memberId: row.member_id,
            firstName: row.member_id ? row.member_first_name : row.guest_name?.split(' ')[0],
            lastName: row.member_id ? row.member_last_name : row.guest_name?.split(' ').slice(1).join(' '),
            email: row.member_id ? row.member_email : row.guest_email,
            phone: row.member_id ? row.member_phone : row.guest_phone,
            avatar: row.member_avatar,
            isCheckedIn: row.checked_in,
            checkInTime: row.checked_in_at,
            registeredAt: row.registered_at,
            type: row.member_id ? 'member' : 'guest',
            status: row.status
        }));
    }

    /**
     * Quick check-in - handles all scenarios
     */
    async quickCheckIn(churchId: string, data: {
        eventId: string;
        eventInstanceId?: string;
        registrationId?: string; // Pre-registered attendee
        memberId?: string; // Member checking in without registration
        walkIn?: {
            type: 'first_timer' | 'guest';
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            gender?: string;
            isFirstTimer?: boolean;
        };
        checkedInBy?: string;
    }) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            let registrationId: string;
            let registrantName: string;
            let newRecord: any;

            // Scenario 1: Check in pre-registered attendee
            if (data.registrationId) {
                // Update existing registration
                const updateQuery = `
                UPDATE event_registrations
                SET checked_in = true,
                    checked_in_at = NOW(),
                    checked_in_by = $1,
                    status = 'attended',
                    updated_at = NOW()
                WHERE id = $2 AND church_id = $3 AND checked_in = false
                RETURNING id, member_id, guest_name
            `;

                const result = await client.query(updateQuery, [
                    data.checkedInBy,
                    data.registrationId,
                    churchId
                ]);

                if (!result.rows[0]) {
                    throw new AppError('Registration not found or already checked in', 404);
                }

                registrationId = result.rows[0].id;

                // Get name
                if (result.rows[0].member_id) {
                    const memberQuery = `SELECT first_name, last_name FROM members WHERE id = $1`;
                    const memberResult = await client.query(memberQuery, [result.rows[0].member_id]);
                    registrantName = `${memberResult.rows[0].first_name} ${memberResult.rows[0].last_name}`;
                } else {
                    registrantName = result.rows[0].guest_name;
                }
            }
            // Scenario 2: Member checking in without prior registration
            else if (data.memberId) {
                // Get member details
                const memberQuery = `
                SELECT first_name, last_name, email, phone 
                FROM members 
                WHERE id = $1 AND church_id = $2
            `;
                const memberResult = await client.query(memberQuery, [data.memberId, churchId]);

                if (!memberResult.rows[0]) {
                    throw new AppError('Member not found', 404);
                }

                const member = memberResult.rows[0];
                registrantName = `${member.first_name} ${member.last_name}`;

                // Check if registration exists
                const existingQuery = `
                SELECT id FROM event_registrations
                WHERE event_id = $1 AND member_id = $2 AND status != 'cancelled'
            `;
                const existing = await client.query(existingQuery, [data.eventId, data.memberId]);

                if (existing.rows[0]) {
                    // Update existing
                    registrationId = existing.rows[0].id;
                    await client.query(`
                    UPDATE event_registrations
                    SET checked_in = true,
                        checked_in_at = NOW(),
                        checked_in_by = $1,
                        status = 'attended',
                        updated_at = NOW()
                    WHERE id = $2
                `, [data.checkedInBy, registrationId]);
                } else {
                    // Create new registration and check in
                    registrationId = uuidv4();
                    const confirmationCode = this.generateConfirmationCode();
                    const qrCode = generateQRCode();

                    await client.query(`
                    INSERT INTO event_registrations (
                        id, event_id, event_instance_id, church_id, member_id,
                        confirmation_code, qr_code, status, checked_in, checked_in_at,
                        checked_in_by, registered_at, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'attended', true, NOW(), $8, NOW(), NOW())
                `, [
                        registrationId,
                        data.eventId,
                        data.eventInstanceId || null,
                        churchId,
                        data.memberId,
                        confirmationCode,
                        qrCode,
                        data.checkedInBy
                    ]);

                    // Update event count
                    await client.query(`
                    UPDATE events
                    SET current_registrations = COALESCE(current_registrations, 0) + 1
                    WHERE id = $1
                `, [data.eventId]);
                }
            }
            // Scenario 3: Walk-in (new guest or first-timer)
            else if (data.walkIn) {
                registrantName = `${data.walkIn.firstName} ${data.walkIn.lastName}`;

                // Create first-timer record if applicable
                if (data.walkIn.isFirstTimer || data.walkIn.type === 'first_timer') {
                    const firstTimerId = uuidv4();
                    await client.query(`
                    INSERT INTO first_timers (
                        id, church_id, first_name, last_name, email, phone, gender,
                        first_visit_date, status, follow_up_status, visit_count,
                        how_did_you_hear, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'new', 'pending', 1, 'walk_in', NOW(), NOW())
                `, [
                        firstTimerId,
                        churchId,
                        data.walkIn.firstName,
                        data.walkIn.lastName,
                        data.walkIn.email || null,
                        data.walkIn.phone || null,
                        data.walkIn.gender || null
                    ]);

                    newRecord = {
                        type: 'first_timer',
                        id: firstTimerId,
                        firstName: data.walkIn.firstName,
                        lastName: data.walkIn.lastName
                    };
                }

                // Create registration
                registrationId = uuidv4();
                const confirmationCode = this.generateConfirmationCode();
                const qrCode = generateQRCode();

                await client.query(`
                INSERT INTO event_registrations (
                    id, event_id, event_instance_id, church_id,
                    guest_name, guest_email, guest_phone,
                    confirmation_code, qr_code, status,
                    checked_in, checked_in_at, checked_in_by,
                    registered_at, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'attended', true, NOW(), $10, NOW(), NOW())
            `, [
                    registrationId,
                    data.eventId,
                    data.eventInstanceId || null,
                    churchId,
                    registrantName,
                    data.walkIn.email || null,
                    data.walkIn.phone || null,
                    confirmationCode,
                    qrCode,
                    data.checkedInBy
                ]);

                // Update event count
                await client.query(`
                UPDATE events
                SET current_registrations = COALESCE(current_registrations, 0) + 1
                WHERE id = $1
            `, [data.eventId]);
            } else {
                throw new AppError('Invalid check-in data', 400);
            }

            // Update instance attendance
            if (data.eventInstanceId) {
                await client.query(`
                UPDATE event_instances
                SET total_attendance = COALESCE(total_attendance, 0) + 1,
                    ${data.memberId ? 'member_attendance' : 'guest_attendance'} = 
                        COALESCE(${data.memberId ? 'member_attendance' : 'guest_attendance'}, 0) + 1,
                    updated_at = NOW()
                WHERE id = $1
            `, [data.eventInstanceId]);
            }

            await client.query('COMMIT');

            return {
                registrationId,
                registrantName,
                checkInTime: new Date().toISOString(),
                newRecord
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Undo check-in
     */
    async undoCheckIn(churchId: string, registrationId: string) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get registration info
            const regQuery = `
            SELECT event_instance_id, member_id, checked_in
            FROM event_registrations
            WHERE id = $1 AND church_id = $2
        `;
            const regResult = await client.query(regQuery, [registrationId, churchId]);

            if (!regResult.rows[0]) {
                throw new AppError('Registration not found', 404);
            }

            if (!regResult.rows[0].checked_in) {
                throw new AppError('Registration is not checked in', 400);
            }

            // Update registration
            await client.query(`
            UPDATE event_registrations
            SET checked_in = false,
                checked_in_at = NULL,
                checked_in_by = NULL,
                status = 'confirmed',
                updated_at = NOW()
            WHERE id = $1
        `, [registrationId]);

            // Update instance attendance
            if (regResult.rows[0].event_instance_id) {
                const attendanceField = regResult.rows[0].member_id
                    ? 'member_attendance'
                    : 'guest_attendance';

                await client.query(`
                UPDATE event_instances
                SET total_attendance = GREATEST(COALESCE(total_attendance, 0) - 1, 0),
                    ${attendanceField} = GREATEST(COALESCE(${attendanceField}, 0) - 1, 0),
                    updated_at = NOW()
                WHERE id = $1
            `, [regResult.rows[0].event_instance_id]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get recent check-ins
     */
    async getRecentCheckIns(churchId: string, eventId: string, options?: {
        instanceId?: string;
        limit?: number;
    }) {
        const { instanceId, limit = 10 } = options || {};

        let query = `
        SELECT 
            er.id,
            er.checked_in_at,
            er.member_id,
            COALESCE(
                CONCAT(m.first_name, ' ', m.last_name),
                er.guest_name
            ) as name,
            CASE WHEN m.id IS NOT NULL THEN 'member' ELSE 'guest' END as type
        FROM event_registrations er
        LEFT JOIN members m ON er.member_id = m.id
        WHERE er.event_id = $1 
          AND er.church_id = $2
          AND er.checked_in = true
    `;

        const params: any[] = [eventId, churchId];

        if (instanceId) {
            params.push(instanceId);
            query += ` AND er.event_instance_id = $${params.length}`;
        }

        params.push(limit);
        query += ` ORDER BY er.checked_in_at DESC LIMIT $${params.length}`;

        const result = await pool.query(query, params);

        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            time: row.checked_in_at,
            type: row.type
        }));
    }

    private generateConfirmationCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * Get detailed info for a specific registrant
     */
    async getRegistrantDetails(
        churchId: string,
        id: string,
        type: 'member' | 'first_timer'
    ): Promise<MemberLookupResult | null> {
        if (type === 'member') {
            const query = `
                SELECT id, first_name, last_name, email, phone, profile_image_url, status
                FROM members
                WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [id, churchId]);

            if (result.rows[0]) {
                const row = result.rows[0];
                return {
                    id: row.id,
                    type: 'member',
                    firstName: row.first_name,
                    lastName: row.last_name,
                    fullName: `${row.first_name} ${row.last_name}`,
                    email: row.email,
                    phone: row.phone,
                    profileImageUrl: row.profile_image_url,
                    status: row.status
                };
            }
        } else {
            const query = `
                SELECT id, first_name, last_name, email, phone, status
                FROM first_timers
                WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [id, churchId]);

            if (result.rows[0]) {
                const row = result.rows[0];
                return {
                    id: row.id,
                    type: 'first_timer',
                    firstName: row.first_name,
                    lastName: row.last_name,
                    fullName: `${row.first_name} ${row.last_name}`,
                    email: row.email,
                    phone: row.phone,
                    status: row.status
                };
            }
        }

        return null;
    }

    /**
     * Register someone for an event
     */
    async registerForEvent(churchId: string, data: ManualRegistrationDTO): Promise<ManualRegistrationResponse> {
        try {
            // Get event details
            const event = await this.eventRepository.findById(data.eventId, churchId);
            if (!event) {
                throw new AppError('Event not found', 404);
            }

            // Get event instance if provided
            let instanceDate = event.startDate;
            if (data.eventInstanceId) {
                const instance = await this.eventRepository.findInstanceById(data.eventInstanceId, churchId);
                if (instance) {
                    instanceDate = instance.instanceDate;
                }
            }

            let memberId: string | undefined;
            let guestName: string | undefined;
            let guestEmail: string | undefined;
            let guestPhone: string | undefined;
            let registrantName: string;
            let newRecordCreated: { type: 'member' | 'first_timer'; id: string } | undefined;

            // Handle different registrant types
            switch (data.registrantType) {
                case 'existing_member':
                    if (!data.memberId) {
                        throw new AppError('Member ID is required for existing members', 400);
                    }

                    const member = await this.memberRepository.findById(data.memberId, churchId);
                    if (!member) {
                        throw new AppError('Member not found', 404);
                    }

                    memberId = data.memberId;
                    registrantName = `${member.first_name} ${member.last_name}`;
                    guestEmail = member.email;
                    guestPhone = member.phone;
                    break;

                case 'new_member':
                    if (!data.firstName || !data.lastName) {
                        throw new AppError('First name and last name are required', 400);
                    }

                    // Create new member with minimal info
                    const newMember = await this.createMinimalMember(churchId, {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        phone: data.phone,
                        createdBy: data.registeredBy
                    });

                    memberId = newMember.id;
                    registrantName = `${data.firstName} ${data.lastName}`;
                    guestEmail = data.email;
                    guestPhone = data.phone;
                    newRecordCreated = { type: 'member', id: newMember.id };
                    break;

                case 'first_timer':
                    if (!data.firstName || !data.lastName) {
                        throw new AppError('First name and last name are required', 400);
                    }

                    // Create new first-timer
                    const newFirstTimer = await this.createMinimalFirstTimer(churchId, {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        phone: data.phone,
                        createdBy: data.registeredBy
                    });

                    // For event registration, use guest fields for first-timers
                    guestName = `${data.firstName} ${data.lastName}`;
                    guestEmail = data.email;
                    guestPhone = data.phone;
                    registrantName = guestName;
                    newRecordCreated = { type: 'first_timer', id: newFirstTimer.id };
                    break;

                case 'guest':
                    if (!data.firstName || !data.lastName) {
                        throw new AppError('First name and last name are required', 400);
                    }

                    guestName = `${data.firstName} ${data.lastName}`;
                    guestEmail = data.email;
                    guestPhone = data.phone;
                    registrantName = guestName;
                    break;

                default:
                    throw new AppError('Invalid registrant type', 400);
            }

            // Check for duplicate registration
            const existingRegistration = await this.checkExistingRegistration(
                data.eventId,
                memberId,
                guestEmail,
                guestPhone
            );

            if (existingRegistration) {
                throw new AppError('This person is already registered for this event', 400);
            }

            // Create the registration
            const registration = await this.eventRepository.createRegistration(churchId, {
                eventId: data.eventId,
                eventInstanceId: data.eventInstanceId,
                memberId,
                guestName,
                guestEmail,
                guestPhone,
                notes: data.notes
            });

            // Get church info for notifications
            const churchInfo = await this.getChurchInfo(churchId);

            // Send notifications if requested
            let notificationResults: { channel: NotificationChannel; success: boolean; error?: string }[] = [];

            if (data.sendNotification && data.notificationChannels?.length) {
                const notificationData = {
                    recipientName: registrantName,
                    recipientEmail: guestEmail,
                    recipientPhone: guestPhone,
                    churchName: churchInfo.name,
                    eventName: event.name,
                    eventDate: instanceDate,
                    registrantType: data.registrantType,
                    recordId: newRecordCreated?.id,
                    completionLink: this.generateProfileCompletionLink(
                        churchId,
                        newRecordCreated?.type || 'guest',
                        newRecordCreated?.id || registration.id
                    )
                };

                for (const channel of data.notificationChannels) {
                    try {
                        await this.sendRegistrationNotification(channel, notificationData);
                        notificationResults.push({ channel, success: true });
                    } catch (error: any) {
                        notificationResults.push({ channel, success: false, error: error.message });
                        logger.error(`Failed to send ${channel} notification:`, error);
                    }
                }
            }

            logger.info(`Manual registration completed for event ${event.name}`, {
                registrantType: data.registrantType,
                registrantName,
                registeredBy: data.registeredBy,
                newRecordCreated
            });

            return {
                success: true,
                registration: {
                    id: registration.id,
                    confirmationCode: registration.confirmationCode,
                    eventName: event.name,
                    eventDate: instanceDate.toString(),
                    registrantName,
                    registrantType: data.registrantType
                },
                newRecordCreated,
                notificationsSent: notificationResults.length > 0 ? notificationResults : undefined
            };
        } catch (error) {
            logger.error('Error in registerForEvent:', error);
            throw error;
        }
    }

    /**
     * Bulk register multiple people
     */
    async bulkRegisterForEvent(
        churchId: string,
        data: BulkManualRegistrationDTO
    ): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: Array<{
            index: number;
            success: boolean;
            registration?: ManualRegistrationResponse;
            error?: string;
        }>;
    }> {
        const results: Array<{
            index: number;
            success: boolean;
            registration?: ManualRegistrationResponse;
            error?: string;
        }> = [];

        for (let i = 0; i < data.registrations.length; i++) {
            const reg = data.registrations[i];
            try {
                const result = await this.registerForEvent(churchId, {
                    eventId: data.eventId,
                    eventInstanceId: data.eventInstanceId,
                    registrantType: reg.registrantType,
                    memberId: reg.memberId,
                    firstName: reg.firstName,
                    lastName: reg.lastName,
                    email: reg.email,
                    phone: reg.phone,
                    sendNotification: data.sendNotifications,
                    notificationChannels: data.notificationChannels,
                    registeredBy: data.registeredBy
                });

                results.push({ index: i, success: true, registration: result });
            } catch (error: any) {
                results.push({ index: i, success: false, error: error.message });
            }
        }

        return {
            total: data.registrations.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    /**
     * Get event registration options (ticket types, instances, etc.)
     */
    async getEventRegistrationOptions(churchId: string, eventId: string) {
        const event = await this.eventRepository.findById(eventId, churchId);
        if (!event) {
            throw new AppError('Event not found', 404);
        }

        const [instances, ticketTypes] = await Promise.all([
            this.eventRepository.findInstances(eventId, churchId, { upcoming: true, limit: 10 }),
            this.eventRepository.getTicketTypes(eventId)
        ]);

        return {
            event: {
                id: event.id,
                name: event.name,
                startDate: event.startDate,
                endDate: event.endDate,
                locationType: event.locationType,
                locationName: event.locationName,
                allowGuestCheckin: event.allowGuestCheckin,
                isRegistrationRequired: event.isRegistrationRequired,
                maxRegistrations: event.maxRegistrations,
                currentRegistrations: event.currentRegistrations,
                isPaid: event.isPaid,
                price: event.price,
                currency: event.currency
            },
            instances: instances.map(i => ({
                id: i.id,
                date: i.instanceDate,
                startTime: i.startTime,
                endTime: i.endTime,
                status: i.status,
                currentAttendance: i.totalAttendance
            })),
            ticketTypes: ticketTypes.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                price: t.price,
                currency: t.currency,
                available: t.quantityAvailable ? t.quantityAvailable - t.quantitySold : null
            }))
        };
    }

    /**
     * Resend profile completion notification
     */
    async resendProfileNotification(
        churchId: string,
        registrationId: string,
        channels: NotificationChannel[]
    ): Promise<{ sent: NotificationChannel[]; failed: NotificationChannel[] }> {
        const registration = await this.eventRepository.findRegistrationById(registrationId);
        if (!registration || registration.churchId !== churchId) {
            throw new AppError('Registration not found', 404);
        }

        const event = await this.eventRepository.findById(registration.eventId, churchId);
        const churchInfo = await this.getChurchInfo(churchId);

        const sent: NotificationChannel[] = [];
        const failed: NotificationChannel[] = [];

        const notificationData = {
            recipientName: registration.memberName || registration.guestName || 'Guest',
            recipientEmail: registration.guestEmail,
            recipientPhone: registration.guestPhone,
            churchName: churchInfo.name,
            eventName: event?.name || 'Event',
            eventDate: event?.startDate,
            registrantType: registration.memberId ? 'existing_member' : 'guest',
            completionLink: this.generateProfileCompletionLink(
                churchId,
                registration.memberId ? 'member' : 'guest',
                registration.memberId || registrationId
            )
        };

        for (const channel of channels) {
            try {
                await this.sendRegistrationNotification(channel, notificationData as any);
                sent.push(channel);
            } catch (error) {
                failed.push(channel);
            }
        }

        return { sent, failed };
    }

    /**
     * Get registration statistics for an event
     */
    async getEventRegistrationStats(churchId: string, eventId: string) {
        const query = `
            SELECT 
                COUNT(*) as total_registrations,
                COUNT(DISTINCT er.member_id) FILTER (WHERE er.member_id IS NOT NULL) as member_registrations,
                COUNT(*) FILTER (WHERE er.member_id IS NULL AND er.guest_name IS NOT NULL) as guest_registrations,
                COUNT(*) FILTER (WHERE er.checked_in = true) as checked_in,
                COUNT(*) FILTER (WHERE er.status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE er.status = 'pending') as pending,
                COUNT(*) FILTER (WHERE er.status = 'confirmed') as confirmed
            FROM event_registrations er
            WHERE er.event_id = $1 AND 
                  EXISTS (SELECT 1 FROM events e WHERE e.id = er.event_id AND e.church_id = $2)
        `;

        const result = await pool.query(query, [eventId, churchId]);
        const stats = result.rows[0];

        // Get registration by date
        const byDateQuery = `
            SELECT 
                DATE(er.registered_at) as date,
                COUNT(*) as count
            FROM event_registrations er
            WHERE er.event_id = $1
            GROUP BY DATE(er.registered_at)
            ORDER BY date DESC
            LIMIT 30
        `;

        const byDateResult = await pool.query(byDateQuery, [eventId]);

        return {
            total: parseInt(stats.total_registrations) || 0,
            members: parseInt(stats.member_registrations) || 0,
            guests: parseInt(stats.guest_registrations) || 0,
            checkedIn: parseInt(stats.checked_in) || 0,
            cancelled: parseInt(stats.cancelled) || 0,
            pending: parseInt(stats.pending) || 0,
            confirmed: parseInt(stats.confirmed) || 0,
            byDate: byDateResult.rows.map(r => ({
                date: r.date,
                count: parseInt(r.count)
            }))
        };
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================

    private async createMinimalMember(churchId: string, data: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        createdBy?: string;
    }) {
        const id = uuidv4();
        const query = `
            INSERT INTO members (
                id, church_id, first_name, last_name, email, phone,
                registration_type, status, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'manual', 'active', $7, NOW(), NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            id,
            churchId,
            data.firstName,
            data.lastName,
            data.email || null,
            data.phone || null,
            data.createdBy || null
        ]);

        return result.rows[0];
    }

    private async createMinimalFirstTimer(churchId: string, data: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        createdBy?: string;
    }) {
        const id = uuidv4();
        const query = `
            INSERT INTO first_timers (
                id, church_id, first_name, last_name, email, phone,
                first_visit_date, status, follow_up_status, wants_follow_up,
                visit_count, contact_attempts, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'new', 'pending', true, 1, 0, $7, NOW(), NOW())
            RETURNING *
        `;

        const result = await pool.query(query, [
            id,
            churchId,
            data.firstName,
            data.lastName,
            data.email || null,
            data.phone || null,
            data.createdBy || null
        ]);

        return result.rows[0];
    }

    private async checkExistingRegistration(
        eventId: string,
        memberId?: string,
        email?: string,
        phone?: string
    ): Promise<boolean> {
        let query = `
            SELECT id FROM event_registrations 
            WHERE event_id = $1 AND status != 'cancelled'
        `;
        const params: any[] = [eventId];

        if (memberId) {
            params.push(memberId);
            query += ` AND member_id = $${params.length}`;
        } else if (email) {
            params.push(email);
            query += ` AND guest_email = $${params.length}`;
        } else if (phone) {
            params.push(phone);
            query += ` AND guest_phone = $${params.length}`;
        } else {
            return false;
        }

        const result = await pool.query(query, params);
        return result.rows.length > 0;
    }

    private async getChurchInfo(churchId: string): Promise<{ name: string; email?: string; phone?: string }> {
        const query = `SELECT name, email, phone FROM churches WHERE id = $1`;
        const result = await pool.query(query, [churchId]);
        return result.rows[0] || { name: 'Church' };
    }

    private generateProfileCompletionLink(churchId: string, type: string, id: string): string {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const token = Buffer.from(`${churchId}:${type}:${id}`).toString('base64');
        return `${baseUrl}/complete-profile/${token}`;
    }

    private async sendRegistrationNotification(
        channel: NotificationChannel,
        data: {
            recipientName: string;
            recipientEmail?: string;
            recipientPhone?: string;
            churchName: string;
            eventName: string;
            eventDate: any;
            registrantType: string;
            recordId?: string;
            completionLink: string;
        }
    ): Promise<void> {
        const message = this.generateNotificationMessage(channel, data);

        switch (channel) {
            case 'email':
                if (!data.recipientEmail) {
                    throw new AppError('Email address is required for email notification', 400);
                }
                await this.notificationService.sendEmail({
                    to: data.recipientEmail,
                    subject: `Welcome to ${data.churchName} - Complete Your Profile`,
                    html: message.html,
                    text: message.text
                });
                break;

            case 'sms':
                if (!data.recipientPhone) {
                    throw new AppError('Phone number is required for SMS notification', 400);
                }
                await this.notificationService.sendSMS({
                    to: data.recipientPhone,
                    message: message.text
                });
                break;

            case 'whatsapp':
                if (!data.recipientPhone) {
                    throw new AppError('Phone number is required for WhatsApp notification', 400);
                }
                await this.notificationService.sendWhatsApp({
                    to: data.recipientPhone,
                    message: message.text
                });
                break;
        }
    }

    private generateNotificationMessage(
        channel: NotificationChannel,
        data: {
            recipientName: string;
            churchName: string;
            eventName: string;
            eventDate: any;
            registrantType: string;
            completionLink: string;
        }
    ): { text: string; html?: string } {
        const isFirstTimer = data.registrantType === 'first_timer';
        const isNewMember = data.registrantType === 'new_member';

        const greeting = isFirstTimer
            ? `Welcome to ${data.churchName}! We're so glad you visited us.`
            : `Welcome to the ${data.churchName} family!`;

        const profileFields = isFirstTimer
            ? 'date of birth, address, how you heard about us, and prayer requests'
            : 'date of birth, marital status, wedding anniversary, address, and other details';

        // Plain text version
        const text = `
Hi ${data.recipientName}! 👋

${greeting}

You've been registered for: ${data.eventName}
Date: ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}

To help us serve you better, please complete your profile by providing additional information such as ${profileFields}.

Complete your profile here: ${data.completionLink}

If you have any questions, please don't hesitate to reach out to us.

God bless!
${data.churchName}
`.trim();

        // HTML version (for email)
        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .button:hover { background: #5a6fd6; }
        .event-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .fields-list { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .fields-list li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👋 Welcome!</h1>
            <p>${data.churchName}</p>
        </div>
        <div class="content">
            <p>Hi <strong>${data.recipientName}</strong>!</p>
            
            <p>${greeting}</p>
            
            <div class="event-box">
                <h3>📅 Event Registration Confirmed</h3>
                <p><strong>Event:</strong> ${data.eventName}</p>
                <p><strong>Date:</strong> ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed'}</p>
            </div>
            
            <p>To help us serve you better and stay connected, please take a moment to complete your profile:</p>
            
            <div class="fields-list">
                <p><strong>Information we'd love to have:</strong></p>
                <ul>
                    <li>📅 Date of Birth (for birthday wishes!)</li>
                    ${!isFirstTimer ? '<li>💒 Marital Status</li>' : ''}
                    ${!isFirstTimer ? '<li>💍 Wedding Anniversary</li>' : ''}
                    <li>🏠 Home Address</li>
                    <li>📍 City & Country</li>
                    ${isFirstTimer ? '<li>🔔 How did you hear about us?</li>' : ''}
                    ${isFirstTimer ? '<li>🙏 Prayer Requests</li>' : ''}
                </ul>
            </div>
            
            <center>
                <a href="${data.completionLink}" class="button">Complete My Profile</a>
            </center>
            
            <p>You can also download our template and fill it out:</p>
            <ul>
                <li><a href="${process.env.FRONTEND_URL}/templates/profile-completion.xlsx">Excel Template</a></li>
                <li><a href="${process.env.FRONTEND_URL}/templates/profile-completion.csv">CSV Template</a></li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to reach out to us.</p>
            
            <p>God bless! 🙏</p>
        </div>
        <div class="footer">
            <p>${data.churchName}</p>
            <p>This email was sent because you were registered for an event.</p>
        </div>
    </div>
</body>
</html>
`.trim();

        return { text, html };
    }
}