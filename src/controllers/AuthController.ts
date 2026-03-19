import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/AuthService';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.authService.register(req.body);
            successResponse(res, result, 'Registration successful', 201);
        } catch (error) {
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                throw new AppError('Email and password are required', 400);
            }

            const result = await this.authService.login(email, password);

            // Check if user needs to reset password
            if (result.mustResetPassword) {
                logger.info(`User ${email} must reset password on first login`);
                successResponse(res, {
                    mustResetPassword: true,
                    userId: result.user.id,
                    email: result.user.email,
                    isTemporaryPassword: result.isTemporaryPassword
                }, 'Password reset required. Please change your temporary password.', 200);
                return;
            }

            successResponse(res, result, 'Login successful');
        } catch (error) {
            next(error);
        }
    };

    firstLoginResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { userId, oldPassword, newPassword } = req.body;

            if (!userId || !oldPassword || !newPassword) {
                throw new AppError('User ID, old password, and new password are required', 400);
            }

            const result = await this.authService.firstLoginResetPassword(userId, oldPassword, newPassword);
            successResponse(res, result, 'Password reset successful. Please login with your new password.');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Forgot Password - Send OTP to email
     */
    forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email } = req.body;

            if (!email) {
                throw new AppError('Email is required', 400);
            }

            const result = await this.authService.forgotPassword(email);

            // Always return success for security (don't reveal if email exists)
            successResponse(res, {
                email: email,
                message: 'If an account exists with that email, a verification code has been sent.'
            }, 'Verification code sent');
        } catch (error) {
            // Log error but return success for security
            logger.error('Forgot password error:', error);
            successResponse(res, {
                email: req.body.email,
                message: 'If an account exists with that email, a verification code has been sent.'
            }, 'Verification code sent');
        }
    };

    /**
     * Verify Reset OTP
     */
    verifyResetOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                throw new AppError('Email and OTP are required', 400);
            }

            const result = await this.authService.verifyResetOTP(email, otp);
            successResponse(res, result, 'OTP verified successfully');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Resend Reset OTP
     */
    resendResetOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email } = req.body;

            if (!email) {
                throw new AppError('Email is required', 400);
            }

            await this.authService.forgotPassword(email);
            successResponse(res, { email }, 'Verification code resent');
        } catch (error) {
            // Return success for security
            successResponse(res, { email: req.body.email }, 'Verification code resent');
        }
    };

    /**
     * Reset Password with Token
     */
    resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { resetToken, newPassword } = req.body;

            if (!resetToken || !newPassword) {
                throw new AppError('Reset token and new password are required', 400);
            }

            const result = await this.authService.resetPassword(resetToken, newPassword);
            successResponse(res, result, 'Password reset successful');
        } catch (error) {
            next(error);
        }
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new AppError('Refresh token is required', 400);
            }

            const result = await this.authService.refreshToken(refreshToken);
            successResponse(res, result, 'Token refreshed successfully');
        } catch (error) {
            next(error);
        }
    };

    logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            successResponse(res, null, 'Logout successful');
        } catch (error) {
            next(error);
        }
    };

    getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user?.id) {
                throw new AppError('User not authenticated', 401);
            }

            const result = await this.authService.getCurrentUser(req.user.id);
            successResponse(res, result, 'User retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { token } = req.body;

            if (!token) {
                throw new AppError('Verification token is required', 400);
            }

            const result = await this.authService.verifyEmail(token);
            successResponse(res, result, 'Email verified successfully');
        } catch (error) {
            next(error);
        }
    };

    resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email } = req.body;

            if (!email) {
                throw new AppError('Email is required', 400);
            }

            await this.authService.resendVerificationEmail(email);
            successResponse(res, null, 'Verification email sent');
        } catch (error) {
            next(error);
        }
    };
}