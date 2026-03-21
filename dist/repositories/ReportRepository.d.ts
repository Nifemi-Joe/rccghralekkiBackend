import { ReportFilters, DashboardStats, AttendanceTrendReport, MemberGrowthReport, FirstTimerConversionReport, FinancialSummaryReport, EventPerformanceReport, InactiveMemberReport, FamilyAttendanceReport, GroupActivityReport, ServiceReport, InactiveMemberFilters } from '@/dtos/report.types';
export declare class ReportRepository {
    getDashboardStats(churchId: string): Promise<DashboardStats>;
    getAttendanceTrends(churchId: string, filters: ReportFilters): Promise<AttendanceTrendReport[]>;
    getMemberGrowth(churchId: string, filters: ReportFilters): Promise<MemberGrowthReport[]>;
    getFirstTimerConversion(churchId: string, filters: ReportFilters): Promise<FirstTimerConversionReport[]>;
    getFinancialSummary(churchId: string, filters: ReportFilters): Promise<FinancialSummaryReport[]>;
    getEventPerformance(churchId: string, filters: ReportFilters): Promise<EventPerformanceReport[]>;
    getInactiveMembers(churchId: string, filters?: InactiveMemberFilters): Promise<InactiveMemberReport[]>;
    getFamilyAttendance(churchId: string, filters: ReportFilters): Promise<FamilyAttendanceReport[]>;
    getGroupActivity(churchId: string, filters: ReportFilters): Promise<GroupActivityReport[]>;
    getServiceReport(churchId: string, instanceId: string): Promise<ServiceReport>;
    getAllServiceReports(churchId: string, filters: {
        startDate?: string;
        endDate?: string;
        eventId?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        reports: ServiceReport[];
        total: number;
        totalPages: number;
    }>;
    private getDateGroupSQL;
    private getPeriodLabelSQL;
    private getGranularityInterval;
}
//# sourceMappingURL=ReportRepository.d.ts.map