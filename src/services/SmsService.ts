// src/services/SmsService.ts

import { SmsRepository } from '@repositories/SmsRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { GroupRepository } from '@repositories/GroupRepository';
import { FollowUpRepository } from '@repositories/FollowUpRepository';
import { WalletService, BalanceInfo } from '@services/WalletService';
import { AppError } from '@utils/AppError';
import {
    SmsSenderId,
    SmsCampaign,
    SmsMessage,
    CreateSenderIdDTO,
    ComposeSmsDTO,
    CampaignFilters,
    SmsFilters,
    PaginatedCampaigns,
    PaginatedMessages,
    SmsStats,
    CampaignReport,
    UploadedContact,
    SmsContactList,
    SmsContactListItem
} from '@/dtos/sms.types';
import {
    FollowUpChannel,
    SendMessageDTO as FollowUpSendMessageDTO,
    SendMessageResult,
} from '@/dtos/followup.types';
import logger from '@config/logger';
import { getTermii } from '@config/termii';
import { pool } from '@/config/database';

interface Recipient {
    phoneNumber: string;
    name?: string;
    memberId?: string;
}

interface ProfileUpdateLinkSmsData {
    churchName: string;
    updateLink: string;
}

interface FollowUpMessageOptions {
    churchId: string;
    userId: string;
    assignmentId: string;
    firstTimerId: string;
    channel: FollowUpChannel;
    to: string;
    message: string;
    subject?: string;
    recipientName?: string;
    templateId?: string;
}

interface FollowUpMessageResult {
    success: boolean;
    messageId?: string;
    externalId?: string;
    deliveryStatus: string;
    error?: string;
}

interface SMSHistoryFilters {
    page?: number;
    limit?: number;
    churchId?: string;
    startDate?: string;
    endDate?: string;
}

export class SmsService {
    private smsRepository: SmsRepository;
    private memberRepository: MemberRepository;
    private groupRepository: GroupRepository;
    private followUpRepository: FollowUpRepository;
    private walletService: WalletService;

    constructor() {
        this.smsRepository = new SmsRepository();
        this.memberRepository = new MemberRepository();
        this.groupRepository = new GroupRepository();
        this.followUpRepository = new FollowUpRepository();
        this.walletService = new WalletService();
    }

    // ============================================================================
    // FOLLOW-UP MESSAGING
    // ============================================================================

    /**
     * Send follow-up message via SMS
     */
    async sendFollowUpSms(options: FollowUpMessageOptions): Promise<FollowUpMessageResult> {
        const { churchId, userId, assignmentId, firstTimerId, to, message, recipientName } = options;

        try {
            const termii = getTermii();
            const units = Math.ceil(message.length / 160);

            // Check balance
            const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', units);

            if (!balanceCheck.sufficient) {
                throw new AppError(
                    `Insufficient SMS balance. Required: ${units} units. Available: ${balanceCheck.balanceInfo.total} units`,
                    400
                );
            }

            // Get sender ID
            const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
            const senderId = defaultSender?.sender_id || process.env.TERMII_SENDER_ID || 'ChurchMS';

            // Format phone
            const formattedPhone = this.formatPhoneNumber(to);

            // Personalize message
            const personalizedMessage = this.personalize(message, recipientName);

            // Send via Termii
            let externalId: string | undefined;
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
                    await this.walletService.debitBalance(
                        churchId,
                        'sms',
                        units,
                        {
                            reference: `followup-${assignmentId}`,
                            description: `Follow-up SMS to ${formattedPhone}`,
                        },
                        userId
                    );
                }

                logger.info(`Follow-up SMS sent successfully to ${formattedPhone}`);
            } catch (error: any) {
                logger.error('Error sending follow-up SMS via Termii:', error);
                deliveryStatus = 'failed';

                return {
                    success: false,
                    deliveryStatus,
                    error: error.message || 'Failed to send SMS',
                };
            }

            // Record activity in follow-up repository
            const activity = await this.followUpRepository.createMessageActivity(
                churchId,
                userId,
                {
                    assignmentId,
                    firstTimerId,
                    channel: 'sms',
                    content: personalizedMessage,
                    status: deliveryStatus === 'sent' ? 'completed' : 'failed',
                    externalMessageId: externalId,
                    deliveryStatus,
                }
            );

