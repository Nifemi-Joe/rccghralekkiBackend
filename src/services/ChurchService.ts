import { ChurchRepository, Church } from '@repositories/ChurchRepository';
import { UserRepository, User, UserWithoutPassword } from '@repositories/UserRepository';
import { AppError } from '@utils/AppError';
import { CreateChurchDTO, UpdateChurchDTO } from '@/dtos/church.types';
import { RegisterChurchDTO, SetupAdminDTO, CreateAdditionalAdminDTO } from '@/dtos/auth.types';
import logger from '@config/logger';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
// import { sendEmail } from '@services/EmailService';

// ============================================================================
// INTERFACES
// ============================================================================

interface OTPData {
    otp: string;
    email: string;
    password: string;
    churchName: string;
    expiresAt: Date;
}

interface TokenPayload {
    id: string;
    email: string;
    churchId: string;
    role: string;
    mustResetPassword: boolean;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ChurchService {
    private churchRepository: ChurchRepository;
    private userRepository: UserRepository;
    private otpStore: Map<string, OTPData> = new Map();

    constructor() {
        this.churchRepository = new ChurchRepository();
        this.userRepository = new UserRepository();

        // Cleanup expired OTPs periodically
        setInterval(() => this.cleanupExpiredOTPs(), 5 * 60 * 1000);
    }

    // ==========================================================================
    // STEP 1: Register Church - Send OTP
    // ==========================================================================

    async registerChurchOnly(data: RegisterChurchDTO): Promise<{
        email: string;
        message: string;
    }> {
        try {
            const normalizedEmail = data.email.toLowerCase().trim();

            // Check if email already exists (as user)
            const existingUser = await this.userRepository.findByEmail(normalizedEmail);
            if (existingUser) {
                throw new AppError('Email already registered', 409);
            }

            // Check if church name already exists
            const existingChurch = await this.churchRepository.findByName(data.churchName);
            if (existingChurch) {
                throw new AppError('Church name already registered', 409);
            }

            // Generate 6-digit OTP
            const otp = crypto.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Store registration data with OTP
            this.otpStore.set(normalizedEmail, {
                otp,
                email: normalizedEmail,
                password: data.password,
                churchName: data.churchName,
                expiresAt
            });

            // TODO: Send OTP via email
            logger.info(`OTP generated for ${normalizedEmail}: ${otp}`);

            return {
                email: data.email,
                message: 'Please verify your email with the OTP sent'
            };
        } catch (error) {
            logger.error('Error in registerChurchOnly:', error);
            throw error;
        }
    }

    // ==========================================================================
    // STEP 2: Verify OTP - Create Church AND User
    // ==========================================================================

    async verifyOTP(email: string, otp: string): Promise<{
        churchId: string;
        churchName: string;
        userId: string;
        email: string;
        verified: boolean;
        message: string;
    }> {
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const stored = this.otpStore.get(normalizedEmail);

            if (!stored) {
                throw new AppError('OTP expired or not found. Please request a new one.', 400);
            }

            if (new Date() > stored.expiresAt) {
                this.otpStore.delete(normalizedEmail);
                throw new AppError('OTP expired. Please request a new one.', 400);
            }

            if (stored.otp !== otp) {
                throw new AppError('Invalid OTP. Please try again.', 400);
            }

            // CREATE CHURCH
            const church = await this.churchRepository.create({
                name: stored.churchName,
                email: stored.email
            }, 'pending_admin');

            logger.info(`Church created: ${church.name} (${church.id})`);

            // CREATE USER (with email and password from registration)
            const hashedPassword = await bcrypt.hash(stored.password, 12);

            const user = await this.userRepository.create({
                churchId: church.id,
                email: stored.email,
                passwordHash: hashedPassword,
                firstName: '',
                lastName: '',
                role: 'admin',
                status: 'active',
                profileCompleted: false,
                isTemporaryPassword: false,
                mustResetPassword: false,
                emailVerified: true
            });

            logger.info(`Admin user created: ${user.id} (${user.email}) for church ${church.id}`);

            // Clean up OTP store
            this.otpStore.delete(normalizedEmail);

            return {
                churchId: church.id,
                churchName: church.name,
                userId: user.id,
                email: stored.email,
                verified: true,
                message: 'Email verified successfully. Please complete your profile setup.'
            };
        } catch (error) {
            logger.error('Error in verifyOTP:', error);
            throw error;
        }
    }

    // ==========================================================================
    // STEP 3: Setup Admin - UPDATE Existing User
    // ==========================================================================

