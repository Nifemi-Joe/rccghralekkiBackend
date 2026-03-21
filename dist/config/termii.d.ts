export interface TermiiConfig {
    apiKey: string;
    baseUrl: string;
    senderId: string;
}
export declare class TermiiClient {
    private apiKey;
    private senderId;
    private baseUrl;
    constructor(config: TermiiConfig);
    private rawRequest;
    private directGet;
    private directPost;
    getBalance(): Promise<any>;
    search(phoneNumber: string): Promise<any>;
    sendSMS(data: {
        to: string | string[];
        from: string;
        sms: string;
        type?: 'plain' | 'unicode';
        channel?: 'generic' | 'dnd' | 'whatsapp';
    }): Promise<any>;
    sendBulkSMS(data: {
        to: string[];
        from: string;
        sms: string;
        type?: 'plain' | 'unicode';
        channel?: 'generic' | 'dnd' | 'whatsapp';
    }): Promise<any>;
    getMessageStatus(messageId: string): Promise<any>;
    getSMSHistory(params?: {
        page?: number;
        limit?: number;
    }): Promise<any>;
    requestSenderId(data: {
        sender_id: string;
        useCase: string;
        company: string;
    }): Promise<any>;
    getSenderIds(): Promise<any>;
    sendEmail(data: {
        email_address: string;
        code: string;
        email_configuration_id: string;
    }): Promise<any>;
    sendVoiceCall(data: {
        phone_number: string;
        code: number;
    }): Promise<any>;
    sendVoiceOTP(data: {
        phone_number: string;
        pin_attempts: number;
        pin_time_to_live: number;
        pin_length: number;
        pin_placeholder?: string;
    }): Promise<any>;
    sendWhatsAppMessage(data: {
        phone_number: string;
        message: string;
        media?: {
            url: string;
            caption?: string;
        };
    }): Promise<any>;
    sendWhatsAppTemplate(data: {
        phone_number: string;
        template_id: string;
        data: Record<string, any>;
    }): Promise<any>;
    getCampaigns(params?: {
        page?: number;
    }): Promise<any>;
    getCampaignHistory(campaignId: string): Promise<any>;
    getNumberStatus(phoneNumber: string): Promise<any>;
}
export declare const getTermii: () => TermiiClient;
export declare const resetTermiiClient: () => void;
//# sourceMappingURL=termii.d.ts.map