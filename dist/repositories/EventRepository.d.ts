import { Event, EventInstance, EventInstanceWithDetails, EventRegistration, EventTicketType, CreateEventDTO, UpdateEventDTO, CreateEventInstanceDTO, UpdateEventInstanceDTO, CreateRegistrationDTO, EventFilters, EventStatistics, PaginatedEvents, CreateTicketTypeDTO } from '@/dtos/event.types';
export interface EventWithOfferings extends Event {
    offerings?: OfferingSummary;
    offeringDetails?: OfferingDetail[];
}
export interface OfferingSummary {
    totalAmount: number;
    offeringCount: number;
    tithes: number;
    offerings: number;
    donations: number;
    pledges: number;
}
export interface OfferingDetail {
    id: string;
    transactionType: string;
    amount: number;
    paymentMethod: string;
    transactionDate: string;
    accountName: string;
    donorName?: string;
    memberName?: string;
    description?: string;
}
export declare class EventRepository {
    create(churchId: string, data: CreateEventDTO, createdBy?: string): Promise<Event>;
    findById(id: string, churchId?: string, includeOfferings?: boolean): Promise<EventWithOfferings | null>;
    findByQRCode(qrCode: string): Promise<EventWithOfferings | null>;
    findAll(filters: EventFilters): Promise<PaginatedEvents>;
    private mapToEventWithFinancials;
    getEventOfferings(eventId: string, churchId: string): Promise<{
        summary: OfferingSummary;
        details: OfferingDetail[];
    }>;
    update(id: string, churchId: string, data: UpdateEventDTO): Promise<Event | null>;
    delete(id: string, churchId: string): Promise<void>;
    getStatistics(churchId: string): Promise<EventStatistics>;
    createInstance(churchId: string, data: CreateEventInstanceDTO): Promise<EventInstance>;
    findInstances(eventId: string, churchId: string, options?: {
        upcoming?: boolean;
        limit?: number;
    }): Promise<EventInstance[]>;
    findInstanceById(instanceId: string, churchId: string): Promise<EventInstanceWithDetails | null>;
    findInstanceByQRCode(qrCode: string): Promise<EventInstanceWithDetails | null>;
    updateInstance(instanceId: string, churchId: string, data: UpdateEventInstanceDTO): Promise<EventInstance | null>;
    updateInstanceAttendance(instanceId: string, churchId: string, data: {
        totalAttendance: number;
        memberAttendance: number;
        guestAttendance: number;
    }): Promise<void>;
    createRegistration(churchId: string, data: CreateRegistrationDTO): Promise<EventRegistration>;
    findRegistrations(eventId: string, options?: {
        status?: string;
        paymentStatus?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        registrations: EventRegistration[];
        total: number;
    }>;
    findRegistrationById(registrationId: string): Promise<EventRegistration | null>;
    findRegistrationByQRCode(qrCode: string): Promise<EventRegistration | null>;
    cancelRegistration(registrationId: string): Promise<void>;
    updateRegistrationPayment(registrationId: string, paymentData: {
        paymentStatus: string;
        paymentReference?: string;
        amountPaid?: number;
        transactionId?: string;
        paymentMethod?: string;
    }): Promise<EventRegistration | null>;
    checkIn(registrationId: string, checkedInBy?: string): Promise<EventRegistration | null>;
    createTicketType(eventId: string, data: CreateTicketTypeDTO): Promise<EventTicketType>;
    getTicketTypes(eventId: string): Promise<EventTicketType[]>;
    createShare(churchId: string, eventId: string, data: {
        shareType: string;
        sharedBy?: string;
        recipientCount: number;
        customMessage?: string;
    }): Promise<void>;
    getEventFinancials(eventId: string, churchId: string): Promise<{
        offerings: any[];
        expenses: any[];
        summary: {
            totalOfferings: number;
            totalTithes: number;
            totalDonations: number;
            totalPledges: number;
            totalExpenses: number;
            netAmount: number;
        };
    }>;
    private transformTransaction;
    private generateConfirmationCode;
    private mapToEvent;
    private mapToEventWithOfferings;
    private mapToEventInstance;
    private mapToEventInstanceWithDetails;
    private mapToEventRegistration;
    private mapToTicketType;
}
//# sourceMappingURL=EventRepository.d.ts.map