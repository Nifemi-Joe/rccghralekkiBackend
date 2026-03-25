"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
// src/services/EmailService.ts
const EmailRepository_1 = require("@repositories/EmailRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const GroupRepository_1 = require("@repositories/GroupRepository");
const WalletService_1 = require("@services/WalletService");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const nodemailer_1 = __importDefault(require("nodemailer"));
// ============================================================================
// EMAIL SERVICE CLASS
// ============================================================================
class EmailService {
    constructor() {
        this.transporter = null;
        this.emailRepository = new EmailRepository_1.EmailRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.groupRepository = new GroupRepository_1.GroupRepository();
        this.walletService = new WalletService_1.WalletService();
        this.initializeTransporter();
    }
    // ============================================================================
    // TRANSPORTER INITIALIZATION
    // ============================================================================
    // src/services/EmailService.ts
    initializeTransporter() {
        try {
            const host = process.env.SMTP_HOST;
            const port = parseInt(process.env.SMTP_PORT || '465');
            const secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for 587
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASSWORD;
            if (!host || !user || !pass) {
                logger_1.default.warn('⚠️  SMTP credentials not configured. Email sending will be unavailable.');
                logger_1.default.warn('   Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env');
                return;
            }
            this.transporter = nodemailer_1.default.createTransport({
                host,
                port,
                secure, // true for 465 (SSL), false for 587 (TLS)
                auth: {
                    user,
                    pass
                },
                // Connection pool settings for better performance
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                rateDelta: 1000,
                rateLimit: 10,
                // cPanel-specific settings
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production',
                    minVersion: 'TLSv1.2'
                },
                // Debug settings
                debug: process.env.SMTP_DEBUG === 'true',
                logger: process.env.SMTP_DEBUG === 'true'
            });
            // Verify connection on startup
            this.transporter.verify((error, success) => {
                if (error) {
                    logger_1.default.error('❌ SMTP connection failed:', error);
                    logger_1.default.error(`   Host: ${host}:${port}, User: ${user}`);
                }
                else {
                    logger_1.default.info('✅ SMTP transporter initialized successfully');
                    logger_1.default.info(`   Server: ${host}:${port} (${secure ? 'SSL' : 'TLS'})`);
                    logger_1.default.info(`   From: ${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`);
                }
            });
        }
        catch (error) {
            logger_1.default.error('❌ Failed to initialize SMTP transporter:', error);
        }
    }
    getTransporter() {
        if (!this.transporter) {
            throw new AppError_1.AppError('Email service not configured. Check SMTP settings.', 503);
        }
        return this.transporter;
    }
    // src/services/EmailService.ts
    /**
     * Send Password Reset OTP
     */
    async sendPasswordResetOTP(email, otp, firstName) {
        const result = await this.sendEmail({
            to: email,
            subject: 'Password Reset Verification Code',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Code</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center;">
                                        <h1 style="margin: 0; color: #2563eb; font-size: 24px;">🔐 Password Reset</h1>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
                                        <p style="margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.6;">
                                            You requested to reset your password. Use the verification code below:
                                        </p>
                                        
                                        <!-- OTP Code Box -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                            <tr>
                                                <td align="center">
                                                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; display: inline-block;">
                                                        <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                                        <p style="margin: 10px 0 0; color: #ffffff; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 20px 0 0; color: #666; font-size: 14px; text-align: center;">
                                            This code will expire in <strong style="color: #2563eb;">10 minutes</strong>.
                                        </p>
                                        
                                        <!-- Warning -->
                                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 30px; border-radius: 4px;">
                                            <p style="margin: 0; color: #991b1b; font-size: 13px;">
                                                <strong>⚠️ Security Alert:</strong> If you did not request this code, please ignore this email or contact support immediately.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                            This is an automated message. Please do not reply to this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
            text: `Hi ${firstName},\n\nYou requested to reset your password. Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`
        });
        return result.success;
    }
    /**
     * Send Email Verification OTP
     */
    async sendEmailVerificationOTP(email, otp, firstName) {
        const result = await this.sendEmail({
            to: email,
            subject: 'Verify Your Email Address',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center;">
                                        <h1 style="margin: 0; color: #10b981; font-size: 24px;">✉️ Verify Your Email</h1>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="padding: 0 40px 40px;">
                                        <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
                                        <p style="margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.6;">
                                            Thank you for registering! To complete your registration, please verify your email address using the code below:
                                        </p>
                                        
                                        <!-- OTP Code Box -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                            <tr>
                                                <td align="center">
                                                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 20px; display: inline-block;">
                                                        <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                                                        <p style="margin: 10px 0 0; color: #ffffff; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 20px 0 0; color: #666; font-size: 14px; text-align: center;">
                                            This code will expire in <strong style="color: #10b981;">10 minutes</strong>.
                                        </p>
                                        
                                        <!-- Info Box -->
                                        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 30px; border-radius: 4px;">
                                            <p style="margin: 0; color: #1e40af; font-size: 13px;">
                                                <strong>ℹ️ Why verify?</strong> Email verification helps us ensure account security and enables important notifications.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                            This is an automated message. Please do not reply to this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `,
            text: `Hi ${firstName},\n\nThank you for registering! Your email verification code is: ${otp}\n\nThis code will expire in 10 minutes.`
        });
        return result.success;
    }
    // ============================================================================
    // TRANSACTIONAL EMAIL METHODS (used by NotificationController)
    // ============================================================================
    async sendEmail(options) {
        try {
            const transporter = this.getTransporter();
            const fromEmail = process.env.SMTP_USER;
            const fromName = process.env.SMTP_FROM_NAME || 'Church Management';
            const info = await transporter.sendMail({
                from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
                to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                replyTo: options.replyTo,
                attachments: options.attachments,
            });
            logger_1.default.info(`Email sent: ${info.messageId} to ${options.to}`);
            return {
                success: true,
                messageId: info.messageId,
            };
        }
        catch (error) {
            logger_1.default.error('Error sending email:', error);
            return {
                success: false,
                error: error.message || 'Failed to send email',
            };
        }
    }
    async sendBulkEmail(options) {
        const batchSize = options.batchSize || 10;
        const result = {
            total: options.recipients.length,
            sent: 0,
            failed: 0,
            errors: [],
        };
        for (let i = 0; i < options.recipients.length; i += batchSize) {
            const batch = options.recipients.slice(i, i + batchSize);
            const promises = batch.map(async (recipient) => {
                try {
                    let personalizedHtml = options.html;
                    if (recipient.name) {
                        personalizedHtml = personalizedHtml.replace(/\{\{name\}\}/gi, recipient.name);
                    }
                    const sendResult = await this.sendEmail({
                        to: recipient.email,
                        subject: options.subject,
                        html: personalizedHtml,
                        text: options.text,
                    });
                    if (sendResult.success) {
                        result.sent++;
                    }
                    else {
                        result.failed++;
                        result.errors.push({ email: recipient.email, error: sendResult.error || 'Unknown error' });
                    }
                }
                catch (error) {
                    result.failed++;
                    result.errors.push({ email: recipient.email, error: error.message });
                }
            });
            await Promise.all(promises);
            if (i + batchSize < options.recipients.length) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }
        logger_1.default.info(`Bulk email completed: ${result.sent} sent, ${result.failed} failed out of ${result.total}`);
        return result;
    }
    async verifyConnection() {
        try {
            const transporter = this.getTransporter();
            await transporter.verify();
            return true;
        }
        catch (error) {
            logger_1.default.error('Email connection verification failed:', error);
            return false;
        }
    }
    // ============================================================================
    // TEMPLATE EMAILS (used by NotificationController)
    // ============================================================================
    async sendWelcomeEmail(email, name, churchName) {
        const result = await this.sendEmail({
            to: email,
            subject: `Welcome to ${churchName}!`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome, ${name}!</h1>
          <p>We're thrilled to have you join <strong>${churchName}</strong>.</p>
          <p>You are now part of our community. Here are some things you can do:</p>
          <ul>
            <li>Connect with other members</li>
            <li>Stay updated on events and activities</li>
            <li>Access church resources</li>
          </ul>
          <p>If you have any questions, don't hesitate to reach out.</p>
          <p style="color: #666;">Blessings,<br/>${churchName} Team</p>
        </div>
      `,
            text: `Welcome, ${name}! We're thrilled to have you join ${churchName}. You are now part of our community.`,
        });
        return result.success;
    }
    async sendEventReminder(email, name, eventName, eventDate, eventLocation) {
        const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const locationHtml = eventLocation
            ? `<p><strong>Location:</strong> ${eventLocation}</p>`
            : '';
        const result = await this.sendEmail({
            to: email,
            subject: `Reminder: ${eventName}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Event Reminder</h1>
          <p>Hi ${name},</p>
          <p>This is a friendly reminder about an upcoming event:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #2563eb; margin-top: 0;">${eventName}</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            ${locationHtml}
          </div>
          <p>We look forward to seeing you there!</p>
        </div>
      `,
            text: `Hi ${name}, reminder about ${eventName} on ${formattedDate}${eventLocation ? ` at ${eventLocation}` : ''}.`,
        });
        return result.success;
    }
    async sendBirthdayGreeting(email, name, churchName) {
        const result = await this.sendEmail({
            to: email,
            subject: `🎂 Happy Birthday, ${name}!`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
          <h1 style="color: #333; font-size: 2em;">🎂 Happy Birthday!</h1>
          <p style="font-size: 1.2em;">Dear <strong>${name}</strong>,</p>
          <p>On behalf of everyone at <strong>${churchName}</strong>, we wish you a wonderful birthday filled with joy, love, and blessings!</p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin: 20px 0;">
            <p style="font-size: 1.3em; margin: 0;">May God bless you abundantly in this new year of your life! 🙏</p>
          </div>
          <p style="color: #666;">With love,<br/>${churchName} Family</p>
        </div>
      `,
            text: `Happy Birthday, ${name}! On behalf of ${churchName}, we wish you a wonderful birthday filled with joy, love, and blessings!`,
        });
        return result.success;
    }
    async sendAnniversaryGreeting(email, name, spouseName, years, churchName) {
        const result = await this.sendEmail({
            to: email,
            subject: `💍 Happy ${years}${this.getOrdinalSuffix(years)} Anniversary!`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
          <h1 style="color: #333;">💍 Happy Anniversary!</h1>
          <p style="font-size: 1.2em;">Dear <strong>${name}</strong> & <strong>${spouseName}</strong>,</p>
          <p>Congratulations on your <strong>${years}${this.getOrdinalSuffix(years)}</strong> wedding anniversary!</p>
          <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="font-size: 1.1em; color: #92400e;">May God continue to bless your union with love, joy, and togetherness for many more years to come! 🙏</p>
          </div>
          <p style="color: #666;">With love,<br/>${churchName} Family</p>
        </div>
      `,
            text: `Happy ${years}${this.getOrdinalSuffix(years)} Anniversary, ${name} & ${spouseName}! Congratulations from ${churchName}!`,
        });
        return result.success;
    }
    async sendFirstTimerFollowUp(email, name, churchName, visitDate) {
        const formattedDate = visitDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const result = await this.sendEmail({
            to: email,
            subject: `Thank You for Visiting ${churchName}!`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Thank You for Visiting!</h1>
          <p>Dear ${name},</p>
          <p>Thank you for joining us at <strong>${churchName}</strong> on <strong>${formattedDate}</strong>. We hope you had a wonderful experience!</p>
          <p>We'd love to see you again. Here's what you can look forward to:</p>
          <ul>
            <li>Weekly services and worship</li>
            <li>Community groups and fellowship</li>
            <li>Special events and programs</li>
          </ul>
          <p>If you have any questions or need anything at all, please don't hesitate to reach out.</p>
          <p style="color: #666;">Warmly,<br/>${churchName} Team</p>
        </div>
      `,
            text: `Dear ${name}, thank you for visiting ${churchName} on ${formattedDate}. We hope you had a wonderful experience and we'd love to see you again!`,
        });
        return result.success;
    }
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11)
            return 'st';
        if (j === 2 && k !== 12)
            return 'nd';
        if (j === 3 && k !== 13)
            return 'rd';
        return 'th';
    }
    // ============================================================================
    // CONFIGURATIONS
    // ============================================================================
    async createConfiguration(churchId, data) {
        return this.emailRepository.createConfiguration(churchId, data);
    }
    async getConfigurations(churchId) {
        return this.emailRepository.getConfigurations(churchId);
    }
    async setDefaultConfiguration(churchId, configId) {
        return this.emailRepository.setDefaultConfiguration(churchId, configId);
    }
    async deleteConfiguration(churchId, configId) {
        const deleted = await this.emailRepository.deleteConfiguration(churchId, configId);
        if (!deleted) {
            throw new AppError_1.AppError('Configuration not found', 404);
        }
    }
    // ============================================================================
    // TEMPLATES
    // ============================================================================
    async createTemplate(churchId, data, userId) {
        return this.emailRepository.createTemplate(churchId, data, userId);
    }
    async getTemplates(churchId, activeOnly = false) {
        return this.emailRepository.getTemplates(churchId, activeOnly);
    }
    async getTemplateById(churchId, templateId) {
        const template = await this.emailRepository.getTemplateById(churchId, templateId);
        if (!template) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return template;
    }
    async updateTemplate(churchId, templateId, data) {
        const updated = await this.emailRepository.updateTemplate(churchId, templateId, data);
        if (!updated) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return updated;
    }
    async deleteTemplate(churchId, templateId) {
        const deleted = await this.emailRepository.deleteTemplate(churchId, templateId);
        if (!deleted) {
            throw new AppError_1.AppError('Template not found', 404);
        }
    }
    // ============================================================================
    // COMPOSE & SEND (Campaign-based)
    // ============================================================================
    async composeEmail(churchId, data, userId) {
        try {
            const recipients = await this.getRecipients(churchId, data);
            if (recipients.length === 0) {
                throw new AppError_1.AppError('No valid recipients found', 400);
            }
            const totalUnits = recipients.length;
            if (data.sendOption === 'now') {
                const hasSufficientBalance = await this.walletService.checkSufficientBalance(churchId, 'email', totalUnits);
                if (!hasSufficientBalance) {
                    const balance = await this.walletService.getBalance(churchId, 'email');
                    throw new AppError_1.AppError(`Insufficient email units. Required: ${totalUnits}, Available: ${balance}`, 400);
                }
            }
            let config = await this.emailRepository.getDefaultConfiguration(churchId);
            if (!config && data.fromConfigId) {
                config = (await this.emailRepository.getTemplateById(churchId, data.fromConfigId));
            }
            const status = data.sendOption === 'draft'
                ? 'draft'
                : data.sendOption === 'schedule'
                    ? 'scheduled'
                    : 'sending';
            const campaign = await this.emailRepository.createCampaign(churchId, {
                name: data.name,
                subject: data.subject,
                htmlContent: data.htmlContent,
                textContent: data.textContent,
                templateId: data.templateId,
                fromConfigId: data.fromConfigId,
                destinationType: data.destinationType,
                groupIds: data.groupIds,
                memberIds: data.memberIds,
                otherEmails: data.otherEmails,
                status: status,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            }, userId);
            await this.emailRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });
            if (data.attachments && data.attachments.length > 0) {
                for (const attachment of data.attachments) {
                    const attachmentData = {
                        filename: attachment.filename,
                        originalName: attachment.originalName,
                        mimeType: attachment.mimeType,
                        size: attachment.size,
                        storagePath: attachment.storagePath,
                    };
                    await this.emailRepository.addAttachment(campaign.id, attachmentData);
                }
            }
            if (data.sendOption === 'now') {
                await this.processCampaign(churchId, campaign.id, recipients, userId);
            }
            logger_1.default.info(`Email campaign created: ${campaign.id} for church ${churchId}`);
            const updatedCampaign = await this.emailRepository.getCampaignById(churchId, campaign.id);
            if (!updatedCampaign) {
                throw new AppError_1.AppError('Failed to retrieve created campaign', 500);
            }
            return updatedCampaign;
        }
        catch (error) {
            logger_1.default.error('Error composing email:', error);
            throw error;
        }
    }
    async sendSingleEmail(churchId, data, userId) {
        try {
            const hasSufficientBalance = await this.walletService.checkSufficientBalance(churchId, 'email', 1);
            if (!hasSufficientBalance) {
                throw new AppError_1.AppError('Insufficient email units', 400);
            }
            const config = await this.emailRepository.getDefaultConfiguration(churchId);
            const email = await this.emailRepository.createEmail(churchId, {
                toEmail: data.toEmail,
                toName: data.toName,
                subject: data.subject,
                htmlContent: data.htmlContent,
                textContent: data.textContent,
            }, userId);
            try {
                await this.sendEmailViaProvider(data.toEmail, data.subject, data.htmlContent, data.textContent, config?.from_email, config?.from_name, data.attachments);
                await this.emailRepository.updateEmailStatus(email.id, 'sent');
                await this.walletService.debitBalance(churchId, 'email', 1, {
                    reference: email.id,
                    description: `Email sent to ${data.toEmail}`,
                }, userId);
                logger_1.default.info(`Email sent successfully: ${email.id}`);
            }
            catch (error) {
                logger_1.default.error('Error sending email:', error);
                await this.emailRepository.updateEmailStatus(email.id, 'failed', undefined, error.message);
                throw new AppError_1.AppError('Failed to send email', 500);
            }
            const updatedEmail = await this.emailRepository.getEmails({
                churchId,
                page: 1,
                limit: 1,
            });
            return updatedEmail.data[0] || email;
        }
        catch (error) {
            logger_1.default.error('Error sending single email:', error);
            throw error;
        }
    }
    async sendEmailViaProvider(to, subject, html, text, from, fromName, attachments) {
        const transporter = this.getTransporter();
        const defaultFrom = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
        const senderEmail = from || defaultFrom;
        const senderName = fromName || process.env.SMTP_FROM_NAME || 'Church Management';
        await transporter.sendMail({
            from: senderName ? `"${senderName}" <${senderEmail}>` : senderEmail,
            to,
            subject,
            text,
            html,
            attachments,
        });
    }
    async processCampaign(churchId, campaignId, recipients, userId) {
        try {
            const campaign = await this.emailRepository.getCampaignById(churchId, campaignId);
            if (!campaign) {
                throw new AppError_1.AppError('Campaign not found', 404);
            }
            await this.emailRepository.updateCampaign(churchId, campaignId, {
                status: 'sending',
            });
            const config = campaign.from_config_id
                ? (await this.emailRepository.getTemplateById(churchId, campaign.from_config_id))
                : await this.emailRepository.getDefaultConfiguration(churchId);
            const attachments = campaign.attachments || [];
            const emails = await this.emailRepository.createEmails(churchId, recipients.map((r) => ({
                campaignId,
                memberId: r.memberId,
                toEmail: r.email,
                toName: r.name,
                subject: campaign.subject,
                htmlContent: campaign.html_content,
                textContent: campaign.text_content,
            })), userId);
            let sentCount = 0;
            let failedCount = 0;
            for (const email of emails) {
                try {
                    await this.sendEmailViaProvider(email.to_email, email.subject, email.html_content, email.text_content, config?.from_email, config?.from_name, attachments);
                    await this.emailRepository.updateEmailStatus(email.id, 'sent');
                    sentCount++;
                }
                catch (error) {
                    logger_1.default.error(`Error sending email ${email.id}:`, error);
                    await this.emailRepository.updateEmailStatus(email.id, 'failed', undefined, error.message);
                    failedCount++;
                }
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            if (sentCount > 0) {
                await this.walletService.debitBalance(churchId, 'email', sentCount, {
                    reference: campaignId,
                    description: `Email campaign: ${sentCount} emails sent`,
                }, userId);
            }
            await this.emailRepository.updateCampaign(churchId, campaignId, {
                status: failedCount === recipients.length ? 'failed' : 'sent',
                sent_count: sentCount,
                failed_count: failedCount,
                sent_at: new Date(),
            });
            logger_1.default.info(`Campaign ${campaignId} processed: ${sentCount} sent, ${failedCount} failed`);
        }
        catch (error) {
            logger_1.default.error('Error processing campaign:', error);
            await this.emailRepository.updateCampaign(churchId, campaignId, {
                status: 'failed',
            });
            throw error;
        }
    }
    async getRecipients(churchId, data) {
        const recipients = [];
        if (data.destinationType === 'groups' && data.groupIds && data.groupIds.length > 0) {
            for (const groupId of data.groupIds) {
                const group = await this.groupRepository.findById(groupId, churchId);
                if (group && group.members) {
                    recipients.push(...group.members
                        .filter((m) => m.email)
                        .map((m) => ({
                        email: m.email,
                        name: `${m.first_name} ${m.last_name}`,
                        memberId: m.id,
                    })));
                }
            }
        }
        if (data.destinationType === 'members' && data.memberIds && data.memberIds.length > 0) {
            for (const memberId of data.memberIds) {
                const member = await this.memberRepository.findById(memberId, churchId);
                if (member && member.email) {
                    recipients.push({
                        email: member.email,
                        name: `${member.first_name} ${member.last_name}`,
                        memberId: member.id,
                    });
                }
            }
        }
        if (data.destinationType === 'other_emails' && data.otherEmails && data.otherEmails.length > 0) {
            recipients.push(...data.otherEmails.map((email) => ({ email })));
        }
        if (data.destinationType === 'all_contacts') {
            const allMembers = await this.memberRepository.findAll({ churchId });
            recipients.push(...allMembers.members
                .filter((m) => m.email)
                .map((m) => ({
                email: m.email,
                name: `${m.first_name} ${m.last_name}`,
                memberId: m.id,
            })));
        }
        const uniqueRecipients = recipients.filter((recipient, index, self) => index === self.findIndex((r) => r.email === recipient.email));
        return uniqueRecipients;
    }
    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async getCampaigns(filters) {
        return this.emailRepository.getCampaigns(filters);
    }
    async getCampaignById(churchId, campaignId) {
        const campaign = await this.emailRepository.getCampaignById(churchId, campaignId);
        if (!campaign) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return campaign;
    }
    async deleteCampaign(churchId, campaignId) {
        const deleted = await this.emailRepository.deleteCampaign(churchId, campaignId);
        if (!deleted) {
            throw new AppError_1.AppError('Campaign not found or cannot be deleted', 404);
        }
    }
    async getDrafts(churchId) {
        return this.emailRepository.getDrafts(churchId);
    }
    async getScheduled(churchId) {
        return this.emailRepository.getScheduled(churchId);
    }
    // ============================================================================
    // MESSAGES
    // ============================================================================
    async getEmails(filters) {
        return this.emailRepository.getEmails(filters);
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStats(churchId) {
        return this.emailRepository.getStats(churchId);
    }
    async getCampaignReport(churchId, campaignId) {
        const report = await this.emailRepository.getCampaignReport(churchId, campaignId);
        if (!report) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return report;
    }
    // ============================================================================
    // SCHEDULED CAMPAIGNS
    // ============================================================================
    async processScheduledCampaigns() {
        try {
            const campaigns = await this.emailRepository.getScheduledForProcessing();
            for (const campaign of campaigns) {
                try {
                    const recipients = await this.getRecipients(campaign.church_id, campaign);
                    await this.processCampaign(campaign.church_id, campaign.id, recipients);
                }
                catch (error) {
                    logger_1.default.error(`Error processing scheduled campaign ${campaign.id}:`, error);
                }
            }
        }
        catch (error) {
            logger_1.default.error('Error processing scheduled campaigns:', error);
            throw error;
        }
    }
    // ============================================================================
    // SEND OTP VIA EMAIL (used by MemberSelfUpdateService)
    // ============================================================================
    async sendOtp(to, otp, firstName) {
        const subject = 'Your Verification Code';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Code</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f5;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .card {
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #2563eb;
                        font-size: 24px;
                        margin: 0;
                    }
                    .otp-code {
                        text-align: center;
                        margin: 30px 0;
                    }
                    .otp-code .code {
                        display: inline-block;
                        background-color: #f0f4ff;
                        border: 2px dashed #2563eb;
                        border-radius: 8px;
                        padding: 15px 30px;
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        color: #2563eb;
                    }
                    .message {
                        text-align: center;
                        color: #666666;
                        font-size: 14px;
                    }
                    .warning {
                        text-align: center;
                        color: #ef4444;
                        font-size: 12px;
                        margin-top: 20px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #999999;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h1>Verification Code</h1>
                        </div>
                        <p>Hi ${firstName},</p>
                        <p>You requested a verification code to update your profile. Please use the code below:</p>
                        <div class="otp-code">
                            <span class="code">${otp}</span>
                        </div>
                        <p class="message">This code will expire in <strong>10 minutes</strong>.</p>
                        <p class="warning">If you did not request this code, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        const result = await this.sendEmail({ to, subject, html });
        if (!result.success) {
            logger_1.default.error(`Failed to send OTP email to ${to}: ${result.error}`);
            throw new AppError_1.AppError('Failed to send verification code email', 500);
        }
        logger_1.default.info(`OTP email sent to ${to}`);
    }
    // ============================================================================
    // SEND PROFILE UPDATE LINK VIA EMAIL (used by MemberSelfUpdateService)
    // ============================================================================
    async sendProfileUpdateLink(to, data) {
        const subject = `${data.churchName} - Update Your Profile`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Update Your Profile</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f5;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .card {
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #2563eb;
                        font-size: 24px;
                        margin: 0;
                    }
                    .header p {
                        color: #666666;
                        font-size: 14px;
                        margin-top: 8px;
                    }
                    .button-container {
                        text-align: center;
                        margin: 30px 0;
                    }
                    .button {
                        display: inline-block;
                        background-color: #2563eb;
                        color: #ffffff !important;
                        text-decoration: none;
                        padding: 14px 40px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    .button:hover {
                        background-color: #1d4ed8;
                    }
                    .message {
                        color: #666666;
                        font-size: 14px;
                    }
                    .link-fallback {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: #f9fafb;
                        border-radius: 6px;
                        word-break: break-all;
                        font-size: 12px;
                        color: #666666;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #999999;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h1>${data.churchName}</h1>
                            <p>Profile Update Request</p>
                        </div>
                        <p>Hi ${data.firstName} ${data.lastName},</p>
                        <p class="message">
                            Your church has requested that you update your profile information.
                            Please click the button below to review and update your details.
                        </p>
                        <div class="button-container">
                            <a href="${data.updateLink}" class="button">Update My Profile</a>
                        </div>
                        <p class="message">
                            If the button doesn't work, you can copy and paste the following link into your browser:
                        </p>
                        <div class="link-fallback">
                            ${data.updateLink}
                        </div>
                    </div>
                    <div class="footer">
                        <p>This link was sent by ${data.churchName}.</p>
                        <p>If you did not expect this email, please contact your church administrator.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        const result = await this.sendEmail({ to, subject, html });
        if (!result.success) {
            logger_1.default.error(`Failed to send profile update link email to ${to}: ${result.error}`);
            throw new AppError_1.AppError('Failed to send profile update link email', 500);
        }
        logger_1.default.info(`Profile update link email sent to ${to}`);
    }
    // src/services/EmailService.ts
    /**
     * Send Staff Invitation Email (First Time)
     */
    async sendStaffInvitation(email, data) {
        const loginUrl = `${process.env.FRONTEND_URL || 'https://app.rccghralekki.com'}/login`;
        console.log(this.getRoleDisplayName(data.role));
        const roleDisplay = this.getRoleDisplayName(data.role);
        const currentYear = new Date().getFullYear();
        const result = await this.sendEmail({
            to: email,
            subject: `Welcome to ${data.churchName} - Your Account Details`,
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Welcome to ${data.churchName}</title>
            <!--[if mso]>
            <noscript>
                <xml>
                    <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                </xml>
            </noscript>
            <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f23; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
            
            <!-- Preheader text (hidden) -->
            <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
                Welcome aboard, ${data.firstName}! Your account at ${data.churchName} is ready. Here are your login credentials to get started.
            </div>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f0f23; padding: 40px 20px;">
                <tr>
                    <td align="center" valign="top">
                        
                        <!-- Outer Container -->
                        <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; width: 100%;">
                            
                            <!-- Logo / Pre-header Area -->
                            <tr>
                                <td align="center" style="padding: 0 0 30px 0;">
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); width: 48px; height: 48px; border-radius: 14px; text-align: center; vertical-align: middle; font-size: 22px;">
                                                ✝
                                            </td>
                                            <td style="padding-left: 14px;">
                                                <p style="margin: 0; color: #e2e8f0; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">${data.churchName}</p>
                                                <p style="margin: 2px 0 0; color: #64748b; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.2px;">Staff Portal</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Main Card -->
                            <tr>
                                <td>
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a1a2e; border-radius: 20px; overflow: hidden; border: 1px solid rgba(99, 102, 241, 0.15);">
                                        
                                        <!-- Hero Section -->
                                        <tr>
                                            <td style="padding: 0;">
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6366f1 100%); position: relative;">
                                                    <tr>
                                                        <td style="padding: 50px 45px 45px;">
                                                            <!-- Decorative dots -->
                                                            <div style="margin-bottom: 25px;">
                                                                <span style="display: inline-block; width: 8px; height: 8px; background-color: #818cf8; border-radius: 50%; margin-right: 6px; opacity: 0.6;"></span>
                                                                <span style="display: inline-block; width: 8px; height: 8px; background-color: #a78bfa; border-radius: 50%; margin-right: 6px; opacity: 0.8;"></span>
                                                                <span style="display: inline-block; width: 8px; height: 8px; background-color: #c4b5fd; border-radius: 50%; opacity: 1;"></span>
                                                            </div>
                                                            
                                                            <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.2;">
                                                                Welcome aboard! 🎉
                                                            </h1>
                                                            <p style="margin: 0; color: #c7d2fe; font-size: 16px; line-height: 1.6; font-weight: 400;">
                                                                Your account has been created and is ready to go. Let's get you set up.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        
                                        <!-- Body Content -->
                                        <tr>
                                            <td style="padding: 45px;">
                                                
                                                <!-- Greeting -->
                                                <p style="margin: 0 0 8px; color: #e2e8f0; font-size: 17px; font-weight: 600; line-height: 1.5;">
                                                    Hi ${data.firstName},
                                                </p>
                                                <p style="margin: 0 0 35px; color: #94a3b8; font-size: 15px; line-height: 1.7;">
                                                    You've been invited to join <strong style="color: #c7d2fe;">${data.churchName}</strong> as a 
                                                    <span style="display: inline-block; background: linear-gradient(135deg, #312e81, #4338ca); padding: 3px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #c7d2fe; letter-spacing: 0.3px; vertical-align: middle;">${roleDisplay}</span>. 
                                                    Here's everything you need to access your account.
                                                </p>
                                                
                                                <!-- Credentials Card -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(145deg, #16163a 0%, #1e1b4b 100%); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.2); margin-bottom: 30px;">
                                                    <tr>
                                                        <td style="padding: 28px 28px 12px;">
                                                            <table cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; text-align: center; vertical-align: middle; font-size: 16px;">
                                                                        🔑
                                                                    </td>
                                                                    <td style="padding-left: 12px;">
                                                                        <p style="margin: 0; color: #e2e8f0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Login Credentials</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 20px 28px 28px;">
                                                            <!-- Email Field -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(15, 15, 35, 0.6); border-radius: 12px; margin-bottom: 12px;">
                                                                <tr>
                                                                    <td style="padding: 16px 20px;">
                                                                        <p style="margin: 0 0 6px; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">Email Address</p>
                                                                        <p style="margin: 0; color: #e2e8f0; font-size: 15px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-weight: 500;">${email}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Password Field -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(15, 15, 35, 0.6); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.2);">
                                                                <tr>
                                                                    <td style="padding: 16px 20px;">
                                                                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                            <tr>
                                                                                <td>
                                                                                    <p style="margin: 0 0 6px; color: #fbbf24; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">Temporary Password</p>
                                                                                    <p style="margin: 0; color: #fef3c7; font-size: 18px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-weight: 700; letter-spacing: 1.5px;">${data.temporaryPassword}</p>
                                                                                </td>
                                                                                <td align="right" valign="middle">
                                                                                    <span style="background-color: rgba(251, 191, 36, 0.15); color: #fbbf24; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.8px;">Temporary</span>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- CTA Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 35px;">
                                                    <tr>
                                                        <td align="center">
                                                            <table cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);">
                                                                        <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; border-radius: 14px; mso-padding-alt: 0;">
                                                                            <!--[if mso]>
                                                                            <i style="letter-spacing: 48px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                                                                            <![endif]-->
                                                                            <span style="mso-text-raise: 15pt;">Sign In to Your Account →</span>
                                                                            <!--[if mso]>
                                                                            <i style="letter-spacing: 48px; mso-font-width: -100%;">&nbsp;</i>
                                                                            <![endif]-->
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <p style="margin: 12px 0 0; color: #475569; font-size: 12px;">
                                                                or visit <a href="${loginUrl}" style="color: #818cf8; text-decoration: underline;">${loginUrl}</a>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Security Alert -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03)); border-radius: 14px; border: 1px solid rgba(239, 68, 68, 0.15); margin-bottom: 35px;">
                                                    <tr>
                                                        <td style="padding: 20px 24px;">
                                                            <table cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="width: 28px; vertical-align: top; padding-top: 2px;">
                                                                        <span style="font-size: 16px;">🔒</span>
                                                                    </td>
                                                                    <td style="padding-left: 10px;">
                                                                        <p style="margin: 0 0 4px; color: #fca5a5; font-size: 13px; font-weight: 700;">Security Notice</p>
                                                                        <p style="margin: 0; color: #f87171; font-size: 13px; line-height: 1.6; opacity: 0.9;">
                                                                            You'll be required to change your password on first login. Never share your credentials with anyone.
                                                                        </p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Steps Section -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 35px;">
                                                    <tr>
                                                        <td>
                                                            <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 15px; font-weight: 700;">Getting Started</p>
                                                            
                                                            <!-- Step 1 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #312e81, #4338ca); border-radius: 10px; text-align: center; line-height: 32px; color: #c7d2fe; font-size: 13px; font-weight: 800;">1</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Click the <strong style="color: #e2e8f0;">Sign In</strong> button above to open the login page</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Step 2 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #312e81, #4338ca); border-radius: 10px; text-align: center; line-height: 32px; color: #c7d2fe; font-size: 13px; font-weight: 800;">2</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Enter your <strong style="color: #e2e8f0;">email</strong> and <strong style="color: #e2e8f0;">temporary password</strong></p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Step 3 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #312e81, #4338ca); border-radius: 10px; text-align: center; line-height: 32px; color: #c7d2fe; font-size: 13px; font-weight: 800;">3</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Create a <strong style="color: #e2e8f0;">new secure password</strong> when prompted</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Step 4 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #312e81, #4338ca); border-radius: 10px; text-align: center; line-height: 32px; color: #c7d2fe; font-size: 13px; font-weight: 800;">4</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Complete your <strong style="color: #e2e8f0;">profile setup</strong> and start managing</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Divider -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                                                    <tr>
                                                        <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);"></td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Support -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        <td align="center">
                                                            <p style="margin: 0 0 6px; color: #64748b; font-size: 13px; line-height: 1.6;">
                                                                Need help getting started? Contact your church administrator
                                                            </p>
                                                            <p style="margin: 0; color: #64748b; font-size: 13px;">
                                                                or reply directly to this email. We're here for you 🙏
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 35px 20px 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center">
                                                <p style="margin: 0 0 8px; color: #475569; font-size: 12px; font-weight: 500;">
                                                    Sent with ❤️ by ${data.churchName}
                                                </p>
                                                <p style="margin: 0 0 16px; color: #334155; font-size: 11px;">
                                                    © ${currentYear} ${data.churchName}. All rights reserved.
                                                </p>
                                                <table cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        <td style="padding: 0 8px;">
                                                            <span style="color: #475569; font-size: 11px;">Privacy</span>
                                                        </td>
                                                        <td style="color: #334155; font-size: 11px;">•</td>
                                                        <td style="padding: 0 8px;">
                                                            <span style="color: #475569; font-size: 11px;">Terms</span>
                                                        </td>
                                                        <td style="color: #334155; font-size: 11px;">•</td>
                                                        <td style="padding: 0 8px;">
                                                            <span style="color: #475569; font-size: 11px;">Support</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `,
            text: `
Welcome to ${data.churchName}!

Hi ${data.firstName},

You've been invited to join ${data.churchName} as a ${roleDisplay}. Your account is ready.

YOUR LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━
Email: ${email}
Temporary Password: ${data.temporaryPassword}
Role: ${roleDisplay}

GETTING STARTED
━━━━━━━━━━━━━━━━━━━━━
1. Visit ${loginUrl}
2. Enter your email and temporary password
3. Create a new secure password when prompted
4. Complete your profile setup and start managing

⚠ SECURITY NOTICE: You'll be required to change your password on first login. Never share your credentials with anyone.

Need help? Contact your church administrator or reply to this email.

Blessings,
${data.churchName} Team

© ${currentYear} ${data.churchName}. All rights reserved.
`
        });
        return result.success;
    }
    /**
     * Resend Staff Invitation Email (With New Password)
     */
    async resendStaffInvitation(email, data) {
        const loginUrl = `${process.env.FRONTEND_URL || 'https://app.rccghralekki.com'}/login`;
        const roleDisplay = this.getRoleDisplayName(data.role);
        const currentYear = new Date().getFullYear();
        const result = await this.sendEmail({
            to: email,
            subject: `${data.churchName} - New Login Credentials`,
            html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>New Login Credentials - ${data.churchName}</title>
            <!--[if mso]>
            <noscript>
                <xml>
                    <o:OfficeDocumentSettings>
                        <o:PixelsPerInch>96</o:PixelsPerInch>
                    </o:OfficeDocumentSettings>
                </xml>
            </noscript>
            <![endif]-->
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f23; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
            
            <!-- Preheader text (hidden) -->
            <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
                Hi ${data.firstName}, your login credentials for ${data.churchName} have been updated. Here's your new temporary password.
            </div>
            
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f0f23; padding: 40px 20px;">
                <tr>
                    <td align="center" valign="top">
                        
                        <!-- Outer Container -->
                        <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width: 620px; width: 100%;">
                            
                            <!-- Logo / Pre-header Area -->
                            <tr>
                                <td align="center" style="padding: 0 0 30px 0;">
                                    <table cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td style="background: linear-gradient(135deg, #d97706, #f59e0b); width: 48px; height: 48px; border-radius: 14px; text-align: center; vertical-align: middle; font-size: 22px;">
                                                ✝
                                            </td>
                                            <td style="padding-left: 14px;">
                                                <p style="margin: 0; color: #e2e8f0; font-size: 18px; font-weight: 700; letter-spacing: -0.3px;">${data.churchName}</p>
                                                <p style="margin: 2px 0 0; color: #64748b; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.2px;">Staff Portal</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Main Card -->
                            <tr>
                                <td>
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1a1a2e; border-radius: 20px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.15);">
                                        
                                        <!-- Hero Section -->
                                        <tr>
                                            <td style="padding: 0;">
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(160deg, #451a03 0%, #78350f 35%, #92400e 70%, #b45309 100%); position: relative;">
                                                    <tr>
                                                        <td style="padding: 50px 45px 45px;">
                                                            <!-- Decorative dots -->
                                                            <div style="margin-bottom: 25px;">
                                                                <span style="display: inline-block; width: 8px; height: 8px; background-color: #fbbf24; border-radius: 50%; margin-right: 6px; opacity: 0.6;"></span>
                                                                <span style="display: inline-block; width: 8px; height: 8px; background-color: #fcd34d; border-radius: 50%; margin-right: 6px; opacity: 0.8;"></span>
                                                                <span style="display: inline-block; width: 8px; height: 8px; background-color: #fde68a; border-radius: 50%; opacity: 1;"></span>
                                                            </div>
                                                            
                                                            <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.8px; line-height: 1.2;">
                                                                New Credentials 🔄
                                                            </h1>
                                                            <p style="margin: 0; color: #fed7aa; font-size: 16px; line-height: 1.6; font-weight: 400;">
                                                                Your login invitation has been resent with a fresh password.
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                        
                                        <!-- Body Content -->
                                        <tr>
                                            <td style="padding: 45px;">
                                                
                                                <!-- Greeting -->
                                                <p style="margin: 0 0 8px; color: #e2e8f0; font-size: 17px; font-weight: 600; line-height: 1.5;">
                                                    Hi ${data.firstName},
                                                </p>
                                                <p style="margin: 0 0 25px; color: #94a3b8; font-size: 15px; line-height: 1.7;">
                                                    Your login credentials for <strong style="color: #fed7aa;">${data.churchName}</strong> have been updated. 
                                                    You can now access your account as a 
                                                    <span style="display: inline-block; background: linear-gradient(135deg, #78350f, #92400e); padding: 3px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fed7aa; letter-spacing: 0.3px; vertical-align: middle;">${roleDisplay}</span>.
                                                </p>
                                                
                                                <!-- Info Notice -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.03)); border-radius: 14px; border: 1px solid rgba(99, 102, 241, 0.15); margin-bottom: 30px;">
                                                    <tr>
                                                        <td style="padding: 18px 22px;">
                                                            <table cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="width: 24px; vertical-align: top; padding-top: 1px;">
                                                                        <span style="font-size: 14px;">ℹ️</span>
                                                                    </td>
                                                                    <td style="padding-left: 10px;">
                                                                        <p style="margin: 0; color: #a5b4fc; font-size: 13px; line-height: 1.6;">
                                                                            Your previous temporary password has been replaced. Please use the new credentials below.
                                                                        </p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Credentials Card -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(145deg, #1c1917 0%, #292524 100%); border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.2); margin-bottom: 30px;">
                                                    <tr>
                                                        <td style="padding: 28px 28px 12px;">
                                                            <table cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="width: 36px; height: 36px; background: linear-gradient(135deg, #d97706, #f59e0b); border-radius: 10px; text-align: center; vertical-align: middle; font-size: 16px;">
                                                                        🔑
                                                                    </td>
                                                                    <td style="padding-left: 12px;">
                                                                        <p style="margin: 0; color: #e2e8f0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">New Login Credentials</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding: 20px 28px 28px;">
                                                            <!-- Email Field -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(15, 15, 35, 0.6); border-radius: 12px; margin-bottom: 12px;">
                                                                <tr>
                                                                    <td style="padding: 16px 20px;">
                                                                        <p style="margin: 0 0 6px; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">Email Address</p>
                                                                        <p style="margin: 0; color: #e2e8f0; font-size: 15px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-weight: 500;">${email}</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Password Field -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(15, 15, 35, 0.6); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.25);">
                                                                <tr>
                                                                    <td style="padding: 16px 20px;">
                                                                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                            <tr>
                                                                                <td>
                                                                                    <p style="margin: 0 0 6px; color: #fbbf24; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">New Temporary Password</p>
                                                                                    <p style="margin: 0; color: #fef3c7; font-size: 18px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-weight: 700; letter-spacing: 1.5px;">${data.temporaryPassword}</p>
                                                                                </td>
                                                                                <td align="right" valign="middle">
                                                                                    <span style="background-color: rgba(34, 197, 94, 0.15); color: #4ade80; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.8px;">New</span>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- CTA Button -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 35px;">
                                                    <tr>
                                                        <td align="center">
                                                            <table cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%);">
                                                                        <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; border-radius: 14px; mso-padding-alt: 0; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                                                                            <!--[if mso]>
                                                                            <i style="letter-spacing: 48px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                                                                            <![endif]-->
                                                                            <span style="mso-text-raise: 15pt;">Sign In Now →</span>
                                                                            <!--[if mso]>
                                                                            <i style="letter-spacing: 48px; mso-font-width: -100%;">&nbsp;</i>
                                                                            <![endif]-->
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            <p style="margin: 12px 0 0; color: #475569; font-size: 12px;">
                                                                or visit <a href="${loginUrl}" style="color: #fbbf24; text-decoration: underline;">${loginUrl}</a>
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Security Alert -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03)); border-radius: 14px; border: 1px solid rgba(239, 68, 68, 0.15); margin-bottom: 35px;">
                                                    <tr>
                                                        <td style="padding: 22px 24px;">
                                                            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 28px; vertical-align: top; padding-top: 2px;">
                                                                        <span style="font-size: 16px;">🔒</span>
                                                                    </td>
                                                                    <td style="padding-left: 10px;">
                                                                        <p style="margin: 0; color: #fca5a5; font-size: 13px; font-weight: 700;">Security Reminders</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Security items -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="padding: 4px 0 4px 38px;">
                                                                        <table cellpadding="0" cellspacing="0" border="0">
                                                                            <tr>
                                                                                <td style="width: 6px; height: 6px; vertical-align: top; padding-top: 7px;">
                                                                                    <div style="width: 5px; height: 5px; background-color: #f87171; border-radius: 50%; opacity: 0.7;"></div>
                                                                                </td>
                                                                                <td style="padding-left: 10px;">
                                                                                    <p style="margin: 0; color: #f87171; font-size: 12px; line-height: 1.6; opacity: 0.9;">You must change this password after your first login</p>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding: 4px 0 4px 38px;">
                                                                        <table cellpadding="0" cellspacing="0" border="0">
                                                                            <tr>
                                                                                <td style="width: 6px; height: 6px; vertical-align: top; padding-top: 7px;">
                                                                                    <div style="width: 5px; height: 5px; background-color: #f87171; border-radius: 50%; opacity: 0.7;"></div>
                                                                                </td>
                                                                                <td style="padding-left: 10px;">
                                                                                    <p style="margin: 0; color: #f87171; font-size: 12px; line-height: 1.6; opacity: 0.9;">Do not share your credentials with anyone</p>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                                <tr>
                                                                    <td style="padding: 4px 0 4px 38px;">
                                                                        <table cellpadding="0" cellspacing="0" border="0">
                                                                            <tr>
                                                                                <td style="width: 6px; height: 6px; vertical-align: top; padding-top: 7px;">
                                                                                    <div style="width: 5px; height: 5px; background-color: #f87171; border-radius: 50%; opacity: 0.7;"></div>
                                                                                </td>
                                                                                <td style="padding-left: 10px;">
                                                                                    <p style="margin: 0; color: #f87171; font-size: 12px; line-height: 1.6; opacity: 0.9;">Delete this email after you've changed your password</p>
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Quick Steps -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 35px;">
                                                    <tr>
                                                        <td>
                                                            <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 15px; font-weight: 700;">Quick Start</p>
                                                            
                                                            <!-- Step 1 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #78350f, #92400e); border-radius: 10px; text-align: center; line-height: 32px; color: #fed7aa; font-size: 13px; font-weight: 800;">1</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Click <strong style="color: #e2e8f0;">"Sign In Now"</strong> above</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Step 2 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #78350f, #92400e); border-radius: 10px; text-align: center; line-height: 32px; color: #fed7aa; font-size: 13px; font-weight: 800;">2</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Enter your email and <strong style="color: #fbbf24;">new password</strong></p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Step 3 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 14px;">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #78350f, #92400e); border-radius: 10px; text-align: center; line-height: 32px; color: #fed7aa; font-size: 13px; font-weight: 800;">3</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Create your own <strong style="color: #e2e8f0;">secure password</strong></p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                            
                                                            <!-- Step 4 -->
                                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                                <tr>
                                                                    <td style="width: 36px; vertical-align: top;">
                                                                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #78350f, #92400e); border-radius: 10px; text-align: center; line-height: 32px; color: #fed7aa; font-size: 13px; font-weight: 800;">4</div>
                                                                    </td>
                                                                    <td style="padding-left: 14px; vertical-align: middle;">
                                                                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">Access your <strong style="color: #e2e8f0;">dashboard</strong> and get started</p>
                                                                    </td>
                                                                </tr>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Divider -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px;">
                                                    <tr>
                                                        <td style="height: 1px; background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent);"></td>
                                                    </tr>
                                                </table>
                                                
                                                <!-- Support -->
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        <td align="center">
                                                            <p style="margin: 0 0 6px; color: #64748b; font-size: 13px; line-height: 1.6;">
                                                                <strong style="color: #94a3b8;">Still having trouble?</strong> Contact your church administrator
                                                            </p>
                                                            <p style="margin: 0; color: #64748b; font-size: 13px;">
                                                                for assistance. We're here to help! 🙏
                                                            </p>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 35px 20px 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                        <tr>
                                            <td align="center">
                                                <p style="margin: 0 0 8px; color: #475569; font-size: 12px; font-weight: 500;">
                                                    Invitation resent by ${data.churchName}
                                                </p>
                                                <p style="margin: 0 0 16px; color: #334155; font-size: 11px;">
                                                    © ${currentYear} ${data.churchName}. All rights reserved.
                                                </p>
                                                <table cellpadding="0" cellspacing="0" border="0">
                                                    <tr>
                                                        <td style="padding: 0 8px;">
                                                            <span style="color: #475569; font-size: 11px;">Privacy</span>
                                                        </td>
                                                        <td style="color: #334155; font-size: 11px;">•</td>
                                                        <td style="padding: 0 8px;">
                                                            <span style="color: #475569; font-size: 11px;">Terms</span>
                                                        </td>
                                                        <td style="color: #334155; font-size: 11px;">•</td>
                                                        <td style="padding: 0 8px;">
                                                            <span style="color: #475569; font-size: 11px;">Support</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `,
            text: `
New Login Credentials - ${data.churchName}

Hi ${data.firstName},

Your login credentials for ${data.churchName} have been updated with a new temporary password.

NOTE: Your previous temporary password has been replaced.

YOUR NEW LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${email}
New Password: ${data.temporaryPassword}
Role: ${roleDisplay}

QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━
1. Visit ${loginUrl}
2. Enter your email and new password
3. Create your own secure password
4. Access your dashboard and get started

🔒 SECURITY REMINDERS:
• You must change this password after your first login
• Do not share your credentials with anyone
• Delete this email after you've changed your password

Still having trouble? Contact your church administrator for assistance.

Blessings,
${data.churchName} Team

© ${currentYear} ${data.churchName}. All rights reserved.
`
        });
        return result.success;
    }
    /**
     * Helper: Get Role Display Name
     */
    getRoleDisplayName(role) {
        const roleMap = {
            'admin': 'Administrator',
            'pastor': 'Pastor',
            'associate_pastor': 'Associate Pastor',
            'worship_leader': 'Worship Leader',
            'youth_pastor': 'Youth Pastor',
            'children_minister': 'Children\'s Minister',
            'finance_officer': 'Finance Officer',
            'secretary': 'Secretary',
            'head_usher': 'Head Usher',
            'head_choir': 'Choir Director',
            'media_director': 'Media Director',
            'outreach_coordinator': 'Outreach Coordinator',
            'staff': 'Staff Member',
            'volunteer_leader': 'Volunteer Leader',
            'leader': 'Leader',
            'member': 'Member',
            'volunteer': 'Volunteer'
        };
        return roleMap[role] || role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    // ============================================================================
    // SEND PASSWORD RESET EMAIL
    // ============================================================================
    async sendPasswordResetEmail(to, resetLink, firstName) {
        const subject = 'Password Reset Request';
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Password Reset</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb;">Password Reset</h1>
                    <p>Hi ${firstName},</p>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}"
                           style="background-color: #2563eb; color: white; padding: 12px 30px;
                                  text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Reset Password
                        </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 1 hour. If you did not request this, please ignore this email.
                    </p>
                </div>
            </body>
            </html>
        `;
        const result = await this.sendEmail({ to, subject, html });
        if (!result.success) {
            logger_1.default.error(`Failed to send password reset email to ${to}: ${result.error}`);
            throw new AppError_1.AppError('Failed to send password reset email', 500);
        }
        logger_1.default.info(`Password reset email sent to ${to}`);
    }
}
exports.EmailService = EmailService;
// ============================================================================
// SINGLETON EXPORT (for NotificationController and other consumers)
// ============================================================================
exports.emailService = new EmailService();
//# sourceMappingURL=EmailService.js.map