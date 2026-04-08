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
    // ENHANCED BALANCE CHECKING
    // ============================================================================
    async getComprehensiveBalance(churchId, channel = 'sms') {
        try {
            const localBalance = await this.walletRepository.getBalance(churchId, channel);
            let termiiInfo = null;
            try {
                const termii = (0, termii_1.getTermii)();
                const termiiBalance = await termii.getBalance();
                const pricing = await this.walletRepository.getPricing(channel, 'NG');
                const pricePerSms = pricing?.cost_per_unit || 4.0;
                const termiiBalanceAmount = parseFloat(termiiBalance?.balance || '0');
                const smsUnitsAvailable = Math.floor(termiiBalanceAmount / pricePerSms);
                termiiInfo = {
                    balance: termiiBalanceAmount,
                    currency: termiiBalance?.currency || 'NGN',
                    smsUnitsAvailable,
                    pricePerSms,
                };
                logger_1.default.info(`Termii balance: ${termiiBalanceAmount} ${termiiInfo.currency}, ` +
                    `can send ${smsUnitsAvailable} SMS @ ${pricePerSms}/SMS`);
            }
            catch (error) {
                logger_1.default.warn('Could not fetch Termii balance:', error);
            }
            const termiiUnits = termiiInfo?.smsUnitsAvailable || 0;
            const totalUnits = localBalance + termiiUnits;
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
    async checkSufficientBalance(churchId, channel, unitsRequired) {
        const balanceInfo = await this.getComprehensiveBalance(churchId, channel);
        if (balanceInfo.local >= unitsRequired) {
            return { sufficient: true, balanceInfo, useTermii: false };
        }
        if (balanceInfo.termii && balanceInfo.termii.smsUnitsAvailable >= unitsRequired) {
            return { sufficient: true, balanceInfo, useTermii: true };
        }
        if (balanceInfo.total >= unitsRequired) {
            return { sufficient: true, balanceInfo, useTermii: true };
        }
        return { sufficient: false, balanceInfo, useTermii: false };
    }
    async getBalance(churchId, channel) {
        return this.walletRepository.getBalance(churchId, channel);
    }
    async getAllBalances(churchId) {
        try {
            const wallet = await this.walletRepository.getWallet(churchId);
            let termiiInfo = null;
            try {
                const termii = (0, termii_1.getTermii)();
                const termiiBalance = await termii.getBalance();
                const pricing = await this.walletRepository.getPricing('sms', 'NG');
                const pricePerSms = pricing?.cost_per_unit || 4.0;
                const termiiBalanceAmount = parseFloat(termiiBalance?.balance || '0');
                const smsUnitsAvailable = Math.floor(termiiBalanceAmount / pricePerSms);
                termiiInfo = {
                    balance: termiiBalanceAmount,
                    currency: termiiBalance?.currency || 'NGN',
                    smsUnitsAvailable,
                    pricePerSms,
                };
            }
            catch (error) {
                logger_1.default.warn('Could not fetch Termii balance for getAllBalances:', error);
            }
            return {
                sms: wallet.sms_balance ?? 0,
                email: wallet.email_balance ?? 0,
                whatsapp: wallet.whatsapp_balance ?? 0,
                voice: wallet.voice_balance ?? 0,
                currency: wallet.currency ?? 'NGN',
                termii: termiiInfo,
            };
        }
        catch (error) {
            logger_1.default.error('Error getting all balances:', error);
            throw error;
        }
    }
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
    async deductUnits(churchId, channel, units, reference, description, createdBy) {
        return this.debitBalance(churchId, channel, units, { reference, description }, createdBy);
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
    async exportTransactions(churchId, filters) {
        try {
            logger_1.default.info(`Exporting transactions for church ${churchId}`, { filters });
            const { data } = await this.walletRepository.getTransactions(churchId, {
                ...filters,
                page: 1,
                limit: 100000,
            });
            const headers = [
                'ID', 'Type', 'Channel', 'Units', 'Amount',
                'Balance Before', 'Balance After', 'Reference', 'Description',
                'Payment Method', 'Payment Reference', 'Status', 'Created At',
            ];
            const escapeCell = (value) => {
                if (value === null || value === undefined)
                    return '';
                const str = String(value);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            const rows = data.map(tx => [
                escapeCell(tx.id),
                escapeCell(tx.type),
                escapeCell(tx.channel),
                escapeCell(tx.units),
                escapeCell(tx.amount ?? ''),
                escapeCell(tx.balance_before),
                escapeCell(tx.balance_after),
                escapeCell(tx.reference ?? ''),
                escapeCell(tx.description ?? ''),
                escapeCell(tx.payment_method ?? ''),
                escapeCell(tx.payment_reference ?? ''),
                escapeCell(tx.status),
                escapeCell(tx.created_at ? new Date(tx.created_at).toISOString() : ''),
            ].join(','));
            return [headers.join(','), ...rows].join('\n');
        }
        catch (error) {
            logger_1.default.error('Error exporting transactions:', error);
            throw new AppError_1.AppError(error.message || 'Failed to export transactions', error.statusCode || 500);
        }
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
        const wallet = await this.creditBalance(churchId, channel === 'all' ? 'all' : channel, totalUnits, {
            amount: paymentDetails.amount,
            reference: `PKG-${pkg.id}-${Date.now()}`,
            description: `Purchased ${pkg.name}: ${pkg.units} units + ${pkg.bonus_units || 0} bonus`,
            paymentMethod: paymentDetails.paymentMethod,
            paymentReference: paymentDetails.paymentReference,
            type: 'credit',
        }, createdBy);
        const { data: transactions } = await this.walletRepository.getTransactions(churchId, { limit: 1 });
        return { wallet, transaction: transactions[0] };
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=WalletService.js.map