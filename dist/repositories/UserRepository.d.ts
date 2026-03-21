export interface User {
    id: string;
    church_id: string;
    email: string;
    password_hash: string;
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
}
export type UserRole = 'super_admin' | 'admin' | 'pastor' | 'leader' | 'member' | 'volunteer' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type UserWithoutPassword = Omit<User, 'password_hash'>;
export interface CreateUserDTO {
    churchId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    country?: string;
    membershipSize?: string;
    role?: UserRole;
    status?: UserStatus;
    profileCompleted?: boolean;
    isTemporaryPassword?: boolean;
    mustResetPassword?: boolean;
    emailVerified?: boolean;
    profileImageUrl?: string;
}
export interface UpdateUserDTO {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    country?: string;
    membershipSize?: string;
    role?: UserRole;
    status?: UserStatus;
    profileCompleted?: boolean;
    isTemporaryPassword?: boolean;
    mustResetPassword?: boolean;
    emailVerified?: boolean;
    emailVerifiedAt?: Date;
    lastLoginAt?: Date;
    profileImageUrl?: string;
}
export interface UserQueryOptions {
    limit?: number;
    offset?: number;
    role?: UserRole | UserRole[];
    status?: UserStatus | UserStatus[];
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    emailVerified?: boolean;
    profileCompleted?: boolean;
}
export interface PaginatedUsers {
    users: UserWithoutPassword[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class UserRepository {
    /**
     * Create a new user
     */
    create(data: CreateUserDTO): Promise<User>;
    /**
     * Bulk create users
     */
    createMany(users: CreateUserDTO[]): Promise<User[]>;
    /**
     * Find user by ID (includes password_hash)
     */
    findById(id: string): Promise<User | null>;
    /**
     * Find user by ID (without password_hash)
     */
    findByIdSafe(id: string): Promise<UserWithoutPassword | null>;
    /**
     * Find user by email (includes password_hash for auth)
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * Find user by email (without password_hash)
     */
    findByEmailSafe(email: string): Promise<UserWithoutPassword | null>;
    /**
     * Find users by church ID with pagination and filters
     */
    findByChurchId(churchId: string, options?: UserQueryOptions): Promise<PaginatedUsers>;
    /**
     * Find all admins and pastors for a church (without password)
     */
    findAdminsByChurchId(churchId: string): Promise<UserWithoutPassword[]>;
    /**
     * Find users by role
     */
    findByRole(churchId: string, role: UserRole): Promise<UserWithoutPassword[]>;
    /**
     * Check if email exists
     */
    emailExists(email: string, excludeUserId?: string): Promise<boolean>;
    /**
     * Count users by church
     */
    countByChurchId(churchId: string, options?: {
        role?: UserRole;
        status?: UserStatus;
    }): Promise<number>;
    /**
     * Update user
     */
    update(id: string, data: UpdateUserDTO): Promise<User | null>;
    /**
     * Update user password
     */
    updatePassword(id: string, hashedPassword: string): Promise<boolean>;
    /**
     * Update last login timestamp
     */
    updateLastLogin(id: string): Promise<void>;
    /**
     * Verify user email
     */
    verifyEmail(id: string): Promise<boolean>;
    /**
     * Update user status
     */
    updateStatus(id: string, status: UserStatus): Promise<User | null>;
    /**
     * Update user role
     */
    updateRole(id: string, role: UserRole): Promise<User | null>;
    /**
     * Soft delete user
     */
    delete(id: string): Promise<boolean>;
    /**
     * Hard delete user (permanent)
     */
    hardDelete(id: string): Promise<boolean>;
    /**
     * Restore soft-deleted user
     */
    restore(id: string): Promise<User | null>;
    /**
     * Search users by name or email
     */
    search(churchId: string, searchTerm: string, limit?: number): Promise<UserWithoutPassword[]>;
    /**
     * Check if user belongs to church
     */
    belongsToChurch(userId: string, churchId: string): Promise<boolean>;
    /**
     * Check if user has specific role
     */
    hasRole(userId: string, roles: UserRole | UserRole[]): Promise<boolean>;
}
//# sourceMappingURL=UserRepository.d.ts.map