// src/config/termii.ts
import axios, { AxiosInstance } from 'axios';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import logger from '@config/logger';

export interface TermiiConfig {
    apiKey: string;
    baseUrl: string;
    senderId: string;
}

export class TermiiClient {
    private apiKey: string;
    private senderId: string;
    private baseUrl: string;

    constructor(config: TermiiConfig) {
        this.apiKey = config.apiKey ;
        this.senderId = config.senderId;
        this.baseUrl = config.baseUrl || 'https://v3.api.termii.com/api';
    }

    // ============================================================================
    // RAW HTTP HELPERS - Using Node.js built-in https module
    // ============================================================================

    private rawRequest(
        method: 'GET' | 'POST',
        endpoint: string,
        params?: Record<string, any>,
        body?: Record<string, any>
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                let fullUrl = `${this.baseUrl}${endpoint}`;

                if (method === 'GET') {
                    const allParams = { ...params, api_key: this.apiKey };
                    const queryString = Object.entries(allParams)
                        .filter(([, v]) => v !== undefined && v !== null)
                        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
                        .join('&');
                    if (queryString) {
                        fullUrl += `?${queryString}`;
                    }
                }

                const parsedUrl = new URL(fullUrl);
                const isHttps = parsedUrl.protocol === 'https:';

                let postData: string | undefined;
                if (method === 'POST' && body) {
                    postData = JSON.stringify({
                        ...body,
                        api_key: this.apiKey,
                    });
                }

                const requestOptions: https.RequestOptions = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (isHttps ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: method,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        ...(method === 'POST' ? {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData || '').toString(),
                        } : {}),
                    },
                };

                logger.debug(`Termii ${method}: ${fullUrl}`);
                if (postData) {
                    logger.debug(`Termii POST body: ${postData}`);
                }

                const httpModule = isHttps ? https : http;

                const req = httpModule.request(requestOptions, (res) => {
                    const chunks: Buffer[] = [];

                    res.on('data', (chunk: Buffer) => {
                        chunks.push(chunk);
                    });

                    res.on('end', () => {
                        const rawBody = Buffer.concat(chunks).toString('utf-8');

                        logger.debug(`Termii Response ${res.statusCode}: ${rawBody.substring(0, 500)}`);

                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(`Termii API error ${res.statusCode}: ${rawBody}`));
                            return;
                        }

                        if (!rawBody || rawBody.trim() === '') {
                            logger.warn(`Termii returned empty body for ${method} ${endpoint}`);
                            resolve(null);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(rawBody);
                            resolve(parsed);
                        } catch (e) {
                            logger.warn(`Failed to parse Termii response as JSON for ${endpoint}:`, rawBody);
                            resolve(rawBody);
                        }
                    });
                });

                req.on('error', (error) => {
                    logger.error(`Termii request error for ${method} ${endpoint}:`, error.message);
                    reject(error);
                });

                req.setTimeout(30000, () => {
                    req.destroy();
                    reject(new Error(`Termii request timeout for ${method} ${endpoint}`));
                });

                if (method === 'POST' && postData) {
                    req.write(postData);
                }

                req.end();
            } catch (error: any) {
                logger.error(`Termii rawRequest error for ${method} ${endpoint}:`, error.message);
                reject(error);
            }
        });
    }

    private async directGet(endpoint: string, params: Record<string, any> = {}): Promise<any> {
        return this.rawRequest('GET', endpoint, params);
    }

    private async directPost(endpoint: string, payload: Record<string, any>): Promise<any> {
        return this.rawRequest('POST', endpoint, undefined, payload);
    }

    // ============================================================================
    // BALANCE & WALLET
    // ============================================================================

    async getBalance(): Promise<any> {
        try {
            const data = await this.directGet('/get-balance');
            logger.info('Termii balance retrieved:', data);
            return data;
        } catch (error: any) {
            logger.error('Error getting Termii balance:', error);
            throw error;
        }
    }

    async search(phoneNumber: string): Promise<any> {
        try {
            const data = await this.directGet('/check/dnd', {
                phone_number: phoneNumber,
            });
            return data;
        } catch (error: any) {
            logger.error('Error searching phone number:', error);
            throw error;
        }
    }

    // ============================================================================
    // SMS
    // ============================================================================

    async sendSMS(data: {
        to: string | string[];
        from: string;
        sms: string;
        type?: 'plain' | 'unicode';
        channel?: 'generic' | 'dnd' | 'whatsapp';
    }): Promise<any> {
        try {
            const payload = {
                to: Array.isArray(data.to) ? data.to.join(',') : data.to,
                from: data.from || this.senderId,
                sms: data.sms,
                type: data.type || 'plain',
                channel: data.channel || 'generic',
            };

            const result = await this.directPost('/sms/send', payload);
            return result;
        } catch (error: any) {
            logger.error('Error sending SMS via Termii:', error);
            throw error;
        }
    }

    async sendBulkSMS(data: {
        to: string[];
        from: string;
        sms: string;
        type?: 'plain' | 'unicode';
        channel?: 'generic' | 'dnd' | 'whatsapp';
    }): Promise<any> {
        try {
            const payload = {
                to: data.to,
                from: data.from || this.senderId,
                sms: data.sms,
                type: data.type || 'plain',
                channel: data.channel || 'generic',
            };

            const result = await this.directPost('/sms/send/bulk', payload);
            return result;
        } catch (error: any) {
            logger.error('Error sending bulk SMS via Termii:', error);
            throw error;
        }
    }

    async getMessageStatus(messageId: string): Promise<any> {
        try {
            const data = await this.directGet('/sms/inbox', {
                message_id: messageId,
            });
            return data;
        } catch (error: any) {
            logger.error('Error getting message status:', error);
            throw error;
        }
    }

    async getSMSHistory(params?: {
        page?: number;
        limit?: number;
    }): Promise<any> {
        try {
            const data = await this.directGet('/sms/inbox', {
                page: params?.page || 1,
            });
            return data;
        } catch (error: any) {
            logger.error('Error getting SMS history:', error);
            throw error;
        }
    }

    // ============================================================================
    // SENDER ID - FIXED: Using camelCase 'useCase' instead of 'usecase'
    // ============================================================================

    async requestSenderId(data: {
        sender_id: string;
        useCase: string;  // Changed from 'usecase' to 'useCase'
        company: string;
    }): Promise<any> {
        try {
            // FIXED: Termii expects 'useCase' (camelCase), not 'usecase'
            console.log(data);
            const result = await this.directPost('/sender-id/request', {
                api_key: this.apiKey,
                sender_id: data.sender_id,
                use_case: data.useCase,  // FIXED: Changed from 'usecase' to 'useCase'
                company: data.company,
            });

            logger.info(`Sender ID request submitted: ${data.sender_id}`, result);
            return result;
        } catch (error: any) {
            logger.error('Error requesting sender ID:', error);
            throw error;
        }
    }

    async getSenderIds(): Promise<any> {
        try {
            const data = await this.directGet('/sender-id');
            return data;
        } catch (error: any) {
            logger.error('Error getting sender IDs:', error);
            throw error;
        }
    }

    // ============================================================================
    // EMAIL (via Termii Send)
    // ============================================================================

    async sendEmail(data: {
        email_address: string;
        code: string;
        email_configuration_id: string;
    }): Promise<any> {
        try {
            const result = await this.directPost('/email/send', {
                email_address: data.email_address,
                code: data.code,
                email_configuration_id: data.email_configuration_id,
            });
            return result;
        } catch (error: any) {
            logger.error('Error sending email via Termii:', error);
            throw error;
        }
    }

    // ============================================================================
    // VOICE
    // ============================================================================

    async sendVoiceCall(data: {
        phone_number: string;
        code: number;
    }): Promise<any> {
        try {
            const result = await this.directPost('/sms/otp/send/voice', {
                phone_number: data.phone_number,
                code: data.code,
            });
            return result;
        } catch (error: any) {
            logger.error('Error sending voice call:', error);
            throw error;
        }
    }

    async sendVoiceOTP(data: {
        phone_number: string;
        pin_attempts: number;
        pin_time_to_live: number;
        pin_length: number;
        pin_placeholder?: string;
    }): Promise<any> {
        try {
            const result = await this.directPost('/sms/otp/send/voice', {
                phone_number: data.phone_number,
                pin_attempts: data.pin_attempts,
                pin_time_to_live: data.pin_time_to_live,
                pin_length: data.pin_length,
                pin_placeholder: data.pin_placeholder || '< 1234 >',
            });
            return result;
        } catch (error: any) {
            logger.error('Error sending voice OTP:', error);
            throw error;
        }
    }

    // ============================================================================
    // WHATSAPP
    // ============================================================================

    async sendWhatsAppMessage(data: {
        phone_number: string;
        message: string;
        media?: {
            url: string;
            caption?: string;
        };
    }): Promise<any> {
        try {
            const payload: any = {
                phone_number: data.phone_number,
                from: this.senderId,
                type: 'plain',
                channel: 'whatsapp',
                sms: data.message,
            };

            if (data.media) {
                payload.media = data.media;
            }

            const result = await this.directPost('/sms/send', payload);
            return result;
        } catch (error: any) {
            logger.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }

    async sendWhatsAppTemplate(data: {
        phone_number: string;
        template_id: string;
        data: Record<string, any>;
    }): Promise<any> {
        try {
            const result = await this.directPost('/whatsapp/message/send', {
                phone_number: data.phone_number,
                template_id: data.template_id,
                data: data.data,
            });
            return result;
        } catch (error: any) {
            logger.error('Error sending WhatsApp template:', error);
            throw error;
        }
    }

    // ============================================================================
    // CAMPAIGNS
    // ============================================================================

    async getCampaigns(params?: {
        page?: number;
    }): Promise<any> {
        try {
            const data = await this.directGet('/sms/campaigns', {
                page: params?.page || 1,
            });
            return data;
        } catch (error: any) {
            logger.error('Error getting campaigns:', error);
            throw error;
        }
    }

    async getCampaignHistory(campaignId: string): Promise<any> {
        try {
            const data = await this.directGet(`/sms/campaigns/${campaignId}`);
            return data;
        } catch (error: any) {
            logger.error('Error getting campaign history:', error);
            throw error;
        }
    }

    // ============================================================================
    // NUMBER INSIGHTS
    // ============================================================================

    async getNumberStatus(phoneNumber: string): Promise<any> {
        try {
            const data = await this.directGet('/insight/number/query', {
                phone_number: phoneNumber,
            });
            return data;
        } catch (error: any) {
            logger.error('Error getting number status:', error);
            throw error;
        }
    }
}

// Singleton instance
let termiiClient: TermiiClient | null = null;

export const getTermii = (): TermiiClient => {
    if (!termiiClient) {
        const config: TermiiConfig = {
            apiKey: process.env.TERMII_API_KEY || 'termii',
            baseUrl: process.env.TERMII_BASE_URL || 'https://v3.api.termii.com/api',
            senderId: process.env.TERMII_SENDER_ID || 'CHURCHMS',
        };

        if (!config.apiKey) {
            throw new Error('TERMII_API_KEY is not configured. Set TERMII_API_KEY in your .env file.');
        }

        termiiClient = new TermiiClient(config);
    }

    return termiiClient;
};

export const resetTermiiClient = (): void => {
    termiiClient = null;
};