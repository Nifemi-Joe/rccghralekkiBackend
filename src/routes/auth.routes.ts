import { Router } from 'express';
import { AuthController } from '@controllers/AuthController';
import { validateRequest } from '@middleware/validateRequest';
import { strictRateLimiter } from '@middleware/rateLimiter';
import { authenticate } from '@middleware/authenticate';
import {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    firstLoginResetPasswordSchema,
    verifyResetOTPSchema,
} from '@validators/auth.validator';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    strictRateLimiter,
    validateRequest(registerSchema),
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return tokens
 * @access  Public
 */
router.post(
    '/login',
    strictRateLimiter,
    validateRequest(loginSchema),
    authController.login
);

/**
 * @route   POST /api/auth/first-login-reset
 * @desc    Reset password on first login with temporary password
 * @access  Public
 */
router.post(
    '/first-login-reset-password',
    strictRateLimiter,
    validateRequest(firstLoginResetPasswordSchema),
    authController.firstLoginResetPassword
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
    '/refresh',
    authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client should delete tokens)
 * @access  Public
 */
router.post(
    '/logout',
    authController.logout
);

// ============================================
// PASSWORD RESET FLOW
// ============================================

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send OTP to user's email for password reset
 * @access  Public
 */
router.post(
    '/forgot-password',
    strictRateLimiter,
    validateRequest(forgotPasswordSchema),
    authController.forgotPassword
);

/**
 * @route   POST /api/auth/verify-reset-otp
 * @desc    Verify OTP and get reset token
 * @access  Public
 */
router.post(
    '/verify-reset-otp',
    strictRateLimiter,
    validateRequest(verifyResetOTPSchema),
    authController.verifyResetOTP
);

/**
 * @route   POST /api/auth/resend-reset-otp
 * @desc    Resend OTP for password reset
 * @access  Public
 */
router.post(
    '/resend-reset-otp',
    strictRateLimiter,
    validateRequest(forgotPasswordSchema),
    authController.resendResetOTP
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 */
router.post(
    '/reset-password',
    strictRateLimiter,
    validateRequest(resetPasswordSchema),
    authController.resetPassword
);

// ============================================
// EMAIL VERIFICATION FLOW
// ============================================

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user's email with token
 * @access  Public
 */
router.post(
    '/verify-email',
    validateRequest(verifyEmailSchema),
    authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
    '/resend-verification',
    strictRateLimiter,
    authController.resendVerification
);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    authController.getCurrentUser
);

export default router;