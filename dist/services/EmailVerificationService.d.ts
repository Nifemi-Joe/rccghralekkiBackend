export declare class EmailVerificationService {
    private userRepository;
    constructor();
    sendVerificationEmail(userId: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    private sendEmail;
}
//# sourceMappingURL=EmailVerificationService.d.ts.map