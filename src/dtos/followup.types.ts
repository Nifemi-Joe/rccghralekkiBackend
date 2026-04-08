// src/dtos/followup.types.ts

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type FollowUpChannel = 'sms' | 'whatsapp' | 'email' | 'phone_call' | 'in_person' | 'other';
export type FollowUpStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentStatus = 'active' | 'completed' | 'cancelled';
export type FollowUpMemberRole = 'leader' | 'coordinator' | 'member';
export type FollowUpMemberStatus = 'active' | 'inactive';
export type ActivityType = 'message_sent' | 'call_made' | 'visit_made' | 'response_received' | 'note_added' | 'status_changed';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// ============================================================================
// DEPARTMENT
// ============================================================================

export interface FollowUpDepartmentSettings {
    autoAssign: boolean;
    maxAssignmentsPerMember: number;
    followUpDeadlineDays: number;
    reminderIntervals: number[];
    defaultMessageTemplates: {
        sms?: string;
        whatsapp?: string;
        email?: string;
    };
    notificationPreferences: {
        notifyOnNewAssignment: boolean;
        notifyOnDeadline: boolean;
        notifyOnResponse: boolean;
    };
}

export interface FollowUpDepartment {
    id: string;
    churchId: string;
    name: string;
    description?: string;
    isActive: boolean;
    settings: FollowUpDepartmentSettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateDepartmentSettingsDTO {
    autoAssign?: boolean;
    maxAssignmentsPerMember?: number;
    followUpDeadlineDays?: number;
    reminderIntervals?: number[];
    notificationPreferences?: {
        notifyOnNewAssignment?: boolean;
        notifyOnDeadline?: boolean;
        notifyOnResponse?: boolean;
    };
}

// ============================================================================
// DEPARTMENT MEMBERS
// ============================================================================

export interface FollowUpMember {
    id: string;
    departmentId: string;
    memberId: string;
    churchId: string;
    role: FollowUpMemberRole;
    status: FollowUpMemberStatus;
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    // Populated fields
    member?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        profileImageUrl?: string;
    };
    // Statistics
    activeAssignmentsCount?: number;
    totalAssignmentsCount?: number;
    completedAssignmentsCount?: number;
    successRate?: number;
}

export interface CreateFollowUpMemberDTO {
    memberId: string;
    role?: FollowUpMemberRole;
}

export interface UpdateFollowUpMemberDTO {
    role?: FollowUpMemberRole;
    status?: FollowUpMemberStatus;
}

// ============================================================================
// ASSIGNMENTS
// ============================================================================

export interface AssignedMember {
    id: string;
    assignmentId: string;
    followUpMemberId: string;
    isPrimary: boolean;
    status: 'active' | 'completed' | 'removed';
    assignedAt: Date;
    completedAt?: Date;
    // Populated
    member?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        profileImageUrl?: string;
    };
}

export interface FollowUpAssignment {
    id: string;
    churchId: string;
    firstTimerId: string;
    priority: FollowUpPriority;
    status: AssignmentStatus;
    dueDate?: Date;
    notes?: string;
    tags?: string[];
    createdBy: string;
    completedAt?: Date;
    completionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
    // Populated
    firstTimer?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        firstVisitDate: string;
        status: string;
        followUpStatus: string;
        howDidYouHear?: string;
        address?: string;
        notes?: string;
    };
    assignedMembers?: AssignedMember[];
}

export interface CreateAssignmentDTO {
    firstTimerId: string;
    assignedMemberIds: string[];
    primaryMemberId?: string;
    priority?: FollowUpPriority;
    dueDate?: string;
    notes?: string;
    tags?: string[];
}

export interface BulkCreateAssignmentsDTO {
    firstTimerIds: string[];
    assignedMemberIds: string[];
    autoDistribute?: boolean;
    priority?: FollowUpPriority;
    dueDate?: string;
}

export interface UpdateAssignmentDTO {
    priority?: FollowUpPriority;
    status?: AssignmentStatus;
    dueDate?: string;
    notes?: string;
    tags?: string[];
}

export interface CompleteAssignmentDTO {
    notes?: string;
}

