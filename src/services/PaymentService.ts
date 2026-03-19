// src/services/PaymentService.ts
import { getPaystack } from '@config/paystack';
import { getTermii } from '@config/termii';
import { WalletService } from '@services/WalletService';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import crypto from 'crypto';

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

export class PaymentService {
    private walletService: WalletService;

    constructor() {
        this.walletService = new WalletService();
    }

    async initiatePurchase(data: PurchaseRequest): Promise<PurchaseResponse> {
        try {
            const paystack = getPaystack();

            // Get package or calculate from units
            let units: number;
            let amount: number; // in NGN
            let bonusUnits = 0;

            if (data.packageId) {
                const pkg = await this.walletService.getPackageById(data.packageId);
                if (!pkg) {
                    throw new AppError('Package not found', 404);
                }
                units = pkg.units;
                amount = pkg.price;
                bonusUnits = pkg.bonus_units || 0;
            } else if (data.units) {
                // Calculate price based on units
                const pricing = await this.walletService.getPricing(data.channel === 'combo' ? 'sms' : data.channel);
                units = data.units;
                amount = data.units * pricing.sell_price;
            } else {
                throw new AppError('Either packageId or units must be provided', 400);
            }

            // Generate reference
            const reference = this.generateReference();

            // Split calculation (40% platform, 60% to Termii)
            const platformAmount = Math.floor(amount * 0.4);
            const termiiAmount = amount - platformAmount;

            // Initialize Paystack transaction
            const transaction = await paystack.initializeTransaction({
                email: data.email,
                amount: amount * 100, // Convert to kobo
                reference,
                callback_url: data.callbackUrl,
                metadata: {
                    churchId: data.churchId,
                    channel: data.channel,
                    units,
                    bonusUnits,
                    platformAmount,
                    termiiAmount,
                    userId: data.userId,
                    type: 'unit_purchase',
                },
            });

            if (!transaction.status) {
                throw new AppError('Failed to initialize payment', 500);
            }

            logger.info(`Payment initialized: ${reference} for church ${data.churchId}`);

            return {
                reference,
                authorizationUrl: transaction.data.authorization_url,
                accessCode: transaction.data.access_code,
                amount,
                units: units + bonusUnits,
            };
        } catch (error) {
            logger.error('Error initiating purchase:', error);
            throw error;
        }
    }

    async verifyPayment(reference: string): Promise<{
        success: boolean;
        churchId: string;
        channel: string;
        units: number;
        amount: number;
    }> {
        try {
            const paystack = getPaystack();

            // Verify transaction
            const verification = await paystack.verifyTransaction(reference);

            if (!verification.status) {
                throw new AppError('Payment verification failed', 400);
            }

            const { data } = verification;

            if (data.status !== 'success') {
                throw new AppError(`Payment ${data.status}`, 400);
            }

            const metadata = data.metadata;
            const churchId = metadata.churchId;
            const channel = metadata.channel;
            const units = metadata.units + (metadata.bonusUnits || 0);
            const amount = data.amount / 100; // Convert from kobo

            // Credit wallet
            await this.walletService.creditBalance(
                churchId,
                channel,
                units,
                {
                    amount,
                    reference,
                    description: `Purchased ${units} ${channel} units`,
                    paymentMethod: 'paystack',
                    paymentReference: reference,
                    status: 'completed',
                },
                metadata.userId
            );

            // Fund Termii wallet with the allocated amount
            const termiiAmount = metadata.termiiAmount;
            if (termiiAmount > 0) {
                await this.fundTermiiWallet(termiiAmount, reference);
            }

            logger.info(`Payment verified and wallet credited: ${reference}`);

            return {
                success: true,
                churchId,
                channel,
                units,
                amount,
            };
        } catch (error) {
            logger.error('Error verifying payment:', error);
            throw error;
        }
    }

    async handleWebhook(payload: any, signature: string): Promise<void> {
        try {
            // Verify webhook signature
            const hash = crypto
                .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
                .update(JSON.stringify(payload))
                .digest('hex');

            if (hash !== signature) {
                throw new AppError('Invalid webhook signature', 401);
            }

            const event = payload.event;
            const data = payload.data;

            logger.info(`Webhook received: ${event}`);

            switch (event) {
                case 'charge.success':
                    await this.verifyPayment(data.reference);
                    break;

                case 'transfer.success':
                    logger.info(`Transfer successful: ${data.reference}`);
                    break;

                case 'transfer.failed':
                    logger.error(`Transfer failed: ${data.reference}`);
                    break;

                default:
                    logger.info(`Unhandled webhook event: ${event}`);
            }
        } catch (error) {
            logger.error('Error handling webhook:', error);
            throw error;
        }
    }

    private async fundTermiiWallet(amount: number, reference: string): Promise<void> {
        try {
            // Note: Termii doesn't have a direct wallet funding API
            // This would typically be done manually or through their dashboard
            // Log the transaction for manual processing
            logger.info(`Termii wallet funding required: NGN ${amount} - Reference: ${reference}`);

            // You might want to store this in a separate table for tracking
            // and manual reconciliation with Termii
        } catch (error) {
            logger.error('Error funding Termii wallet:', error);
            // Don't throw error as the main transaction succeeded
        }
    }

    private generateReference(): string {
        return `CHMS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    async getPaymentHistory(churchId: string, filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        return this.walletService.getTransactions(churchId, {
            type: 'credit',
            ...filters,
        });
    }
}