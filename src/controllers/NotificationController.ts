// src/controllers/NotificationController.ts
import { Request, Response, NextFunction } from 'express';
import { pushNotificationService } from '@services/PushNotificationService';
import { emailService } from '@services/EmailService';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class NotificationController {
    // ==========================================================================
    // PUSH NOTIFICATION ENDPOINTS
    // ==========================================================================

    async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { subscription, locationEnabled } = req.body;
            const { churchId, id: memberId } = req.user!;

            const subscriptionId = await pushNotificationService.subscribe(
                churchId,
                memberId,
                subscription,
                locationEnabled
            );

            successResponse(res, { subscriptionId }, 'Push notification subscription created', 201);
        } catch (error) {
            next(error);
        }
    }

    async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { endpoint } = req.body;
            const { id: memberId } = req.user!;

            await pushNotificationService.unsubscribe(memberId, endpoint);
            successResponse(res, null, 'Push notification subscription removed');
        } catch (error) {
            next(error);
        }
    }

    async getVapidKey(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const publicKey = await pushNotificationService.getPublicVapidKey();

            if (!publicKey) {
                throw new AppError('Push notifications not configured', 503);
            }

            successResponse(res, { publicKey });
        } catch (error) {
            next(error);
        }
    }

    async sendToMember(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { memberId } = req.params;
            const { payload } = req.body;

            const result = await pushNotificationService.sendToMember(memberId, payload);

            if (!result.success) {
                throw new AppError(result.error || 'Failed to send notification', 400);
            }

            successResponse(res, result, 'Notification sent to member');
        } catch (error) {
            next(error);
        }
    }

    async sendToChurch(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { churchId } = req.user!;
            const { payload } = req.body;

            const result = await pushNotificationService.sendToChurch(churchId, payload);
            successResponse(res, result, 'Notification sent to church members');
        } catch (error) {
            next(error);
        }
    }

    async sendEventReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { churchId } = req.user!;
            const { eventName, eventTime, eventId } = req.body;

            const result = await pushNotificationService.sendEventReminder(
                churchId,
                eventName,
                eventTime,
                eventId
            );

            successResponse(res, result, 'Event reminder sent');
        } catch (error) {
            next(error);
        }
    }

    async sendProximityAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { churchId } = req.user!;
            const { message } = req.body;

            const result = await pushNotificationService.sendProximityAlert(churchId, message);
            successResponse(res, result, 'Proximity alert sent');
        } catch (error) {
            next(error);
        }
    }

    // ==========================================================================
    // EMAIL ENDPOINTS
    // ==========================================================================

    async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { to, subject, html, text, replyTo } = req.body;

            const result = await emailService.sendEmail({ to, subject, html, text, replyTo });

            if (!result.success) {
                throw new AppError(result.error || 'Failed to send email', 500);
            }

            successResponse(res, { messageId: result.messageId }, 'Email sent successfully');
        } catch (error) {
            next(error);
        }
    }

    async sendBulkEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { recipients, subject, html, text, batchSize } = req.body;

            const result = await emailService.sendBulkEmail({
                recipients,
                subject,
                html,
                text,
                batchSize,
            });

            successResponse(res, result, 'Bulk email completed');
        } catch (error) {
            next(error);
        }
    }

    async sendTemplateEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { template, recipientEmail, recipientName, data } = req.body;

            let success = false;

            switch (template) {
                case 'welcome':
                    success = await emailService.sendWelcomeEmail(
                        recipientEmail,
                        recipientName,
                        data.churchName
                    );
                    break;

                case 'event_reminder':
                    success = await emailService.sendEventReminder(
                        recipientEmail,
                        recipientName,
                        data.eventName,
                        new Date(data.eventDate),
                        data.eventLocation
                    );
                    break;

                case 'birthday':
                    success = await emailService.sendBirthdayGreeting(
                        recipientEmail,
                        recipientName,
                        data.churchName
                    );
                    break;

                case 'anniversary':
                    success = await emailService.sendAnniversaryGreeting(
                        recipientEmail,
                        recipientName,
                        data.spouseName,
                        data.years,
                        data.churchName
                    );
                    break;

                case 'first_timer':
                    success = await emailService.sendFirstTimerFollowUp(
                        recipientEmail,
                        recipientName,
                        data.churchName,
                        new Date(data.visitDate)
                    );
                    break;

                default:
                    throw new AppError('Invalid email template', 400);
            }

            if (!success) {
                throw new AppError('Failed to send template email', 500);
            }

            successResponse(res, { sent: true }, 'Template email sent successfully');
        } catch (error) {
            next(error);
        }
    }

    async verifyEmailConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const isConnected = await emailService.verifyConnection();
            successResponse(
                res,
                { connected: isConnected },
                isConnected ? 'Email service connected' : 'Email service not connected'
            );
        } catch (error) {
            next(error);
        }
    }
}

export const notificationController = new NotificationController();