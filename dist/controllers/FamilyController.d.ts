import { Request, Response, NextFunction } from 'express';
export declare class FamilyController {
    private familyService;
    constructor();
    createFamily: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFamily: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllFamilies: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateFamily: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteFamily: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFamilyMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    addMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    removeMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=FamilyController.d.ts.map