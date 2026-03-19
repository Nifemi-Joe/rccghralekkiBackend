// src/controllers/WalletController.ts
import { Request, Response, NextFunction } from 'express';
import { WalletService } from '@services/WalletService';
import { PricingService } from '@services/PricingService';
import { catchAsync } from '@utils/catchAsync';
import { AppError } from '@utils/AppError';

export class WalletController {
    private walletService: WalletService;
    private pricingService: PricingService;

    constructor() {
        this.walletService = new WalletService();
        this.pricingService = new PricingService();
    }

    // Create new pricing entry (super_admin only)
    createPricing = catchAsync(async (req: Request, res: Response) => {
        const { channel, countryCode, countryName, costPerUnit, sellPrice, currency } = req.body;

        const pricing = await this.walletService.createPricing({
            channel,
            countryCode,
            countryName,
            costPerUnit,
            sellPrice,
            currency,
        });

        res.status(201).json({
            success: true,
            message: 'Pricing created successfully',
            data: pricing,
        });
    });

    getWallet = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const wallet = await this.walletService.getWallet(churchId);

        res.status(200).json({
            success: true,
            data: wallet,
        });
    });

    // Add this method to src/controllers/WalletController.ts

    exportTransactions = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { channel, type, status, startDate, endDate } = req.query;

        const csv = await this.walletService.exportTransactions(churchId, {
            channel: channel as string,
            type: type as string,
            status: status as string,
            startDate: startDate as string,
            endDate: endDate as string,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csv);
    });

    getAllBalances = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const balances = await this.walletService.getAllBalances(churchId);

        res.status(200).json({
            success: true,
            data: balances,
        });
    });

    getBalance = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { channel } = req.params;

        if (!['sms', 'email', 'whatsapp', 'voice'].includes(channel)) {
            throw new AppError('Invalid channel', 400);
        }

        const balance = await this.walletService.getBalance(churchId, channel as any);

        res.status(200).json({
            success: true,
            data: {
                channel,
                balance,
            },
        });
    });

    getTransactions = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const {
            channel,
            type,
            status,
            search,
            startDate,
            endDate,
            page,
            limit,
        } = req.query;

        const result = await this.walletService.getTransactions(churchId, {
            channel: channel as string,
            type: type as string,
            status: status as string,
            search: search as string,
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
                totalPages: Math.ceil(result.total / (parseInt(limit as string) || 20)),
            },
        });
    });

    getAnalytics = catchAsync(async (req: Request, res: Response) => {
        const churchId = req.user!.churchId;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            throw new AppError('Start date and end date are required', 400);
        }

        const analytics = await this.walletService.getAnalytics(
            churchId,
            startDate as string,
            endDate as string
        );

        res.status(200).json({
            success: true,
            data: analytics,
        });
    });

    refundTransaction = catchAsync(async (req: Request, res: Response) => {
        const { transactionId } = req.params;
        const { refundAmount, reason } = req.body;
        const userId = req.user!.id;

        const refund = await this.walletService.refundTransaction(
            transactionId,
            refundAmount,
            reason,
            userId
        );

        res.status(200).json({
            success: true,
            message: 'Transaction refunded successfully',
            data: refund,
        });
    });

    // Pricing endpoints
    getAllPricing = catchAsync(async (req: Request, res: Response) => {
        const pricing = await this.pricingService.getAllPricing();

        res.status(200).json({
            success: true,
            data: pricing,
        });
    });

    getPricingByChannel = catchAsync(async (req: Request, res: Response) => {
        const { channel } = req.params;
        const { countryCode } = req.query;

        const pricing = await this.pricingService.getPricingByChannel(
            channel,
            countryCode as string
        );

        res.status(200).json({
            success: true,
            data: pricing,
        });
    });

    updatePricing = catchAsync(async (req: Request, res: Response) => {
        const { pricingId } = req.params;
        const { costPerUnit, sellPrice, marginPercent } = req.body;

        const updated = await this.pricingService.updatePricing(pricingId, {
            costPerUnit,
            sellPrice,
            marginPercent,
        });

        res.status(200).json({
            success: true,
            message: 'Pricing updated successfully',
            data: updated,
        });
    });

    calculateCost = catchAsync(async (req: Request, res: Response) => {
        const { channel, units, countryCode } = req.query;

        if (!channel || !units) {
            throw new AppError('Channel and units are required', 400);
        }

        const cost = await this.pricingService.calculateCost(
            channel as any,
            parseInt(units as string),
            countryCode as string
        );

        res.status(200).json({
            success: true,
            data: cost,
        });
    });

    // Package endpoints
    getAllPackages = catchAsync(async (req: Request, res: Response) => {
        const { channel } = req.query;

        const packages = await this.walletService.getAllPackages(channel as string);

        res.status(200).json({
            success: true,
            data: packages,
        });
    });

    getPackageById = catchAsync(async (req: Request, res: Response) => {
        const { packageId } = req.params;

        const pkg = await this.walletService.getPackageById(packageId);

        res.status(200).json({
            success: true,
            data: pkg,
        });
    });

    createPackage = catchAsync(async (req: Request, res: Response) => {
        const {
            name,
            channel,
            units,
            price,
            bonusUnits,
            discountPercent,
            isPopular,
            sortOrder,
            description,
        } = req.body;

        const pkg = await this.walletService.createPackage({
            name,
            channel,
            units,
            price,
            bonusUnits,
            discountPercent,
            isPopular,
            sortOrder,
            description,
        });

        res.status(201).json({
            success: true,
            message: 'Package created successfully',
            data: pkg,
        });
    });

    updatePackage = catchAsync(async (req: Request, res: Response) => {
        const { packageId } = req.params;
        const updateData = req.body;

        const updated = await this.walletService.updatePackage(packageId, updateData);

        res.status(200).json({
            success: true,
            message: 'Package updated successfully',
            data: updated,
        });
    });

    deletePackage = catchAsync(async (req: Request, res: Response) => {
        const { packageId } = req.params;

        await this.walletService.deletePackage(packageId);

        res.status(200).json({
            success: true,
            message: 'Package deleted successfully',
        });
    });
}