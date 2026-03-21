"use strict";
// src/controllers/AuditLogController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const AuditLogService_1 = require("@services/AuditLogService");
// Async handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
class AuditLogController {
    constructor() {
        this.getLogs = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const filters = {
                churchId,
                userId: req.query.userId,
                action: req.query.action,
                actionType: req.query.actionType,
                entityType: req.query.entityType,
                entityId: req.query.entityId,
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
            };
            const result = await this.auditLogService.getLogs(filters);
            res.json({
                status: 'success',
                data: result,
            });
        });
        this.getLogById = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { id } = req.params;
            const log = await this.auditLogService.getLogById(id, churchId);
            if (!log) {
                res.status(404).json({
                    status: 'error',
                    message: 'Audit log not found',
                });
                return;
            }
            res.json({
                status: 'success',
                data: log,
            });
        });
        this.getStats = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const stats = await this.auditLogService.getStats(churchId);
            res.json({
                status: 'success',
                data: stats,
            });
        });
        this.getEntityHistory = asyncHandler(async (req, res) => {
            const churchId = req.user.churchId;
            const { entityType, entityId } = req.params;
            const history = await this.auditLogService.getEntityHistory(churchId, entityType, entityId);
            res.json({
                status: 'success',
                data: history,
            });
        });
        this.auditLogService = new AuditLogService_1.AuditLogService();
    }
}
exports.AuditLogController = AuditLogController;
//# sourceMappingURL=AuditLogController.js.map