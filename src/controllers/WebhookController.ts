// // src/controllers/WebhookController.ts
// import { Request, Response } from 'express';
// import { asyncHandler } from '@utils/asyncHandler';
// import { SmsRepository } from '@repositories/SmsRepository';
// import { EmailRepository } from '@repositories/EmailRepository';
// import { pool } from '@config/database';
// import logger from '@config/logger';
//
// const smsRepository = new SmsRepository();
// const emailRepository = new EmailRepository();
//
// export class WebhookController {
//     // ============================================================================
//     // SENDCHAMP SMS WEBHOOK
//     // ============================================================================
//
//     static handleSmsDeliveryReport = asyncHandler(async (req: Request, res: Response) => {
//         const payload = req.body;
//
//         logger.info('Sendchamp SMS Webhook Received:', payload);
//
//         // Log webhook
//         await pool.query(
//             `INSERT INTO webhook_logs (provider, event_type, message_id, payload)
//              VALUES ($1, $2, $3, $4)`,
//             ['sendchamp', 'sms_delivery', payload.id || payload.message_id, JSON.stringify(payload)]
//         );
//
//         try {
//             // Sendchamp webhook payload structure:
//             // {
//             //   id: "message_id",
//             //   status: "delivered" | "failed" | "sent",
//             //   phone_number: "+2348012345678",
//             //   delivery_time: "2024-01-01T12:00:00Z"
//             // }
//
//             const messageId = payload.id || payload.message_id;
//             if (!messageId) {
//                 logger.warn('Webhook missing message ID');
//                 return res.status(200).json({ success: true, message: 'No message ID' });
//             }
//
//             // Find message by provider ID
//             const message = await smsRepository.getMessageByProviderId(messageId);
//             if (!message) {
//                 logger.warn(`Message not found for provider ID: ${messageId}`);
//                 return res.status(200).json({ success: true, message: 'Message not found' });
//             }
//
//             // Map Sendchamp status to our status
//             let status: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected' = 'pending';
//             let deliveryStatus = payload.status;
//
//             switch (payload.status?.toLowerCase()) {
//                 case 'delivered':
//                     status = 'delivered';
//                     break;
//                 case 'sent':
//                     status = 'sent';
//                     break;
//                 case 'failed':
//                 case 'rejected':
//                     status = 'failed';
//                     break;
//             }
//
//             // Update message status
//             await smsRepository.updateMessageStatus(message.id, status);
//
//             // Update provider-specific fields
//             await smsRepository.updateMessageWithProvider(message.id, {
//                 provider_status: payload.status,
//                 delivery_status: deliveryStatus,
//                 delivery_time: payload.delivery_time ? new Date(payload.delivery_time) : undefined,
//                 metadata: payload,
//             });
//
//             // Mark webhook as processed
//             await pool.query(
//                 `UPDATE webhook_logs SET processed = true WHERE message_id = $1 AND provider = 'sendchamp'`,
//                 [messageId]
//             );
//
//             logger.info(`SMS delivery status updated for message ${message.id}: ${status}`);
//
//             res.status(200).json({ success: true });
//         } catch (error: any) {
//             logger.error('Error processing SMS webhook:', error);
//
//             // Log error
//             await pool.query(
//                 `UPDATE webhook_logs SET error_message = $1 WHERE message_id = $2 AND provider = 'sendchamp'`,
//                 [error.message, payload.id || payload.message_id]
//             );
//
//             res.status(200).json({ success: false, error: error.message });
//         }
//     });
//
//     // ============================================================================
//     // SENDCHAMP EMAIL WEBHOOK
//     // ============================================================================
//
//     static handleEmailDeliveryReport = asyncHandler(async (req: Request, res: Response) => {
//         const payload = req.body;
//
//         logger.info('Sendchamp Email Webhook Received:', payload);
//
//         // Log webhook
//         await pool.query(
//             `INSERT INTO webhook_logs (provider, event_type, message_id, payload)
//              VALUES ($1, $2, $3, $4)`,
//             ['sendchamp', 'email_event', payload.id || payload.message_id, JSON.stringify(payload)]
//         );
//
//         try {
//             // Sendchamp email webhook payload:
//             // {
//             //   id: "message_id",
//             //   event: "delivered" | "opened" | "clicked" | "bounced" | "spam",
//             //   email: "recipient@example.com",
//             //   timestamp: "2024-01-01T12:00:00Z"
//             // }
//
//             const messageId = payload.id || payload.message_id;
//             if (!messageId) {
//                 return res.status(200).json({ success: true, message: 'No message ID' });
//             }
//
//             // Find email message by provider ID
//             const message = await emailRepository.getMessageByProviderId(messageId);
//             if (!message) {
//                 logger.warn(`Email message not found for provider ID: ${messageId}`);
//                 return res.status(200).json({ success: true, message: 'Message not found' });
//             }
//
//             // Handle different email events
//             const event = payload.event?.toLowerCase();
//             const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
//
//             switch (event) {
//                 case 'delivered':
//                     await emailRepository.updateMessageStatus(message.id, 'delivered', {
//                         delivered_at: timestamp,
//                     });
//                     break;
//
//                 case 'opened':
//                     await emailRepository.updateMessageStatus(message.id, 'opened', {
//                         opened_at: timestamp,
//                     });
//                     // Update campaign opened count
//                     if (message.campaign_id) {
//                         await emailRepository.incrementCampaignCount(message.campaign_id, 'opened_count');
//                     }
//                     break;
//
//                 case 'clicked':
//                     await emailRepository.updateMessageStatus(message.id, 'clicked', {
//                         clicked_at: timestamp,
//                     });
//                     // Update campaign clicked count
//                     if (message.campaign_id) {
//                         await emailRepository.incrementCampaignCount(message.campaign_id, 'clicked_count');
//                     }
//                     break;
//
//                 case 'bounced':
//                     await emailRepository.updateMessageStatus(message.id, 'bounced', {
//                         bounced_at: timestamp,
//                         error_message: payload.reason || 'Email bounced',
//                     });
//                     // Update campaign bounced count
//                     if (message.campaign_id) {
//                         await emailRepository.incrementCampaignCount(message.campaign_id, 'bounced_count');
//                     }
//                     break;
//
//                 case 'spam':
//                 case 'complaint':
//                     await emailRepository.updateMessageStatus(message.id, 'spam', {
//                         error_message: 'Marked as spam',
//                     });
//                     break;
//
//                 case 'unsubscribed':
//                     await emailRepository.updateMessageStatus(message.id, 'unsubscribed');
//                     // Add to unsubscribe list
//                     await emailRepository.addUnsubscribe(message.church_id, message.email, payload.reason);
//                     if (message.campaign_id) {
//                         await emailRepository.incrementCampaignCount(message.campaign_id, 'unsubscribed_count');
//                     }
//                     break;
//             }
//
//             // Update provider metadata
//             await emailRepository.updateMessageMetadata(message.id, {
//                 provider_status: event,
//                 last_event: event,
//                 last_event_time: timestamp,
//                 webhook_payload: payload,
//             });
//
//             // Mark webhook as processed
//             await pool.query(
//                 `UPDATE webhook_logs SET processed = true WHERE message_id = $1 AND provider = 'sendchamp'`,
//                 [messageId]
//             );
//
//             logger.info(`Email event processed for message ${message.id}: ${event}`);
//
//             res.status(200).json({ success: true });
//         } catch (error: any) {
//             logger.error('Error processing email webhook:', error);
//
//             await pool.query(
//                 `UPDATE webhook_logs SET error_message = $1 WHERE message_id = $2 AND provider = 'sendchamp'`,
//                 [error.message, payload.id || payload.message_id]
//             );
//
//             res.status(200).json({ success: false, error: error.message });
//         }
//     });
//
//     // ============================================================================
//     // SENDCHAMP WHATSAPP WEBHOOK
//     // ============================================================================
//
//     static handleWhatsAppWebhook = asyncHandler(async (req: Request, res: Response) => {
//         const payload = req.body;
//
//         logger.info('Sendchamp WhatsApp Webhook Received:', payload);
//
//         // Log webhook
//         await pool.query(
//             `INSERT INTO webhook_logs (provider, event_type, payload)
//              VALUES ($1, $2, $3)`,
//             ['sendchamp', 'whatsapp_event', JSON.stringify(payload)]
//         );
//
//         // TODO: Implement WhatsApp message status tracking
//
//         res.status(200).json({ success: true });
//     });
// }