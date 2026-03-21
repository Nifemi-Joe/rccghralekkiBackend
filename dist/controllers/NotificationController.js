"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = exports.NotificationController = void 0;
const PushNotificationService_1 = require("@services/PushNotificationService");
const EmailService_1 = require("@services/EmailService");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
class NotificationController {
    // ==========================================================================
    // PUSH NOTIFICATION ENDPOINTS
    // ==========================================================================
    async subscribe(req, res, next) {
        try {
            const { subscription, locationEnabled } = req.body;
            const { churchId, id: memberId } = req.user;
            const subscriptionId = await PushNotificationService_1.pushNotificationService.subscribe(churchId, memberId, subscription, locationEnabled);
            (0, responseHandler_1.successResponse)(res, { subscriptionId }, 'Push notification subscription created', 201);
        }
        catch (error) {
            next(error);
        }
    }
    async unsubscribe(req, res, next) {
        try {
            const { endpoint } = req.body;
            const { id: memberId } = req.user;
            await PushNotificationService_1.pushNotificationService.unsubscribe(memberId, endpoint);
            (0, responseHandler_1.successResponse)(res, null, 'Push notification subscription removed');
        }
        catch (error) {
            next(error);
        }
    }
    async getVapidKey(req, res, next) {
        try {
            const publicKey = await PushNotificationService_1.pushNotificationService.getPublicVapidKey();
            if (!publicKey) {
                throw new AppError_1.AppError('Push notifications not configured', 503);
            }
            (0, responseHandler_1.successResponse)(res, { publicKey });
        }
        catch (error) {
            next(error);
        }
    }
    async sendToMember(req, res, next) {
        try {
            const { memberId } = req.params;
            const { payload } = req.body;
            const result = await PushNotificationService_1.pushNotificationService.sendToMember(memberId, payload);
            if (!result.success) {
                throw new AppError_1.AppError(result.error || 'Failed to send notification', 400);
            }
            (0, responseHandler_1.successResponse)(res, result, 'Notification sent to member');
        }
        catch (error) {
            next(error);
        }
    }
    async sendToChurch(req, res, next) {
        try {
            const { churchId } = req.user;
            const { payload } = req.body;
            const result = await PushNotificationService_1.pushNotificationService.sendToChurch(churchId, payload);
            (0, responseHandler_1.successResponse)(res, result, 'Notification sent to church members');
        }
        catch (error) {
            next(error);
        }
    }
    async sendEventReminder(req, res, next) {
        try {
            const { churchId } = req.user;
            const { eventName, eventTime, eventId } = req.body;
            const result = await PushNotificationService_1.pushNotificationService.sendEventReminder(churchId, eventName, eventTime, eventId);
            (0, responseHandler_1.successResponse)(res, result, 'Event reminder sent');
        }
        catch (error) {
            next(error);
        }
    }
    async sendProximityAlert(req, res, next) {
        try {
            const { churchId } = req.user;
            const { message } = req.body;
            const result = await PushNotificationService_1.pushNotificationService.sendProximityAlert(churchId, message);
            (0, responseHandler_1.successResponse)(res, result, 'Proximity alert sent');
        }
        catch (error) {
            next(error);
        }
    }
    // ==========================================================================
    // EMAIL ENDPOINTS
    // ==========================================================================
    async sendEmail(req, res, next) {
        try {
            const { to, subject, html, text, replyTo } = req.body;
            const result = await EmailService_1.emailService.sendEmail({ to, subject, html, text, replyTo });
            if (!result.success) {
                throw new AppError_1.AppError(result.error || 'Failed to send email', 500);
            }
            (0, responseHandler_1.successResponse)(res, { messageId: result.messageId }, 'Email sent successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async sendBulkEmail(req, res, next) {
        try {
            const { recipients, subject, html, text, batchSize } = req.body;
            const result = await EmailService_1.emailService.sendBulkEmail({
                recipients,
                subject,
                html,
                text,
                batchSize,
            });
            (0, responseHandler_1.successResponse)(res, result, 'Bulk email completed');
        }
        catch (error) {
            next(error);
        }
    }
    async sendTemplateEmail(req, res, next) {
        try {
            const { template, recipientEmail, recipientName, data } = req.body;
            let success = false;
            switch (template) {
                case 'welcome':
                    success = await EmailService_1.emailService.sendWelcomeEmail(recipientEmail, recipientName, data.churchName);
                    break;
                case 'event_reminder':
                    success = await EmailService_1.emailService.sendEventReminder(recipientEmail, recipientName, data.eventName, new Date(data.eventDate), data.eventLocation);
                    break;
                case 'birthday':
                    success = await EmailService_1.emailService.sendBirthdayGreeting(recipientEmail, recipientName, data.churchName);
                    break;
                case 'anniversary':
                    success = await EmailService_1.emailService.sendAnniversaryGreeting(recipientEmail, recipientName, data.spouseName, data.years, data.churchName);
                    break;
                case 'first_timer':
                    success = await EmailService_1.emailService.sendFirstTimerFollowUp(recipientEmail, recipientName, data.churchName, new Date(data.visitDate));
                    break;
                default:
                    throw new AppError_1.AppError('Invalid email template', 400);
            }
            if (!success) {
                throw new AppError_1.AppError('Failed to send template email', 500);
            }
            (0, responseHandler_1.successResponse)(res, { sent: true }, 'Template email sent successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async verifyEmailConnection(req, res, next) {
        try {
            const isConnected = await EmailService_1.emailService.verifyConnection();
            (0, responseHandler_1.successResponse)(res, { connected: isConnected }, isConnected ? 'Email service connected' : 'Email service not connected');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
exports.notificationController = new NotificationController();
//# sourceMappingURL=NotificationController.js.map