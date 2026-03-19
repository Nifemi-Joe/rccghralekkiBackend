// src/services/WhatsAppService.ts
import { WhatsAppRepository, WhatsAppAccount, WhatsAppTemplate, WhatsAppCampaign, WhatsAppMessage } from '@repositories/WhatsAppRepository';
import { WalletService } from '@services/WalletService';
import { MemberRepository } from '@repositories/MemberRepository';
import { GroupRepository } from '@repositories/GroupRepository';
import { sendchamp } from '@services/SendchampService';
import { AppError } from '@utils/AppError';
import { pool } from '@config/database';
import logger from '@config/logger';

export interface ComposeWhatsAppDTO {
    destinationType: 'all_contacts' | 'groups' | 'members' | 'phone_numbers' | 'uploaded';
    groupIds?: string[];
    memberIds?: string[];
    phoneNumbers?: string[];
    uploadedContacts?: Array<{ phone: string; name?: string }>;
    templateId: string;
    templateVariables?: Record<string, string>;
    mediaUrl?: string;
    sendOption: 'now' | 'schedule' | 'draft';
    scheduledAt?: string;
    name?: string;
}

export class WhatsAppService {
    private whatsappRepository: WhatsAppRepository;
    private walletService: WalletService;
    private memberRepository: MemberRepository;
    private groupRepository: GroupRepository;

    constructor() {
        this.whatsappRepository = new WhatsAppRepository();
        this.walletService = new WalletService();
        this.memberRepository = new MemberRepository();
        this.groupRepository = new GroupRepository();
    }

    // ============================================================================
    // ACCOUNTS
    // ============================================================================

    async getAccounts(churchId: string): Promise<WhatsAppAccount[]> {
        return this.whatsappRepository.getAccounts(churchId);
    }

    async createAccount(churchId: string, data: {
        phoneNumber: string;
        displayName?: string;
    }): Promise<WhatsAppAccount> {
        const account = await this.whatsappRepository.createAccount(churchId, {
            phoneNumber: data.phoneNumber,
            displayName: data.displayName,
        });

        logger.info(`WhatsApp account registered: ${data.phoneNumber} for church ${churchId}`);
        return account;
    }

    async setDefaultAccount(churchId: string, accountId: string): Promise<void> {
        return this.whatsappRepository.setDefaultAccount(churchId, accountId);
    }

    // ============================================================================
    // TEMPLATES
    // ============================================================================

    async getTemplates(churchId: string, filters?: { status?: string; category?: string }): Promise<WhatsAppTemplate[]> {
        return this.whatsappRepository.getTemplates(churchId, filters);
    }

    async getApprovedTemplates(churchId: string): Promise<WhatsAppTemplate[]> {
        return this.whatsappRepository.getApprovedTemplates(churchId);
    }

    async getTemplateById(churchId: string, templateId: string): Promise<WhatsAppTemplate> {
        const template = await this.whatsappRepository.getTemplateById(churchId, templateId);
        if (!template) {
            throw new AppError('Template not found', 404);
        }
        return template;
    }

    async createTemplate(churchId: string, data: {
        name: string;
        category: 'marketing' | 'utility' | 'authentication';
        language?: string;
        headerType?: string;
        headerContent?: string;
        bodyText: string;
        footerText?: string;
        buttons?: any[];
        variables?: any;
        sampleValues?: any;
    }, userId?: string): Promise<WhatsAppTemplate> {
        try {
            const sendchampResponse = await sendchamp.createWhatsAppTemplate({
                name: data.name,
                category: data.category,
                language: data.language || 'en',
                components: this.buildTemplateComponents(data),
            });

            const template = await this.whatsappRepository.createTemplate(
                churchId,
                {
                    ...data,
                    templateId: sendchampResponse.data?.template_id,
                },
                userId
            );

            logger.info(`WhatsApp template created: ${data.name} for church ${churchId}`);
            return template;
        } catch (error: any) {
            logger.warn('Failed to create template on Sendchamp, creating locally:', error.message);
            return this.whatsappRepository.createTemplate(churchId, data, userId);
        }
    }

    async updateTemplate(churchId: string, templateId: string, data: {
        name?: string;
        category?: 'marketing' | 'utility' | 'authentication';
        language?: string;
        headerType?: string;
        headerContent?: string;
        bodyText?: string;
        footerText?: string;
        buttons?: any[];
        variables?: any;
        sampleValues?: any;
        isActive?: boolean;
    }): Promise<WhatsAppTemplate> {
        // Verify template exists
        await this.getTemplateById(churchId, templateId);

        const updated = await this.whatsappRepository.updateTemplate(churchId, templateId, data);
        if (!updated) {
            throw new AppError('Failed to update template', 500);
        }

        return updated;
    }

