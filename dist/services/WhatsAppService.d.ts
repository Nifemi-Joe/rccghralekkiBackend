import { WhatsAppAccount, WhatsAppTemplate, WhatsAppCampaign, WhatsAppMessage } from '@repositories/WhatsAppRepository';
export interface ComposeWhatsAppDTO {
    destinationType: 'all_contacts' | 'groups' | 'members' | 'phone_numbers' | 'uploaded';
    groupIds?: string[];
    memberIds?: string[];
    phoneNumbers?: string[];
    uploadedContacts?: Array<{
        phone: string;
        name?: string;
    }>;
    templateId: string;
    templateVariables?: Record<string, string>;
    mediaUrl?: string;
    sendOption: 'now' | 'schedule' | 'draft';
    scheduledAt?: string;
    name?: string;
}
export declare class WhatsAppService {
    private whatsappRepository;
    private walletService;
    private memberRepository;
    private groupRepository;
    constructor();
    getAccounts(churchId: string): Promise<WhatsAppAccount[]>;
    createAccount(churchId: string, data: {
        phoneNumber: string;
        displayName?: string;
    }): Promise<WhatsAppAccount>;
    setDefaultAccount(churchId: string, accountId: string): Promise<void>;
    getTemplates(churchId: string, filters?: {
        status?: string;
        category?: string;
    }): Promise<WhatsAppTemplate[]>;
    getApprovedTemplates(churchId: string): Promise<WhatsAppTemplate[]>;
    getTemplateById(churchId: string, templateId: string): Promise<WhatsAppTemplate>;
    createTemplate(churchId: string, data: {
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
    }, userId?: string): Promise<WhatsAppTemplate>;
    updateTemplate(churchId: string, templateId: string, data: {
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
    }): Promise<WhatsAppTemplate>;
    deleteTemplate(churchId: string, templateId: string): Promise<void>;
    syncTemplates(churchId: string): Promise<WhatsAppTemplate[]>;
    private buildTemplateComponents;
    compose(churchId: string, data: ComposeWhatsAppDTO, userId?: string): Promise<WhatsAppCampaign>;
    /**
     * Send a single WhatsApp message (non-template, within 24h window)
     */
    sendWhatsAppMessage(churchId: string, data: {
        phoneNumber: string;
        message: string;
        media?: {
            url: string;
            caption?: string;
        };
    }, userId?: string): Promise<WhatsAppMessage>;
    /**
     * Send bulk WhatsApp messages (non-template, within 24h window)
     */
    sendBulkWhatsApp(churchId: string, data: {
        phoneNumbers: string[];
        message: string;
        media?: {
            url: string;
            caption?: string;
        };
    }, userId?: string): Promise<{
        sent: number;
        failed: number;
    }>;
    private getRecipients;
    private formatPhoneNumber;
    private processCampaign;
    private personalizeTemplate;
    getCampaigns(churchId: string, filters?: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: WhatsAppCampaign[];
        total: number;
    }>;
    getCampaignById(churchId: string, campaignId: string): Promise<WhatsAppCampaign>;
    getCampaignReport(churchId: string, campaignId: string): Promise<{
        campaign: WhatsAppCampaign;
        messages: any[];
        stats: {
            total: number;
            sent: number;
            delivered: number;
            read: number;
            failed: number;
            pending: number;
        };
    }>;
    updateCampaign(churchId: string, campaignId: string, data: Partial<ComposeWhatsAppDTO>): Promise<WhatsAppCampaign>;
    getDrafts(churchId: string): Promise<WhatsAppCampaign[]>;
    getScheduled(churchId: string): Promise<WhatsAppCampaign[]>;
    deleteDraft(churchId: string, campaignId: string): Promise<void>;
    cancelScheduled(churchId: string, campaignId: string): Promise<WhatsAppCampaign>;
    deleteCampaign(churchId: string, campaignId: string): Promise<void>;
    getMessages(churchId: string, filters?: {
        campaignId?: string;
        status?: string;
        direction?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: WhatsAppMessage[];
        total: number;
    }>;
    getMessagesByCampaign(churchId: string, campaignId: string): Promise<{
        data: WhatsAppMessage[];
        total: number;
    }>;
    getConversations(churchId: string, filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: import("@repositories/WhatsAppRepository").WhatsAppConversation[];
        total: number;
    }>;
    getStats(churchId: string): Promise<{
        totalSent: number;
        totalDelivered: number;
        totalRead: number;
        totalFailed: number;
        activeConversations: number;
    }>;
    handleIncomingMessage(data: {
        from: string;
        to: string;
        message: string;
        messageId: string;
        timestamp: string;
    }): Promise<void>;
    handleStatusUpdate(data: {
        messageId: string;
        status: string;
        timestamp: string;
    }): Promise<void>;
    processScheduledCampaigns(): Promise<void>;
}
//# sourceMappingURL=WhatsAppService.d.ts.map