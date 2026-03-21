"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const WalletService_1 = require("@services/WalletService");
const PricingService_1 = require("@services/PricingService");
const catchAsync_1 = require("@utils/catchAsync");
const AppError_1 = require("@utils/AppError");
class WalletController {
    constructor() {
        // Create new pricing entry (super_admin only)
        this.createPricing = (0, catchAsync_1.catchAsync)(async (req, res) => {
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
        this.getWallet = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const wallet = await this.walletService.getWallet(churchId);
            res.status(200).json({
                success: true,
                data: wallet,
            });
        });
        // Add this method to src/controllers/WalletController.ts
        this.exportTransactions = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { channel, type, status, startDate, endDate } = req.query;
            const csv = await this.walletService.exportTransactions(churchId, {
                channel: channel,
                type: type,
                status: status,
                startDate: startDate,
                endDate: endDate,
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`);
            res.status(200).send(csv);
        });
        this.getAllBalances = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const balances = await this.walletService.getAllBalances(churchId);
            res.status(200).json({
                success: true,
                data: balances,
            });
        });
        this.getBalance = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { channel } = req.params;
            if (!['sms', 'email', 'whatsapp', 'voice'].includes(channel)) {
                throw new AppError_1.AppError('Invalid channel', 400);
            }
            const balance = await this.walletService.getBalance(churchId, channel);
            res.status(200).json({
                success: true,
                data: {
                    channel,
                    balance,
                },
            });
        });
        this.getTransactions = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { channel, type, status, search, startDate, endDate, page, limit, } = req.query;
            const result = await this.walletService.getTransactions(churchId, {
                channel: channel,
                type: type,
                status: status,
                search: search,
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
                    totalPages: Math.ceil(result.total / (parseInt(limit) || 20)),
                },
            });
        });
        this.getAnalytics = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const churchId = req.user.churchId;
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                throw new AppError_1.AppError('Start date and end date are required', 400);
            }
            const analytics = await this.walletService.getAnalytics(churchId, startDate, endDate);
            res.status(200).json({
                success: true,
                data: analytics,
            });
        });
        this.refundTransaction = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { transactionId } = req.params;
            const { refundAmount, reason } = req.body;
            const userId = req.user.id;
            const refund = await this.walletService.refundTransaction(transactionId, refundAmount, reason, userId);
            res.status(200).json({
                success: true,
                message: 'Transaction refunded successfully',
                data: refund,
            });
        });
        // Pricing endpoints
        this.getAllPricing = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const pricing = await this.pricingService.getAllPricing();
            res.status(200).json({
                success: true,
                data: pricing,
            });
        });
        this.getPricingByChannel = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { channel } = req.params;
            const { countryCode } = req.query;
            const pricing = await this.pricingService.getPricingByChannel(channel, countryCode);
            res.status(200).json({
                success: true,
                data: pricing,
            });
        });
        this.updatePricing = (0, catchAsync_1.catchAsync)(async (req, res) => {
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
        this.calculateCost = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { channel, units, countryCode } = req.query;
            if (!channel || !units) {
                throw new AppError_1.AppError('Channel and units are required', 400);
            }
            const cost = await this.pricingService.calculateCost(channel, parseInt(units), countryCode);
            res.status(200).json({
                success: true,
                data: cost,
            });
        });
        // Package endpoints
        this.getAllPackages = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { channel } = req.query;
            const packages = await this.walletService.getAllPackages(channel);
            res.status(200).json({
                success: true,
                data: packages,
            });
        });
        this.getPackageById = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { packageId } = req.params;
            const pkg = await this.walletService.getPackageById(packageId);
            res.status(200).json({
                success: true,
                data: pkg,
            });
        });
        this.createPackage = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { name, channel, units, price, bonusUnits, discountPercent, isPopular, sortOrder, description, } = req.body;
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
        this.updatePackage = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { packageId } = req.params;
            const updateData = req.body;
            const updated = await this.walletService.updatePackage(packageId, updateData);
            res.status(200).json({
                success: true,
                message: 'Package updated successfully',
                data: updated,
            });
        });
        this.deletePackage = (0, catchAsync_1.catchAsync)(async (req, res) => {
            const { packageId } = req.params;
            await this.walletService.deletePackage(packageId);
            res.status(200).json({
                success: true,
                message: 'Package deleted successfully',
            });
        });
        this.walletService = new WalletService_1.WalletService();
        this.pricingService = new PricingService_1.PricingService();
    }
}
exports.WalletController = WalletController;
//# sourceMappingURL=WalletController.js.map