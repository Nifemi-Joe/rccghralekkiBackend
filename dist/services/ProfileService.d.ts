import { UserStatus, UserRole } from '@repositories/UserRepository';
import { CreateStaffDTO, UpdateStaffDTO, UpdateProfileDTO, ChangePasswordDTO, StaffMember } from '@/dtos/staff.types';
import { Member } from '@/dtos/member.types';
export declare class ProfileService {
    private userRepository;
    private churchRepository;
    private memberRepository;
    constructor();
    getProfile(userId: string): Promise<{
        user: {
            permissions: string[];
            roleDisplay: string;
            id: string;
            church_id: string;
            email: string;
            first_name: string;
            last_name: string;
            phone_number: string | null;
            country: string | null;
            membership_size: string | null;
            role: UserRole;
            status: UserStatus;
            profile_completed: boolean;
            is_temporary_password: boolean;
            must_reset_password: boolean;
            email_verified: boolean;
            email_verified_at: Date | null;
            last_login_at: Date | null;
            profile_image_url: string | null;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
        };
        church: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            address: string | null;
            city: string | null;
            state: string | null;
            country: string | null;
            logoUrl: string | null;
            timezone: string;
            currency: string;
        } | null;
    }>;
    updateProfile(userId: string, data: UpdateProfileDTO): Promise<{
        id: string;
        church_id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone_number: string | null;
        country: string | null;
        membership_size: string | null;
        role: UserRole;
        status: UserStatus;
        profile_completed: boolean;
        is_temporary_password: boolean;
        must_reset_password: boolean;
        email_verified: boolean;
        email_verified_at: Date | null;
        last_login_at: Date | null;
        profile_image_url: string | null;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
    }>;
    changePassword(userId: string, data: ChangePasswordDTO): Promise<{
        message: string;
    }>;
    updateProfileImage(userId: string, imageUrl: string): Promise<{
        profileImageUrl: string;
    }>;
    getStaffMembers(churchId: string, options?: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        status?: string;
    }): Promise<{
        staff: StaffMember[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getStaffMember(churchId: string, staffId: string): Promise<StaffMember>;
    createStaffMember(churchId: string, data: CreateStaffDTO, createdBy: string): Promise<{
        staff: StaffMember;
        member: Member | null;
        temporaryPassword: string | undefined;
        message: string;
    }>;
    getMemberProfile(userId: string): Promise<Member>;
    updateMemberProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        gender?: 'male' | 'female' | 'other';
        maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
        dateOfBirth?: string;
        weddingAnniversary?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
        occupation?: string;
        employer?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        emergencyContactRelationship?: string;
    }): Promise<Member>;
    updateStaffMember(churchId: string, staffId: string, data: UpdateStaffDTO, updatedBy: string): Promise<StaffMember>;
    deleteStaffMember(churchId: string, staffId: string, deletedBy: string): Promise<{
        message: string;
    }>;
    resendInvitation(churchId: string, staffId: string): Promise<{
        message: string;
    }>;
    getAvailablePermissions(): Promise<{
        permissions: import("@/dtos/staff.types").StaffPermission[];
        roleDefaults: Record<string, string[]>;
    }>;
    private generateTemporaryPassword;
    private validatePasswordStrength;
    private mapStaffRoleToUserRole;
    private getRoleDisplay;
    private getUserPermissions;
    private transformToStaffMember;
    private updateUserPermissions;
    private sendStaffInvitation;
}
//# sourceMappingURL=ProfileService.d.ts.map