interface MatchedMember {
    id: string;
    displayName: string;
    hasEmail: boolean;
    hasPhone: boolean;
    maskedEmail: string | null;
    maskedPhone: string | null;
}
export declare class MemberSelfUpdateService {
    private memberRepository;
    private churchRepository;
    private emailService;
    private smsService;
    constructor();
    private generateOtp;
    private generateToken;
    private maskDestination;
    private cleanupExpiredSessions;
    initiateUpdate(memberId: string, channel: 'email' | 'phone'): Promise<{
        success: boolean;
        sessionId: string;
        maskedDestination: string;
        expiresIn: number;
    }>;
    verifyOtp(sessionId: string, otp: string): Promise<{
        success: boolean;
        updateToken: string;
        expiresIn: number;
    }>;
    lookupByName(churchId: string, fullName: string): Promise<{
        found: boolean;
        members: MatchedMember[];
        message?: string;
    }>;
    lookupByEmail(churchId: string, email: string): Promise<{
        found: boolean;
        members: MatchedMember[];
        message?: string;
    }>;
    confirmIdentity(memberId: string, channel: 'email' | 'phone', value: string): Promise<{
        success: boolean;
        sessionId: string;
        maskedDestination: string;
        expiresIn: number;
    }>;
    getMemberByToken(token: string): Promise<any>;
    updateMember(token: string, updateData: any): Promise<{
        success: boolean;
        message: string;
    }>;
    resendOtp(sessionId: string): Promise<{
        success: boolean;
        maskedDestination: string;
        expiresIn: number;
    }>;
    sendShareLink(memberId: string, churchId: string, channel: 'email' | 'phone'): Promise<{
        success: boolean;
        message: string;
    }>;
    private sendOtp;
}
export {};
//# sourceMappingURL=MemberSelfUpdateService.d.ts.map