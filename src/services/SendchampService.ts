// src/services/SendchampService.ts (Updated)
import axios, { AxiosInstance } from 'axios';
import logger from '@config/logger';

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
    to: Array<{ email: string; name?: string }>;
    from: { email: string; name: string };
    subject: string;
    message_body: {
        type: 'text/html' | 'text/plain';
        value: string;
    };
    reply_to?: { email: string; name?: string };
    attachments?: Array<{
        content: string; // base64
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

export class SendchampService {
    private client: AxiosInstance;

    constructor(config: SendchampConfig) {
        this.client = axios.create({
            baseURL: config.baseUrl || 'https://api.sendchamp.com/api/v1',
            headers: {
                'Authorization': `Bearer ${config.publicKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000,
        });

        // Response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                logger.info('Sendchamp API Response:', {
                    url: response.config.url,
                    status: response.status,
                    data: response.data,
                });
                return response;
            },
            (error) => {
                logger.error('Sendchamp API Error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                });
                throw error;
            }
        );
    }

    // ============================================================================
    // SMS
    // ============================================================================

    async sendSms(params: SendSmsParams): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/sms/send', {
                to: Array.isArray(params.to) ? params.to : [params.to],
                message: params.message,
                sender_name: params.sender_name,
                route: params.route || 'non_dnd',
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to send SMS');
        }
    }

    async sendBulkSms(messages: Array<{ to: string; message: string; sender_name: string }>): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/sms/send/bulk', {
                messages: messages.map(m => ({
                    to: [m.to],
                    message: m.message,
                    sender_name: m.sender_name,
                    route: 'non_dnd',
                })),
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to send bulk SMS');
        }
    }

    async getSmsStatus(messageId: string): Promise<SendchampResponse> {
        try {
            const response = await this.client.get(`/sms/status/${messageId}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to get SMS status');
        }
    }

    async registerSenderId(senderId: string, useCase: string): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/sms/create-sender-id', {
                name: senderId,
                use_case: useCase,
                sample: 'Church communication and updates',
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to register sender ID');
        }
    }

    // ============================================================================
    // EMAIL
    // ============================================================================

    async sendEmail(params: SendEmailParams): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/email/send', params);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to send email');
        }
    }

    async getEmailStatus(emailId: string): Promise<SendchampResponse> {
        try {
            const response = await this.client.get(`/email/status/${emailId}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to get email status');
        }
    }

    // ============================================================================
    // WHATSAPP
    // ============================================================================

    async sendWhatsApp(params: SendWhatsAppParams): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/whatsapp/message/send', params);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to send WhatsApp message');
        }
    }

    async sendWhatsAppTemplate(
        recipient: string,
        sender: string,
        templateCode: string,
        variables?: Record<string, any>
    ): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/whatsapp/message/send', {
                recipient,
                sender,
                type: 'template',
                template: {
                    template_code: templateCode,
                    meta_data: variables,
                },
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to send WhatsApp template');
        }
    }

    async getWhatsAppTemplates(): Promise<SendchampResponse> {
        try {
            const response = await this.client.get('/whatsapp/template');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to get WhatsApp templates');
        }
    }

    async createWhatsAppTemplate(params: {
        name: string;
        category: 'marketing' | 'utility' | 'authentication';
        language: string;
        components: any[];
    }): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/whatsapp/template/create', params);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to create WhatsApp template');
        }
    }

    async getWhatsAppMessageStatus(messageId: string): Promise<SendchampResponse> {
        try {
            const response = await this.client.get(`/whatsapp/message/status/${messageId}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to get WhatsApp status');
        }
    }

    // ============================================================================
    // VERIFICATION
    // ============================================================================

    async sendOtp(phoneNumber: string, channel: 'sms' | 'whatsapp' | 'voice' = 'sms'): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/verification/create', {
                channel,
                sender: 'Sendchamp',
                token_type: 'numeric',
                token_length: 6,
                expiration_time: 10,
                customer_mobile_number: phoneNumber,
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to send OTP');
        }
    }

    async verifyOtp(reference: string, otp: string): Promise<SendchampResponse> {
        try {
            const response = await this.client.post('/verification/confirm', {
                verification_reference: reference,
                verification_code: otp,
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to verify OTP');
        }
    }

    // ============================================================================
    // WALLET
    // ============================================================================

    async getWalletBalance(): Promise<SendchampResponse> {
        try {
            const response = await this.client.get('/wallet/balance');
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to get wallet balance');
        }
    }
}

// Export singleton instance
let sendchampInstance: SendchampService | null = null;

export const initializeSendchamp = (publicKey: string): SendchampService => {
    sendchampInstance = new SendchampService({ publicKey });
    return sendchampInstance;
};

export const getSendchamp = (): SendchampService => {
    if (!sendchampInstance) {
        const publicKey = process.env.SENDCHAMP_PUBLIC_KEY;
        if (!publicKey) {
            throw new Error('SENDCHAMP_PUBLIC_KEY not configured');
        }
        sendchampInstance = new SendchampService({ publicKey });
    }
    return sendchampInstance;
};

// Legacy export for backward compatibility
export const sendchamp = new SendchampService({
    publicKey: process.env.SENDCHAMP_PUBLIC_KEY || '',
});