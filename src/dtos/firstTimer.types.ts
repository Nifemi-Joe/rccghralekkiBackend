// src/dtos/firstTimer.types.ts

export interface FirstTimer {
    id: string;
    church_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    date_of_birth?: Date;
    address?: string;
    city?: string;
    state?: string;
    country?: string;

    // Visit Info
    first_visit_date: Date;
    how_did_you_hear?: string;
    invited_by?: string;

    // Interests & Follow-up
    interests?: string[];
    prayer_request?: string;
    wants_follow_up: boolean;

    // Follow-up Tracking
    follow_up_status: 'pending' | 'contacted' | 'scheduled' | 'completed' | 'no_response';
    follow_up_assigned_to?: string;
    follow_up_date?: Date;
    follow_up_notes?: string;
    last_contacted_at?: Date;
    contact_attempts: number;

    // Conversion
    status: 'new' | 'following_up' | 'regular_visitor' | 'converted' | 'inactive';
    conversion_eligible_date?: Date;
    converted_to_member_id?: string;
    converted_at?: Date;

    // Visit Tracking
    visit_count: number;
    last_visit_date?: Date;

    notes?: string;
    created_by?: string;
    updated_by?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface CreateFirstTimerDTO {
    churchId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: Date | string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    firstVisitDate?: Date | string;
    howDidYouHear?: string;
    invitedBy?: string;
    interests?: string[];
    prayerRequest?: string;
    wantsFollowUp?: boolean;
    notes?: string;
    createdBy?: string;
}

export interface UpdateFirstTimerDTO {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: Date | string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    howDidYouHear?: string;
    invitedBy?: string;
    interests?: string[];
    prayerRequest?: string;
    wantsFollowUp?: boolean;
    followUpStatus?: 'pending' | 'contacted' | 'scheduled' | 'completed' | 'no_response';
    followUpAssignedTo?: string;
    followUpDate?: Date | string;
    followUpNotes?: string;
    status?: 'new' | 'following_up' | 'regular_visitor' | 'converted' | 'inactive';
    notes?: string;
    updatedBy?: string;
}

export interface FirstTimerFilters {
    churchId: string;
    search?: string;
    status?: string;
    followUpStatus?: string;
    wantsFollowUp?: boolean;
    startDate?: string;
    endDate?: string;
    conversionEligible?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FirstTimerStatistics {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    pendingFollowUp: number;
    conversionEligible: number;
    converted: number;
    conversionRate: number;
    byStatus: {
        new: number;
        following_up: number;
        regular_visitor: number;
        converted: number;
        inactive: number;
    };
    bySource: Array<{ source: string; count: number }>;
    weeklyTrend: Array<{ week: string; count: number }>;
}

export interface ConvertToMemberDTO {
    firstTimerId: string;
    additionalData?: {
        maritalStatus?: string;
        weddingAnniversary?: Date | string;
        postalCode?: string;
        notes?: string;
    };
}

export interface PaginatedFirstTimers {
    firstTimers: FirstTimer[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}