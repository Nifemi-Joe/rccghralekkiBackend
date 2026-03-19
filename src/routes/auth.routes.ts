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
    verifyResetOTPSchema
} from '@validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post(
    '/register',
    strictRateLimiter,
    validateRequest(registerSchema),
    authController.register
);

router.post(
    '/login',
    strictRateLimiter,
    validateRequest(loginSchema),
    authController.login
);

router.post(
    '/first-login-reset',
    strictRateLimiter,
    validateRequest(firstLoginResetPasswordSchema),
    authController.firstLoginResetPassword
);

router.post(
    '/refresh',
    authController.refreshToken
);

router.post(
    '/logout',
    authController.logout
);

// Password Reset
router.post(
    '/forgot-password',
    strictRateLimiter,
    validateRequest(forgotPasswordSchema),
    authController.forgotPassword
);

router.post(
    '/reset-password',
    strictRateLimiter,
    validateRequest(resetPasswordSchema),
    authController.resetPassword
);

// Forgot Password - Step 2: Verify OTP
router.post('/verify-reset-otp', validateRequest(verifyResetOTPSchema), authController.verifyResetOTP);

// Forgot Password - Resend OTP
router.post('/resend-reset-otp', validateRequest(forgotPasswordSchema), authController.resendResetOTP);


// Email Verification
router.post(
    '/verify-email',
    validateRequest(verifyEmailSchema),
    authController.verifyEmail
);

router.post(
    '/resend-verification',
    strictRateLimiter,
    authController.resendVerification
);

// router.post(
//     '/send-verification',
//     authenticate,
//     authController.sendVerification
// );

// Get current user
router.get(
    '/me',
    authenticate,
    authController.getCurrentUser
);

export default router;