    async setupAdmin(data: SetupAdminDTO, skipSetup: boolean = false): Promise<{
        church: Church;
        user?: UserWithoutPassword;
        accessToken?: string;
        refreshToken?: string;
        skipped?: boolean;
        message?: string;
    }> {
        try {
            // Verify church exists
            const church = await this.churchRepository.findById(data.churchId);
            if (!church) {
                throw new AppError('Church not found', 404);
            }

            // Check if setup is already complete
            if (church.setup_status === 'active') {
                throw new AppError('Setup already completed for this church', 409);
            }

            // FIND THE ADMIN USER (created during OTP verification)
            const existingAdmins = await this.userRepository.findAdminsByChurchId(data.churchId);

            if (existingAdmins.length === 0) {
                throw new AppError('No admin user found for this church. Please register again.', 400);
            }

            const adminUser = existingAdmins[0];

            // IF SKIPPING SETUP
            if (skipSetup) {
                await this.churchRepository.updateSetupStatus(data.churchId, 'active');
                await this.churchRepository.update(data.churchId, { adminSetupSkipped: true });

                const updatedChurch = await this.churchRepository.findById(data.churchId);

                logger.info(`Admin setup skipped for church: ${church.name} (${church.id})`);

                return {
                    church: updatedChurch!,
                    skipped: true,
                    message: 'Setup skipped. You can complete your profile later from settings.'
                };
            }

            // VALIDATE REQUIRED FIELDS
            if (!data.firstName || !data.lastName) {
                throw new AppError('First name and last name are required', 400);
            }

            // UPDATE THE EXISTING USER with profile information
            const updatedUser = await this.userRepository.update(adminUser.id, {
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                country: data.country,
                membershipSize: data.membershipSize,
                profileCompleted: true
            });

            if (!updatedUser) {
                throw new AppError('Failed to update user profile', 500);
            }

            // Update church status to active
            await this.churchRepository.updateSetupStatus(data.churchId, 'active');

            // Get updated church
            const updatedChurch = await this.churchRepository.findById(data.churchId);

            // Get full user for token generation
            const fullUser = await this.userRepository.findById(adminUser.id);
            if (!fullUser) {
                throw new AppError('User not found', 404);
            }

            // Generate tokens
            const tokens = this.generateTokens(fullUser, data.churchId);

            // ✅ FIX: Destructure password_hash, not password
            const { password_hash: _, ...userWithoutPassword } = fullUser;

            logger.info(`Admin setup complete for church: ${church.name} (${church.id}), user: ${fullUser.id}`);

            return {
                church: updatedChurch!,
                user: userWithoutPassword,
                ...tokens
            };
        } catch (error) {
            logger.error('Error in setupAdmin:', error);
            throw error;
        }
    }

    // ==========================================================================
    // CREATE ADDITIONAL ADMIN/PASTOR
    // ==========================================================================

    async createAdditionalAdmin(
        churchId: string,
        data: CreateAdditionalAdminDTO,
        createdBy: string
    ): Promise<{
        user: UserWithoutPassword;
        temporaryPassword: string;
        message: string;
    }> {
        try {
            // Verify church exists
            const church = await this.churchRepository.findById(churchId);
            if (!church) {
                throw new AppError('Church not found', 404);
            }

            // Check if email already exists
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                throw new AppError('Email already registered', 409);
            }

            // Generate temporary password
            const temporaryPassword = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

            // Create user with temporary password
            const user = await this.userRepository.create({
                churchId,
                email: data.email.toLowerCase().trim(),
                passwordHash: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                phoneNumber: data.phoneNumber,
                role: data.role,
                status: 'active',
                profileCompleted: true,
                isTemporaryPassword: true,
                mustResetPassword: true,
                emailVerified: false
            });

            logger.info(`Temporary password for ${data.email}: ${temporaryPassword}`);

            // ✅ FIX: Destructure password_hash, not password
            const { password_hash: _, ...userWithoutPassword } = user;

            logger.info(`Additional ${data.role} created for church ${churchId} by user ${createdBy}`);

            return {
                user: userWithoutPassword,
                temporaryPassword,
                message: 'User created successfully. Credentials sent to email.'
            };
        } catch (error) {
            logger.error('Error in createAdditionalAdmin:', error);
            throw error;
        }
    }

    // ==========================================================================
    // RESEND OTP
    // ==========================================================================

    async resendOTP(email: string): Promise<{ message: string }> {
        const normalizedEmail = email.toLowerCase().trim();
        const stored = this.otpStore.get(normalizedEmail);

        if (!stored) {
            throw new AppError('No pending registration found for this email', 400);
        }

        // Generate new OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        this.otpStore.set(normalizedEmail, {
            ...stored,
            otp,
            expiresAt
        });

        logger.info(`New OTP generated for ${email}: ${otp}`);

        return {
            message: 'New verification code sent to your email'
        };
    }

    // ==========================================================================
    // CHURCH CRUD OPERATIONS
    // ==========================================================================

    async getChurchById(churchId: string): Promise<Church> {
        const church = await this.churchRepository.findById(churchId);
        if (!church) {
            throw new AppError('Church not found', 404);
        }
        return church;
    }

    async getChurchBySlug(slug: string): Promise<Church> {
        const church = await this.churchRepository.findBySlug(slug);
        if (!church) {
            throw new AppError('Church not found', 404);
        }
        return church;
    }

    async updateChurch(churchId: string, data: UpdateChurchDTO): Promise<Church> {
        const church = await this.churchRepository.update(churchId, data);
        if (!church) {
            throw new AppError('Church not found', 404);
        }
        return church;
    }

    async deleteChurch(churchId: string): Promise<boolean> {
        const deleted = await this.churchRepository.delete(churchId);
        if (!deleted) {
            throw new AppError('Church not found', 404);
        }
        return deleted;
    }

    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================

    private generateTokens(user: User, churchId: string): {
        accessToken: string;
        refreshToken: string;
    } {
        const jwtSecret = process.env.JWT_SECRET || 'SecretKey123!';
        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'SecretRefreshKey123!';
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

        if (!jwtSecret || !jwtRefreshSecret) {
            throw new AppError('Server configuration error', 500);
        }

        const payload: TokenPayload = {
            id: user.id,
            email: user.email,
            churchId: churchId,
            role: user.role,
            mustResetPassword: user.must_reset_password || false
        };

        const accessToken = jwt.sign(payload, jwtSecret, {
            expiresIn: jwtExpiresIn
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(
            { id: user.id },
            jwtRefreshSecret,
            { expiresIn: jwtRefreshExpiresIn } as jwt.SignOptions
        );

        return { accessToken, refreshToken };
    }

    private cleanupExpiredOTPs(): void {
        const now = new Date();
        for (const [email, data] of this.otpStore.entries()) {
            if (now > data.expiresAt) {
                this.otpStore.delete(email);
                logger.debug(`Cleaned up expired OTP for: ${email}`);
            }
        }
    }
}