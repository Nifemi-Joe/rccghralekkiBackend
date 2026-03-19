// src/dtos/event.types.ts

export type EventType = 'service' | 'meeting' | 'conference' | 'outreach' | 'fellowship' | 'workshop' | 'retreat' | 'concert' | 'other';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type LocationType = 'physical' | 'online' | 'hybrid';
export type OnlinePlatform = 'zoom' | 'google_meet' | 'microsoft_teams' | 'youtube' | 'facebook' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type InstanceStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'attended' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'free';

export interface Event {
    id: string;
    churchId: string;
    name: string;
    description?: string;
    eventType: EventType;
    recurrence: RecurrenceType;

    // Date and Time
    startDate: Date;
    endDate?: Date;
    startTime: string;
    endTime?: string;
    timezone: string;

    // Location (Physical)
    locationType: LocationType;
    locationName?: string;
    locationAddress?: string;
    locationCity?: string;
    locationMapUrl?: string;

    // Online Meeting
    onlinePlatform?: OnlinePlatform;
    meetingLink?: string;
    meetingId?: string;
    meetingPassword?: string;
    streamUrl?: string;

    // Capacity & Registration
    capacity?: number;
    isRegistrationRequired: boolean;
    registrationDeadline?: Date;
    maxRegistrations?: number;
    currentRegistrations: number;

    // Payment
    isPaid: boolean;
    price?: number;
    currency: string;
    earlyBirdPrice?: number;
    earlyBirdDeadline?: Date;

    // Visuals
    bannerUrl?: string;
    thumbnailUrl?: string;

    // Settings
    qrCode: string;
    isActive: boolean;
    isPublic: boolean;
    isFeatured: boolean;
    allowSelfCheckin: boolean;
    allowGuestCheckin: boolean;
    requireApproval: boolean;
    sendReminders: boolean;
    reminderHours: number;

    // Relations
    groupId?: string;
    groupName?: string;
    ministryId?: string;

    // Metadata
    tags?: string[];
    customFields?: Record<string, any>;

    // Stats
    totalAttendance?: number;
    totalRegistrations?: number;
    totalRevenue?: number;

    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventInstance {
    id: string;
    eventId: string;
    churchId: string;
    event?: Event;

    instanceDate: Date;
    startTime: string;
    endTime?: string;

    locationName?: string;
    meetingLink?: string;
    notes?: string;

    qrCode: string;
    status: InstanceStatus;

    expectedAttendance?: number;
    totalAttendance: number;
    memberAttendance: number;
    guestAttendance: number;

    cancelledAt?: Date;
    cancelledReason?: string;

    createdAt: Date;
    updatedAt: Date;
}

// Extended EventInstance with event details (used for QR code lookups)
export interface EventInstanceWithDetails extends EventInstance {
    event_name: string;
    church_id: string;
    location_name?: string;
    instance_date: Date;
    allow_self_checkin: boolean;
    allow_guest_checkin: boolean;
}

export interface EventRegistration {
    id: string;
    eventId: string;
    eventInstanceId?: string;
    churchId: string;

    memberId?: string;
    memberName?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;

    ticketType: string;
    quantity: number;

    paymentStatus: PaymentStatus;
    paymentMethod?: string;
    paymentReference?: string;
    amountPaid?: number;
    transactionId?: string;

    status: RegistrationStatus;
    confirmationCode: string;
    qrCode: string;

    checkedIn: boolean;
    checkedInAt?: Date;
    checkedInBy?: string;

    notes?: string;
    specialRequirements?: string;

    registeredAt: Date;
    confirmedAt?: Date;
    cancelledAt?: Date;
}

export interface EventTicketType {
    id: string;
    eventId: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    quantityAvailable?: number;
    quantitySold: number;
    maxPerOrder: number;
    saleStartDate?: Date;
    saleEndDate?: Date;
    isActive: boolean;
    sortOrder: number;
}

export interface EventShare {
    id: string;
    eventId: string;
    churchId: string;
    shareType: 'email' | 'sms' | 'whatsapp';
    sharedBy?: string;
    recipientCount: number;
    messageTemplate?: string;
    customMessage?: string;
    sharedAt: Date;
}

// DTOs
export interface CreateEventDTO {
    name: string;
    description?: string;
    eventType: EventType;
    recurrence?: RecurrenceType;

    startDate: string;
    endDate?: string;
    startTime: string;
    endTime?: string;
    timezone?: string;

