export interface ChannelPricing {
    channel: 'sms' | 'email' | 'whatsapp' | 'voice';
    countryCode: string;
    costPerUnit: number;
    sellPrice: number;
    margin: number;
    marginPercent: number;
}
export declare class PricingService {
    private walletRepository;
    constructor();
    getAllPricing(): Promise<ChannelPricing[]>;
    getPricingByChannel(channel: string, countryCode?: string): Promise<ChannelPricing>;
    updatePricing(pricingId: string, data: {
        costPerUnit?: number;
        sellPrice?: number;
        marginPercent?: number;
    }): Promise<ChannelPricing>;
    seedDefaultPricing(): Promise<void>;
    calculateCost(channel: 'sms' | 'email' | 'whatsapp' | 'voice', units: number, countryCode?: string): Promise<{
        units: number;
        costPerUnit: number;
        sellPricePerUnit: number;
        totalCost: number;
        totalSellPrice: number;
        margin: number;
    }>;
}
//# sourceMappingURL=PricingService.d.ts.map