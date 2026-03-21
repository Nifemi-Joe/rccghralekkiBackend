"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
// src/services/EmailService.ts
const EmailRepository_1 = require("@repositories/EmailRepository");
const MemberRepository_1 = require("@repositories/MemberRepository");
const GroupRepository_1 = require("@repositories/GroupRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class EmailService {
    constructor(emailProvider) {
        this.emailRepository = new EmailRepository_1.EmailRepository();
        this.memberRepository = new MemberRepository_1.MemberRepository();
        this.groupRepository = new GroupRepository_1.GroupRepository();
        this.emailProvider = emailProvider;
        this.uploadDir = process.env.UPLOAD_DIR || './uploads/email-attachments';
        // Ensure upload directory exists
        if (!fs_1.default.existsSync(this.uploadDir)) {
            fs_1.default.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    // ============================================================================
    // CONFIGURATIONS
    // ============================================================================
    async createConfiguration(churchId, data) {
        try {
            const config = await this.emailRepository.createConfiguration(churchId, data);
            logger_1.default.info(`Email configuration created for church ${churchId}`);
            return config;
        }
        catch (error) {
            if (error.code === '23505') {
                throw new AppError_1.AppError('This email configuration already exists', 409);
            }
            logger_1.default.error('Error creating email configuration:', error);
            throw error;
        }
    }
    async getConfigurations(churchId) {
        return this.emailRepository.getConfigurations(churchId);
    }
    async setDefaultConfiguration(churchId, configId) {
        return this.emailRepository.setDefaultConfiguration(churchId, configId);
    }
    async deleteConfiguration(churchId, configId) {
        const deleted = await this.emailRepository.deleteConfiguration(churchId, configId);
        if (!deleted) {
            throw new AppError_1.AppError('Configuration not found', 404);
        }
    }
    // ============================================================================
    // TEMPLATES
    // ============================================================================
    async createTemplate(churchId, data, userId) {
        return this.emailRepository.createTemplate(churchId, data, userId);
    }
    async getTemplates(churchId, activeOnly = false) {
        return this.emailRepository.getTemplates(churchId, activeOnly);
    }
    async getTemplateById(churchId, templateId) {
        const template = await this.emailRepository.getTemplateById(churchId, templateId);
        if (!template) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return template;
    }
    async updateTemplate(churchId, templateId, data) {
        const template = await this.emailRepository.updateTemplate(churchId, templateId, data);
        if (!template) {
            throw new AppError_1.AppError('Template not found', 404);
        }
        return template;
    }
    async deleteTemplate(churchId, templateId) {
        const deleted = await this.emailRepository.deleteTemplate(churchId, templateId);
        if (!deleted) {
            throw new AppError_1.AppError('Template not found', 404);
        }
    }
    // ============================================================================
    // COMPOSE & SEND
    // ============================================================================
    async composeEmail(churchId, data, attachments, userId) {
        try {
            const recipients = await this.getRecipients(churchId, data);
            if (recipients.length === 0) {
                throw new AppError_1.AppError('No valid recipients found', 400);
            }
            const status = data.sendOption === 'draft' ? 'draft' :
                data.sendOption === 'schedule' ? 'scheduled' : 'sending';
            // Create campaign
            const campaign = await this.emailRepository.createCampaign(churchId, {
                name: data.name,
                subject: data.subject,
                htmlContent: data.htmlContent,
                textContent: data.textContent,
                fromConfigId: data.fromConfigId,
                destinationType: data.destinationType,
                groupIds: data.groupIds,
                memberIds: data.memberIds,
                otherEmails: data.otherEmails,
                status,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            }, userId);
            // Handle attachments
            if (attachments?.length) {
                for (const file of attachments) {
                    const filename = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
                    const storagePath = path_1.default.join(this.uploadDir, filename);
                    fs_1.default.writeFileSync(storagePath, file.buffer);
                    await this.emailRepository.addAttachment(campaign.id, {
                        filename,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        storagePath,
                    });
                }
            }
            // Update recipient count
            await this.emailRepository.updateCampaign(churchId, campaign.id, {
                total_recipients: recipients.length,
            });
            // If sending now, process immediately
            if (data.sendOption === 'now') {
                await this.processCampaign(churchId, campaign.id, recipients, data, userId);
            }
            logger_1.default.info(`Email campaign created: ${campaign.id} for church ${churchId}`);
            return await this.emailRepository.getCampaignById(churchId, campaign.id);
        }
        catch (error) {
            logger_1.default.error('Error composing email:', error);
            throw error;
        }
    }
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
                    if (m.email) {
                        recipients.push({
                            email: m.email,
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
                            if (gm.member?.email) {
                                recipients.push({
                                    email: gm.member.email,
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
                        if (member?.email) {
                            recipients.push({
                                email: member.email,
                                name: `${member.first_name} ${member.last_name}`.trim(),
                                memberId: member.id,
                            });
                        }
                    }
                }
                break;
            }
            case 'other_emails': {
                if (data.otherEmails?.length) {
                    data.otherEmails.forEach((email) => {
                        const trimmed = email.trim();
                        if (trimmed) {
                            recipients.push({ email: trimmed });
                        }
                    });
                }
                break;
            }
        }
        // Remove duplicates
        const uniqueRecipients = Array.from(new Map(recipients.map((r) => [r.email.toLowerCase(), r])).values());
        return uniqueRecipients;
    }
    async processCampaign(churchId, campaignId, recipients, data, userId) {
        try {
            // Get from configuration
            let fromConfig = null;
            if (data.fromConfigId) {
                const configs = await this.emailRepository.getConfigurations(churchId);
                fromConfig = configs.find((c) => c.id === data.fromConfigId) || null;
            }
            else {
                fromConfig = await this.emailRepository.getDefaultConfiguration(churchId);
            }
            if (!fromConfig) {
                // Create a default config if none exists
                fromConfig = {
                    id: '',
                    church_id: churchId,
                    from_email: 'noreply@churchflow.com',
                    from_name: 'ChurchFlow',
                    is_verified: true,
                    is_default: true,
                    created_at: new Date(),
                    updated_at: new Date(),
                };
            }
            // Get attachments
            const attachments = await this.emailRepository.getAttachments(campaignId);
            // Create emails
            const emails = recipients.map((r) => {
                const personalizedHtml = data.htmlContent.replace(/#name/gi, r.name || 'Member');
                const personalizedSubject = data.subject.replace(/#name/gi, r.name || 'Member');
                return {
                    campaignId,
                    memberId: r.memberId,
                    toEmail: r.email,
                    toName: r.name,
                    subject: personalizedSubject,
                    htmlContent: personalizedHtml,
                    textContent: data.textContent?.replace(/#name/gi, r.name || 'Member'),
                };
            });
            const createdEmails = await this.emailRepository.createEmails(churchId, emails, userId);
            // Send emails
            let sentCount = 0;
            let failCount = 0;
            for (const email of createdEmails) {
                if (this.emailProvider) {
                    try {
                        const result = await this.emailProvider.sendEmail({
                            to: email.to_email,
                            toName: email.to_name,
                            from: fromConfig.from_email,
                            fromName: fromConfig.from_name,
                            replyTo: fromConfig.reply_to_email,
                            subject: email.subject,
                            html: email.html_content,
                            text: email.text_content,
                            attachments: attachments.map((a) => ({
                                filename: a.original_name,
                                path: a.storage_path,
                            })),
                        });
                        if (result.success) {
                            await this.emailRepository.updateEmailStatus(email.id, 'sent', result.messageId);
                            sentCount++;
                        }
                        else {
                            await this.emailRepository.updateEmailStatus(email.id, 'failed', undefined, result.error);
                            failCount++;
                        }
                    }
                    catch (error) {
                        await this.emailRepository.updateEmailStatus(email.id, 'failed', undefined, error.message);
                        failCount++;
                    }
                }
                else {
                    // No provider - mark as sent for testing
                    await this.emailRepository.updateEmailStatus(email.id, 'sent', `test-${email.id}`);
                    sentCount++;
                }
            }
            // Update campaign status
            await this.emailRepository.updateCampaign(churchId, campaignId, {
                status: 'sent',
                sent_at: new Date(),
                sent_count: sentCount,
                failed_count: failCount,
            });
            logger_1.default.info(`Email campaign ${campaignId} processed: ${sentCount} sent, ${failCount} failed`);
        }
        catch (error) {
            logger_1.default.error('Error processing email campaign:', error);
            await this.emailRepository.updateCampaign(churchId, campaignId, { status: 'failed' });
            throw error;
        }
    }
    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async getCampaigns(filters) {
        return this.emailRepository.getCampaigns(filters);
    }
    async getCampaignById(churchId, campaignId) {
        const campaign = await this.emailRepository.getCampaignById(churchId, campaignId);
        if (!campaign) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return campaign;
    }
    async getCampaignReport(churchId, campaignId) {
        const report = await this.emailRepository.getCampaignReport(churchId, campaignId);
        if (!report) {
            throw new AppError_1.AppError('Campaign not found', 404);
        }
        return report;
    }
    async getDrafts(churchId) {
        return this.emailRepository.getDrafts(churchId);
    }
    async getScheduled(churchId) {
        return this.emailRepository.getScheduled(churchId);
    }
    async deleteDraft(churchId, campaignId) {
        const deleted = await this.emailRepository.deleteCampaign(churchId, campaignId);
        if (!deleted) {
            throw new AppError_1.AppError('Draft not found or cannot be deleted', 404);
        }
    }
    async cancelScheduled(churchId, campaignId) {
        const campaign = await this.getCampaignById(churchId, campaignId);
        if (campaign.status !== 'scheduled') {
            throw new AppError_1.AppError('Only scheduled campaigns can be cancelled', 400);
        }
        const updated = await this.emailRepository.updateCampaign(churchId, campaignId, {
            status: 'cancelled',
        });
        if (!updated) {
            throw new AppError_1.AppError('Failed to cancel campaign', 500);
        }
        return updated;
    }
    // ============================================================================
    // SENT EMAILS
    // ============================================================================
    async getSentEmails(filters) {
        return this.emailRepository.getEmails(filters);
    }
    // ============================================================================
    // TRACKING
    // ============================================================================
    async trackOpen(emailId) {
        await this.emailRepository.updateEmailStatus(emailId, 'opened');
    }
    async trackClick(emailId, url, ipAddress, userAgent) {
        await this.emailRepository.trackClick(emailId, url, ipAddress, userAgent);
    }
    // ============================================================================
    // STATISTICS
    // ============================================================================
    async getStats(churchId) {
        return this.emailRepository.getStats(churchId);
    }
    // ============================================================================
    // SCHEDULED JOBS
    // ============================================================================
    async processScheduledCampaigns() {
        try {
            const campaigns = await this.emailRepository.getScheduledForProcessing();
            for (const campaign of campaigns) {
                try {
                    const recipients = await this.getRecipients(campaign.church_id, {
                        destinationType: campaign.destination_type,
                        groupIds: campaign.group_ids,
                        memberIds: campaign.member_ids,
                        otherEmails: campaign.other_emails,
                        subject: campaign.subject,
                        htmlContent: campaign.html_content,
                        textContent: campaign.text_content,
                        sendOption: 'now',
                    });
                    await this.processCampaign(campaign.church_id, campaign.id, recipients, {
                        destinationType: campaign.destination_type,
                        groupIds: campaign.group_ids,
                        memberIds: campaign.member_ids,
                        otherEmails: campaign.other_emails,
                        fromConfigId: campaign.from_config_id,
                        subject: campaign.subject,
                        htmlContent: campaign.html_content,
                        textContent: campaign.text_content,
                        sendOption: 'now',
                    });
                }
                catch (error) {
                    logger_1.default.error(`Failed to process scheduled email campaign ${campaign.id}:`, error);
                    await this.emailRepository.updateCampaign(campaign.church_id, campaign.id, {
                        status: 'failed',
                    });
                }
            }
        }
        catch (error) {
            logger_1.default.error('Error processing scheduled email campaigns:', error);
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=SendEmailService.js.map