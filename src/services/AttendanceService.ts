// src/services/AttendanceService.ts
import { AttendanceRepository } from '@repositories/AttendanceRepository';
import { EventRepository } from '@repositories/EventRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import {
    Attendance,
    CheckinDTO,
    BulkCheckinDTO,
    AttendanceFilters,
    AttendanceStats,
    MemberAttendanceHistory
} from '@/dtos/attendance.types';
import { EventInstanceWithDetails } from '@/dtos/event.types';
import logger from '@config/logger';

export class AttendanceService {
    private attendanceRepository: AttendanceRepository;
    private eventRepository: EventRepository;
    private memberRepository: MemberRepository;

    constructor() {
        this.attendanceRepository = new AttendanceRepository();
        this.eventRepository = new EventRepository();
        this.memberRepository = new MemberRepository();
    }

    // ============================================================================
    // CHECK-IN OPERATIONS
    // ============================================================================

    async checkinByQRCode(qrCode: string, data: Partial<CheckinDTO>) {
        try {
            // Find event instance by QR code
            const instance: EventInstanceWithDetails | null = await this.eventRepository.findInstanceByQRCode(qrCode);
            if (!instance) {
                throw new AppError('Invalid or expired QR code', 404);
            }

            // Check event instance status
            if (instance.status === 'cancelled') {
                throw new AppError('This event has been cancelled', 400);
            }

            if (instance.status === 'completed') {
                throw new AppError('This event has already ended', 400);
            }

            // Check if guest checkin or self-checkin is allowed
            const isGuest = !data.member_id;
            const isSelfCheckin = data.checkin_type === 'self_checkin';

            if (isGuest && !instance.allow_guest_checkin) {
                throw new AppError('Guest check-in is not allowed for this event', 403);
            }

            if (data.member_id && isSelfCheckin && !instance.allow_self_checkin) {
                throw new AppError('Self check-in is not allowed for this event', 403);
            }

            // Check for duplicate check-in
            if (data.member_id) {
                const existingCheckin = await this.attendanceRepository.findExistingCheckin(
                    instance.church_id,
                    instance.id,
                    data.member_id
                );
                if (existingCheckin) {
                    throw new AppError('Member has already checked in to this event', 400);
                }
            }

            // Determine if first-time visitor
            let isFirstTime = false;
            if (data.member_id) {
                isFirstTime = await this.attendanceRepository.isFirstTimeAttendee(
                    instance.church_id,
                    data.member_id
                );
            }

            const checkinData: CheckinDTO = {
                event_instance_id: instance.id,
                member_id: data.member_id,
                guest_name: data.guest_name,
                guest_email: data.guest_email,
                guest_phone: data.guest_phone,
                checkin_type: data.checkin_type || 'qr_scan',
                notes: data.notes
            };

            const attendance = await this.attendanceRepository.checkin(
                instance.church_id,
                checkinData,
                undefined,
                isFirstTime
            );

            // Update instance attendance count
            await this.updateInstanceAttendanceCount(instance.church_id, instance.id);

            logger.info(`QR Check-in recorded for event ${instance.event_name}`, {
                memberId: data.member_id,
                guestName: data.guest_name,
                isFirstTime
            });

            return {
                success: true,
                attendance,
                event: {
                    name: instance.event_name,
                    date: instance.instance_date,
                    location: instance.location_name
                },
                is_first_time: isFirstTime
            };
        } catch (error) {
            logger.error('Error in checkinByQRCode:', error);
            throw error;
        }
    }

