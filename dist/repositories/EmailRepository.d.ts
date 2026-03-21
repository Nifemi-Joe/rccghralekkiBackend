import { EmailConfiguration, EmailTemplate, EmailCampaign, EmailAttachment, Email, EmailClick, CreateEmailConfigDTO, CreateEmailTemplateDTO, UpdateEmailTemplateDTO, EmailCampaignFilters, EmailFilters, PaginatedEmailCampaigns, PaginatedEmails, EmailStats, EmailCampaignReport } from '@/dtos/email.types';
export declare class EmailRepository {
    createConfiguration(churchId: string, data: CreateEmailConfigDTO): Promise<EmailConfiguration>;
    getConfigurations(churchId: string): Promise<EmailConfiguration[]>;
    getDefaultConfiguration(churchId: string): Promise<EmailConfiguration | null>;
    setDefaultConfiguration(churchId: string, configId: string): Promise<void>;
    deleteConfiguration(churchId: string, configId: string): Promise<boolean>;
    createTemplate(churchId: string, data: CreateEmailTemplateDTO, createdBy?: string): Promise<EmailTemplate>;
    getTemplates(churchId: string, activeOnly?: boolean): Promise<EmailTemplate[]>;
    getTemplateById(churchId: string, templateId: string): Promise<EmailTemplate | null>;
    updateTemplate(churchId: string, templateId: string, data: UpdateEmailTemplateDTO): Promise<EmailTemplate | null>;
    deleteTemplate(churchId: string, templateId: string): Promise<boolean>;
    createCampaign(churchId: string, data: {
        name?: string;
        subject: string;
        htmlContent: string;
        textContent?: string;
        templateId?: string;
        fromConfigId?: string;
        destinationType: 'all_contacts' | 'groups' | 'members' | 'other_emails';
        groupIds?: string[];
        memberIds?: string[];
        otherEmails?: string[];
        status: 'draft' | 'scheduled' | 'sending';
        scheduledAt?: Date;
    }, createdBy?: string): Promise<EmailCampaign>;
    getCampaigns(filters: EmailCampaignFilters): Promise<PaginatedEmailCampaigns>;
    getCampaignById(churchId: string, campaignId: string): Promise<EmailCampaign | null>;
    updateCampaign(churchId: string, campaignId: string, data: Partial<EmailCampaign>): Promise<EmailCampaign | null>;
    deleteCampaign(churchId: string, campaignId: string): Promise<boolean>;
    getDrafts(churchId: string): Promise<EmailCampaign[]>;
    getScheduled(churchId: string): Promise<EmailCampaign[]>;
    getScheduledForProcessing(): Promise<EmailCampaign[]>;
    addAttachment(campaignId: string, data: {
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        storagePath: string;
    }): Promise<EmailAttachment>;
    getAttachments(campaignId: string): Promise<EmailAttachment[]>;
    deleteAttachment(attachmentId: string): Promise<boolean>;
    createEmail(churchId: string, data: {
        campaignId?: string;
        memberId?: string;
        toEmail: string;
        toName?: string;
        subject: string;
        htmlContent: string;
        textContent?: string;
    }, createdBy?: string): Promise<Email>;
    createEmails(churchId: string, emails: Array<{
        campaignId?: string;
        memberId?: string;
        toEmail: string;
        toName?: string;
        subject: string;
        htmlContent: string;
        textContent?: string;
    }>, createdBy?: string): Promise<Email[]>;
    getEmails(filters: EmailFilters): Promise<PaginatedEmails>;
    getEmailsByCampaign(campaignId: string): Promise<Email[]>;
    updateEmailStatus(emailId: string, status: Email['status'], externalId?: string, errorMessage?: string): Promise<Email | null>;
    trackClick(emailId: string, url: string, ipAddress?: string, userAgent?: string): Promise<EmailClick>;
    getClicksByEmail(emailId: string): Promise<EmailClick[]>;
    getStats(churchId: string): Promise<EmailStats>;
    getCampaignReport(churchId: string, campaignId: string): Promise<EmailCampaignReport | null>;
}
//# sourceMappingURL=EmailRepository.d.ts.map