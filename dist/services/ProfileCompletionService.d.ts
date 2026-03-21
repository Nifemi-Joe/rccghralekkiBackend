interface ProfileFormData {
    recordType: 'member' | 'first_timer' | 'guest';
    recordId: string;
    churchId: string;
    churchName: string;
    currentData: Record<string, any>;
    requiredFields: string[];
    optionalFields: string[];
}
interface ProfileUpdateData {
    dateOfBirth?: string;
    gender?: string;
    maritalStatus?: string;
    weddingAnniversary?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    howDidYouHear?: string;
    interests?: string[];
    prayerRequest?: string;
}
export declare class ProfileCompletionService {
    /**
     * Decode token and get form data
     */
    getProfileFormData(token: string): Promise<ProfileFormData>;
    /**
     * Submit profile completion
     */
    submitProfileCompletion(token: string, data: ProfileUpdateData): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Process uploaded file for profile completion
     */
    processProfileFile(token: string, file: Express.Multer.File): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Generate template file for profile completion
     */
    generateTemplate(format: 'csv' | 'xlsx', type?: 'member' | 'first_timer'): Promise<{
        data: Buffer;
        contentType: string;
        filename: string;
    }>;
    private updateMemberProfile;
    private updateFirstTimerProfile;
    private parseCSV;
    private parseExcel;
    private parseJsonField;
}
export {};
//# sourceMappingURL=ProfileCompletionService.d.ts.map