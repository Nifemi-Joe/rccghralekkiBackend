export interface VoiceCall {
    id: string;
    church_id: string;
    phone_number: string;
    recipient_name?: string;
    message: string;
    duration?: number;
    status: 'pending' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer';
    cost: number;
    provider_call_id?: string;
    error_message?: string;
    created_by?: string;
    created_at: Date;
    updated_at: Date;
}
export declare class VoiceService {
    private walletService;
    constructor();
    sendVoiceCall(churchId: string, data: {
        phoneNumber: string;
        code: number;
        recipientName?: string;
    }, userId?: string): Promise<VoiceCall>;
    sendVoiceOTP(churchId: string, data: {
        phoneNumber: string;
        pinLength?: number;
        pinAttempts?: number;
        pinTimeToLive?: number;
    }, userId?: string): Promise<any>;
    getVoiceCalls(churchId: string, filters?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: VoiceCall[];
        total: number;
    }>;
}
//# sourceMappingURL=VoiceService.d.ts.map