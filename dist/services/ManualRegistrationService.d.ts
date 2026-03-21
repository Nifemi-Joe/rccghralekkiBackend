import { ManualRegistrationDTO, MemberLookupResult, ManualRegistrationResponse, BulkManualRegistrationDTO, RegistrationSearchFilters, NotificationChannel } from '@/dtos/registration.types';
export declare class ManualRegistrationService {
    private eventRepository;
    private memberRepository;
    private firstTimerRepository;
    private notificationService;
    constructor();
    /**
     * Search for existing members and first-timers
     */
    searchRegistrants(filters: RegistrationSearchFilters): Promise<MemberLookupResult[]>;
    /**
     * Get all members for quick check-in
     */
    getAllMembers(churchId: string, options?: {
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
    }>>;
    /**
     * Get event attendees (pre-registered people)
     */
    getEventAttendees(churchId: string, eventId: string, options?: {
        instanceId?: string;
        search?: string;
    }): Promise<{
        registrationId: any;
        memberId: any;
        firstName: any;
        lastName: any;
        email: any;
        phone: any;
        avatar: any;
        isCheckedIn: any;
        checkInTime: any;
        registeredAt: any;
        type: string;
        status: any;
    }[]>;
    /**
     * Quick check-in - handles all scenarios
     */
    quickCheckIn(churchId: string, data: {
        eventId: string;
        eventInstanceId?: string;
        registrationId?: string;
        memberId?: string;
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
    }): Promise<{
        registrationId: string;
        registrantName: string;
        checkInTime: string;
        newRecord: any;
    }>;
    /**
     * Undo check-in
     */
    undoCheckIn(churchId: string, registrationId: string): Promise<void>;
    /**
     * Get recent check-ins
     */
    getRecentCheckIns(churchId: string, eventId: string, options?: {
        instanceId?: string;
        limit?: number;
    }): Promise<{
        id: any;
        name: any;
        time: any;
        type: any;
    }[]>;
    private generateConfirmationCode;
    /**
     * Get detailed info for a specific registrant
     */
    getRegistrantDetails(churchId: string, id: string, type: 'member' | 'first_timer'): Promise<MemberLookupResult | null>;
    /**
     * Register someone for an event
     */
    registerForEvent(churchId: string, data: ManualRegistrationDTO): Promise<ManualRegistrationResponse>;
    /**
     * Bulk register multiple people
     */
    bulkRegisterForEvent(churchId: string, data: BulkManualRegistrationDTO): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: Array<{
            index: number;
            success: boolean;
            registration?: ManualRegistrationResponse;
            error?: string;
        }>;
    }>;
    /**
     * Get event registration options (ticket types, instances, etc.)
     */
    getEventRegistrationOptions(churchId: string, eventId: string): Promise<{
        event: {
            id: string;
            name: string;
            startDate: Date;
            endDate: Date | undefined;
            locationType: import("../dtos/event.types").LocationType;
            locationName: string | undefined;
            allowGuestCheckin: boolean;
            isRegistrationRequired: boolean;
            maxRegistrations: number | undefined;
            currentRegistrations: number;
            isPaid: boolean;
            price: number | undefined;
            currency: string;
        };
        instances: {
            id: string;
            date: Date;
            startTime: string;
            endTime: string | undefined;
            status: import("../dtos/event.types").InstanceStatus;
            currentAttendance: number;
        }[];
        ticketTypes: {
            id: string;
            name: string;
            description: string | undefined;
            price: number;
            currency: string;
            available: number | null;
        }[];
    }>;
    /**
     * Resend profile completion notification
     */
    resendProfileNotification(churchId: string, registrationId: string, channels: NotificationChannel[]): Promise<{
        sent: NotificationChannel[];
        failed: NotificationChannel[];
    }>;
    /**
     * Get registration statistics for an event
     */
    getEventRegistrationStats(churchId: string, eventId: string): Promise<{
        total: number;
        members: number;
        guests: number;
        checkedIn: number;
        cancelled: number;
        pending: number;
        confirmed: number;
        byDate: {
            date: any;
            count: number;
        }[];
    }>;
    private createMinimalMember;
    private createMinimalFirstTimer;
    private checkExistingRegistration;
    private getChurchInfo;
    private generateProfileCompletionLink;
    private sendRegistrationNotification;
    private generateNotificationMessage;
}
//# sourceMappingURL=ManualRegistrationService.d.ts.map