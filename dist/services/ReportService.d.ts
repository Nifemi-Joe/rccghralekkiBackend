import { ReportFilters, FullReport, DashboardStats, AttendanceTrendReport, MemberGrowthReport, FirstTimerConversionReport, FinancialSummaryReport, EventPerformanceReport, InactiveMemberReport, FamilyAttendanceReport, GroupActivityReport, ServiceReport } from '@/dtos/report.types';
export declare class ReportService {
    private reportRepository;
    constructor();
    private getDefaultFilters;
    getDashboardStats(churchId: string): Promise<DashboardStats>;
    getAttendanceTrends(churchId: string, filters: Partial<ReportFilters>): Promise<AttendanceTrendReport[]>;
    getMemberGrowth(churchId: string, filters: Partial<ReportFilters>): Promise<MemberGrowthReport[]>;
    getFirstTimerConversion(churchId: string, filters: Partial<ReportFilters>): Promise<FirstTimerConversionReport[]>;
    getFinancialSummary(churchId: string, filters: Partial<ReportFilters>): Promise<FinancialSummaryReport[]>;
    getEventPerformance(churchId: string, filters: Partial<ReportFilters>): Promise<EventPerformanceReport[]>;
    getInactiveMembers(churchId: string, daysThreshold?: number): Promise<InactiveMemberReport[]>;
    getFamilyAttendance(churchId: string, filters: Partial<ReportFilters>): Promise<FamilyAttendanceReport[]>;
    getGroupActivity(churchId: string, filters: Partial<ReportFilters>): Promise<GroupActivityReport[]>;
    getServiceReport(churchId: string, instanceId: string): Promise<ServiceReport>;
    getAllServiceReports(churchId: string, filters: any): Promise<{
        reports: ServiceReport[];
        total: number;
        totalPages: number;
    }>;
    generateFullReport(churchId: string, filters: Partial<ReportFilters>): Promise<FullReport>;
    exportReportPDF(churchId: string, reportType: string, filters: Partial<ReportFilters>): Promise<Buffer>;
    exportReportExcel(churchId: string, reportType: string, filters: Partial<ReportFilters>): Promise<Buffer>;
    scheduleReport(churchId: string, userId: string, scheduleData: any): Promise<any>;
    getScheduledReports(churchId: string): Promise<any[]>;
    deleteScheduledReport(churchId: string, scheduleId: string): Promise<void>;
}
//# sourceMappingURL=ReportService.d.ts.map