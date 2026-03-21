import { SmsSenderId, SmsCampaign, SmsMessage, CreateSenderIdDTO, ComposeSmsDTO, CampaignFilters, SmsFilters, PaginatedCampaigns, PaginatedMessages, SmsStats, CampaignReport, SmsContactList, SmsContactListItem } from '@/dtos/sms.types';
interface ProfileUpdateLinkSmsData {
    churchName: string;
    updateLink: string;
}
export declare class SmsService {
    private smsRepository;
    private memberRepository;
    private groupRepository;
    private walletService;
    constructor();
    requestSenderId(churchId: string, data: CreateSenderIdDTO, userId?: string): Promise<SmsSenderId>;
    getSenderIds(churchId: string): Promise<SmsSenderId[]>;
    getApprovedSenderIds(churchId: string): Promise<SmsSenderId[]>;
    syncSenderIdsWithTermii(churchId: string): Promise<void>;
    setDefaultSenderId(churchId: string, senderIdId: string): Promise<void>;
    deleteSenderId(churchId: string, senderIdId: string): Promise<void>;
    getBalance(churchId: string): Promise<{
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
    sendOtp(to: string, otp: string): Promise<void>;
    sendProfileUpdateLink(to: string, data: ProfileUpdateLinkSmsData): Promise<void>;
    private getRecipients;
    private getContactListRecipients;
    private getAllContacts;
    private getGroupRecipients;
    private getMemberRecipients;
    private getPhoneNumberRecipients;
    private getUploadedRecipients;
    private processCampaign;
    getCampaigns(filters: CampaignFilters): Promise<PaginatedCampaigns>;
    getCampaignById(churchId: string, campaignId: string): Promise<SmsCampaign>;
    updateCampaign(churchId: string, campaignId: string, data: Partial<SmsCampaign>): Promise<SmsCampaign>;
    deleteCampaign(churchId: string, campaignId: string): Promise<void>;
    getDrafts(churchId: string): Promise<SmsCampaign[]>;
    getScheduled(churchId: string): Promise<SmsCampaign[]>;
    getMessages(filters: SmsFilters): Promise<PaginatedMessages>;
    getMessagesByCampaign(campaignId: string): Promise<SmsMessage[]>;
    syncMessageStatus(messageId: string): Promise<void>;
    getReplies(churchId: string, page?: number, limit?: number, unreadOnly?: boolean): Promise<{
        data: any[];
        total: number;
    }>;
    markReplyAsRead(churchId: string, replyId: string): Promise<void>;
    markAllRepliesAsRead(churchId: string): Promise<void>;
    replyToMessage(churchId: string, replyId: string, message: string, senderId?: string, userId?: string): Promise<SmsMessage>;
    getStats(churchId: string): Promise<SmsStats>;
    getCampaignReport(churchId: string, campaignId: string): Promise<CampaignReport>;
    getSMSHistory(params?: {
        page?: number;
        limit?: number;
    }): Promise<any>;
    processScheduledCampaigns(): Promise<void>;
    private formatPhoneNumber;
    private isValidPhoneNumber;
    private personalize;
    private mapTermiiStatus;
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
}
export {};
//# sourceMappingURL=SmsService.d.ts.map