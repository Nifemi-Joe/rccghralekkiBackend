export interface Attendance {
    id: string;
    church_id: string;
    event_instance_id: string;
    member_id?: string;
    member_name?: string;
    member_email?: string;
    member_phone?: string;
    member_photo?: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    checkin_type: 'qr_scan' | 'manual' | 'self_checkin' | 'guest_signup';
    checkin_time: Date;
    checkout_time?: Date;
    checked_in_by?: string;
    notes?: string;
    is_first_time: boolean;
    created_at: Date;
}
export interface CheckinDTO {
    event_instance_id: string;
    member_id?: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    checkin_type: 'qr_scan' | 'manual' | 'self_checkin' | 'guest_signup';
    notes?: string;
}
export interface BulkCheckinDTO {
    event_instance_id: string;
    member_ids: string[];
    checkin_type?: 'manual';
}
export interface AttendanceFilters {
    event_instance_id?: string;
    event_id?: string;
    member_id?: string;
    start_date?: string;
    end_date?: string;
    checkin_type?: string;
    is_first_time?: boolean;
}
export interface AttendanceStats {
    total_attendance: number;
    unique_members: number;
    first_timers: number;
    guests: number;
    average_attendance: number;
    trend_percentage: number;
}
export interface MemberAttendanceHistory {
    member_id: string;
    member_name: string;
    total_attendance: number;
    last_attended: Date | null;
    attendance_rate: number;
    consecutive_absences: number;
    history?: Array<{
        id: string;
        event_name: string;
        event_type: string;
        date: Date;
        checkin_time: Date;
        checkout_time?: Date;
        checkin_type: string;
        is_first_time: boolean;
    }>;
}
export interface AttendanceTrend {
    period: string;
    attendance: number;
    members: number;
    guests: number;
    first_timers?: number;
}
export interface InactiveMember {
    member_id: string;
    member_name: string;
    email?: string;
    phone?: string;
    last_attended: Date | null;
    days_inactive: number;
    total_attendance: number;
}
//# sourceMappingURL=attendance.types.d.ts.map