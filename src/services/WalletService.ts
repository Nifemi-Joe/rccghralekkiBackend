// src/services/WalletService.ts
import { WalletRepository, Wallet, WalletTransaction, MessagingPricing, UnitPackage } from '@repositories/WalletRepository';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import { getTermii } from '@config/termii';

export interface PurchaseUnitsDTO {
    packageId?: string;
    channel: 'sms' | 'email' | 'whatsapp' | 'voice';
    units?: number;
    paymentMethod: string;
    paymentReference: string;
    amount: number;
}

export class WalletService {
    private walletRepository: WalletRepository;

    constructor() {
        this.walletRepository = new WalletRepository();
    }

    // ============================================================================
    // WALLET
    // ============================================================================

    async getWallet(churchId: string): Promise<Wallet> {
        return this.walletRepository.getWallet(churchId);
    }

    async getBalance(churchId: string, channel: 'sms' | 'email' | 'whatsapp' | 'voice'): Promise<number> {
        return this.walletRepository.getBalance(churchId, channel);
    }

    async getAllBalances(churchId: string): Promise<{
        sms: number;
        email: number;
        whatsapp: number;
        voice: number;
        termii?: {
            balance: number;
            currency: string;
        };
    }> {
        const wallet = await this.getWallet(churchId);

        // Get Termii balance
        let termiiBalance;
        try {
            const termii = getTermii();
            const balance = await termii.getBalance();
            termiiBalance = {
                balance: balance.balance || 0,
                currency: balance.currency || 'NGN',
            };
        } catch (error) {
            logger.error('Error getting Termii balance:', error);
        }

        return {
            sms: wallet.sms_balance,
            email: wallet.email_balance,
            whatsapp: wallet.whatsapp_balance,
            voice: wallet.voice_balance,
            termii: termiiBalance,
        };
    }

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

    async checkSufficientBalance(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        requiredUnits: number
    ): Promise<boolean> {
        const balance = await this.getBalance(churchId, channel);
        return balance >= requiredUnits;
    }

    async getTransactions(churchId: string, filters?: {
        channel?: string;
        type?: string;
        status?: string;
        search?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        return this.walletRepository.getTransactions(churchId, filters || {});
    }

    async getAnalytics(churchId: string, startDate: string, endDate: string) {
        return this.walletRepository.getAnalytics(churchId, startDate, endDate);
    }

    async refundTransaction(
        transactionId: string,
        refundAmount: number,
        reason: string,
        createdBy?: string
    ): Promise<WalletTransaction> {
        return this.walletRepository.refundTransaction(transactionId, refundAmount, reason, createdBy);
    }

    // Pricing methods
    async getAllPricing(): Promise<MessagingPricing[]> {
        return this.walletRepository.getAllPricing();
    }

    async getPricing(channel: string, countryCode: string = 'NG'): Promise<MessagingPricing> {
        const pricing = await this.walletRepository.getPricing(channel, countryCode);
        if (!pricing) {
            throw new AppError(`Pricing not found for ${channel} in ${countryCode}`, 404);
        }
        return pricing;
    }

    async updatePricing(pricingId: string, data: {
        costPerUnit?: number;
        sellPrice?: number;
        isActive?: boolean;
    }): Promise<MessagingPricing> {
        const updated = await this.walletRepository.updatePricing(pricingId, data);
        if (!updated) {
            throw new AppError('Failed to update pricing', 500);
        }
        return updated;
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

    // Package methods
    async getAllPackages(channel?: string): Promise<UnitPackage[]> {
        return this.walletRepository.getAllPackages(channel);
    }

    async getPackageById(id: string): Promise<UnitPackage> {
        const pkg = await this.walletRepository.getPackageById(id);
        if (!pkg) {
            throw new AppError('Package not found', 404);
        }
        return pkg;
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

    async updatePackage(id: string, data: Partial<UnitPackage>): Promise<UnitPackage> {
        const updated = await this.walletRepository.updatePackage(id, data);
        if (!updated) {
            throw new AppError('Failed to update package', 500);
        }
        return updated;
    }

    async deletePackage(id: string): Promise<void> {
        const deleted = await this.walletRepository.deletePackage(id);
        if (!deleted) {
            throw new AppError('Package not found', 404);
        }
    }

    async purchaseUnits(churchId: string, data: PurchaseUnitsDTO, userId?: string): Promise<Wallet> {
        try {
            let units = data.units || 0;
            let bonusUnits = 0;

            // If package ID provided, get package details
            if (data.packageId) {
                const pkg = await this.walletRepository.getPackageById(data.packageId);
                if (!pkg) {
                    throw new AppError('Package not found', 404);
                }
                if (!pkg.is_active) {
                    throw new AppError('Package is no longer available', 400);
                }
                units = pkg.units;
                bonusUnits = pkg.bonus_units;
            }

            const totalUnits = units + bonusUnits;

            // Credit the wallet
            const wallet = await this.walletRepository.creditBalance(
                churchId,
                data.channel,
                units,
                {
                    amount: data.amount,
                    reference: data.paymentReference,
                    description: `Purchased ${units} ${data.channel.toUpperCase()} units`,
                    paymentMethod: data.paymentMethod,
                    paymentReference: data.paymentReference,
                    type: 'credit',
                    status: 'completed',
                },
                userId
            );

            // If there are bonus units, add them separately
            if (bonusUnits > 0) {
                await this.walletRepository.creditBalance(
                    churchId,
                    data.channel,
                    bonusUnits,
                    {
                        reference: `BONUS-${data.paymentReference}`,
                        description: `Bonus units for purchase ${data.paymentReference}`,
                        type: 'bonus',
                        status: 'completed',
                    },
                    userId
                );
            }

            logger.info(`Purchased ${totalUnits} ${data.channel} units for church ${churchId}`);
            return wallet;
        } catch (error) {
            logger.error('Error purchasing units:', error);
            throw error;
        }
    }

    async deductUnits(
        churchId: string,
        channel: 'sms' | 'email' | 'whatsapp' | 'voice',
        units: number,
        reference: string,
        description: string,
        userId?: string
    ): Promise<Wallet> {
        const balance = await this.getBalance(churchId, channel);
        if (balance < units) {
            throw new AppError(`Insufficient ${channel} balance. Required: ${units}, Available: ${balance}`, 400);
        }

        return this.walletRepository.debitBalance(
            churchId,
            channel,
            units,
            { reference, description },
            userId
        );
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

    async getUsageAnalytics(churchId: string, startDate: string, endDate: string) {
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