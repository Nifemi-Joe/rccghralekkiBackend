"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendchamp = exports.getSendchamp = exports.initializeSendchamp = exports.SendchampService = void 0;
// src/services/SendchampService.ts (Updated)
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("@config/logger"));
class SendchampService {
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: config.baseUrl || 'https://api.sendchamp.com/api/v1',
            headers: {
                'Authorization': `Bearer ${config.publicKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000,
        });
        // Response interceptor for logging
        this.client.interceptors.response.use((response) => {
            logger_1.default.info('Sendchamp API Response:', {
                url: response.config.url,
                status: response.status,
                data: response.data,
            });
            return response;
        }, (error) => {
            logger_1.default.error('Sendchamp API Error:', {
                url: error.config?.url,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
            throw error;
        });
    }
    // ============================================================================
    // SMS
    // ============================================================================
    async sendSms(params) {
        try {
            const response = await this.client.post('/sms/send', {
                to: Array.isArray(params.to) ? params.to : [params.to],
                message: params.message,
                sender_name: params.sender_name,
                route: params.route || 'non_dnd',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to send SMS');
        }
    }
    async sendBulkSms(messages) {
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
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to send bulk SMS');
        }
    }
    async getSmsStatus(messageId) {
        try {
            const response = await this.client.get(`/sms/status/${messageId}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to get SMS status');
        }
    }
    async registerSenderId(senderId, useCase) {
        try {
            const response = await this.client.post('/sms/create-sender-id', {
                name: senderId,
                use_case: useCase,
                sample: 'Church communication and updates',
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to register sender ID');
        }
    }
    // ============================================================================
    // EMAIL
    // ============================================================================
    async sendEmail(params) {
        try {
            const response = await this.client.post('/email/send', params);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to send email');
        }
    }
    async getEmailStatus(emailId) {
        try {
            const response = await this.client.get(`/email/status/${emailId}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to get email status');
        }
    }
    // ============================================================================
    // WHATSAPP
    // ============================================================================
    async sendWhatsApp(params) {
        try {
            const response = await this.client.post('/whatsapp/message/send', params);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to send WhatsApp message');
        }
    }
    async sendWhatsAppTemplate(recipient, sender, templateCode, variables) {
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
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to send WhatsApp template');
        }
    }
    async getWhatsAppTemplates() {
        try {
            const response = await this.client.get('/whatsapp/template');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to get WhatsApp templates');
        }
    }
    async createWhatsAppTemplate(params) {
        try {
            const response = await this.client.post('/whatsapp/template/create', params);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to create WhatsApp template');
        }
    }
    async getWhatsAppMessageStatus(messageId) {
        try {
            const response = await this.client.get(`/whatsapp/message/status/${messageId}`);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to get WhatsApp status');
        }
    }
    // ============================================================================
    // VERIFICATION
    // ============================================================================
    async sendOtp(phoneNumber, channel = 'sms') {
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
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to send OTP');
        }
    }
    async verifyOtp(reference, otp) {
        try {
            const response = await this.client.post('/verification/confirm', {
                verification_reference: reference,
                verification_code: otp,
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to verify OTP');
        }
    }
    // ============================================================================
    // WALLET
    // ============================================================================
    async getWalletBalance() {
        try {
            const response = await this.client.get('/wallet/balance');
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to get wallet balance');
        }
    }
}
exports.SendchampService = SendchampService;
// Export singleton instance
let sendchampInstance = null;
const initializeSendchamp = (publicKey) => {
    sendchampInstance = new SendchampService({ publicKey });
    return sendchampInstance;
};
exports.initializeSendchamp = initializeSendchamp;
const getSendchamp = () => {
    if (!sendchampInstance) {
        const publicKey = process.env.SENDCHAMP_PUBLIC_KEY;
        if (!publicKey) {
            throw new Error('SENDCHAMP_PUBLIC_KEY not configured');
        }
        sendchampInstance = new SendchampService({ publicKey });
    }
    return sendchampInstance;
};
exports.getSendchamp = getSendchamp;
// Legacy export for backward compatibility
exports.sendchamp = new SendchampService({
    publicKey: process.env.SENDCHAMP_PUBLIC_KEY || '',
});
//# sourceMappingURL=SendchampService.js.map