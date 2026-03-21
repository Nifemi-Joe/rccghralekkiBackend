export declare class PasswordResetService {
    private userRepository;
    constructor();
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    verifyResetToken(token: string): Promise<{
        valid: boolean;
        email: any;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    private sendResetEmail;
}
//# sourceMappingURL=PasswordResetService.d.ts.map