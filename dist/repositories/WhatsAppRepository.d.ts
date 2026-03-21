export interface WhatsAppAccount {
    id: string;
    church_id: string;
    phone_number: string;
    display_name?: string;
    status: 'pending' | 'verified' | 'active' | 'suspended';
    sendchamp_id?: string;
    waba_id?: string;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface WhatsAppTemplate {
    id: string;
    church_id: string;
    name: string;
    template_id?: string;
    category: 'marketing' | 'utility' | 'authentication';
    language: string;
    status: 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled';
    header_type?: 'none' | 'text' | 'image' | 'video' | 'document';
    header_content?: string;
    body_text: string;
    footer_text?: string;
    buttons?: any[];
    variables?: any;
    sample_values?: any;
    rejection_reason?: string;
    use_count: number;
    is_active?: boolean;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface WhatsAppCampaign {
    id: string;
    church_id: string;
    name?: string;
    template_id?: string;
    account_id?: string;
    destination_type: 'all_contacts' | 'groups' | 'members' | 'phone_numbers' | 'uploaded';
    group_ids?: string[];
    member_ids?: string[];
    phone_numbers?: string[];
    uploaded_contacts?: any;
    template_variables?: any;
    media_url?: string;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partial' | 'failed' | 'cancelled';
    scheduled_at?: Date;
    sent_at?: Date;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    replied_count: number;
    failed_count: number;
    total_cost: number;
    units_used: number;
    sendchamp_batch_id?: string;
    error_message?: string;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
    template?: WhatsAppTemplate;
    account?: WhatsAppAccount;
}
export interface WhatsAppMessage {
    id: string;
    church_id: string;
    campaign_id?: string;
    account_id?: string;
    member_id?: string;
    phone_number: string;
    country_code: string;
    recipient_name?: string;
    template_id?: string;
    template_name?: string;
    message_type: 'template' | 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact' | 'interactive';
    content?: string;
    media_url?: string;
    buttons?: any;
    direction: 'outbound' | 'inbound';
    status: 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'rejected';
    sendchamp_id?: string;
    error_code?: string;
    error_message?: string;
    cost: number;
    sent_at?: Date;
    delivered_at?: Date;
    read_at?: Date;
    created_by?: string;
    created_at: Date;
}
export interface WhatsAppConversation {
    id: string;
    church_id: string;
    account_id: string;
    phone_number: string;
    member_id?: string;
    member_name?: string;
    status: 'active' | 'expired' | 'closed';
    last_message_at?: Date;
    window_expires_at?: Date;
    message_count: number;
    created_at: Date;
    updated_at: Date;
}
export declare class WhatsAppRepository {
    createAccount(churchId: string, data: {
        phoneNumber: string;
        displayName?: string;
        sendchampId?: string;
        wabaId?: string;
    }): Promise<WhatsAppAccount>;
    getAccounts(churchId: string): Promise<WhatsAppAccount[]>;
    getDefaultAccount(churchId: string): Promise<WhatsAppAccount | null>;
    updateAccountStatus(churchId: string, accountId: string, status: WhatsAppAccount['status']): Promise<WhatsAppAccount | null>;
    setDefaultAccount(churchId: string, accountId: string): Promise<void>;
    createTemplate(churchId: string, data: {
        name: string;
        templateId?: string;
        category: 'marketing' | 'utility' | 'authentication';
        language?: string;
        headerType?: string;
        headerContent?: string;
        bodyText: string;
        footerText?: string;
        buttons?: any[];
        variables?: any;
        sampleValues?: any;
    }, createdBy?: string): Promise<WhatsAppTemplate>;
    getTemplates(churchId: string, filters?: {
        status?: string;
        category?: string;
    }): Promise<WhatsAppTemplate[]>;
    getTemplateById(churchId: string, templateId: string): Promise<WhatsAppTemplate | null>;
    getApprovedTemplates(churchId: string): Promise<WhatsAppTemplate[]>;
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
    }): Promise<WhatsAppTemplate | null>;
    updateTemplateStatus(churchId: string, templateId: string, status: WhatsAppTemplate['status'], rejectionReason?: string): Promise<WhatsAppTemplate | null>;
    incrementTemplateUsage(templateId: string): Promise<void>;
    deleteTemplate(churchId: string, templateId: string): Promise<boolean>;
    createCampaign(churchId: string, data: {
        name?: string;
        templateId?: string;
        accountId?: string;
        destinationType: string;
        groupIds?: string[];
        memberIds?: string[];
        phoneNumbers?: string[];
        uploadedContacts?: any;
        templateVariables?: any;
        mediaUrl?: string;
        status?: string;
        scheduledAt?: Date;
    }, createdBy?: string): Promise<WhatsAppCampaign>;
    getCampaigns(churchId: string, filters?: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: WhatsAppCampaign[];
        total: number;
    }>;
    getCampaignById(churchId: string, campaignId: string): Promise<WhatsAppCampaign | null>;
    updateCampaign(churchId: string, campaignId: string, data: Partial<WhatsAppCampaign>): Promise<WhatsAppCampaign | null>;
    getDrafts(churchId: string): Promise<WhatsAppCampaign[]>;
    getScheduled(churchId: string): Promise<WhatsAppCampaign[]>;
    getScheduledForProcessing(): Promise<WhatsAppCampaign[]>;
    deleteCampaign(churchId: string, campaignId: string): Promise<boolean>;
    createMessage(churchId: string, data: {
        campaignId?: string;
        accountId?: string;
        memberId?: string;
        phoneNumber: string;
        countryCode?: string;
        recipientName?: string;
        templateId?: string;
        templateName?: string;
        messageType?: string;
        content?: string;
        mediaUrl?: string;
        buttons?: any;
        direction?: string;
        cost?: number;
    }, createdBy?: string): Promise<WhatsAppMessage>;
    createMessages(churchId: string, messages: Array<{
        campaignId?: string;
        accountId?: string;
        memberId?: string;
        phoneNumber: string;
        countryCode?: string;
        recipientName?: string;
        templateId?: string;
        templateName?: string;
        messageType?: string;
        content?: string;
        mediaUrl?: string;
        cost?: number;
    }>, createdBy?: string): Promise<WhatsAppMessage[]>;
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
    updateMessageStatus(messageId: string, status: WhatsAppMessage['status'], sendchampId?: string, errorCode?: string, errorMessage?: string): Promise<WhatsAppMessage | null>;
    getOrCreateConversation(churchId: string, accountId: string, phoneNumber: string, memberInfo?: {
        memberId?: string;
        memberName?: string;
    }): Promise<WhatsAppConversation>;
    getConversations(churchId: string, filters?: {
        accountId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: WhatsAppConversation[];
        total: number;
    }>;
    getStats(churchId: string): Promise<{
        totalSent: number;
        totalDelivered: number;
        totalRead: number;
        totalFailed: number;
        activeConversations: number;
    }>;
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
    } | null>;
}
//# sourceMappingURL=WhatsAppRepository.d.ts.map