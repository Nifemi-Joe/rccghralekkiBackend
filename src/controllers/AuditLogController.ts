// src/controllers/AuditLogController.ts

import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '@services/AuditLogService';
import { AuditLogFilters } from '@/dtos/auditLog.types';

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export class AuditLogController {
    private auditLogService: AuditLogService;

    constructor() {
        this.auditLogService = new AuditLogService();
    }

    getLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;

        const filters: AuditLogFilters = {
            churchId,
            userId: req.query.userId as string,
            action: req.query.action as any,
            actionType: req.query.actionType as any,
            entityType: req.query.entityType as string,
            entityId: req.query.entityId as string,
            status: req.query.status as any,
            startDate: req.query.startDate as string,
            endDate: req.query.endDate as string,
            search: req.query.search as string,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50,
            sortBy: req.query.sortBy as string,
            sortOrder: req.query.sortOrder as 'asc' | 'desc',
        };

        const result = await this.auditLogService.getLogs(filters);

        res.json({
            status: 'success',
            data: result,
        });
    });

    getLogById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
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

    getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;

        const stats = await this.auditLogService.getStats(churchId);

        res.json({
            status: 'success',
            data: stats,
        });
    });

    getEntityHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const churchId = req.user!.churchId;
        const { entityType, entityId } = req.params;

        const history = await this.auditLogService.getEntityHistory(churchId, entityType, entityId);

        res.json({
            status: 'success',
            data: history,
        });
    });
}