// src/controllers/ReportController.ts

import { Request, Response, NextFunction } from 'express';
import { ReportService } from '@services/ReportService';
import { successResponse } from '@utils/responseHandler';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class ReportController {
    private reportService: ReportService;

    constructor() {
        this.reportService = new ReportService();
    }

    /**
     * Get dashboard statistics
     */
    getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            logger.info(`Fetching dashboard stats for church: ${churchId}`);

            const stats = await this.reportService.getDashboardStats(churchId);

            successResponse(res, stats, 'Dashboard statistics retrieved successfully');
        } catch (error) {
            logger.error('Error in getDashboardStats:', error);
            next(error);
        }
    };

    /**
     * Get attendance trends
     */
    getAttendanceTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
                eventType: req.query.eventType as string,
                eventId: req.query.eventId as string,
            };

            logger.info(`Fetching attendance trends for church: ${churchId}`, filters);

            const trends = await this.reportService.getAttendanceTrends(churchId, filters);

            successResponse(res, trends, 'Attendance trends retrieved successfully');
        } catch (error) {
            logger.error('Error in getAttendanceTrends:', error);
            next(error);
        }
    };

    /**
     * Get member growth report
     */
    getMemberGrowth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Fetching member growth for church: ${churchId}`, filters);

            const growth = await this.reportService.getMemberGrowth(churchId, filters);

            successResponse(res, growth, 'Member growth report retrieved successfully');
        } catch (error) {
            logger.error('Error in getMemberGrowth:', error);
            next(error);
        }
    };

    /**
     * Get first timer conversion report
     */
    getFirstTimerConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Fetching first timer conversion for church: ${churchId}`, filters);

            const conversion = await this.reportService.getFirstTimerConversion(churchId, filters);

            successResponse(res, conversion, 'First timer conversion report retrieved successfully');
        } catch (error) {
            logger.error('Error in getFirstTimerConversion:', error);
            next(error);
        }
    };

    /**
     * Get financial summary report
     */
    getFinancialSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Fetching financial summary for church: ${churchId}`, filters);

            const summary = await this.reportService.getFinancialSummary(churchId, filters);

            successResponse(res, summary, 'Financial summary retrieved successfully');
        } catch (error) {
            logger.error('Error in getFinancialSummary:', error);
            next(error);
        }
    };

    /**
     * Get event performance report
     */
    getEventPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
                eventType: req.query.eventType as string,
                eventId: req.query.eventId as string,
            };

            logger.info(`Fetching event performance for church: ${churchId}`, filters);

            const performance = await this.reportService.getEventPerformance(churchId, filters);

            successResponse(res, performance, 'Event performance report retrieved successfully');
        } catch (error) {
            logger.error('Error in getEventPerformance:', error);
            next(error);
        }
    };

    /**
     * Get inactive members report
     */
    getInactiveMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const daysThreshold = parseInt(req.query.daysThreshold as string) || 30;

            logger.info(`Fetching inactive members for church: ${churchId}, threshold: ${daysThreshold} days`);

            const inactiveMembers = await this.reportService.getInactiveMembers(churchId, daysThreshold);

            successResponse(res, inactiveMembers, 'Inactive members report retrieved successfully');
        } catch (error) {
            logger.error('Error in getInactiveMembers:', error);
            next(error);
        }
    };

    /**
     * Get family attendance report
     */
    getFamilyAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Fetching family attendance for church: ${churchId}`, filters);

            const familyAttendance = await this.reportService.getFamilyAttendance(churchId, filters);

            successResponse(res, familyAttendance, 'Family attendance report retrieved successfully');
        } catch (error) {
            logger.error('Error in getFamilyAttendance:', error);
            next(error);
        }
    };

    /**
     * Get group activity report
     */
    getGroupActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
                groupId: req.query.groupId as string,
            };

            logger.info(`Fetching group activity for church: ${churchId}`, filters);

            const groupActivity = await this.reportService.getGroupActivity(churchId, filters);

            successResponse(res, groupActivity, 'Group activity report retrieved successfully');
        } catch (error) {
            logger.error('Error in getGroupActivity:', error);
            next(error);
        }
    };

    /**
     * Get service report
     */
    getServiceReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const { instanceId } = req.params;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            if (!instanceId) {
                throw new AppError('Instance ID is required', 400);
            }

            logger.info(`Fetching service report for instance: ${instanceId}`);

            const serviceReport = await this.reportService.getServiceReport(churchId, instanceId);

            successResponse(res, serviceReport, 'Service report retrieved successfully');
        } catch (error) {
            logger.error('Error in getServiceReport:', error);
            next(error);
        }
    };

    /**
     * Get all service reports
     */
    getAllServiceReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                eventId: req.query.eventId as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
            };

            logger.info(`Fetching all service reports for church: ${churchId}`, filters);

            const reports = await this.reportService.getAllServiceReports(churchId, filters);

            successResponse(res, reports, 'Service reports retrieved successfully');
        } catch (error) {
            logger.error('Error in getAllServiceReports:', error);
            next(error);
        }
    };

    /**
     * Get full consolidated report
     */
    getFullReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Generating full report for church: ${churchId}`, filters);

            const fullReport = await this.reportService.generateFullReport(churchId, filters);

            successResponse(res, fullReport, 'Full report generated successfully');
        } catch (error) {
            logger.error('Error in getFullReport:', error);
            next(error);
        }
    };

    /**
     * Export report to PDF
     */
    exportReportPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const { reportType } = req.params;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Exporting ${reportType} report to PDF for church: ${churchId}`);

            const pdfBuffer = await this.reportService.exportReportPDF(churchId, reportType, filters);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            logger.error('Error in exportReportPDF:', error);
            next(error);
        }
    };

    /**
     * Export report to Excel
     */
    exportReportExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const { reportType } = req.params;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const filters = {
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                granularity: (req.query.granularity as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
            };

            logger.info(`Exporting ${reportType} report to Excel for church: ${churchId}`);

            const excelBuffer = await this.reportService.exportReportExcel(churchId, reportType, filters);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.xlsx`);
            res.send(excelBuffer);
        } catch (error) {
            logger.error('Error in exportReportExcel:', error);
            next(error);
        }
    };

    /**
     * Schedule automated report
     */
    scheduleReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            const scheduleData = {
                reportType: req.body.reportType,
                frequency: req.body.frequency, // daily, weekly, monthly
                recipients: req.body.recipients, // email addresses
                format: req.body.format, // pdf, excel
                filters: req.body.filters,
            };

            logger.info(`Scheduling automated report for church: ${churchId}`, scheduleData);

            const schedule = await this.reportService.scheduleReport(churchId, userId!, scheduleData);

            successResponse(res, schedule, 'Report scheduled successfully', 201);
        } catch (error) {
            logger.error('Error in scheduleReport:', error);
            next(error);
        }
    };

    /**
     * Get scheduled reports
     */
    getScheduledReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            logger.info(`Fetching scheduled reports for church: ${churchId}`);

            const schedules = await this.reportService.getScheduledReports(churchId);

            successResponse(res, schedules, 'Scheduled reports retrieved successfully');
        } catch (error) {
            logger.error('Error in getScheduledReports:', error);
            next(error);
        }
    };

    /**
     * Delete scheduled report
     */
    deleteScheduledReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const { scheduleId } = req.params;

            if (!churchId) {
                throw new AppError('Church ID not found', 400);
            }

            logger.info(`Deleting scheduled report: ${scheduleId}`);

            await this.reportService.deleteScheduledReport(churchId, scheduleId);

            successResponse(res, null, 'Scheduled report deleted successfully');
        } catch (error) {
            logger.error('Error in deleteScheduledReport:', error);
            next(error);
        }
    };
}