    async checkinMember(churchId: string, data: CheckinDTO, checkedInBy: string) {
        try {
            // Verify event instance exists
            const instance = await this.eventRepository.findInstanceById(data.event_instance_id, churchId);
            if (!instance) {
                throw new AppError('Event instance not found', 404);
            }

            // Verify member exists if member_id provided
            if (data.member_id) {
                const member = await this.memberRepository.findById(data.member_id, churchId);
                if (!member) {
                    throw new AppError('Member not found', 404);
                }

                // Check for duplicate check-in
                const existingCheckin = await this.attendanceRepository.findExistingCheckin(
                    churchId,
                    data.event_instance_id,
                    data.member_id
                );
                if (existingCheckin) {
                    throw new AppError('Member has already checked in to this event', 400);
                }
            }

            // Determine if first-time visitor
            let isFirstTime = false;
            if (data.member_id) {
                isFirstTime = await this.attendanceRepository.isFirstTimeAttendee(churchId, data.member_id);
            }

            const attendance = await this.attendanceRepository.checkin(
                churchId,
                { ...data, checkin_type: 'manual' },
                checkedInBy,
                isFirstTime
            );

            // Update instance attendance count
            await this.updateInstanceAttendanceCount(churchId, data.event_instance_id);

            logger.info(`Manual check-in by ${checkedInBy}`, {
                memberId: data.member_id,
                guestName: data.guest_name,
                isFirstTime
            });

            return {
                attendance,
                is_first_time: isFirstTime
            };
        } catch (error) {
            logger.error('Error in checkinMember:', error);
            throw error;
        }
    }

    async bulkCheckin(churchId: string, data: BulkCheckinDTO, checkedInBy: string) {
        try {
            // Verify event instance exists
            const instance = await this.eventRepository.findInstanceById(data.event_instance_id, churchId);
            if (!instance) {
                throw new AppError('Event instance not found', 404);
            }

            const results = {
                successful: [] as string[],
                failed: [] as { memberId: string; reason: string }[],
                alreadyCheckedIn: [] as string[]
            };

            for (const memberId of data.member_ids) {
                try {
                    // Check if already checked in
                    const existingCheckin = await this.attendanceRepository.findExistingCheckin(
                        churchId,
                        data.event_instance_id,
                        memberId
                    );

                    if (existingCheckin) {
                        results.alreadyCheckedIn.push(memberId);
                        continue;
                    }

                    // Verify member exists
                    const member = await this.memberRepository.findById(memberId, churchId);
                    if (!member) {
                        results.failed.push({ memberId, reason: 'Member not found' });
                        continue;
                    }

                    // Determine if first-time visitor
                    const isFirstTime = await this.attendanceRepository.isFirstTimeAttendee(churchId, memberId);

                    await this.attendanceRepository.checkin(
                        churchId,
                        {
                            event_instance_id: data.event_instance_id,
                            member_id: memberId,
                            checkin_type: 'manual'
                        },
                        checkedInBy,
                        isFirstTime
                    );

                    results.successful.push(memberId);
                } catch (err: any) {
                    results.failed.push({ memberId, reason: err.message });
                }
            }

            // Update instance attendance count
            await this.updateInstanceAttendanceCount(churchId, data.event_instance_id);

            logger.info(`Bulk check-in completed by ${checkedInBy}`, {
                total: data.member_ids.length,
                successful: results.successful.length,
                failed: results.failed.length,
                alreadyCheckedIn: results.alreadyCheckedIn.length
            });

            return {
                total_requested: data.member_ids.length,
                successful: results.successful.length,
                failed: results.failed.length,
                already_checked_in: results.alreadyCheckedIn.length,
                details: results
            };
        } catch (error) {
            logger.error('Error in bulkCheckin:', error);
            throw error;
        }
    }

    async checkout(churchId: string, attendanceId: string) {
        const attendance = await this.attendanceRepository.checkout(churchId, attendanceId);
        if (!attendance) {
            throw new AppError('Attendance record not found', 404);
        }

        logger.info(`Check-out recorded for attendance ${attendanceId}`);
        return attendance;
    }

    // ============================================================================
    // ATTENDANCE QUERIES
    // ============================================================================

    async getEventAttendance(churchId: string, eventInstanceId: string, filters?: AttendanceFilters) {
        // Verify instance exists
        const instance = await this.eventRepository.findInstanceById(eventInstanceId, churchId);
        if (!instance) {
            throw new AppError('Event instance not found', 404);
        }

        const [attendance, stats] = await Promise.all([
            this.attendanceRepository.findByEventInstance(churchId, eventInstanceId, filters),
            this.attendanceRepository.getEventInstanceStats(churchId, eventInstanceId)
        ]);

        return {
            event: {
                id: instance.id,
                name: instance.event_name,
                date: instance.instance_date,
                status: instance.status
            },
            attendance,
            stats
        };
    }

