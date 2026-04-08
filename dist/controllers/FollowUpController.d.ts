import { Request, Response, NextFunction } from 'express';
export declare class FollowUpController {
    private followUpService;
    constructor();
    getDepartment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateDepartmentSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    addMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    removeMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Fixed: added explicit Promise<void> return type and removed early-return
     * `return res.xxx()` pattern — instead we use a single code path so TypeScript
     * is satisfied that every branch either calls next() or ends with res.xxx().
     */
    getAssignmentByFirstTimer: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    bulkCreateAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    completeAssignment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    reassignMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getActivities: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    sendMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordActivity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    recordResponse: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMyAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUnassignedFirstTimers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=FollowUpController.d.ts.map