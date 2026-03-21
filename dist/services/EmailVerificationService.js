"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailVerificationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@config/database");
const UserRepository_1 = require("@repositories/UserRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailVerificationService {
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
    }
    async sendVerificationEmail(userId) {
        try {
            const client = await database_1.pool.connect();
            try {
                // Get user
                const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
                if (userResult.rows.length === 0) {
                    throw new AppError_1.AppError('User not found', 404);
                }
                const user = userResult.rows[0];
                if (user.email_verified_at) {
                    throw new AppError_1.AppError('Email already verified', 400);
                }
                // Generate verification token
                const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
                const hashedToken = crypto_1.default.createHash('sha256').update(verificationToken).digest('hex');
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                // Store token
                await client.query(`
          INSERT INTO email_verification_tokens (user_id, token, expires_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id) 
          DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
        `, [userId, hashedToken, expiresAt]);
                // Send email
                await this.sendEmail(user.email, verificationToken, user.first_name);
                logger_1.default.info(`Verification email sent to: ${user.email}`);
                return { message: 'Verification email sent' };
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.default.error('Error in sendVerificationEmail:', error);
            throw error;
        }
    }
    async verifyEmail(token) {
        try {
            const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
            const client = await database_1.pool.connect();
            try {
                await client.query('BEGIN');
                // Find valid token
                const tokenResult = await client.query(`
          SELECT * FROM email_verification_tokens
          WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
        `, [hashedToken]);
                if (tokenResult.rows.length === 0) {
                    throw new AppError_1.AppError('Invalid or expired verification token', 400);
                }
                const userId = tokenResult.rows[0].user_id;
                // Update user as verified
                await client.query(`
          UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1
        `, [userId]);
                // Mark token as used
                await client.query(`
          UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1
        `, [hashedToken]);
                await client.query('COMMIT');
                logger_1.default.info(`Email verified for user: ${userId}`);
                return { message: 'Email verified successfully' };
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.default.error('Error in verifyEmail:', error);
            throw error;
        }
    }
    async resendVerification(email) {
        try {
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                // Don't reveal whether email exists
                return { message: 'If your email is registered, you will receive a verification link' };
            }
            if (user.email_verified_at) {
                throw new AppError_1.AppError('Email already verified', 400);
            }
            return this.sendVerificationEmail(user.id);
        }
        catch (error) {
            logger_1.default.error('Error in resendVerification:', error);
            throw error;
        }
    }
    async sendEmail(email, token, firstName) {
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        await transporter.sendMail({
            from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: 'Verify Your Email Address',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome, ${firstName}!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <p style="margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background-color: #0d9488; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from ${process.env.APP_NAME}
          </p>
        </div>
      `
        });
    }
}
exports.EmailVerificationService = EmailVerificationService;
//# sourceMappingURL=EmailVerificationService.js.map