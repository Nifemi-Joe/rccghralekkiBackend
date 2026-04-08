import { BalanceInfo } from '@services/WalletService';
import { SmsSenderId, SmsCampaign, SmsMessage, CreateSenderIdDTO, ComposeSmsDTO, CampaignFilters, SmsFilters, PaginatedCampaigns, PaginatedMessages, SmsStats, CampaignReport, SmsContactList, SmsContactListItem } from '@/dtos/sms.types';
import { FollowUpChannel } from '@/dtos/followup.types';
interface ProfileUpdateLinkSmsData {
    churchName: string;
    updateLink: string;
}
interface FollowUpMessageOptions {
    churchId: string;
    userId: string;
    assignmentId: string;
    firstTimerId: string;
    channel: FollowUpChannel;
    to: string;
    message: string;
    subject?: string;
    recipientName?: string;
    templateId?: string;
}
interface FollowUpMessageResult {
    success: boolean;
    messageId?: string;
    externalId?: string;
    deliveryStatus: string;
    error?: string;
}
interface SMSHistoryFilters {
    page?: number;
    limit?: number;
    churchId?: string;
    startDate?: string;
    endDate?: string;
}
export declare class SmsService {
    private smsRepository;
    private memberRepository;
    private groupRepository;
    private followUpRepository;
    private walletService;
    constructor();
    /**
     * Send follow-up message via SMS
     */
    sendFollowUpSms(options: FollowUpMessageOptions): Promise<FollowUpMessageResult>;
    /**
     * Send follow-up message via WhatsApp
     */
    sendFollowUpWhatsApp(options: FollowUpMessageOptions): Promise<FollowUpMessageResult>;
    /**
     * Send bulk follow-up messages
     */
    sendBulkFollowUpMessages(churchId: string, userId: string, messages: Array<{
        assignmentId: string;
        firstTimerId: string;
        channel: FollowUpChannel;
        to: string;
        message: string;
        recipientName?: string;
    }>): Promise<{
        sent: number;
        failed: number;
        results: FollowUpMessageResult[];
    }>;
    /**
     * Process template variables for follow-up messages
     */
    processFollowUpTemplate(template: string, variables: Record<string, string>): string;
    /**
     * Get template variables from first timer and church data
     */
    getFollowUpTemplateVariables(churchId: string, firstTimerId: string): Promise<Record<string, string>>;
    requestSenderId(churchId: string, data: CreateSenderIdDTO, userId?: string): Promise<SmsSenderId>;
    getSenderIds(churchId: string): Promise<SmsSenderId[]>;
    getApprovedSenderIds(churchId: string): Promise<SmsSenderId[]>;
    /**
     * Sync local sender IDs with Termii to get latest statuses
     */
    syncSenderIdsWithTermii(churchId: string): Promise<void>;
    setDefaultSenderId(churchId: string, senderIdId: string): Promise<void>;
    deleteSenderId(churchId: string, senderIdId: string): Promise<void>;
    /**
     * Find all scheduled campaigns whose scheduledAt time has passed
     * and process (send) them.
     */
    processScheduledCampaigns(): Promise<void>;
    getBalance(churchId: string): Promise<BalanceInfo>;
    getSimpleBalance(churchId: string): Promise<{
        local: number;
        termii?: any;
    }>;
    composeSms(churchId: string, data: ComposeSmsDTO, userId?: string): Promise<SmsCampaign>;
    sendSingleSms(churchId: string, data: {
        phoneNumber: string;
        message: string;
        senderId?: string;
        recipientName?: string;
    }, userId?: string): Promise<SmsMessage>;
    private processCampaign;
    private getRecipients;
    private getContactListRecipients;
    private getAllContacts;
    private getGroupRecipients;
    private getMemberRecipients;
    private getPhoneNumberRecipients;
    private getUploadedRecipients;
    sendOtp(to: string, otp: string): Promise<void>;
    sendProfileUpdateLink(to: string, data: ProfileUpdateLinkSmsData): Promise<void>;
    getCampaigns(filters: CampaignFilters): Promise<PaginatedCampaigns>;
    getCampaignById(churchId: string, campaignId: string): Promise<SmsCampaign>;
    updateCampaign(churchId: string, campaignId: string, data: Partial<SmsCampaign>): Promise<SmsCampaign>;
    deleteCampaign(churchId: string, campaignId: string): Promise<void>;
    getDrafts(churchId: string): Promise<SmsCampaign[]>;
    getScheduled(churchId: string): Promise<SmsCampaign[]>;
    getMessages(filters: SmsFilters): Promise<PaginatedMessages>;
    getMessagesByCampaign(campaignId: string): Promise<SmsMessage[]>;
    /**
     * Sync a single message's delivery status from Termii
     */
    syncMessageStatus(messageId: string): Promise<void>;
    /**
     * Map Termii delivery status strings to our internal status values
     */
    private mapTermiiStatus;
    getReplies(churchId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<{
        data: any[];
        total: number;
    }>;
    markReplyAsRead(churchId: string, replyId: string): Promise<void>;
    markAllRepliesAsRead(churchId: string): Promise<void>;
    /**
     * Reply to an inbound SMS message
     */
    replyToMessage(churchId: string, replyId: string, message: string, senderId?: string, userId?: string): Promise<SmsMessage>;
    getStats(churchId: string): Promise<SmsStats>;
    getCampaignReport(churchId: string, campaignId: string): Promise<CampaignReport>;
    /**
     * Get paginated SMS history across all churches (admin) or filtered by church.
     * Delegates to the messages query with optional filters.
     */
    getSMSHistory(filters: SMSHistoryFilters): Promise<{
        data: SmsMessage[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getContactLists(churchId: string): Promise<SmsContactList[]>;
    createContactList(churchId: string, name: string, description?: string, userId?: string): Promise<SmsContactList>;
    getContactListById(churchId: string, listId: string): Promise<SmsContactList>;
    updateContactList(churchId: string, listId: string, data: {
        name?: string;
        description?: string;
    }): Promise<SmsContactList>;
    deleteContactList(churchId: string, listId: string): Promise<void>;
    addContactsToList(listId: string, contacts: Array<{
        phoneNumber: string;
        name?: string;
    }>): Promise<number>;
    getContactListItems(listId: string, page?: number, limit?: number): Promise<{
        data: SmsContactListItem[];
        total: number;
    }>;
    removeContactFromList(listId: string, contactId: string): Promise<void>;
    private formatPhoneNumber;
    private isValidPhoneNumber;
    private personalize;
}
export {};
//# sourceMappingURL=SmsService.d.ts.map