// src/services/SmsService.ts
import { SmsRepository } from '@repositories/SmsRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { GroupRepository } from '@repositories/GroupRepository';
import { WalletService } from '@services/WalletService';
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
    UploadedContact, SmsContactList, SmsContactListItem
} from '@/dtos/sms.types';
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

export class SmsService {
    private smsRepository: SmsRepository;
    private memberRepository: MemberRepository;
    private groupRepository: GroupRepository;
    private walletService: WalletService;

    constructor() {
        this.smsRepository = new SmsRepository();
        this.memberRepository = new MemberRepository();
        this.groupRepository = new GroupRepository();
        this.walletService = new WalletService();
    }

    // ============================================================================
    // SENDER IDS
    // ============================================================================

    async requestSenderId(churchId: string, data: CreateSenderIdDTO, userId?: string): Promise<SmsSenderId> {
        try {
            // Validate sender ID format
            if (!/^[A-Za-z0-9]{3,11}$/.test(data.senderId)) {
                throw new AppError('Sender ID must be 3-11 alphanumeric characters', 400);
            }

            // Validate useCase is provided and not empty
            if (!data.useCase || data.useCase.trim() === '') {
                throw new AppError('Use case is required', 400);
            }

            const termii = getTermii();

            // Get church name for company field
            const churchQuery = await pool.query(
                'SELECT name FROM churches WHERE id = $1',
                [churchId]
            );
            const churchName = churchQuery.rows[0]?.name || 'Church';

            logger.info(`Requesting sender ID: ${data.senderId} for church: ${churchName}`);
            logger.info(`Use case: ${data.useCase}`);

            // FIXED: Using 'useCase' (camelCase) to match Termii API expectations
            const termiiResult = await termii.requestSenderId({
                sender_id: data.senderId.toUpperCase(),
                useCase: data.useCase.trim(),  // FIXED: Changed from 'usecase' to 'useCase'
                company: churchName,
            });

            // Create local sender ID record
            const senderId = await this.smsRepository.createSenderId(
                churchId,
                { senderId: data.senderId.toUpperCase() },
                userId
            );

            // Update with Termii response
            if (termiiResult) {
                await this.smsRepository.updateSenderId(senderId.id, {
                    provider_sender_id: termiiResult.id || termiiResult.sender_id,
                    status: termiiResult.status || 'pending',
                    use_case: data.useCase,
                    metadata: termiiResult,
                });
            }

            logger.info(`Sender ID requested via Termii: ${data.senderId} for church ${churchId}`);

            const updatedSenderId = await this.smsRepository.getSenderIdById(senderId.id);
            if (!updatedSenderId) {
                throw new AppError('Failed to retrieve created sender ID', 500);
            }

            return updatedSenderId;
        } catch (error: any) {
            logger.error('Error requesting sender ID:', error);

            // Parse Termii error if present
            if (error.message && error.message.includes('Termii API error')) {
                const match = error.message.match(/Termii API error \d+: (.+)/);
                if (match) {
                    try {
                        const termiiError = JSON.parse(match[1]);
                        if (termiiError.message && Array.isArray(termiiError.message)) {
                            const issues = termiiError.message.map((m: any) => `${m.field}: ${m.issue}`).join(', ');
                            throw new AppError(`Sender ID request failed: ${issues}`, 400);
                        }
                    } catch (parseError) {
                        // If parsing fails, use original error
                    }
                }
            }

            throw new AppError(error.message || 'Failed to request sender ID', 400);
        }
    }

    async getSenderIds(churchId: string): Promise<SmsSenderId[]> {
        return this.smsRepository.getSenderIds(churchId);
    }

    async getApprovedSenderIds(churchId: string): Promise<SmsSenderId[]> {
        const senderIds = await this.smsRepository.getSenderIds(churchId);
        // Return all sender IDs, or filter by approved status
        return senderIds.filter(s =>
            s.status === 'approved' ||
            s.status === 'active' ||
            s.status === 'pending' // Include pending for user visibility
        );
    }

