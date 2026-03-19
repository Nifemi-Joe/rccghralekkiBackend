// src/routes/serviceReport.routes.ts

import { Router } from 'express';
import { ServiceReportController } from '@controllers/ServiceReportController';
import { authenticate, authorize } from '@middleware/authenticate';

const router = Router();
const serviceReportController = new ServiceReportController();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/service-reports/summary
 * @desc    Get service report summary/statistics
 * @access  Private (requires view_reports permission)
 */
router.get(
    '/summary',
    authorize(['admin']),
    serviceReportController.getReportSummary
);

/**
 * @route   GET /api/service-reports/event/:eventId
 * @desc    Get all reports for a specific event
 * @access  Private (requires view_reports permission)
 */
router.get(
    '/event/:eventId',
    authorize(['admin']),
    serviceReportController.getReportsByEvent
);

/**
 * @route   GET /api/service-reports/instance/:instanceId
 * @desc    Get report for a specific event instance
 * @access  Private (requires view_reports permission)
 */
router.get(
    '/instance/:instanceId',
    authorize(['admin']),
    serviceReportController.getReportByInstance
);

/**
 * @route   POST /api/service-reports
 * @desc    Create a new service report
 * @access  Private (requires create_reports permission)
 */
router.post(
    '/',
    authorize(['admin']),
    serviceReportController.createReport
);

/**
 * @route   GET /api/service-reports
 * @desc    Get all service reports with optional filters
 * @access  Private (requires view_reports permission)
 */
router.get(
    '/',
    authorize(['admin']),
    serviceReportController.getAllReports
);

/**
 * @route   GET /api/service-reports/:id
 * @desc    Get a single service report by ID
 * @access  Private (requires view_reports permission)
 */
router.get(
    '/:id',
    authorize(['admin']),
    serviceReportController.getReportById
);

/**
 * @route   PUT /api/service-reports/:id
 * @desc    Update a service report
 * @access  Private (requires edit_reports permission)
 */
router.put(
    '/:id',
    authorize(['admin']),
    serviceReportController.updateReport
);

/**
 * @route   DELETE /api/service-reports/:id
 * @desc    Delete a service report
 * @access  Private (requires delete_reports permission)
 */
router.delete(
    '/:id',
    authorize(['admin']),
    serviceReportController.deleteReport
);

export default router;