            return {
                success: true,
                messageId: activity.id,
                externalId,
                deliveryStatus,
            };
        } catch (error: any) {
            logger.error('Error in sendFollowUpSms:', error);
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
    async sendFollowUpWhatsApp(options: FollowUpMessageOptions): Promise<FollowUpMessageResult> {
        const { churchId, userId, assignmentId, firstTimerId, to, message, recipientName } = options;

        try {
            const termii = getTermii();
            const formattedPhone = this.formatPhoneNumber(to);
            const personalizedMessage = this.personalize(message, recipientName);

            let externalId: string | undefined;
            let deliveryStatus = 'pending';

            try {
                // Check if using Twilio WhatsApp or Termii WhatsApp
                if (process.env.WHATSAPP_PROVIDER === 'twilio') {
                    // Twilio WhatsApp implementation
                    const twilio = require('twilio')(
                        process.env.TWILIO_ACCOUNT_SID,
                        process.env.TWILIO_AUTH_TOKEN
                    );

                    const result = await twilio.messages.create({
                        body: personalizedMessage,
                        to: `whatsapp:+${formattedPhone}`,
                        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                    });

                    externalId = result.sid;
                    deliveryStatus = 'sent';
                } else if (process.env.WHATSAPP_PROVIDER === 'termii') {
                    // Termii WhatsApp
                    const result = await termii.sendWhatsAppMessage({
                        phone_number: formattedPhone,
                        message: personalizedMessage,
                    });

                    externalId = result.message_id;
                    deliveryStatus = 'sent';
                } else {
                    // Default to Termii SMS as fallback with WhatsApp indicator
                    logger.warn('WhatsApp provider not configured, using SMS fallback');
                    return this.sendFollowUpSms(options);
                }

                logger.info(`Follow-up WhatsApp sent successfully to ${formattedPhone}`);
            } catch (error: any) {
                logger.error('Error sending follow-up WhatsApp:', error);
                deliveryStatus = 'failed';

                return {
                    success: false,
                    deliveryStatus,
                    error: error.message || 'Failed to send WhatsApp message',
                };
            }

            // Record activity
            const activity = await this.followUpRepository.createMessageActivity(
                churchId,
                userId,
                {
                    assignmentId,
                    firstTimerId,
                    channel: 'whatsapp',
                    content: personalizedMessage,
                    status: deliveryStatus === 'sent' ? 'completed' : 'failed',
                    externalMessageId: externalId,
                    deliveryStatus,
                }
            );

            return {
                success: true,
                messageId: activity.id,
                externalId,
                deliveryStatus,
            };
        } catch (error: any) {
            logger.error('Error in sendFollowUpWhatsApp:', error);
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
    async sendBulkFollowUpMessages(
        churchId: string,
        userId: string,
        messages: Array<{
            assignmentId: string;
            firstTimerId: string;
            channel: FollowUpChannel;
            to: string;
            message: string;
            recipientName?: string;
        }>
    ): Promise<{ sent: number; failed: number; results: FollowUpMessageResult[] }> {
        const results: FollowUpMessageResult[] = [];
        let sent = 0;
        let failed = 0;

        for (const msg of messages) {
            let result: FollowUpMessageResult;

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
            } else {
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
    processFollowUpTemplate(
        template: string,
        variables: Record<string, string>
    ): string {
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
    async getFollowUpTemplateVariables(
        churchId: string,
        firstTimerId: string
    ): Promise<Record<string, string>> {
        const ftResult = await pool.query(
            'SELECT * FROM first_timers WHERE id = $1 AND church_id = $2',
            [firstTimerId, churchId]
        );

        const churchResult = await pool.query(
            'SELECT name FROM churches WHERE id = $1',
            [churchId]
        );

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

    async requestSenderId(churchId: string, data: CreateSenderIdDTO, userId?: string): Promise<SmsSenderId> {
        try {
            if (!/^[A-Za-z0-9]{3,11}$/.test(data.senderId)) {
                throw new AppError('Sender ID must be 3-11 alphanumeric characters', 400);
            }

            if (!data.useCase || data.useCase.trim() === '') {
                throw new AppError('Use case is required', 400);
            }

            const termii = getTermii();

            const churchQuery = await pool.query(
                'SELECT name FROM churches WHERE id = $1',
                [churchId]
            );
            const churchName = churchQuery.rows[0]?.name || 'Church';

            logger.info(`Requesting sender ID: ${data.senderId} for church: ${churchName}`);

            const termiiResult = await termii.requestSenderId({
                sender_id: data.senderId.toUpperCase(),
                useCase: data.useCase.trim(),
                company: churchName,
            });

            logger.info('Sender Id requested. You will be contacted by your account manager.');

            const senderIdRecord = await this.smsRepository.createOrUpdateSenderId(
                churchId,
                {
                    senderId: data.senderId.toUpperCase(),
                    useCase: data.useCase.trim()
                },
                userId
            );

            if (termiiResult) {
                await this.smsRepository.updateSenderId(senderIdRecord.id, {
                    status: termiiResult.status || 'pending',
                    use_case: data.useCase.trim(),
                    description: `Termii Request ID: ${termiiResult.id || 'pending'}`,
                });
            }

            const updated = await this.smsRepository.getSenderIdById(senderIdRecord.id);
            return updated || senderIdRecord;

        } catch (error: any) {
            logger.error('Error requesting sender ID:', error);

            if (error.code === '23505') {
                throw new AppError('This Sender ID has already been requested for this church.', 409);
            }

            throw new AppError(error.message || 'Failed to request sender ID', 400);
        }
    }

    async getSenderIds(churchId: string): Promise<SmsSenderId[]> {
        return this.smsRepository.getSenderIds(churchId);
    }

    async getApprovedSenderIds(churchId: string): Promise<SmsSenderId[]> {
        const senderIds = await this.smsRepository.getSenderIds(churchId);
        return senderIds.filter(s =>
            s.status === 'approved' ||
            s.status === 'active' ||
            s.status === 'pending'
        );
    }

    /**
     * Sync local sender IDs with Termii to get latest statuses
     */
    async syncSenderIdsWithTermii(churchId: string): Promise<void> {
        try {
            logger.info(`Syncing sender IDs with Termii for church: ${churchId}`);

            const termii = getTermii();

            // Fetch all local sender IDs for this church
            const localSenderIds = await this.smsRepository.getSenderIds(churchId);

            if (localSenderIds.length === 0) {
                logger.info(`No sender IDs found for church ${churchId}, nothing to sync`);
                return;
            }

            // Attempt to fetch sender IDs from Termii
            let termiiSenderIds: Array<{ sender_id: string; status: string }> = [];

            try {
                const termiiResponse = await termii.getSenderIds();
                termiiSenderIds = termiiResponse?.data || termiiResponse || [];
            } catch (termiiError: any) {
                logger.warn(
                    `Could not fetch sender IDs from Termii: ${termiiError.message}. ` +
                    `Will attempt to verify individual sender IDs.`
                );
            }

            // Build a lookup map from Termii's response
            const termiiStatusMap = new Map<string, string>();
            for (const ts of termiiSenderIds) {
                if (ts.sender_id) {
                    termiiStatusMap.set(ts.sender_id.toUpperCase(), ts.status);
                }
            }

            // Update local records with Termii statuses
            for (const localSender of localSenderIds) {
                const termiiStatus = termiiStatusMap.get(localSender.sender_id.toUpperCase());

                if (termiiStatus && termiiStatus !== localSender.status) {
                    logger.info(
                        `Updating sender ID ${localSender.sender_id} status: ` +
                        `${localSender.status} -> ${termiiStatus}`
                    );

                    await this.smsRepository.updateSenderId(localSender.id, {
                        status: termiiStatus,
                    });
                }
            }

            logger.info(`Sender ID sync completed for church ${churchId}`);
        } catch (error: any) {
            logger.error('Error syncing sender IDs with Termii:', error);
            throw new AppError(
                error.message || 'Failed to sync sender IDs with Termii',
                500
            );
        }
    }

    async setDefaultSenderId(churchId: string, senderIdId: string): Promise<void> {
        return this.smsRepository.setDefaultSenderId(churchId, senderIdId);
    }

    async deleteSenderId(churchId: string, senderIdId: string): Promise<void> {
        const deleted = await this.smsRepository.deleteSenderId(churchId, senderIdId);
        if (!deleted) {
            throw new AppError('Sender ID not found', 404);
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
    async processScheduledCampaigns(): Promise<void> {
        try {
            logger.info('Checking for scheduled SMS campaigns to process...');

            // Pull campaigns that are scheduled and due
            const dueCampaigns = await this.smsRepository.getDueScheduledCampaigns();

            if (dueCampaigns.length === 0) {
                logger.info('No scheduled SMS campaigns are due at this time');
                return;
            }

            logger.info(`Found ${dueCampaigns.length} scheduled SMS campaign(s) to process`);

            for (const campaign of dueCampaigns) {
                try {
                    logger.info(
                        `Processing scheduled campaign ${campaign.id} for church ${campaign.church_id}`
                    );

                    // Mark as sending immediately to prevent duplicate processing
                    await this.smsRepository.updateCampaign(
                        campaign.church_id,
                        campaign.id,
                        { status: 'sending' }
                    );

                    // Reconstruct the ComposeSmsDTO from the stored campaign
                    const campaignData: ComposeSmsDTO = {
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
                    const recipients = await this.getRecipients(
                        campaign.church_id,
                        campaignData
                    );

                    if (recipients.length === 0) {
                        logger.warn(
                            `No recipients found for scheduled campaign ${campaign.id}; marking as failed`
                        );
                        await this.smsRepository.updateCampaign(
                            campaign.church_id,
                            campaign.id,
                            { status: 'failed' }
                        );
                        continue;
                    }

                    // Check balance before sending
                    const unitsPerMessage = Math.ceil(campaign.message.length / 160);
                    const totalUnitsRequired = recipients.length * unitsPerMessage;

                    const balanceCheck = await this.walletService.checkSufficientBalance(
                        campaign.church_id,
                        'sms',
                        totalUnitsRequired
                    );

                    if (!balanceCheck.sufficient) {
                        logger.warn(
                            `Insufficient balance for scheduled campaign ${campaign.id}. ` +
                            `Required: ${totalUnitsRequired}, Available: ${balanceCheck.balanceInfo.total}`
                        );
                        await this.smsRepository.updateCampaign(
                            campaign.church_id,
                            campaign.id,
                            { status: 'failed' }
                        );
                        continue;
                    }

                    // Update recipient count
                    await this.smsRepository.updateCampaign(
                        campaign.church_id,
                        campaign.id,
                        { total_recipients: recipients.length }
                    );

                    // Fire-and-forget the actual send (same as composeSms 'now' path)
                    this.processCampaign(
                        campaign.church_id,
                        campaign.id,
                        recipients,
                        campaign.message,
                        campaign.sender_id,
                        campaign.created_by,
                        balanceCheck.useTermii
                    ).catch(err => {
                        logger.error(
                            `Error processing scheduled campaign ${campaign.id}:`,
                            err
                        );
                    });

                    logger.info(
                        `Scheduled campaign ${campaign.id} handed off for sending`
                    );
                } catch (campaignError: any) {
                    logger.error(
                        `Error processing scheduled campaign ${campaign.id}:`,
                        campaignError
                    );

                    // Mark individual campaign as failed without stopping the loop
                    try {
                        await this.smsRepository.updateCampaign(
                            campaign.church_id,
                            campaign.id,
                            { status: 'failed' }
                        );
                    } catch (updateError) {
                        logger.error(
                            `Could not mark campaign ${campaign.id} as failed:`,
                            updateError
                        );
                    }
                }
            }

            logger.info('Scheduled SMS campaign processing complete');
        } catch (error: any) {
            logger.error('Error in processScheduledCampaigns:', error);
            throw new AppError(
                error.message || 'Failed to process scheduled campaigns',
                500
            );
        }
    }

    // ============================================================================
    // BALANCE METHODS
    // ============================================================================

    async getBalance(churchId: string): Promise<BalanceInfo> {
        return this.walletService.getComprehensiveBalance(churchId, 'sms');
    }

    async getSimpleBalance(churchId: string): Promise<{ local: number; termii?: any }> {
        try {
            const termii = getTermii();
            const localBalance = await this.walletService.getBalance(churchId, 'sms');

            let termiiBalance;
            try {
                termiiBalance = await termii.getBalance();
            } catch (error) {
                logger.error('Error fetching Termii balance:', error);
            }

            return {
                local: localBalance,
                termii: termiiBalance,
            };
        } catch (error) {
            logger.error('Error getting SMS balance:', error);
            throw error;
        }
    }

    // ============================================================================
    // COMPOSE & SEND METHODS
    // ============================================================================

    async composeSms(churchId: string, data: ComposeSmsDTO, userId?: string): Promise<SmsCampaign> {
        try {
            logger.info(`Composing SMS for church ${churchId}`, { data });

            const recipients = await this.getRecipients(churchId, data);

            if (recipients.length === 0) {
                throw new AppError('No valid recipients found', 400);
            }

            const messageLength = data.message.length;
            const unitsPerMessage = Math.ceil(messageLength / 160);
            const totalUnitsRequired = recipients.length * unitsPerMessage;

            logger.info(
                `SMS calculation: ${recipients.length} recipients × ` +
                `${unitsPerMessage} units = ${totalUnitsRequired} total units needed`
            );

            let useTermiiDirectly = false;

            if (data.sendOption === 'now') {
                const balanceCheck = await this.walletService.checkSufficientBalance(
                    churchId,
                    'sms',
                    totalUnitsRequired
                );

                if (!balanceCheck.sufficient) {
                    const errorMessage =
                        `Insufficient SMS balance. Required: ${totalUnitsRequired} units. ` +
                        `Local balance: ${balanceCheck.balanceInfo.local} units. ` +
                        `Termii balance: ₦${balanceCheck.balanceInfo.termii?.balance || 0}`;

                    throw new AppError(errorMessage, 400);
                }

                useTermiiDirectly = balanceCheck.useTermii;
            }

            const campaign = await this.smsRepository.createCampaign(churchId, data, userId);

            await this.smsRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });

            if (data.sendOption === 'now') {
                this.processCampaign(
                    churchId,
                    campaign.id,
                    recipients,
                    data.message,
                    data.senderId,
                    userId,
                    useTermiiDirectly
                ).catch(error => {
                    logger.error(`Error processing campaign ${campaign.id}:`, error);
                });
            }

            logger.info(`SMS campaign created: ${campaign.id} for church ${churchId}`);

            const updatedCampaign = await this.smsRepository.getCampaignById(churchId, campaign.id);
            if (!updatedCampaign) {
                throw new AppError('Failed to retrieve created campaign', 500);
            }
            return updatedCampaign;
        } catch (error) {
            logger.error('Error composing SMS:', error);
            throw error;
        }
    }

    async sendSingleSms(
        churchId: string,
        data: {
            phoneNumber: string;
            message: string;
            senderId?: string;
            recipientName?: string;
        },
        userId?: string
    ): Promise<SmsMessage> {
        try {
            const termii = getTermii();
            const units = Math.ceil(data.message.length / 160);

            const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', units);

            if (!balanceCheck.sufficient) {
                throw new AppError(
                    `Insufficient SMS balance. Required: ${units} units. Available: ${balanceCheck.balanceInfo.total} units`,
                    400
                );
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

            const message = await this.smsRepository.createMessage(
                churchId,
                {
                    phoneNumber: formattedPhone,
                    recipientName: data.recipientName,
                    message: data.message,
                    senderId: senderId,
                    units,
                },
                userId
            );

            try {
                const result = await termii.sendSMS({
                    to: formattedPhone,
                    from: senderId,
                    sms: data.message,
                });

                await this.smsRepository.updateMessageStatus(
                    message.id,
                    'sent',
                    result.message_id
                );

                if (!balanceCheck.useTermii && balanceCheck.balanceInfo.local >= units) {
                    await this.walletService.debitBalance(
                        churchId,
                        'sms',
                        units,
                        {
                            reference: message.id,
                            description: `SMS sent to ${formattedPhone}`,
                        },
                        userId
                    );
                }

                logger.info(`SMS sent successfully: ${message.id}`);
            } catch (error: any) {
                logger.error('Error sending SMS via Termii:', error);

                await this.smsRepository.updateMessageStatus(
                    message.id,
                    'failed',
                    undefined,
                    error.message
                );

                throw new AppError('Failed to send SMS: ' + error.message, 500);
            }

            const updatedMessage = await this.smsRepository.getMessageById(message.id);
            return updatedMessage || message;
        } catch (error) {
            logger.error('Error sending single SMS:', error);
            throw error;
        }
    }

    // ============================================================================
    // CAMPAIGN PROCESSING
    // ============================================================================

    private async processCampaign(
        churchId: string,
        campaignId: string,
        recipients: Recipient[],
        message: string,
        senderId?: string,
        userId?: string,
        useTermiiDirectly: boolean = false
    ): Promise<void> {
        try {
            const termii = getTermii();

            logger.info(`Processing campaign ${campaignId} with ${recipients.length} recipients`);

            await this.smsRepository.updateCampaign(churchId, campaignId, { status: 'sending' });

            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }

            if (!senderId) {
                senderId = process.env.TERMII_SENDER_ID || 'ChurchMS';
            }

            const unitsPerMessage = Math.ceil(message.length / 160);

            const messages = await this.smsRepository.createMessages(
                churchId,
                recipients.map(r => ({
                    campaignId,
                    memberId: r.memberId,
                    phoneNumber: r.phoneNumber,
                    recipientName: r.name,
                    message: this.personalize(message, r.name),
                    senderId,
                    units: unitsPerMessage,
                })),
                userId
            );

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
                        from: senderId!,
                        sms: message,
                    });

                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageStatus(msg.id, 'sent', result.message_id);
                        sentCount++;
                        totalCost += unitsPerMessage;
                    }
                } catch (error: any) {
                    logger.error(`Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);

                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageStatus(
                            msg.id,
                            'failed',
                            undefined,
                            error.message
                        );
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
                        await this.walletService.debitBalance(
                            churchId,
                            'sms',
                            totalCost,
                            {
                                reference: campaignId,
                                description: `SMS campaign: ${sentCount} messages sent`,
                            },
                            userId
                        );
                    }
                } catch (debitError) {
                    logger.warn('Could not debit local balance:', debitError);
                }
            }

            await this.smsRepository.updateCampaign(churchId, campaignId, {
                status: failedCount === recipients.length ? 'failed' : 'sent',
                successful_count: sentCount,
                failed_count: failedCount,
                units_used: totalCost,
                sent_at: new Date(),
            });

            logger.info(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
        } catch (error) {
            logger.error('Error processing campaign:', error);
            await this.smsRepository.updateCampaign(churchId, campaignId, { status: 'failed' });
            throw error;
        }
    }

    // ============================================================================
    // RECIPIENT RESOLUTION
    // ============================================================================

    private async getRecipients(churchId: string, data: ComposeSmsDTO): Promise<Recipient[]> {
        try {
            switch (data.destinationType) {
                case 'contacts':
                case 'contact_lists':
                    return await this.getContactListRecipients(
                        churchId,
                        data.contactListIds || [],
                        data.selectAllContacts
                    );
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
                    throw new AppError('Invalid destination type', 400);
            }
        } catch (error) {
            logger.error('Error getting recipients:', error);
            throw error;
        }
    }

    private async getContactListRecipients(
        churchId: string,
        contactListIds: string[],
        selectAll?: boolean
    ): Promise<Recipient[]> {
        const recipients: Recipient[] = [];
        const seenPhones = new Set<string>();

        try {
            let listsToProcess: string[] = contactListIds;

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
        } catch (error) {
            logger.error('Error getting contact list recipients:', error);
            return [];
        }
    }

    private async getAllContacts(churchId: string): Promise<Recipient[]> {
        try {
            const members = await this.memberRepository.findAll({ churchId, limit: 10000 });

            return members.members
                .filter(m => m.phone)
                .map(m => ({
                    phoneNumber: this.formatPhoneNumber(m.phone!),
                    name: `${m.first_name} ${m.last_name}`,
                    memberId: m.id,
                }));
        } catch (error) {
            logger.error('Error getting all contacts:', error);
            return [];
        }
    }

    private async getGroupRecipients(churchId: string, groupIds: string[]): Promise<Recipient[]> {
        const recipients: Recipient[] = [];
        const seenPhones = new Set<string>();

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
        } catch (error) {
            logger.error('Error getting group recipients:', error);
            return [];
        }
    }

    private async getMemberRecipients(churchId: string, memberIds: string[]): Promise<Recipient[]> {
        const recipients: Recipient[] = [];

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
        } catch (error) {
            logger.error('Error getting member recipients:', error);
            return [];
        }
    }

    private getPhoneNumberRecipients(phoneNumbers: string[]): Recipient[] {
        return phoneNumbers
            .map(phone => phone.trim())
            .filter(phone => phone && this.isValidPhoneNumber(phone))
            .map(phone => ({
                phoneNumber: this.formatPhoneNumber(phone),
            }));
    }

    private getUploadedRecipients(contacts: UploadedContact[]): Recipient[] {
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

    async sendOtp(to: string, otp: string): Promise<void> {
        const message =
            `Your verification code is: ${otp}. ` +
            `This code expires in 10 minutes. Do not share this code with anyone.`;

        try {
            const termii = getTermii();
            const formattedPhone = this.formatPhoneNumber(to);

            await termii.sendSMS({
                to: formattedPhone,
                from: process.env.SMS_SENDER_ID || 'ChurchMgmt',
                sms: message,
            });

            logger.info(`OTP SMS sent to ${formattedPhone}`);
        } catch (error: any) {
            logger.warn(`Failed to send OTP SMS via Termii to ${to}. Error: ${error.message}`);
            logger.info(`[SMS FALLBACK to ${to}]: ${message}`);
        }
    }

    async sendProfileUpdateLink(to: string, data: ProfileUpdateLinkSmsData): Promise<void> {
        const message = `${data.churchName}: Please update your profile using this link: ${data.updateLink}`;

        try {
            const termii = getTermii();
            const formattedPhone = this.formatPhoneNumber(to);

            await termii.sendSMS({
                to: formattedPhone,
                from: process.env.SMS_SENDER_ID || 'ChurchMgmt',
                sms: message,
            });

            logger.info(`Profile update link SMS sent to ${formattedPhone}`);
        } catch (error: any) {
            logger.warn(
                `Failed to send profile update link SMS via Termii to ${to}. Error: ${error.message}`
            );
            logger.info(`[SMS FALLBACK to ${to}]: ${message}`);
        }
    }

    // ============================================================================
    // CAMPAIGN METHODS
    // ============================================================================

    async getCampaigns(filters: CampaignFilters): Promise<PaginatedCampaigns> {
        return this.smsRepository.getCampaigns(filters);
    }

    async getCampaignById(churchId: string, campaignId: string): Promise<SmsCampaign> {
        const campaign = await this.smsRepository.getCampaignById(churchId, campaignId);
        if (!campaign) {
            throw new AppError('Campaign not found', 404);
        }
        return campaign;
    }

    async updateCampaign(
        churchId: string,
        campaignId: string,
        data: Partial<SmsCampaign>
    ): Promise<SmsCampaign> {
        const updated = await this.smsRepository.updateCampaign(churchId, campaignId, data);
        if (!updated) {
            throw new AppError('Campaign not found', 404);
        }
        return updated;
    }

    async deleteCampaign(churchId: string, campaignId: string): Promise<void> {
        const deleted = await this.smsRepository.deleteCampaign(churchId, campaignId);
        if (!deleted) {
            throw new AppError('Campaign not found or cannot be deleted', 404);
        }
    }

    async getDrafts(churchId: string): Promise<SmsCampaign[]> {
        return this.smsRepository.getDrafts(churchId);
    }

    async getScheduled(churchId: string): Promise<SmsCampaign[]> {
        return this.smsRepository.getScheduled(churchId);
    }

    // ============================================================================
    // MESSAGE METHODS
    // ============================================================================

    async getMessages(filters: SmsFilters): Promise<PaginatedMessages> {
        return this.smsRepository.getMessages(filters);
    }

    async getMessagesByCampaign(campaignId: string): Promise<SmsMessage[]> {
        return this.smsRepository.getMessagesByCampaign(campaignId);
    }

    /**
     * Sync a single message's delivery status from Termii
     */
    async syncMessageStatus(messageId: string): Promise<void> {
        try {
            logger.info(`Syncing message status for message: ${messageId}`);

            // Fetch the message record from the repository
            const message = await this.smsRepository.getMessageById(messageId);

            if (!message) {
                throw new AppError('Message not found', 404);
            }

            // If there's no external ID we cannot query Termii
            if (!message.external_id && !(message as any).termii_message_id) {
                logger.warn(
                    `Message ${messageId} has no external Termii ID; cannot sync status`
                );
                return;
            }

            const externalId =
                (message as any).termii_message_id || message.external_id;

            const termii = getTermii();

            // Fetch delivery report from Termii
            let termiiStatus: string | undefined;

            try {
                const report = await termii.getMessageStatus(externalId);
                termiiStatus = report?.status || report?.delivery_status;
            } catch (termiiError: any) {
                logger.warn(
                    `Could not fetch status from Termii for message ${messageId}: ` +
                    termiiError.message
                );
                return;
            }

            if (!termiiStatus) {
                logger.warn(`Termii returned no status for message ${messageId}`);
                return;
            }

            // Map Termii status to our internal status
            const internalStatus = this.mapTermiiStatus(termiiStatus);

            if (internalStatus !== message.status) {
                logger.info(
                    `Updating message ${messageId} status: ${message.status} -> ${internalStatus}`
                );

                await this.smsRepository.updateMessageStatus(
                    messageId,
                    internalStatus,
                    externalId
                );
            }

            logger.info(`Message status sync completed for message: ${messageId}`);
        } catch (error: any) {
            logger.error('Error syncing message status:', error);
            throw new AppError(
                error.message || 'Failed to sync message status',
                error.statusCode || 500
            );
        }
    }

    /**
     * Map Termii delivery status strings to our internal status values
     */
    private mapTermiiStatus(termiiStatus: string): string {
        const statusMap: Record<string, string> = {
            // Termii statuses -> internal statuses
            delivered:    'delivered',
            sent:         'sent',
            failed:       'failed',
            rejected:     'failed',
            expired:      'failed',
            undelivered:  'failed',
            pending:      'pending',
            accepted:     'sent',
            buffered:     'pending',
            enroute:      'pending',
        };

        return statusMap[termiiStatus.toLowerCase()] ?? 'pending';
    }

    // ============================================================================
    // REPLY METHODS
    // ============================================================================

    async getReplies(
        churchId: string,
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false
    ): Promise<{ data: any[]; total: number }> {
        return this.smsRepository.getReplies(churchId, page, limit, unreadOnly);
    }

    async markReplyAsRead(churchId: string, replyId: string): Promise<void> {
        return this.smsRepository.markReplyAsRead(churchId, replyId);
    }

    async markAllRepliesAsRead(churchId: string): Promise<void> {
        return this.smsRepository.markAllRepliesAsRead(churchId);
    }

    /**
     * Reply to an inbound SMS message
     */
    async replyToMessage(
        churchId: string,
        replyId: string,
        message: string,
        senderId?: string,
        userId?: string
    ): Promise<SmsMessage> {
        try {
            logger.info(`Replying to message ${replyId} for church ${churchId}`);

            // Fetch the original inbound reply to get the sender's phone number
            const replies = await this.smsRepository.getReplies(churchId, 1, 1000, false);
            const originalReply = replies.data.find(
                (r: any) => r.id === replyId
            );

            if (!originalReply) {
                throw new AppError('Reply not found', 404);
            }

            const recipientPhone: string | undefined =
                originalReply.from ||
                originalReply.phone_number ||
                originalReply.sender_name;

            if (!recipientPhone) {
                throw new AppError(
                    'Cannot determine recipient phone number from original reply',
                    400
                );
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
            const balanceCheck = await this.walletService.checkSufficientBalance(
                churchId,
                'sms',
                units
            );

            if (!balanceCheck.sufficient) {
                throw new AppError(
                    `Insufficient SMS balance. Required: ${units} units. ` +
                    `Available: ${balanceCheck.balanceInfo.total} units`,
                    400
                );
            }

            const formattedPhone = this.formatPhoneNumber(recipientPhone);

            // Persist message record
            const outboundMessage = await this.smsRepository.createMessage(
                churchId,
                {
                    phoneNumber: formattedPhone,
                    recipientName: originalReply.name || originalReply.sender_name,
                    message,
                    senderId: resolvedSenderId,
                    units,
                },
                userId
            );

            // Send via Termii
            const termii = getTermii();

            try {
                const result = await termii.sendSMS({
                    to: formattedPhone,
                    from: resolvedSenderId,
                    sms: message,
                });

                await this.smsRepository.updateMessageStatus(
                    outboundMessage.id,
                    'sent',
                    result.message_id
                );

                // Debit local wallet if applicable
                if (!balanceCheck.useTermii && balanceCheck.balanceInfo.local >= units) {
                    await this.walletService.debitBalance(
                        churchId,
                        'sms',
                        units,
                        {
                            reference: outboundMessage.id,
                            description: `SMS reply to ${formattedPhone}`,
                        },
                        userId
                    );
                }

                // Mark the original reply as read now that we've responded
                await this.smsRepository.markReplyAsRead(churchId, replyId);

                logger.info(
                    `Reply SMS sent successfully: ${outboundMessage.id} to ${formattedPhone}`
                );
            } catch (error: any) {
                logger.error('Error sending reply SMS via Termii:', error);

                await this.smsRepository.updateMessageStatus(
                    outboundMessage.id,
                    'failed',
                    undefined,
                    error.message
                );

                throw new AppError('Failed to send reply: ' + error.message, 500);
            }

            const updatedMessage = await this.smsRepository.getMessageById(outboundMessage.id);
            return updatedMessage || outboundMessage;
        } catch (error: any) {
            logger.error('Error in replyToMessage:', error);
            throw error instanceof AppError
                ? error
                : new AppError(error.message || 'Failed to reply to message', 500);
        }
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStats(churchId: string): Promise<SmsStats> {
        return this.smsRepository.getStats(churchId);
    }

    async getCampaignReport(churchId: string, campaignId: string): Promise<CampaignReport> {
        const report = await this.smsRepository.getCampaignReport(churchId, campaignId);
        if (!report) {
            throw new AppError('Campaign not found', 404);
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
    async getSMSHistory(filters: SMSHistoryFilters): Promise<{
        data: SmsMessage[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const page = filters.page ?? 1;
            const limit = filters.limit ?? 20;

            logger.info('Fetching SMS history', { filters });

            // Build a SmsFilters-compatible object
            const smsFilters: SmsFilters = {
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
        } catch (error: any) {
            logger.error('Error fetching SMS history:', error);
            throw new AppError(
                error.message || 'Failed to fetch SMS history',
                error.statusCode || 500
            );
        }
    }

    // ============================================================================
    // CONTACT LIST METHODS
    // ============================================================================

    async getContactLists(churchId: string): Promise<SmsContactList[]> {
        return this.smsRepository.getContactLists(churchId);
    }

    async createContactList(
        churchId: string,
        name: string,
        description?: string,
        userId?: string
    ): Promise<SmsContactList> {
        return this.smsRepository.createContactList(churchId, name, description, userId);
    }

    async getContactListById(churchId: string, listId: string): Promise<SmsContactList> {
        const list = await this.smsRepository.getContactListById(churchId, listId);
        if (!list) {
            throw new AppError('Contact list not found', 404);
        }
        return list;
    }

    async updateContactList(
        churchId: string,
        listId: string,
        data: { name?: string; description?: string }
    ): Promise<SmsContactList> {
        const updated = await this.smsRepository.updateContactList(churchId, listId, data);
        if (!updated) {
            throw new AppError('Contact list not found', 404);
        }
        return updated;
    }

    async deleteContactList(churchId: string, listId: string): Promise<void> {
        const deleted = await this.smsRepository.deleteContactList(churchId, listId);
        if (!deleted) {
            throw new AppError('Contact list not found', 404);
        }
    }

    async addContactsToList(
        listId: string,
        contacts: Array<{ phoneNumber: string; name?: string }>
    ): Promise<number> {
        return this.smsRepository.addContactsToList(listId, contacts);
    }

    async getContactListItems(
        listId: string,
        page: number = 1,
        limit: number = 50
    ): Promise<{ data: SmsContactListItem[]; total: number }> {
        return this.smsRepository.getContactListItems(listId, page, limit);
    }

    async removeContactFromList(listId: string, contactId: string): Promise<void> {
        const removed = await this.smsRepository.removeContactFromList(listId, contactId);
        if (!removed) {
            throw new AppError('Contact not found in list', 404);
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private formatPhoneNumber(phone: string, countryCode: string = '234'): string {
        let cleaned = phone.replace(/\D/g, '');
        cleaned = cleaned.replace(/^0+/, '');

        if (!cleaned.startsWith(countryCode)) {
            cleaned = countryCode + cleaned;
        }

        return cleaned;
    }

    private isValidPhoneNumber(phone: string): boolean {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    }

    private personalize(message: string, name?: string): string {
        if (!name) return message;

        return message
            .replace(/\{\{name\}\}/gi, name)
            .replace(/\{\{first_name\}\}/gi, name.split(' ')[0])
            .replace(/\{name\}/gi, name)
            .replace(/#name/gi, name);
    }
}