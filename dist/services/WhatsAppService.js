"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
// src/services/WhatsAppService.ts
const WhatsAppRepository_1 = require("@repositories/WhatsAppRepository");
const WalletService_1 = require("@services/WalletService");
const MemberRepository_1 = require("@repositories/MemberRepository");
const GroupRepository_1 = require("@repositories/GroupRepository");
const SendchampService_1 = require("@services/SendchampService");
const AppError_1 = require("@utils/AppError");
const database_1 = require("@config/database");
const logger_1 = __importDefault(require("@config/logger"));
class WhatsAppService {
    constructor() {
        this.whatsappRepository = new WhatsAppRepository_1.WhatsAppRepository();
        this.walletService = new WalletService_1.WalletService();
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.groupRepository = new GroupRepository_1.GroupRepository();
    }
    // ============================================================================
    // ACCOUNTS
    // ============================================================================
    async getAccounts(churchId) {
        return this.whatsappRepository.getAccounts(churchId);
    }
    async createAccount(churchId, data) {
        const account = await this.whatsappRepository.createAccount(churchId, {
            phoneNumber: data.phoneNumber,
            displayName: data.displayName,
        });
        logger_1.default.info(`WhatsApp account registered: ${data.phoneNumber} for church ${churchId}`);
        return account;
    }
    async setDefaultAccount(churchId, accountId) {
        return this.whatsappRepository.setDefaultAccount(churchId, accountId);
    }
    // ============================================================================
    // TEMPLATES
    // ============================================================================
    async getTemplates(churchId, filters) {
        return this.whatsappRepository.getTemplates(churchId, filters);
    }
    async getApprovedTemplates(churchId) {
        return this.whatsappRepository.getApprovedTemplates(churchId);
    }
    async getTemplateById(churchId, templateId) {
        const template = await this.whatsappRepository.getTemplateById(churchId, templateId);
        if (!template) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return template;
    }
    async createTemplate(churchId, data, userId) {
        try {
            const sendchampResponse = await SendchampService_1.sendchamp.createWhatsAppTemplate({
                name: data.name,
                category: data.category,
                language: data.language || 'en',
                components: this.buildTemplateComponents(data),
            });
            const template = await this.whatsappRepository.createTemplate(churchId, {
                ...data,
                templateId: sendchampResponse.data?.template_id,
            }, userId);
            logger_1.default.info(`WhatsApp template created: ${data.name} for church ${churchId}`);
            return template;
        }
        catch (error) {
            logger_1.default.warn('Failed to create template on Sendchamp, creating locally:', error.message);
            return this.whatsappRepository.createTemplate(churchId, data, userId);
        }
    }
    async updateTemplate(churchId, templateId, data) {
        // Verify template exists
        await this.getTemplateById(churchId, templateId);
        const updated = await this.whatsappRepository.updateTemplate(churchId, templateId, data);
        if (!updated) {
            throw new AppError_1.AppError('Failed to update template', 500);
        }
        return updated;
    }
    async deleteTemplate(churchId, templateId) {
        const deleted = await this.whatsappRepository.deleteTemplate(churchId, templateId);
        if (!deleted) {
            throw new AppError_1.AppError('Template not found', 404);
        }
    }
    async syncTemplates(churchId) {
        try {
            const response = await SendchampService_1.sendchamp.getWhatsAppTemplates();
            return this.getTemplates(churchId);
        }
        catch (error) {
            logger_1.default.error('Failed to sync templates:', error);
            throw new AppError_1.AppError('Failed to sync templates with WhatsApp', 500);
        }
    }
    buildTemplateComponents(data) {
        const components = [];
        if (data.headerType && data.headerType !== 'none') {
            components.push({
                type: 'HEADER',
                format: data.headerType.toUpperCase(),
                text: data.headerType === 'text' ? data.headerContent : undefined,
            });
        }
        components.push({
            type: 'BODY',
            text: data.bodyText,
        });
        if (data.footerText) {
            components.push({
                type: 'FOOTER',
                text: data.footerText,
            });
        }
        if (data.buttons && data.buttons.length > 0) {
            components.push({
                type: 'BUTTONS',
                buttons: data.buttons,
            });
        }
        return components;
    }
    // ============================================================================
    // COMPOSE & SEND
    // ============================================================================
    async compose(churchId, data, userId) {
        try {
            const template = await this.getTemplateById(churchId, data.templateId);
            if (template.status !== 'approved') {
                throw new AppError_1.AppError('Template is not approved for use', 400);
            }
            const recipients = await this.getRecipients(churchId, data);
            if (recipients.length === 0 && data.sendOption !== 'draft') {
                throw new AppError_1.AppError('No valid recipients found', 400);
            }
            if (data.sendOption === 'now') {
                const balance = await this.walletService.getBalance(churchId, 'whatsapp');
                if (balance < recipients.length) {
                    throw new AppError_1.AppError(`Insufficient WhatsApp units. Required: ${recipients.length}, Available: ${balance}`, 400);
                }
            }
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            const status = data.sendOption === 'draft' ? 'draft' :
                data.sendOption === 'schedule' ? 'scheduled' : 'sending';
            const campaign = await this.whatsappRepository.createCampaign(churchId, {
                name: data.name,
                templateId: data.templateId,
                accountId: account?.id,
                destinationType: data.destinationType,
                groupIds: data.groupIds,
                memberIds: data.memberIds,
                phoneNumbers: data.phoneNumbers,
                uploadedContacts: data.uploadedContacts,
                templateVariables: data.templateVariables,
                mediaUrl: data.mediaUrl,
                status,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            }, userId);
            await this.whatsappRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });
            if (data.sendOption === 'now') {
                await this.processCampaign(churchId, campaign.id, recipients, template, account, data.templateVariables, userId);
            }
            logger_1.default.info(`WhatsApp campaign created: ${campaign.id} for church ${churchId}`);
            return (await this.whatsappRepository.getCampaignById(churchId, campaign.id));
        }
        catch (error) {
            logger_1.default.error('Error composing WhatsApp message:', error);
            throw error;
        }
    }
    /**
     * Send a single WhatsApp message (non-template, within 24h window)
     */
    async sendWhatsAppMessage(churchId, data, userId) {
        try {
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            if (!account) {
                throw new AppError_1.AppError('No active WhatsApp account found. Please set up an account first.', 400);
            }
            const balance = await this.walletService.getBalance(churchId, 'whatsapp');
            if (balance < 1) {
                throw new AppError_1.AppError('Insufficient WhatsApp units', 400);
            }
            const formattedPhone = this.formatPhoneNumber(data.phoneNumber);
            const message = await this.whatsappRepository.createMessage(churchId, {
                accountId: account.id,
                phoneNumber: formattedPhone,
                messageType: data.media ? 'image' : 'text',
                content: data.message,
                mediaUrl: data.media?.url,
                direction: 'outbound',
                cost: 1,
            }, userId);
            try {
                // Build the SendWhatsAppParams object
                const sendParams = {
                    recipient: formattedPhone,
                    sender: account.phone_number,
                    type: data.media ? 'image' : 'text',
                    message: data.message,
                };
                // Add media if present
                if (data.media) {
                    sendParams.media = {
                        url: data.media.url,
                        caption: data.media.caption,
                    };
                }
                const result = await SendchampService_1.sendchamp.sendWhatsApp(sendParams);
                if (result.status === 'success') {
                    await this.whatsappRepository.updateMessageStatus(message.id, 'sent', result.data?.id);
                    await this.walletService.deductUnits(churchId, 'whatsapp', 1, message.id, `WhatsApp message to ${formattedPhone}`, userId);
                }
                else {
                    await this.whatsappRepository.updateMessageStatus(message.id, 'failed', undefined, result.code?.toString(), result.message);
                }
            }
            catch (sendError) {
                await this.whatsappRepository.updateMessageStatus(message.id, 'failed', undefined, undefined, sendError.message);
                throw new AppError_1.AppError(`Failed to send message: ${sendError.message}`, 500);
            }
            return message;
        }
        catch (error) {
            logger_1.default.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }
    /**
     * Send bulk WhatsApp messages (non-template, within 24h window)
     */
    async sendBulkWhatsApp(churchId, data, userId) {
        try {
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            if (!account) {
                throw new AppError_1.AppError('No active WhatsApp account found', 400);
            }
            const balance = await this.walletService.getBalance(churchId, 'whatsapp');
            if (balance < data.phoneNumbers.length) {
                throw new AppError_1.AppError(`Insufficient WhatsApp units. Required: ${data.phoneNumbers.length}, Available: ${balance}`, 400);
            }
            let sent = 0;
            let failed = 0;
            for (const phone of data.phoneNumbers) {
                try {
                    await this.sendWhatsAppMessage(churchId, {
                        phoneNumber: phone,
                        message: data.message,
                        media: data.media,
                    }, userId);
                    sent++;
                }
                catch (error) {
                    logger_1.default.error(`Failed to send WhatsApp to ${phone}:`, error);
                    failed++;
                }
            }
            logger_1.default.info(`Bulk WhatsApp: ${sent} sent, ${failed} failed for church ${churchId}`);
            return { sent, failed };
        }
        catch (error) {
            logger_1.default.error('Error sending bulk WhatsApp:', error);
            throw error;
        }
    }
    // ============================================================================
    // RECIPIENTS
    // ============================================================================
    async getRecipients(churchId, data) {
        const recipients = [];
        switch (data.destinationType) {
            case 'all_contacts': {
                const members = await this.memberRepository.findAll({
                    churchId,
                    page: 1,
                    limit: 10000,
                });
                members.members.forEach((m) => {
                    if (m.phone) {
                        recipients.push({
                            phone: this.formatPhoneNumber(m.phone),
                            name: `${m.first_name} ${m.last_name}`.trim(),
                            memberId: m.id,
                        });
                    }
                });
                break;
            }
            case 'groups': {
                if (data.groupIds?.length) {
                    for (const groupId of data.groupIds) {
                        const members = await this.groupRepository.getGroupMembers(groupId);
                        members.forEach((gm) => {
                            if (gm.member?.phone) {
                                recipients.push({
                                    phone: this.formatPhoneNumber(gm.member.phone),
                                    name: `${gm.member.first_name} ${gm.member.last_name}`.trim(),
                                    memberId: gm.member_id,
                                });
                            }
                        });
                    }
                }
                break;
            }
            case 'members': {
                if (data.memberIds?.length) {
                    for (const memberId of data.memberIds) {
                        const member = await this.memberRepository.findById(memberId, churchId);
                        if (member?.phone) {
                            recipients.push({
                                phone: this.formatPhoneNumber(member.phone),
                                name: `${member.first_name} ${member.last_name}`.trim(),
                                memberId: member.id,
                            });
                        }
                    }
                }
                break;
            }
            case 'phone_numbers': {
                if (data.phoneNumbers?.length) {
                    data.phoneNumbers.forEach((phone) => {
                        const trimmed = phone.trim();
                        if (trimmed) {
                            recipients.push({ phone: this.formatPhoneNumber(trimmed) });
                        }
                    });
                }
                break;
            }
            case 'uploaded': {
                if (data.uploadedContacts?.length) {
                    data.uploadedContacts.forEach((contact) => {
                        if (contact.phone) {
                            recipients.push({
                                phone: this.formatPhoneNumber(contact.phone),
                                name: contact.name,
                            });
                        }
                    });
                }
                break;
            }
        }
        // Remove duplicates by phone number
        return Array.from(new Map(recipients.map((r) => [r.phone, r])).values());
    }
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0') && cleaned.length === 11) {
            cleaned = '234' + cleaned.substring(1);
        }
        if (!cleaned.startsWith('234') && cleaned.length === 10) {
            cleaned = '234' + cleaned;
        }
        return cleaned;
    }
    // ============================================================================
    // PROCESS CAMPAIGN
    // ============================================================================
    async processCampaign(churchId, campaignId, recipients, template, account, templateVariables, userId) {
        try {
            const senderPhone = account?.phone_number || process.env.WHATSAPP_DEFAULT_SENDER || '';
            let costPerMessage = 4.5;
            try {
                const pricing = await this.walletService.getPricing('whatsapp', 'NG');
                costPerMessage = pricing?.sell_price || 4.5;
            }
            catch (e) {
                logger_1.default.warn('Failed to get WhatsApp pricing, using default');
            }
            const messages = recipients.map((r) => ({
                campaignId,
                accountId: account?.id,
                memberId: r.memberId,
                phoneNumber: r.phone,
                recipientName: r.name,
                templateId: template.id,
                templateName: template.name,
                messageType: 'template',
                content: this.personalizeTemplate(template.body_text, r.name, templateVariables),
                cost: costPerMessage,
            }));
            const createdMessages = await this.whatsappRepository.createMessages(churchId, messages, userId);
            const totalUnits = recipients.length;
            await this.walletService.deductUnits(churchId, 'whatsapp', totalUnits, campaignId, `WhatsApp campaign: ${recipients.length} messages`, userId);
            await this.whatsappRepository.incrementTemplateUsage(template.id);
            let successCount = 0;
            let failCount = 0;
            for (const msg of createdMessages) {
                try {
                    const result = await SendchampService_1.sendchamp.sendWhatsAppTemplate(msg.phone_number, senderPhone, template.template_id || template.name, {
                        ...templateVariables,
                        name: msg.recipient_name || 'Member',
                    });
                    if (result.status === 'success') {
                        await this.whatsappRepository.updateMessageStatus(msg.id, 'sent', result.data?.id);
                        successCount++;
                    }
                    else {
                        await this.whatsappRepository.updateMessageStatus(msg.id, 'failed', undefined, result.code?.toString(), result.message);
                        failCount++;
                    }
                }
                catch (error) {
                    await this.whatsappRepository.updateMessageStatus(msg.id, 'failed', undefined, undefined, error.message);
                    failCount++;
                }
            }
            await this.whatsappRepository.updateCampaign(churchId, campaignId, {
                status: failCount === recipients.length ? 'failed' : 'sent',
                sent_at: new Date(),
                sent_count: successCount,
                failed_count: failCount,
                total_cost: totalUnits * costPerMessage,
                units_used: totalUnits,
            });
            logger_1.default.info(`WhatsApp campaign ${campaignId} processed: ${successCount} sent, ${failCount} failed`);
        }
        catch (error) {
            logger_1.default.error('Error processing WhatsApp campaign:', error);
            await this.whatsappRepository.updateCampaign(churchId, campaignId, { status: 'failed' });
            throw error;
        }
    }
    personalizeTemplate(template, name, variables) {
        let result = template;
        if (name) {
            result = result.replace(/{{1}}/g, name);
            result = result.replace(/#name/gi, name);
        }
        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });
        }
        return result;
    }
    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async getCampaigns(churchId, filters) {
        return this.whatsappRepository.getCampaigns(churchId, filters);
    }
    async getCampaignById(churchId, campaignId) {
        const campaign = await this.whatsappRepository.getCampaignById(churchId, campaignId);
        if (!campaign) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return campaign;
    }
    async getCampaignReport(churchId, campaignId) {
        const report = await this.whatsappRepository.getCampaignReport(churchId, campaignId);
        if (!report) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return report;
    }
    async updateCampaign(churchId, campaignId, data) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
            throw new AppError_1.AppError('Only draft or scheduled campaigns can be updated', 400);
        }
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.templateId !== undefined)
            updateData.template_id = data.templateId;
        if (data.destinationType !== undefined)
            updateData.destination_type = data.destinationType;
        if (data.groupIds !== undefined)
            updateData.group_ids = data.groupIds;
        if (data.memberIds !== undefined)
            updateData.member_ids = data.memberIds;
        if (data.phoneNumbers !== undefined)
            updateData.phone_numbers = data.phoneNumbers;
        if (data.uploadedContacts !== undefined)
            updateData.uploaded_contacts = data.uploadedContacts;
        if (data.templateVariables !== undefined)
            updateData.template_variables = data.templateVariables;
        if (data.mediaUrl !== undefined)
            updateData.media_url = data.mediaUrl;
        if (data.sendOption === 'now') {
            updateData.status = 'sending';
        }
        else if (data.sendOption === 'schedule' && data.scheduledAt) {
            updateData.status = 'scheduled';
            updateData.scheduled_at = new Date(data.scheduledAt);
        }
        const updated = await this.whatsappRepository.updateCampaign(churchId, campaignId, updateData);
        if (!updated) {
            throw new AppError_1.AppError('Failed to update campaign', 500);
        }
        if (data.sendOption === 'now') {
            const template = await this.getTemplateById(churchId, updated.template_id || data.templateId);
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            const recipients = await this.getRecipients(churchId, {
                destinationType: (data.destinationType || campaign.destination_type),
                groupIds: data.groupIds || campaign.group_ids,
                memberIds: data.memberIds || campaign.member_ids,
                phoneNumbers: data.phoneNumbers || campaign.phone_numbers,
                uploadedContacts: data.uploadedContacts || campaign.uploaded_contacts,
                templateId: data.templateId || campaign.template_id,
                sendOption: 'now',
            });
            await this.processCampaign(churchId, campaignId, recipients, template, account, data.templateVariables || campaign.template_variables);
        }
        return (await this.whatsappRepository.getCampaignById(churchId, campaignId));
    }
    async getDrafts(churchId) {
        return this.whatsappRepository.getDrafts(churchId);
    }
    async getScheduled(churchId) {
        return this.whatsappRepository.getScheduled(churchId);
    }
    async deleteDraft(churchId, campaignId) {
        const deleted = await this.whatsappRepository.deleteCampaign(churchId, campaignId);
        if (!deleted) {
            throw new AppError_1.AppError('Draft not found or cannot be deleted', 404);
        }
    }
    async cancelScheduled(churchId, campaignId) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (campaign.status !== 'scheduled') {
            throw new AppError_1.AppError('Only scheduled campaigns can be cancelled', 400);
        }
        const updated = await this.whatsappRepository.updateCampaign(churchId, campaignId, {
            status: 'cancelled',
        });
        if (!updated) {
            throw new AppError_1.AppError('Failed to cancel campaign', 500);
        }
        return updated;
    }
    async deleteCampaign(churchId, campaignId) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (campaign.status !== 'draft') {
            throw new AppError_1.AppError('Only draft campaigns can be deleted', 400);
        }
        await this.whatsappRepository.deleteCampaign(churchId, campaignId);
    }
    // ============================================================================
    // MESSAGES & CONVERSATIONS
    // ============================================================================
    async getMessages(churchId, filters) {
        return this.whatsappRepository.getMessages(churchId, filters);
    }
    async getMessagesByCampaign(churchId, campaignId) {
        return this.whatsappRepository.getMessages(churchId, { campaignId });
    }
    async getConversations(churchId, filters) {
        return this.whatsappRepository.getConversations(churchId, filters);
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStats(churchId) {
        return this.whatsappRepository.getStats(churchId);
    }
    // ============================================================================
    // WEBHOOKS
    // ============================================================================
    async handleIncomingMessage(data) {
        const query = `
            SELECT * FROM whatsapp_accounts
            WHERE phone_number = $1 AND status = 'active'
                LIMIT 1
        `;
        const { rows } = await database_1.pool.query(query, [data.to]);
        if (rows.length === 0) {
            logger_1.default.warn(`No active WhatsApp account found for: ${data.to}`);
            return;
        }
        const account = rows[0];
        await this.whatsappRepository.getOrCreateConversation(account.church_id, account.id, data.from);
        await this.whatsappRepository.createMessage(account.church_id, {
            accountId: account.id,
            phoneNumber: data.from,
            messageType: 'text',
            content: data.message,
            direction: 'inbound',
        });
        logger_1.default.info(`Inbound WhatsApp message received from ${data.from}`);
    }
    async handleStatusUpdate(data) {
        const statusMap = {
            sent: 'sent',
            delivered: 'delivered',
            read: 'read',
            failed: 'failed',
        };
        const status = statusMap[data.status];
        if (!status)
            return;
        const query = `SELECT id FROM whatsapp_messages WHERE sendchamp_id = $1`;
        const { rows } = await database_1.pool.query(query, [data.messageId]);
        if (rows.length > 0) {
            await this.whatsappRepository.updateMessageStatus(rows[0].id, status);
            logger_1.default.info(`WhatsApp message status updated: ${data.messageId} -> ${status}`);
        }
    }
    // ============================================================================
    // SCHEDULED JOBS
    // ============================================================================
    async processScheduledCampaigns() {
        try {
            const campaigns = await this.whatsappRepository.getScheduledForProcessing();
            for (const campaign of campaigns) {
                try {
                    const template = await this.getTemplateById(campaign.church_id, campaign.template_id);
                    const account = await this.whatsappRepository.getDefaultAccount(campaign.church_id);
                    const recipients = await this.getRecipients(campaign.church_id, {
                        destinationType: campaign.destination_type,
                        groupIds: campaign.group_ids,
                        memberIds: campaign.member_ids,
                        phoneNumbers: campaign.phone_numbers,
                        uploadedContacts: campaign.uploaded_contacts,
                        templateId: campaign.template_id,
                        sendOption: 'now',
                    });
                    await this.processCampaign(campaign.church_id, campaign.id, recipients, template, account, campaign.template_variables);
                }
                catch (error) {
                    logger_1.default.error(`Failed to process scheduled WhatsApp campaign ${campaign.id}:`, error);
                    await this.whatsappRepository.updateCampaign(campaign.church_id, campaign.id, { status: 'failed' });
                }
            }
        }
        catch (error) {
            logger_1.default.error('Error processing scheduled WhatsApp campaigns:', error);
        }
    }
}
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=WhatsAppService.js.map