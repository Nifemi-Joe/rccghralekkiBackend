// src/dtos/member.types.ts
export interface Member {
    id: string;
    church_id: string;
    user_id?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
    date_of_birth?: Date;
    wedding_anniversary?: Date;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    profile_image_url?: string;
    registration_type: 'manual' | 'qr_code' | 'import' | 'self_registration';
    status: 'active' | 'inactive' | 'suspended';
    notes?: string;

    // Profile update link fields - NEW
    profile_update_token?: string;
    profile_update_token_expires_at?: Date;
    profile_completed_at?: Date;

    // Family relationship fields
    family_id?: string;
    family_role?: 'father' | 'mother' | 'son' | 'daughter' | 'grandfather' | 'grandmother'
        | 'grandson' | 'granddaughter' | 'uncle' | 'aunt' | 'nephew' | 'niece' | 'cousin'
        | 'brother' | 'sister' | 'brother_in_law' | 'sister_in_law' | 'father_in_law'
        | 'mother_in_law' | 'stepfather' | 'stepmother' | 'stepson' | 'stepdaughter'
        | 'guardian' | 'ward' | 'other';
    family_role_other?: string;

    created_by?: string;
    updated_by?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface CreateMemberDTO {
    churchId: string;
    userId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
    dateOfBirth?: Date | string;
    weddingAnniversary?: Date | string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    profileImageUrl?: string;
    registrationType?: 'manual' | 'qr_code' | 'import' | 'self_registration';
    status?: 'active' | 'inactive' | 'suspended';
    notes?: string;
    familyId?: string;
    familyRole?: string;
    familyRoleOther?: string;
    createdBy?: string;
    sendProfileLink?: boolean; // NEW - Option to send profile update link
}

export interface UpdateMemberDTO {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    gender?: 'male' | 'female' | 'other';
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
    dateOfBirth?: Date | string;
    weddingAnniversary?: Date | string | null;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    profileImageUrl?: string;
    status?: 'active' | 'inactive' | 'suspended';
    notes?: string;
    familyId?: string | null;
    familyRole?: string | null;
    familyRoleOther?: string | null;
    updatedBy?: string;
}

export interface MemberFilters {
    churchId: string;
    search?: string;
    status?: string;
    gender?: string;
    maritalStatus?: string;
    familyId?: string;
    hasFamily?: boolean;
    hasUserAccount?: boolean;
    profileCompleted?: boolean; // NEW - Filter by profile completion
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface MemberStatistics {
    total: number;
    active: number;
    inactive: number;
    byGender: {
        male: number;
        female: number;
        other: number;
        unknown: number;
    };
    byMaritalStatus: {
        single: number;
        married: number;
        divorced: number;
        widowed: number;
        unknown: number;
    };
    newThisMonth: number;
    growthPercentage: number;
    upcomingBirthdays: number;
    upcomingAnniversaries: number;
    membersInFamilies: number;
    membersWithoutFamily: number;
    membersWithUserAccounts: number;
    profilesCompleted: number; // NEW
    profilesPending: number; // NEW
}

export interface PaginatedMembers {
    members: Member[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// NEW - Profile update link response
export interface ProfileUpdateLink {
    token: string;
    link: string;
    expiresAt: Date;
}

// NEW - Audit log entry
export interface AuditLog {
    id: string;
    church_id: string;
    entity_type: 'member' | 'event' | 'attendance' | 'user' | 'family';
    entity_id: string;
    action: 'create' | 'update' | 'delete' | 'profile_link_generated' | 'profile_updated' | 'profile_link_sent';
    action_type: 'member' | 'event' | 'attendance' | 'user' | 'family'; // Added this field
    actor_type: 'admin' | 'member' | 'system';
    actor_id?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    status?: 'success' | 'failure' | 'pending'; // Added this field
    created_at: Date;
}