export interface SmsSenderId {
    id: string;
    church_id: string;
    sender_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'active';
    rejection_reason?: string;
    is_default: boolean;
    approved_at?: Date;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface SmsContactList {
    id: string;
    church_id: string;
    name: string;
    description?: string;
    contact_count: number;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface SmsContactListItem {
    id: string;
    list_id: string;
    phone_number: string;
    name?: string;
    custom_fields?: Record<string, any>;
    created_at: Date;
}
export interface SmsBalance {
    id: string;
    church_id: string;
    units: number;
    last_updated: Date;
}
export interface SmsTransaction {
    id: string;
    church_id: string;
    type: 'purchase' | 'usage' | 'refund' | 'bonus';
    units: number;
    balance_after: number;
    reference?: string;
    description?: string;
    amount?: number;
    payment_method?: string;
    payment_reference?: string;
    created_by?: string;
    created_at: Date;
}
export interface SmsCampaign {
    id: string;
    church_id: string;
    name?: string;
    message: string;
    sender_id?: string;
    sender?: SmsSenderId;
    destination_type: 'all_contacts' | 'groups' | 'members' | 'phone_numbers' | 'uploaded';
    group_ids?: string[];
    member_ids?: string[];
    phone_numbers?: string[];
    uploaded_contacts?: UploadedContact[];
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
    scheduled_at?: Date;
    sent_at?: Date;
    total_recipients: number;
    successful_count: number;
    failed_count: number;
    units_used: number;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface UploadedContact {
    phone: string;
    name?: string;
    [key: string]: any;
}
export interface SmsMessage {
    id: string;
    church_id: string;
    campaign_id?: string;
    member_id?: string;
    phone_number: string;
    recipient_name?: string;
    message: string;
    sender_id?: string;
    direction: 'outbound' | 'inbound';
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected';
    external_id?: string;
    error_message?: string;
    units: number;
    sent_at?: Date;
    delivered_at?: Date;
    created_at: Date;
    provider_message_id?: string;
}
export interface SmsReply {
    id: string;
    church_id: string;
    original_message_id?: string;
    phone_number: string;
    sender_name?: string;
    message: string;
    is_read: boolean;
    received_at: Date;
    created_at: Date;
}
export interface CreateSenderIdDTO {
    senderId: string;
    useCase?: string;
}
export interface ComposeSmsDTO {
    destinationType: 'contacts' | 'contact_lists' | 'all_contacts' | 'groups' | 'members' | 'phone_numbers' | 'uploaded';
    contactListIds?: string[];
    selectAllContacts?: boolean;
    groupIds?: string[];
    memberIds?: string[];
    phoneNumbers?: string[];
    uploadedContacts?: UploadedContact[];
    senderId?: string;
    message: string;
    sendOption: 'now' | 'schedule' | 'draft';
    scheduledAt?: string;
    name?: string;
}
export interface PurchaseUnitsDTO {
    units: number;
    paymentMethod: string;
    paymentReference: string;
    amount: number;
}
export interface CreateContactListDTO {
    name: string;
    description?: string;
}
export interface AddContactsToListDTO {
    contacts: Array<{
        phoneNumber: string;
        name?: string;
        customFields?: Record<string, any>;
    }>;
}
export interface SmsFilters {
    churchId: string;
    status?: string;
    direction?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
export interface CampaignFilters {
    churchId: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
export interface PaginatedCampaigns {
    data: SmsCampaign[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface PaginatedMessages {
    data: SmsMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface SmsStats {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    unitsUsed: number;
    unitsRemaining: number;
    repliesCount: number;
    unreadReplies: number;
}
export interface CampaignReport {
    campaign: SmsCampaign;
    messages: SmsMessage[];
    stats: {
        total: number;
        sent: number;
        delivered: number;
        failed: number;
        pending: number;
        unitsUsed: number;
    };
}
//# sourceMappingURL=sms.types.d.ts.map