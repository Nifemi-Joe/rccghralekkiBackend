import { Request, Response, NextFunction } from 'express';
export declare class AttendanceController {
    private attendanceService;
    private eventService;
    constructor();
    checkinByQRCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEventByQRCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkinMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    bulkCheckin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEventAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getMemberHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getInactiveMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatistics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTrends: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=AttendanceController.d.ts.map