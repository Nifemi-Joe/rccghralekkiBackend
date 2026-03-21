export type StaffRole = 'admin' | 'pastor' | 'associate_pastor' | 'worship_leader' | 'youth_pastor' | 'children_minister' | 'finance_officer' | 'secretary' | 'head_usher' | 'head_choir' | 'media_director' | 'outreach_coordinator' | 'staff' | 'volunteer_leader';
export interface StaffPermission {
    id: string;
    name: string;
    description: string;
    category: 'members' | 'events' | 'finance' | 'reports' | 'settings' | 'communications' | 'groups';
}
export interface StaffMember {
    id: string;
    churchId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role: StaffRole;
    permissions: string[];
    status: 'active' | 'inactive' | 'pending';
    profileImageUrl?: string;
    isTemporaryPassword: boolean;
    mustResetPassword: boolean;
    lastLoginAt?: string;
    createdAt: string;
    createdBy?: string;
}
export interface CreateStaffDTO {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    role: StaffRole;
    permissions?: string[];
    sendInvite?: boolean;
    createAsMember?: boolean;
}
export interface UpdateStaffDTO {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: StaffRole;
    permissions?: string[];
    status?: 'active' | 'inactive';
}
export interface UpdateProfileDTO {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    country?: string;
    profileImageUrl?: string;
}
export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}
export interface UserProfile {
    id: string;
    churchId: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    country?: string;
    role: string;
    roleDisplay: string;
    permissions: string[];
    status: string;
    profileImageUrl?: string;
    profileCompleted: boolean;
    emailVerified: boolean;
    lastLoginAt?: string;
    createdAt: string;
}
export interface ChurchProfile {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    logoUrl?: string;
    timezone: string;
    currency: string;
}
export declare const STAFF_ROLES: {
    value: StaffRole;
    label: string;
    description: string;
}[];
export declare const AVAILABLE_PERMISSIONS: StaffPermission[];
export declare const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]>;
//# sourceMappingURL=staff.types.d.ts.map