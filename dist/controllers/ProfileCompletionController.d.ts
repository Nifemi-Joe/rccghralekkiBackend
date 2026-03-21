import { Request, Response, NextFunction } from 'express';
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}
export declare class ProfileCompletionController {
    private profileService;
    constructor();
    /**
     * Get profile completion form data (public - no auth required)
     */
    getProfileForm: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Submit completed profile (public - no auth required)
     */
    submitProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Upload profile completion via file (CSV/Excel)
     */
    uploadProfileFile: (req: MulterRequest, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Download profile completion template
     */
    downloadTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export {};
//# sourceMappingURL=ProfileCompletionController.d.ts.map