    async getMemberAttendanceHistory(
        churchId: string,
        memberId: string,
        options?: { startDate?: string; endDate?: string; limit?: number }
    ): Promise<MemberAttendanceHistory> {
        // Verify member exists
        const member = await this.memberRepository.findById(memberId, churchId);
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        return this.attendanceRepository.getMemberAttendanceHistory(churchId, memberId, options);
    }

    async getInactiveMembers(churchId: string, days: number = 30) {
        return this.attendanceRepository.getInactiveMembers(churchId, days);
    }

    // ============================================================================
    // STATISTICS & ANALYTICS
    // ============================================================================

    async getStatistics(churchId: string, options?: {
        startDate?: string;
        endDate?: string;
        eventId?: string
    }): Promise<AttendanceStats> {
        return this.attendanceRepository.getStatistics(churchId, options);
    }

    async getAttendanceTrends(
        churchId: string,
        period: 'weekly' | 'monthly' = 'monthly',
        months: number = 6
    ) {
        return this.attendanceRepository.getAttendanceTrends(churchId, period, months);
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    async exportAttendance(
        churchId: string,
        instanceId: string,
        format: 'csv' | 'excel' | 'pdf'
    ): Promise<{ data: Buffer; contentType: string; filename: string }> {
        const { attendance, stats } = await this.getEventAttendance(churchId, instanceId);
        const instance = await this.eventRepository.findInstanceById(instanceId, churchId);

        const eventName = instance?.event_name || 'attendance';
        const date = instance?.instance_date?.toString() || new Date().toISOString().split('T')[0];

        switch (format) {
            case 'csv':
                return this.generateCSV(attendance, eventName, date);
            case 'excel':
                return this.generateExcel(attendance, eventName, date, stats);
            case 'pdf':
                return this.generatePDF(attendance, eventName, date, stats);
            default:
                throw new AppError('Invalid export format', 400);
        }
    }

    private generateCSV(
        attendance: Attendance[],
        eventName: string,
        date: string
    ): { data: Buffer; contentType: string; filename: string } {
        const headers = ['Name', 'Type', 'Check-in Time', 'Check-out Time', 'Method', 'First Time', 'Notes'];
        const rows = attendance.map(a => [
            a.member_name || a.guest_name || 'Unknown',
            a.member_id ? 'Member' : 'Guest',
            new Date(a.checkin_time).toLocaleString(),
            a.checkout_time ? new Date(a.checkout_time).toLocaleString() : '',
            a.checkin_type,
            a.is_first_time ? 'Yes' : 'No',
            a.notes || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        return {
            data: Buffer.from(csvContent),
            contentType: 'text/csv',
            filename: `${eventName.replace(/\s+/g, '_')}_${date}_attendance.csv`
        };
    }

    private generateExcel(
        attendance: Attendance[],
        eventName: string,
        date: string,
        stats: any
    ): { data: Buffer; contentType: string; filename: string } {
        // For now, return CSV as fallback
        return this.generateCSV(attendance, eventName, date);
    }

    private generatePDF(
        attendance: Attendance[],
        eventName: string,
        date: string,
        stats: any
    ): { data: Buffer; contentType: string; filename: string } {
        // For now, return CSV as fallback
        return this.generateCSV(attendance, eventName, date);
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private async updateInstanceAttendanceCount(churchId: string, instanceId: string): Promise<void> {
        const stats = await this.attendanceRepository.getEventInstanceStats(churchId, instanceId);
        await this.eventRepository.updateInstanceAttendance(instanceId, churchId, {
            totalAttendance: stats.total_attendance,
            memberAttendance: stats.unique_members,
            guestAttendance: stats.guests
        });
    }
}