    locationType?: LocationType;
    locationName?: string;
    locationAddress?: string;
    locationCity?: string;
    locationMapUrl?: string;

    onlinePlatform?: OnlinePlatform;
    meetingLink?: string;
    meetingId?: string;
    meetingPassword?: string;
    streamUrl?: string;

    capacity?: number;
    isRegistrationRequired?: boolean;
    registrationDeadline?: string;
    maxRegistrations?: number;

    isPaid?: boolean;
    price?: number;
    currency?: string;
    earlyBirdPrice?: number;
    earlyBirdDeadline?: string;

    bannerUrl?: string;
    thumbnailUrl?: string;

    isActive?: boolean;
    isPublic?: boolean;
    isFeatured?: boolean;
    allowSelfCheckin?: boolean;
    allowGuestCheckin?: boolean;
    requireApproval?: boolean;
    sendReminders?: boolean;
    reminderHours?: number;

    groupId?: string;
    ministryId?: string;
    tags?: string[];

    ticketTypes?: CreateTicketTypeDTO[];
}

export interface UpdateEventDTO extends Partial<CreateEventDTO> {}

export interface CreateEventInstanceDTO {
    eventId: string;
    instanceDate: string;
    startTime?: string;
    endTime?: string;
    locationName?: string;
    meetingLink?: string;
    notes?: string;
}

export interface UpdateEventInstanceDTO {
    startTime?: string;
    endTime?: string;
    locationName?: string;
    meetingLink?: string;
    notes?: string;
    status?: InstanceStatus;
    cancelledReason?: string;
}

export interface CreateRegistrationDTO {
    eventId: string;
    eventInstanceId?: string;
    memberId?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    ticketType?: string;
    quantity?: number;
    notes?: string;
    specialRequirements?: string;
}

export interface CreateTicketTypeDTO {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    quantityAvailable?: number;
    maxPerOrder?: number;
    saleStartDate?: string;
    saleEndDate?: string;
}

export interface ShareEventDTO {
    shareType: 'email' | 'sms' | 'whatsapp';
    recipientIds?: string[];
    recipientEmails?: string[];
    recipientPhones?: string[];
    includeAllMembers?: boolean;
    includeGroupMembers?: boolean;
    groupId?: string;
    customMessage?: string;
    includeRegistrationLink?: boolean;
}

export interface EventFilters {
    churchId: string;
    search?: string;
    eventType?: EventType;
    locationType?: LocationType;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    isPaid?: boolean;
    isFeatured?: boolean;
    groupId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface EventStatistics {
    totalEvents: number;
    activeEvents: number;
    upcomingEvents: number;
    paidEvents: number;
    onlineEvents: number;
    totalRegistrations: number;
    totalAttendance: number;
    totalRevenue: number;
    averageAttendance: number;
    topEvents: Array<{
        id: string;
        name: string;
        attendance: number;
    }>;
    byType: Array<{
        type: string;
        count: number;
    }>;
    registrationsByMonth: Array<{
        month: string;
        count: number;
    }>;
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

export interface EventWithOfferings extends Event {
    offerings?: OfferingSummary;
    offeringDetails?: OfferingDetail[];
}

export interface PaginatedEventsWithOfferings {
    events: EventWithOfferings[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Add to src/dtos/event.types.ts

// Event Financial Summary
export interface EventFinancialSummary {
    totalOfferings: number;
    totalTithes: number;
    totalDonations: number;
    totalPledges: number;
    totalExpenses: number;
    netAmount: number;
    offeringCount: number;
    expenseCount: number;
}

export interface EventFinancials {
    totalOfferings: number;
    totalExpenses: number;
    netAmount: number;
    breakdown: {
        tithes: number;
        offerings: number;
        donations: number;
        pledges: number;
    };
    offeringCount: number;
    expenseCount: number;
}

// Updated Event interface to include financials
export interface EventWithFinancials extends Event {
    financials?: EventFinancials;
}

// Updated PaginatedEvents to include financials
export interface PaginatedEventsWithFinancials {
    events: EventWithFinancials[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface PaginatedEvents {
    events: Event[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface CheckInDTO {
    qrCode?: string;
    registrationId?: string;
    eventInstanceId?: string;
    memberId?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
}

export interface CheckInResult {
    success: boolean;
    message: string;
    registration?: EventRegistration;
    attendee?: {
        name: string;
        type: 'member' | 'guest';
    };
}