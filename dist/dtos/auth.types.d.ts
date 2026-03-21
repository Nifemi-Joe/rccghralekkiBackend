/**
 * For registering a new user directly (when church already exists)
 */
export interface RegisterDTO {
    churchId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    country?: string;
    role?: 'admin' | 'pastor' | 'leader' | 'member' | 'volunteer';
}
/**
 * For registering a new church (Step 1 of church registration)
 */
export interface RegisterChurchDTO {
    churchName: string;
    email: string;
    password: string;
}
/**
 * For setting up the first admin after church registration (Step 3)
 */
export interface SetupAdminDTO {
    churchId: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    country?: string;
    membershipSize?: string;
}
/**
 * For creating additional admins/pastors by existing admin
 */
export interface CreateAdditionalAdminDTO {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    role: 'admin' | 'pastor';
}
export interface LoginDTO {
    email: string;
    password: string;
}
export interface LoginResponseDTO {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        churchId: string;
        profileCompleted: boolean;
        mustResetPassword: boolean;
    };
    accessToken: string;
    refreshToken: string;
}
export interface VerifyOTPDTO {
    email: string;
    otp: string;
}
export interface ResendOTPDTO {
    email: string;
}
export interface FirstLoginResetPasswordDTO {
    userId: string;
    oldPassword: string;
    newPassword: string;
}
export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}
export interface ForgotPasswordDTO {
    email: string;
}
export interface ResetPasswordDTO {
    token: string;
    newPassword: string;
}
export interface RefreshTokenDTO {
    refreshToken: string;
}
export interface TokenPayload {
    id: string;
    email: string;
    churchId: string;
    role: string;
    mustResetPassword?: boolean;
    iat?: number;
    exp?: number;
}
//# sourceMappingURL=auth.types.d.ts.map