import { EmailConfiguration, EmailTemplate, EmailCampaign, Email, CreateEmailConfigDTO, CreateEmailTemplateDTO, ComposeEmailDTO, EmailCampaignFilters, EmailFilters, PaginatedEmailCampaigns, PaginatedEmails, EmailStats, EmailCampaignReport } from '@/dtos/email.types';
export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: Array<{
        filename: string;
        content?: string | Buffer;
        path?: string;
        contentType?: string;
    }>;
}
export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export interface BulkEmailOptions {
    recipients: Array<{
        email: string;
        name?: string;
    }>;
    subject: string;
    html: string;
    text?: string;
    batchSize?: number;
}
export interface BulkEmailResult {
    total: number;
    sent: number;
    failed: number;
    errors: Array<{
        email: string;
        error: string;
    }>;
}
export interface ProfileUpdateLinkData {
    firstName: string;
    lastName: string;
    churchName: string;
    updateLink: string;
}
export declare class EmailService {
    private emailRepository;
    private memberRepository;
    private groupRepository;
    private walletService;
    private transporter;
    constructor();
    private initializeTransporter;
    private getTransporter;
    sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
    sendBulkEmail(options: BulkEmailOptions): Promise<BulkEmailResult>;
    verifyConnection(): Promise<boolean>;
    sendWelcomeEmail(email: string, name: string, churchName: string): Promise<boolean>;
    sendEventReminder(email: string, name: string, eventName: string, eventDate: Date, eventLocation?: string): Promise<boolean>;
    sendBirthdayGreeting(email: string, name: string, churchName: string): Promise<boolean>;
    sendAnniversaryGreeting(email: string, name: string, spouseName: string, years: number, churchName: string): Promise<boolean>;
    sendFirstTimerFollowUp(email: string, name: string, churchName: string, visitDate: Date): Promise<boolean>;
    private getOrdinalSuffix;
    createConfiguration(churchId: string, data: CreateEmailConfigDTO): Promise<EmailConfiguration>;
    getConfigurations(churchId: string): Promise<EmailConfiguration[]>;
    setDefaultConfiguration(churchId: string, configId: string): Promise<void>;
    deleteConfiguration(churchId: string, configId: string): Promise<void>;
    createTemplate(churchId: string, data: CreateEmailTemplateDTO, userId?: string): Promise<EmailTemplate>;
    getTemplates(churchId: string, activeOnly?: boolean): Promise<EmailTemplate[]>;
    getTemplateById(churchId: string, templateId: string): Promise<EmailTemplate>;
    updateTemplate(churchId: string, templateId: string, data: any): Promise<EmailTemplate>;
    deleteTemplate(churchId: string, templateId: string): Promise<void>;
    composeEmail(churchId: string, data: ComposeEmailDTO, userId?: string): Promise<EmailCampaign>;
    sendSingleEmail(churchId: string, data: {
        toEmail: string;
        toName?: string;
        subject: string;
        htmlContent: string;
        textContent?: string;
        attachments?: any[];
    }, userId?: string): Promise<Email>;
    private sendEmailViaProvider;
    private processCampaign;
    private getRecipients;
    getCampaigns(filters: EmailCampaignFilters): Promise<PaginatedEmailCampaigns>;
    getCampaignById(churchId: string, campaignId: string): Promise<EmailCampaign>;
    deleteCampaign(churchId: string, campaignId: string): Promise<void>;
    getDrafts(churchId: string): Promise<EmailCampaign[]>;
    getScheduled(churchId: string): Promise<EmailCampaign[]>;
    getEmails(filters: EmailFilters): Promise<PaginatedEmails>;
    getStats(churchId: string): Promise<EmailStats>;
    getCampaignReport(churchId: string, campaignId: string): Promise<EmailCampaignReport>;
    processScheduledCampaigns(): Promise<void>;
    sendOtp(to: string, otp: string, firstName: string): Promise<void>;
    sendProfileUpdateLink(to: string, data: ProfileUpdateLinkData): Promise<void>;
    sendPasswordResetEmail(to: string, resetLink: string, firstName: string): Promise<void>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=EmailService.d.ts.map