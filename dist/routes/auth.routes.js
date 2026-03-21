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
router.post('/register', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.registerSchema), authController.register);
router.post('/login', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.loginSchema), authController.login);
router.post('/first-login-reset', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.firstLoginResetPasswordSchema), authController.firstLoginResetPassword);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
// Password Reset
router.post('/forgot-password', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', rateLimiter_1.strictRateLimiter, (0, validateRequest_1.validateRequest)(auth_validator_1.resetPasswordSchema), authController.resetPassword);
// Forgot Password - Step 2: Verify OTP
router.post('/verify-reset-otp', (0, validateRequest_1.validateRequest)(auth_validator_1.verifyResetOTPSchema), authController.verifyResetOTP);
// Forgot Password - Resend OTP
router.post('/resend-reset-otp', (0, validateRequest_1.validateRequest)(auth_validator_1.forgotPasswordSchema), authController.resendResetOTP);
// Email Verification
router.post('/verify-email', (0, validateRequest_1.validateRequest)(auth_validator_1.verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', rateLimiter_1.strictRateLimiter, authController.resendVerification);
// router.post(
//     '/send-verification',
//     authenticate,
//     authController.sendVerification
// );
// Get current user
router.get('/me', authenticate_1.authenticate, authController.getCurrentUser);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map