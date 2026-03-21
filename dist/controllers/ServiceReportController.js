"use strict";
// src/controllers/ServiceReportController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceReportController = void 0;
const ServiceReportService_1 = require("@services/ServiceReportService");
const AppError_1 = require("@utils/AppError");
const logger_1 = __importDefault(require("@config/logger"));
const serviceReport_validator_1 = require("@validators/serviceReport.validator");
class ServiceReportController {
    constructor() {
        /**
         * Create a new service report
         * POST /api/service-reports
         */
        this.createReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const userId = req.user?.id;
                if (!churchId || !userId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                // Validate request body
                const { error, value } = serviceReport_validator_1.createServiceReportSchema.validate(req.body, {
                    abortEarly: false,
                });
                if (error) {
                    throw new AppError_1.AppError(error.details.map((d) => d.message).join(', '), 400);
                }
                const report = await this.serviceReportService.createReport(churchId, userId, value);
                logger_1.default.info(`Service report created: ${report.id} by user ${userId}`);
                res.status(201).json({
                    success: true,
                    message: 'Service report created successfully',
                    data: report,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get all service reports with optional filters
         * GET /api/service-reports
         */
        this.getAllReports = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                // Validate query parameters
                const { error, value } = serviceReport_validator_1.serviceReportFilterSchema.validate(req.query, {
                    abortEarly: false,
                });
                if (error) {
                    throw new AppError_1.AppError(error.details.map((d) => d.message).join(', '), 400);
                }
                const reports = await this.serviceReportService.getAllReports(churchId, value);
                res.status(200).json({
                    success: true,
                    data: reports,
                    count: reports.length,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get a single service report by ID
         * GET /api/service-reports/:id
         */
        this.getReportById = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { id } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                const report = await this.serviceReportService.getReportById(churchId, id);
                res.status(200).json({
                    success: true,
                    data: report,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Update a service report
         * PUT /api/service-reports/:id
         */
        this.updateReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { id } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                // Validate request body
                const { error, value } = serviceReport_validator_1.updateServiceReportSchema.validate(req.body, {
                    abortEarly: false,
                });
                if (error) {
                    throw new AppError_1.AppError(error.details.map((d) => d.message).join(', '), 400);
                }
                const report = await this.serviceReportService.updateReport(churchId, id, value);
                logger_1.default.info(`Service report updated: ${id}`);
                res.status(200).json({
                    success: true,
                    message: 'Service report updated successfully',
                    data: report,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Delete a service report
         * DELETE /api/service-reports/:id
         */
        this.deleteReport = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { id } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                await this.serviceReportService.deleteReport(churchId, id);
                logger_1.default.info(`Service report deleted: ${id}`);
                res.status(200).json({
                    success: true,
                    message: 'Service report deleted successfully',
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get service report summary/statistics
         * GET /api/service-reports/summary
         */
        this.getReportSummary = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                const { start_date, end_date } = req.query;
                const summary = await this.serviceReportService.getReportSummary(churchId, start_date, end_date);
                res.status(200).json({
                    success: true,
                    data: summary,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get reports by event
         * GET /api/service-reports/event/:eventId
         */
        this.getReportsByEvent = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { eventId } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                const reports = await this.serviceReportService.getAllReports(churchId, {
                    event_id: eventId,
                });
                res.status(200).json({
                    success: true,
                    data: reports,
                    count: reports.length,
                });
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * Get report for a specific event instance
         * GET /api/service-reports/instance/:instanceId
         */
        this.getReportByInstance = async (req, res, next) => {
            try {
                const churchId = req.user?.churchId;
                const { instanceId } = req.params;
                if (!churchId) {
                    throw new AppError_1.AppError('Unauthorized', 401);
                }
                const reports = await this.serviceReportService.getAllReports(churchId, {});
                const report = reports.find(r => r.event_instance_id === instanceId);
                if (!report) {
                    throw new AppError_1.AppError('Service report not found for this event instance', 404);
                }
                res.status(200).json({
                    success: true,
                    data: report,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.serviceReportService = new ServiceReportService_1.ServiceReportService();
    }
}
exports.ServiceReportController = ServiceReportController;
//# sourceMappingURL=ServiceReportController.js.map