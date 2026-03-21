import { Request, Response, NextFunction } from 'express';
export declare class FirstTimerController {
    private firstTimerService;
    constructor();
    createFirstTimer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllFirstTimers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFirstTimerById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateFirstTimer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteFirstTimer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordVisit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordContactAttempt: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    convertToMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getConversionEligible: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPendingFollowUps: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getConversionSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateConversionSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=FirstTimerController.d.ts.map