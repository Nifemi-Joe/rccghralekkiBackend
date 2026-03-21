import { SmsSenderId, SmsBalance, SmsTransaction, SmsCampaign, SmsMessage, SmsReply, SmsContactList, SmsContactListItem, CreateSenderIdDTO, ComposeSmsDTO, CampaignFilters, SmsFilters, PaginatedCampaigns, PaginatedMessages, SmsStats, CampaignReport } from '@/dtos/sms.types';
export declare class SmsRepository {
    createSenderId(churchId: string, data: CreateSenderIdDTO, createdBy?: string): Promise<SmsSenderId>;
    getSenderIds(churchId: string): Promise<SmsSenderId[]>;
    getSenderIdById(senderIdId: string): Promise<SmsSenderId | null>;
    getApprovedSenderIds(churchId: string): Promise<SmsSenderId[]>;
    getDefaultSenderId(churchId: string): Promise<SmsSenderId | null>;
    updateSenderId(senderIdId: string, data: {
        provider_sender_id?: string;
        status?: string;
        use_case?: string;
        metadata?: any;
    }): Promise<SmsSenderId | null>;
    updateMessageWithProvider(messageId: string, data: {
        provider_message_id?: string;
        provider_status?: string;
        delivery_status?: string;
        delivery_time?: Date;
        cost?: number;
        metadata?: any;
    }): Promise<SmsMessage | null>;
    getMessageByProviderId(providerId: string): Promise<SmsMessage | null>;
    setDefaultSenderId(churchId: string, senderIdId: string): Promise<void>;
    deleteSenderId(churchId: string, senderIdId: string): Promise<boolean>;
    getBalance(churchId: string): Promise<SmsBalance>;
    updateBalance(churchId: string, units: number): Promise<SmsBalance>;
    deductBalance(churchId: string, units: number): Promise<SmsBalance>;
    createTransaction(churchId: string, type: 'purchase' | 'usage' | 'refund' | 'bonus', units: number, balanceAfter: number, details?: {
        reference?: string;
        description?: string;
        amount?: number;
        paymentMethod?: string;
        paymentReference?: string;
    }, createdBy?: string): Promise<SmsTransaction>;
    getTransactions(churchId: string, page?: number, limit?: number): Promise<{
        data: SmsTransaction[];
        total: number;
    }>;
    createCampaign(churchId: string, data: ComposeSmsDTO, createdBy?: string): Promise<SmsCampaign>;
    getCampaigns(filters: CampaignFilters): Promise<PaginatedCampaigns>;
    getCampaignById(churchId: string, campaignId: string): Promise<SmsCampaign | null>;
    updateCampaign(churchId: string, campaignId: string, data: Partial<SmsCampaign>): Promise<SmsCampaign | null>;
    deleteCampaign(churchId: string, campaignId: string): Promise<boolean>;
    getDrafts(churchId: string): Promise<SmsCampaign[]>;
    getScheduled(churchId: string): Promise<SmsCampaign[]>;
    getScheduledForProcessing(): Promise<SmsCampaign[]>;
    createMessage(churchId: string, data: {
        campaignId?: string;
        memberId?: string;
        phoneNumber: string;
        recipientName?: string;
        message: string;
        senderId?: string;
        direction?: 'outbound' | 'inbound';
        units?: number;
    }, createdBy?: string): Promise<SmsMessage>;
    createMessages(churchId: string, messages: Array<{
        campaignId?: string;
        memberId?: string;
        phoneNumber: string;
        recipientName?: string;
        message: string;
        senderId?: string;
        units?: number;
    }>, createdBy?: string): Promise<SmsMessage[]>;
    getMessages(filters: SmsFilters): Promise<PaginatedMessages>;
    getMessagesByCampaign(campaignId: string): Promise<SmsMessage[]>;
    updateMessageStatus(messageId: string, status: 'pending' | 'sent' | 'delivered' | 'failed' | 'rejected', externalId?: string, errorMessage?: string): Promise<SmsMessage | null>;
    createReply(churchId: string, data: {
        originalMessageId?: string;
        phoneNumber: string;
        senderName?: string;
        message: string;
    }): Promise<SmsReply>;
    getReplies(churchId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<{
        data: SmsReply[];
        total: number;
    }>;
    markReplyAsRead(churchId: string, replyId: string): Promise<void>;
    markAllRepliesAsRead(churchId: string): Promise<void>;
    createContactList(churchId: string, name: string, description?: string, createdBy?: string): Promise<SmsContactList>;
    getContactLists(churchId: string): Promise<SmsContactList[]>;
    getContactListById(churchId: string, listId: string): Promise<SmsContactList | null>;
    updateContactList(churchId: string, listId: string, data: Partial<SmsContactList>): Promise<SmsContactList | null>;
    deleteContactList(churchId: string, listId: string): Promise<boolean>;
    addContactsToList(listId: string, contacts: Array<{
        phoneNumber: string;
        name?: string;
        customFields?: Record<string, any>;
    }>): Promise<number>;
    getContactListItems(listId: string, page?: number, limit?: number): Promise<{
        data: SmsContactListItem[];
        total: number;
    }>;
    removeContactFromList(listId: string, contactId: string): Promise<boolean>;
    getStats(churchId: string): Promise<SmsStats>;
    getCampaignReport(churchId: string, campaignId: string): Promise<CampaignReport | null>;
}
//# sourceMappingURL=SmsRepository.d.ts.map