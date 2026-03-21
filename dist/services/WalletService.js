"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
// src/services/WalletService.ts
const WalletRepository_1 = require("@repositories/WalletRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const termii_1 = require("@config/termii");
class WalletService {
    constructor() {
        this.walletRepository = new WalletRepository_1.WalletRepository();
    }
    // ============================================================================
    // WALLET
    // ============================================================================
    async getWallet(churchId) {
        return this.walletRepository.getWallet(churchId);
    }
    async getBalance(churchId, channel) {
        return this.walletRepository.getBalance(churchId, channel);
    }
    async getAllBalances(churchId) {
        const wallet = await this.getWallet(churchId);
        // Get Termii balance
        let termiiBalance;
        try {
            const termii = (0, termii_1.getTermii)();
            const balance = await termii.getBalance();
            termiiBalance = {
                balance: balance.balance || 0,
                currency: balance.currency || 'NGN',
            };
        }
        catch (error) {
            logger_1.default.error('Error getting Termii balance:', error);
        }
        return {
            sms: wallet.sms_balance,
            email: wallet.email_balance,
            whatsapp: wallet.whatsapp_balance,
            voice: wallet.voice_balance,
            termii: termiiBalance,
        };
    }
    async creditBalance(churchId, channel, units, details, createdBy) {
        return this.walletRepository.creditBalance(churchId, channel, units, details, createdBy);
    }
    async debitBalance(churchId, channel, units, details, createdBy) {
        return this.walletRepository.debitBalance(churchId, channel, units, details, createdBy);
    }
    async checkSufficientBalance(churchId, channel, requiredUnits) {
        const balance = await this.getBalance(churchId, channel);
        return balance >= requiredUnits;
    }
    async getTransactions(churchId, filters) {
        return this.walletRepository.getTransactions(churchId, filters || {});
    }
    async getAnalytics(churchId, startDate, endDate) {
        return this.walletRepository.getAnalytics(churchId, startDate, endDate);
    }
    async refundTransaction(transactionId, refundAmount, reason, createdBy) {
        return this.walletRepository.refundTransaction(transactionId, refundAmount, reason, createdBy);
    }
    // Pricing methods
    async getAllPricing() {
        return this.walletRepository.getAllPricing();
    }
    async getPricing(channel, countryCode = 'NG') {
        const pricing = await this.walletRepository.getPricing(channel, countryCode);
        if (!pricing) {
            throw new AppError_1.AppError(`Pricing not found for ${channel} in ${countryCode}`, 404);
        }
        return pricing;
    }
    async updatePricing(pricingId, data) {
        const updated = await this.walletRepository.updatePricing(pricingId, data);
        if (!updated) {
            throw new AppError_1.AppError('Failed to update pricing', 500);
        }
        return updated;
    }
    async createPricing(data) {
        return this.walletRepository.createPricing(data);
    }
    // Package methods
    async getAllPackages(channel) {
        return this.walletRepository.getAllPackages(channel);
    }
    async getPackageById(id) {
        const pkg = await this.walletRepository.getPackageById(id);
        if (!pkg) {
            throw new AppError_1.AppError('Package not found', 404);
        }
        return pkg;
    }
    async createPackage(data) {
        return this.walletRepository.createPackage(data);
    }
    async updatePackage(id, data) {
        const updated = await this.walletRepository.updatePackage(id, data);
        if (!updated) {
            throw new AppError_1.AppError('Failed to update package', 500);
        }
        return updated;
    }
    async deletePackage(id) {
        const deleted = await this.walletRepository.deletePackage(id);
        if (!deleted) {
            throw new AppError_1.AppError('Package not found', 404);
        }
    }
    async purchaseUnits(churchId, data, userId) {
        try {
            let units = data.units || 0;
            let bonusUnits = 0;
            // If package ID provided, get package details
            if (data.packageId) {
                const pkg = await this.walletRepository.getPackageById(data.packageId);
                if (!pkg) {
                    throw new AppError_1.AppError('Package not found', 404);
                }
                if (!pkg.is_active) {
                    throw new AppError_1.AppError('Package is no longer available', 400);
                }
                units = pkg.units;
                bonusUnits = pkg.bonus_units;
            }
            const totalUnits = units + bonusUnits;
            // Credit the wallet
            const wallet = await this.walletRepository.creditBalance(churchId, data.channel, units, {
                amount: data.amount,
                reference: data.paymentReference,
                description: `Purchased ${units} ${data.channel.toUpperCase()} units`,
                paymentMethod: data.paymentMethod,
                paymentReference: data.paymentReference,
                type: 'credit',
                status: 'completed',
            }, userId);
            // If there are bonus units, add them separately
            if (bonusUnits > 0) {
                await this.walletRepository.creditBalance(churchId, data.channel, bonusUnits, {
                    reference: `BONUS-${data.paymentReference}`,
                    description: `Bonus units for purchase ${data.paymentReference}`,
                    type: 'bonus',
                    status: 'completed',
                }, userId);
            }
            logger_1.default.info(`Purchased ${totalUnits} ${data.channel} units for church ${churchId}`);
            return wallet;
        }
        catch (error) {
            logger_1.default.error('Error purchasing units:', error);
            throw error;
        }
    }
    async deductUnits(churchId, channel, units, reference, description, userId) {
        const balance = await this.getBalance(churchId, channel);
        if (balance < units) {
            throw new AppError_1.AppError(`Insufficient ${channel} balance. Required: ${units}, Available: ${balance}`, 400);
        }
        return this.walletRepository.debitBalance(churchId, channel, units, { reference, description }, userId);
    }
    async exportTransactions(churchId, filters) {
        const { data } = await this.walletRepository.getTransactions(churchId, {
            ...filters,
            page: 1,
            limit: 10000, // Export all
        });
        // Create CSV
        const headers = ['Date', 'Type', 'Channel', 'Reference', 'Units', 'Amount', 'Balance After', 'Status', 'Description'];
        const rows = data.map(tx => [
            new Date(tx.created_at).toISOString(),
            tx.type,
            tx.channel,
            tx.reference || '',
            tx.units.toString(),
            tx.amount?.toString() || '',
            tx.balance_after.toString(),
            tx.status,
            tx.description || '',
        ]);
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        return csv;
    }
    // ============================================================================
    // ANALYTICS
    // ============================================================================
    async getUsageAnalytics(churchId, startDate, endDate) {
        const analytics = await this.walletRepository.getAnalytics(churchId, startDate, endDate);
        const wallet = await this.getWallet(churchId);
        return {
            totalRevenue: parseFloat(analytics.total_revenue) || 0,
            totalRefunds: parseFloat(analytics.total_refunds) || 0,
            totalPurchases: parseInt(analytics.total_purchases) || 0,
            totalUnitsDistributed: parseInt(analytics.total_units_distributed) || 0,
            balances: {
                sms: wallet.sms_balance,
                email: wallet.email_balance,
                whatsapp: wallet.whatsapp_balance,
                voice: wallet.voice_balance,
            },
            byChannel: analytics.byChannel,
        };
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=WalletService.js.map