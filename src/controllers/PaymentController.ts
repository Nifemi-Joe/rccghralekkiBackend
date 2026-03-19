// src/controllers/PaymentController.ts
import { Request, Response } from 'express';
import { PaymentService } from '@services/PaymentService';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@utils/AppError';
import { getPaystack } from '@config/paystack';

export class PaymentController {
    private paymentService: PaymentService;

    constructor() {
        this.paymentService = new PaymentService();
    }

    getPaystackPublicKey = catchAsync(async (req: Request, res: Response) => {
        const paystack = getPaystack();

        res.status(200).json({
            success: true,
            data: {
                publicKey: paystack.publicKey,
            },
        });
    });

    initiatePurchase = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const userId = req.user!.id;
        const {
            channel,
            packageId,
            units,
            email,
            callbackUrl,
        } = req.body;

        if (!channel) {
            throw new AppError('Channel is required', 400);
        }

        if (!packageId && !units) {
            throw new AppError('Either packageId or units must be provided', 400);
        }

        if (!email) {
            throw new AppError('Email is required', 400);
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

    verifyPayment = catchAsync(async (req: Request, res: Response) => {
        const { reference } = req.params;

        if (!reference) {
            throw new AppError('Reference is required', 400);
        }

        const result = await this.paymentService.verifyPayment(reference);

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: result,
        });
    });

    handleWebhook = catchAsync(async (req: Request, res: Response) => {
        const signature = req.headers['x-paystack-signature'] as string;

        if (!signature) {
            throw new AppError('Missing signature', 400);
        }

        await this.paymentService.handleWebhook(req.body, signature);

        res.status(200).json({
            success: true,
        });
    });

    getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { status, startDate, endDate, page, limit } = req.query;

        const result = await this.paymentService.getPaymentHistory(churchId, {
            status: status as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
        });

        res.status(200).json({
            success: true,
            data: result.data,
            pagination: {
                total: result.total,
                page: parseInt(page as string) || 1,
                limit: parseInt(limit as string) || 20,
            },
        });
    });
}