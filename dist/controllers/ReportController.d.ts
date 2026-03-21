import { Request, Response, NextFunction } from 'express';
export declare class ReportController {
    private reportService;
    constructor();
    /**
     * Get dashboard statistics
     */
    getDashboardStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get attendance trends
     */
    getAttendanceTrends: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get member growth report
     */
    getMemberGrowth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get first timer conversion report
     */
    getFirstTimerConversion: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get financial summary report
     */
    getFinancialSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get event performance report
     */
    getEventPerformance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get inactive members report
     */
    getInactiveMembers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get family attendance report
     */
    getFamilyAttendance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get group activity report
     */
    getGroupActivity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get service report
     */
    getServiceReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get all service reports
     */
    getAllServiceReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get full consolidated report
     */
    getFullReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Export report to PDF
     */
    exportReportPDF: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Export report to Excel
     */
    exportReportExcel: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Schedule automated report
     */
    scheduleReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get scheduled reports
     */
    getScheduledReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Delete scheduled report
     */
    deleteScheduledReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=ReportController.d.ts.map