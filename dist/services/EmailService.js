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
    initializeTransporter() {
        try {
            const host = process.env.SMTP_HOST;
            const port = parseInt(process.env.SMTP_PORT || '587');
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASSWORD;
            if (!host || !user || !pass) {
                logger_1.default.warn('SMTP credentials not configured. Email sending will be unavailable.');
                return;
            }
            this.transporter = nodemailer_1.default.createTransport({
                host,
                port,
                secure: process.env.SMTP_SECURE === 'true',
                auth: { user, pass },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                rateLimit: 10,
            });
            logger_1.default.info('SMTP transporter initialized successfully');
        }
        catch (error) {
            logger_1.default.error('Failed to initialize SMTP transporter:', error);
        }
    }
    getTransporter() {
        if (!this.transporter) {
            throw new AppError_1.AppError('Email service not configured. Check SMTP settings.', 503);
        }
        return this.transporter;
    }
    // ============================================================================
    // TRANSACTIONAL EMAIL METHODS (used by NotificationController)
    // ============================================================================
    async sendEmail(options) {
        try {
            const transporter = this.getTransporter();
            const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
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