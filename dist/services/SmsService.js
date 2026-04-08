"use strict";
// src/services/SmsService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const SmsRepository_1 = require("@repositories/SmsRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const GroupRepository_1 = require("@repositories/GroupRepository");
const FollowUpRepository_1 = require("@repositories/FollowUpRepository");
const WalletService_1 = require("@services/WalletService");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const termii_1 = require("@config/termii");
const database_1 = require("@/config/database");
class SmsService {
    constructor() {
        this.smsRepository = new SmsRepository_1.SmsRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.groupRepository = new GroupRepository_1.GroupRepository();
        this.followUpRepository = new FollowUpRepository_1.FollowUpRepository();
        this.walletService = new WalletService_1.WalletService();
    }
    // ============================================================================
    // FOLLOW-UP MESSAGING
    // ============================================================================
    /**
     * Send follow-up message via SMS
     */
    async sendFollowUpSms(options) {
        const { churchId, userId, assignmentId, firstTimerId, to, message, recipientName } = options;
        try {
            const termii = (0, termii_1.getTermii)();
            const units = Math.ceil(message.length / 160);
            // Check balance
            const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', units);
            if (!balanceCheck.sufficient) {
                throw new AppError_1.AppError(`Insufficient SMS balance. Required: ${units} units. Available: ${balanceCheck.balanceInfo.total} units`, 400);
            }
            // Get sender ID
            const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
            const senderId = defaultSender?.sender_id || process.env.TERMII_SENDER_ID || 'ChurchMS';
            // Format phone
            const formattedPhone = this.formatPhoneNumber(to);
            // Personalize message
            const personalizedMessage = this.personalize(message, recipientName);
            // Send via Termii
            let externalId;
            let deliveryStatus = 'pending';
            try {
                const result = await termii.sendSMS({
                    to: formattedPhone,
                    from: senderId,
                    sms: personalizedMessage,
                });
                externalId = result.message_id;
                deliveryStatus = 'sent';
                // Debit balance if using local wallet
                if (!balanceCheck.useTermii && balanceCheck.balanceInfo.local >= units) {
                    await this.walletService.debitBalance(churchId, 'sms', units, {
                        reference: `followup-${assignmentId}`,
                        description: `Follow-up SMS to ${formattedPhone}`,
                    }, userId);
                }
                logger_1.default.info(`Follow-up SMS sent successfully to ${formattedPhone}`);
            }
            catch (error) {
                logger_1.default.error('Error sending follow-up SMS via Termii:', error);
                deliveryStatus = 'failed';
                return {
                    success: false,
                    deliveryStatus,
                    error: error.message || 'Failed to send SMS',
                };
            }
            // Record activity in follow-up repository
            const activity = await this.followUpRepository.createMessageActivity(churchId, userId, {
                assignmentId,
                firstTimerId,
                channel: 'sms',
                content: personalizedMessage,
                status: deliveryStatus === 'sent' ? 'completed' : 'failed',
                externalMessageId: externalId,
                deliveryStatus,
            });
            return {
                success: true,
                messageId: activity.id,
                externalId,
                deliveryStatus,
            };
        }
        catch (error) {
            logger_1.default.error('Error in sendFollowUpSms:', error);
            return {
                success: false,
                deliveryStatus: 'failed',
                error: error.message,
            };
        }
    }
    /**
     * Send follow-up message via WhatsApp
     */
    async sendFollowUpWhatsApp(options) {
        const { churchId, userId, assignmentId, firstTimerId, to, message, recipientName } = options;
        try {
            const termii = (0, termii_1.getTermii)();
            const formattedPhone = this.formatPhoneNumber(to);
            const personalizedMessage = this.personalize(message, recipientName);
            let externalId;
            let deliveryStatus = 'pending';
            try {
                // Check if using Twilio WhatsApp or Termii WhatsApp
                if (process.env.WHATSAPP_PROVIDER === 'twilio') {
                    // Twilio WhatsApp implementation
                    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                    const result = await twilio.messages.create({
                        body: personalizedMessage,
                        to: `whatsapp:+${formattedPhone}`,
                        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                    });
                    externalId = result.sid;
                    deliveryStatus = 'sent';
                }
                else if (process.env.WHATSAPP_PROVIDER === 'termii') {
                    // Termii WhatsApp
                    const result = await termii.sendWhatsAppMessage({
                        phone_number: formattedPhone,
                        message: personalizedMessage,
                    });
                    externalId = result.message_id;
                    deliveryStatus = 'sent';
                }
                else {
                    // Default to Termii SMS as fallback with WhatsApp indicator
                    logger_1.default.warn('WhatsApp provider not configured, using SMS fallback');
                    return this.sendFollowUpSms(options);
                }
                logger_1.default.info(`Follow-up WhatsApp sent successfully to ${formattedPhone}`);
            }
            catch (error) {
                logger_1.default.error('Error sending follow-up WhatsApp:', error);
                deliveryStatus = 'failed';
                return {
                    success: false,
                    deliveryStatus,
                    error: error.message || 'Failed to send WhatsApp message',
                };
            }
            // Record activity
            const activity = await this.followUpRepository.createMessageActivity(churchId, userId, {
                assignmentId,
                firstTimerId,
                channel: 'whatsapp',
                content: personalizedMessage,
                status: deliveryStatus === 'sent' ? 'completed' : 'failed',
                externalMessageId: externalId,
                deliveryStatus,
            });
            return {
                success: true,
                messageId: activity.id,
                externalId,
                deliveryStatus,
            };
        }
        catch (error) {
            logger_1.default.error('Error in sendFollowUpWhatsApp:', error);
            return {
                success: false,
                deliveryStatus: 'failed',
                error: error.message,
            };
        }
    }
    /**
     * Send bulk follow-up messages
     */
    async sendBulkFollowUpMessages(churchId, userId, messages) {
        const results = [];
        let sent = 0;
        let failed = 0;
        for (const msg of messages) {
            let result;
            switch (msg.channel) {
                case 'sms':
                    result = await this.sendFollowUpSms({
                        churchId,
                        userId,
                        assignmentId: msg.assignmentId,
                        firstTimerId: msg.firstTimerId,
                        channel: 'sms',
                        to: msg.to,
                        message: msg.message,
                        recipientName: msg.recipientName,
                    });
                    break;
                case 'whatsapp':
                    result = await this.sendFollowUpWhatsApp({
                        churchId,
                        userId,
                        assignmentId: msg.assignmentId,
                        firstTimerId: msg.firstTimerId,
                        channel: 'whatsapp',
                        to: msg.to,
                        message: msg.message,
                        recipientName: msg.recipientName,
                    });
                    break;
                default:
                    result = {
                        success: false,
                        deliveryStatus: 'failed',
                        error: `Unsupported channel: ${msg.channel}`,
                    };
            }
            results.push(result);
            if (result.success) {
                sent++;
            }
            else {
                failed++;
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return { sent, failed, results };
    }
    /**
     * Process template variables for follow-up messages
     */
    processFollowUpTemplate(template, variables) {
        let processed = template;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
            processed = processed.replace(regex, value);
        }
        return processed;
    }
    /**
     * Get template variables from first timer and church data
     */
    async getFollowUpTemplateVariables(churchId, firstTimerId) {
        const ftResult = await database_1.pool.query('SELECT * FROM first_timers WHERE id = $1 AND church_id = $2', [firstTimerId, churchId]);
        const churchResult = await database_1.pool.query('SELECT name FROM churches WHERE id = $1', [churchId]);
        const firstTimer = ftResult.rows[0];
        const church = churchResult.rows[0];
        if (!firstTimer) {
            return {};
        }
        const visitDate = firstTimer.first_visit_date
            ? new Date(firstTimer.first_visit_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : '';
        return {
            first_name: firstTimer.first_name || '',
            last_name: firstTimer.last_name || '',
            full_name: `${firstTimer.first_name || ''} ${firstTimer.last_name || ''}`.trim(),
            email: firstTimer.email || '',
            phone: firstTimer.phone || '',
            visit_date: visitDate,
            church_name: church?.name || '',
        };
    }
    // ============================================================================
    // SENDER ID METHODS
    // ============================================================================
    async requestSenderId(churchId, data, userId) {
        try {
            if (!/^[A-Za-z0-9]{3,11}$/.test(data.senderId)) {
                throw new AppError_1.AppError('Sender ID must be 3-11 alphanumeric characters', 400);
            }
            if (!data.useCase || data.useCase.trim() === '') {
                throw new AppError_1.AppError('Use case is required', 400);
            }
            const termii = (0, termii_1.getTermii)();
            const churchQuery = await database_1.pool.query('SELECT name FROM churches WHERE id = $1', [churchId]);
            const churchName = churchQuery.rows[0]?.name || 'Church';
            logger_1.default.info(`Requesting sender ID: ${data.senderId} for church: ${churchName}`);
            const termiiResult = await termii.requestSenderId({
                sender_id: data.senderId.toUpperCase(),
                useCase: data.useCase.trim(),
                company: churchName,
            });
            logger_1.default.info('Sender Id requested. You will be contacted by your account manager.');
            const senderIdRecord = await this.smsRepository.createOrUpdateSenderId(churchId, {
                senderId: data.senderId.toUpperCase(),
                useCase: data.useCase.trim()
            }, userId);
            if (termiiResult) {
                await this.smsRepository.updateSenderId(senderIdRecord.id, {
                    status: termiiResult.status || 'pending',
                    use_case: data.useCase.trim(),
                    description: `Termii Request ID: ${termiiResult.id || 'pending'}`,
                });
            }
            const updated = await this.smsRepository.getSenderIdById(senderIdRecord.id);
            return updated || senderIdRecord;
        }
        catch (error) {
            logger_1.default.error('Error requesting sender ID:', error);
            if (error.code === '23505') {
                throw new AppError_1.AppError('This Sender ID has already been requested for this church.', 409);
            }
            throw new AppError_1.AppError(error.message || 'Failed to request sender ID', 400);
        }
    }
    async getSenderIds(churchId) {
        return this.smsRepository.getSenderIds(churchId);
    }
    async getApprovedSenderIds(churchId) {
        const senderIds = await this.smsRepository.getSenderIds(churchId);
        return senderIds.filter(s => s.status === 'approved' ||
            s.status === 'active' ||
            s.status === 'pending');
    }
    /**
     * Sync local sender IDs with Termii to get latest statuses
     */
    async syncSenderIdsWithTermii(churchId) {
        try {
            logger_1.default.info(`Syncing sender IDs with Termii for church: ${churchId}`);
            const termii = (0, termii_1.getTermii)();
            // Fetch all local sender IDs for this church
            const localSenderIds = await this.smsRepository.getSenderIds(churchId);
            if (localSenderIds.length === 0) {
                logger_1.default.info(`No sender IDs found for church ${churchId}, nothing to sync`);
                return;
            }
            // Attempt to fetch sender IDs from Termii
            let termiiSenderIds = [];
            try {
                const termiiResponse = await termii.getSenderIds();
                termiiSenderIds = termiiResponse?.data || termiiResponse || [];
            }
            catch (termiiError) {
                logger_1.default.warn(`Could not fetch sender IDs from Termii: ${termiiError.message}. ` +
                    `Will attempt to verify individual sender IDs.`);
            }
            // Build a lookup map from Termii's response
            const termiiStatusMap = new Map();
            for (const ts of termiiSenderIds) {
                if (ts.sender_id) {
                    termiiStatusMap.set(ts.sender_id.toUpperCase(), ts.status);
                }
            }
            // Update local records with Termii statuses
            for (const localSender of localSenderIds) {
                const termiiStatus = termiiStatusMap.get(localSender.sender_id.toUpperCase());
                if (termiiStatus && termiiStatus !== localSender.status) {
                    logger_1.default.info(`Updating sender ID ${localSender.sender_id} status: ` +
                        `${localSender.status} -> ${termiiStatus}`);
                    await this.smsRepository.updateSenderId(localSender.id, {
                        status: termiiStatus,
                    });
                }
            }
            logger_1.default.info(`Sender ID sync completed for church ${churchId}`);
        }
        catch (error) {
            logger_1.default.error('Error syncing sender IDs with Termii:', error);
            throw new AppError_1.AppError(error.message || 'Failed to sync sender IDs with Termii', 500);
        }
    }
    async setDefaultSenderId(churchId, senderIdId) {
        return this.smsRepository.setDefaultSenderId(churchId, senderIdId);
    }
    async deleteSenderId(churchId, senderIdId) {
        const deleted = await this.smsRepository.deleteSenderId(churchId, senderIdId);
        if (!deleted) {
            throw new AppError_1.AppError('Sender ID not found', 404);
        }
    }
    // src/services/SmsService.ts
    // ADD this method inside the SmsService class,
    // placed after the getCampaignReport method in the CAMPAIGN METHODS section.
    // ============================================================================
    // SCHEDULED CAMPAIGN PROCESSING
    // ============================================================================
    /**
     * Find all scheduled campaigns whose scheduledAt time has passed
     * and process (send) them.
     */
    async processScheduledCampaigns() {
        try {
            logger_1.default.info('Checking for scheduled SMS campaigns to process...');
            // Pull campaigns that are scheduled and due
            const dueCampaigns = await this.smsRepository.getDueScheduledCampaigns();
            if (dueCampaigns.length === 0) {
                logger_1.default.info('No scheduled SMS campaigns are due at this time');
                return;
            }
            logger_1.default.info(`Found ${dueCampaigns.length} scheduled SMS campaign(s) to process`);
            for (const campaign of dueCampaigns) {
                try {
                    logger_1.default.info(`Processing scheduled campaign ${campaign.id} for church ${campaign.church_id}`);
                    // Mark as sending immediately to prevent duplicate processing
                    await this.smsRepository.updateCampaign(campaign.church_id, campaign.id, { status: 'sending' });
                    // Reconstruct the ComposeSmsDTO from the stored campaign
                    const campaignData = {
                        message: campaign.message,
                        destinationType: campaign.destination_type || 'phone_numbers',
                        sendOption: 'now',
                        senderId: campaign.sender_id,
                        groupIds: campaign.group_ids,
                        memberIds: campaign.member_ids,
                        contactListIds: campaign.contact_list_ids,
                        phoneNumbers: campaign.phone_numbers,
                        uploadedContacts: campaign.uploaded_contacts,
                        selectAllContacts: campaign.select_all_contacts,
                    };
                    // Resolve recipients
                    const recipients = await this.getRecipients(campaign.church_id, campaignData);
                    if (recipients.length === 0) {
                        logger_1.default.warn(`No recipients found for scheduled campaign ${campaign.id}; marking as failed`);
                        await this.smsRepository.updateCampaign(campaign.church_id, campaign.id, { status: 'failed' });
                        continue;
                    }
                    // Check balance before sending
                    const unitsPerMessage = Math.ceil(campaign.message.length / 160);
                    const totalUnitsRequired = recipients.length * unitsPerMessage;
                    const balanceCheck = await this.walletService.checkSufficientBalance(campaign.church_id, 'sms', totalUnitsRequired);
                    if (!balanceCheck.sufficient) {
                        logger_1.default.warn(`Insufficient balance for scheduled campaign ${campaign.id}. ` +
                            `Required: ${totalUnitsRequired}, Available: ${balanceCheck.balanceInfo.total}`);
                        await this.smsRepository.updateCampaign(campaign.church_id, campaign.id, { status: 'failed' });
                        continue;
                    }
                    // Update recipient count
                    await this.smsRepository.updateCampaign(campaign.church_id, campaign.id, { total_recipients: recipients.length });
                    // Fire-and-forget the actual send (same as composeSms 'now' path)
                    this.processCampaign(campaign.church_id, campaign.id, recipients, campaign.message, campaign.sender_id, campaign.created_by, balanceCheck.useTermii).catch(err => {
                        logger_1.default.error(`Error processing scheduled campaign ${campaign.id}:`, err);
                    });
                    logger_1.default.info(`Scheduled campaign ${campaign.id} handed off for sending`);
                }
                catch (campaignError) {
                    logger_1.default.error(`Error processing scheduled campaign ${campaign.id}:`, campaignError);
                    // Mark individual campaign as failed without stopping the loop
                    try {
                        await this.smsRepository.updateCampaign(campaign.church_id, campaign.id, { status: 'failed' });
                    }
                    catch (updateError) {
                        logger_1.default.error(`Could not mark campaign ${campaign.id} as failed:`, updateError);
                    }
                }
            }
            logger_1.default.info('Scheduled SMS campaign processing complete');
        }
        catch (error) {
            logger_1.default.error('Error in processScheduledCampaigns:', error);
            throw new AppError_1.AppError(error.message || 'Failed to process scheduled campaigns', 500);
        }
    }
    // ============================================================================
    // BALANCE METHODS
    // ============================================================================
    async getBalance(churchId) {
        return this.walletService.getComprehensiveBalance(churchId, 'sms');
    }
    async getSimpleBalance(churchId) {
        try {
            const termii = (0, termii_1.getTermii)();
            const localBalance = await this.walletService.getBalance(churchId, 'sms');
            let termiiBalance;
            try {
                termiiBalance = await termii.getBalance();
            }
            catch (error) {
                logger_1.default.error('Error fetching Termii balance:', error);
            }
            return {
                local: localBalance,
                termii: termiiBalance,
            };
        }
        catch (error) {
            logger_1.default.error('Error getting SMS balance:', error);
            throw error;
        }
    }
    // ============================================================================
    // COMPOSE & SEND METHODS
    // ============================================================================
    async composeSms(churchId, data, userId) {
        try {
            logger_1.default.info(`Composing SMS for church ${churchId}`, { data });
            const recipients = await this.getRecipients(churchId, data);
            if (recipients.length === 0) {
                throw new AppError_1.AppError('No valid recipients found', 400);
            }
            const messageLength = data.message.length;
            const unitsPerMessage = Math.ceil(messageLength / 160);
            const totalUnitsRequired = recipients.length * unitsPerMessage;
            logger_1.default.info(`SMS calculation: ${recipients.length} recipients × ` +
                `${unitsPerMessage} units = ${totalUnitsRequired} total units needed`);
            let useTermiiDirectly = false;
            if (data.sendOption === 'now') {
                const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', totalUnitsRequired);
                if (!balanceCheck.sufficient) {
                    const errorMessage = `Insufficient SMS balance. Required: ${totalUnitsRequired} units. ` +
                        `Local balance: ${balanceCheck.balanceInfo.local} units. ` +
                        `Termii balance: ₦${balanceCheck.balanceInfo.termii?.balance || 0}`;
                    throw new AppError_1.AppError(errorMessage, 400);
                }
                useTermiiDirectly = balanceCheck.useTermii;
            }
            const campaign = await this.smsRepository.createCampaign(churchId, data, userId);
            await this.smsRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });
            if (data.sendOption === 'now') {
                this.processCampaign(churchId, campaign.id, recipients, data.message, data.senderId, userId, useTermiiDirectly).catch(error => {
                    logger_1.default.error(`Error processing campaign ${campaign.id}:`, error);
                });
            }
            logger_1.default.info(`SMS campaign created: ${campaign.id} for church ${churchId}`);
            const updatedCampaign = await this.smsRepository.getCampaignById(churchId, campaign.id);
            if (!updatedCampaign) {
                throw new AppError_1.AppError('Failed to retrieve created campaign', 500);
            }
            return updatedCampaign;
        }
        catch (error) {
            logger_1.default.error('Error composing SMS:', error);
            throw error;
        }
    }
    async sendSingleSms(churchId, data, userId) {
        try {
            const termii = (0, termii_1.getTermii)();
            const units = Math.ceil(data.message.length / 160);
            const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', units);
            if (!balanceCheck.sufficient) {
                throw new AppError_1.AppError(`Insufficient SMS balance. Required: ${units} units. Available: ${balanceCheck.balanceInfo.total} units`, 400);
            }
            let senderId = data.senderId;
            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }
            if (!senderId) {
                senderId = process.env.TERMII_SENDER_ID || 'ChurchMS';
            }
            const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
            const message = await this.smsRepository.createMessage(churchId, {
                phoneNumber: formattedPhone,
                recipientName: data.recipientName,
                message: data.message,
                senderId: senderId,
                units,
            }, userId);
            try {
                const result = await termii.sendSMS({
                    to: formattedPhone,
                    from: senderId,
                    sms: data.message,
                });
                await this.smsRepository.updateMessageStatus(message.id, 'sent', result.message_id);
                if (!balanceCheck.useTermii && balanceCheck.balanceInfo.local >= units) {
                    await this.walletService.debitBalance(churchId, 'sms', units, {
                        reference: message.id,
                        description: `SMS sent to ${formattedPhone}`,
                    }, userId);
                }
                logger_1.default.info(`SMS sent successfully: ${message.id}`);
            }
            catch (error) {
                logger_1.default.error('Error sending SMS via Termii:', error);
                await this.smsRepository.updateMessageStatus(message.id, 'failed', undefined, error.message);
                throw new AppError_1.AppError('Failed to send SMS: ' + error.message, 500);
            }
            const updatedMessage = await this.smsRepository.getMessageById(message.id);
            return updatedMessage || message;
        }
        catch (error) {
            logger_1.default.error('Error sending single SMS:', error);
            throw error;
        }
    }
    // ============================================================================
    // CAMPAIGN PROCESSING
    // ============================================================================
    async processCampaign(churchId, campaignId, recipients, message, senderId, userId, useTermiiDirectly = false) {
        try {
            const termii = (0, termii_1.getTermii)();
            logger_1.default.info(`Processing campaign ${campaignId} with ${recipients.length} recipients`);
            await this.smsRepository.updateCampaign(churchId, campaignId, { status: 'sending' });
            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }
            if (!senderId) {
                senderId = process.env.TERMII_SENDER_ID || 'ChurchMS';
            }
            const unitsPerMessage = Math.ceil(message.length / 160);
            const messages = await this.smsRepository.createMessages(churchId, recipients.map(r => ({
                campaignId,
                memberId: r.memberId,
                phoneNumber: r.phoneNumber,
                recipientName: r.name,
                message: this.personalize(message, r.name),
                senderId,
                units: unitsPerMessage,
            })), userId);
            let sentCount = 0;
            let failedCount = 0;
            let totalCost = 0;
            const batchSize = 100;
            for (let i = 0; i < recipients.length; i += batchSize) {
                const batch = recipients.slice(i, i + batchSize);
                const batchMessages = messages.slice(i, i + batchSize);
                try {
                    const result = await termii.sendBulkSMS({
                        to: batch.map(r => r.phoneNumber),
                        from: senderId,
                        sms: message,
                    });
                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageStatus(msg.id, 'sent', result.message_id);
                        sentCount++;
                        totalCost += unitsPerMessage;
                    }
                }
                catch (error) {
                    logger_1.default.error(`Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);
                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageStatus(msg.id, 'failed', undefined, error.message);
                        failedCount++;
                    }
                }
                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            if (!useTermiiDirectly && totalCost > 0) {
                try {
                    const localBalance = await this.walletService.getBalance(churchId, 'sms');
                    if (localBalance >= totalCost) {
                        await this.walletService.debitBalance(churchId, 'sms', totalCost, {
                            reference: campaignId,
                            description: `SMS campaign: ${sentCount} messages sent`,
                        }, userId);
                    }
                }
                catch (debitError) {
                    logger_1.default.warn('Could not debit local balance:', debitError);
                }
            }
            await this.smsRepository.updateCampaign(churchId, campaignId, {
                status: failedCount === recipients.length ? 'failed' : 'sent',
                successful_count: sentCount,
                failed_count: failedCount,
                units_used: totalCost,
                sent_at: new Date(),
            });
            logger_1.default.info(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
        }
        catch (error) {
            logger_1.default.error('Error processing campaign:', error);
            await this.smsRepository.updateCampaign(churchId, campaignId, { status: 'failed' });
            throw error;
        }
    }
    // ============================================================================
    // RECIPIENT RESOLUTION
    // ============================================================================
    async getRecipients(churchId, data) {
        try {
            switch (data.destinationType) {
                case 'contacts':
                case 'contact_lists':
                    return await this.getContactListRecipients(churchId, data.contactListIds || [], data.selectAllContacts);
                case 'all_contacts':
                    return await this.getAllContacts(churchId);
                case 'groups':
                    return await this.getGroupRecipients(churchId, data.groupIds || []);
                case 'members':
                    return await this.getMemberRecipients(churchId, data.memberIds || []);
                case 'phone_numbers':
                    return this.getPhoneNumberRecipients(data.phoneNumbers || []);
                case 'uploaded':
                    return this.getUploadedRecipients(data.uploadedContacts || []);
                default:
                    throw new AppError_1.AppError('Invalid destination type', 400);
            }
        }
        catch (error) {
            logger_1.default.error('Error getting recipients:', error);
            throw error;
        }
    }
    async getContactListRecipients(churchId, contactListIds, selectAll) {
        const recipients = [];
        const seenPhones = new Set();
        try {
            let listsToProcess = contactListIds;
            if (selectAll) {
                const allLists = await this.smsRepository.getContactLists(churchId);
                listsToProcess = allLists.map(list => list.id);
            }
            for (const listId of listsToProcess) {
                const result = await this.smsRepository.getContactListItems(listId, 1, 10000);
                for (const contact of result.data) {
                    if (contact.phone_number) {
                        const formattedPhone = this.formatPhoneNumber(contact.phone_number);
                        if (!seenPhones.has(formattedPhone)) {
                            seenPhones.add(formattedPhone);
                            recipients.push({
                                phoneNumber: formattedPhone,
                                name: contact.name || undefined,
                            });
                        }
                    }
                }
            }
            return recipients;
        }
        catch (error) {
            logger_1.default.error('Error getting contact list recipients:', error);
            return [];
        }
    }
    async getAllContacts(churchId) {
        try {
            const members = await this.memberRepository.findAll({ churchId, limit: 10000 });
            return members.members
                .filter(m => m.phone)
                .map(m => ({
                phoneNumber: this.formatPhoneNumber(m.phone),
                name: `${m.first_name} ${m.last_name}`,
                memberId: m.id,
            }));
        }
        catch (error) {
            logger_1.default.error('Error getting all contacts:', error);
            return [];
        }
    }
    async getGroupRecipients(churchId, groupIds) {
        const recipients = [];
        const seenPhones = new Set();
        try {
            for (const groupId of groupIds) {
                const members = await this.memberRepository.getMembersByGroup(churchId, groupId);
                for (const member of members) {
                    if (member.phone) {
                        const formattedPhone = this.formatPhoneNumber(member.phone);
                        if (!seenPhones.has(formattedPhone)) {
                            seenPhones.add(formattedPhone);
                            recipients.push({
                                phoneNumber: formattedPhone,
                                name: `${member.first_name} ${member.last_name}`,
                                memberId: member.id,
                            });
                        }
                    }
                }
            }
            return recipients;
        }
        catch (error) {
            logger_1.default.error('Error getting group recipients:', error);
            return [];
        }
    }
    async getMemberRecipients(churchId, memberIds) {
        const recipients = [];
        try {
            for (const memberId of memberIds) {
                const member = await this.memberRepository.findById(memberId, churchId);
                if (member && member.phone && member.church_id === churchId) {
                    recipients.push({
                        phoneNumber: this.formatPhoneNumber(member.phone),
                        name: `${member.first_name} ${member.last_name}`,
                        memberId: member.id,
                    });
                }
            }
            return recipients;
        }
        catch (error) {
            logger_1.default.error('Error getting member recipients:', error);
            return [];
        }
    }
    getPhoneNumberRecipients(phoneNumbers) {
        return phoneNumbers
            .map(phone => phone.trim())
            .filter(phone => phone && this.isValidPhoneNumber(phone))
            .map(phone => ({
            phoneNumber: this.formatPhoneNumber(phone),
        }));
    }
    getUploadedRecipients(contacts) {
        return contacts
            .filter(c => c.phone && this.isValidPhoneNumber(c.phone))
            .map(c => ({
            phoneNumber: this.formatPhoneNumber(c.phone),
            name: c.name,
        }));
    }
    // ============================================================================
    // OTP & PROFILE UPDATE
    // ============================================================================
    async sendOtp(to, otp) {
        const message = `Your verification code is: ${otp}. ` +
            `This code expires in 10 minutes. Do not share this code with anyone.`;
        try {
            const termii = (0, termii_1.getTermii)();
            const formattedPhone = this.formatPhoneNumber(to);
            await termii.sendSMS({
                to: formattedPhone,
                from: process.env.SMS_SENDER_ID || 'ChurchMgmt',
                sms: message,
            });
            logger_1.default.info(`OTP SMS sent to ${formattedPhone}`);
        }
        catch (error) {
            logger_1.default.warn(`Failed to send OTP SMS via Termii to ${to}. Error: ${error.message}`);
            logger_1.default.info(`[SMS FALLBACK to ${to}]: ${message}`);
        }
    }
    async sendProfileUpdateLink(to, data) {
        const message = `${data.churchName}: Please update your profile using this link: ${data.updateLink}`;
        try {
            const termii = (0, termii_1.getTermii)();
            const formattedPhone = this.formatPhoneNumber(to);
            await termii.sendSMS({
                to: formattedPhone,
                from: process.env.SMS_SENDER_ID || 'ChurchMgmt',
                sms: message,
            });
            logger_1.default.info(`Profile update link SMS sent to ${formattedPhone}`);
        }
        catch (error) {
            logger_1.default.warn(`Failed to send profile update link SMS via Termii to ${to}. Error: ${error.message}`);
            logger_1.default.info(`[SMS FALLBACK to ${to}]: ${message}`);
        }
    }
    // ============================================================================
    // CAMPAIGN METHODS
    // ============================================================================
    async getCampaigns(filters) {
        return this.smsRepository.getCampaigns(filters);
    }
    async getCampaignById(churchId, campaignId) {
        const campaign = await this.smsRepository.getCampaignById(churchId, campaignId);
        if (!campaign) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return campaign;
    }
    async updateCampaign(churchId, campaignId, data) {
        const updated = await this.smsRepository.updateCampaign(churchId, campaignId, data);
        if (!updated) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return updated;
    }
    async deleteCampaign(churchId, campaignId) {
        const deleted = await this.smsRepository.deleteCampaign(churchId, campaignId);
        if (!deleted) {
            throw new AppError_1.AppError('Campaign not found or cannot be deleted', 404);
        }
    }
    async getDrafts(churchId) {
        return this.smsRepository.getDrafts(churchId);
    }
    async getScheduled(churchId) {
        return this.smsRepository.getScheduled(churchId);
    }
    // ============================================================================
    // MESSAGE METHODS
    // ============================================================================
    async getMessages(filters) {
        return this.smsRepository.getMessages(filters);
    }
    async getMessagesByCampaign(campaignId) {
        return this.smsRepository.getMessagesByCampaign(campaignId);
    }
    /**
     * Sync a single message's delivery status from Termii
     */
    async syncMessageStatus(messageId) {
        try {
            logger_1.default.info(`Syncing message status for message: ${messageId}`);
            // Fetch the message record from the repository
            const message = await this.smsRepository.getMessageById(messageId);
            if (!message) {
                throw new AppError_1.AppError('Message not found', 404);
            }
            // If there's no external ID we cannot query Termii
            if (!message.external_id && !message.termii_message_id) {
                logger_1.default.warn(`Message ${messageId} has no external Termii ID; cannot sync status`);
                return;
            }
            const externalId = message.termii_message_id || message.external_id;
            const termii = (0, termii_1.getTermii)();
            // Fetch delivery report from Termii
            let termiiStatus;
            try {
                const report = await termii.getMessageStatus(externalId);
                termiiStatus = report?.status || report?.delivery_status;
            }
            catch (termiiError) {
                logger_1.default.warn(`Could not fetch status from Termii for message ${messageId}: ` +
                    termiiError.message);
                return;
            }
            if (!termiiStatus) {
                logger_1.default.warn(`Termii returned no status for message ${messageId}`);
                return;
            }
            // Map Termii status to our internal status
            const internalStatus = this.mapTermiiStatus(termiiStatus);
            if (internalStatus !== message.status) {
                logger_1.default.info(`Updating message ${messageId} status: ${message.status} -> ${internalStatus}`);
                await this.smsRepository.updateMessageStatus(messageId, internalStatus, externalId);
            }
            logger_1.default.info(`Message status sync completed for message: ${messageId}`);
        }
        catch (error) {
            logger_1.default.error('Error syncing message status:', error);
            throw new AppError_1.AppError(error.message || 'Failed to sync message status', error.statusCode || 500);
        }
    }
    /**
     * Map Termii delivery status strings to our internal status values
     */
    mapTermiiStatus(termiiStatus) {
        const statusMap = {
            // Termii statuses -> internal statuses
            delivered: 'delivered',
            sent: 'sent',
            failed: 'failed',
            rejected: 'failed',
            expired: 'failed',
            undelivered: 'failed',
            pending: 'pending',
            accepted: 'sent',
            buffered: 'pending',
            enroute: 'pending',
        };
        return statusMap[termiiStatus.toLowerCase()] ?? 'pending';
    }
    // ============================================================================
    // REPLY METHODS
    // ============================================================================
    async getReplies(churchId, page = 1, limit = 20, unreadOnly = false) {
        return this.smsRepository.getReplies(churchId, page, limit, unreadOnly);
    }
    async markReplyAsRead(churchId, replyId) {
        return this.smsRepository.markReplyAsRead(churchId, replyId);
    }
    async markAllRepliesAsRead(churchId) {
        return this.smsRepository.markAllRepliesAsRead(churchId);
    }
    /**
     * Reply to an inbound SMS message
     */
    async replyToMessage(churchId, replyId, message, senderId, userId) {
        try {
            logger_1.default.info(`Replying to message ${replyId} for church ${churchId}`);
            // Fetch the original inbound reply to get the sender's phone number
            const replies = await this.smsRepository.getReplies(churchId, 1, 1000, false);
            const originalReply = replies.data.find((r) => r.id === replyId);
            if (!originalReply) {
                throw new AppError_1.AppError('Reply not found', 404);
            }
            const recipientPhone = originalReply.from ||
                originalReply.phone_number ||
                originalReply.sender_name;
            if (!recipientPhone) {
                throw new AppError_1.AppError('Cannot determine recipient phone number from original reply', 400);
            }
            // Resolve sender ID
            let resolvedSenderId = senderId;
            if (!resolvedSenderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                resolvedSenderId = defaultSender?.sender_id;
            }
            if (!resolvedSenderId) {
                resolvedSenderId = process.env.TERMII_SENDER_ID || 'ChurchMS';
            }
            // Check balance
            const units = Math.ceil(message.length / 160);
            const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', units);
            if (!balanceCheck.sufficient) {
                throw new AppError_1.AppError(`Insufficient SMS balance. Required: ${units} units. ` +
                    `Available: ${balanceCheck.balanceInfo.total} units`, 400);
            }
            const formattedPhone = this.formatPhoneNumber(recipientPhone);
            // Persist message record
            const outboundMessage = await this.smsRepository.createMessage(churchId, {
                phoneNumber: formattedPhone,
                recipientName: originalReply.name || originalReply.sender_name,
                message,
                senderId: resolvedSenderId,
                units,
            }, userId);
            // Send via Termii
            const termii = (0, termii_1.getTermii)();
            try {
                const result = await termii.sendSMS({
                    to: formattedPhone,
                    from: resolvedSenderId,
                    sms: message,
                });
                await this.smsRepository.updateMessageStatus(outboundMessage.id, 'sent', result.message_id);
                // Debit local wallet if applicable
                if (!balanceCheck.useTermii && balanceCheck.balanceInfo.local >= units) {
                    await this.walletService.debitBalance(churchId, 'sms', units, {
                        reference: outboundMessage.id,
                        description: `SMS reply to ${formattedPhone}`,
                    }, userId);
                }
                // Mark the original reply as read now that we've responded
                await this.smsRepository.markReplyAsRead(churchId, replyId);
                logger_1.default.info(`Reply SMS sent successfully: ${outboundMessage.id} to ${formattedPhone}`);
            }
            catch (error) {
                logger_1.default.error('Error sending reply SMS via Termii:', error);
                await this.smsRepository.updateMessageStatus(outboundMessage.id, 'failed', undefined, error.message);
                throw new AppError_1.AppError('Failed to send reply: ' + error.message, 500);
            }
            const updatedMessage = await this.smsRepository.getMessageById(outboundMessage.id);
            return updatedMessage || outboundMessage;
        }
        catch (error) {
            logger_1.default.error('Error in replyToMessage:', error);
            throw error instanceof AppError_1.AppError
                ? error
                : new AppError_1.AppError(error.message || 'Failed to reply to message', 500);
        }
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStats(churchId) {
        return this.smsRepository.getStats(churchId);
    }
    async getCampaignReport(churchId, campaignId) {
        const report = await this.smsRepository.getCampaignReport(churchId, campaignId);
        if (!report) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return report;
    }
    // ============================================================================
    // SMS HISTORY
    // ============================================================================
    /**
     * Get paginated SMS history across all churches (admin) or filtered by church.
     * Delegates to the messages query with optional filters.
     */
    async getSMSHistory(filters) {
        try {
            const page = filters.page ?? 1;
            const limit = filters.limit ?? 20;
            logger_1.default.info('Fetching SMS history', { filters });
            // Build a SmsFilters-compatible object
            const smsFilters = {
                churchId: filters.churchId || '',
                page,
                limit,
                startDate: filters.startDate,
                endDate: filters.endDate,
            };
            const result = await this.smsRepository.getMessages(smsFilters);
            return {
                data: result.data,
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching SMS history:', error);
            throw new AppError_1.AppError(error.message || 'Failed to fetch SMS history', error.statusCode || 500);
        }
    }
    // ============================================================================
    // CONTACT LIST METHODS
    // ============================================================================
    async getContactLists(churchId) {
        return this.smsRepository.getContactLists(churchId);
    }
    async createContactList(churchId, name, description, userId) {
        return this.smsRepository.createContactList(churchId, name, description, userId);
    }
    async getContactListById(churchId, listId) {
        const list = await this.smsRepository.getContactListById(churchId, listId);
        if (!list) {
            throw new AppError_1.AppError('Contact list not found', 404);
        }
        return list;
    }
    async updateContactList(churchId, listId, data) {
        const updated = await this.smsRepository.updateContactList(churchId, listId, data);
        if (!updated) {
            throw new AppError_1.AppError('Contact list not found', 404);
        }
        return updated;
    }
    async deleteContactList(churchId, listId) {
        const deleted = await this.smsRepository.deleteContactList(churchId, listId);
        if (!deleted) {
            throw new AppError_1.AppError('Contact list not found', 404);
        }
    }
    async addContactsToList(listId, contacts) {
        return this.smsRepository.addContactsToList(listId, contacts);
    }
    async getContactListItems(listId, page = 1, limit = 50) {
        return this.smsRepository.getContactListItems(listId, page, limit);
    }
    async removeContactFromList(listId, contactId) {
        const removed = await this.smsRepository.removeContactFromList(listId, contactId);
        if (!removed) {
            throw new AppError_1.AppError('Contact not found in list', 404);
        }
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    formatPhoneNumber(phone, countryCode = '234') {
        let cleaned = phone.replace(/\D/g, '');
        cleaned = cleaned.replace(/^0+/, '');
        if (!cleaned.startsWith(countryCode)) {
            cleaned = countryCode + cleaned;
        }
        return cleaned;
    }
    isValidPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }
    personalize(message, name) {
        if (!name)
            return message;
        return message
            .replace(/\{\{name\}\}/gi, name)
            .replace(/\{\{first_name\}\}/gi, name.split(' ')[0])
            .replace(/\{name\}/gi, name)
            .replace(/#name/gi, name);
    }
}
exports.SmsService = SmsService;
//# sourceMappingURL=SmsService.js.map