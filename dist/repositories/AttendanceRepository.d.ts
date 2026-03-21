import { Attendance, CheckinDTO, AttendanceFilters, AttendanceStats, MemberAttendanceHistory } from '@/dtos/attendance.types';
export declare class AttendanceRepository {
    checkin(churchId: string, data: CheckinDTO, checkedInBy?: string, isFirstTime?: boolean): Promise<Attendance>;
    checkout(churchId: string, attendanceId: string): Promise<Attendance | null>;
    bulkCheckin(churchId: string, eventInstanceId: string, memberIds: string[], checkedInBy: string): Promise<Attendance[]>;
    findExistingCheckin(churchId: string, eventInstanceId: string, memberId: string): Promise<Attendance | null>;
    findByEventInstance(churchId: string, eventInstanceId: string, filters?: AttendanceFilters): Promise<Attendance[]>;
    isFirstTimeAttendee(churchId: string, memberId: string): Promise<boolean>;
    getEventInstanceStats(churchId: string, eventInstanceId: string): Promise<{
        total_attendance: number;
        unique_members: number;
        guests: number;
        first_timers: number;
        checkin_types: Record<string, number>;
    }>;
    getStatistics(churchId: string, options?: {
        startDate?: string;
        endDate?: string;
        eventId?: string;
    }): Promise<AttendanceStats>;
    getAttendanceTrends(churchId: string, period: 'weekly' | 'monthly', months: number): Promise<Array<{
        period: string;
        attendance: number;
        members: number;
        guests: number;
    }>>;
    getMemberAttendanceHistory(churchId: string, memberId: string, options?: {
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<MemberAttendanceHistory>;
    getInactiveMembers(churchId: string, days: number): Promise<Array<{
        member_id: string;
        member_name: string;
        email: string;
        phone: string;
        last_attended: Date | null;
        days_inactive: number;
        total_attendance: number;
    }>>;
    private mapToAttendance;
}
//# sourceMappingURL=AttendanceRepository.d.ts.map