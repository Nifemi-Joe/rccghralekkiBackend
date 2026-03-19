// src/services/PricingService.ts
import { WalletRepository } from '@repositories/WalletRepository';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export interface ChannelPricing {
    channel: 'sms' | 'email' | 'whatsapp' | 'voice';
    countryCode: string;
    costPerUnit: number;
    sellPrice: number;
    margin: number;
    marginPercent: number;
}

export class PricingService {
    private walletRepository: WalletRepository;

    constructor() {
        this.walletRepository = new WalletRepository();
    }

    async getAllPricing(): Promise<ChannelPricing[]> {
        const pricing = await this.walletRepository.getAllPricing();

        return pricing.map(p => ({
            channel: p.channel as any,
            countryCode: p.country_code,
            costPerUnit: p.cost_per_unit,
            sellPrice: p.sell_price,
            margin: p.sell_price - p.cost_per_unit,
            marginPercent: ((p.sell_price - p.cost_per_unit) / p.cost_per_unit) * 100,
        }));
    }

    async getPricingByChannel(channel: string, countryCode: string = 'NG'): Promise<ChannelPricing> {
        const pricing = await this.walletRepository.getPricing(channel, countryCode);

        if (!pricing) {
            throw new AppError(`Pricing not found for ${channel} in ${countryCode}`, 404);
        }

        return {
            channel: pricing.channel as any,
            countryCode: pricing.country_code,
            costPerUnit: pricing.cost_per_unit,
            sellPrice: pricing.sell_price,
            margin: pricing.sell_price - pricing.cost_per_unit,
            marginPercent: ((pricing.sell_price - pricing.cost_per_unit) / pricing.cost_per_unit) * 100,
        };
    }

    async updatePricing(
        pricingId: string,
        data: {
            costPerUnit?: number;
            sellPrice?: number;
            marginPercent?: number;
        }
    ): Promise<ChannelPricing> {
        // If margin percent is provided, calculate sell price
        if (data.marginPercent !== undefined && data.costPerUnit) {
            data.sellPrice = data.costPerUnit * (1 + data.marginPercent / 100);
        }

        const updated = await this.walletRepository.updatePricing(pricingId, {
            costPerUnit: data.costPerUnit,
            sellPrice: data.sellPrice,
        });

        if (!updated) {
            throw new AppError('Failed to update pricing', 500);
        }

        return {
            channel: updated.channel as any,
            countryCode: updated.country_code,
            costPerUnit: updated.cost_per_unit,
            sellPrice: updated.sell_price,
            margin: updated.sell_price - updated.cost_per_unit,
            marginPercent: ((updated.sell_price - updated.cost_per_unit) / updated.cost_per_unit) * 100,
        };
    }

    async seedDefaultPricing(): Promise<void> {
        // Default pricing with markup
        const defaultPricing = [
            // SMS
            { channel: 'sms', countryCode: 'NG', countryName: 'Nigeria', costPerUnit: 2.5, sellPrice: 3.5 },
            { channel: 'sms', countryCode: 'US', countryName: 'United States', costPerUnit: 10, sellPrice: 15 },
            { channel: 'sms', countryCode: 'GB', countryName: 'United Kingdom', costPerUnit: 8, sellPrice: 12 },

            // Email
            { channel: 'email', countryCode: 'NG', countryName: 'Nigeria', costPerUnit: 0.5, sellPrice: 1.0 },
            { channel: 'email', countryCode: 'US', countryName: 'United States', costPerUnit: 0.5, sellPrice: 1.0 },

            // WhatsApp
            { channel: 'whatsapp', countryCode: 'NG', countryName: 'Nigeria', costPerUnit: 5, sellPrice: 7.5 },
            { channel: 'whatsapp', countryCode: 'US', countryName: 'United States', costPerUnit: 12, sellPrice: 18 },

            // Voice
            { channel: 'voice', countryCode: 'NG', countryName: 'Nigeria', costPerUnit: 15, sellPrice: 22 },
            { channel: 'voice', countryCode: 'US', countryName: 'United States', costPerUnit: 20, sellPrice: 30 },
        ];

        for (const pricing of defaultPricing) {
            try {
                await this.walletRepository.createPricing(pricing);
                logger.info(`Created pricing for ${pricing.channel} - ${pricing.countryCode}`);
            } catch (error) {
                logger.error(`Error creating pricing for ${pricing.channel} - ${pricing.countryCode}:`, error);
            }
        }
    }

    async calculateCost(
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        units: number,
        countryCode: string = 'NG'
    ): Promise<{
        units: number;
        costPerUnit: number;
        sellPricePerUnit: number;
        totalCost: number;
        totalSellPrice: number;
        margin: number;
    }> {
        const pricing = await this.getPricingByChannel(channel, countryCode);

        return {
            units,
            costPerUnit: pricing.costPerUnit,
            sellPricePerUnit: pricing.sellPrice,
            totalCost: units * pricing.costPerUnit,
            totalSellPrice: units * pricing.sellPrice,
            margin: units * pricing.margin,
        };
    }
}
