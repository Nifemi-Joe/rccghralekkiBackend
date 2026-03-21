"use strict";
// src/routes/report.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ReportController_1 = require("@controllers/ReportController");
const authenticate_1 = require("@middleware/authenticate");
const validateRequest_1 = require("@middleware/validateRequest");
const report_validator_1 = require("@validators/report.validator");
const router = (0, express_1.Router)();
const reportController = new ReportController_1.ReportController();
// ============================================================================
// PUBLIC ROUTES (with authentication)
// ============================================================================
// All routes require authentication
router.use(authenticate_1.authenticate);
// Dashboard stats - available to all authenticated users
router.get('/dashboard', reportController.getDashboardStats);
// ============================================================================
// ATTENDANCE REPORTS
// ============================================================================
router.get('/attendance-trends', reportController.getAttendanceTrends);
// ============================================================================
// MEMBER REPORTS
// ============================================================================
router.get('/member-growth', reportController.getMemberGrowth);
router.get('/inactive-members', reportController.getInactiveMembers);
// ============================================================================
// FIRST TIMER REPORTS
// ============================================================================
router.get('/first-timer-conversion', reportController.getFirstTimerConversion);
// ============================================================================
// FAMILY REPORTS
// ============================================================================
router.get('/family-attendance', reportController.getFamilyAttendance);
// ============================================================================
// GROUP REPORTS
// ============================================================================
router.get('/group-activity', reportController.getGroupActivity);
// ============================================================================
// EVENT REPORTS
// ============================================================================
router.get('/event-performance', reportController.getEventPerformance);
// ============================================================================
// SERVICE REPORTS
// ============================================================================
router.get('/service/:instanceId', reportController.getServiceReport);
router.get('/services', reportController.getAllServiceReports);
// ============================================================================
// FINANCIAL REPORTS (Admin/Finance role only)
// ============================================================================
router.get('/financial-summary', (0, authenticate_1.authorize)(['admin', 'finance', 'pastor']), reportController.getFinancialSummary);
// ============================================================================
// CONSOLIDATED REPORTS (Admin only)
// ============================================================================
router.get('/full', (0, authenticate_1.authorize)(['admin', 'pastor']), reportController.getFullReport);
// ============================================================================
// EXPORT ROUTES
// ============================================================================
// Export to PDF
router.get('/export/:reportType/pdf', (0, authenticate_1.authorize)(['admin', 'pastor']), reportController.exportReportPDF);
// Export to Excel
router.get('/export/:reportType/excel', (0, authenticate_1.authorize)(['admin', 'pastor']), reportController.exportReportExcel);
// ============================================================================
// SCHEDULED REPORTS (Admin only)
// ============================================================================
router.post('/schedule', (0, authenticate_1.authorize)(['admin']), (0, validateRequest_1.validateRequest)(report_validator_1.scheduleReportSchema), reportController.scheduleReport);
router.get('/schedule', (0, authenticate_1.authorize)(['admin']), reportController.getScheduledReports);
router.delete('/schedule/:scheduleId', (0, authenticate_1.authorize)(['admin']), reportController.deleteScheduledReport);
exports.default = router;
//# sourceMappingURL=report.routes.js.map