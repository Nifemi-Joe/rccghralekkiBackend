export interface PurchaseRequest {
    churchId: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'combo';
    packageId?: string;
    units?: number;
    email: string;
    userId?: string;
    callbackUrl?: string;
}
export interface PurchaseResponse {
    reference: string;
    authorizationUrl: string;
    accessCode: string;
    amount: number;
    units: number;
}
export declare class PaymentService {
    private walletService;
    constructor();
    initiatePurchase(data: PurchaseRequest): Promise<PurchaseResponse>;
    verifyPayment(reference: string): Promise<{
        success: boolean;
        churchId: string;
        channel: string;
        units: number;
        amount: number;
    }>;
    handleWebhook(payload: any, signature: string): Promise<void>;
    private fundTermiiWallet;
    private generateReference;
    getPaymentHistory(churchId: string, filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: import("../repositories/WalletRepository").WalletTransaction[];
        total: number;
    }>;
}
//# sourceMappingURL=PaymentService.d.ts.map