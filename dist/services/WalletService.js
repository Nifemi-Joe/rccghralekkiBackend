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
    // ENHANCED BALANCE CHECKING - Checks both local wallet AND Termii account
    // ============================================================================
    /**
     * Get comprehensive balance info from all sources
     */
    async getComprehensiveBalance(churchId, channel = 'sms') {
        try {
            // Get local wallet balance
            const localBalance = await this.walletRepository.getBalance(churchId, channel);
            // Get Termii balance and pricing
            let termiiInfo = null;
            try {
                const termii = (0, termii_1.getTermii)();
                const termiiBalance = await termii.getBalance();
                // Get SMS pricing (default to 4 NGN if not found)
                const pricing = await this.walletRepository.getPricing(channel, 'NG');
                const pricePerSms = pricing?.cost_per_unit || 4.0;
                // Calculate how many SMS units the Termii balance can buy
                const termiiBalanceAmount = parseFloat(termiiBalance?.balance || '0');
                const smsUnitsAvailable = Math.floor(termiiBalanceAmount / pricePerSms);
                termiiInfo = {
                    balance: termiiBalanceAmount,
                    currency: termiiBalance?.currency || 'NGN',
                    smsUnitsAvailable,
                    pricePerSms,
                };
                logger_1.default.info(`Termii balance: ${termiiBalanceAmount} ${termiiInfo.currency}, can send ${smsUnitsAvailable} SMS @ ${pricePerSms}/SMS`);
            }
            catch (error) {
                logger_1.default.warn('Could not fetch Termii balance:', error);
            }
            // Calculate total available units
            const termiiUnits = termiiInfo?.smsUnitsAvailable || 0;
            const totalUnits = localBalance + termiiUnits;
            // Determine source
            let source = 'none';
            if (localBalance > 0 && termiiUnits > 0) {
                source = 'combined';
            }
            else if (localBalance > 0) {
                source = 'local';
            }
            else if (termiiUnits > 0) {
                source = 'termii';
            }
            return {
                local: localBalance,
                termii: termiiInfo,
                total: totalUnits,
                canSend: totalUnits > 0,
                source,
            };
        }
        catch (error) {
            logger_1.default.error('Error getting comprehensive balance:', error);
            throw error;
        }
    }
    /**
     * Check if there's sufficient balance from any source
     */
    async checkSufficientBalance(churchId, channel, unitsRequired) {
        const balanceInfo = await this.getComprehensiveBalance(churchId, channel);
        // First check local balance
        if (balanceInfo.local >= unitsRequired) {
            return { sufficient: true, balanceInfo, useTermii: false };
        }
        // Then check Termii balance
        if (balanceInfo.termii && balanceInfo.termii.smsUnitsAvailable >= unitsRequired) {
            return { sufficient: true, balanceInfo, useTermii: true };
        }
        // Check combined balance
        if (balanceInfo.total >= unitsRequired) {
            return { sufficient: true, balanceInfo, useTermii: true };
        }
        return { sufficient: false, balanceInfo, useTermii: false };
    }
    /**
     * Get balance for a specific channel (backward compatible)
     */
    async getBalance(churchId, channel) {
        return this.walletRepository.getBalance(churchId, channel);
    }
    /**
     * Get full wallet info
     */
    async getWallet(churchId) {
        return this.walletRepository.getWallet(churchId);
    }
    // ============================================================================
    // CREDIT & DEBIT OPERATIONS
    // ============================================================================
    async creditBalance(churchId, channel, units, details, createdBy) {
        return this.walletRepository.creditBalance(churchId, channel, units, details, createdBy);
    }
    async debitBalance(churchId, channel, units, details, createdBy) {
        return this.walletRepository.debitBalance(churchId, channel, units, details, createdBy);
    }
    async refundTransaction(transactionId, refundAmount, reason, createdBy) {
        return this.walletRepository.refundTransaction(transactionId, refundAmount, reason, createdBy);
    }
    // ============================================================================
    // TRANSACTIONS
    // ============================================================================
    async getTransactions(churchId, filters) {
        return this.walletRepository.getTransactions(churchId, filters);
    }
    async getAnalytics(churchId, startDate, endDate) {
        return this.walletRepository.getAnalytics(churchId, startDate, endDate);
    }
    // ============================================================================
    // PRICING
    // ============================================================================
    async getAllPricing() {
        return this.walletRepository.getAllPricing();
    }
    async getPricing(channel, countryCode = 'NG') {
        return this.walletRepository.getPricing(channel, countryCode);
    }
    async updatePricing(id, data) {
        return this.walletRepository.updatePricing(id, data);
    }
    async createPricing(data) {
        return this.walletRepository.createPricing(data);
    }
    // ============================================================================
    // PACKAGES
    // ============================================================================
    async getAllPackages(channel) {
        return this.walletRepository.getAllPackages(channel);
    }
    async getPackageById(id) {
        return this.walletRepository.getPackageById(id);
    }
    async createPackage(data) {
        return this.walletRepository.createPackage(data);
    }
    async updatePackage(id, data) {
        return this.walletRepository.updatePackage(id, data);
    }
    async deletePackage(id) {
        return this.walletRepository.deletePackage(id);
    }
    // ============================================================================
    // PURCHASE UNITS
    // ============================================================================
    async purchaseUnits(churchId, packageId, paymentDetails, createdBy) {
        const pkg = await this.walletRepository.getPackageById(packageId);
        if (!pkg) {
            throw new AppError_1.AppError('Package not found', 404);
        }
        if (!pkg.is_active) {
            throw new AppError_1.AppError('Package is no longer available', 400);
        }
        const totalUnits = pkg.units + (pkg.bonus_units || 0);
        const channel = pkg.channel;
        const wallet = await this.creditBalance(churchId, channel === 'combo' ? 'all' : channel, totalUnits, {
            amount: paymentDetails.amount,
            reference: `PKG-${pkg.id}-${Date.now()}`,
            description: `Purchased ${pkg.name}: ${pkg.units} units + ${pkg.bonus_units || 0} bonus`,
            paymentMethod: paymentDetails.paymentMethod,
            paymentReference: paymentDetails.paymentReference,
            type: 'credit',
        }, createdBy);
        // Get the latest transaction
        const { data: transactions } = await this.walletRepository.getTransactions(churchId, { limit: 1 });
        return { wallet, transaction: transactions[0] };
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=WalletService.js.map