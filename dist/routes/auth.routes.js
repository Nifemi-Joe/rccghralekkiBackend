"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("@controllers/AuthController");
const validateRequest_1 = require("@middleware/validateRequest");
const rateLimiter_1 = require("@middleware/rateLimiter");
const authenticate_1 = require("@middleware/authenticate");
const auth_validator_1 = require("@validators/auth.validator");
const router = (0, express_1.Router)();
const authController = new AuthController_1.AuthController();
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.registerSchema), authController.register);
/**
 * @route   POST /api/auth/login
 * @desc    Login user and return tokens
 * @access  Public
 */
router.post('/login', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.loginSchema), authController.login);
/**
 * @route   POST /api/auth/first-login-reset
 * @desc    Reset password on first login with temporary password
 * @access  Public
 */
router.post('/first-login-reset-password', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.firstLoginResetPasswordSchema), authController.firstLoginResetPassword);
/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);
/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client should delete tokens)
 * @access  Public
 */
router.post('/logout', authController.logout);
// ============================================
// PASSWORD RESET FLOW
// ============================================
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send OTP to user's email for password reset
 * @access  Public
 */
router.post('/forgot-password', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.forgotPasswordSchema), authController.forgotPassword);
/**
 * @route   POST /api/auth/verify-reset-otp
 * @desc    Verify OTP and get reset token
 * @access  Public
 */
router.post('/verify-reset-otp', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.verifyResetOTPSchema), authController.verifyResetOTP);
/**
 * @route   POST /api/auth/resend-reset-otp
 * @desc    Resend OTP for password reset
 * @access  Public
 */
router.post('/resend-reset-otp', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.forgotPasswordSchema), authController.resendResetOTP);
/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 */
router.post('/reset-password', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.resetPasswordSchema), authController.resetPassword);
// ============================================
// EMAIL VERIFICATION FLOW
// ============================================
/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user's email with token
 * @access  Public
 */
router.post('/verify-email', (0, validateRequest_1.validateRequest)(auth_validator_1.verifyEmailSchema), authController.verifyEmail);
/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post('/resend-verification', rateLimiter_1.strictRateLimiter, authController.resendVerification);
// ============================================
// AUTHENTICATED ROUTES
// ============================================
/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate_1.authenticate, authController.getCurrentUser);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map