import { Attendance, CheckinDTO, BulkCheckinDTO, AttendanceFilters, AttendanceStats, MemberAttendanceHistory } from '@/dtos/attendance.types';
export declare class AttendanceService {
    private attendanceRepository;
    private eventRepository;
    private memberRepository;
    constructor();
    checkinByQRCode(qrCode: string, data: Partial<CheckinDTO>): Promise<{
        success: boolean;
        attendance: Attendance;
        event: {
            name: string;
            date: Date;
            location: string | undefined;
        };
        is_first_time: boolean;
    }>;
    checkinMember(churchId: string, data: CheckinDTO, checkedInBy: string): Promise<{
        attendance: Attendance;
        is_first_time: boolean;
    }>;
    bulkCheckin(churchId: string, data: BulkCheckinDTO, checkedInBy: string): Promise<{
        total_requested: number;
        successful: number;
        failed: number;
        already_checked_in: number;
        details: {
            successful: string[];
            failed: {
                memberId: string;
                reason: string;
            }[];
            alreadyCheckedIn: string[];
        };
    }>;
    checkout(churchId: string, attendanceId: string): Promise<Attendance>;
    getEventAttendance(churchId: string, eventInstanceId: string, filters?: AttendanceFilters): Promise<{
        event: {
            id: string;
            name: string;
            date: Date;
            status: import("@/dtos/event.types").InstanceStatus;
        };
        attendance: Attendance[];
        stats: {
            total_attendance: number;
            unique_members: number;
            guests: number;
            first_timers: number;
            checkin_types: Record<string, number>;
        };
    }>;
    getMemberAttendanceHistory(churchId: string, memberId: string, options?: {
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<MemberAttendanceHistory>;
    getInactiveMembers(churchId: string, days?: number): Promise<{
        member_id: string;
        member_name: string;
        email: string;
        phone: string;
        last_attended: Date | null;
        days_inactive: number;
        total_attendance: number;
    }[]>;
    getStatistics(churchId: string, options?: {
        startDate?: string;
        endDate?: string;
        eventId?: string;
    }): Promise<AttendanceStats>;
    getAttendanceTrends(churchId: string, period?: 'weekly' | 'monthly', months?: number): Promise<{
        period: string;
        attendance: number;
        members: number;
        guests: number;
    }[]>;
    exportAttendance(churchId: string, instanceId: string, format: 'csv' | 'excel' | 'pdf'): Promise<{
        data: Buffer;
        contentType: string;
        filename: string;
    }>;
    private generateCSV;
    private generateExcel;
    private generatePDF;
    private updateInstanceAttendanceCount;
}
//# sourceMappingURL=AttendanceService.d.ts.map