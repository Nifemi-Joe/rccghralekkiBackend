export interface GroupType {
    id: string;
    church_id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface Group {
    id: string;
    church_id: string;
    name: string;
    description?: string;
    group_type_id?: string;
    group_type?: GroupType;
    leader_id?: string;
    leader?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
    };
    co_leader_id?: string;
    co_leader?: {
        id: string;
        first_name: string;
        last_name: string;
    };
    default_meeting_day?: string;
    default_meeting_time?: string;
    default_meeting_type: 'physical' | 'online' | 'hybrid';
    default_location_type: 'church' | 'custom';
    default_location_address?: string;
    default_location_city?: string;
    default_location_notes?: string;
    default_online_platform?: 'zoom' | 'google_meet' | 'microsoft_teams' | 'other';
    default_meeting_link?: string;
    default_meeting_id?: string;
    default_meeting_password?: string;
    cover_image_url?: string;
    is_active: boolean;
    is_public: boolean;
    max_members?: number;
    member_count: number;
    members?: Array<{
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
        profile_image_url?: string;
        role?: 'leader' | 'co_leader' | 'secretary' | 'treasurer' | 'member';
        status?: 'active' | 'inactive' | 'pending';
        joined_at?: Date;
    }>;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}
export interface GroupMember {
    id: string;
    group_id: string;
    member_id: string;
    member?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
        profile_image_url?: string;
    };
    role: 'leader' | 'co_leader' | 'secretary' | 'treasurer' | 'member';
    status: 'active' | 'inactive' | 'pending';
    joined_at: Date;
    invited_by?: string;
    notes?: string;
}
export interface GroupMeeting {
    id: string;
    group_id: string;
    church_id: string;
    group?: {
        id: string;
        name: string;
    };
    title: string;
    description?: string;
    meeting_date: Date;
    start_time: string;
    end_time?: string;
    timezone: string;
    meeting_type: 'physical' | 'online' | 'hybrid';
    location_type?: 'church' | 'custom';
    location_address?: string;
    location_city?: string;
    location_notes?: string;
    location_map_url?: string;
    online_platform?: 'zoom' | 'google_meet' | 'microsoft_teams' | 'other';
    meeting_link?: string;
    meeting_id?: string;
    meeting_passcode?: string;
    host_name?: string;
    dial_in_number?: string;
    additional_instructions?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    is_recurring: boolean;
    recurrence_pattern?: string;
    expected_attendees?: number;
    actual_attendees?: number;
    shared_via_email: boolean;
    shared_via_sms: boolean;
    shared_via_whatsapp: boolean;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreateGroupDTO {
    name: string;
    description?: string;
    groupTypeId?: string;
    leaderId?: string;
    coLeaderId?: string;
    defaultMeetingDay?: string;
    defaultMeetingTime?: string;
    defaultMeetingType?: 'physical' | 'online' | 'hybrid';
    defaultLocationType?: 'church' | 'custom';
    defaultLocationAddress?: string;
    defaultLocationCity?: string;
    defaultLocationNotes?: string;
    defaultOnlinePlatform?: 'zoom' | 'google_meet' | 'microsoft_teams' | 'other';
    defaultMeetingLink?: string;
    defaultMeetingId?: string;
    defaultMeetingPassword?: string;
    coverImageUrl?: string;
    isPublic?: boolean;
    maxMembers?: number;
}
export interface UpdateGroupDTO extends Partial<CreateGroupDTO> {
    isActive?: boolean;
}
export interface AddGroupMemberDTO {
    memberId: string;
    role?: 'leader' | 'co_leader' | 'secretary' | 'treasurer' | 'member';
    notes?: string;
}
export interface CreateMeetingDTO {
    groupId: string;
    title: string;
    description?: string;
    meetingDate: string;
    startTime: string;
    endTime?: string;
    timezone?: string;
    meetingType: 'physical' | 'online' | 'hybrid';
    locationType?: 'church' | 'custom';
    locationAddress?: string;
    locationCity?: string;
    locationNotes?: string;
    locationMapUrl?: string;
    onlinePlatform?: 'zoom' | 'google_meet' | 'microsoft_teams' | 'other';
    meetingLink?: string;
    meetingId?: string;
    meetingPasscode?: string;
    hostName?: string;
    dialInNumber?: string;
    additionalInstructions?: string;
    isRecurring?: boolean;
    recurrencePattern?: string;
}
export interface UpdateMeetingDTO extends Partial<CreateMeetingDTO> {
    status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    cancelledReason?: string;
}
export interface ShareMeetingDTO {
    meetingId: string;
    shareVia: 'email' | 'sms' | 'whatsapp';
    recipientIds?: string[];
    customMessage?: string;
    includeAllMembers?: boolean;
}
export interface GroupFilters {
    churchId: string;
    search?: string;
    typeId?: string;
    isActive?: boolean;
    leaderId?: string;
    page?: number;
    limit?: number;
}
export interface GroupStatistics {
    totalGroups: number;
    activeGroups: number;
    totalMembers: number;
    upcomingMeetings: number;
    meetingsThisWeek: number;
    byType: Array<{
        type: string;
        count: number;
    }>;
}
export interface PaginatedGroups {
    groups: Group[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
//# sourceMappingURL=group.types.d.ts.map