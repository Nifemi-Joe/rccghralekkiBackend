import { Request, Response, NextFunction } from 'express';
export declare class MemberController {
    private memberService;
    constructor();
    createMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateProfileLink: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    sendProfileLink: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMemberViaToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMemberAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCelebrations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMemberById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMemberStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    searchMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    registerViaQR: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMemberByToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=MemberController.d.ts.map