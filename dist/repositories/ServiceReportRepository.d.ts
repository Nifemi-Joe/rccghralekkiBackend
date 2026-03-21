import { CreateServiceReportDTO, UpdateServiceReportDTO, ServiceReportFilters, ServiceReportSummary } from '@/dtos/serviceReport.types';
export declare class ServiceReportRepository {
    create(churchId: string, userId: string, data: CreateServiceReportDTO): Promise<any>;
    findAll(churchId: string, filters?: ServiceReportFilters): Promise<any[]>;
    findById(churchId: string, reportId: string): Promise<any>;
    update(churchId: string, reportId: string, data: UpdateServiceReportDTO): Promise<any>;
    delete(churchId: string, reportId: string): Promise<void>;
    getSummary(churchId: string, startDate?: string, endDate?: string): Promise<ServiceReportSummary>;
    private camelToSnake;
}
//# sourceMappingURL=ServiceReportRepository.d.ts.map