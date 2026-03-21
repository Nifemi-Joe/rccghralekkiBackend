export interface Wallet {
    id: string;
    church_id: string;
    sms_balance: number;
    email_balance: number;
    whatsapp_balance: number;
    voice_balance: number;
    currency: string;
    created_at: Date;
    updated_at: Date;
}
export interface WalletTransaction {
    id: string;
    church_id: string;
    type: 'credit' | 'debit' | 'refund' | 'bonus';
    channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'all';
    units: number;
    amount?: number;
    balance_before: number;
    balance_after: number;
    reference?: string;
    description?: string;
    payment_method?: string;
    payment_reference?: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'processing';
    metadata?: any;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export interface MessagingPricing {
    id: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice';
    country_code: string;
    country_name: string;
    cost_per_unit: number;
    sell_price: number;
    currency: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface UnitPackage {
    id: string;
    name: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'combo';
    units: number;
    price: number;
    bonus_units: number;
    discount_percent: number;
    currency: string;
    is_popular: boolean;
    is_active: boolean;
    sort_order: number;
    description?: string;
    created_at: Date;
    updated_at: Date;
}
export declare class WalletRepository {
    getWallet(churchId: string): Promise<Wallet>;
    getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number>;
    creditBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'all', units: number, details: {
        amount?: number;
        reference?: string;
        description?: string;
        paymentMethod?: string;
        paymentReference?: string;
        type?: 'credit' | 'bonus';
        status?: string;
    }, createdBy?: string): Promise<Wallet>;
    debitBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice', units: number, details: {
        reference?: string;
        description?: string;
    }, createdBy?: string): Promise<Wallet>;
    refundTransaction(transactionId: string, refundAmount: number, reason: string, createdBy?: string): Promise<WalletTransaction>;
    getTransactions(churchId: string, filters: {
        channel?: string;
        type?: string;
        status?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: WalletTransaction[];
        total: number;
    }>;
    getAnalytics(churchId: string, startDate: string, endDate: string): Promise<any>;
    getAllPricing(): Promise<MessagingPricing[]>;
    getPricing(channel: string, countryCode?: string): Promise<MessagingPricing | null>;
    updatePricing(id: string, data: {
        costPerUnit?: number;
        sellPrice?: number;
        isActive?: boolean;
    }): Promise<MessagingPricing | null>;
    createPricing(data: {
        channel: string;
        countryCode: string;
        countryName: string;
        costPerUnit: number;
        sellPrice: number;
        currency?: string;
    }): Promise<MessagingPricing>;
    getAllPackages(channel?: string): Promise<UnitPackage[]>;
    getPackageById(id: string): Promise<UnitPackage | null>;
    createPackage(data: {
        name: string;
        channel: string;
        units: number;
        price: number;
        bonusUnits?: number;
        discountPercent?: number;
        isPopular?: boolean;
        sortOrder?: number;
        description?: string;
    }): Promise<UnitPackage>;
    updatePackage(id: string, data: Partial<UnitPackage>): Promise<UnitPackage | null>;
    deletePackage(id: string): Promise<boolean>;
}
//# sourceMappingURL=WalletRepository.d.ts.map