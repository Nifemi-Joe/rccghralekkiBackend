import { Wallet, WalletTransaction, MessagingPricing, UnitPackage } from '@repositories/WalletRepository';
export interface BalanceInfo {
    local: number;
    termii: {
        balance: number;
        currency: string;
        smsUnitsAvailable: number;
        pricePerSms: number;
    } | null;
    total: number;
    canSend: boolean;
    source: 'local' | 'termii' | 'combined' | 'none';
}
export declare class WalletService {
    private walletRepository;
    constructor();
    /**
     * Get comprehensive balance info from all sources
     */
    getComprehensiveBalance(churchId: string, channel?: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<BalanceInfo>;
    /**
     * Check if there's sufficient balance from any source
     */
    checkSufficientBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice', unitsRequired: number): Promise<{
        sufficient: boolean;
        balanceInfo: BalanceInfo;
        useTermii: boolean;
    }>;
    /**
     * Get balance for a specific channel (backward compatible)
     */
    getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number>;
    /**
     * Get full wallet info
     */
    getWallet(churchId: string): Promise<Wallet>;
    creditBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'all', units: number, details: {
        amount?: number;
        reference?: string;
        description?: string;
        paymentMethod?: string;
        paymentReference?: string;
        type?: 'credit' | 'bonus';
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
    purchaseUnits(churchId: string, packageId: string, paymentDetails: {
        paymentMethod: string;
        paymentReference: string;
        amount: number;
    }, createdBy?: string): Promise<{
        wallet: Wallet;
        transaction: WalletTransaction;
    }>;
}
//# sourceMappingURL=WalletService.d.ts.map