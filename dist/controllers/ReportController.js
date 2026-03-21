"use strict";
// src/controllers/ReportController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const ReportService_1 = require("@services/ReportService");
const responseHandler_1 = require("@utils/responseHandler");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
class ReportController {
    constructor() {
        /**
         * Get dashboard statistics
         */
        this.getDashboardStats = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                logger_1.default.info(`Fetching dashboard stats for church: ${churchId}`);
                const stats = await this.reportService.getDashboardStats(churchId);
                (0, responseHandler_1.successResponse)(res, stats, 'Dashboard statistics retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getDashboardStats:', error);
                next(error);
            }
        };
        /**
         * Get attendance trends
         */
        this.getAttendanceTrends = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                    eventType: req.query.eventType,
                    eventId: req.query.eventId,
                };
                logger_1.default.info(`Fetching attendance trends for church: ${churchId}`, filters);
                const trends = await this.reportService.getAttendanceTrends(churchId, filters);
                (0, responseHandler_1.successResponse)(res, trends, 'Attendance trends retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getAttendanceTrends:', error);
                next(error);
            }
        };
        /**
         * Get member growth report
         */
        this.getMemberGrowth = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Fetching member growth for church: ${churchId}`, filters);
                const growth = await this.reportService.getMemberGrowth(churchId, filters);
                (0, responseHandler_1.successResponse)(res, growth, 'Member growth report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getMemberGrowth:', error);
                next(error);
            }
        };
        /**
         * Get first timer conversion report
         */
        this.getFirstTimerConversion = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Fetching first timer conversion for church: ${churchId}`, filters);
                const conversion = await this.reportService.getFirstTimerConversion(churchId, filters);
                (0, responseHandler_1.successResponse)(res, conversion, 'First timer conversion report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getFirstTimerConversion:', error);
                next(error);
            }
        };
        /**
         * Get financial summary report
         */
        this.getFinancialSummary = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Fetching financial summary for church: ${churchId}`, filters);
                const summary = await this.reportService.getFinancialSummary(churchId, filters);
                (0, responseHandler_1.successResponse)(res, summary, 'Financial summary retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getFinancialSummary:', error);
                next(error);
            }
        };
        /**
         * Get event performance report
         */
        this.getEventPerformance = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                    eventType: req.query.eventType,
                    eventId: req.query.eventId,
                };
                logger_1.default.info(`Fetching event performance for church: ${churchId}`, filters);
                const performance = await this.reportService.getEventPerformance(churchId, filters);
                (0, responseHandler_1.successResponse)(res, performance, 'Event performance report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getEventPerformance:', error);
                next(error);
            }
        };
        /**
         * Get inactive members report
         */
        this.getInactiveMembers = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const daysThreshold = parseInt(req.query.daysThreshold) || 30;
                logger_1.default.info(`Fetching inactive members for church: ${churchId}, threshold: ${daysThreshold} days`);
                const inactiveMembers = await this.reportService.getInactiveMembers(churchId, daysThreshold);
                (0, responseHandler_1.successResponse)(res, inactiveMembers, 'Inactive members report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getInactiveMembers:', error);
                next(error);
            }
        };
        /**
         * Get family attendance report
         */
        this.getFamilyAttendance = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Fetching family attendance for church: ${churchId}`, filters);
                const familyAttendance = await this.reportService.getFamilyAttendance(churchId, filters);
                (0, responseHandler_1.successResponse)(res, familyAttendance, 'Family attendance report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getFamilyAttendance:', error);
                next(error);
            }
        };
        /**
         * Get group activity report
         */
        this.getGroupActivity = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                    groupId: req.query.groupId,
                };
                logger_1.default.info(`Fetching group activity for church: ${churchId}`, filters);
                const groupActivity = await this.reportService.getGroupActivity(churchId, filters);
                (0, responseHandler_1.successResponse)(res, groupActivity, 'Group activity report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getGroupActivity:', error);
                next(error);
            }
        };
        /**
         * Get service report
         */
        this.getServiceReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { instanceId } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                if (!instanceId) {
                    throw new AppError_1.AppError('Instance ID is required', 400);
                }
                logger_1.default.info(`Fetching service report for instance: ${instanceId}`);
                const serviceReport = await this.reportService.getServiceReport(churchId, instanceId);
                (0, responseHandler_1.successResponse)(res, serviceReport, 'Service report retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getServiceReport:', error);
                next(error);
            }
        };
        /**
         * Get all service reports
         */
        this.getAllServiceReports = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    eventId: req.query.eventId,
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                };
                logger_1.default.info(`Fetching all service reports for church: ${churchId}`, filters);
                const reports = await this.reportService.getAllServiceReports(churchId, filters);
                (0, responseHandler_1.successResponse)(res, reports, 'Service reports retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getAllServiceReports:', error);
                next(error);
            }
        };
        /**
         * Get full consolidated report
         */
        this.getFullReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Generating full report for church: ${churchId}`, filters);
                const fullReport = await this.reportService.generateFullReport(churchId, filters);
                (0, responseHandler_1.successResponse)(res, fullReport, 'Full report generated successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getFullReport:', error);
                next(error);
            }
        };
        /**
         * Export report to PDF
         */
        this.exportReportPDF = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { reportType } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Exporting ${reportType} report to PDF for church: ${churchId}`);
                const pdfBuffer = await this.reportService.exportReportPDF(churchId, reportType, filters);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.pdf`);
                res.send(pdfBuffer);
            }
            catch (error) {
                logger_1.default.error('Error in exportReportPDF:', error);
                next(error);
            }
        };
        /**
         * Export report to Excel
         */
        this.exportReportExcel = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { reportType } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const filters = {
                    startDate: req.query.startDate,
                    endDate: req.query.endDate,
                    granularity: req.query.granularity || 'monthly',
                };
                logger_1.default.info(`Exporting ${reportType} report to Excel for church: ${churchId}`);
                const excelBuffer = await this.reportService.exportReportExcel(churchId, reportType, filters);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.xlsx`);
                res.send(excelBuffer);
            }
            catch (error) {
                logger_1.default.error('Error in exportReportExcel:', error);
                next(error);
            }
        };
        /**
         * Schedule automated report
         */
        this.scheduleReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                const scheduleData = {
                    reportType: req.body.reportType,
                    frequency: req.body.frequency, // daily, weekly, monthly
                    recipients: req.body.recipients, // email addresses
                    format: req.body.format, // pdf, excel
                    filters: req.body.filters,
                };
                logger_1.default.info(`Scheduling automated report for church: ${churchId}`, scheduleData);
                const schedule = await this.reportService.scheduleReport(churchId, userId, scheduleData);
                (0, responseHandler_1.successResponse)(res, schedule, 'Report scheduled successfully', 201);
            }
            catch (error) {
                logger_1.default.error('Error in scheduleReport:', error);
                next(error);
            }
        };
        /**
         * Get scheduled reports
         */
        this.getScheduledReports = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                logger_1.default.info(`Fetching scheduled reports for church: ${churchId}`);
                const schedules = await this.reportService.getScheduledReports(churchId);
                (0, responseHandler_1.successResponse)(res, schedules, 'Scheduled reports retrieved successfully');
            }
            catch (error) {
                logger_1.default.error('Error in getScheduledReports:', error);
                next(error);
            }
        };
        /**
         * Delete scheduled report
         */
        this.deleteScheduledReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { scheduleId } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Church ID not found', 400);
                }
                logger_1.default.info(`Deleting scheduled report: ${scheduleId}`);
                await this.reportService.deleteScheduledReport(churchId, scheduleId);
                (0, responseHandler_1.successResponse)(res, null, 'Scheduled report deleted successfully');
            }
            catch (error) {
                logger_1.default.error('Error in deleteScheduledReport:', error);
                next(error);
            }
        };
        this.reportService = new ReportService_1.ReportService();
    }
}
exports.ReportController = ReportController;
//# sourceMappingURL=ReportController.js.map