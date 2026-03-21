"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaystack = exports.PaystackClient = void 0;
// src/config/paystack.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("@config/logger"));
class PaystackClient {
    constructor(config) {
        this.secretKey = config.secretKey;
        this.publicKey = config.publicKey;
        this.client = axios_1.default.create({
            baseURL: config.baseUrl || 'https://api.paystack.co',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.request.use((config) => {
            logger_1.default.debug(`Paystack Request: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            logger_1.default.error('Paystack Request Error:', error);
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            logger_1.default.debug(`Paystack Response: ${response.status} ${response.config.url}`);
            return response;
        }, (error) => {
            logger_1.default.error('Paystack Response Error:', error.response?.data || error.message);
            return Promise.reject(error);
        });
    }
    // ============================================================================
    // TRANSACTIONS
    // ============================================================================
    async initializeTransaction(data) {
        try {
            const response = await this.client.post('/transaction/initialize', data);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error initializing transaction:', error);
            throw error;
        }
    }
    async verifyTransaction(reference) {
        try {
            const response = await this.client.get(`/transaction/verify/${reference}`);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error verifying transaction:', error);
            throw error;
        }
    }
    async getTransaction(id) {
        try {
            const response = await this.client.get(`/transaction/${id}`);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error getting transaction:', error);
            throw error;
        }
    }
    async listTransactions(params) {
        try {
            const response = await this.client.get('/transaction', { params });
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error listing transactions:', error);
            throw error;
        }
    }
    // ============================================================================
    // SPLITS & SUBACCOUNTS
    // ============================================================================
    async createSubaccount(data) {
        try {
            const response = await this.client.post('/subaccount', data);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error creating subaccount:', error);
            throw error;
        }
    }
    async createTransactionSplit(data) {
        try {
            const response = await this.client.post('/split', data);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error creating split:', error);
            throw error;
        }
    }
    // ============================================================================
    // TRANSFERS
    // ============================================================================
    async initiateTransfer(data) {
        try {
            const response = await this.client.post('/transfer', data);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error initiating transfer:', error);
            throw error;
        }
    }
    async createTransferRecipient(data) {
        try {
            const response = await this.client.post('/transferrecipient', data);
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error creating transfer recipient:', error);
            throw error;
        }
    }
    // ============================================================================
    // BANKS
    // ============================================================================
    async getBanks(params) {
        try {
            const response = await this.client.get('/bank', { params });
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error getting banks:', error);
            throw error;
        }
    }
    async resolveAccountNumber(accountNumber, bankCode) {
        try {
            const response = await this.client.get('/bank/resolve', {
                params: {
                    account_number: accountNumber,
                    bank_code: bankCode,
                }
            });
            return response.data;
        }
        catch (error) {
            logger_1.default.error('Error resolving account:', error);
            throw error;
        }
    }
}
exports.PaystackClient = PaystackClient;
// Singleton instance
let paystackClient = null;
const getPaystack = () => {
    if (!paystackClient) {
        const config = {
            secretKey: process.env.PAYSTACK_SECRET_KEY || '',
            publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
            baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
        };
        if (!config.secretKey || !config.publicKey) {
            throw new Error('Paystack keys are not configured');
        }
        paystackClient = new PaystackClient(config);
    }
    return paystackClient;
};
exports.getPaystack = getPaystack;
//# sourceMappingURL=paystack.js.map