export interface ReassignMemberDTO {
    removeMemberId?: string;
    addMemberId?: string;
    makePrimary?: boolean;
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export interface FollowUpActivity {
    id: string;
    assignmentId: string;
    firstTimerId: string;
    churchId: string;
    performedBy: string;
    channel: FollowUpChannel;
    activityType: ActivityType;
    status: FollowUpStatus;
    subject?: string;
    content?: string;
    response?: string;
    responseAt?: Date;
    durationMinutes?: number;
    metadata?: Record<string, any>;
    scheduledAt?: Date;
    externalMessageId?: string;
    deliveryStatus?: DeliveryStatus;
    createdAt: Date;
    updatedAt: Date;
    // Populated
    performer?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface SendMessageDTO {
    assignmentId: string;
    firstTimerId: string;
    channel: FollowUpChannel;
    subject?: string;
    content: string;
    scheduledAt?: string;
    templateId?: string;
}

export interface RecordActivityDTO {
    assignmentId: string;
    firstTimerId: string;
    channel: FollowUpChannel;
    activityType: ActivityType;
    status: FollowUpStatus;
    subject?: string;
    content?: string;
    durationMinutes?: number;
    metadata?: Record<string, any>;
}

export interface RecordResponseDTO {
    response: string;
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

export interface MessageTemplate {
    id: string;
    churchId: string;
    name: string;
    channel: FollowUpChannel;
    subject?: string;
    content: string;
    variables: string[];
    isDefault: boolean;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTemplateDTO {
    name: string;
    channel: FollowUpChannel;
    subject?: string;
    content: string;
    variables?: string[];
    isDefault?: boolean;
}

export interface UpdateTemplateDTO {
    name?: string;
    subject?: string;
    content?: string;
    variables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
}

// ============================================================================
// FILTERS & PAGINATION
// ============================================================================

export interface FollowUpFilters {
    churchId?: string;
    search?: string;
    status?: AssignmentStatus;
    priority?: FollowUpPriority;
    assignedMemberId?: string;
    dateFrom?: string;
    dateTo?: string;
    overdue?: boolean;
    page?: number;
    limit?: number;
}

export interface ActivityFilters {
    assignmentId?: string;
    channel?: FollowUpChannel;
    activityType?: ActivityType;
    page?: number;
    limit?: number;
}

export interface PaginatedAssignments {
    assignments: FollowUpAssignment[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface PaginatedActivities {
    activities: FollowUpActivity[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface FollowUpStatistics {
    totalAssignments: number;
    activeAssignments: number;
    completedAssignments: number;
    overdueAssignments: number;
    averageCompletionDays: number;
    totalActivities: number;
    activitiesByChannel: Record<FollowUpChannel, number>;
    successRate: number;
    memberPerformance: MemberPerformance[];
    weeklyTrend: WeeklyTrendItem[];
}

export interface MemberPerformance {
    memberId: string;
    memberName: string;
    activeCount: number;
    completedCount: number;
    successRate: number;
}

export interface WeeklyTrendItem {
    week: string;
    newAssignments: number;
    completed: number;
}

// ============================================================================
// COMMUNICATION RESULTS
// ============================================================================

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    externalId?: string;
    channel: FollowUpChannel;
    deliveryStatus: DeliveryStatus;
    error?: string;
    activity?: FollowUpActivity;
}

export interface BulkAssignmentResult {
    created: number;
    failed: number;
    assignments: FollowUpAssignment[];
    errors?: Array<{ firstTimerId: string; error: string }>;
}

// ============================================================================
// DATABASE ROW TYPES (for mapping)
// ============================================================================

export interface FollowUpDepartmentRow {
    id: string;
    church_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    settings: any;
    created_at: Date;
    updated_at: Date;
}

export interface FollowUpMemberRow {
    id: string;
    department_id: string;
    member_id: string;
    church_id: string;
    role: string;
    status: string;
    joined_at: Date;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    profile_image_url?: string;
    active_count?: string;
    total_count?: string;
    completed_count?: string;
}

export interface FollowUpAssignmentRow {
    id: string;
    church_id: string;
    first_timer_id: string;
    priority: string;
    status: string;
    due_date?: Date;
    notes?: string;
    tags?: string[];
    created_by: string;
    completed_at?: Date;
    completion_notes?: string;
    created_at: Date;
    updated_at: Date;
    // Joined first timer fields
    ft_first_name?: string;
    ft_last_name?: string;
    ft_email?: string;
    ft_phone?: string;
    ft_first_visit_date?: string;
    ft_status?: string;
    ft_follow_up_status?: string;
    ft_how_did_you_hear?: string;
    ft_address?: string;
    ft_notes?: string;
}

export interface AssignedMemberRow {
    id: string;
    assignment_id: string;
    follow_up_member_id: string;
    is_primary: boolean;
    status: string;
    assigned_at: Date;
    completed_at?: Date;
    // Joined fields
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    profile_image_url?: string;
}

export interface FollowUpActivityRow {
    id: string;
    assignment_id: string;
    first_timer_id: string;
    church_id: string;
    performed_by: string;
    channel: string;
    activity_type: string;
    status: string;
    subject?: string;
    content?: string;
    response?: string;
    response_at?: Date;
    duration_minutes?: number;
    metadata?: any;
    scheduled_at?: Date;
    external_message_id?: string;
    delivery_status?: string;
    created_at: Date;
    updated_at: Date;
    // Joined fields
    performer_first_name?: string;
    performer_last_name?: string;
}

export interface MessageTemplateRow {
    id: string;
    church_id: string;
    name: string;
    channel: string;
    subject?: string;
    content: string;
    variables: string[];
    is_default: boolean;
    is_active: boolean;
    created_by: string;
    created_at: Date;
    updated_at: Date;
}

export type FollowUpFiltersDTO = FollowUpFilters;
export type ActivityFiltersDTO = ActivityFilters;