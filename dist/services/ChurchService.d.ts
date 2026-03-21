import { Church } from '@repositories/ChurchRepository';
import { UserWithoutPassword } from '@repositories/UserRepository';
import { UpdateChurchDTO } from '@/dtos/church.types';
import { RegisterChurchDTO, SetupAdminDTO, CreateAdditionalAdminDTO } from '@/dtos/auth.types';
export declare class ChurchService {
    private churchRepository;
    private userRepository;
    private otpStore;
    constructor();
    registerChurchOnly(data: RegisterChurchDTO): Promise<{
        email: string;
        message: string;
    }>;
    verifyOTP(email: string, otp: string): Promise<{
        churchId: string;
        churchName: string;
        userId: string;
        email: string;
        verified: boolean;
        message: string;
    }>;
    setupAdmin(data: SetupAdminDTO, skipSetup?: boolean): Promise<{
        church: Church;
        user?: UserWithoutPassword;
        accessToken?: string;
        refreshToken?: string;
        skipped?: boolean;
        message?: string;
    }>;
    createAdditionalAdmin(churchId: string, data: CreateAdditionalAdminDTO, createdBy: string): Promise<{
        user: UserWithoutPassword;
        temporaryPassword: string;
        message: string;
    }>;
    resendOTP(email: string): Promise<{
        message: string;
    }>;
    getChurchById(churchId: string): Promise<Church>;
    getChurchBySlug(slug: string): Promise<Church>;
    updateChurch(churchId: string, data: UpdateChurchDTO): Promise<Church>;
    deleteChurch(churchId: string): Promise<boolean>;
    private generateTokens;
    private cleanupExpiredOTPs;
}
//# sourceMappingURL=ChurchService.d.ts.map