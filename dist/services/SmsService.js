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
            logger_1.default.info('Sender Id requested. You will be contacted by your account manager.', {
                service: "churchplus-api",
                code: "OK"
            });
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
    // BALANCE - Enhanced with Termii checking
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
    // COMPOSE & SEND - Fixed with comprehensive balance checking
    // ============================================================================
    async composeSms(churchId, data, userId) {
        try {
            logger_1.default.info(`Composing SMS for church ${churchId}`, { data });
            // Get recipients
            const recipients = await this.getRecipients(churchId, data);
            if (recipients.length === 0) {
                throw new AppError_1.AppError('No valid recipients found', 400);
            }
            // Calculate units needed
            const messageLength = data.message.length;
            const unitsPerMessage = Math.ceil(messageLength / 160);
            const totalUnitsRequired = recipients.length * unitsPerMessage;
            logger_1.default.info(`SMS calculation: ${recipients.length} recipients × ${unitsPerMessage} units = ${totalUnitsRequired} total units needed`);
            // Only check balance if sending now (not for drafts or schedules)
            let useTermiiDirectly = false;
            if (data.sendOption === 'now') {
                // Get comprehensive balance from all sources
                const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', totalUnitsRequired);
                logger_1.default.info('Balance check result:', {
                    sufficient: balanceCheck.sufficient,
                    local: balanceCheck.balanceInfo.local,
                    termiiUnits: balanceCheck.balanceInfo.termii?.smsUnitsAvailable || 0,
                    termiiBalance: balanceCheck.balanceInfo.termii?.balance || 0,
                    total: balanceCheck.balanceInfo.total,
                    useTermii: balanceCheck.useTermii,
                });
                if (!balanceCheck.sufficient) {
                    const errorMessage = `Insufficient SMS balance. Required: ${totalUnitsRequired} units. ` +
                        `Local balance: ${balanceCheck.balanceInfo.local} units. ` +
                        `Termii balance: ₦${balanceCheck.balanceInfo.termii?.balance || 0} ` +
                        `(~${balanceCheck.balanceInfo.termii?.smsUnitsAvailable || 0} SMS @ ₦${balanceCheck.balanceInfo.termii?.pricePerSms || 4}/SMS). ` +
                        `Please top up your account.`;
                    throw new AppError_1.AppError(errorMessage, 400);
                }
                useTermiiDirectly = balanceCheck.useTermii;
            }
            // Create campaign
            const campaign = await this.smsRepository.createCampaign(churchId, data, userId);
            await this.smsRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });
            // Process if sending now
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
            // Check comprehensive balance
            const balanceCheck = await this.walletService.checkSufficientBalance(churchId, 'sms', units);
            if (!balanceCheck.sufficient) {
                throw new AppError_1.AppError(`Insufficient SMS balance. Required: ${units} units. ` +
                    `Available: ${balanceCheck.balanceInfo.total} units (Local: ${balanceCheck.balanceInfo.local}, ` +
                    `Termii: ~${balanceCheck.balanceInfo.termii?.smsUnitsAvailable || 0})`, 400);
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
            // Create message record
            const message = await this.smsRepository.createMessage(churchId, {
                phoneNumber: formattedPhone,
                recipientName: data.recipientName,
                message: data.message,
                senderId: senderId,
                units,
            }, userId);
            try {
                // Send via Termii
                const result = await termii.sendSMS({
                    to: formattedPhone,
                    from: senderId,
                    sms: data.message,
                });
                // Update message with provider info
                await this.smsRepository.updateMessageStatus(message.id, 'sent', result.message_id);
                // Debit from local wallet only if we have local balance
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
            logger_1.default.info(`Processing campaign ${campaignId} with ${recipients.length} recipients (useTermii: ${useTermiiDirectly})`);
            await this.smsRepository.updateCampaign(churchId, campaignId, {
                status: 'sending',
            });
            if (!senderId) {
                const defaultSender = await this.smsRepository.getDefaultSenderId(churchId);
                senderId = defaultSender?.sender_id;
            }
            if (!senderId) {
                senderId = process.env.TERMII_SENDER_ID || 'ChurchMS';
            }
            const unitsPerMessage = Math.ceil(message.length / 160);
            // Create message records
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
            // Process in batches
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
                // Rate limiting delay
                if (i + batchSize < recipients.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            // Debit from local wallet if not using Termii directly and we have local balance
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
                    logger_1.default.warn('Could not debit local balance (using Termii balance):', debitError);
                }
            }
            // Update campaign status
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
            });
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
    // OTP & PROFILE UPDATE
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
}
exports.SmsService = SmsService;
//# sourceMappingURL=SmsService.js.map