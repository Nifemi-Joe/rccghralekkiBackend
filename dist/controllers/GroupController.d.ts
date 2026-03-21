import { Request, Response, NextFunction } from 'express';
export declare class GroupController {
    private groupService;
    constructor();
    createGroup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllGroups: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getGroupById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateGroup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteGroup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    addMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    removeMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMemberRole: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getGroupMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMemberGroups: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMeetingById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getGroupMeetings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllMeetings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    shareMeeting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createGroupType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllGroupTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateGroupType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteGroupType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=GroupController.d.ts.map