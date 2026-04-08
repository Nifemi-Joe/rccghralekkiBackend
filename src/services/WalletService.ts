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

export class WalletService {
    private walletRepository: WalletRepository;

    constructor() {
        this.walletRepository = new WalletRepository();
    }

    // ============================================================================
    // ENHANCED BALANCE CHECKING
    // ============================================================================

    async getComprehensiveBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice' = 'sms'
    ): Promise<BalanceInfo> {
        try {
            const localBalance = await this.walletRepository.getBalance(churchId, channel);

            let termiiInfo = null;
            try {
                const termii = getTermii();
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

                logger.info(
                    `Termii balance: ${termiiBalanceAmount} ${termiiInfo.currency}, ` +
                    `can send ${smsUnitsAvailable} SMS @ ${pricePerSms}/SMS`
                );
            } catch (error) {
                logger.warn('Could not fetch Termii balance:', error);
            }

            const termiiUnits = termiiInfo?.smsUnitsAvailable || 0;
            const totalUnits = localBalance + termiiUnits;

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

    async checkSufficientBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        unitsRequired: number
    ): Promise<{ sufficient: boolean; balanceInfo: BalanceInfo; useTermii: boolean }> {
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

    async getBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice'
    ): Promise<number> {
        return this.walletRepository.getBalance(churchId, channel);
    }

    async getAllBalances(churchId: string): Promise<AllBalances> {
        try {
            const wallet = await this.walletRepository.getWallet(churchId);

            let termiiInfo: AllBalances['termii'] = null;
            try {
                const termii = getTermii();
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
            } catch (error) {
                logger.warn('Could not fetch Termii balance for getAllBalances:', error);
            }

            return {
                sms: wallet.sms_balance ?? 0,
                email: wallet.email_balance ?? 0,
                whatsapp: wallet.whatsapp_balance ?? 0,
                voice: wallet.voice_balance ?? 0,
                currency: wallet.currency ?? 'NGN',
                termii: termiiInfo,
            };
        } catch (error) {
            logger.error('Error getting all balances:', error);
            throw error;
        }
    }

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
            status?: string;
        },
        createdBy?: string
    ): Promise<Wallet> {
        return this.walletRepository.creditBalance(
            churchId,
            channel,
            units,
            details,
            createdBy
        );
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
        return this.walletRepository.debitBalance(
            churchId,
            channel,
            units,
            details,
            createdBy
        );
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
    async deductUnits(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        units: number,
        reference: string,
        description: string,
        createdBy?: string
    ): Promise<Wallet> {
        return this.debitBalance(
            churchId,
            channel,
            units,
            { reference, description },
            createdBy
        );
    }

    async refundTransaction(
        transactionId: string,
        refundAmount: number,
        reason: string,
        createdBy?: string
    ): Promise<WalletTransaction> {
        return this.walletRepository.refundTransaction(
            transactionId,
            refundAmount,
            reason,
            createdBy
        );
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

    async exportTransactions(
        churchId: string,
        filters: {
            channel?: string;
            type?: string;
            status?: string;
            startDate?: string;
            endDate?: string;
        }
    ): Promise<string> {
        try {
            logger.info(`Exporting transactions for church ${churchId}`, { filters });

            const { data } = await this.walletRepository.getTransactions(churchId, {
                ...filters,
                page: 1,
                limit: 100_000,
            });

            const headers = [
                'ID', 'Type', 'Channel', 'Units', 'Amount',
                'Balance Before', 'Balance After', 'Reference', 'Description',
                'Payment Method', 'Payment Reference', 'Status', 'Created At',
            ];

            const escapeCell = (value: any): string => {
                if (value === null || value === undefined) return '';
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
        } catch (error: any) {
            logger.error('Error exporting transactions:', error);
            throw new AppError(
                error.message || 'Failed to export transactions',
                error.statusCode || 500
            );
        }
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

    async getPricing(
        channel: string,
        countryCode: string = 'NG'
    ): Promise<MessagingPricing | null> {
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
            channel === 'all' ? 'all' : channel,
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

        const { data: transactions } = await this.walletRepository.getTransactions(
            churchId,
            { limit: 1 }
        );

        return { wallet, transaction: transactions[0] };
    }
}