"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const UserRepository_1 = require("@repositories/UserRepository");
const ChurchRepository_1 = require("@repositories/ChurchRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
// ============================================================================
// AUTH SERVICE
// ============================================================================
class AuthService {
    constructor() {
        // In-memory stores (use Redis in production)
        this.resetOTPStore = new Map();
        this.resetTokenStore = new Map();
        this.verificationOTPStore = new Map();
        this.userRepository = new UserRepository_1.UserRepository();
        this.churchRepository = new ChurchRepository_1.ChurchRepository();
        // Cleanup expired OTPs every 5 minutes
        setInterval(() => this.cleanupExpiredData(), 5 * 60 * 1000);
    }
    // ============================================================================
    // FORGOT PASSWORD FLOW
    // ============================================================================
    async forgotPassword(email) {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const user = await this.userRepository.findByEmail(normalizedEmail);
            if (!user) {
                logger_1.default.info(`Password reset requested for non-existent email: ${normalizedEmail}`);
                return { message: 'If an account exists, a verification code has been sent.' };
            }
            if (user.status !== 'active') {
                logger_1.default.warn(`Password reset requested for inactive account: ${normalizedEmail}`);
                return { message: 'If an account exists, a verification code has been sent.' };
            }
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            console.log(`\n========================================`);
            console.log(`🔑 PASSWORD RESET OTP`);
            console.log(`Email: ${normalizedEmail}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires: ${expiresAt.toISOString()}`);
            console.log(`========================================\n`);
            this.resetOTPStore.set(normalizedEmail, {
                otp,
                email: normalizedEmail,
                userId: user.id,
                expiresAt,
                attempts: 0
            });
            logger_1.default.info(`Password reset OTP for ${normalizedEmail}: ${otp}`);
            return { message: 'Verification code sent to your email.' };
        }
        catch (error) {
            logger_1.default.error('Error in forgotPassword:', error);
            throw error;
        }
    }
    async verifyResetOTP(email, otp) {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const stored = this.resetOTPStore.get(normalizedEmail);
            if (!stored) {
                throw new AppError_1.AppError('No reset request found. Please request a new code.', 400);
            }
            if (new Date() > stored.expiresAt) {
                this.resetOTPStore.delete(normalizedEmail);
                throw new AppError_1.AppError('Verification code has expired. Please request a new one.', 400);
            }
            if (stored.attempts >= 5) {
                this.resetOTPStore.delete(normalizedEmail);
                throw new AppError_1.AppError('Too many failed attempts. Please request a new code.', 429);
            }
            if (stored.otp !== otp) {
                stored.attempts += 1;
                this.resetOTPStore.set(normalizedEmail, stored);
                const remainingAttempts = 5 - stored.attempts;
                throw new AppError_1.AppError(`Invalid code. ${remainingAttempts} attempts remaining.`, 400);
            }
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            this.resetTokenStore.set(resetToken, {
                email: normalizedEmail,
                userId: stored.userId,
                expiresAt: tokenExpiry
            });
            this.resetOTPStore.delete(normalizedEmail);
            logger_1.default.info(`Reset OTP verified for ${normalizedEmail}`);
            return {
                resetToken,
                email: normalizedEmail,
                message: 'Code verified. Please enter your new password.'
            };
        }
        catch (error) {
            logger_1.default.error('Error in verifyResetOTP:', error);
            throw error;
        }
    }
    async resetPassword(resetToken, newPassword) {
        try {
            const tokenData = this.resetTokenStore.get(resetToken);
            if (!tokenData) {
                throw new AppError_1.AppError('Invalid or expired reset link. Please request a new one.', 400);
            }
            if (new Date() > tokenData.expiresAt) {
                this.resetTokenStore.delete(resetToken);
                throw new AppError_1.AppError('Reset link has expired. Please request a new one.', 400);
            }
            this.validatePasswordStrength(newPassword);
            const user = await this.userRepository.findById(tokenData.userId);
            if (!user) {
                throw new AppError_1.AppError('User not found', 404);
            }
            const isSamePassword = await bcryptjs_1.default.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new AppError_1.AppError('New password must be different from your current password.', 400);
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
            await this.userRepository.updatePassword(tokenData.userId, hashedPassword);
            this.resetTokenStore.delete(resetToken);
            logger_1.default.info(`Password reset successful for user: ${tokenData.userId}`);
            return { message: 'Password reset successful. You can now login with your new password.' };
        }
        catch (error) {
            logger_1.default.error('Error in resetPassword:', error);
            throw error;
        }
    }
    async resendResetOTP(email) {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            const existing = this.resetOTPStore.get(normalizedEmail);
            if (existing) {
                // Rate limit resends — 1 per minute
                const timeSinceCreated = Date.now() - (existing.expiresAt.getTime() - 10 * 60 * 1000);
                if (timeSinceCreated < 60 * 1000) {
                    throw new AppError_1.AppError('Please wait 1 minute before requesting a new code.', 429);
                }
            }
            const user = await this.userRepository.findByEmail(normalizedEmail);
            if (!user) {
                return { message: 'If an account exists, a new code has been sent.' };
            }
            console.log(`\n========================================`);
            console.log(`🔄 RESEND PASSWORD RESET OTP`);
            console.log(`Email: ${normalizedEmail}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires: ${expiresAt.toISOString()}`);
            console.log(`========================================\n`);
            this.resetOTPStore.set(normalizedEmail, {
                otp,
                email: normalizedEmail,
                userId: user.id,
                expiresAt,
                attempts: 0
            });
            logger_1.default.info(`Password reset OTP resent for ${normalizedEmail}: ${otp}`);
            return { message: 'A new verification code has been sent.' };
        }
        catch (error) {
            logger_1.default.error('Error in resendResetOTP:', error);
            throw error;
        }
    }
    // ============================================================================
    // EMAIL VERIFICATION FLOW
    // ============================================================================
    /**
     * Send initial email verification OTP
     * Call this right after church registration
     */
    async sendVerificationOTP(email, userId) {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            this.verificationOTPStore.set(normalizedEmail, {
                otp,
                email: normalizedEmail,
                userId,
                expiresAt,
                attempts: 0,
                resendCount: 0,
                lastResendAt: new Date()
            });
            console.log(`\n========================================`);
            console.log(`📧 EMAIL VERIFICATION OTP`);
            console.log(`Email: ${normalizedEmail}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires: ${expiresAt.toISOString()}`);
            console.log(`========================================\n`);
            logger_1.default.info(`Email verification OTP sent to ${normalizedEmail}: ${otp}`);
            // TODO: Replace with real email sending
            // await this.emailService.sendVerificationOTP(normalizedEmail, otp, firstName);
            return { message: 'Verification code sent to your email.' };
        }
        catch (error) {
            logger_1.default.error('Error in sendVerificationOTP:', error);
            throw error;
        }
    }
    /**
     * Verify email OTP
     */
    async verifyEmail(otp, email, token) {
        try {
            // Support both email+OTP and token-based verification
            if (email && otp) {
                return await this.verifyEmailByOTP(email, otp);
            }
            if (token) {
                return await this.verifyEmailByToken(token);
            }
            throw new AppError_1.AppError('Email and OTP or verification token required', 400);
        }
        catch (error) {
            logger_1.default.error('Error in verifyEmail:', error);
            throw error;
        }
    }
    async verifyEmailByOTP(email, otp) {
        const normalizedEmail = email.toLowerCase().trim();
        const stored = this.verificationOTPStore.get(normalizedEmail);
        if (!stored) {
            throw new AppError_1.AppError('No verification request found. Please request a new code.', 400);
        }
        if (new Date() > stored.expiresAt) {
            this.verificationOTPStore.delete(normalizedEmail);
            throw new AppError_1.AppError('Verification code has expired. Please request a new one.', 400);
        }
        if (stored.attempts >= 5) {
            this.verificationOTPStore.delete(normalizedEmail);
            throw new AppError_1.AppError('Too many failed attempts. Please request a new code.', 429);
        }
        if (stored.otp !== otp) {
            stored.attempts += 1;
            this.verificationOTPStore.set(normalizedEmail, stored);
            const remainingAttempts = 5 - stored.attempts;
            throw new AppError_1.AppError(`Invalid code. ${remainingAttempts} attempts remaining.`, 400);
        }
        // Mark user as email verified
        await this.userRepository.update(stored.userId, { emailVerified: true });
        this.verificationOTPStore.delete(normalizedEmail);
        logger_1.default.info(`Email verified successfully for: ${normalizedEmail}`);
        return { message: 'Email verified successfully.' };
    }
    async verifyEmailByToken(token) {
        // Placeholder for token-based verification if needed later
        logger_1.default.info(`Token-based email verification attempted`);
        return { message: 'Email verified successfully.' };
    }
    /**
     * Resend email verification OTP
     * This is what gets called when user clicks "Resend OTP"
     */
    async resendVerificationEmail(email) {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            // Check if user exists
            const user = await this.userRepository.findByEmail(normalizedEmail);
            if (!user) {
                // Don't reveal if user exists
                logger_1.default.warn(`Resend verification requested for unknown email: ${normalizedEmail}`);
                return { message: 'If an account exists, a new verification code has been sent.' };
            }
            // Check if already verified
            if (user.email_verified) {
                throw new AppError_1.AppError('Email is already verified.', 400);
            }
            // Check rate limiting — max 5 resends, 1 per minute
            const existing = this.verificationOTPStore.get(normalizedEmail);
            if (existing) {
                const timeSinceLastResend = Date.now() - existing.lastResendAt.getTime();
                if (timeSinceLastResend < 60 * 1000) {
                    const secondsLeft = Math.ceil((60 * 1000 - timeSinceLastResend) / 1000);
                    throw new AppError_1.AppError(`Please wait ${secondsLeft} seconds before requesting a new code.`, 429);
                }
                if (existing.resendCount >= 5) {
                    throw new AppError_1.AppError('Maximum resend limit reached. Please contact support.', 429);
                }
            }
            // Generate new OTP
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            const resendCount = existing ? existing.resendCount + 1 : 1;
            // Store new OTP
            this.verificationOTPStore.set(normalizedEmail, {
                otp,
                email: normalizedEmail,
                userId: user.id,
                expiresAt,
                attempts: 0,
                resendCount,
                lastResendAt: new Date()
            });
            // Console log for development
            console.log(`\n========================================`);
            console.log(`🔄 RESEND EMAIL VERIFICATION OTP`);
            console.log(`Email: ${normalizedEmail}`);
            console.log(`OTP: ${otp}`);
            console.log(`Resend #${resendCount}`);
            console.log(`Expires: ${expiresAt.toISOString()}`);
            console.log(`========================================\n`);
            logger_1.default.info(`Verification OTP resent to ${normalizedEmail} (resend #${resendCount}): ${otp}`);
            // TODO: Replace with real email sending when ready
            // await this.emailService.sendVerificationOTP(normalizedEmail, otp, user.first_name);
            return { message: 'A new verification code has been sent to your email.' };
        }
        catch (error) {
            logger_1.default.error('Error in resendVerificationEmail:', error);
            throw error;
        }
    }
    // ============================================================================
    // AUTH METHODS
    // ============================================================================
    async register(data) {
        try {
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                throw new AppError_1.AppError('Email already registered', 409);
            }
            const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
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
        }
        catch (error) {
            logger_1.default.error('Error in register service:', error);
            throw error;
        }
    }
    async login(email, password) {
        try {
            const user = await this.userRepository.findByEmail(email.toLowerCase());
            if (!user) {
                throw new AppError_1.AppError('Invalid email or password', 401);
            }
            const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                throw new AppError_1.AppError('Invalid email or password', 401);
            }
            if (user.status !== 'active') {
                throw new AppError_1.AppError('Your account is not active. Please contact your administrator.', 403);
            }
            const church = await this.churchRepository.findById(user.church_id);
            if (!church) {
                throw new AppError_1.AppError('Church not found', 404);
            }
            if (church.setup_status !== 'active') {
                throw new AppError_1.AppError('Church setup is not complete.', 403);
            }
            await this.userRepository.updateLastLogin(user.id);
            const tokens = this.generateTokens(user);
            const { password_hash: _, ...userWithoutPassword } = user;
            logger_1.default.info(`User logged in: ${user.email} (${user.role}) - Church: ${church.name}`);
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
                    currency: church.currency,
                    setupStatus: church.setup_status,
                    adminSetupSkipped: church.admin_setup_skipped
                },
                mustResetPassword: user.must_reset_password || false,
                isTemporaryPassword: user.is_temporary_password || false,
                profileCompleted: user.profile_completed || false,
                ...tokens
            };
        }
        catch (error) {
            logger_1.default.error('Error in login service:', error);
            throw error;
        }
    }
    async firstLoginResetPassword(userId, oldPassword, newPassword) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new AppError_1.AppError('User not found', 404);
            }
            if (!user.must_reset_password) {
                throw new AppError_1.AppError('Password reset not required', 400);
            }
            const isPasswordValid = await bcryptjs_1.default.compare(oldPassword, user.password_hash);
            if (!isPasswordValid) {
                throw new AppError_1.AppError('Current password is incorrect', 401);
            }
            this.validatePasswordStrength(newPassword);
            const isSamePassword = await bcryptjs_1.default.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new AppError_1.AppError('New password must be different from your current password.', 400);
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
            await this.userRepository.update(userId, {
                isTemporaryPassword: false,
                mustResetPassword: false
            });
            await this.userRepository.updatePassword(userId, hashedPassword);
            logger_1.default.info(`Password reset completed for user ${userId} on first login`);
            return {
                message: 'Password updated successfully. Please login with your new password.'
            };
        }
        catch (error) {
            logger_1.default.error('Error in firstLoginResetPassword:', error);
            throw error;
        }
    }
    async refreshToken(refreshToken) {
        try {
            const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
            if (!jwtRefreshSecret) {
                throw new AppError_1.AppError('Server configuration error', 500);
            }
            const decoded = jsonwebtoken_1.default.verify(refreshToken, jwtRefreshSecret);
            const user = await this.userRepository.findById(decoded.id);
            if (!user) {
                throw new AppError_1.AppError('User not found', 404);
            }
            if (user.status !== 'active') {
                throw new AppError_1.AppError('Account is not active', 403);
            }
            return this.generateTokens(user);
        }
        catch (error) {
            logger_1.default.error('Error in refreshToken service:', error);
            throw error;
        }
    }
    async getCurrentUser(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new AppError_1.AppError('User not found', 404);
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
        }
        catch (error) {
            logger_1.default.error('Error in getCurrentUser:', error);
            throw error;
        }
    }
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new AppError_1.AppError('User not found', 404);
            }
            const isPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
            if (!isPasswordValid) {
                throw new AppError_1.AppError('Current password is incorrect', 401);
            }
            this.validatePasswordStrength(newPassword);
            const isSamePassword = await bcryptjs_1.default.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw new AppError_1.AppError('New password must be different from your current password.', 400);
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
            await this.userRepository.updatePassword(userId, hashedPassword);
            logger_1.default.info(`Password changed for user: ${userId}`);
            return { message: 'Password changed successfully.' };
        }
        catch (error) {
            logger_1.default.error('Error in changePassword:', error);
            throw error;
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    validatePasswordStrength(password) {
        if (password.length < 8) {
            throw new AppError_1.AppError('Password must be at least 8 characters long', 400);
        }
        if (!/[A-Z]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one uppercase letter', 400);
        }
        if (!/[a-z]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one lowercase letter', 400);
        }
        if (!/[0-9]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one number', 400);
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            throw new AppError_1.AppError('Password must contain at least one special character', 400);
        }
    }
    cleanupExpiredData() {
        const now = new Date();
        for (const [email, data] of this.resetOTPStore.entries()) {
            if (now > data.expiresAt) {
                this.resetOTPStore.delete(email);
                logger_1.default.debug(`Cleaned up expired reset OTP for: ${email}`);
            }
        }
        for (const [token, data] of this.resetTokenStore.entries()) {
            if (now > data.expiresAt) {
                this.resetTokenStore.delete(token);
                logger_1.default.debug(`Cleaned up expired reset token`);
            }
        }
        for (const [email, data] of this.verificationOTPStore.entries()) {
            if (now > data.expiresAt) {
                this.verificationOTPStore.delete(email);
                logger_1.default.debug(`Cleaned up expired verification OTP for: ${email}`);
            }
        }
    }
    generateTokens(user) {
        const jwtSecret = (process.env.JWT_SECRET ?? 'SecretKey123!');
        const jwtRefreshSecret = (process.env.JWT_REFRESH_SECRET ?? 'SecretRefreshKey123!');
        const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '7d');
        const jwtRefreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d');
        const payload = {
            id: user.id,
            email: user.email,
            churchId: user.church_id,
            role: user.role,
            mustResetPassword: user.must_reset_password || false
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });
        return { accessToken, refreshToken };
    }
    getRoleDisplay(role) {
        const roleMap = {
            'admin': 'Administrator',
            'pastor': 'Pastor',
            'staff': 'Staff Member',
            'finance': 'Finance Manager',
            'member': 'Member'
        };
        return roleMap[role] || role;
    }
    getRolePermissions(role) {
        const permissionsMap = {
            'admin': ['manage_users', 'manage_church', 'manage_members', 'manage_events', 'manage_financials', 'view_reports', 'manage_groups', 'manage_families', 'send_communications'],
            'pastor': ['manage_members', 'manage_events', 'view_financials', 'view_reports', 'manage_groups', 'manage_families', 'send_communications'],
            'finance': ['manage_financials', 'view_reports', 'view_members', 'view_events'],
            'staff': ['manage_members', 'manage_events', 'view_reports', 'manage_groups'],
            'member': ['view_events', 'view_profile']
        };
        return permissionsMap[role] || ['view_profile'];
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map