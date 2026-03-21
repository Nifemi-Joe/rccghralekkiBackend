"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("@config/database");
const UserRepository_1 = require("@repositories/UserRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const nodemailer_1 = __importDefault(require("nodemailer"));
class PasswordResetService {
    constructor() {
        this.userRepository = new UserRepository_1.UserRepository();
    }
    async requestPasswordReset(email) {
        try {
            const user = await this.userRepository.findByEmail(email);
            // Don't reveal whether email exists
            if (!user) {
                logger_1.default.info(`Password reset requested for non-existent email: ${email}`);
                return { message: 'If your email is registered, you will receive a reset link' };
            }
            // Generate reset token
            const resetToken = crypto_1.default.randomBytes(32).toString('hex');
            const hashedToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            // Store token in database
            const client = await database_1.pool.connect();
            try {
                await client.query(`
          INSERT INTO password_reset_tokens (user_id, token, expires_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id) 
          DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
        `, [user.id, hashedToken, expiresAt]);
            }
            finally {
                client.release();
            }
            // Send email
            await this.sendResetEmail(email, resetToken, user.first_name);
            logger_1.default.info(`Password reset email sent to: ${email}`);
            return { message: 'If your email is registered, you will receive a reset link' };
        }
        catch (error) {
            logger_1.default.error('Error in requestPasswordReset:', error);
            throw error;
        }
    }
    async verifyResetToken(token) {
        try {
            const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
            const client = await database_1.pool.connect();
            try {
                const result = await client.query(`
          SELECT prt.*, u.email 
          FROM password_reset_tokens prt
          JOIN users u ON u.id = prt.user_id
          WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL
        `, [hashedToken]);
                if (result.rows.length === 0) {
                    throw new AppError_1.AppError('Invalid or expired reset token', 400);
                }
                return { valid: true, email: result.rows[0].email };
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.default.error('Error in verifyResetToken:', error);
            throw error;
        }
    }
    async resetPassword(token, newPassword) {
        try {
            const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
            const client = await database_1.pool.connect();
            try {
                await client.query('BEGIN');
                // Find valid token
                const tokenResult = await client.query(`
          SELECT * FROM password_reset_tokens
          WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
        `, [hashedToken]);
                if (tokenResult.rows.length === 0) {
                    throw new AppError_1.AppError('Invalid or expired reset token', 400);
                }
                const userId = tokenResult.rows[0].user_id;
                // Hash new password
                const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
                // Update user password
                await client.query(`
          UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2
        `, [hashedPassword, userId]);
                // Mark token as used
                await client.query(`
          UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1
        `, [hashedToken]);
                await client.query('COMMIT');
                logger_1.default.info(`Password reset successful for user: ${userId}`);
                return { message: 'Password reset successful' };
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
            logger_1.default.error('Error in resetPassword:', error);
            throw error;
        }
    }
    async sendResetEmail(email, token, firstName) {
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        await transporter.sendMail({
            from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
            to: email,
            subject: 'Reset Your Password',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${firstName},</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0d9488; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 8px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from ${process.env.APP_NAME}
          </p>
        </div>
      `
        });
    }
}
exports.PasswordResetService = PasswordResetService;
//# sourceMappingURL=PasswordResetService.js.map