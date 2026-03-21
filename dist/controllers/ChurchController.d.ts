import { Request, Response, NextFunction } from 'express';
export declare class ChurchController {
    private churchService;
    constructor();
    registerChurchOnly: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    verifyOTP: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    resendOTP: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    setupAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    skipAdminSetup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createAdditionalAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getChurch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getChurchById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getChurchBySlug: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateChurch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateChurchAddress: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateChurchCurrency: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateChurchSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteChurch: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=ChurchController.d.ts.map