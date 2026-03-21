"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
// src/services/PricingService.ts
const WalletRepository_1 = require("@repositories/WalletRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class PricingService {
    constructor() {
        this.walletRepository = new WalletRepository_1.WalletRepository();
    }
    async getAllPricing() {
        const pricing = await this.walletRepository.getAllPricing();
        return pricing.map(p => ({
            channel: p.channel,
            countryCode: p.country_code,
            costPerUnit: p.cost_per_unit,
            sellPrice: p.sell_price,
            margin: p.sell_price - p.cost_per_unit,
            marginPercent: ((p.sell_price - p.cost_per_unit) / p.cost_per_unit) * 100,
        }));
    }
    async getPricingByChannel(channel, countryCode = 'NG') {
        const pricing = await this.walletRepository.getPricing(channel, countryCode);
        if (!pricing) {
            throw new AppError_1.AppError(`Pricing not found for ${channel} in ${countryCode}`, 404);
        }
        return {
            channel: pricing.channel,
            countryCode: pricing.country_code,
            costPerUnit: pricing.cost_per_unit,
            sellPrice: pricing.sell_price,
            margin: pricing.sell_price - pricing.cost_per_unit,
            marginPercent: ((pricing.sell_price - pricing.cost_per_unit) / pricing.cost_per_unit) * 100,
        };
    }
    async updatePricing(pricingId, data) {
        // If margin percent is provided, calculate sell price
        if (data.marginPercent !== undefined && data.costPerUnit) {
            data.sellPrice = data.costPerUnit * (1 + data.marginPercent / 100);
        }
        const updated = await this.walletRepository.updatePricing(pricingId, {
            costPerUnit: data.costPerUnit,
            sellPrice: data.sellPrice,
        });
        if (!updated) {
            throw new AppError_1.AppError('Failed to update pricing', 500);
        }
        return {
            channel: updated.channel,
            countryCode: updated.country_code,
            costPerUnit: updated.cost_per_unit,
            sellPrice: updated.sell_price,
            margin: updated.sell_price - updated.cost_per_unit,
            marginPercent: ((updated.sell_price - updated.cost_per_unit) / updated.cost_per_unit) * 100,
        };
    }
    async seedDefaultPricing() {
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
                logger_1.default.info(`Created pricing for ${pricing.channel} - ${pricing.countryCode}`);
            }
            catch (error) {
                logger_1.default.error(`Error creating pricing for ${pricing.channel} - ${pricing.countryCode}:`, error);
            }
        }
    }
    async calculateCost(channel, units, countryCode = 'NG') {
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
exports.PricingService = PricingService;
//# sourceMappingURL=PricingService.js.map