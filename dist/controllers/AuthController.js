"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("@services/AuthService");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class AuthController {
    constructor() {
        this.register = async (req, res, next) => {
            try {
                const result = await this.authService.register(req.body);
                (0, responseHandler_1.successResponse)(res, result, 'Registration successful', 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.login = async (req, res, next) => {
            try {
                const { email, password } = req.body;
                if (!email || !password) {
                    throw new AppError_1.AppError('Email and password are required', 400);
                }
                const result = await this.authService.login(email, password);
                // Check if user needs to reset password
                if (result.mustResetPassword) {
                    logger_1.default.info(`User ${email} must reset password on first login`);
                    (0, responseHandler_1.successResponse)(res, {
                        mustResetPassword: true,
                        userId: result.user.id,
                        email: result.user.email,
                        isTemporaryPassword: result.isTemporaryPassword
                    }, 'Password reset required. Please change your temporary password.', 200);
                    return;
                }
                (0, responseHandler_1.successResponse)(res, result, 'Login successful');
            }
            catch (error) {
                next(error);
            }
        };
        this.firstLoginResetPassword = async (req, res, next) => {
            try {
                const { userId, oldPassword, newPassword } = req.body;
                if (!userId || !oldPassword || !newPassword) {
                    throw new AppError_1.AppError('User ID, old password, and new password are required', 400);
                }
                const result = await this.authService.firstLoginResetPassword(userId, oldPassword, newPassword);
                (0, responseHandler_1.successResponse)(res, result, 'Password reset successful. Please login with your new password.');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Forgot Password - Send OTP to email
         */
        this.forgotPassword = async (req, res, next) => {
            try {
                const { email } = req.body;
                if (!email) {
                    throw new AppError_1.AppError('Email is required', 400);
                }
                const result = await this.authService.forgotPassword(email);
                // Always return success for security (don't reveal if email exists)
                (0, responseHandler_1.successResponse)(res, {
                    email: email,
                    message: 'If an account exists with that email, a verification code has been sent.'
                }, 'Verification code sent');
            }
            catch (error) {
                // Log error but return success for security
                logger_1.default.error('Forgot password error:', error);
                (0, responseHandler_1.successResponse)(res, {
                    email: req.body.email,
                    message: 'If an account exists with that email, a verification code has been sent.'
                }, 'Verification code sent');
            }
        };
        /**
         * Verify Reset OTP
         */
        this.verifyResetOTP = async (req, res, next) => {
            try {
                const { email, otp } = req.body;
                if (!email || !otp) {
                    throw new AppError_1.AppError('Email and OTP are required', 400);
                }
                const result = await this.authService.verifyResetOTP(email, otp);
                (0, responseHandler_1.successResponse)(res, result, 'OTP verified successfully');
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Resend Reset OTP
         */
        this.resendResetOTP = async (req, res, next) => {
            try {
                const { email } = req.body;
                if (!email) {
                    throw new AppError_1.AppError('Email is required', 400);
                }
                await this.authService.forgotPassword(email);
                (0, responseHandler_1.successResponse)(res, { email }, 'Verification code resent');
            }
            catch (error) {
                // Return success for security
                (0, responseHandler_1.successResponse)(res, { email: req.body.email }, 'Verification code resent');
            }
        };
        /**
         * Reset Password with Token
         */
        this.resetPassword = async (req, res, next) => {
            try {
                const { resetToken, newPassword } = req.body;
                if (!resetToken || !newPassword) {
                    throw new AppError_1.AppError('Reset token and new password are required', 400);
                }
                const result = await this.authService.resetPassword(resetToken, newPassword);
                (0, responseHandler_1.successResponse)(res, result, 'Password reset successful');
            }
            catch (error) {
                next(error);
            }
        };
        this.refreshToken = async (req, res, next) => {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) {
                    throw new AppError_1.AppError('Refresh token is required', 400);
                }
                const result = await this.authService.refreshToken(refreshToken);
                (0, responseHandler_1.successResponse)(res, result, 'Token refreshed successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.logout = async (req, res, next) => {
            try {
                (0, responseHandler_1.successResponse)(res, null, 'Logout successful');
            }
            catch (error) {
                next(error);
            }
        };
        this.getCurrentUser = async (req, res, next) => {
            try {
                if (!req.user?.id) {
                    throw new AppError_1.AppError('User not authenticated', 401);
                }
                const result = await this.authService.getCurrentUser(req.user.id);
                (0, responseHandler_1.successResponse)(res, result, 'User retrieved successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.verifyEmail = async (req, res, next) => {
            try {
                const { token } = req.body;
                if (!token) {
                    throw new AppError_1.AppError('Verification token is required', 400);
                }
                const result = await this.authService.verifyEmail(token);
                (0, responseHandler_1.successResponse)(res, result, 'Email verified successfully');
            }
            catch (error) {
                next(error);
            }
        };
        this.resendVerification = async (req, res, next) => {
            try {
                const { email } = req.body;
                if (!email) {
                    throw new AppError_1.AppError('Email is required', 400);
                }
                await this.authService.resendVerificationEmail(email);
                (0, responseHandler_1.successResponse)(res, null, 'Verification email sent');
            }
            catch (error) {
                next(error);
            }
        };
        this.authService = new AuthService_1.AuthService();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map