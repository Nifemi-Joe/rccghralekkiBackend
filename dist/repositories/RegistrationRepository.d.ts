import { RegistrantSearchResult, EventOption, EventInstance, QuickCheckInRequest, EventAttendee, AttendanceStats, AttendeeSource } from '@/dtos/registration';
export declare class RegistrationRepository {
    searchRegistrants(churchId: string, query: string, limit?: number): Promise<RegistrantSearchResult[]>;
    getEventsForRegistration(churchId: string): Promise<EventOption[]>;
    getEventWithInstances(eventId: string, churchId: string): Promise<{
        event: EventOption;
        instances: EventInstance[];
    } | null>;
    createFirstTimer(churchId: string, data: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        gender?: string;
        howDidYouHear?: string;
    }): Promise<{
        id: string;
        firstName: string;
        lastName: string;
    }>;
    createRegistration(churchId: string, eventId: string, eventInstanceId: string | undefined, registrantId: string, registrantSource: AttendeeSource, options?: {
        notes?: string;
        ticketType?: string;
        quantity?: number;
        checkedIn?: boolean;
        registeredBy?: string;
    }): Promise<{
        id: string;
        confirmationCode: string;
        qrCode: string;
        registrantName: string;
    }>;
    checkIn(churchId: string, data: QuickCheckInRequest, checkedInBy?: string): Promise<{
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
    }>;
    removeCheckIn(registrationId: string, churchId: string): Promise<void>;
    getEventAttendees(eventId: string, churchId: string, instanceId?: string): Promise<EventAttendee[]>;
    getAttendanceStats(eventId: string, churchId: string, instanceId?: string): Promise<AttendanceStats>;
    getRecentCheckIns(eventId: string, churchId: string, limit?: number): Promise<{
        id: string;
        name: string;
        time: string;
        type: AttendeeSource;
        isNew: boolean;
    }[]>;
    private generateConfirmationCode;
}
//# sourceMappingURL=RegistrationRepository.d.ts.map