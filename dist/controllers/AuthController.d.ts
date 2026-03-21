import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    private authService;
    constructor();
    register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    login: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    firstLoginResetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Forgot Password - Send OTP to email
     */
    forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Verify Reset OTP
     */
    verifyResetOTP: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Resend Reset OTP
     */
    resendResetOTP: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Reset Password with Token
     */
    resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    refreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCurrentUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    verifyEmail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    resendVerification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map