    async syncSenderIdsWithTermii(churchId: string): Promise<void> {
        try {
            const termii = getTermii();
            const termiiSenderIds = await termii.getSenderIds();

            const localSenderIds = await this.smsRepository.getSenderIds(churchId);

            for (const localId of localSenderIds) {
                const termiiId = termiiSenderIds.data?.find(
                    (t: any) => t.sender_id === localId.sender_id
                );

                if (termiiId) {
                    await this.smsRepository.updateSenderId(localId.id, {
                        provider_sender_id: termiiId.id,
                        status: termiiId.status,
                        metadata: termiiId,
                    });
                }
            }

            logger.info(`Synced sender IDs with Termii for church ${churchId}`);
        } catch (error) {
            logger.error('Error syncing sender IDs:', error);
            throw error;
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

    // ============================================================================
    // BALANCE
    // ============================================================================

    async getBalance(churchId: string): Promise<{ local: number; termii?: any }> {
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
    // COMPOSE & SEND
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
            const totalUnits = recipients.length * unitsPerMessage;

            logger.info(`Calculated ${totalUnits} units needed for ${recipients.length} recipients`);

            if (data.sendOption === 'now') {
                const hasSufficientBalance = await this.walletService.checkSufficientBalance(
                    churchId,
                    'sms',
                    totalUnits
                );

                if (!hasSufficientBalance) {
                    const balance = await this.walletService.getBalance(churchId, 'sms');
                    throw new AppError(
                        `Insufficient SMS units. Required: ${totalUnits}, Available: ${balance}`,
                        400
                    );
                }
            }

            const campaign = await this.smsRepository.createCampaign(churchId, data, userId);

            await this.smsRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });

            if (data.sendOption === 'now') {
                this.processCampaign(churchId, campaign.id, recipients, data.message, data.senderId, userId)
                    .catch(error => {
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

            const hasSufficientBalance = await this.walletService.checkSufficientBalance(
                churchId,
                'sms',
                units
            );

            if (!hasSufficientBalance) {
                throw new AppError('Insufficient SMS units', 400);
            }

            let senderId = data.senderId;
            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }

            if (!senderId) {
                throw new AppError('No sender ID available', 400);
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

                await this.smsRepository.updateMessageWithProvider(message.id, {
                    provider_message_id: result.message_id,
                    provider_status: result.message,
                    delivery_status: 'sent',
                });

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

                logger.info(`SMS sent successfully: ${message.id}`);
            } catch (error: any) {
                logger.error('Error sending SMS via Termii:', error);

                await this.smsRepository.updateMessageWithProvider(message.id, {
                    delivery_status: 'failed',
                    metadata: { error: error.message },
                });

                throw new AppError('Failed to send SMS', 500);
            }

            const updatedMessage = await this.smsRepository.getMessageByProviderId(message.id);
            return updatedMessage || message;
        } catch (error) {
            logger.error('Error sending single SMS:', error);
            throw error;
        }
    }

    // ============================================================================
    // SEND OTP VIA SMS
    // ============================================================================

    async sendOtp(to: string, otp: string): Promise<void> {
        const message = `Your verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;

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

    // ============================================================================
    // SEND PROFILE UPDATE LINK VIA SMS
    // ============================================================================

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
            logger.warn(`Failed to send profile update link SMS via Termii to ${to}. Error: ${error.message}`);
            logger.info(`[SMS FALLBACK to ${to}]: ${message}`);
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
                    // Handle contact lists
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

            // If selectAll is true, get all contact lists for the church
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

            logger.info(`Found ${recipients.length} unique recipients from ${listsToProcess.length} contact lists`);
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

            logger.info(`Found ${recipients.length} unique recipients from ${groupIds.length} groups`);
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

            logger.info(`Found ${recipients.length} recipients from ${memberIds.length} member IDs`);
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
    // CAMPAIGN PROCESSING
    // ============================================================================

    private async processCampaign(
        churchId: string,
        campaignId: string,
        recipients: Recipient[],
        message: string,
        senderId?: string,
        userId?: string
    ): Promise<void> {
        try {
            const termii = getTermii();

            logger.info(`Processing campaign ${campaignId} with ${recipients.length} recipients`);

            await this.smsRepository.updateCampaign(churchId, campaignId, {
                status: 'sending',
            });

            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }

            if (!senderId) {
                throw new AppError('No sender ID available', 400);
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
                        from: senderId,
                        sms: message,
                    });

                    logger.info(`Batch ${Math.floor(i / batchSize) + 1} sent successfully`);

                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageWithProvider(msg.id, {
                            provider_message_id: result.message_id,
                            provider_status: result.message,
                            delivery_status: 'sent',
                        });
                        sentCount++;
                        totalCost += unitsPerMessage;
                    }
                } catch (error: any) {
                    logger.error(`Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);

                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageWithProvider(msg.id, {
                            delivery_status: 'failed',
                            metadata: { error: error.message },
                        });
                        failedCount++;
                    }
                }

                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (totalCost > 0) {
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

            await this.smsRepository.updateCampaign(churchId, campaignId, {
                status: 'failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });

            throw error;
        }
    }

    // ============================================================================
    // CAMPAIGNS
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
    // MESSAGES
    // ============================================================================

    async getMessages(filters: SmsFilters): Promise<PaginatedMessages> {
        return this.smsRepository.getMessages(filters);
    }

    async getMessagesByCampaign(campaignId: string): Promise<SmsMessage[]> {
        return this.smsRepository.getMessagesByCampaign(campaignId);
    }

    async syncMessageStatus(messageId: string): Promise<void> {
        try {
            const termii = getTermii();
            const message = await this.smsRepository.getMessageByProviderId(messageId);

            if (!message || !message.provider_message_id) {
                throw new AppError('Message not found or no provider ID', 404);
            }

            const status = await termii.getMessageStatus(message.provider_message_id);

            if (status) {
                await this.smsRepository.updateMessageWithProvider(message.id, {
                    provider_status: status.status,
                    delivery_status: this.mapTermiiStatus(status.status),
                });
            }
        } catch (error) {
            logger.error('Error syncing message status:', error);
            throw error;
        }
    }

    // ============================================================================
    // REPLIES
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

    async replyToMessage(
        churchId: string,
        replyId: string,
        message: string,
        senderId?: string,
        userId?: string
    ): Promise<SmsMessage> {
        try {
            const replies = await this.getReplies(churchId);
            const originalReply = replies.data.find(r => r.id === replyId);

            if (!originalReply) {
                throw new AppError('Reply not found', 404);
            }

            const sentMessage = await this.sendSingleSms(
                churchId,
                {
                    phoneNumber: originalReply.phone_number,
                    message,
                    senderId,
                    recipientName: originalReply.sender_name,
                },
                userId
            );

            await this.markReplyAsRead(churchId, replyId);

            return sentMessage;
        } catch (error) {
            logger.error('Error replying to message:', error);
            throw error;
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

    async getSMSHistory(params?: { page?: number; limit?: number }): Promise<any> {
        try {
            const termii = getTermii();
            return await termii.getSMSHistory(params);
        } catch (error) {
            logger.error('Error getting SMS history:', error);
            throw error;
        }
    }

    // ============================================================================
    // SCHEDULED CAMPAIGNS
    // ============================================================================

    async processScheduledCampaigns(): Promise<void> {
        try {
            const campaigns = await this.smsRepository.getScheduledForProcessing();

            logger.info(`Processing ${campaigns.length} scheduled campaigns`);

            for (const campaign of campaigns) {
                try {
                    const recipients = await this.getRecipients(campaign.church_id, campaign as any);

                    await this.processCampaign(
                        campaign.church_id,
                        campaign.id,
                        recipients,
                        campaign.message,
                        campaign.sender_id || undefined
                    );
                } catch (error) {
                    logger.error(`Error processing scheduled campaign ${campaign.id}:`, error);
                }
            }
        } catch (error) {
            logger.error('Error processing scheduled campaigns:', error);
            throw error;
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
            .replace(/\{name\}/gi, name)
            .replace(/#name/gi, name);
    }

    private mapTermiiStatus(termiiStatus: string): 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected' {
        const statusMap: Record<string, 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected'> = {
            'Sent': 'sent',
            'Delivered': 'delivered',
            'Failed': 'failed',
            'Rejected': 'rejected',
            'DND-Active': 'rejected',
            'Submitted': 'pending',
        };

        return statusMap[termiiStatus] || 'pending';
    }

    // Add these methods to src/services/SmsService.ts

    // ============================================================================
    // CONTACT LISTS
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
}