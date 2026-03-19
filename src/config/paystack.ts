// src/config/paystack.ts
import axios, { AxiosInstance } from 'axios';
import logger from '@config/logger';

export interface PaystackConfig {
    secretKey: string;
    publicKey: string;
    baseUrl: string;
}

export class PaystackClient {
    private client: AxiosInstance;
    private secretKey: string;
    public publicKey: string;

    constructor(config: PaystackConfig) {
        this.secretKey = config.secretKey;
        this.publicKey = config.publicKey;

        this.client = axios.create({
            baseURL: config.baseUrl || 'https://api.paystack.co',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
        });

        this.client.interceptors.request.use(
            (config) => {
                logger.debug(`Paystack Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('Paystack Request Error:', error);
                return Promise.reject(error);
            }
        );

        this.client.interceptors.response.use(
            (response) => {
                logger.debug(`Paystack Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                logger.error('Paystack Response Error:', error.response?.data || error.message);
                return Promise.reject(error);
            }
        );
    }

    // ============================================================================
    // TRANSACTIONS
    // ============================================================================

    async initializeTransaction(data: {
        email: string;
        amount: number; // in kobo
        reference?: string;
        callback_url?: string;
        metadata?: any;
        channels?: string[];
        split_code?: string;
        subaccount?: string;
        transaction_charge?: number;
        bearer?: 'account' | 'subaccount';
    }): Promise<any> {
        try {
            const response = await this.client.post('/transaction/initialize', data);
            return response.data;
        } catch (error: any) {
            logger.error('Error initializing transaction:', error);
            throw error;
        }
    }

    async verifyTransaction(reference: string): Promise<any> {
        try {
            const response = await this.client.get(`/transaction/verify/${reference}`);
            return response.data;
        } catch (error: any) {
            logger.error('Error verifying transaction:', error);
            throw error;
        }
    }

    async getTransaction(id: string): Promise<any> {
        try {
            const response = await this.client.get(`/transaction/${id}`);
            return response.data;
        } catch (error: any) {
            logger.error('Error getting transaction:', error);
            throw error;
        }
    }

    async listTransactions(params?: {
        perPage?: number;
        page?: number;
        customer?: string;
        status?: string;
        from?: string;
        to?: string;
        amount?: number;
    }): Promise<any> {
        try {
            const response = await this.client.get('/transaction', { params });
            return response.data;
        } catch (error: any) {
            logger.error('Error listing transactions:', error);
            throw error;
        }
    }

    // ============================================================================
    // SPLITS & SUBACCOUNTS
    // ============================================================================

    async createSubaccount(data: {
        business_name: string;
        settlement_bank: string;
        account_number: string;
        percentage_charge: number;
        description?: string;
        primary_contact_email?: string;
        primary_contact_name?: string;
        primary_contact_phone?: string;
        metadata?: any;
    }): Promise<any> {
        try {
            const response = await this.client.post('/subaccount', data);
            return response.data;
        } catch (error: any) {
            logger.error('Error creating subaccount:', error);
            throw error;
        }
    }

    async createTransactionSplit(data: {
        name: string;
        type: 'percentage' | 'flat';
        currency: string;
        subaccounts: Array<{
            subaccount: string;
            share: number;
        }>;
        bearer_type: 'all' | 'account' | 'subaccount' | 'all-proportional' | 'subaccount-proportional';
        bearer_subaccount?: string;
    }): Promise<any> {
        try {
            const response = await this.client.post('/split', data);
            return response.data;
        } catch (error: any) {
            logger.error('Error creating split:', error);
            throw error;
        }
    }

    // ============================================================================
    // TRANSFERS
    // ============================================================================

    async initiateTransfer(data: {
        source: string;
        reason: string;
        amount: number;
        recipient: string;
        reference?: string;
    }): Promise<any> {
        try {
            const response = await this.client.post('/transfer', data);
            return response.data;
        } catch (error: any) {
            logger.error('Error initiating transfer:', error);
            throw error;
        }
    }

    async createTransferRecipient(data: {
        type: 'nuban' | 'mobile_money' | 'basa';
        name: string;
        account_number: string;
        bank_code: string;
        currency?: string;
        description?: string;
        metadata?: any;
    }): Promise<any> {
        try {
            const response = await this.client.post('/transferrecipient', data);
            return response.data;
        } catch (error: any) {
            logger.error('Error creating transfer recipient:', error);
            throw error;
        }
    }

    // ============================================================================
    // BANKS
    // ============================================================================

    async getBanks(params?: {
        country?: string;
        use_cursor?: boolean;
        perPage?: number;
    }): Promise<any> {
        try {
            const response = await this.client.get('/bank', { params });
            return response.data;
        } catch (error: any) {
            logger.error('Error getting banks:', error);
            throw error;
        }
    }

    async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
        try {
            const response = await this.client.get('/bank/resolve', {
                params: {
                    account_number: accountNumber,
                    bank_code: bankCode,
                }
            });
            return response.data;
        } catch (error: any) {
            logger.error('Error resolving account:', error);
            throw error;
        }
    }
}

// Singleton instance
let paystackClient: PaystackClient | null = null;

export const getPaystack = (): PaystackClient => {
    if (!paystackClient) {
        const config: PaystackConfig = {
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