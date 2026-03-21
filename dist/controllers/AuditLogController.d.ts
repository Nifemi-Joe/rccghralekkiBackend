import { Request, Response, NextFunction } from 'express';
export declare class AuditLogController {
    private auditLogService;
    constructor();
    getLogs: (req: Request, res: Response, next: NextFunction) => void;
    getLogById: (req: Request, res: Response, next: NextFunction) => void;
    getStats: (req: Request, res: Response, next: NextFunction) => void;
    getEntityHistory: (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=AuditLogController.d.ts.map