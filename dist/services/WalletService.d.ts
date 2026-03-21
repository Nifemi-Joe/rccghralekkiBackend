import { Wallet, WalletTransaction, MessagingPricing, UnitPackage } from '@repositories/WalletRepository';
export interface PurchaseUnitsDTO {
    packageId?: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice';
    units?: number;
    paymentMethod: string;
    paymentReference: string;
    amount: number;
}
export declare class WalletService {
    private walletRepository;
    constructor();
    getWallet(churchId: string): Promise<Wallet>;
    getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number>;
    getAllBalances(churchId: string): Promise<{
        sms: number;
        email: number;
        whatsapp: number;
        voice: number;
        termii?: {
            balance: number;
            currency: string;
        };
    }>;
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
    checkSufficientBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice', requiredUnits: number): Promise<boolean>;
    getTransactions(churchId: string, filters?: {
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
    refundTransaction(transactionId: string, refundAmount: number, reason: string, createdBy?: string): Promise<WalletTransaction>;
    getAllPricing(): Promise<MessagingPricing[]>;
    getPricing(channel: string, countryCode?: string): Promise<MessagingPricing>;
    updatePricing(pricingId: string, data: {
        costPerUnit?: number;
        sellPrice?: number;
        isActive?: boolean;
    }): Promise<MessagingPricing>;
    createPricing(data: {
        channel: string;
        countryCode: string;
        countryName: string;
        costPerUnit: number;
        sellPrice: number;
        currency?: string;
    }): Promise<MessagingPricing>;
    getAllPackages(channel?: string): Promise<UnitPackage[]>;
    getPackageById(id: string): Promise<UnitPackage>;
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
    updatePackage(id: string, data: Partial<UnitPackage>): Promise<UnitPackage>;
    deletePackage(id: string): Promise<void>;
    purchaseUnits(churchId: string, data: PurchaseUnitsDTO, userId?: string): Promise<Wallet>;
    deductUnits(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice', units: number, reference: string, description: string, userId?: string): Promise<Wallet>;
    exportTransactions(churchId: string, filters: {
        channel?: string;
        type?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<string>;
    getUsageAnalytics(churchId: string, startDate: string, endDate: string): Promise<{
        totalRevenue: number;
        totalRefunds: number;
        totalPurchases: number;
        totalUnitsDistributed: number;
        balances: {
            sms: number;
            email: number;
            whatsapp: number;
            voice: number;
        };
        byChannel: any;
    }>;
}
//# sourceMappingURL=WalletService.d.ts.map