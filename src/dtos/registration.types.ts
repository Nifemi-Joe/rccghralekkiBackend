// src/dtos/registration.types.ts

export type RegistrantType = 'existing_member' | 'new_member' | 'first_timer' | 'guest';
export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export interface ManualRegistrationDTO {
    eventId: string;
    eventInstanceId?: string;

    // Registrant identification
    registrantType: RegistrantType;

    // For existing members
    memberId?: string;

    // For new registrants
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;

    // Additional options
    sendNotification?: boolean;
    notificationChannels?: NotificationChannel[];
    notes?: string;

    // Who registered them
    registeredBy: string;
}

export interface MemberLookupResult {
    id: string;
    type: 'member' | 'first_timer';
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
    profileImageUrl?: string;
    status: string;
}

export interface ManualRegistrationResponse {
    success: boolean;
    registration: {
        id: string;
        confirmationCode: string;
        eventName: string;
        eventDate: string;
        registrantName: string;
        registrantType: RegistrantType;
    };
    newRecordCreated?: {
        type: 'member' | 'first_timer';
        id: string;
    };
    notificationsSent?: {
        channel: NotificationChannel;
        success: boolean;
        error?: string;
    }[];
}

export interface ProfileCompletionTemplate {
    recipientName: string;
    churchName: string;
    eventName: string;
    completionLink: string;
    fields: string[];
}

export interface BulkManualRegistrationDTO {
    eventId: string;
    eventInstanceId?: string;
    registrations: Array<{
        registrantType: RegistrantType;
        memberId?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
    }>;
    sendNotifications?: boolean;
    notificationChannels?: NotificationChannel[];
    registeredBy: string;
}

export interface RegistrationSearchFilters {
    churchId: string;
    search: string;
    includeMembers?: boolean;
    includeFirstTimers?: boolean;
    limit?: number;
}