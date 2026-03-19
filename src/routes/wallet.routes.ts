// src/routes/wallet.routes.ts
import { Router } from 'express';
import { WalletController } from '@controllers/WalletController';
import { authenticate, authorize } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { body, query, param } from 'express-validator';

const router = Router();
const walletController = new WalletController();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// WALLET - Balance endpoints
// =============================================================================

// Get wallet overview
router.get('/wallet', walletController.getWallet);

// Get all channel balances (includes Termii balance)
router.get('/wallet/balances', walletController.getAllBalances);

// Get balance for a specific channel
router.get(
    '/wallet/balance/:channel',
    [
        param('channel')
            .isIn(['sms', 'email', 'whatsapp', 'voice'])
            .withMessage('Channel must be one of: sms, email, whatsapp, voice'),
        validateRequest,
    ],
    walletController.getBalance
);

// =============================================================================
// TRANSACTIONS - History, export, refund
// =============================================================================

// Get transaction history with filters
router.get(
    '/wallet/transactions',
    [
        query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100'),
        query('channel').optional().isIn(['sms', 'email', 'whatsapp', 'voice']).withMessage('Invalid channel'),
        query('type').optional().isIn(['credit', 'debit', 'refund', 'bonus']).withMessage('Invalid transaction type'),
        query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded', 'processing']).withMessage('Invalid status'),
        query('search').optional().isString().trim().escape(),
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        validateRequest,
    ],
    walletController.getTransactions
);

// Export transactions as CSV
router.get(
    '/wallet/transactions/export',
    [
        query('channel').optional().isIn(['sms', 'email', 'whatsapp', 'voice']).withMessage('Invalid channel'),
        query('type').optional().isIn(['credit', 'debit', 'refund', 'bonus']).withMessage('Invalid transaction type'),
        query('status').optional().isIn(['pending', 'completed', 'failed', 'refunded', 'processing']).withMessage('Invalid status'),
        query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
        validateRequest,
    ],
    walletController.exportTransactions
);

// Refund a transaction (admin only)
router.post(
    '/wallet/transactions/:transactionId/refund',
    authorize(['admin', 'pastor']),
    [
        param('transactionId').isUUID().withMessage('Transaction ID must be a valid UUID'),
        body('refundAmount')
            .isFloat({ min: 0.01 })
            .withMessage('Refund amount must be greater than 0'),
        body('reason')
            .notEmpty()
            .withMessage('Reason is required')
            .isString()
            .trim()
            .isLength({ min: 5, max: 500 })
            .withMessage('Reason must be between 5 and 500 characters'),
        validateRequest,
    ],
    walletController.refundTransaction
);

// =============================================================================
// ANALYTICS - Admin reporting
// =============================================================================

// Get wallet analytics (admin only)
router.get(
    '/wallet/analytics',
    authorize(['admin', 'pastor']),
    [
        query('startDate')
            .notEmpty()
            .withMessage('Start date is required')
            .isISO8601()
            .withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate')
            .notEmpty()
            .withMessage('End date is required')
            .isISO8601()
            .withMessage('End date must be a valid ISO 8601 date'),
        validateRequest,
    ],
    walletController.getAnalytics
);

// =============================================================================
// PRICING - Messaging cost management
// =============================================================================

// Get all pricing (public to authenticated users)
router.get('/pricing', walletController.getAllPricing);

// Calculate cost for units
router.get(
    '/pricing/calculate',
    [
        query('channel')
            .notEmpty()
            .withMessage('Channel is required')
            .isIn(['sms', 'email', 'whatsapp', 'voice'])
            .withMessage('Invalid channel'),
        query('units')
            .notEmpty()
            .withMessage('Units is required')
            .isInt({ min: 1 })
            .withMessage('Units must be a positive integer'),
        query('countryCode').optional().isString().isLength({ min: 2, max: 3 }).withMessage('Invalid country code'),
        validateRequest,
    ],
    walletController.calculateCost
);

