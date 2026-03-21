"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ChurchController_1 = require("@controllers/ChurchController");
const validateRequest_1 = require("@middleware/validateRequest");
const rateLimiter_1 = require("@middleware/rateLimiter");
const authenticate_1 = require("@middleware/authenticate");
const church_validator_1 = require("@validators/church.validator");
const router = (0, express_1.Router)();
const churchController = new ChurchController_1.ChurchController();
// ============================================================================
// PUBLIC ROUTES - Registration Flow
// ============================================================================
// Step 1: Register church (sends OTP)
router.post('/register', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(church_validator_1.registerChurchOnlySchema), churchController.registerChurchOnly);
// Step 2: Verify OTP
router.post('/verify-otp', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(church_validator_1.verifyOTPSchema), churchController.verifyOTP);
// Resend OTP
router.post('/resend-otp', rateLimiter_1.strictRateLimiter, churchController.resendOTP);
// Step 3: Setup admin profile
router.post('/setup-admin', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(church_validator_1.setupAdminSchema), churchController.setupAdmin);
// Skip admin setup
router.post('/skip-setup', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(church_validator_1.skipSetupSchema), churchController.skipAdminSetup);
// Skip admin setup (alternative route)
router.post('/skip-admin-setup', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(church_validator_1.skipSetupSchema), churchController.skipAdminSetup);
// ============================================================================
// PUBLIC ROUTES - Church Lookup
// ============================================================================
// Get church by slug (for public church pages)
router.get('/slug/:slug', churchController.getChurchBySlug);
// Get church by ID
router.get('/:id', churchController.getChurchById);
// ============================================================================
// PROTECTED ROUTES - Current Church (using /me)
// ============================================================================
// Get current user's church - GET /church/me
router.get('/me', authenticate_1.authenticate, churchController.getChurch);
// Update current user's church - PUT /church/me
router.put('/me', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), (0, validateRequest_1.validateRequest)(church_validator_1.updateChurchSchema), churchController.updateChurch);
// Update church address - PUT /church/me/address
router.put('/me/address', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), churchController.updateChurchAddress);
// Update church currency - PUT /church/me/currency
router.put('/me/currency', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), churchController.updateChurchCurrency);
// Update church settings - PUT /church/me/settings
router.put('/me/settings', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), churchController.updateChurchSettings);
// ============================================================================
// PROTECTED ROUTES - Legacy routes (for backward compatibility)
// ============================================================================
// Get current church - GET /church/
router.get('/', authenticate_1.authenticate, churchController.getChurch);
// Update church - PUT /church/
router.put('/', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), (0, validateRequest_1.validateRequest)(church_validator_1.updateChurchSchema), churchController.updateChurch);
// ============================================================================
// PROTECTED ROUTES - Admin Management
// ============================================================================
// Create additional admin/pastor
router.post('/create-admin', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), (0, validateRequest_1.validateRequest)(church_validator_1.createAdditionalAdminSchema), churchController.createAdditionalAdmin);
// Create additional admin (alternative route)
router.post('/admins', authenticate_1.authenticate, (0, authenticate_1.authorize)(['admin']), (0, validateRequest_1.validateRequest)(church_validator_1.createAdditionalAdminSchema), churchController.createAdditionalAdmin);
exports.default = router;
//# sourceMappingURL=church.routes.js.map