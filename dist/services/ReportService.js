"use strict";
// src/services/ReportService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const ReportRepository_1 = require("@repositories/ReportRepository");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const date_fns_1 = require("date-fns");
class ReportService {
    constructor() {
        this.reportRepository = new ReportRepository_1.ReportRepository();
    }
    getDefaultFilters(filters) {
        const now = new Date();
        return {
            startDate: filters.startDate || (0, date_fns_1.format)((0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 5)), 'yyyy-MM-dd'),
            endDate: filters.endDate || (0, date_fns_1.format)((0, date_fns_1.endOfMonth)(now), 'yyyy-MM-dd'),
            granularity: filters.granularity || 'monthly',
            eventType: filters.eventType,
            eventId: filters.eventId,
            branchId: filters.branchId,
            groupId: filters.groupId,
        };
    }
    async getDashboardStats(churchId) {
        try {
            return await this.reportRepository.getDashboardStats(churchId);
        }
        catch (error) {
            logger_1.default.error('Error getting dashboard stats:', error);
            throw error;
        }
    }
    async getAttendanceTrends(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getAttendanceTrends(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting attendance trends:', error);
            throw error;
        }
    }
    async getMemberGrowth(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getMemberGrowth(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting member growth:', error);
            throw error;
        }
    }
    async getFirstTimerConversion(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getFirstTimerConversion(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting first timer conversion:', error);
            throw error;
        }
    }
    async getFinancialSummary(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getFinancialSummary(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting financial summary:', error);
            throw error;
        }
    }
    async getEventPerformance(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getEventPerformance(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting event performance:', error);
            throw error;
        }
    }
    async getInactiveMembers(churchId, daysThreshold = 30) {
        try {
            return await this.reportRepository.getInactiveMembers(churchId, {
                daysThreshold,
                includeStatusInactive: true,
                includeNeverAttended: true,
                limit: 100
            });
        }
        catch (error) {
            logger_1.default.error('Error getting inactive members:', error);
            throw error;
        }
    }
    async getFamilyAttendance(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getFamilyAttendance(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting family attendance:', error);
            throw error;
        }
    }
    async getGroupActivity(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getGroupActivity(churchId, fullFilters);
        }
        catch (error) {
            logger_1.default.error('Error getting group activity:', error);
            throw error;
        }
    }
    async getServiceReport(churchId, instanceId) {
        try {
            return await this.reportRepository.getServiceReport(churchId, instanceId);
        }
        catch (error) {
            logger_1.default.error('Error getting service report:', error);
            throw error;
        }
    }
    async getAllServiceReports(churchId, filters) {
        try {
            return await this.reportRepository.getAllServiceReports(churchId, filters);
        }
        catch (error) {
            logger_1.default.error('Error getting all service reports:', error);
            throw error;
        }
    }
    async generateFullReport(churchId, filters) {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            const [dashboardStats, attendanceTrends, memberGrowth, firstTimerConversion, financialSummary, eventPerformance, inactiveMembers, familyAttendance,] = await Promise.all([
                this.getDashboardStats(churchId),
                this.getAttendanceTrends(churchId, fullFilters),
                this.getMemberGrowth(churchId, fullFilters),
                this.getFirstTimerConversion(churchId, fullFilters),
                this.getFinancialSummary(churchId, fullFilters),
                this.getEventPerformance(churchId, fullFilters),
                this.getInactiveMembers(churchId, 30),
                this.getFamilyAttendance(churchId, fullFilters),
            ]);
            return {
                reportPeriod: {
                    startDate: fullFilters.startDate,
                    endDate: fullFilters.endDate,
                    granularity: fullFilters.granularity,
                },
                dashboardStats,
                attendanceTrends,
                memberGrowth,
                firstTimerConversion,
                financialSummary,
                eventPerformance,
                inactiveMembers,
                familyAttendance,
                generatedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            logger_1.default.error('Error generating full report:', error);
            throw error;
        }
    }
    async exportReportPDF(churchId, reportType, filters) {
        try {
            // Implement PDF generation logic
            throw new AppError_1.AppError('PDF export not yet implemented', 501);
        }
        catch (error) {
            logger_1.default.error('Error exporting report to PDF:', error);
            throw error;
        }
    }
    async exportReportExcel(churchId, reportType, filters) {
        try {
            // Implement Excel generation logic
            throw new AppError_1.AppError('Excel export not yet implemented', 501);
        }
        catch (error) {
            logger_1.default.error('Error exporting report to Excel:', error);
            throw error;
        }
    }
    async scheduleReport(churchId, userId, scheduleData) {
        try {
            // Implement report scheduling logic
            throw new AppError_1.AppError('Report scheduling not yet implemented', 501);
        }
        catch (error) {
            logger_1.default.error('Error scheduling report:', error);
            throw error;
        }
    }
    async getScheduledReports(churchId) {
        try {
            // Implement get scheduled reports logic
            throw new AppError_1.AppError('Get scheduled reports not yet implemented', 501);
        }
        catch (error) {
            logger_1.default.error('Error getting scheduled reports:', error);
            throw error;
        }
    }
    async deleteScheduledReport(churchId, scheduleId) {
        try {
            // Implement delete scheduled report logic
            throw new AppError_1.AppError('Delete scheduled report not yet implemented', 501);
        }
        catch (error) {
            logger_1.default.error('Error deleting scheduled report:', error);
            throw error;
        }
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=ReportService.js.map