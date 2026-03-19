import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '@repositories/UserRepository';
import { ChurchRepository } from '@repositories/ChurchRepository';
import { AppError } from '@utils/AppError';
import { RegisterDTO } from '@/dtos/auth.types';
import logger from '@config/logger';
import type { SignOptions } from 'jsonwebtoken';

// OTP Storage for password reset
interface ResetOTPData {
    otp: string;
    email: string;
    userId: string;
    expiresAt: Date;
    attempts: number;
}

// Reset Token Storage
interface ResetTokenData {
    email: string;
    userId: string;
    expiresAt: Date;
}

export class AuthService {
    private userRepository: UserRepository;
    private churchRepository: ChurchRepository;

    // In-memory stores (use Redis in production)
    private resetOTPStore: Map<string, ResetOTPData> = new Map();
    private resetTokenStore: Map<string, ResetTokenData> = new Map();

    constructor() {
        this.userRepository = new UserRepository();
        this.churchRepository = new ChurchRepository();

        // Cleanup expired OTPs periodically
        setInterval(() => this.cleanupExpiredData(), 5 * 60 * 1000); // Every 5 minutes
    }

    // ============================================================================
    // FORGOT PASSWORD FLOW
    // ============================================================================

    /**
     * Step 1: Send OTP for password reset
     */
    async forgotPassword(email: string): Promise<{ message: string }> {
        try {
            const normalizedEmail = email.toLowerCase().trim();

            // Check if user exists
            const user = await this.userRepository.findByEmail(normalizedEmail);

            if (!user) {
                // Don't reveal if user exists - return silently
                logger.info(`Password reset requested for non-existent email: ${normalizedEmail}`);
                return { message: 'If an account exists, a verification code has been sent.' };
            }

            // Check if user account is active
            if (user.status !== 'active') {
                logger.warn(`Password reset requested for inactive account: ${normalizedEmail}`);
                return { message: 'If an account exists, a verification code has been sent.' };
            }

            // Generate 6-digit OTP
            const otp = crypto.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            console.log("your otp is: ", otp)
            // Store OTP
            this.resetOTPStore.set(normalizedEmail, {
                otp,
                email: normalizedEmail,
                userId: user.id,
                expiresAt,
                attempts: 0
            });

            // TODO: Send OTP via email service
            // await this.emailService.sendPasswordResetOTP(normalizedEmail, otp, user.first_name);

            // For development - log OTP
            logger.info(`Password reset OTP for ${normalizedEmail}: ${otp}`);

            return { message: 'Verification code sent to your email.' };
        } catch (error) {
            logger.error('Error in forgotPassword:', error);
            throw error;
        }
    }

