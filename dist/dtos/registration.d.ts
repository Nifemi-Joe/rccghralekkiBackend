export type RegistrantType = 'existing_member' | 'existing_first_timer' | 'new_first_timer' | 'guest';
export type AttendeeSource = 'member' | 'first_timer';
export type NotificationChannel = 'email' | 'sms' | 'whatsapp';
export type RegistrationStatus = 'pending' | 'confirmed' | 'attended' | 'cancelled' | 'no_show';
export type PaymentStatus = 'free' | 'pending' | 'paid' | 'refunded' | 'failed';
export interface RegistrantSearchResult {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    avatar?: string;
    source: AttendeeSource;
    status?: string;
    memberSince?: string;
    firstVisitDate?: string;
    visitCount?: number;
}
export interface EventOption {
    id: string;
    name: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    locationName?: string;
    locationAddress?: string;
    maxRegistrations?: number;
    currentRegistrations: number;
    isActive: boolean;
    isPaid: boolean;
    price?: number;
    currency?: string;
}
export interface EventInstance {
    id: string;
    eventId: string;
    date: string;
    startTime?: string;
    endTime?: string;
    status: string;
    totalAttendance: number;
}
export interface ManualRegistrationForm {
    eventId: string;
    eventInstanceId?: string;
    registrantId?: string;
    registrantSource?: AttendeeSource;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    gender?: string;
    howDidYouHear?: string;
    sendNotification: boolean;
    notificationChannels: NotificationChannel[];
    notes?: string;
    ticketType?: string;
    quantity?: number;
}
export interface QuickCheckInRequest {
    eventId: string;
    eventInstanceId?: string;
    registrantId?: string;
    registrantSource?: AttendeeSource;
    newPerson?: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        gender?: string;
        howDidYouHear?: string;
    };
}
export interface QuickCheckInResponse {
    success: boolean;
    message: string;
    checkIn: {
        id: string;
        registrationId: string;
        attendeeName: string;
        attendeeType: AttendeeSource;
        checkInTime: string;
        confirmationCode: string;
    };
    newFirstTimer?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}
export interface RegistrationResponse {
    success: boolean;
    registration: {
        id: string;
        confirmationCode: string;
        qrCode: string;
        eventName: string;
        registrantName: string;
        registrantType: AttendeeSource;
        registeredAt: string;
    };
    newFirstTimer?: {
        id: string;
        firstName: string;
        lastName: string;
        profileCompletionUrl?: string;
    };
    notificationsSent?: {
        channel: NotificationChannel;
        success: boolean;
        error?: string;
    }[];
}
export interface EventAttendee {
    id: string;
    registrantId: string;
    registrantSource: AttendeeSource;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    avatar?: string;
    isCheckedIn: boolean;
    checkInTime?: string;
    registeredAt: string;
}
export interface AttendanceStats {
    totalRegistered: number;
    checkedIn: number;
    notCheckedIn: number;
    members: number;
    firstTimers: number;
    newFirstTimersToday: number;
}
//# sourceMappingURL=registration.d.ts.map