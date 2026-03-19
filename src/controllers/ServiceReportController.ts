// src/controllers/ServiceReportController.ts

import { Request, Response, NextFunction } from 'express';
import { ServiceReportService } from '@services/ServiceReportService';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import {
    createServiceReportSchema,
    updateServiceReportSchema,
    serviceReportFilterSchema
} from '@validators/serviceReport.validator';

export class ServiceReportController {
    private serviceReportService: ServiceReportService;

    constructor() {
        this.serviceReportService = new ServiceReportService();
    }

    /**
     * Create a new service report
     * POST /api/service-reports
     */
    createReport = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            if (!churchId || !userId) {
                throw new AppError('Unauthorized', 401);
            }

            // Validate request body
            const { error, value } = createServiceReportSchema.validate(req.body, {
                abortEarly: false,
            });

            if (error) {
                throw new AppError(
                    error.details.map((d) => d.message).join(', '),
                    400
                );
            }

            const report = await this.serviceReportService.createReport(
                churchId,
                userId,
                value
            );

            logger.info(`Service report created: ${report.id} by user ${userId}`);

            res.status(201).json({
                success: true,
                message: 'Service report created successfully',
                data: report,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get all service reports with optional filters
     * GET /api/service-reports
     */
    getAllReports = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            // Validate query parameters
            const { error, value } = serviceReportFilterSchema.validate(req.query, {
                abortEarly: false,
            });

            if (error) {
                throw new AppError(
                    error.details.map((d) => d.message).join(', '),
                    400
                );
            }

            const reports = await this.serviceReportService.getAllReports(
                churchId,
                value
            );

            res.status(200).json({
                success: true,
                data: reports,
                count: reports.length,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get a single service report by ID
     * GET /api/service-reports/:id
     */
    getReportById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const { id } = req.params;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            const report = await this.serviceReportService.getReportById(
                churchId,
                id
            );

            res.status(200).json({
                success: true,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Update a service report
     * PUT /api/service-reports/:id
     */
    updateReport = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const { id } = req.params;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            // Validate request body
            const { error, value } = updateServiceReportSchema.validate(req.body, {
                abortEarly: false,
            });

            if (error) {
                throw new AppError(
                    error.details.map((d) => d.message).join(', '),
                    400
                );
            }

            const report = await this.serviceReportService.updateReport(
                churchId,
                id,
                value
            );

            logger.info(`Service report updated: ${id}`);

            res.status(200).json({
                success: true,
                message: 'Service report updated successfully',
                data: report,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Delete a service report
     * DELETE /api/service-reports/:id
     */
    deleteReport = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const { id } = req.params;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            await this.serviceReportService.deleteReport(churchId, id);

            logger.info(`Service report deleted: ${id}`);

            res.status(200).json({
                success: true,
                message: 'Service report deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get service report summary/statistics
     * GET /api/service-reports/summary
     */
    getReportSummary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            const { start_date, end_date } = req.query;

            const summary = await this.serviceReportService.getReportSummary(
                churchId,
                start_date as string,
                end_date as string
            );

            res.status(200).json({
                success: true,
                data: summary,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get reports by event
     * GET /api/service-reports/event/:eventId
     */
    getReportsByEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const { eventId } = req.params;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            const reports = await this.serviceReportService.getAllReports(churchId, {
                event_id: eventId,
            });

            res.status(200).json({
                success: true,
                data: reports,
                count: reports.length,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get report for a specific event instance
     * GET /api/service-reports/instance/:instanceId
     */
    getReportByInstance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const churchId = req.user?.churchId;
            const { instanceId } = req.params;

            if (!churchId) {
                throw new AppError('Unauthorized', 401);
            }

            const reports = await this.serviceReportService.getAllReports(churchId, {});
            const report = reports.find(r => r.event_instance_id === instanceId);

            if (!report) {
                throw new AppError('Service report not found for this event instance', 404);
            }

            res.status(200).json({
                success: true,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    };
}