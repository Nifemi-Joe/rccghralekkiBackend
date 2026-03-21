"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const PaymentService_1 = require("@services/PaymentService");
const catchAsync_1 = require("@utils/catchAsync");
const AppError_1 = require("@utils/AppError");
const paystack_1 = require("@config/paystack");
class PaymentController {
    constructor() {
        this.getPaystackPublicKey = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const paystack = (0, paystack_1.getPaystack)();
            res.status(200).json({
                success: true,
                data: {
                    publicKey: paystack.publicKey,
                },
            });
        });
        this.initiatePurchase = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const userId = req.user.id;
            const { channel, packageId, units, email, callbackUrl, } = req.body;
            if (!channel) {
                throw new AppError_1.AppError('Channel is required', 400);
            }
            if (!packageId && !units) {
                throw new AppError_1.AppError('Either packageId or units must be provided', 400);
            }
            if (!email) {
                throw new AppError_1.AppError('Email is required', 400);
            }
            const result = await this.paymentService.initiatePurchase({
                churchId,
                channel,
                packageId,
                units,
                email,
                userId,
                callbackUrl,
            });
            res.status(200).json({
                success: true,
                message: 'Payment initialized successfully',
                data: result,
            });
        });
        this.verifyPayment = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { reference } = req.params;
            if (!reference) {
                throw new AppError_1.AppError('Reference is required', 400);
            }
            const result = await this.paymentService.verifyPayment(reference);
            res.status(200).json({
                success: true,
                message: 'Payment verified successfully',
                data: result,
            });
        });
        this.handleWebhook = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const signature = req.headers['x-paystack-signature'];
            if (!signature) {
                throw new AppError_1.AppError('Missing signature', 400);
            }
            await this.paymentService.handleWebhook(req.body, signature);
            res.status(200).json({
                success: true,
            });
        });
        this.getPaymentHistory = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { status, startDate, endDate, page, limit } = req.query;
            const result = await this.paymentService.getPaymentHistory(churchId, {
                status: status,
                startDate: startDate,
                endDate: endDate,
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
            });
            res.status(200).json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: parseInt(page) || 1,
                    limit: parseInt(limit) || 20,
                },
            });
        });
        this.paymentService = new PaymentService_1.PaymentService();
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=PaymentController.js.map