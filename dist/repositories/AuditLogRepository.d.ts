import { AuditLog, CreateAuditLogDTO, AuditLogFilters, PaginatedAuditLogs, AuditLogStats } from '@/dtos/auditLog.types';
export declare class AuditLogRepository {
    create(data: CreateAuditLogDTO): Promise<AuditLog>;
    findById(id: string, churchId: string): Promise<AuditLog | null>;
    findAll(filters: AuditLogFilters): Promise<PaginatedAuditLogs>;
    getStats(churchId: string): Promise<AuditLogStats>;
    getEntityHistory(churchId: string, entityType: string, entityId: string): Promise<AuditLog[]>;
    deleteOld(churchId: string, daysOld?: number): Promise<number>;
}
//# sourceMappingURL=AuditLogRepository.d.ts.map