import { CreateServiceReportDTO, UpdateServiceReportDTO, ServiceReportFilters } from '@/dtos/serviceReport.types';
export declare class ServiceReportService {
    private serviceReportRepository;
    constructor();
    createReport(churchId: string, userId: string, data: CreateServiceReportDTO): Promise<any>;
    getAllReports(churchId: string, filters?: ServiceReportFilters): Promise<any[]>;
    getReportById(churchId: string, reportId: string): Promise<any>;
    updateReport(churchId: string, reportId: string, data: UpdateServiceReportDTO): Promise<any>;
    deleteReport(churchId: string, reportId: string): Promise<void>;
    getReportSummary(churchId: string, startDate?: string, endDate?: string): Promise<import("@/dtos/serviceReport.types").ServiceReportSummary>;
}
//# sourceMappingURL=ServiceReportService.d.ts.map