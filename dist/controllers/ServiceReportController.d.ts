import { Request, Response, NextFunction } from 'express';
export declare class ServiceReportController {
    private serviceReportService;
    constructor();
    /**
     * Create a new service report
     * POST /api/service-reports
     */
    createReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get all service reports with optional filters
     * GET /api/service-reports
     */
    getAllReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get a single service report by ID
     * GET /api/service-reports/:id
     */
    getReportById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Update a service report
     * PUT /api/service-reports/:id
     */
    updateReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Delete a service report
     * DELETE /api/service-reports/:id
     */
    deleteReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get service report summary/statistics
     * GET /api/service-reports/summary
     */
    getReportSummary: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get reports by event
     * GET /api/service-reports/event/:eventId
     */
    getReportsByEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get report for a specific event instance
     * GET /api/service-reports/instance/:instanceId
     */
    getReportByInstance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=ServiceReportController.d.ts.map