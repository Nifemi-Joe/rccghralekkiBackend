"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetTermiiClient = exports.getTermii = exports.TermiiClient = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const logger_1 = __importDefault(require("@config/logger"));
class TermiiClient {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.senderId = config.senderId;
        this.baseUrl = config.baseUrl || 'https://v3.api.termii.com/api';
    }
    // ============================================================================
    // RAW HTTP HELPERS - Using Node.js built-in https module
    // ============================================================================
    rawRequest(method, endpoint, params, body) {
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
                const parsedUrl = new url_1.URL(fullUrl);
                const isHttps = parsedUrl.protocol === 'https:';
                let postData;
                if (method === 'POST' && body) {
                    postData = JSON.stringify({
                        ...body,
                        api_key: this.apiKey,
                    });
                }
                const requestOptions = {
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
                logger_1.default.debug(`Termii ${method}: ${fullUrl}`);
                if (postData) {
                    logger_1.default.debug(`Termii POST body: ${postData}`);
                }
                const httpModule = isHttps ? https_1.default : http_1.default;
                const req = httpModule.request(requestOptions, (res) => {
                    const chunks = [];
                    res.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on('end', () => {
                        const rawBody = Buffer.concat(chunks).toString('utf-8');
                        logger_1.default.debug(`Termii Response ${res.statusCode}: ${rawBody.substring(0, 500)}`);
                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(`Termii API error ${res.statusCode}: ${rawBody}`));
                            return;
                        }
                        if (!rawBody || rawBody.trim() === '') {
                            logger_1.default.warn(`Termii returned empty body for ${method} ${endpoint}`);
                            resolve(null);
                            return;
                        }
                        try {
                            const parsed = JSON.parse(rawBody);
                            resolve(parsed);
                        }
                        catch (e) {
                            logger_1.default.warn(`Failed to parse Termii response as JSON for ${endpoint}:`, rawBody);
                            resolve(rawBody);
                        }
                    });
                });
                req.on('error', (error) => {
                    logger_1.default.error(`Termii request error for ${method} ${endpoint}:`, error.message);
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
            }
            catch (error) {
                logger_1.default.error(`Termii rawRequest error for ${method} ${endpoint}:`, error.message);
                reject(error);
            }
        });
    }
    async directGet(endpoint, params = {}) {
        return this.rawRequest('GET', endpoint, params);
    }
    async directPost(endpoint, payload) {
        return this.rawRequest('POST', endpoint, undefined, payload);
    }
    // ============================================================================
    // BALANCE & WALLET
    // ============================================================================
    async getBalance() {
        try {
            const data = await this.directGet('/get-balance');
            logger_1.default.info('Termii balance retrieved:', data);
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting Termii balance:', error);
            throw error;
        }
    }
    async search(phoneNumber) {
        try {
            const data = await this.directGet('/check/dnd', {
                phone_number: phoneNumber,
            });
            return data;
        }
        catch (error) {
            logger_1.default.error('Error searching phone number:', error);
            throw error;
        }
    }
    // ============================================================================
    // SMS
    // ============================================================================
    async sendSMS(data) {
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
        }
        catch (error) {
            logger_1.default.error('Error sending SMS via Termii:', error);
            throw error;
        }
    }
    async sendBulkSMS(data) {
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
        }
        catch (error) {
            logger_1.default.error('Error sending bulk SMS via Termii:', error);
            throw error;
        }
    }
    async getMessageStatus(messageId) {
        try {
            const data = await this.directGet('/sms/inbox', {
                message_id: messageId,
            });
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting message status:', error);
            throw error;
        }
    }
    async getSMSHistory(params) {
        try {
            const data = await this.directGet('/sms/inbox', {
                page: params?.page || 1,
            });
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting SMS history:', error);
            throw error;
        }
    }
    // ============================================================================
    // SENDER ID - FIXED: Using camelCase 'useCase' instead of 'usecase'
    // ============================================================================
    async requestSenderId(data) {
        try {
            // FIXED: Termii expects 'useCase' (camelCase), not 'usecase'
            console.log(data);
            const result = await this.directPost('/sender-id/request', {
                api_key: this.apiKey,
                sender_id: data.sender_id,
                use_case: data.useCase, // FIXED: Changed from 'usecase' to 'useCase'
                company: data.company,
            });
            logger_1.default.info(`Sender ID request submitted: ${data.sender_id}`, result);
            return result;
        }
        catch (error) {
            logger_1.default.error('Error requesting sender ID:', error);
            throw error;
        }
    }
    async getSenderIds() {
        try {
            const data = await this.directGet('/sender-id');
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting sender IDs:', error);
            throw error;
        }
    }
    // ============================================================================
    // EMAIL (via Termii Send)
    // ============================================================================
    async sendEmail(data) {
        try {
            const result = await this.directPost('/email/send', {
                email_address: data.email_address,
                code: data.code,
                email_configuration_id: data.email_configuration_id,
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Error sending email via Termii:', error);
            throw error;
        }
    }
    // ============================================================================
    // VOICE
    // ============================================================================
    async sendVoiceCall(data) {
        try {
            const result = await this.directPost('/sms/otp/send/voice', {
                phone_number: data.phone_number,
                code: data.code,
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Error sending voice call:', error);
            throw error;
        }
    }
    async sendVoiceOTP(data) {
        try {
            const result = await this.directPost('/sms/otp/send/voice', {
                phone_number: data.phone_number,
                pin_attempts: data.pin_attempts,
                pin_time_to_live: data.pin_time_to_live,
                pin_length: data.pin_length,
                pin_placeholder: data.pin_placeholder || '< 1234 >',
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Error sending voice OTP:', error);
            throw error;
        }
    }
    // ============================================================================
    // WHATSAPP
    // ============================================================================
    async sendWhatsAppMessage(data) {
        try {
            const payload = {
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
        }
        catch (error) {
            logger_1.default.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }
    async sendWhatsAppTemplate(data) {
        try {
            const result = await this.directPost('/whatsapp/message/send', {
                phone_number: data.phone_number,
                template_id: data.template_id,
                data: data.data,
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Error sending WhatsApp template:', error);
            throw error;
        }
    }
    // ============================================================================
    // CAMPAIGNS
    // ============================================================================
    async getCampaigns(params) {
        try {
            const data = await this.directGet('/sms/campaigns', {
                page: params?.page || 1,
            });
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting campaigns:', error);
            throw error;
        }
    }
    async getCampaignHistory(campaignId) {
        try {
            const data = await this.directGet(`/sms/campaigns/${campaignId}`);
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting campaign history:', error);
            throw error;
        }
    }
    // ============================================================================
    // NUMBER INSIGHTS
    // ============================================================================
    async getNumberStatus(phoneNumber) {
        try {
            const data = await this.directGet('/insight/number/query', {
                phone_number: phoneNumber,
            });
            return data;
        }
        catch (error) {
            logger_1.default.error('Error getting number status:', error);
            throw error;
        }
    }
}
exports.TermiiClient = TermiiClient;
// Singleton instance
let termiiClient = null;
const getTermii = () => {
    if (!termiiClient) {
        const config = {
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
exports.getTermii = getTermii;
const resetTermiiClient = () => {
    termiiClient = null;
};
exports.resetTermiiClient = resetTermiiClient;
//# sourceMappingURL=termii.js.map