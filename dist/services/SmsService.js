"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
// src/services/SmsService.ts
const SmsRepository_1 = require("@repositories/SmsRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const GroupRepository_1 = require("@repositories/GroupRepository");
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
        this.walletService = new WalletService_1.WalletService();
    }
    // ============================================================================
    // SENDER IDS
    // ============================================================================
    async requestSenderId(churchId, data, userId) {
        try {
            // Validate sender ID format
            if (!/^[A-Za-z0-9]{3,11}$/.test(data.senderId)) {
                throw new AppError_1.AppError('Sender ID must be 3-11 alphanumeric characters', 400);
            }
            // Validate useCase is provided and not empty
            if (!data.useCase || data.useCase.trim() === '') {
                throw new AppError_1.AppError('Use case is required', 400);
            }
            const termii = (0, termii_1.getTermii)();
            // Get church name for company field
            const churchQuery = await database_1.pool.query('SELECT name FROM churches WHERE id = $1', [churchId]);
            const churchName = churchQuery.rows[0]?.name || 'Church';
            logger_1.default.info(`Requesting sender ID: ${data.senderId} for church: ${churchName}`);
            logger_1.default.info(`Use case: ${data.useCase}`);
            // FIXED: Using 'useCase' (camelCase) to match Termii API expectations
            const termiiResult = await termii.requestSenderId({
                sender_id: data.senderId.toUpperCase(),
                useCase: data.useCase.trim(), // FIXED: Changed from 'usecase' to 'useCase'
                company: churchName,
            });
            // Create local sender ID record
            const senderId = await this.smsRepository.createSenderId(churchId, { senderId: data.senderId.toUpperCase() }, userId);
            // Update with Termii response
            if (termiiResult) {
                await this.smsRepository.updateSenderId(senderId.id, {
                    provider_sender_id: termiiResult.id || termiiResult.sender_id,
                    status: termiiResult.status || 'pending',
                    use_case: data.useCase,
                    metadata: termiiResult,
                });
            }
            logger_1.default.info(`Sender ID requested via Termii: ${data.senderId} for church ${churchId}`);
            const updatedSenderId = await this.smsRepository.getSenderIdById(senderId.id);
            if (!updatedSenderId) {
                throw new AppError_1.AppError('Failed to retrieve created sender ID', 500);
            }
            return updatedSenderId;
        }
        catch (error) {
            logger_1.default.error('Error requesting sender ID:', error);
            // Parse Termii error if present
            if (error.message && error.message.includes('Termii API error')) {
                const match = error.message.match(/Termii API error \d+: (.+)/);
                if (match) {
                    try {
                        const termiiError = JSON.parse(match[1]);
                        if (termiiError.message && Array.isArray(termiiError.message)) {
                            const issues = termiiError.message.map((m) => `${m.field}: ${m.issue}`).join(', ');
                            throw new AppError_1.AppError(`Sender ID request failed: ${issues}`, 400);
                        }
                    }
                    catch (parseError) {
                        // If parsing fails, use original error
                    }
                }
            }
            throw new AppError_1.AppError(error.message || 'Failed to request sender ID', 400);
        }
    }
    async getSenderIds(churchId) {
        return this.smsRepository.getSenderIds(churchId);
    }
    async getApprovedSenderIds(churchId) {
        const senderIds = await this.smsRepository.getSenderIds(churchId);
        // Return all sender IDs, or filter by approved status
        return senderIds.filter(s => s.status === 'approved' ||
            s.status === 'active' ||
            s.status === 'pending' // Include pending for user visibility
        );
    }
    async syncSenderIdsWithTermii(churchId) {
        try {
            const termii = (0, termii_1.getTermii)();
            const termiiSenderIds = await termii.getSenderIds();
            const localSenderIds = await this.smsRepository.getSenderIds(churchId);
            for (const localId of localSenderIds) {
                const termiiId = termiiSenderIds.data?.find((t) => t.sender_id === localId.sender_id);
                if (termiiId) {
                    await this.smsRepository.updateSenderId(localId.id, {
                        provider_sender_id: termiiId.id,
                        status: termiiId.status,
                        metadata: termiiId,
                    });
                }
            }
            logger_1.default.info(`Synced sender IDs with Termii for church ${churchId}`);
        }
        catch (error) {
            logger_1.default.error('Error syncing sender IDs:', error);
            throw error;
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
    // ============================================================================
    // BALANCE
    // ============================================================================
    async getBalance(churchId) {
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
    // COMPOSE & SEND
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
            const totalUnits = recipients.length * unitsPerMessage;
            logger_1.default.info(`Calculated ${totalUnits} units needed for ${recipients.length} recipients`);
            if (data.sendOption === 'now') {
                const hasSufficientBalance = await this.walletService.checkSufficientBalance(churchId, 'sms', totalUnits);
                if (!hasSufficientBalance) {
                    const balance = await this.walletService.getBalance(churchId, 'sms');
                    throw new AppError_1.AppError(`Insufficient SMS units. Required: ${totalUnits}, Available: ${balance}`, 400);
                }
            }
            const campaign = await this.smsRepository.createCampaign(churchId, data, userId);
            await this.smsRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });
            if (data.sendOption === 'now') {
                this.processCampaign(churchId, campaign.id, recipients, data.message, data.senderId, userId)
                    .catch(error => {
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
            const hasSufficientBalance = await this.walletService.checkSufficientBalance(churchId, 'sms', units);
            if (!hasSufficientBalance) {
                throw new AppError_1.AppError('Insufficient SMS units', 400);
            }
            let senderId = data.senderId;
            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }
            if (!senderId) {
                throw new AppError_1.AppError('No sender ID available', 400);
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
                await this.smsRepository.updateMessageWithProvider(message.id, {
                    provider_message_id: result.message_id,
                    provider_status: result.message,
                    delivery_status: 'sent',
                });
                await this.walletService.debitBalance(churchId, 'sms', units, {
                    reference: message.id,
                    description: `SMS sent to ${formattedPhone}`,
                }, userId);
                logger_1.default.info(`SMS sent successfully: ${message.id}`);
            }
            catch (error) {
                logger_1.default.error('Error sending SMS via Termii:', error);
                await this.smsRepository.updateMessageWithProvider(message.id, {
                    delivery_status: 'failed',
                    metadata: { error: error.message },
                });
                throw new AppError_1.AppError('Failed to send SMS', 500);
            }
            const updatedMessage = await this.smsRepository.getMessageByProviderId(message.id);
            return updatedMessage || message;
        }
        catch (error) {
            logger_1.default.error('Error sending single SMS:', error);
            throw error;
        }
    }
    // ============================================================================
    // SEND OTP VIA SMS
    // ============================================================================
    async sendOtp(to, otp) {
        const message = `Your verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;
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
    // ============================================================================
    // SEND PROFILE UPDATE LINK VIA SMS
    // ============================================================================
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
    // RECIPIENT RESOLUTION
    // ============================================================================
    async getRecipients(churchId, data) {
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
            logger_1.default.info(`Found ${recipients.length} unique recipients from ${listsToProcess.length} contact lists`);
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
            logger_1.default.info(`Found ${recipients.length} unique recipients from ${groupIds.length} groups`);
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
            logger_1.default.info(`Found ${recipients.length} recipients from ${memberIds.length} member IDs`);
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
    // CAMPAIGN PROCESSING
    // ============================================================================
    async processCampaign(churchId, campaignId, recipients, message, senderId, userId) {
        try {
            const termii = (0, termii_1.getTermii)();
            logger_1.default.info(`Processing campaign ${campaignId} with ${recipients.length} recipients`);
            await this.smsRepository.updateCampaign(churchId, campaignId, {
                status: 'sending',
            });
            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }
            if (!senderId) {
                throw new AppError_1.AppError('No sender ID available', 400);
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
                    logger_1.default.info(`Batch ${Math.floor(i / batchSize) + 1} sent successfully`);
                    for (const msg of batchMessages) {
                        await this.smsRepository.updateMessageWithProvider(msg.id, {
                            provider_message_id: result.message_id,
                            provider_status: result.message,
                            delivery_status: 'sent',
                        });
                        sentCount++;
                        totalCost += unitsPerMessage;
                    }
                }
                catch (error) {
                    logger_1.default.error(`Error sending batch ${Math.floor(i / batchSize) + 1}:`, error);
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
                await this.walletService.debitBalance(churchId, 'sms', totalCost, {
                    reference: campaignId,
                    description: `SMS campaign: ${sentCount} messages sent`,
                }, userId);
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
    // MESSAGES
    // ============================================================================
    async getMessages(filters) {
        return this.smsRepository.getMessages(filters);
    }
    async getMessagesByCampaign(campaignId) {
        return this.smsRepository.getMessagesByCampaign(campaignId);
    }
    async syncMessageStatus(messageId) {
        try {
            const termii = (0, termii_1.getTermii)();
            const message = await this.smsRepository.getMessageByProviderId(messageId);
            if (!message || !message.provider_message_id) {
                throw new AppError_1.AppError('Message not found or no provider ID', 404);
            }
            const status = await termii.getMessageStatus(message.provider_message_id);
            if (status) {
                await this.smsRepository.updateMessageWithProvider(message.id, {
                    provider_status: status.status,
                    delivery_status: this.mapTermiiStatus(status.status),
                });
            }
        }
        catch (error) {
            logger_1.default.error('Error syncing message status:', error);
            throw error;
        }
    }
    // ============================================================================
    // REPLIES
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
    async replyToMessage(churchId, replyId, message, senderId, userId) {
        try {
            const replies = await this.getReplies(churchId);
            const originalReply = replies.data.find(r => r.id === replyId);
            if (!originalReply) {
                throw new AppError_1.AppError('Reply not found', 404);
            }
            const sentMessage = await this.sendSingleSms(churchId, {
                phoneNumber: originalReply.phone_number,
                message,
                senderId,
                recipientName: originalReply.sender_name,
            }, userId);
            await this.markReplyAsRead(churchId, replyId);
            return sentMessage;
        }
        catch (error) {
            logger_1.default.error('Error replying to message:', error);
            throw error;
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
    async getSMSHistory(params) {
        try {
            const termii = (0, termii_1.getTermii)();
            return await termii.getSMSHistory(params);
        }
        catch (error) {
            logger_1.default.error('Error getting SMS history:', error);
            throw error;
        }
    }
    // ============================================================================
    // SCHEDULED CAMPAIGNS
    // ============================================================================
    async processScheduledCampaigns() {
        try {
            const campaigns = await this.smsRepository.getScheduledForProcessing();
            logger_1.default.info(`Processing ${campaigns.length} scheduled campaigns`);
            for (const campaign of campaigns) {
                try {
                    const recipients = await this.getRecipients(campaign.church_id, campaign);
                    await this.processCampaign(campaign.church_id, campaign.id, recipients, campaign.message, campaign.sender_id || undefined);
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
            .replace(/\{name\}/gi, name)
            .replace(/#name/gi, name);
    }
    mapTermiiStatus(termiiStatus) {
        const statusMap = {
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
}
exports.SmsService = SmsService;
//# sourceMappingURL=SmsService.js.map