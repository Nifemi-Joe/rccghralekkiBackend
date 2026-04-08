// src/services/WalletService.ts
import { WalletRepository, Wallet, WalletTransaction, MessagingPricing, UnitPackage } from '@repositories/WalletRepository';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import { getTermii } from '@config/termii';

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

export class WalletService {
    private walletRepository: WalletRepository;

    constructor() {
        this.walletRepository = new WalletRepository();
    }

    // ============================================================================
    // ENHANCED BALANCE CHECKING - Checks both local wallet AND Termii account
    // ============================================================================

    /**
     * Get comprehensive balance info from all sources
     */
    async getComprehensiveBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice' = 'sms'): Promise<BalanceInfo> {
        try {
            // Get local wallet balance
            const localBalance = await this.walletRepository.getBalance(churchId, channel);

            // Get Termii balance and pricing
            let termiiInfo = null;
            try {
                const termii = getTermii();
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

                logger.info(`Termii balance: ${termiiBalanceAmount} ${termiiInfo.currency}, can send ${smsUnitsAvailable} SMS @ ${pricePerSms}/SMS`);
            } catch (error) {
                logger.warn('Could not fetch Termii balance:', error);
            }

            // Calculate total available units
            const termiiUnits = termiiInfo?.smsUnitsAvailable || 0;
            const totalUnits = localBalance + termiiUnits;

            // Determine source
            let source: 'local' | 'termii' | 'combined' | 'none' = 'none';
            if (localBalance > 0 && termiiUnits > 0) {
                source = 'combined';
            } else if (localBalance > 0) {
                source = 'local';
            } else if (termiiUnits > 0) {
                source = 'termii';
            }

            return {
                local: localBalance,
                termii: termiiInfo,
                total: totalUnits,
                canSend: totalUnits > 0,
                source,
            };
        } catch (error) {
            logger.error('Error getting comprehensive balance:', error);
            throw error;
        }
    }

    /**
     * Check if there's sufficient balance from any source
     */
    async checkSufficientBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        unitsRequired: number
    ): Promise<{ sufficient: boolean; balanceInfo: BalanceInfo; useTermii: boolean }> {
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
    async getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number> {
        return this.walletRepository.getBalance(churchId, channel);
    }

    /**
     * Get full wallet info
     */
    async getWallet(churchId: string): Promise<Wallet> {
        return this.walletRepository.getWallet(churchId);
    }

    // ============================================================================
    // CREDIT & DEBIT OPERATIONS
    // ============================================================================

    async creditBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice' | 'all',
        units: number,
        details: {
            amount?: number;
            reference?: string;
            description?: string;
            paymentMethod?: string;
            paymentReference?: string;
            type?: 'credit' | 'bonus';
        },
        createdBy?: string
    ): Promise<Wallet> {
        return this.walletRepository.creditBalance(churchId, channel, units, details, createdBy);
    }

    async debitBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        units: number,
        details: {
            reference?: string;
            description?: string;
        },
        createdBy?: string
    ): Promise<Wallet> {
        return this.walletRepository.debitBalance(churchId, channel, units, details, createdBy);
    }

    async refundTransaction(
        transactionId: string,
        refundAmount: number,
        reason: string,
        createdBy?: string
    ): Promise<WalletTransaction> {
        return this.walletRepository.refundTransaction(transactionId, refundAmount, reason, createdBy);
    }

    // ============================================================================
    // TRANSACTIONS
    // ============================================================================

    async getTransactions(
        churchId: string,
        filters: {
            channel?: string;
            type?: string;
            status?: string;
            search?: string;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<{ data: WalletTransaction[]; total: number }> {
        return this.walletRepository.getTransactions(churchId, filters);
    }

    async getAnalytics(churchId: string, startDate: string, endDate: string) {
        return this.walletRepository.getAnalytics(churchId, startDate, endDate);
    }

    // ============================================================================
    // PRICING
    // ============================================================================

    async getAllPricing(): Promise<MessagingPricing[]> {
        return this.walletRepository.getAllPricing();
    }

    async getPricing(channel: string, countryCode: string = 'NG'): Promise<MessagingPricing | null> {
        return this.walletRepository.getPricing(channel, countryCode);
    }

    async updatePricing(
        id: string,
        data: { costPerUnit?: number; sellPrice?: number; isActive?: boolean }
    ): Promise<MessagingPricing | null> {
        return this.walletRepository.updatePricing(id, data);
    }

    async createPricing(data: {
        channel: string;
        countryCode: string;
        countryName: string;
        costPerUnit: number;
        sellPrice: number;
        currency?: string;
    }): Promise<MessagingPricing> {
        return this.walletRepository.createPricing(data);
    }

    // ============================================================================
    // PACKAGES
    // ============================================================================

    async getAllPackages(channel?: string): Promise<UnitPackage[]> {
        return this.walletRepository.getAllPackages(channel);
    }

    async getPackageById(id: string): Promise<UnitPackage | null> {
        return this.walletRepository.getPackageById(id);
    }

    async createPackage(data: {
        name: string;
        channel: string;
        units: number;
        price: number;
        bonusUnits?: number;
        discountPercent?: number;
        isPopular?: boolean;
        sortOrder?: number;
        description?: string;
    }): Promise<UnitPackage> {
        return this.walletRepository.createPackage(data);
    }

    async updatePackage(id: string, data: Partial<UnitPackage>): Promise<UnitPackage | null> {
        return this.walletRepository.updatePackage(id, data);
    }

    async deletePackage(id: string): Promise<boolean> {
        return this.walletRepository.deletePackage(id);
    }

    // ============================================================================
    // PURCHASE UNITS
    // ============================================================================

    async purchaseUnits(
        churchId: string,
        packageId: string,
        paymentDetails: {
            paymentMethod: string;
            paymentReference: string;
            amount: number;
        },
        createdBy?: string
    ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
        const pkg = await this.walletRepository.getPackageById(packageId);
        if (!pkg) {
            throw new AppError('Package not found', 404);
        }

        if (!pkg.is_active) {
            throw new AppError('Package is no longer available', 400);
        }

        const totalUnits = pkg.units + (pkg.bonus_units || 0);
        const channel = pkg.channel as 'sms' | 'email' | 'whatsapp' | 'voice' | 'all';

        const wallet = await this.creditBalance(
            churchId,
            channel === 'combo' ? 'all' : channel,
            totalUnits,
            {
                amount: paymentDetails.amount,
                reference: `PKG-${pkg.id}-${Date.now()}`,
                description: `Purchased ${pkg.name}: ${pkg.units} units + ${pkg.bonus_units || 0} bonus`,
                paymentMethod: paymentDetails.paymentMethod,
                paymentReference: paymentDetails.paymentReference,
                type: 'credit',
            },
            createdBy
        );

        // Get the latest transaction
        const { data: transactions } = await this.walletRepository.getTransactions(churchId, { limit: 1 });

        return { wallet, transaction: transactions[0] };
    }
}