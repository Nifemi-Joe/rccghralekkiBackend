import { Request, Response, NextFunction } from 'express';
export declare class ProfileController {
    private profileService;
    constructor();
    getProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    changePassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateProfileImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStaffMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStaffMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createStaffMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateStaffMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteStaffMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    resendInvitation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAvailablePermissions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=ProfileController.d.ts.map