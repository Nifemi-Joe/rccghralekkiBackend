export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'import' | 'export' | 'checkin' | 'checkout' | 'convert' | 'assign' | 'unassign' | 'approve' | 'reject' | 'send' | 'receive';
export type AuditActionType = 'auth' | 'member' | 'first_timer' | 'family' | 'event' | 'attendance' | 'financial' | 'offering' | 'expense' | 'staff' | 'settings' | 'report' | 'notification' | 'system';
export type AuditStatus = 'success' | 'failure' | 'pending';
export interface AuditLog {
    id: string;
    church_id: string;
    user_id?: string;
    user_email?: string;
    user_name?: string;
    action: AuditAction;
    action_type: AuditActionType;
    description?: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    request_method?: string;
    request_path?: string;
    metadata?: Record<string, any>;
    status: AuditStatus;
    error_message?: string;
    created_at: Date;
}
export interface CreateAuditLogDTO {
    churchId: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: AuditAction;
    actionType: AuditActionType;
    description?: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    requestMethod?: string;
    requestPath?: string;
    metadata?: Record<string, any>;
    status?: AuditStatus;
    errorMessage?: string;
}
export interface AuditLogFilters {
    churchId: string;
    userId?: string;
    action?: AuditAction | AuditAction[];
    actionType?: AuditActionType | AuditActionType[];
    entityType?: string;
    entityId?: string;
    status?: AuditStatus;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedAuditLogs {
    logs: AuditLog[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface AuditLogStats {
    totalLogs: number;
    todayLogs: number;
    byAction: Record<string, number>;
    byActionType: Record<string, number>;
    byUser: Array<{
        userId: string;
        userName: string;
        count: number;
    }>;
    recentActivity: AuditLog[];
}
//# sourceMappingURL=auditLog.types.d.ts.map