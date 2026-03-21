export interface PaystackConfig {
    secretKey: string;
    publicKey: string;
    baseUrl: string;
}
export declare class PaystackClient {
    private client;
    private secretKey;
    publicKey: string;
    constructor(config: PaystackConfig);
    initializeTransaction(data: {
        email: string;
        amount: number;
        reference?: string;
        callback_url?: string;
        metadata?: any;
        channels?: string[];
        split_code?: string;
        subaccount?: string;
        transaction_charge?: number;
        bearer?: 'account' | 'subaccount';
    }): Promise<any>;
    verifyTransaction(reference: string): Promise<any>;
    getTransaction(id: string): Promise<any>;
    listTransactions(params?: {
        perPage?: number;
        page?: number;
        customer?: string;
        status?: string;
        from?: string;
        to?: string;
        amount?: number;
    }): Promise<any>;
    createSubaccount(data: {
        business_name: string;
        settlement_bank: string;
        account_number: string;
        percentage_charge: number;
        description?: string;
        primary_contact_email?: string;
        primary_contact_name?: string;
        primary_contact_phone?: string;
        metadata?: any;
    }): Promise<any>;
    createTransactionSplit(data: {
        name: string;
        type: 'percentage' | 'flat';
        currency: string;
        subaccounts: Array<{
            subaccount: string;
            share: number;
        }>;
        bearer_type: 'all' | 'account' | 'subaccount' | 'all-proportional' | 'subaccount-proportional';
        bearer_subaccount?: string;
    }): Promise<any>;
    initiateTransfer(data: {
        source: string;
        reason: string;
        amount: number;
        recipient: string;
        reference?: string;
    }): Promise<any>;
    createTransferRecipient(data: {
        type: 'nuban' | 'mobile_money' | 'basa';
        name: string;
        account_number: string;
        bank_code: string;
        currency?: string;
        description?: string;
        metadata?: any;
    }): Promise<any>;
    getBanks(params?: {
        country?: string;
        use_cursor?: boolean;
        perPage?: number;
    }): Promise<any>;
    resolveAccountNumber(accountNumber: string, bankCode: string): Promise<any>;
}
export declare const getPaystack: () => PaystackClient;
//# sourceMappingURL=paystack.d.ts.map