// Get pricing by channel
router.get(
    '/pricing/:channel',
    [
        param('channel')
            .isIn(['sms', 'email', 'whatsapp', 'voice'])
            .withMessage('Channel must be one of: sms, email, whatsapp, voice'),
        query('countryCode').optional().isString().isLength({ min: 2, max: 3 }).withMessage('Invalid country code'),
        validateRequest,
    ],
    walletController.getPricingByChannel
);

// Create pricing (pastor only)
router.post(
    '/pricing',
    authorize('pastor'),
    [
        body('channel')
            .notEmpty()
            .withMessage('Channel is required')
            .isIn(['sms', 'email', 'whatsapp', 'voice'])
            .withMessage('Invalid channel'),
        body('countryCode')
            .notEmpty()
            .withMessage('Country code is required')
            .isString()
            .isLength({ min: 2, max: 3 }),
        body('countryName')
            .notEmpty()
            .withMessage('Country name is required')
            .isString()
            .trim(),
        body('costPerUnit')
            .isFloat({ min: 0 })
            .withMessage('Cost per unit must be a non-negative number'),
        body('sellPrice')
            .isFloat({ min: 0 })
            .withMessage('Sell price must be a non-negative number'),
        body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
        validateRequest,
    ],
    walletController.createPricing
);

// Update pricing (admin only)
router.put(
    '/pricing/:pricingId',
    authorize(['admin', 'pastor']),
    [
        param('pricingId').isUUID().withMessage('Pricing ID must be a valid UUID'),
        body('costPerUnit')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Cost per unit must be a non-negative number'),
        body('sellPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Sell price must be a non-negative number'),
        body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
        validateRequest,
    ],
    walletController.updatePricing
);

// =============================================================================
// PACKAGES - Unit packages for purchase
// =============================================================================

// Get all packages (public to authenticated users)
router.get(
    '/packages',
    [
        query('channel')
            .optional()
            .isIn(['sms', 'email', 'whatsapp', 'voice', 'combo'])
            .withMessage('Invalid channel'),
        validateRequest,
    ],
    walletController.getAllPackages
);

// Get package by ID
router.get(
    '/packages/:packageId',
    [
        param('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
        validateRequest,
    ],
    walletController.getPackageById
);

// Create package (admin only)
router.post(
    '/packages',
    authorize(['admin', 'pastor']),
    [
        body('name')
            .notEmpty()
            .withMessage('Package name is required')
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('channel')
            .notEmpty()
            .withMessage('Channel is required')
            .isIn(['sms', 'email', 'whatsapp', 'voice', 'combo'])
            .withMessage('Invalid channel'),
        body('units')
            .isInt({ min: 1 })
            .withMessage('Units must be a positive integer'),
        body('price')
            .isFloat({ min: 0.01 })
            .withMessage('Price must be greater than 0'),
        body('bonusUnits')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Bonus units must be a non-negative integer'),
        body('discountPercent')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('Discount must be between 0 and 100'),
        body('isPopular').optional().isBoolean().withMessage('isPopular must be a boolean'),
        body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
        body('description')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description must be at most 500 characters'),
        validateRequest,
    ],
    walletController.createPackage
);

// Update package (admin only)
router.put(
    '/packages/:packageId',
    authorize(['admin', 'pastor']),
    [
        param('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
        body('name')
            .optional()
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('channel')
            .optional()
            .isIn(['sms', 'email', 'whatsapp', 'voice', 'combo'])
            .withMessage('Invalid channel'),
        body('units')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Units must be a positive integer'),
        body('price')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('Price must be greater than 0'),
        body('bonusUnits')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Bonus units must be a non-negative integer'),
        body('discountPercent')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('Discount must be between 0 and 100'),
        body('isPopular').optional().isBoolean().withMessage('isPopular must be a boolean'),
        body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
        body('sortOrder').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
        body('description')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description must be at most 500 characters'),
        validateRequest,
    ],
    walletController.updatePackage
);

// Delete package (admin only)
router.delete(
    '/packages/:packageId',
    authorize(['admin', 'pastor']),
    [
        param('packageId').isUUID().withMessage('Package ID must be a valid UUID'),
        validateRequest,
    ],
    walletController.deletePackage
);

export default router;