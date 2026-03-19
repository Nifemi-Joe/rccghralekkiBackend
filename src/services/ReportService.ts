// src/services/ReportService.ts

import { ReportRepository } from '@repositories/ReportRepository';
import {
    ReportFilters,
    FullReport,
    DashboardStats,
    AttendanceTrendReport,
    MemberGrowthReport,
    FirstTimerConversionReport,
    FinancialSummaryReport,
    EventPerformanceReport,
    InactiveMemberReport,
    FamilyAttendanceReport,
    GroupActivityReport,
    ServiceReport,
} from '@/dtos/report.types';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export class ReportService {
    private reportRepository: ReportRepository;

    constructor() {
        this.reportRepository = new ReportRepository();
    }

    private getDefaultFilters(filters: Partial<ReportFilters>): ReportFilters {
        const now = new Date();
        return {
            startDate: filters.startDate || format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd'),
            endDate: filters.endDate || format(endOfMonth(now), 'yyyy-MM-dd'),
            granularity: filters.granularity || 'monthly',
            eventType: filters.eventType,
            eventId: filters.eventId,
            branchId: filters.branchId,
            groupId: filters.groupId,
        };
    }

    async getDashboardStats(churchId: string): Promise<DashboardStats> {
        try {
            return await this.reportRepository.getDashboardStats(churchId);
        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            throw error;
        }
    }

    async getAttendanceTrends(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<AttendanceTrendReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getAttendanceTrends(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting attendance trends:', error);
            throw error;
        }
    }

    async getMemberGrowth(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<MemberGrowthReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getMemberGrowth(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting member growth:', error);
            throw error;
        }
    }

    async getFirstTimerConversion(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<FirstTimerConversionReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getFirstTimerConversion(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting first timer conversion:', error);
            throw error;
        }
    }

    async getFinancialSummary(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<FinancialSummaryReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getFinancialSummary(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting financial summary:', error);
            throw error;
        }
    }

    async getEventPerformance(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<EventPerformanceReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getEventPerformance(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting event performance:', error);
            throw error;
        }
    }

    async getInactiveMembers(
        churchId: string,
        daysThreshold: number = 30
    ): Promise<InactiveMemberReport[]> {
        try {
            return await this.reportRepository.getInactiveMembers(churchId, {
                daysThreshold,
                includeStatusInactive: true,
                includeNeverAttended: true,
                limit: 100
            });
        } catch (error) {
            logger.error('Error getting inactive members:', error);
            throw error;
        }
    }

    async getFamilyAttendance(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<FamilyAttendanceReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getFamilyAttendance(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting family attendance:', error);
            throw error;
        }
    }

    async getGroupActivity(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<GroupActivityReport[]> {
        try {
            const fullFilters = this.getDefaultFilters(filters);
            return await this.reportRepository.getGroupActivity(churchId, fullFilters);
        } catch (error) {
            logger.error('Error getting group activity:', error);
            throw error;
        }
    }

    async getServiceReport(
        churchId: string,
        instanceId: string
    ): Promise<ServiceReport> {
        try {
            return await this.reportRepository.getServiceReport(churchId, instanceId);
        } catch (error) {
            logger.error('Error getting service report:', error);
            throw error;
        }
    }

    async getAllServiceReports(
        churchId: string,
        filters: any
    ): Promise<{ reports: ServiceReport[]; total: number; totalPages: number }> {
        try {
            return await this.reportRepository.getAllServiceReports(churchId, filters);
        } catch (error) {
            logger.error('Error getting all service reports:', error);
            throw error;
        }
    }

    async generateFullReport(
        churchId: string,
        filters: Partial<ReportFilters>
    ): Promise<FullReport> {
        try {
            const fullFilters = this.getDefaultFilters(filters);

            const [
                dashboardStats,
                attendanceTrends,
                memberGrowth,
                firstTimerConversion,
                financialSummary,
                eventPerformance,
                inactiveMembers,
                familyAttendance,
            ] = await Promise.all([
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
        } catch (error) {
            logger.error('Error generating full report:', error);
            throw error;
        }
    }

    async exportReportPDF(
        churchId: string,
        reportType: string,
        filters: Partial<ReportFilters>
    ): Promise<Buffer> {
        try {
            // Implement PDF generation logic
            throw new AppError('PDF export not yet implemented', 501);
        } catch (error) {
            logger.error('Error exporting report to PDF:', error);
            throw error;
        }
    }

    async exportReportExcel(
        churchId: string,
        reportType: string,
        filters: Partial<ReportFilters>
    ): Promise<Buffer> {
        try {
            // Implement Excel generation logic
            throw new AppError('Excel export not yet implemented', 501);
        } catch (error) {
            logger.error('Error exporting report to Excel:', error);
            throw error;
        }
    }

    async scheduleReport(
        churchId: string,
        userId: string,
        scheduleData: any
    ): Promise<any> {
        try {
            // Implement report scheduling logic
            throw new AppError('Report scheduling not yet implemented', 501);
        } catch (error) {
            logger.error('Error scheduling report:', error);
            throw error;
        }
    }

    async getScheduledReports(churchId: string): Promise<any[]> {
        try {
            // Implement get scheduled reports logic
            throw new AppError('Get scheduled reports not yet implemented', 501);
        } catch (error) {
            logger.error('Error getting scheduled reports:', error);
            throw error;
        }
    }

    async deleteScheduledReport(churchId: string, scheduleId: string): Promise<void> {
        try {
            // Implement delete scheduled report logic
            throw new AppError('Delete scheduled report not yet implemented', 501);
        } catch (error) {
            logger.error('Error deleting scheduled report:', error);
            throw error;
        }
    }
}