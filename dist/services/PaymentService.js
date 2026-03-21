"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
// src/services/PaymentService.ts
const paystack_1 = require("@config/paystack");
const WalletService_1 = require("@services/WalletService");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const crypto_1 = __importDefault(require("crypto"));
class PaymentService {
    constructor() {
        this.walletService = new WalletService_1.WalletService();
    }
    async initiatePurchase(data) {
        try {
            const paystack = (0, paystack_1.getPaystack)();
            // Get package or calculate from units
            let units;
            let amount; // in NGN
            let bonusUnits = 0;
            if (data.packageId) {
                const pkg = await this.walletService.getPackageById(data.packageId);
                if (!pkg) {
                    throw new AppError_1.AppError('Package not found', 404);
                }
                units = pkg.units;
                amount = pkg.price;
                bonusUnits = pkg.bonus_units || 0;
            }
            else if (data.units) {
                // Calculate price based on units
                const pricing = await this.walletService.getPricing(data.channel === 'combo' ? 'sms' : data.channel);
                units = data.units;
                amount = data.units * pricing.sell_price;
            }
            else {
                throw new AppError_1.AppError('Either packageId or units must be provided', 400);
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
                throw new AppError_1.AppError('Failed to initialize payment', 500);
            }
            logger_1.default.info(`Payment initialized: ${reference} for church ${data.churchId}`);
            return {
                reference,
                authorizationUrl: transaction.data.authorization_url,
                accessCode: transaction.data.access_code,
                amount,
                units: units + bonusUnits,
            };
        }
        catch (error) {
            logger_1.default.error('Error initiating purchase:', error);
            throw error;
        }
    }
    async verifyPayment(reference) {
        try {
            const paystack = (0, paystack_1.getPaystack)();
            // Verify transaction
            const verification = await paystack.verifyTransaction(reference);
            if (!verification.status) {
                throw new AppError_1.AppError('Payment verification failed', 400);
            }
            const { data } = verification;
            if (data.status !== 'success') {
                throw new AppError_1.AppError(`Payment ${data.status}`, 400);
            }
            const metadata = data.metadata;
            const churchId = metadata.churchId;
            const channel = metadata.channel;
            const units = metadata.units + (metadata.bonusUnits || 0);
            const amount = data.amount / 100; // Convert from kobo
            // Credit wallet
            await this.walletService.creditBalance(churchId, channel, units, {
                amount,
                reference,
                description: `Purchased ${units} ${channel} units`,
                paymentMethod: 'paystack',
                paymentReference: reference,
                status: 'completed',
            }, metadata.userId);
            // Fund Termii wallet with the allocated amount
            const termiiAmount = metadata.termiiAmount;
            if (termiiAmount > 0) {
                await this.fundTermiiWallet(termiiAmount, reference);
            }
            logger_1.default.info(`Payment verified and wallet credited: ${reference}`);
            return {
                success: true,
                churchId,
                channel,
                units,
                amount,
            };
        }
        catch (error) {
            logger_1.default.error('Error verifying payment:', error);
            throw error;
        }
    }
    async handleWebhook(payload, signature) {
        try {
            // Verify webhook signature
            const hash = crypto_1.default
                .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
                .update(JSON.stringify(payload))
                .digest('hex');
            if (hash !== signature) {
                throw new AppError_1.AppError('Invalid webhook signature', 401);
            }
            const event = payload.event;
            const data = payload.data;
            logger_1.default.info(`Webhook received: ${event}`);
            switch (event) {
                case 'charge.success':
                    await this.verifyPayment(data.reference);
                    break;
                case 'transfer.success':
                    logger_1.default.info(`Transfer successful: ${data.reference}`);
                    break;
                case 'transfer.failed':
                    logger_1.default.error(`Transfer failed: ${data.reference}`);
                    break;
                default:
                    logger_1.default.info(`Unhandled webhook event: ${event}`);
            }
        }
        catch (error) {
            logger_1.default.error('Error handling webhook:', error);
            throw error;
        }
    }
    async fundTermiiWallet(amount, reference) {
        try {
            // Note: Termii doesn't have a direct wallet funding API
            // This would typically be done manually or through their dashboard
            // Log the transaction for manual processing
            logger_1.default.info(`Termii wallet funding required: NGN ${amount} - Reference: ${reference}`);
            // You might want to store this in a separate table for tracking
            // and manual reconciliation with Termii
        }
        catch (error) {
            logger_1.default.error('Error funding Termii wallet:', error);
            // Don't throw error as the main transaction succeeded
        }
    }
    generateReference() {
        return `CHMS-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    async getPaymentHistory(churchId, filters) {
        return this.walletService.getTransactions(churchId, {
            type: 'credit',
            ...filters,
        });
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=PaymentService.js.map