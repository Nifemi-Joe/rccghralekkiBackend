"use strict";
// src/routes/serviceReport.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ServiceReportController_1 = require("@controllers/ServiceReportController");
const authenticate_1 = require("@middleware/authenticate");
const router = (0, express_1.Router)();
const serviceReportController = new ServiceReportController_1.ServiceReportController();
// All routes require authentication
router.use(authenticate_1.authenticate);
/**
 * @route   GET /api/service-reports/summary
 * @desc    Get service report summary/statistics
 * @access  Private (requires view_reports permission)
 */
router.get('/summary', (0, authenticate_1.authorize)(['admin']), serviceReportController.getReportSummary);
/**
 * @route   GET /api/service-reports/event/:eventId
 * @desc    Get all reports for a specific event
 * @access  Private (requires view_reports permission)
 */
router.get('/event/:eventId', (0, authenticate_1.authorize)(['admin']), serviceReportController.getReportsByEvent);
/**
 * @route   GET /api/service-reports/instance/:instanceId
 * @desc    Get report for a specific event instance
 * @access  Private (requires view_reports permission)
 */
router.get('/instance/:instanceId', (0, authenticate_1.authorize)(['admin']), serviceReportController.getReportByInstance);
/**
 * @route   POST /api/service-reports
 * @desc    Create a new service report
 * @access  Private (requires create_reports permission)
 */
router.post('/', (0, authenticate_1.authorize)(['admin']), serviceReportController.createReport);
/**
 * @route   GET /api/service-reports
 * @desc    Get all service reports with optional filters
 * @access  Private (requires view_reports permission)
 */
router.get('/', (0, authenticate_1.authorize)(['admin']), serviceReportController.getAllReports);
/**
 * @route   GET /api/service-reports/:id
 * @desc    Get a single service report by ID
 * @access  Private (requires view_reports permission)
 */
router.get('/:id', (0, authenticate_1.authorize)(['admin']), serviceReportController.getReportById);
/**
 * @route   PUT /api/service-reports/:id
 * @desc    Update a service report
 * @access  Private (requires edit_reports permission)
 */
router.put('/:id', (0, authenticate_1.authorize)(['admin']), serviceReportController.updateReport);
/**
 * @route   DELETE /api/service-reports/:id
 * @desc    Delete a service report
 * @access  Private (requires delete_reports permission)
 */
router.delete('/:id', (0, authenticate_1.authorize)(['admin']), serviceReportController.deleteReport);
exports.default = router;
//# sourceMappingURL=serviceReport.routes.js.map