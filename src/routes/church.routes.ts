import { Router } from 'express';
import { ChurchController } from '@controllers/ChurchController';
import { validateRequest } from '@middleware/validateRequest';
import { strictRateLimiter } from '@middleware/rateLimiter';
import { authenticate, authorize } from '@middleware/authenticate';
import {
    registerChurchOnlySchema,
    verifyOTPSchema,
    setupAdminSchema,
    skipSetupSchema,
    createAdditionalAdminSchema,
    updateChurchSchema
} from '@validators/church.validator';

const router = Router();
const churchController = new ChurchController();

// ============================================================================
// PUBLIC ROUTES - Registration Flow
// ============================================================================

// Step 1: Register church (sends OTP)
router.post(
    '/register',
    strictRateLimiter,
    validateRequest(registerChurchOnlySchema),
    churchController.registerChurchOnly
);

// Step 2: Verify OTP
router.post(
    '/verify-otp',
    strictRateLimiter,
    validateRequest(verifyOTPSchema),
    churchController.verifyOTP
);

// Resend OTP
router.post(
    '/resend-otp',
    strictRateLimiter,
    churchController.resendOTP
);

// Step 3: Setup admin profile
router.post(
    '/setup-admin',
    strictRateLimiter,
    validateRequest(setupAdminSchema),
    churchController.setupAdmin
);

// Skip admin setup
router.post(
    '/skip-setup',
    strictRateLimiter,
    validateRequest(skipSetupSchema),
    churchController.skipAdminSetup
);

// Skip admin setup (alternative route)
router.post(
    '/skip-admin-setup',
    strictRateLimiter,
    validateRequest(skipSetupSchema),
    churchController.skipAdminSetup
);

// ============================================================================
// PUBLIC ROUTES - Church Lookup
// ============================================================================

// Get church by slug (for public church pages)
router.get(
    '/slug/:slug',
    churchController.getChurchBySlug
);

// Get church by ID
router.get(
    '/:id',
    churchController.getChurchById
);

// ============================================================================
// PROTECTED ROUTES - Current Church (using /me)
// ============================================================================

// Get current user's church - GET /church/me
router.get(
    '/me',
    authenticate,
    churchController.getChurch
);

// Update current user's church - PUT /church/me
router.put(
    '/me',
    authenticate,
    authorize(['admin']),
    validateRequest(updateChurchSchema),
    churchController.updateChurch
);

// Update church address - PUT /church/me/address
router.put(
    '/me/address',
    authenticate,
    authorize(['admin']),
    churchController.updateChurchAddress
);

// Update church currency - PUT /church/me/currency
router.put(
    '/me/currency',
    authenticate,
    authorize(['admin']),
    churchController.updateChurchCurrency
);

// Update church settings - PUT /church/me/settings
router.put(
    '/me/settings',
    authenticate,
    authorize(['admin']),
    churchController.updateChurchSettings
);

// ============================================================================
// PROTECTED ROUTES - Legacy routes (for backward compatibility)
// ============================================================================

// Get current church - GET /church/
router.get(
    '/',
    authenticate,
    churchController.getChurch
);

// Update church - PUT /church/
router.put(
    '/',
    authenticate,
    authorize(['admin']),
    validateRequest(updateChurchSchema),
    churchController.updateChurch
);

// ============================================================================
// PROTECTED ROUTES - Admin Management
// ============================================================================

// Create additional admin/pastor
router.post(
    '/create-admin',
    authenticate,
    authorize(['admin']),
    validateRequest(createAdditionalAdminSchema),
    churchController.createAdditionalAdmin
);

// Create additional admin (alternative route)
router.post(
    '/admins',
    authenticate,
    authorize(['admin']),
    validateRequest(createAdditionalAdminSchema),
    churchController.createAdditionalAdmin
);

export default router;