    async deleteTemplate(churchId: string, templateId: string): Promise<void> {
        const deleted = await this.whatsappRepository.deleteTemplate(churchId, templateId);
        if (!deleted) {
            throw new AppError('Template not found', 404);
        }
    }

    async syncTemplates(churchId: string): Promise<WhatsAppTemplate[]> {
        try {
            const response = await sendchamp.getWhatsAppTemplates();
            return this.getTemplates(churchId);
        } catch (error) {
            logger.error('Failed to sync templates:', error);
            throw new AppError('Failed to sync templates with WhatsApp', 500);
        }
    }

    private buildTemplateComponents(data: any): any[] {
        const components: any[] = [];

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

    async compose(churchId: string, data: ComposeWhatsAppDTO, userId?: string): Promise<WhatsAppCampaign> {
        try {
            const template = await this.getTemplateById(churchId, data.templateId);
            if (template.status !== 'approved') {
                throw new AppError('Template is not approved for use', 400);
            }

            const recipients = await this.getRecipients(churchId, data);
            if (recipients.length === 0 && data.sendOption !== 'draft') {
                throw new AppError('No valid recipients found', 400);
            }

            if (data.sendOption === 'now') {
                const balance = await this.walletService.getBalance(churchId, 'whatsapp');
                if (balance < recipients.length) {
                    throw new AppError(
                        `Insufficient WhatsApp units. Required: ${recipients.length}, Available: ${balance}`,
                        400
                    );
                }
            }

            const account = await this.whatsappRepository.getDefaultAccount(churchId);

            const status = data.sendOption === 'draft' ? 'draft' :
                data.sendOption === 'schedule' ? 'scheduled' : 'sending';

            const campaign = await this.whatsappRepository.createCampaign(
                churchId,
                {
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
                },
                userId
            );

            await this.whatsappRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });

            if (data.sendOption === 'now') {
                await this.processCampaign(
                    churchId,
                    campaign.id,
                    recipients,
                    template,
                    account,
                    data.templateVariables,
                    userId
                );
            }

            logger.info(`WhatsApp campaign created: ${campaign.id} for church ${churchId}`);
            return (await this.whatsappRepository.getCampaignById(churchId, campaign.id)) as WhatsAppCampaign;
        } catch (error) {
            logger.error('Error composing WhatsApp message:', error);
            throw error;
        }
    }

    /**
     * Send a single WhatsApp message (non-template, within 24h window)
     */
    async sendWhatsAppMessage(
        churchId: string,
        data: {
            phoneNumber: string;
            message: string;
            media?: { url: string; caption?: string };
        },
        userId?: string
    ): Promise<WhatsAppMessage> {
        try {
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            if (!account) {
                throw new AppError('No active WhatsApp account found. Please set up an account first.', 400);
            }

            const balance = await this.walletService.getBalance(churchId, 'whatsapp');
            if (balance < 1) {
                throw new AppError('Insufficient WhatsApp units', 400);
            }

            const formattedPhone = this.formatPhoneNumber(data.phoneNumber);

            const message = await this.whatsappRepository.createMessage(
                churchId,
                {
                    accountId: account.id,
                    phoneNumber: formattedPhone,
                    messageType: data.media ? 'image' : 'text',
                    content: data.message,
                    mediaUrl: data.media?.url,
                    direction: 'outbound',
                    cost: 1,
                },
                userId
            );

            try {
                // Build the SendWhatsAppParams object
                const sendParams: any = {
                    recipient: formattedPhone,
                    sender: account.phone_number,
                    type: data.media ? 'image' as const : 'text' as const,
                    message: data.message,
                };

                // Add media if present
                if (data.media) {
                    sendParams.media = {
                        url: data.media.url,
                        caption: data.media.caption,
                    };
                }

                const result = await sendchamp.sendWhatsApp(sendParams);

                if (result.status === 'success') {
                    await this.whatsappRepository.updateMessageStatus(
                        message.id,
                        'sent',
                        result.data?.id
                    );

                    await this.walletService.deductUnits(
                        churchId,
                        'whatsapp',
                        1,
                        message.id,
                        `WhatsApp message to ${formattedPhone}`,
                        userId
                    );
                } else {
                    await this.whatsappRepository.updateMessageStatus(
                        message.id,
                        'failed',
                        undefined,
                        result.code?.toString(),
                        result.message
                    );
                }
            } catch (sendError: any) {
                await this.whatsappRepository.updateMessageStatus(
                    message.id,
                    'failed',
                    undefined,
                    undefined,
                    sendError.message
                );
                throw new AppError(`Failed to send message: ${sendError.message}`, 500);
            }

            return message;
        } catch (error) {
            logger.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }

    /**
     * Send bulk WhatsApp messages (non-template, within 24h window)
     */
    async sendBulkWhatsApp(
        churchId: string,
        data: {
            phoneNumbers: string[];
            message: string;
            media?: { url: string; caption?: string };
        },
        userId?: string
    ): Promise<{ sent: number; failed: number }> {
        try {
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            if (!account) {
                throw new AppError('No active WhatsApp account found', 400);
            }

            const balance = await this.walletService.getBalance(churchId, 'whatsapp');
            if (balance < data.phoneNumbers.length) {
                throw new AppError(
                    `Insufficient WhatsApp units. Required: ${data.phoneNumbers.length}, Available: ${balance}`,
                    400
                );
            }

            let sent = 0;
            let failed = 0;

            for (const phone of data.phoneNumbers) {
                try {
                    await this.sendWhatsAppMessage(
                        churchId,
                        {
                            phoneNumber: phone,
                            message: data.message,
                            media: data.media,
                        },
                        userId
                    );
                    sent++;
                } catch (error) {
                    logger.error(`Failed to send WhatsApp to ${phone}:`, error);
                    failed++;
                }
            }

            logger.info(`Bulk WhatsApp: ${sent} sent, ${failed} failed for church ${churchId}`);
            return { sent, failed };
        } catch (error) {
            logger.error('Error sending bulk WhatsApp:', error);
            throw error;
        }
    }

    // ============================================================================
    // RECIPIENTS
    // ============================================================================

    private async getRecipients(
        churchId: string,
        data: ComposeWhatsAppDTO
    ): Promise<Array<{ phone: string; name?: string; memberId?: string }>> {
        const recipients: Array<{ phone: string; name?: string; memberId?: string }> = [];

        switch (data.destinationType) {
            case 'all_contacts': {
                const members = await this.memberRepository.findAll({
                    churchId,
                    page: 1,
                    limit: 10000,
                });
                members.members.forEach((m: any) => {
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
                        members.forEach((gm: any) => {
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

    private formatPhoneNumber(phone: string): string {
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

    private async processCampaign(
        churchId: string,
        campaignId: string,
        recipients: Array<{ phone: string; name?: string; memberId?: string }>,
        template: WhatsAppTemplate,
        account: WhatsAppAccount | null,
        templateVariables?: Record<string, string>,
        userId?: string
    ): Promise<void> {
        try {
            const senderPhone = account?.phone_number || process.env.WHATSAPP_DEFAULT_SENDER || '';

            let costPerMessage = 4.5;
            try {
                const pricing = await this.walletService.getPricing('whatsapp', 'NG');
                costPerMessage = pricing?.sell_price || 4.5;
            } catch (e) {
                logger.warn('Failed to get WhatsApp pricing, using default');
            }

            const messages = recipients.map((r) => ({
                campaignId,
                accountId: account?.id,
                memberId: r.memberId,
                phoneNumber: r.phone,
                recipientName: r.name,
                templateId: template.id,
                templateName: template.name,
                messageType: 'template' as const,
                content: this.personalizeTemplate(template.body_text, r.name, templateVariables),
                cost: costPerMessage,
            }));

            const createdMessages = await this.whatsappRepository.createMessages(churchId, messages, userId);

            const totalUnits = recipients.length;
            await this.walletService.deductUnits(
                churchId,
                'whatsapp',
                totalUnits,
                campaignId,
                `WhatsApp campaign: ${recipients.length} messages`,
                userId
            );

            await this.whatsappRepository.incrementTemplateUsage(template.id);

            let successCount = 0;
            let failCount = 0;

            for (const msg of createdMessages) {
                try {
                    const result = await sendchamp.sendWhatsAppTemplate(
                        msg.phone_number,
                        senderPhone,
                        template.template_id || template.name,
                        {
                            ...templateVariables,
                            name: msg.recipient_name || 'Member',
                        }
                    );

                    if (result.status === 'success') {
                        await this.whatsappRepository.updateMessageStatus(
                            msg.id,
                            'sent',
                            result.data?.id
                        );
                        successCount++;
                    } else {
                        await this.whatsappRepository.updateMessageStatus(
                            msg.id,
                            'failed',
                            undefined,
                            result.code?.toString(),
                            result.message
                        );
                        failCount++;
                    }
                } catch (error: any) {
                    await this.whatsappRepository.updateMessageStatus(
                        msg.id,
                        'failed',
                        undefined,
                        undefined,
                        error.message
                    );
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

            logger.info(`WhatsApp campaign ${campaignId} processed: ${successCount} sent, ${failCount} failed`);
        } catch (error) {
            logger.error('Error processing WhatsApp campaign:', error);
            await this.whatsappRepository.updateCampaign(churchId, campaignId, { status: 'failed' });
            throw error;
        }
    }

    private personalizeTemplate(
        template: string,
        name?: string,
        variables?: Record<string, string>
    ): string {
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

    async getCampaigns(churchId: string, filters?: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        return this.whatsappRepository.getCampaigns(churchId, filters);
    }

    async getCampaignById(churchId: string, campaignId: string): Promise<WhatsAppCampaign> {
        const campaign = await this.whatsappRepository.getCampaignById(churchId, campaignId);
        if (!campaign) {
            throw new AppError('Campaign not found', 404);
        }
        return campaign;
    }

    async getCampaignReport(churchId: string, campaignId: string) {
        const report = await this.whatsappRepository.getCampaignReport(churchId, campaignId);
        if (!report) {
            throw new AppError('Campaign not found', 404);
        }
        return report;
    }

    async updateCampaign(
        churchId: string,
        campaignId: string,
        data: Partial<ComposeWhatsAppDTO>
    ): Promise<WhatsAppCampaign> {
        const campaign = await this.getCampaignById(churchId, campaignId);

        if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
            throw new AppError('Only draft or scheduled campaigns can be updated', 400);
        }

        const updateData: any = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.templateId !== undefined) updateData.template_id = data.templateId;
        if (data.destinationType !== undefined) updateData.destination_type = data.destinationType;
        if (data.groupIds !== undefined) updateData.group_ids = data.groupIds;
        if (data.memberIds !== undefined) updateData.member_ids = data.memberIds;
        if (data.phoneNumbers !== undefined) updateData.phone_numbers = data.phoneNumbers;
        if (data.uploadedContacts !== undefined) updateData.uploaded_contacts = data.uploadedContacts;
        if (data.templateVariables !== undefined) updateData.template_variables = data.templateVariables;
        if (data.mediaUrl !== undefined) updateData.media_url = data.mediaUrl;

        if (data.sendOption === 'now') {
            updateData.status = 'sending';
        } else if (data.sendOption === 'schedule' && data.scheduledAt) {
            updateData.status = 'scheduled';
            updateData.scheduled_at = new Date(data.scheduledAt);
        }

        const updated = await this.whatsappRepository.updateCampaign(churchId, campaignId, updateData);
        if (!updated) {
            throw new AppError('Failed to update campaign', 500);
        }

        if (data.sendOption === 'now') {
            const template = await this.getTemplateById(churchId, updated.template_id || data.templateId!);
            const account = await this.whatsappRepository.getDefaultAccount(churchId);
            const recipients = await this.getRecipients(churchId, {
                destinationType: (data.destinationType || campaign.destination_type) as any,
                groupIds: data.groupIds || campaign.group_ids,
                memberIds: data.memberIds || campaign.member_ids,
                phoneNumbers: data.phoneNumbers || campaign.phone_numbers,
                uploadedContacts: data.uploadedContacts || campaign.uploaded_contacts,
                templateId: data.templateId || campaign.template_id!,
                sendOption: 'now',
            });

            await this.processCampaign(
                churchId,
                campaignId,
                recipients,
                template,
                account,
                data.templateVariables || campaign.template_variables
            );
        }

        return (await this.whatsappRepository.getCampaignById(churchId, campaignId)) as WhatsAppCampaign;
    }

    async getDrafts(churchId: string): Promise<WhatsAppCampaign[]> {
        return this.whatsappRepository.getDrafts(churchId);
    }

    async getScheduled(churchId: string): Promise<WhatsAppCampaign[]> {
        return this.whatsappRepository.getScheduled(churchId);
    }

    async deleteDraft(churchId: string, campaignId: string): Promise<void> {
        const deleted = await this.whatsappRepository.deleteCampaign(churchId, campaignId);
        if (!deleted) {
            throw new AppError('Draft not found or cannot be deleted', 404);
        }
    }

    async cancelScheduled(churchId: string, campaignId: string): Promise<WhatsAppCampaign> {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (campaign.status !== 'scheduled') {
            throw new AppError('Only scheduled campaigns can be cancelled', 400);
        }

        const updated = await this.whatsappRepository.updateCampaign(churchId, campaignId, {
            status: 'cancelled',
        });

        if (!updated) {
            throw new AppError('Failed to cancel campaign', 500);
        }

        return updated;
    }

    async deleteCampaign(churchId: string, campaignId: string): Promise<void> {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (campaign.status !== 'draft') {
            throw new AppError('Only draft campaigns can be deleted', 400);
        }
        await this.whatsappRepository.deleteCampaign(churchId, campaignId);
    }

    // ============================================================================
    // MESSAGES & CONVERSATIONS
    // ============================================================================

    async getMessages(churchId: string, filters?: {
        campaignId?: string;
        status?: string;
        direction?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        return this.whatsappRepository.getMessages(churchId, filters);
    }

    async getMessagesByCampaign(churchId: string, campaignId: string) {
        return this.whatsappRepository.getMessages(churchId, { campaignId });
    }

    async getConversations(churchId: string, filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }) {
        return this.whatsappRepository.getConversations(churchId, filters);
    }

    // ============================================================================
    // STATISTICS
    // ============================================================================

    async getStats(churchId: string) {
        return this.whatsappRepository.getStats(churchId);
    }

    // ============================================================================
    // WEBHOOKS
    // ============================================================================

    async handleIncomingMessage(data: {
        from: string;
        to: string;
        message: string;
        messageId: string;
        timestamp: string;
    }): Promise<void> {
        const query = `
            SELECT * FROM whatsapp_accounts
            WHERE phone_number = $1 AND status = 'active'
                LIMIT 1
        `;
        const { rows } = await pool.query(query, [data.to]);

        if (rows.length === 0) {
            logger.warn(`No active WhatsApp account found for: ${data.to}`);
            return;
        }

        const account = rows[0];

        await this.whatsappRepository.getOrCreateConversation(
            account.church_id,
            account.id,
            data.from
        );

        await this.whatsappRepository.createMessage(account.church_id, {
            accountId: account.id,
            phoneNumber: data.from,
            messageType: 'text',
            content: data.message,
            direction: 'inbound',
        });

        logger.info(`Inbound WhatsApp message received from ${data.from}`);
    }

    async handleStatusUpdate(data: {
        messageId: string;
        status: string;
        timestamp: string;
    }): Promise<void> {
        const statusMap: Record<string, WhatsAppMessage['status']> = {
            sent: 'sent',
            delivered: 'delivered',
            read: 'read',
            failed: 'failed',
        };

        const status = statusMap[data.status];
        if (!status) return;

        const query = `SELECT id FROM whatsapp_messages WHERE sendchamp_id = $1`;
        const { rows } = await pool.query(query, [data.messageId]);

        if (rows.length > 0) {
            await this.whatsappRepository.updateMessageStatus(rows[0].id, status);
            logger.info(`WhatsApp message status updated: ${data.messageId} -> ${status}`);
        }
    }

    // ============================================================================
    // SCHEDULED JOBS
    // ============================================================================

    async processScheduledCampaigns(): Promise<void> {
        try {
            const campaigns = await this.whatsappRepository.getScheduledForProcessing();

            for (const campaign of campaigns) {
                try {
                    const template = await this.getTemplateById(
                        campaign.church_id,
                        campaign.template_id!
                    );
                    const account = await this.whatsappRepository.getDefaultAccount(
                        campaign.church_id
                    );

                    const recipients = await this.getRecipients(campaign.church_id, {
                        destinationType: campaign.destination_type as any,
                        groupIds: campaign.group_ids,
                        memberIds: campaign.member_ids,
                        phoneNumbers: campaign.phone_numbers,
                        uploadedContacts: campaign.uploaded_contacts,
                        templateId: campaign.template_id!,
                        sendOption: 'now',
                    });

                    await this.processCampaign(
                        campaign.church_id,
                        campaign.id,
                        recipients,
                        template,
                        account,
                        campaign.template_variables
                    );
                } catch (error) {
                    logger.error(
                        `Failed to process scheduled WhatsApp campaign ${campaign.id}:`,
                        error
                    );
                    await this.whatsappRepository.updateCampaign(
                        campaign.church_id,
                        campaign.id,
                        { status: 'failed' }
                    );
                }
            }
        } catch (error) {
            logger.error('Error processing scheduled WhatsApp campaigns:', error);
        }
    }
}