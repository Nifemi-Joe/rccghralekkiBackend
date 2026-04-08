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
export interface AllBalances {
    sms: number;
    email: number;
    whatsapp: number;
    voice: number;
    currency: string;
    termii?: {
        balance: number;
        currency: string;
        smsUnitsAvailable: number;
        pricePerSms: number;
    } | null;
}
export declare class WalletService {
    private walletRepository;
    constructor();
    getComprehensiveBalance(churchId: string, channel?: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<BalanceInfo>;
    checkSufficientBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice', unitsRequired: number): Promise<{
        sufficient: boolean;
        balanceInfo: BalanceInfo;
        useTermii: boolean;
    }>;
    getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number>;
    getAllBalances(churchId: string): Promise<AllBalances>;
    getWallet(churchId: string): Promise<Wallet>;
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
    /**
     * Convenience wrapper used by WhatsAppService and other callers that pass
     * the reference and description as positional arguments instead of an
     * object.  Delegates to the existing `debitBalance` method.
     *
     * @param churchId    - Church whose wallet will be debited
     * @param channel     - Messaging channel to debit
     * @param units       - Number of units to deduct
     * @param reference   - Transaction reference (e.g. campaign / message ID)
     * @param description - Human-readable description of the debit
     * @param createdBy   - Optional user ID that triggered the debit
     */
    deductUnits(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice', units: number, reference: string, description: string, createdBy?: string): Promise<Wallet>;
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
    exportTransactions(churchId: string, filters: {
        channel?: string;
        type?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<string>;
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