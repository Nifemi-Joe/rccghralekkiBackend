"use strict";
// src/services/NotificationService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const twilio_1 = __importDefault(require("twilio"));
const AppError_1 = require("@utils/AppError");
// ============================================
// NOTIFICATION SERVICE CLASS
// ============================================
class NotificationService {
    constructor() {
        // FIXED: Changed type from nodemailer.Transport to Transporter and made it optional
        this.emailTransporter = null;
        this.twilioClient = null;
        this.isEmailConfigured = false;
        this.isSMSConfigured = false;
        // Configure email transporter
        this.initializeEmailTransporter();
        // Configure Twilio SMS
        this.initializeTwilioClient();
    }
    // ============================================
    // INITIALIZATION
    // ============================================
    initializeEmailTransporter() {
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                this.emailTransporter = nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                    tls: {
                        rejectUnauthorized: process.env.NODE_ENV === 'production',
                    },
                });
                this.isEmailConfigured = true;
                logger_1.default.info('Email transporter initialized successfully');
            }
            else {
                logger_1.default.warn('Email configuration incomplete - emails will be logged only');
                this.isEmailConfigured = false;
            }
        }
        catch (error) {
            logger_1.default.error('Failed to initialize email transporter:', error);
            this.isEmailConfigured = false;
        }
    }
    initializeTwilioClient() {
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                this.isSMSConfigured = true;
                logger_1.default.info('Twilio SMS client initialized successfully');
            }
            else {
                logger_1.default.warn('Twilio configuration incomplete - SMS will be logged only');
                this.isSMSConfigured = false;
            }
        }
        catch (error) {
            logger_1.default.error('Failed to initialize Twilio client:', error);
            this.isSMSConfigured = false;
        }
    }
    // ============================================
    // MAIN NOTIFICATION METHODS
    // ============================================
    /**
     * Send notification via multiple channels
     */
    async sendNotification(options) {
        const result = {
            sent: [],
            failed: [],
            errors: {},
        };
        const { userId, email, phone, channels, data, templateData } = options;
        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'email':
                        if (email) {
                            await this.sendEmail({
                                to: email,
                                subject: this.getSubjectForType(data.type, data.title),
                                template: data.type,
                                data: {
                                    ...data.metadata,
                                    ...templateData,
                                    title: data.title,
                                    message: data.message,
                                    actionUrl: data.actionUrl,
                                },
                            });
                            result.sent.push('email');
                        }
                        else {
                            result.failed.push('email');
                            result.errors['email'] = 'No email address provided';
                        }
                        break;
                    case 'sms':
                        if (phone) {
                            await this.sendSMS({
                                to: phone,
                                message: this.formatSMSMessage(data.type, data.message, data.actionUrl),
                            });
                            result.sent.push('sms');
                        }
                        else {
                            result.failed.push('sms');
                            result.errors['sms'] = 'No phone number provided';
                        }
                        break;
                    case 'whatsapp':
                        if (phone) {
                            await this.sendWhatsApp({
                                to: phone,
                                message: data.message,
                            });
                            result.sent.push('whatsapp');
                        }
                        else {
                            result.failed.push('whatsapp');
                            result.errors['whatsapp'] = 'No phone number provided';
                        }
                        break;
                    case 'in_app':
                        if (userId) {
                            await this.createInAppNotification(userId, data);
                            result.sent.push('in_app');
                        }
                        else {
                            result.failed.push('in_app');
                            result.errors['in_app'] = 'No user ID provided';
                        }
                        break;
                }
            }
            catch (error) {
                result.failed.push(channel);
                result.errors[channel] = error.message || 'Unknown error';
                logger_1.default.error(`Failed to send ${channel} notification:`, error);
            }
        }
        return result;
    }
    /**
     * Send notification to all admins of a church
     */
    async notifyChurchAdmins(data) {
        try {
            const adminsResult = await database_1.pool.query(`SELECT u.id, u.email, u.first_name, u.last_name, u.phone
                 FROM users u
                 WHERE u.church_id = $1
                   AND u.role IN ('admin', 'super_admin')
                   AND u.is_active = true`, [data.churchId]);
            if (adminsResult.rows.length === 0) {
                logger_1.default.warn(`No admins found for church ${data.churchId}`);
                return;
            }
            // Create in-app notifications
            const notificationInserts = adminsResult.rows.map(admin => this.createInAppNotification(admin.id, data));
            await Promise.all(notificationInserts);
            // Send email notifications
            const emailPromises = adminsResult.rows.map(admin => this.sendEmailNotification(admin, data));
            await Promise.allSettled(emailPromises);
            logger_1.default.info(`Notifications sent to ${adminsResult.rows.length} admins for church ${data.churchId}`);
        }
        catch (error) {
            logger_1.default.error('Error sending notifications to admins:', error);
            throw error;
        }
    }
    /**
     * Notify the expense submitter
     */
    async notifyExpenseSubmitter(userId, churchId, data) {
        try {
            await this.createInAppNotification(userId, { ...data, churchId });
            const userResult = await database_1.pool.query('SELECT email, first_name, last_name, phone FROM users WHERE id = $1', [userId]);
            if (userResult.rows[0]) {
                await this.sendEmailNotification(userResult.rows[0], { ...data, churchId });
            }
        }
        catch (error) {
            logger_1.default.error('Error notifying expense submitter:', error);
        }
    }
    /**
     * Send profile update link notification
     */
    async sendProfileUpdateLink(options) {
        const result = {
            sent: [],
            failed: [],
            errors: {},
        };
        const { email, phone, firstName, lastName, link, expiresAt, churchName, channels } = options;
        // Send via Email
        if (channels.includes('email') && email) {
            try {
                await this.sendEmail({
                    to: email,
                    subject: 'Complete Your Church Profile',
                    template: 'profile_update_link',
                    data: {
                        firstName,
                        lastName,
                        link,
                        expiresAt,
                        churchName: churchName || 'Our Church',
                    },
                });
                result.sent.push('email');
            }
            catch (error) {
                result.failed.push('email');
                result.errors['email'] = error.message;
            }
        }
        // Send via SMS
        if (channels.includes('sms') && phone) {
            try {
                const message = `Hi ${firstName}, please complete your church profile: ${link}. This link expires on ${new Date(expiresAt).toLocaleDateString()}.`;
                await this.sendSMS({
                    to: phone,
                    message,
                });
                result.sent.push('sms');
            }
            catch (error) {
                result.failed.push('sms');
                result.errors['sms'] = error.message;
            }
        }
        // Send via WhatsApp
        if (channels.includes('whatsapp') && phone) {
            try {
                const message = `Hi ${firstName}! 👋\n\nPlease complete your church profile by clicking the link below:\n\n${link}\n\nThis link expires on ${new Date(expiresAt).toLocaleDateString()}.\n\nThank you!`;
                await this.sendWhatsApp({
                    to: phone,
                    message,
                });
                result.sent.push('whatsapp');
            }
            catch (error) {
                result.failed.push('whatsapp');
                result.errors['whatsapp'] = error.message;
            }
        }
        return result;
    }
    /**
     * Send birthday/anniversary wishes
     */
    async sendCelebrationWishes(options) {
        const result = {
            sent: [],
            failed: [],
            errors: {},
        };
        const { email, phone, firstName, type, churchName, channels } = options;
        const isBirthday = type === 'birthday';
        const subject = isBirthday
            ? `🎂 Happy Birthday, ${firstName}!`
            : `💍 Happy Anniversary, ${firstName}!`;
        const message = isBirthday
            ? `Wishing you a wonderful birthday filled with joy and blessings!`
            : `Congratulations on your wedding anniversary! May your love continue to grow stronger.`;
        // Send via Email
        if (channels.includes('email') && email) {
            try {
                await this.sendEmail({
                    to: email,
                    subject,
                    template: isBirthday ? 'member_birthday' : 'member_anniversary',
                    data: {
                        firstName,
                        churchName: churchName || 'Our Church',
                        message,
                    },
                });
                result.sent.push('email');
            }
            catch (error) {
                result.failed.push('email');
                result.errors['email'] = error.message;
            }
        }
        // Send via SMS
        if (channels.includes('sms') && phone) {
            try {
                const smsMessage = isBirthday
                    ? `🎂 Happy Birthday, ${firstName}! ${message} - ${churchName || 'Your Church Family'}`
                    : `💍 Happy Anniversary, ${firstName}! ${message} - ${churchName || 'Your Church Family'}`;
                await this.sendSMS({
                    to: phone,
                    message: smsMessage,
                });
                result.sent.push('sms');
            }
            catch (error) {
                result.failed.push('sms');
                result.errors['sms'] = error.message;
            }
        }
        return result;
    }
    /**
     * Send event reminder notification
     */
    async sendEventReminder(options) {
        const result = {
            sent: [],
            failed: [],
            errors: {},
        };
        const { email, phone, firstName, eventName, eventDate, eventLocation, churchName, channels } = options;
        const formattedDate = new Date(eventDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        // Send via Email
        if (channels.includes('email') && email) {
            try {
                await this.sendEmail({
                    to: email,
                    subject: `📅 Reminder: ${eventName}`,
                    template: 'event_reminder',
                    data: {
                        firstName,
                        eventName,
                        eventDate: formattedDate,
                        eventLocation,
                        churchName: churchName || 'Our Church',
                    },
                });
                result.sent.push('email');
            }
            catch (error) {
                result.failed.push('email');
                result.errors['email'] = error.message;
            }
        }
        // Send via SMS
        if (channels.includes('sms') && phone) {
            try {
                let smsMessage = `Hi ${firstName}, reminder: ${eventName} on ${formattedDate}`;
                if (eventLocation) {
                    smsMessage += ` at ${eventLocation}`;
                }
                smsMessage += `. See you there!`;
                await this.sendSMS({
                    to: phone,
                    message: smsMessage,
                });
                result.sent.push('sms');
            }
            catch (error) {
                result.failed.push('sms');
                result.errors['sms'] = error.message;
            }
        }
        return result;
    }
    // ============================================
    // CORE CHANNEL METHODS
    // ============================================
    /**
     * Send email notification
     */
    async sendEmail(options) {
        const { to, subject, template, text, html, data } = options;
        // Generate HTML content
        let htmlContent = html;
        if (template && data) {
            htmlContent = this.renderEmailTemplate(template, data);
        }
        if (!this.isEmailConfigured || !this.emailTransporter) {
            logger_1.default.info(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
            logger_1.default.debug(`[EMAIL MOCK] Content: ${text || htmlContent?.substring(0, 200)}...`);
            return;
        }
        try {
            // FIXED: Now emailTransporter is properly typed and has sendMail method
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to,
                subject,
                text: text || this.stripHtml(htmlContent || ''),
                html: htmlContent,
            });
            logger_1.default.info(`Email sent successfully to ${to}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to send email to ${to}:`, error);
            throw new AppError_1.AppError('Failed to send email', 500);
        }
    }
    /**
     * Send SMS notification via Twilio
     */
    async sendSMS(options) {
        const { to, message } = options;
        // Clean phone number
        const cleanPhone = this.formatPhoneNumber(to);
        if (!this.isSMSConfigured || !this.twilioClient) {
            logger_1.default.info(`[SMS MOCK] To: ${cleanPhone}, Message: ${message.substring(0, 100)}...`);
            return;
        }
        try {
            await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: cleanPhone,
            });
            logger_1.default.info(`SMS sent successfully to ${cleanPhone}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to send SMS to ${cleanPhone}:`, error);
            throw new AppError_1.AppError(`Failed to send SMS: ${error.message}`, 500);
        }
    }
    /**
     * Send WhatsApp message
     */
    async sendWhatsApp(options) {
        const { to, message } = options;
        const cleanPhone = this.formatPhoneNumber(to);
        // Check if Twilio WhatsApp is configured
        if (!this.isSMSConfigured || !this.twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
            logger_1.default.info(`[WHATSAPP MOCK] To: ${cleanPhone}, Message: ${message.substring(0, 100)}...`);
            return;
        }
        try {
            await this.twilioClient.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${cleanPhone}`,
            });
            logger_1.default.info(`WhatsApp message sent successfully to ${cleanPhone}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to send WhatsApp to ${cleanPhone}:`, error);
            throw new AppError_1.AppError(`Failed to send WhatsApp message: ${error.message}`, 500);
        }
    }
    /**
     * Generate WhatsApp click-to-chat link
     */
    generateWhatsAppLink(phone, message) {
        const encodedMessage = encodeURIComponent(message);
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }
    // ============================================
    // IN-APP NOTIFICATIONS
    // ============================================
    /**
     * Create in-app notification
     */
    async createInAppNotification(userId, data) {
        try {
            await database_1.pool.query(`INSERT INTO notifications (
                    user_id, church_id, type, title, message,
                    action_url, metadata, is_read, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`, [
                userId,
                data.churchId,
                data.type,
                data.title,
                data.message,
                data.actionUrl || null,
                JSON.stringify(data.metadata || {}),
            ]);
            logger_1.default.debug(`In-app notification created for user ${userId}`);
        }
        catch (error) {
            logger_1.default.error('Error creating in-app notification:', error);
            throw error;
        }
    }
    /**
     * Get user notifications
     */
    async getUserNotifications(userId, options) {
        const { unreadOnly = false, limit = 20, offset = 0 } = options || {};
        let query = `
            SELECT * FROM notifications
            WHERE user_id = $1
        `;
        const values = [userId];
        let paramIndex = 2;
        if (unreadOnly) {
            query += ` AND is_read = false`;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);
        const [notificationsResult, countResult] = await Promise.all([
            database_1.pool.query(query, values),
            database_1.pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [userId]),
        ]);
        return {
            notifications: notificationsResult.rows,
            unreadCount: parseInt(countResult.rows[0].count, 10),
        };
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        await database_1.pool.query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId) {
        await database_1.pool.query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false', [userId]);
    }
    // ============================================
    // HELPER METHODS
    // ============================================
    async sendEmailNotification(user, data) {
        try {
            const userName = `${user.first_name} ${user.last_name}`;
            await this.sendEmail({
                to: user.email,
                subject: this.getSubjectForType(data.type, data.title),
                template: data.type,
                data: {
                    userName,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    title: data.title,
                    message: data.message,
                    actionUrl: data.actionUrl,
                    metadata: data.metadata,
                },
            });
        }
        catch (error) {
            logger_1.default.error(`Failed to send email to ${user.email}:`, error);
            // Don't throw - email failures shouldn't break the flow
        }
    }
    getSubjectForType(type, defaultTitle) {
        const subjectMap = {
            expense_pending_approval: '📋 New Expense Awaiting Approval',
            expense_approved: '✅ Expense Approved',
            expense_rejected: '❌ Expense Rejected',
            profile_update_link: '📝 Complete Your Church Profile',
            profile_completed: '✅ Profile Updated Successfully',
            member_welcome: '👋 Welcome to Our Church!',
            member_birthday: '🎂 Happy Birthday!',
            member_anniversary: '💍 Happy Anniversary!',
            event_reminder: '📅 Event Reminder',
            event_registration: '✅ Event Registration Confirmed',
            attendance_reminder: '⏰ Attendance Reminder',
            password_reset: '🔐 Password Reset Request',
            account_verification: '📧 Verify Your Email',
            general: defaultTitle,
        };
        return subjectMap[type] || defaultTitle;
    }
    formatSMSMessage(type, message, actionUrl) {
        let smsMessage = message;
        // Truncate if too long (SMS limit is ~160 chars)
        if (smsMessage.length > 140 && actionUrl) {
            smsMessage = smsMessage.substring(0, 100) + '...';
        }
        if (actionUrl) {
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const fullUrl = actionUrl.startsWith('http') ? actionUrl : `${baseUrl}${actionUrl}`;
            smsMessage += ` ${fullUrl}`;
        }
        return smsMessage;
    }
    formatPhoneNumber(phone) {
        // Remove all non-numeric characters except +
        let cleaned = phone.replace(/[^0-9+]/g, '');
        // Add + if not present and doesn't start with it
        if (!cleaned.startsWith('+')) {
            // Assume US number if 10 digits
            if (cleaned.length === 10) {
                cleaned = '+1' + cleaned;
            }
            else if (cleaned.length === 11 && cleaned.startsWith('1')) {
                cleaned = '+' + cleaned;
            }
            else {
                // For other numbers, just add + prefix
                cleaned = '+' + cleaned;
            }
        }
        return cleaned;
    }
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    // ============================================
    // EMAIL TEMPLATES
    // ============================================
    renderEmailTemplate(templateName, data) {
        const templates = {
            // Profile Update Link Template
            profile_update_link: (data) => this.profileUpdateLinkTemplate(data),
            // Member Welcome Template
            member_welcome: (data) => this.memberWelcomeTemplate(data),
            // Birthday Template
            member_birthday: (data) => this.birthdayTemplate(data),
            // Anniversary Template
            member_anniversary: (data) => this.anniversaryTemplate(data),
            // Event Reminder Template
            event_reminder: (data) => this.eventReminderTemplate(data),
            // Event Registration Template
            event_registration: (data) => this.eventRegistrationTemplate(data),
            // Expense Templates
            expense_pending_approval: (data) => this.expenseTemplate(data, 'pending'),
            expense_approved: (data) => this.expenseTemplate(data, 'approved'),
            expense_rejected: (data) => this.expenseTemplate(data, 'rejected'),
            // Password Reset Template
            password_reset: (data) => this.passwordResetTemplate(data),
            // Account Verification Template
            account_verification: (data) => this.accountVerificationTemplate(data),
            // General Template
            general: (data) => this.generalTemplate(data),
        };
        const templateFn = templates[templateName] || templates['general'];
        return templateFn(data);
    }
    getBaseTemplate(content, data) {
        const churchName = data.churchName || 'Church Management System';
        const currentYear = new Date().getFullYear();
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${data.title || 'Notification'}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        background-color: #f5f5f5;
                    }
                    .wrapper {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: #ffffff;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: #ffffff;
                        padding: 30px 20px;
                        text-align: center;
                    }
                    .header h1 {
                        font-size: 24px;
                        font-weight: 600;
                        margin: 0;
                    }
                    .header .logo {
                        font-size: 28px;
                        margin-bottom: 10px;
                    }
                    .content {
                        padding: 30px 25px;
                    }
                    .content p {
                        margin-bottom: 16px;
                        font-size: 16px;
                    }
                    .button {
                        display: inline-block;
                        padding: 14px 28px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: #ffffff !important;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        text-align: center;
                        transition: opacity 0.2s;
                    }
                    .button:hover {
                        opacity: 0.9;
                    }
                    .button-container {
                        text-align: center;
                        margin: 25px 0;
                    }
                    .info-box {
                        background: #f8f9fa;
                        border-left: 4px solid #667eea;
                        padding: 15px 20px;
                        margin: 20px 0;
                        border-radius: 0 8px 8px 0;
                    }
                    .warning-box {
                        background: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px 20px;
                        margin: 20px 0;
                        border-radius: 0 8px 8px 0;
                    }
                    .success-box {
                        background: #d1fae5;
                        border-left: 4px solid #10b981;
                        padding: 15px 20px;
                        margin: 20px 0;
                        border-radius: 0 8px 8px 0;
                    }
                    .error-box {
                        background: #fee2e2;
                        border-left: 4px solid #ef4444;
                        padding: 15px 20px;
                        margin: 20px 0;
                        border-radius: 0 8px 8px 0;
                    }
                    .metadata {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .metadata h3 {
                        font-size: 14px;
                        color: #666;
                        text-transform: uppercase;
                        margin-bottom: 12px;
                    }
                    .metadata-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .metadata-item:last-child {
                        border-bottom: none;
                    }
                    .metadata-label {
                        color: #666;
                        font-weight: 500;
                    }
                    .metadata-value {
                        color: #333;
                        font-weight: 600;
                    }
                    .link-text {
                        color: #667eea;
                        word-break: break-all;
                        font-size: 14px;
                    }
                    .footer {
                        background: #f8f9fa;
                        padding: 20px;
                        text-align: center;
                        border-top: 1px solid #e5e7eb;
                    }
                    .footer p {
                        font-size: 12px;
                        color: #666;
                        margin: 5px 0;
                    }
                    .footer a {
                        color: #667eea;
                        text-decoration: none;
                    }
                    @media only screen and (max-width: 600px) {
                        .wrapper {
                            padding: 10px;
                        }
                        .content {
                            padding: 20px 15px;
                        }
                        .header {
                            padding: 20px 15px;
                        }
                        .button {
                            display: block;
                            width: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        ${content}
                        <div class="footer">
                            <p>© ${currentYear} ${churchName}. All rights reserved.</p>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    profileUpdateLinkTemplate(data) {
        const expiresAt = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : '30 days from now';
        const content = `
            <div class="header">
                <div class="logo">🎉</div>
                <h1>Welcome to ${data.churchName || 'Our Church'}!</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.firstName} ${data.lastName || ''}</strong>,</p>
                
                <p>We're excited to have you as part of our church community! To help us serve you better, please take a moment to complete your profile.</p>
                
                <div class="warning-box">
                    <strong>⏰ Important:</strong> This link will expire on <strong>${expiresAt}</strong>.
                </div>
                
                <div class="button-container">
                    <a href="${data.link}" class="button">Complete Your Profile</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p class="link-text">${data.link}</p>
                
                <p style="margin-top: 30px;">God bless,<br><strong>${data.churchName || 'Your Church Family'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    memberWelcomeTemplate(data) {
        const content = `
            <div class="header">
                <div class="logo">👋</div>
                <h1>Welcome to ${data.churchName || 'Our Church'}!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${data.firstName || data.userName}</strong>,</p>
                
                <p>We are thrilled to welcome you to our church family! Your presence means so much to us, and we're grateful that you've chosen to be part of our community.</p>
                
                <div class="success-box">
                    <strong>✅ You're all set!</strong> Your profile has been created successfully.
                </div>
                
                <p>Here are some ways to get connected:</p>
                <ul style="margin: 15px 0; padding-left: 20px;">
                    <li>Join us for Sunday services</li>
                    <li>Connect with a small group</li>
                    <li>Volunteer and serve</li>
                    <li>Attend upcoming events</li>
                </ul>
                
                ${data.actionUrl ? `
                    <div class="button-container">
                        <a href="${data.actionUrl}" class="button">Visit Our Portal</a>
                    </div>
                ` : ''}
                
                <p>We look forward to walking alongside you in your faith journey!</p>
                
                <p style="margin-top: 30px;">Blessings,<br><strong>${data.churchName || 'Your Church Family'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    birthdayTemplate(data) {
        const content = `
            <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <div class="logo">🎂</div>
                <h1>Happy Birthday!</h1>
            </div>
            <div class="content" style="text-align: center;">
                <p style="font-size: 20px;">Dear <strong>${data.firstName}</strong>,</p>
                
                <p style="font-size: 18px;">🎈 Wishing you a wonderful birthday filled with joy, love, and countless blessings! 🎈</p>
                
                <div style="margin: 30px 0;">
                    <p style="font-size: 48px;">🎉🎁🎊</p>
                </div>
                
                <div class="info-box" style="text-align: left;">
                    <em>"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you."</em>
                    <br><strong>— Numbers 6:24-25</strong>
                </div>
                
                <p>May this new year of your life bring you closer to God and fill you with His peace and love.</p>
                
                <p style="margin-top: 30px;">With love,<br><strong>${data.churchName || 'Your Church Family'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    anniversaryTemplate(data) {
        const content = `
            <div class="header" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);">
                <div class="logo">💍</div>
                <h1>Happy Anniversary!</h1>
            </div>
            <div class="content" style="text-align: center;">
                <p style="font-size: 20px;">Dear <strong>${data.firstName}</strong>,</p>
                
                <p style="font-size: 18px;">💕 Congratulations on your wedding anniversary! 💕</p>
                
                <div style="margin: 30px 0;">
                    <p style="font-size: 48px;">💒💑❤️</p>
                </div>
                
                <p>May your love continue to grow stronger with each passing year, and may God continue to bless your marriage abundantly.</p>
                
                <div class="info-box" style="text-align: left;">
                    <em>"Two are better than one, because they have a good return for their labor."</em>
                    <br><strong>— Ecclesiastes 4:9</strong>
                </div>
                
                <p style="margin-top: 30px;">With love and blessings,<br><strong>${data.churchName || 'Your Church Family'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    eventReminderTemplate(data) {
        const content = `
            <div class="header">
                <div class="logo">📅</div>
                <h1>Event Reminder</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.firstName}</strong>,</p>
                
                <p>This is a friendly reminder about an upcoming event!</p>
                
                <div class="metadata">
                    <h3>Event Details</h3>
                    <div class="metadata-item">
                        <span class="metadata-label">Event</span>
                        <span class="metadata-value">${data.eventName}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Date & Time</span>
                        <span class="metadata-value">${data.eventDate}</span>
                    </div>
                    ${data.eventLocation ? `
                        <div class="metadata-item">
                            <span class="metadata-label">Location</span>
                            <span class="metadata-value">${data.eventLocation}</span>
                        </div>
                    ` : ''}
                </div>
                
                <p>We're looking forward to seeing you there!</p>
                
                ${data.actionUrl ? `
                    <div class="button-container">
                        <a href="${data.actionUrl}" class="button">View Event Details</a>
                    </div>
                ` : ''}
                
                <p style="margin-top: 30px;">See you soon,<br><strong>${data.churchName || 'Your Church Family'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    eventRegistrationTemplate(data) {
        const content = `
            <div class="header">
                <div class="logo">✅</div>
                <h1>Registration Confirmed!</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.firstName}</strong>,</p>
                
                <p>Your registration has been confirmed for the following event:</p>
                
                <div class="success-box">
                    <strong>✅ You're registered!</strong> We've saved your spot.
                </div>
                
                <div class="metadata">
                    <h3>Event Details</h3>
                    <div class="metadata-item">
                        <span class="metadata-label">Event</span>
                        <span class="metadata-value">${data.eventName || data.metadata?.eventName}</span>
                    </div>
                    ${data.eventDate || data.metadata?.eventDate ? `
                        <div class="metadata-item">
                            <span class="metadata-label">Date & Time</span>
                            <span class="metadata-value">${data.eventDate || data.metadata?.eventDate}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${data.actionUrl ? `
                    <div class="button-container">
                        <a href="${data.actionUrl}" class="button">View Registration</a>
                    </div>
                ` : ''}
                
                <p style="margin-top: 30px;">See you there,<br><strong>${data.churchName || 'Your Church Family'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    expenseTemplate(data, status) {
        const statusConfig = {
            pending: {
                icon: '📋',
                title: 'New Expense Awaiting Approval',
                boxClass: 'info-box',
                message: 'A new expense has been submitted and requires your approval.',
            },
            approved: {
                icon: '✅',
                title: 'Expense Approved',
                boxClass: 'success-box',
                message: 'Great news! Your expense has been approved.',
            },
            rejected: {
                icon: '❌',
                title: 'Expense Rejected',
                boxClass: 'error-box',
                message: 'Unfortunately, your expense has been rejected.',
            },
        };
        const config = statusConfig[status];
        const content = `
            <div class="header">
                <div class="logo">${config.icon}</div>
                <h1>${config.title}</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.userName || data.firstName}</strong>,</p>
                
                <p>${data.message || config.message}</p>
                
                <div class="${config.boxClass}">
                    ${this.formatMetadata(data.metadata || {})}
                </div>
                
                ${data.actionUrl ? `
                    <div class="button-container">
                        <a href="${this.getFullUrl(data.actionUrl)}" class="button">View Details</a>
                    </div>
                ` : ''}
                
                <p style="margin-top: 30px;">Best regards,<br><strong>${data.churchName || 'Church Management System'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    passwordResetTemplate(data) {
        const content = `
            <div class="header">
                <div class="logo">🔐</div>
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.firstName || data.userName}</strong>,</p>
                
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div class="warning-box">
                    <strong>⏰ Important:</strong> This link will expire in ${data.expiryTime || '1 hour'}.
                </div>
                
                <div class="button-container">
                    <a href="${data.link || data.actionUrl}" class="button">Reset Password</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                    If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                </p>
                
                <p class="link-text">Link: ${data.link || data.actionUrl}</p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    accountVerificationTemplate(data) {
        const content = `
            <div class="header">
                <div class="logo">📧</div>
                <h1>Verify Your Email</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.firstName || data.userName}</strong>,</p>
                
                <p>Thank you for creating an account! Please verify your email address to get started:</p>
                
                <div class="button-container">
                    <a href="${data.link || data.actionUrl}" class="button">Verify Email</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                    If you didn't create an account, you can safely ignore this email.
                </p>
                
                <p class="link-text">Link: ${data.link || data.actionUrl}</p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    generalTemplate(data) {
        const content = `
            <div class="header">
                <h1>${data.title || 'Notification'}</h1>
            </div>
            <div class="content">
                <p>Hi <strong>${data.userName || data.firstName || 'there'}</strong>,</p>
                
                <p>${data.message}</p>
                
                ${data.metadata ? `
                    <div class="info-box">
                        ${this.formatMetadata(data.metadata)}
                    </div>
                ` : ''}
                
                ${data.actionUrl ? `
                    <div class="button-container">
                        <a href="${this.getFullUrl(data.actionUrl)}" class="button">View Details</a>
                    </div>
                ` : ''}
                
                <p style="margin-top: 30px;">Best regards,<br><strong>${data.churchName || 'Church Management System'}</strong></p>
            </div>
        `;
        return this.getBaseTemplate(content, data);
    }
    formatMetadata(metadata) {
        return Object.entries(metadata)
            .filter(([key, value]) => value !== undefined && value !== null)
            .map(([key, value]) => {
            const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace(/_/g, ' ');
            return `<p><strong>${label}:</strong> ${value}</p>`;
        })
            .join('');
    }
    getFullUrl(url) {
        if (url.startsWith('http')) {
            return url;
        }
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    // ============================================
    // VERIFICATION & STATUS METHODS
    // ============================================
    /**
     * Verify email configuration
     */
    async verifyEmailConfiguration() {
        if (!this.isEmailConfigured || !this.emailTransporter) {
            return { success: false, message: 'Email not configured' };
        }
        try {
            // FIXED: Added null check before calling verify
            await this.emailTransporter.verify();
            return { success: true, message: 'Email configuration verified' };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    /**
     * Get notification service status
     */
    getServiceStatus() {
        return {
            email: { configured: this.isEmailConfigured },
            sms: { configured: this.isSMSConfigured },
            whatsapp: { configured: this.isSMSConfigured && !!process.env.TWILIO_WHATSAPP_NUMBER },
        };
    }
}
exports.NotificationService = NotificationService;
// Export singleton instance
exports.notificationService = new NotificationService();
//# sourceMappingURL=NotificationService.js.map