    /**
     * Step 2: Verify Reset OTP
     */
    async verifyResetOTP(email: string, otp: string): Promise<{ resetToken: string; email: string; message: string }> {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const stored = this.resetOTPStore.get(normalizedEmail);

            if (!stored) {
                throw new AppError('No reset request found. Please request a new code.', 400);
            }

            // Check expiration
            if (new Date() > stored.expiresAt) {
                this.resetOTPStore.delete(normalizedEmail);
                throw new AppError('Verification code has expired. Please request a new one.', 400);
            }

            // Check attempts (max 5)
            if (stored.attempts >= 5) {
                this.resetOTPStore.delete(normalizedEmail);
                throw new AppError('Too many failed attempts. Please request a new code.', 429);
            }

            // Verify OTP
            if (stored.otp !== otp) {
                stored.attempts += 1;
                this.resetOTPStore.set(normalizedEmail, stored);

                const remainingAttempts = 5 - stored.attempts;
                throw new AppError(`Invalid code. ${remainingAttempts} attempts remaining.`, 400);
            }

            // OTP is valid - generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store reset token
            this.resetTokenStore.set(resetToken, {
                email: normalizedEmail,
                userId: stored.userId,
                expiresAt: tokenExpiry
            });

            // Clean up OTP
            this.resetOTPStore.delete(normalizedEmail);

            logger.info(`Reset OTP verified for ${normalizedEmail}`);

            return {
                resetToken,
                email: normalizedEmail,
                message: 'Code verified. Please enter your new password.'
            };
        } catch (error) {
            logger.error('Error in verifyResetOTP:', error);
            throw error;
        }
    }

    /**
     * Step 3: Reset Password with Token
     */
    async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
        try {
            const tokenData = this.resetTokenStore.get(resetToken);

            if (!tokenData) {
                throw new AppError('Invalid or expired reset link. Please request a new one.', 400);
            }

            // Check token expiration
            if (new Date() > tokenData.expiresAt) {
                this.resetTokenStore.delete(resetToken);
                throw new AppError('Reset link has expired. Please request a new one.', 400);
            }

            // Validate password strength
            this.validatePasswordStrength(newPassword);

            // Get user
            const user = await this.userRepository.findById(tokenData.userId);
            if (!user) {
                throw new AppError('User not found', 404);
            }

            // Check if new password is same as old
            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new AppError('New password must be different from your current password.', 400);
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password
            await this.userRepository.updatePassword(tokenData.userId, hashedPassword);

            // Clean up token
            this.resetTokenStore.delete(resetToken);

            logger.info(`Password reset successful for user: ${tokenData.userId}`);

            // TODO: Send confirmation email
            // await this.emailService.sendPasswordChangeConfirmation(tokenData.email);

            return { message: 'Password reset successful. You can now login with your new password.' };
        } catch (error) {
            logger.error('Error in resetPassword:', error);
            throw error;
        }
    }

    // ============================================================================
    // EXISTING METHODS
    // ============================================================================

    async register(data: RegisterDTO) {
        try {
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                throw new AppError('Email already registered', 409);
            }

            const hashedPassword = await bcrypt.hash(data.password, 12);

            const user = await this.userRepository.create({
                ...data,
                passwordHash: hashedPassword
            });

            const tokens = this.generateTokens(user);
            const { password_hash, ...userWithoutPassword } = user;

            return {
                user: userWithoutPassword,
                ...tokens
            };
        } catch (error) {
            logger.error('Error in register service:', error);
            throw error;
        }
    }

    async login(email: string, password: string) {
        try {
            const user = await this.userRepository.findByEmail(email.toLowerCase());

            if (!user) {
                throw new AppError('Invalid email or password', 401);
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                throw new AppError('Invalid email or password', 401);
            }

            if (user.status !== 'active') {
                throw new AppError('Your account is not active. Please contact your administrator.', 403);
            }

            const church = await this.churchRepository.findById(user.church_id);
            if (!church) {
                throw new AppError('Church not found', 404);
            }

            if (church.setup_status !== 'active') {
                throw new AppError('Church setup is not complete.', 403);
            }

            // Update last login
            await this.userRepository.updateLastLogin(user.id);

            const tokens = this.generateTokens(user);
            const { password_hash: _, ...userWithoutPassword } = user;

            logger.info(`User logged in: ${user.email} (${user.role}) - Church: ${church.name}`);

            return {
                user: {
                    ...userWithoutPassword,
                    roleDisplay: this.getRoleDisplay(user.role),
                    permissions: this.getRolePermissions(user.role)
                },
                church: {
                    id: church.id,
                    name: church.name,
                    email: church.email,
                    slug: church.slug,
                    setupStatus: church.setup_status,
                    adminSetupSkipped: church.admin_setup_skipped
                },
                mustResetPassword: user.must_reset_password || false,
                isTemporaryPassword: user.is_temporary_password || false,
                profileCompleted: user.profile_completed || false,
                ...tokens
            };
        } catch (error) {
            logger.error('Error in login service:', error);
            throw error;
        }
    }

    async firstLoginResetPassword(userId: string, oldPassword: string, newPassword: string) {
        try {
            const user = await this.userRepository.findById(userId);

            if (!user) {
                throw new AppError('User not found', 404);
            }

            if (!user.must_reset_password) {
                throw new AppError('Password reset not required', 400);
            }

            const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
            if (!isPasswordValid) {
                throw new AppError('Current password is incorrect', 401);
            }

            this.validatePasswordStrength(newPassword);

            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new AppError('New password must be different from your current password.', 400);
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);

            await this.userRepository.update(userId, {
                isTemporaryPassword: false,
                mustResetPassword: false
            });

            await this.userRepository.updatePassword(userId, hashedPassword);

            logger.info(`Password reset completed for user ${userId} on first login`);

            return {
                message: 'Password updated successfully. Please login with your new password.'
            };
        } catch (error) {
            logger.error('Error in firstLoginResetPassword:', error);
            throw error;
        }
    }

    async refreshToken(refreshToken: string) {
        try {
            const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
            if (!jwtRefreshSecret) {
                throw new AppError('Server configuration error', 500);
            }

            const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { id: string };
            const user = await this.userRepository.findById(decoded.id);

            if (!user) {
                throw new AppError('User not found', 404);
            }

            if (user.status !== 'active') {
                throw new AppError('Account is not active', 403);
            }

            return this.generateTokens(user);
        } catch (error) {
            logger.error('Error in refreshToken service:', error);
            throw error;
        }
    }

    async getCurrentUser(userId: string) {
        try {
            const user = await this.userRepository.findById(userId);

            if (!user) {
                throw new AppError('User not found', 404);
            }

            const church = await this.churchRepository.findById(user.church_id);
            const { password_hash: _, ...userWithoutPassword } = user;

            return {
                user: {
                    ...userWithoutPassword,
                    roleDisplay: this.getRoleDisplay(user.role),
                    permissions: this.getRolePermissions(user.role)
                },
                church: church ? {
                    id: church.id,
                    name: church.name,
                    email: church.email,
                    currency: church.currency,
                    slug: church.slug,
                    setupStatus: church.setup_status,
                    adminSetupSkipped: church.admin_setup_skipped
                } : null
            };
        } catch (error) {
            logger.error('Error in getCurrentUser:', error);
            throw error;
        }
    }

    async verifyEmail(token: string) {
        // Implement email verification
        return { message: 'Email verified successfully' };
    }

    async resendVerificationEmail(email: string) {
        // Implement resend verification
        return { message: 'Verification email sent' };
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private validatePasswordStrength(password: string): void {
        if (password.length < 8) {
            throw new AppError('Password must be at least 8 characters long', 400);
        }
        if (!/[A-Z]/.test(password)) {
            throw new AppError('Password must contain at least one uppercase letter', 400);
        }
        if (!/[a-z]/.test(password)) {
            throw new AppError('Password must contain at least one lowercase letter', 400);
        }
        if (!/[0-9]/.test(password)) {
            throw new AppError('Password must contain at least one number', 400);
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            throw new AppError('Password must contain at least one special character', 400);
        }
    }

    private cleanupExpiredData(): void {
        const now = new Date();

        // Cleanup expired OTPs
        for (const [email, data] of this.resetOTPStore.entries()) {
            if (now > data.expiresAt) {
                this.resetOTPStore.delete(email);
                logger.debug(`Cleaned up expired reset OTP for: ${email}`);
            }
        }

        // Cleanup expired tokens
        for (const [token, data] of this.resetTokenStore.entries()) {
            if (now > data.expiresAt) {
                this.resetTokenStore.delete(token);
                logger.debug(`Cleaned up expired reset token`);
            }
        }
    }

    private generateTokens(user: any) {
        const jwtSecret = (process.env.JWT_SECRET ??  'SecretKey123!') as string;
        const jwtRefreshSecret = (process.env.JWT_REFRESH_SECRET ?? 'SecretRefreshKey123!') as string;
        const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
        const jwtRefreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as SignOptions['expiresIn'];

        if (!jwtSecret || !jwtRefreshSecret) {
            throw new AppError('Server configuration error', 500);
        }

        const payload = {
            id: user.id,
            email: user.email,
            churchId: user.church_id,
            role: user.role,
            mustResetPassword: user.must_reset_password || false
        };

        const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
        const refreshToken = jwt.sign({ id: user.id }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });

        return { accessToken, refreshToken };
    }

    private getRoleDisplay(role: string): string {
        const roleMap: Record<string, string> = {
            'admin': 'Administrator',
            'pastor': 'Pastor',
            'staff': 'Staff Member',
            'finance': 'Finance Manager',
            'member': 'Member'
        };
        return roleMap[role] || role;
    }

    private getRolePermissions(role: string): string[] {
        const permissionsMap: Record<string, string[]> = {
            'admin': ['manage_users', 'manage_church', 'manage_members', 'manage_events', 'manage_financials', 'view_reports', 'manage_groups', 'manage_families', 'send_communications'],
            'pastor': ['manage_members', 'manage_events', 'view_financials', 'view_reports', 'manage_groups', 'manage_families', 'send_communications'],
            'finance': ['manage_financials', 'view_reports', 'view_members', 'view_events'],
            'staff': ['manage_members', 'manage_events', 'view_reports', 'manage_groups'],
            'member': ['view_events', 'view_profile']
        };
        return permissionsMap[role] || ['view_profile'];
    }
}