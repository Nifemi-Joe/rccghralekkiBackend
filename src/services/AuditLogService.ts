// src/services/AuditLogService.ts

import { AuditLogRepository } from '@repositories/AuditLogRepository';
import {
    AuditLog,
    CreateAuditLogDTO,
    AuditLogFilters,
    PaginatedAuditLogs,
    AuditLogStats,
    AuditAction,
    AuditActionType,
} from '@/dtos/auditLog.types';
import logger from '@config/logger';
import { Request } from 'express';

export class AuditLogService {
    private auditLogRepository: AuditLogRepository;

    constructor() {
        this.auditLogRepository = new AuditLogRepository();
    }

    // ============================================================================
    // AUDIT LOG CRUD
    // ============================================================================

    async createLog(data: CreateAuditLogDTO): Promise<AuditLog> {
        try {
            const log = await this.auditLogRepository.create(data);
            return log;
        } catch (error) {
            logger.error('Error creating audit log:', error);
            throw error;
        }
    }

    async getLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
        return await this.auditLogRepository.findAll(filters);
    }

    async getLogById(id: string, churchId: string): Promise<AuditLog | null> {
        return await this.auditLogRepository.findById(id, churchId);
    }

    async getStats(churchId: string): Promise<AuditLogStats> {
        return await this.auditLogRepository.getStats(churchId);
    }

    async getEntityHistory(churchId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
        return await this.auditLogRepository.getEntityHistory(churchId, entityType, entityId);
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    extractRequestInfo(req: Request): { ipAddress: string; userAgent: string; requestMethod: string; requestPath: string } {
        return {
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            requestMethod: req.method,
            requestPath: req.originalUrl || req.path,
        };
    }

    // ============================================================================
    // LOGGING METHODS
    // ============================================================================

    async logAuth(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        action: 'login' | 'logout',
        req: Request,
        status: 'success' | 'failure' = 'success',
        errorMessage?: string
    ): Promise<void> {
        try {
            const requestInfo = this.extractRequestInfo(req);
            await this.createLog({
                churchId,
                userId,
                userEmail,
                userName,
                action,
                actionType: 'auth',
                description: `User ${action === 'login' ? 'logged in' : 'logged out'}`,
                entityType: 'user',
                entityId: userId,
                entityName: userName,
                ...requestInfo,
                status,
                errorMessage,
            });
        } catch (error) {
            logger.error('Error logging auth:', error);
        }
    }

    async logMemberAction(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        action: AuditAction,
        member: { id: string; name: string },
        req: Request,
        changes?: { oldValues?: any; newValues?: any }
    ): Promise<void> {
        try {
            const requestInfo = this.extractRequestInfo(req);
            const descriptions: Record<AuditAction, string> = {
                create: `Created member: ${member.name}`,
                update: `Updated member: ${member.name}`,
                delete: `Deleted member: ${member.name}`,
                view: `Viewed member: ${member.name}`,
                import: `Imported member: ${member.name}`,
                export: `Exported member data`,
                login: '',
                logout: '',
                checkin: '',
                checkout: '',
                convert: '',
                assign: '',
                unassign: '',
                approve: '',
                reject: '',
                send: '',
                receive: '',
            };

            await this.createLog({
                churchId,
                userId,
                userEmail,
                userName,
                action,
                actionType: 'member',
                description: descriptions[action] || `${action} member: ${member.name}`,
                entityType: 'member',
                entityId: member.id,
                entityName: member.name,
                oldValues: changes?.oldValues,
                newValues: changes?.newValues,
                ...requestInfo,
            });
        } catch (error) {
            logger.error('Error logging member action:', error);
        }
    }

    async logFirstTimerAction(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        action: AuditAction,
        firstTimer: { id: string; name: string },
        req: Request,
        changes?: { oldValues?: any; newValues?: any }
    ): Promise<void> {
        try {
            const requestInfo = this.extractRequestInfo(req);
            await this.createLog({
                churchId,
                userId,
                userEmail,
                userName,
                action,
                actionType: 'first_timer',
                description: `${action} first timer: ${firstTimer.name}`,
                entityType: 'first_timer',
                entityId: firstTimer.id,
                entityName: firstTimer.name,
                oldValues: changes?.oldValues,
                newValues: changes?.newValues,
                ...requestInfo,
            });
        } catch (error) {
            logger.error('Error logging first timer action:', error);
        }
    }

    async logFinancialAction(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        action: AuditAction,
        transaction: { id: string; type: string; amount: number },
        req: Request
    ): Promise<void> {
        try {
            const requestInfo = this.extractRequestInfo(req);
            await this.createLog({
                churchId,
                userId,
                userEmail,
                userName,
                action,
                actionType: 'financial',
                description: `${action} ${transaction.type}: ${transaction.amount}`,
                entityType: 'transaction',
                entityId: transaction.id,
                entityName: `${transaction.type} - ${transaction.amount}`,
                newValues: transaction,
                ...requestInfo,
            });
        } catch (error) {
            logger.error('Error logging financial action:', error);
        }
    }

    async logEventAction(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        action: AuditAction,
        event: { id: string; name: string },
        req: Request,
        changes?: { oldValues?: any; newValues?: any }
    ): Promise<void> {
        try {
            const requestInfo = this.extractRequestInfo(req);
            await this.createLog({
                churchId,
                userId,
                userEmail,
                userName,
                action,
                actionType: 'event',
                description: `${action} event: ${event.name}`,
                entityType: 'event',
                entityId: event.id,
                entityName: event.name,
                oldValues: changes?.oldValues,
                newValues: changes?.newValues,
                ...requestInfo,
            });
        } catch (error) {
            logger.error('Error logging event action:', error);
        }
    }

    async logAttendanceAction(
        churchId: string,
        userId: string,
        userEmail: string,
        userName: string,
        action: 'checkin' | 'checkout',
        attendance: { eventId: string; eventName: string; memberId: string; memberName: string },
        req: Request
    ): Promise<void> {
        try {
            const requestInfo = this.extractRequestInfo(req);
            await this.createLog({
                churchId,
                userId,
                userEmail,
                userName,
                action,
                actionType: 'attendance',
                description: `${attendance.memberName} ${action === 'checkin' ? 'checked in to' : 'checked out from'} ${attendance.eventName}`,
                entityType: 'attendance',
                entityId: attendance.eventId,
                entityName: attendance.eventName,
                metadata: {
                    memberId: attendance.memberId,
                    memberName: attendance.memberName,
                    time: new Date().toISOString(),
                },
                ...requestInfo,
            });
        } catch (error) {
            logger.error('Error logging attendance action:', error);
        }
    }
}