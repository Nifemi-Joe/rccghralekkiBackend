import { AuditLog, CreateAuditLogDTO, AuditLogFilters, PaginatedAuditLogs, AuditLogStats, AuditAction } from '@/dtos/auditLog.types';
import { Request } from 'express';
export declare class AuditLogService {
    private auditLogRepository;
    constructor();
    createLog(data: CreateAuditLogDTO): Promise<AuditLog>;
    getLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs>;
    getLogById(id: string, churchId: string): Promise<AuditLog | null>;
    getStats(churchId: string): Promise<AuditLogStats>;
    getEntityHistory(churchId: string, entityType: string, entityId: string): Promise<AuditLog[]>;
    extractRequestInfo(req: Request): {
        ipAddress: string;
        userAgent: string;
        requestMethod: string;
        requestPath: string;
    };
    logAuth(churchId: string, userId: string, userEmail: string, userName: string, action: 'login' | 'logout', req: Request, status?: 'success' | 'failure', errorMessage?: string): Promise<void>;
    logMemberAction(churchId: string, userId: string, userEmail: string, userName: string, action: AuditAction, member: {
        id: string;
        name: string;
    }, req: Request, changes?: {
        oldValues?: any;
        newValues?: any;
    }): Promise<void>;
    logFirstTimerAction(churchId: string, userId: string, userEmail: string, userName: string, action: AuditAction, firstTimer: {
        id: string;
        name: string;
    }, req: Request, changes?: {
        oldValues?: any;
        newValues?: any;
    }): Promise<void>;
    logFinancialAction(churchId: string, userId: string, userEmail: string, userName: string, action: AuditAction, transaction: {
        id: string;
        type: string;
        amount: number;
    }, req: Request): Promise<void>;
    logEventAction(churchId: string, userId: string, userEmail: string, userName: string, action: AuditAction, event: {
        id: string;
        name: string;
    }, req: Request, changes?: {
        oldValues?: any;
        newValues?: any;
    }): Promise<void>;
    logAttendanceAction(churchId: string, userId: string, userEmail: string, userName: string, action: 'checkin' | 'checkout', attendance: {
        eventId: string;
        eventName: string;
        memberId: string;
        memberName: string;
    }, req: Request): Promise<void>;
}
//# sourceMappingURL=AuditLogService.d.ts.map