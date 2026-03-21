import { Event, EventInstance, EventInstanceWithDetails, EventRegistration, CreateEventDTO, UpdateEventDTO, CreateEventInstanceDTO, UpdateEventInstanceDTO, CreateRegistrationDTO, ShareEventDTO, EventFilters, EventStatistics, PaginatedEvents, CheckInDTO, CheckInResult } from '@/dtos/event.types';
export declare class EventService {
    private eventRepository;
    private memberRepository;
    constructor();
    createEvent(churchId: string, data: CreateEventDTO, createdBy?: string): Promise<Event>;
    getEventById(id: string, churchId: string): Promise<Event>;
    getEventByQRCode(qrCode: string): Promise<Event>;
    getAllEvents(filters: EventFilters): Promise<PaginatedEvents>;
    updateEvent(id: string, churchId: string, data: UpdateEventDTO): Promise<Event>;
    deleteEvent(id: string, churchId: string): Promise<void>;
    getEventQRCode(id: string, churchId: string): Promise<string>;
    getStatistics(churchId: string): Promise<EventStatistics>;
    createEventInstance(churchId: string, data: CreateEventInstanceDTO): Promise<EventInstance>;
    getEventInstances(eventId: string, churchId: string, options?: {
        upcoming?: boolean;
        limit?: number;
    }): Promise<EventInstance[]>;
    getEventInstanceById(instanceId: string, churchId: string): Promise<EventInstanceWithDetails>;
    getEventInstanceByQRCode(qrCode: string): Promise<EventInstanceWithDetails>;
    updateEventInstance(instanceId: string, churchId: string, data: UpdateEventInstanceDTO): Promise<EventInstance>;
    getInstanceQRCode(instanceId: string, churchId: string): Promise<string>;
    startEvent(eventId: string, churchId: string): Promise<EventInstance>;
    registerForEvent(churchId: string, data: CreateRegistrationDTO): Promise<EventRegistration>;
    getRegistrations(eventId: string, churchId: string, options?: {
        status?: string;
        paymentStatus?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        registrations: EventRegistration[];
        total: number;
    }>;
    getRegistrationById(registrationId: string): Promise<EventRegistration>;
    cancelRegistration(registrationId: string, churchId: string): Promise<void>;
    processPayment(registrationId: string, paymentData: {
        paymentStatus: string;
        paymentReference?: string;
        amountPaid?: number;
        transactionId?: string;
        paymentMethod?: string;
    }): Promise<EventRegistration>;
    checkIn(churchId: string, data: CheckInDTO, checkedInBy?: string): Promise<CheckInResult>;
    shareEvent(eventId: string, churchId: string, data: ShareEventDTO, sharedBy?: string): Promise<{
        success: boolean;
        message: string;
        shareMessage?: string;
        recipientCount: number;
    }>;
    private generateEventShareMessage;
    getTicketTypes(eventId: string, churchId: string): Promise<any[]>;
}
//# sourceMappingURL=EventService.d.ts.map