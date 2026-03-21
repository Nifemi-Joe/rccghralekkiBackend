"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/wallet.routes.ts
const express_1 = require("express");
const WalletController_1 = require("@controllers/WalletController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const walletController = new WalletController_1.WalletController();
// All routes require authentication
router.use(authenticate_1.authenticate);
// =============================================================================
// WALLET - Balance endpoints
// =============================================================================
// Get wallet overview
router.get('/wallet', walletController.getWallet);
// Get all channel balances (includes Termii balance)
router.get('/wallet/balances', walletController.getAllBalances);
// Get balance for a specific channel
router.get('/wallet/balance/:channel', [
    (0, express_validator_1.param)('channel')
        .isIn(['sms', 'email', 'whatsapp', 'voice'])
        .withMessage('Channel must be one of: sms, email, whatsapp, voice'),
    validateRequest_1.validateRequest,
], walletController.getBalance);
// =============================================================================
// TRANSACTIONS - History, export, refund
// =============================================================================
// Get transaction history with filters
router.get('/wallet/transactions', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('channel').optional().isIn(['sms', 'email', 'whatsapp', 'voice']).withMessage('Invalid channel'),
    (0, express_validator_1.query)('type').optional().isIn(['credit', 'debit', 'refund', 'bonus']).withMessage('Invalid transaction type'),
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'completed', 'failed', 'refunded', 'processing']).withMessage('Invalid status'),
    (0, express_validator_1.query)('search').optional().isString().trim().escape(),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    validateRequest_1.validateRequest,
], walletController.getTransactions);
// Export transactions as CSV
router.get('/wallet/transactions/export', [
    (0, express_validator_1.query)('channel').optional().isIn(['sms', 'email', 'whatsapp', 'voice']).withMessage('Invalid channel'),
    (0, express_validator_1.query)('type').optional().isIn(['credit', 'debit', 'refund', 'bonus']).withMessage('Invalid transaction type'),
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'completed', 'failed', 'refunded', 'processing']).withMessage('Invalid status'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
    validateRequest_1.validateRequest,
], walletController.exportTransactions);
// Refund a transaction (admin only)
router.post('/wallet/transactions/:transactionId/refund', (0, authenticate_1.authorize)(['admin', 'pastor']), [
    (0, express_validator_1.param)('transactionId').isUUID().withMessage('Transaction ID must be a valid UUID'),
    (0, express_validator_1.body)('refundAmount')
        .isFloat({ min: 0.01 })
        .withMessage('Refund amount must be greater than 0'),
    (0, express_validator_1.body)('reason')
        .notEmpty()
        .withMessage('Reason is required')
        .isString()
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Reason must be between 5 and 500 characters'),
    validateRequest_1.validateRequest,
], walletController.refundTransaction);
// =============================================================================
// ANALYTICS - Admin reporting
// =============================================================================
// Get wallet analytics (admin only)
router.get('/wallet/analytics', (0, authenticate_1.authorize)(['admin', 'pastor']), [
    (0, express_validator_1.query)('startDate')
        .notEmpty()
        .withMessage('Start date is required')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('endDate')
        .notEmpty()
        .withMessage('End date is required')
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    validateRequest_1.validateRequest,
], walletController.getAnalytics);
// =============================================================================
// PRICING - Messaging cost management
// =============================================================================
// Get all pricing (public to authenticated users)
router.get('/pricing', walletController.getAllPricing);
// Calculate cost for units
router.get('/pricing/calculate', [
    (0, express_validator_1.query)('channel')
        .notEmpty()
        .withMessage('Channel is required')
        .isIn(['sms', 'email', 'whatsapp', 'voice'])
        .withMessage('Invalid channel'),
    (0, express_validator_1.query)('units')
        .notEmpty()
        .withMessage('Units is required')
        .isInt({ min: 1 })
        .withMessage('Units must be a positive integer'),
    (0, express_validator_1.query)('countryCode').optional().isString().isLength({ min: 2, max: 3 }).withMessage('Invalid country code'),
    validateRequest_1.validateRequest,
], walletController.calculateCost);
// Get pricing by channel
router.get('/pricing/:channel', [
    (0, express_validator_1.param)('channel')
        .isIn(['sms', 'email', 'whatsapp', 'voice'])
        .withMessage('Channel must be one of: sms, email, whatsapp, voice'),
    (0, express_validator_1.query)('countryCode').optional().isString().isLength({ min: 2, max: 3 }).withMessage('Invalid country code'),
    validateRequest_1.validateRequest,
], walletController.getPricingByChannel);
// Create pricing (pastor only)
router.post('/pricing', (0, authenticate_1.authorize)('pastor'), [
    (0, express_validator_1.body)('channel')
        .notEmpty()
        .withMessage('Channel is required')
        .isIn(['sms', 'email', 'whatsapp', 'voice'])
        .withMessage('Invalid channel'),
    (0, express_validator_1.body)('countryCode')
        .notEmpty()
        .withMessage('Country code is required')
        .isString()
        .isLength({ min: 2, max: 3 }),
    (0, express_validator_1.body)('countryName')
        .notEmpty()
        .withMessage('Country name is required')
        .isString()
        .trim(),
    (0, express_validator_1.body)('costPerUnit')
        .isFloat({ min: 0 })
        .withMessage('Cost per unit must be a non-negative number'),
    (0, express_validator_1.body)('sellPrice')
        .isFloat({ min: 0 })
        .withMessage('Sell price must be a non-negative number'),
    (0, express_validator_1.body)('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    validateRequest_1.validateRequest,
], walletController.createPricing);
// Update pricing (admin only)
router.put('/pricing/:pricingId', (0, authenticate_1.authorize)(['admin', 'pastor']), [
    (0, express_validator_1.param)('pricingId').isUUID().withMessage('Pricing ID must be a valid UUID'),
    (0, express_validator_1.body)('costPerUnit')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Cost per unit must be a non-negative number'),
    (0, express_validator_1.body)('sellPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Sell price must be a non-negative number'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest_1.validateRequest,
], walletController.updatePricing);
// =============================================================================
// PACKAGES - Unit packages for purchase
// =============================================================================
// Get all packages (public to authenticated users)
router.get('/packages', [
    (0, express_validator_1.query)('channel')
        .optional()
        .isIn(['sms', 'email', 'whatsapp', 'voice', 'combo'])
        .withMessage('Invalid channel'),
    validateRequest_1.validateRequest,
], walletController.getAllPackages);
// Get package by ID
router.get('/packages/:packageId', [
    (0, express_validator_1.param)('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
    validateRequest_1.validateRequest,
], walletController.getPackageById);
// Create package (admin only)
router.post('/packages', (0, authenticate_1.authorize)(['admin', 'pastor']), [
    (0, express_validator_1.body)('name')
        .notEmpty()
        .withMessage('Package name is required')
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('channel')
        .notEmpty()
        .withMessage('Channel is required')
        .isIn(['sms', 'email', 'whatsapp', 'voice', 'combo'])
        .withMessage('Invalid channel'),
    (0, express_validator_1.body)('units')
        .isInt({ min: 1 })
        .withMessage('Units must be a positive integer'),
    (0, express_validator_1.body)('price')
        .isFloat({ min: 0.01 })
        .withMessage('Price must be greater than 0'),
    (0, express_validator_1.body)('bonusUnits')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Bonus units must be a non-negative integer'),
    (0, express_validator_1.body)('discountPercent')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount must be between 0 and 100'),
    (0, express_validator_1.body)('isPopular').optional().isBoolean().withMessage('isPopular must be a boolean'),
    (0, express_validator_1.body)('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be at most 500 characters'),
    validateRequest_1.validateRequest,
], walletController.createPackage);
// Update package (admin only)
router.put('/packages/:packageId', (0, authenticate_1.authorize)(['admin', 'pastor']), [
    (0, express_validator_1.param)('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
    (0, express_validator_1.body)('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('channel')
        .optional()
        .isIn(['sms', 'email', 'whatsapp', 'voice', 'combo'])
        .withMessage('Invalid channel'),
    (0, express_validator_1.body)('units')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Units must be a positive integer'),
    (0, express_validator_1.body)('price')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Price must be greater than 0'),
    (0, express_validator_1.body)('bonusUnits')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Bonus units must be a non-negative integer'),
    (0, express_validator_1.body)('discountPercent')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount must be between 0 and 100'),
    (0, express_validator_1.body)('isPopular').optional().isBoolean().withMessage('isPopular must be a boolean'),
    (0, express_validator_1.body)('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    (0, express_validator_1.body)('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be at most 500 characters'),
    validateRequest_1.validateRequest,
], walletController.updatePackage);
// Delete package (admin only)
router.delete('/packages/:packageId', (0, authenticate_1.authorize)(['admin', 'pastor']), [
    (0, express_validator_1.param)('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
    validateRequest_1.validateRequest,
], walletController.deletePackage);
exports.default = router;
//# sourceMappingURL=wallet.routes.js.map