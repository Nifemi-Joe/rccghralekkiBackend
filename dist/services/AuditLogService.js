"use strict";
// src/services/AuditLogService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const AuditLogRepository_1 = require("@repositories/AuditLogRepository");
const logger_1 = __importDefault(require("@config/logger"));
class AuditLogService {
    constructor() {
        this.auditLogRepository = new AuditLogRepository_1.AuditLogRepository();
    }
    // ============================================================================
    // AUDIT LOG CRUD
    // ============================================================================
    async createLog(data) {
        try {
            const log = await this.auditLogRepository.create(data);
            return log;
        }
        catch (error) {
            logger_1.default.error('Error creating audit log:', error);
            throw error;
        }
    }
    async getLogs(filters) {
        return await this.auditLogRepository.findAll(filters);
    }
    async getLogById(id, churchId) {
        return await this.auditLogRepository.findById(id, churchId);
    }
    async getStats(churchId) {
        return await this.auditLogRepository.getStats(churchId);
    }
    async getEntityHistory(churchId, entityType, entityId) {
        return await this.auditLogRepository.getEntityHistory(churchId, entityType, entityId);
    }
    // ============================================================================
    // HELPER METHODS
    // ============================================================================
    extractRequestInfo(req) {
        return {
            ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '',
            userAgent: req.headers['user-agent'] || '',
            requestMethod: req.method,
            requestPath: req.originalUrl || req.path,
        };
    }
    // ============================================================================
    // LOGGING METHODS
    // ============================================================================
    async logAuth(churchId, userId, userEmail, userName, action, req, status = 'success', errorMessage) {
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
        }
        catch (error) {
            logger_1.default.error('Error logging auth:', error);
        }
    }
    async logMemberAction(churchId, userId, userEmail, userName, action, member, req, changes) {
        try {
            const requestInfo = this.extractRequestInfo(req);
            const descriptions = {
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
        }
        catch (error) {
            logger_1.default.error('Error logging member action:', error);
        }
    }
    async logFirstTimerAction(churchId, userId, userEmail, userName, action, firstTimer, req, changes) {
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
        }
        catch (error) {
            logger_1.default.error('Error logging first timer action:', error);
        }
    }
    async logFinancialAction(churchId, userId, userEmail, userName, action, transaction, req) {
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
        }
        catch (error) {
            logger_1.default.error('Error logging financial action:', error);
        }
    }
    async logEventAction(churchId, userId, userEmail, userName, action, event, req, changes) {
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
        }
        catch (error) {
            logger_1.default.error('Error logging event action:', error);
        }
    }
    async logAttendanceAction(churchId, userId, userEmail, userName, action, attendance, req) {
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
        }
        catch (error) {
            logger_1.default.error('Error logging attendance action:', error);
        }
    }
}
exports.AuditLogService = AuditLogService;
//# sourceMappingURL=AuditLogService.js.map