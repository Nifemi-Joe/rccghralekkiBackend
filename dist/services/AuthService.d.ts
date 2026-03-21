import { RegisterDTO } from '@/dtos/auth.types';
export declare class AuthService {
    private userRepository;
    private churchRepository;
    private resetOTPStore;
    private resetTokenStore;
    constructor();
    /**
     * Step 1: Send OTP for password reset
     */
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    /**
     * Step 2: Verify Reset OTP
     */
    verifyResetOTP(email: string, otp: string): Promise<{
        resetToken: string;
        email: string;
        message: string;
    }>;
    /**
     * Step 3: Reset Password with Token
     */
    resetPassword(resetToken: string, newPassword: string): Promise<{
        message: string;
    }>;
    register(data: RegisterDTO): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            church_id: string;
            email: string;
            first_name: string;
            last_name: string;
            phone_number: string | null;
            country: string | null;
            membership_size: string | null;
            role: import("@repositories/UserRepository").UserRole;
            status: import("@repositories/UserRepository").UserStatus;
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
    }>;
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            roleDisplay: string;
            permissions: string[];
            id: string;
            church_id: string;
            email: string;
            first_name: string;
            last_name: string;
            phone_number: string | null;
            country: string | null;
            membership_size: string | null;
            role: import("@repositories/UserRepository").UserRole;
            status: import("@repositories/UserRepository").UserStatus;
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
            slug: string;
            setupStatus: "active";
            adminSetupSkipped: boolean;
        };
        mustResetPassword: boolean;
        isTemporaryPassword: boolean;
        profileCompleted: boolean;
    }>;
    firstLoginResetPassword(userId: string, oldPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getCurrentUser(userId: string): Promise<{
        user: {
            roleDisplay: string;
            permissions: string[];
            id: string;
            church_id: string;
            email: string;
            first_name: string;
            last_name: string;
            phone_number: string | null;
            country: string | null;
            membership_size: string | null;
            role: import("@repositories/UserRepository").UserRole;
            status: import("@repositories/UserRepository").UserStatus;
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
            currency: string;
            slug: string;
            setupStatus: "active" | "pending_admin";
            adminSetupSkipped: boolean;
        } | null;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerificationEmail(email: string): Promise<{
        message: string;
    }>;
    private validatePasswordStrength;
    private cleanupExpiredData;
    private generateTokens;
    private getRoleDisplay;
    private getRolePermissions;
}
//# sourceMappingURL=AuthService.d.ts.map