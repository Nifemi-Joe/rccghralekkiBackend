// src/dtos/email.types.ts
export interface EmailConfiguration {
    id: string;
    church_id: string;
    from_email: string;
    from_name: string;
    reply_to_email?: string;
    is_verified: boolean;
    is_default: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface EmailTemplate {
    id: string;
    church_id: string;
    name: string;
    subject: string;
    html_content: string;
    text_content?: string;
    variables?: string[];
    is_active: boolean;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}

export interface EmailCampaign {
    id: string;
    church_id: string;
    name?: string;
    subject: string;
    html_content: string;
    text_content?: string;
    template_id?: string;
    from_config_id?: string;
    from_config?: EmailConfiguration;
    destination_type: 'all_contacts' | 'groups' | 'members' | 'other_emails';
    group_ids?: string[];
    member_ids?: string[];
    other_emails?: string[];
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
    scheduled_at?: Date;
    sent_at?: Date;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    clicked_count: number;
    bounced_count: number;
    failed_count: number;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
    attachments?: EmailAttachment[];
}

export interface EmailAttachment {
    id: string;
    campaign_id: string;
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    storage_path: string;
    created_at: Date;
}

export interface Email {
    id: string;
    church_id: string;
    campaign_id?: string;
    member_id?: string;
    to_email: string;
    to_name?: string;
    subject: string;
    html_content: string;
    text_content?: string;
    status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    external_id?: string;
    error_message?: string;
    sent_at?: Date;
    delivered_at?: Date;
    opened_at?: Date;
    open_count: number;
    click_count: number;
    created_at: Date;
}

export interface EmailClick {
    id: string;
    email_id: string;
    url: string;
    ip_address?: string;
    user_agent?: string;
    clicked_at: Date;
}

// DTOs
export interface CreateEmailConfigDTO {
    fromEmail: string;
    fromName: string;
    replyToEmail?: string;
    isDefault?: boolean;
}

export interface CreateEmailTemplateDTO {
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    variables?: string[];
}

export interface UpdateEmailTemplateDTO {
    name?: string;
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    variables?: string[];
    isActive?: boolean;
}

export interface ComposeEmailDTO {
    destinationType: 'all_contacts' | 'groups' | 'members' | 'other_emails';
    groupIds?: string[];
    memberIds?: string[];
    otherEmails?: string[];
    fromConfigId?: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    templateId?: string;
    sendOption: 'now' | 'schedule' | 'draft';
    scheduledAt?: string;
    name?: string;
    attachments?: Array<{
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        storagePath: string;
    }>;
}

export interface EmailFilters {
    churchId: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface EmailCampaignFilters {
    churchId: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface PaginatedEmailCampaigns {
    data: EmailCampaign[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedEmails {
    data: Email[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface EmailStats {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalFailed: number;
    openRate: number;
    clickRate: number;
}

export interface EmailCampaignReport {
    campaign: EmailCampaign;
    emails: Email[];
    stats: {
        total: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        bounced: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
}