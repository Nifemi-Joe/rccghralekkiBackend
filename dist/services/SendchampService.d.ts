interface SendchampConfig {
    publicKey: string;
    baseUrl?: string;
}
interface SendSmsParams {
    to: string | string[];
    message: string;
    sender_name: string;
    route?: 'dnd' | 'non_dnd' | 'international';
}
interface SendEmailParams {
    to: Array<{
        email: string;
        name?: string;
    }>;
    from: {
        email: string;
        name: string;
    };
    subject: string;
    message_body: {
        type: 'text/html' | 'text/plain';
        value: string;
    };
    reply_to?: {
        email: string;
        name?: string;
    };
    attachments?: Array<{
        content: string;
        filename: string;
        type: string;
    }>;
}
interface SendWhatsAppParams {
    recipient: string;
    sender: string;
    type: 'template' | 'text' | 'image' | 'video' | 'document' | 'audio';
    template?: {
        template_code: string;
        meta_data?: Record<string, any>;
    };
    message?: string;
    media?: {
        url: string;
        caption?: string;
    };
}
interface SendchampResponse {
    code: number;
    message: string;
    status: string;
    data: any;
}
export declare class SendchampService {
    private client;
    constructor(config: SendchampConfig);
    sendSms(params: SendSmsParams): Promise<SendchampResponse>;
    sendBulkSms(messages: Array<{
        to: string;
        message: string;
        sender_name: string;
    }>): Promise<SendchampResponse>;
    getSmsStatus(messageId: string): Promise<SendchampResponse>;
    registerSenderId(senderId: string, useCase: string): Promise<SendchampResponse>;
    sendEmail(params: SendEmailParams): Promise<SendchampResponse>;
    getEmailStatus(emailId: string): Promise<SendchampResponse>;
    sendWhatsApp(params: SendWhatsAppParams): Promise<SendchampResponse>;
    sendWhatsAppTemplate(recipient: string, sender: string, templateCode: string, variables?: Record<string, any>): Promise<SendchampResponse>;
    getWhatsAppTemplates(): Promise<SendchampResponse>;
    createWhatsAppTemplate(params: {
        name: string;
        category: 'marketing' | 'utility' | 'authentication';
        language: string;
        components: any[];
    }): Promise<SendchampResponse>;
    getWhatsAppMessageStatus(messageId: string): Promise<SendchampResponse>;
    sendOtp(phoneNumber: string, channel?: 'sms' | 'whatsapp' | 'voice'): Promise<SendchampResponse>;
    verifyOtp(reference: string, otp: string): Promise<SendchampResponse>;
    getWalletBalance(): Promise<SendchampResponse>;
}
export declare const initializeSendchamp: (publicKey: string) => SendchampService;
export declare const getSendchamp: () => SendchampService;
export declare const sendchamp: SendchampService;
export {};
//# sourceMappingURL=SendchampService.d.ts.map