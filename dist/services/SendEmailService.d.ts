import { EmailConfiguration, EmailTemplate, EmailCampaign, CreateEmailConfigDTO, CreateEmailTemplateDTO, UpdateEmailTemplateDTO, ComposeEmailDTO, EmailCampaignFilters, EmailFilters, PaginatedEmailCampaigns, PaginatedEmails, EmailStats, EmailCampaignReport } from '@/dtos/email.types';
interface EmailProvider {
    sendEmail(data: {
        to: string;
        toName?: string;
        from: string;
        fromName: string;
        replyTo?: string;
        subject: string;
        html: string;
        text?: string;
        attachments?: Array<{
            filename: string;
            path: string;
        }>;
    }): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
export declare class EmailService {
    private emailRepository;
    private memberRepository;
    private groupRepository;
    private emailProvider?;
    private uploadDir;
    constructor(emailProvider?: EmailProvider);
    createConfiguration(churchId: string, data: CreateEmailConfigDTO): Promise<EmailConfiguration>;
    getConfigurations(churchId: string): Promise<EmailConfiguration[]>;
    setDefaultConfiguration(churchId: string, configId: string): Promise<void>;
    deleteConfiguration(churchId: string, configId: string): Promise<void>;
    createTemplate(churchId: string, data: CreateEmailTemplateDTO, userId?: string): Promise<EmailTemplate>;
    getTemplates(churchId: string, activeOnly?: boolean): Promise<EmailTemplate[]>;
    getTemplateById(churchId: string, templateId: string): Promise<EmailTemplate>;
    updateTemplate(churchId: string, templateId: string, data: UpdateEmailTemplateDTO): Promise<EmailTemplate>;
    deleteTemplate(churchId: string, templateId: string): Promise<void>;
    composeEmail(churchId: string, data: ComposeEmailDTO, attachments?: Express.Multer.File[], userId?: string): Promise<EmailCampaign>;
    private getRecipients;
    private processCampaign;
    getCampaigns(filters: EmailCampaignFilters): Promise<PaginatedEmailCampaigns>;
    getCampaignById(churchId: string, campaignId: string): Promise<EmailCampaign>;
    getCampaignReport(churchId: string, campaignId: string): Promise<EmailCampaignReport>;
    getDrafts(churchId: string): Promise<EmailCampaign[]>;
    getScheduled(churchId: string): Promise<EmailCampaign[]>;
    deleteDraft(churchId: string, campaignId: string): Promise<void>;
    cancelScheduled(churchId: string, campaignId: string): Promise<EmailCampaign>;
    getSentEmails(filters: EmailFilters): Promise<PaginatedEmails>;
    trackOpen(emailId: string): Promise<void>;
    trackClick(emailId: string, url: string, ipAddress?: string, userAgent?: string): Promise<void>;
    getStats(churchId: string): Promise<EmailStats>;
    processScheduledCampaigns(): Promise<void>;
}
export {};
//# sourceMappingURL=SendEmailService.d.ts.map